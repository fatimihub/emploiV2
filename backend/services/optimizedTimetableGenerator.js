const {
  Group,
  FormateurTimetable,
  Session,
  Timetable,
  Module,
  Formateur,
  Classroom
} = require('../models/index.js');

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const TIME_SHOTS = ["08:30-11:00", "11:00-13:30", "13:30-16:00", "16:00-18:30"];
const SATURDAY_TIME_SHOTS = ["08:30-11:00", "11:00-13:30"];

class OptimizedTimetableGenerator {
  constructor() {
    this.cache = new Map();
    this.stats = {
      totalGroups: 0,
      successfulGroups: 0,
      failedGroups: 0,
      totalAttempts: 0,
      averageTime: 0
    };
  }

  /**
   * Main entry point to generate timetables for all eligible groups.
   * This algorithm runs sequentially: it processes one group at a time to prevent
   * race conditions when checking for global Formateur or Classroom availability.
   * 
   * Process Flow:
   * 1. Preloads all existing Formateur schedules, active sessions, and active timetables.
   * 2. Identifies which groups currently DO NOT have an active timetable.
   * 3. Iterates over those groups and runs the core backtracking scheduling algorithm.
   * 4. Errors in one group are isolated (caught) and do not halt the overall generation.
   *
   * @param {string} valide_a_partir_de - The date string representing when this timetable schedule becomes active.
   * @param {Object} [options={}] - Additional runtime configuration options.
   * @returns {Promise<Object>} The summary object detailing how many groups succeeded, failed, and the final timetables generated.
   */
  async generateAllTimetables(valide_a_partir_de, options = {}) {
    const startTime = Date.now();

    try {
      // Pre-load all necessary data (Formateur schedules, active sessions, active timetables)
      // Doing this globally once prevents N+1 query problems in the main loop.
      const data = await this.preloadData();

      // Check formateur timetables exist needed for scheduling constraints
      if (data.formateurTimetables.length === 0) {
        throw new Error('No formateur timetables found. Generate formateur timetables first.');
      }

      // Filter to only generate timetables for groups that DON'T already have active ones
      const groupsWithActiveTimetables = data.activeTimetables.map(t => t.groupId);
      const groups = await Group.findAll({
        where: {
          id: { [require('sequelize').Op.notIn]: groupsWithActiveTimetables }
        },
        include: [{
          model: require('../models').GroupModuleFormateur,
          include: [
            { model: Module, as: "module" },
            { model: Formateur, as: "formateur" },
          ],
        }],
      });

      if (groups.length === 0) {
        return {
          success: true,
          message: "All groups already have active timetables. No changes made.",
          stats: { ...this.stats, totalGroups: 0, successfulGroups: 0, failedGroups: 0 },
          groups: []
        };
      }

      this.stats.totalGroups = groups.length;
      const results = [];

      // Process groups sequentially to ensure no conflicts (no parallel processing).
      // Placing sessions requires a globally atomic view of availability.
      for (const group of groups) {
        try {
          const result = await this.generateGroupTimetable(group, valide_a_partir_de, data);
          results.push(result);
        } catch (error) {
          // Isolate failures so one broken group doesn't crash the entire generation task
          results.push({
            success: false,
            message: error.message,
            group: group.code_group,
            timetable: []
          });
        }
      }

      this.stats.averageTime = (Date.now() - startTime) / groups.length;

      return {
        success: true,
        message: "Optimized timetable generation completed - only new groups processed",
        stats: this.stats,
        groups: results
      };

    } catch (error) {
      return {
        success: false,
        message: error.message,
        stats: this.stats,
        groups: []
      };
    }
  }

  /**
   * Pre-load all necessary global scheduling data to minimize database queries.
   * By fetching all existant active sessions and formateur timetables upfront,
   * the backtracking algorithm can perform O(1) conflict lookups in memory.
   * 
   * @returns {Promise<Object>} An object containing mapped constraints (formateur schedules, global conflicts, classroom conflicts).
   */
  async preloadData() {
    const [formateurTimetables, existingSessions, activeTimetables] = await Promise.all([
      FormateurTimetable.findAll({ where: { year: new Date().getFullYear().toString() } }), // Matches current year
      Session.findAll({
        include: [{
          model: Timetable,
          as: 'timetable',
          where: { status: 'active' }
        }]
      }),
      Timetable.findAll({ where: { status: 'active' } })
    ]);

    // Create lookup maps for O(1) access during the backtracking loop
    // FIX 1: Store an ARRAY of timeshats per day to support formateurs with multiple
    // availability windows on the same day (e.g. 08:30-13:30 AND 13:30-18:30).
    // Previously .set() would silently overwrite earlier entries for the same day.
    const formateurScheduleMap = new Map();
    formateurTimetables.forEach(ft => {
      if (!formateurScheduleMap.has(ft.formateurId)) {
        formateurScheduleMap.set(ft.formateurId, new Map());
      }
      const dayMap = formateurScheduleMap.get(ft.formateurId);
      if (!dayMap.has(ft.day)) dayMap.set(ft.day, []);
      dayMap.get(ft.day).push(ft.timeshot);
    });

    const conflictMap = new Map();
    const classroomConflictMap = new Map(); // Track classroom conflicts to ensure a room is never double-booked

    // Populate conflict maps based on currently active timetables
    existingSessions.forEach(session => {
      const formateurKey = `${session.formateurId}-${session.day}-${session.timeshot}`;
      conflictMap.set(formateurKey, session);

      const classroomKey = `${session.classroomId}-${session.day}-${session.timeshot}`;
      classroomConflictMap.set(classroomKey, session);
    });

    return {
      formateurTimetables,
      existingSessions,
      activeTimetables,
      formateurScheduleMap,
      conflictMap,
      classroomConflictMap
    };
  }

  /**
   * Generate a timetable for a single group using intelligent slot assignment and a fast greedy algorithm.
   * 
   * Process Flow:
   * 1. Extracts the module assignments for the specific group.
   * 2. Transforms hours requested into individual 2.5-hour `Session` segments.
   * 3. Analyzes availability before starting (Fail-Fast mechanism).
   * 4. Attempts to place sessions into a 6-day x 4-slot grid using `solveWithBacktracking`.
   * 5. Saves the timetable to the database upon success.
   * 
   * @param {Object} group - The Sequelize Group model instance.
   * @param {string} valide_a_partir_de - The start date string for this schedule.
   * @param {Object} data - The globally preloaded map constraints.
   * @returns {Promise<Object>} Status object with the generated schedule array.
   */
  async generateGroupTimetable(group, valide_a_partir_de, data) {
    try {
      // Get all unplaced 2.5h sessions required for this group based on their assigned formateurs
      const sessions = this.transformGroupToSessions(group);

      if (sessions.length === 0) {
        return {
          success: true,
          message: "No sessions to schedule for this group",
          group: group.code_group,
          timetable: []
        };
      }

      // Quick pre-check: if any session has 0 available slots, fail fast
      for (let i = 0; i < sessions.length; i++) {
        const singleSessionMatrix = this.createAvailabilityMatrix([sessions[i]], data);
        const availability = singleSessionMatrix.get(0);
        if (!availability) {
          return {
            success: false,
            message: `No availability matrix for session: ${sessions[i].module_label}`,
            group: group.code_group,
            timetable: []
          };
        }

        let totalSlots = 0;
        for (const slots of availability.values()) {
          totalSlots += slots.length;
        }
        if (totalSlots === 0) {
          return {
            success: false,
            message: `No available slots for session: ${sessions[i].module_label}`,
            group: group.code_group,
            timetable: []
          };
        }
      }

      // Create availability matrix for all sessions
      const availabilityMatrix = this.createAvailabilityMatrix(sessions, data);

      // Use fast greedy algorithm
      const timetable = await this.solveWithBacktracking(sessions, availabilityMatrix, data);

      if (timetable) {
        // Store to database
        await this.storeTimetable(group, timetable, valide_a_partir_de);

        // NOTE: The conflict maps are already updated in real-time inside solveWithBacktracking
        // (Fix 2+3). This post-loop sync is kept as a safety net to ensure any sessions
        // written to the DB are also reflected (e.g. for sessions that bypass the solver).
        for (const dayObj of timetable) {
          const dayName = Object.keys(dayObj)[0];
          const assignedSessions = dayObj[dayName];
          for (const session of assignedSessions) {
            if (session.formateurId) {
              const formateurKey = `${session.formateurId}-${dayName}-${session.timeShot}`;
              data.conflictMap.set(formateurKey, session);
            }
            if (session.classroomId) {
              const classroomKey = `${session.classroomId}-${dayName}-${session.timeShot}`;
              data.classroomConflictMap.set(classroomKey, session);
            }
          }
        }

        this.stats.successfulGroups++;

        return {
          success: true,
          message: "Timetable generated successfully",
          group: group.code_group,
          timetable: timetable
        };
      } else {
        this.stats.failedGroups++;
        return {
          success: false,
          message: "No valid timetable found with current constraints",
          group: group.code_group,
          timetable: []
        };
      }

    } catch (error) {
      this.stats.failedGroups++;
      throw { message: error.message, group: group.code_group };
    }
  }

  /**
   * Transform group data to session objects
  /**
   * Transforms the raw database relational group assignments into a flat array of atomic 2.5-hour sessions.
   * By breaking down larger hour blocks (e.g. 5 hours) into independent 2.5-hour chunks, the algorithm
   * gains maximum flexibility to schedule them seamlessly across the week.
   * 
   * @param {Object} group - The Sequelize Group object containing modules and formateurs.
   * @returns {Array<Object>} An array of independent session objects representing 2.5 hours of instruction each.
   */
  transformGroupToSessions(group) {
    const sessions = [];

    group.GroupModuleFormateurs
      .filter(gmf => gmf.is_started === true && gmf.module && gmf.formateur)
      .forEach(gmf => {
        const totalHours = parseFloat(gmf.nbr_hours_presential_in_week);
        let remainingHours = totalHours;

        while (remainingHours > 0) {
          // Each session slot is always 2.5 hours — placed independently
          sessions.push({
            moduleId: gmf.module.id,
            module_label: gmf.module.label,
            code_module: gmf.module.code_module,
            formateurId: gmf.formateur.id,
            formateur: gmf.formateur.name,
            classroomId: gmf.formateur.classroomId || 1,
            classroom: `Salle${gmf.formateur.classroomId || 1}`,
            nbr_hours_presential_in_week: 2.5,
            type: 'présentiel',
            is_started: gmf.is_started,
            originalGmfId: gmf.id
          });
          remainingHours -= 2.5;
        }
      });

    return sessions;
  }

  /**
   * Constructs a 2D constraint matrix outlining every mathematically possible valid timeslot
   * for every session based on Formateur schedules, Global Formateur Conflicts, and Classroom Conflicts.
   * 
   * @param {Array<Object>} sessions - The flattened array of 2.5h sessions required.
   * @param {Object} data - The globally preloaded dictionary constraints.
   * @returns {Map<number, Map<string, Array<string>>>} Map of [SessionIndex -> Map[Day -> ValidTimeslots[]]]
   */
  createAvailabilityMatrix(sessions, data) {
    const matrix = new Map();

    sessions.forEach((session, index) => {
      const availability = new Map();

      DAYS.forEach(day => {
        const timeSlots = day === 'Samedi' ? SATURDAY_TIME_SHOTS : TIME_SHOTS;
        const availableSlots = [];

        // Check against the Formateur's raw stated availability times.
        // FIX 1 (usage): formateurScheduleMap now stores an ARRAY of windows per day.
        const formateurSchedule = data.formateurScheduleMap.get(session.formateurId);
        if (formateurSchedule && formateurSchedule.has(day)) {
          const formateurTimeshats = formateurSchedule.get(day); // now an array

          timeSlots.forEach(slot => {
            // Slot is valid if it fits within ANY of the formateur's availability windows for that day
            const fitsInWindow = formateurTimeshats.some(window =>
              this.isSlotWithinAvailability(slot, window)
            );
            if (fitsInWindow) {
              // Ensure no overlap with any other group's active timetable for this formateur
              const formateurConflictKey = `${session.formateurId}-${day}-${slot}`;
              if (!data.conflictMap.has(formateurConflictKey)) {
                // Ensure no overlap with any other group's active timetable for this classroom
                const classroomConflictKey = `${session.classroomId}-${day}-${slot}`;
                if (!data.classroomConflictMap.has(classroomConflictKey)) {
                  availableSlots.push(slot);
                }
              }
            }
          });
        }

        availability.set(day, availableSlots);
      });

      matrix.set(index, availability);
    });

    return matrix;
  }

  /**
   * Helper function comparing minute-integer times to verify if a finite timeslot
   * fits completely inside an overarching availability window.
   * 
   * @param {string} slot - The 2.5h slot (e.g., "08:30-11:00")
   * @param {string} availability - The full availability window (e.g., "08:30-18:30")
   * @returns {boolean} True if the slot fits perfectly inside the availability bounding box.
   */
  isSlotWithinAvailability(slot, availability) {
    const [slotStart, slotEnd] = slot.split('-').map(t => t.trim());
    const [availStart, availEnd] = availability.split('-').map(t => t.trim());

    const toMinutes = (t) => {
      const [h, m] = t.split(':');
      return h * 60 + Number(m);
    };

    return toMinutes(slotStart) >= toMinutes(availStart) &&
      toMinutes(slotEnd) <= toMinutes(availEnd);
  }

  /**
   * Core scheduling algorithm utilizing a Greedy Backtracking paradigm with MRV (Minimum Remaining Values) heuristic.
   * 
   * It sorts the sessions placing the "hardest to fit" ones first (MRV). It then iterates through days optimally,
   * preferring days where the specific module currently DOES NOT exist, naturally spacing out classes. It gracefully
   * skips sessions that cannot be mathematically resolved without crashing the generation process.
   * 
   * @param {Array<Object>} sessions - The atomic 2.5h sessions to place.
   * @param {Map} availabilityMatrix - The mapped constraints defining where a session could physically fit.
   * @param {Object} data - Global preloaded constraints (passed downwards to dynamic validators).
   * @returns {Promise<Array<Object>|null>} An array representing a generated timetable, or null if fundamentally fatal constraints.
   */
  async solveWithBacktracking(sessions, availabilityMatrix, data) {
    const timetable = DAYS.map(day => ({ [day]: [] }));

    // Sort ascending by integer len values: schedules the most constrained sessions first (MRV).
    const sortedSessions = sessions
      .map((session, index) => ({ session, index, availability: availabilityMatrix.get(index) }))
      .sort((a, b) => this.getTotalAvailableSlots(a.availability) - this.getTotalAvailableSlots(b.availability));

    let backtrackCount = 0;
    const MAX_BACKTRACKS = 50000;

    const backtrack = async (index) => {
      if (index === sortedSessions.length) return true;
      if (backtrackCount++ > MAX_BACKTRACKS) return false;

      const { session, availability } = sortedSessions[index];

      // Build day order: prefer days where this module has NO session yet (spacing heuristic)
      const daysWithModule = new Set(
        timetable.flatMap(dayObj => {
          const [day, dSessions] = Object.entries(dayObj)[0];
          return dSessions.some(s => s.moduleId === session.moduleId) ? [day] : [];
        })
      );

      const orderedDays = [
        ...DAYS.filter(d => !daysWithModule.has(d)),
        ...DAYS.filter(d => daysWithModule.has(d)),
      ];

      for (const day of orderedDays) {
        const slots = availability.get(day) || [];
        const orderedSlots = day === 'Samedi'
          ? slots.filter(s => SATURDAY_TIME_SHOTS.includes(s)).sort()
          : slots.filter(s => TIME_SHOTS.includes(s)).sort();

        for (const slot of orderedSlots) {
          if (this.isValidAssignment(session, day, slot, timetable, new Map(), data)) {
            // Place
            const dayIdx = DAYS.indexOf(day);
            timetable[dayIdx][day].push({ ...session, timeShot: slot });

            // Mark global conflict maps
            const fKey = `${session.formateurId}-${day}-${slot}`;
            const cKey = `${session.classroomId}-${day}-${slot}`;
            data.conflictMap.set(fKey, { ...session, timeShot: slot, day });
            data.classroomConflictMap.set(cKey, { ...session, timeShot: slot, day });

            // Recurse
            if (await backtrack(index + 1)) return true;

            // BACKTRACK: Remove if recursion failed
            timetable[dayIdx][day].pop();
            data.conflictMap.delete(fKey);
            data.classroomConflictMap.delete(cKey);
          }
        }
      }

      return false;
    };

    const success = await backtrack(0);
    if (!success) {
      // If we failed after many attempts, it's likely a constraint bottleneck.
      // Log it to the file (console is muted) so we can debug if needed.
      this.logToStartup(`❌ Backtracking failed for group after ${backtrackCount} attempts.`);
      return null;
    }

    return timetable;
  }

  // Helper for internal logging since console is muted
  logToStartup(message) {
    const logPath = path.join(os.homedir(), '.TimetableGenerator', 'backend-startup.log');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${message}\n`);
  }

  /**
   * Helper function for the Minimum Remaining Values (MRV) heuristic.
   * Calculates the raw integer count of strictly available timeslots for a given session.
   * By sorting sessions ascendingly by this number, the backtracking algorithm
   * attempts to place the hardest/most constrained sessions first.
   * 
   * @param {Map} availability - A day-keyed map of available 2.5h slots.
   * @returns {number} The aggregate sum of all available slots.
   */
  getTotalAvailableSlots(availability) {
    let total = 0;
    for (const slots of availability.values()) {
      total += slots.length;
    }
    return total;
  }

  /**
   * The primary conflict validation logic run right before finalizing a session's placement.
   * Verifies daily maximums, Saturday rules, strict exact-timeslot overlaps, formateur
   * double-bookings, classroom double-bookings, and distance gaps.
   * 
   * @param {Object} session - The session currently being evaluated.
   * @param {string} day - The candidate day (e.g. 'Lundi').
   * @param {string} slot - The candidate timeslot (e.g. '08:30-11:00').
   * @param {Array} timetable - The currently building timetable matrix.
   * @param {Map} assignments - Contextual map memory (unused in fast mode).
   * @param {Object} data - The global preloaded data cache.
   * @returns {boolean} True if putting this session in this slot violates ZERO rules.
   */
  isValidAssignment(session, day, slot, timetable, assignments, data) {
    const dayIndex = DAYS.indexOf(day);
    const daySessions = timetable[dayIndex][day];

    // Check max 4 sessions (10 hours total) per day for the group
    if (daySessions.length >= 4) {
      return false;
    }

    // Check Saturday constraints (max 2 sessions / 5 hours)
    if (day === 'Samedi' && daySessions.length >= 2) {
      return false;
    }

    // Only allow specific Saturday time slots on Saturday
    if (day === 'Samedi' && !SATURDAY_TIME_SHOTS.includes(slot)) {
      return false;
    }

    // FIX 4: Check cross-group formateur & classroom conflicts via live global maps.
    // This catches cases where another group already claimed this slot in the current
    // sequential run (written back immediately after each placement via Fix 2+3).
    const formateurGlobalKey = `${session.formateurId}-${day}-${slot}`;
    if (data.conflictMap.has(formateurGlobalKey)) {
      return false;
    }
    const classroomGlobalKey = `${session.classroomId}-${day}-${slot}`;
    if (data.classroomConflictMap.has(classroomGlobalKey)) {
      return false;
    }

    // Check for slot conflicts exclusively inside the current group's building timetable
    for (const existingSession of daySessions) {
      // Group cannot have two sessions running globally at exactly the same timeslot
      if (slot === existingSession.timeShot) {
        return false;
      }

      // Classroom concurrency: No exact timeslot overlap in the same physical room
      if (existingSession.classroomId === session.classroomId &&
        existingSession.timeShot === slot) {
        return false;
      }

      // Formateur concurrency: A Formateur cannot teach two modules at the exact same timeslot
      if (existingSession.formateurId === session.formateurId &&
        existingSession.timeShot === slot) {
        return false;
      }

      // Mode switching gap requirement: Need travel/context switch time between remote and presential
      if (existingSession.type !== session.type) {
        if (!this.hasSufficientGap(slot, existingSession.timeShot, 150)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Helper function to find the sequentially adjacent timeslot (Deprecated/Unused in independent chunk mode)
   */
  getNextSlot(currentSlot) {
    const index = TIME_SHOTS.indexOf(currentSlot);
    return index !== -1 && index < TIME_SHOTS.length - 1 ? TIME_SHOTS[index + 1] : null;
  }

  /**
   * Evaluates the minute-gap distance between two discrete timeslots to ensure
   * enough break time exists.
   * 
   * @param {string} slot1 - Primary slot constraint.
   * @param {string} slot2 - Contending slot.
   * @param {number} requiredMinutes - The minimum gap width mandated.
   * @returns {boolean} True if the calculated minute gap safely exceeds requiredMinutes.
   */
  hasSufficientGap(slot1, slot2, requiredMinutes = 150) {
    const gaps = {
      "08:30-11:00": { start: 510, end: 660 },
      "11:00-13:30": { start: 660, end: 810 },
      "13:30-16:00": { start: 810, end: 960 },
      "16:00-18:30": { start: 960, end: 1110 }
    };

    const def1 = gaps[slot1];
    const def2 = gaps[slot2];

    if (!def1 || !def2) return true;

    // If slots are the same, they overlap completely with 0 gap
    if (slot1 === slot2) {
      return false;
    }

    // Mathematically calculate gap between two adjacent bounded chunks
    let gap;
    if (def2.start > def1.end) {
      gap = def2.start - def1.end;
    } else if (def1.start > def2.end) {
      gap = def1.start - def2.end;
    } else {
      // Bounding boxes logically overlap or intersect
      return false;
    }

    // For remote/presential gap requirement, verify exact scalar width
    return gap >= requiredMinutes;
  }

  /**
   * Flushes atomic timetable session data to the SQL persistence layer.
   * Auto-archives any currently active timetables for the group.
   * 
   * @param {Object} group - The target group model.
   * @param {Array<Object>} timetableData - The resolved 2D grid matrix of mapped sessions.
   * @param {string} valide_a_partir_de - The scheduled activation date.
   * @returns {Promise<Object>} The cleanly hydrated database Timetable object.
   */
  async storeTimetable(group, timetableData, valide_a_partir_de) {
    // Archive existing timetables
    await Timetable.update(
      { status: 'archived' },
      { where: { groupId: group.id } }
    );

    // Create new timetable
    const timetable = await Timetable.create({
      groupId: group.id,
      valid_form: valide_a_partir_de,
      status: 'active',
      nbr_hours_in_week: 0
    });

    let totalHours = 0;

    // Store sessions
    for (const dayObj of timetableData) {
      const dayName = Object.keys(dayObj)[0];
      const sessions = dayObj[dayName];

      for (const session of sessions) {
        // FIX 5: Final DB-level guard — verify the slot has not been taken by any active
        // timetable before writing. Protects against rare retry/race edge cases.
        const { Op: SequelizeOp } = require('sequelize');
        const [fConflict, cConflict] = await Promise.all([
          Session.findOne({
            where: { formateurId: session.formateurId, day: dayName, timeshot: session.timeShot },
            include: [{ model: Timetable, as: 'timetable', where: { status: 'active', id: { [SequelizeOp.ne]: timetable.id } } }]
          }),
          Session.findOne({
            where: { classroomId: session.classroomId, day: dayName, timeshot: session.timeShot },
            include: [{ model: Timetable, as: 'timetable', where: { status: 'active', id: { [SequelizeOp.ne]: timetable.id } } }]
          })
        ]);

        if (fConflict) {
          console.error(`🚫 DB CONFLICT PREVENTED: Formateur ${session.formateurId} already active on ${dayName} ${session.timeShot} — session for ${session.module_label || 'unknown'} skipped.`);
          continue;
        }
        if (cConflict) {
          console.error(`🚫 DB CONFLICT PREVENTED: Classroom ${session.classroomId} already booked on ${dayName} ${session.timeShot} — session for ${session.module_label || 'unknown'} skipped.`);
          continue;
        }

        await Session.create({
          timetableId: timetable.id,
          groupId: group.id,
          moduleId: session.moduleId,
          formateurId: session.formateurId,
          classroomId: session.classroomId,
          timeshot: session.timeShot,
          type: session.type,
          day: dayName
        });

        // Each time slot represents 2.5 hours
        totalHours += 2.5;
      }
    }

    // Update total hours
    await timetable.update({ nbr_hours_in_week: totalHours });

    return timetable;
  }
}

module.exports = OptimizedTimetableGenerator;
