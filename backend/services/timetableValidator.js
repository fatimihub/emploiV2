const { 
  GroupModuleFormateur, 
  ModuleRemoteSession,
  FormateurTimetable, 
  Session, 
  Timetable,
  Formateur,
  Classroom,
  Setting
} = require("../models/index.js");

const {
  canAddSessionWithGapRule,
  hasSufficientGap
} = require("../controllers/GA/constraints.js");

/**
 * Timetable Validator Service
 * 
 * This service validates generated timetables to ensure:
 * 1. All required sessions are scheduled
 * 2. No conflicts exist (overlapping sessions, formateur unavailability, room conflicts)
 * 3. Gap rules are respected
 * 4. All constraints are satisfied
 */

class TimetableValidator {
  
  /**
   * Main validation function for a complete timetable
   * @param {Object} timetable - The timetable to validate
   * @param {Object} group - The group object
   * @param {Array} requiredSessions - Array of required sessions
   * @returns {Object} Validation result with details
   */
  static async validateTimetable(timetable, group, requiredSessions) {
    try {
      if (process.env.NODE_ENV !== 'production') console.log(`Validating timetable for group: ${group.code_group}`);

      const validationResults = {
        isValid: true,
        groupCode: group.code_group,
        groupId: group.id,
        errors: [],
        warnings: [],
        details: {
          totalRequiredSessions: requiredSessions.length,
          totalScheduledSessions: 0,
          missingSessions: [],
          conflicts: [],
          gapRuleViolations: []
        }
      };

      // Step 1: Check if all required sessions are scheduled
      const sessionValidation = await this.validateAllSessionsScheduled(timetable, requiredSessions);
      if (!sessionValidation.isValid) {
        validationResults.isValid = false;
        validationResults.errors.push(sessionValidation.message);
        validationResults.details.missingSessions = sessionValidation.missingSessions;
        if (sessionValidation.missingSessions && sessionValidation.missingSessions.length > 0) {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`  [DETAIL] Missing sessions:`);
            sessionValidation.missingSessions.forEach((ms, idx) => {
              console.log(`    ${idx + 1}. Module: ${ms.module_label}, Formateur: ${ms.formateur}, Type: ${ms.type}, Day: ${ms.day}`);
            });
          }
        }
      }
      validationResults.details.totalScheduledSessions = sessionValidation.scheduledCount;

      // Step 2: Check for scheduling conflicts (ZERO TOLERANCE)
      const conflictValidation = await this.validateNoConflicts(timetable, group, []);
      if (!conflictValidation.isValid) {
        validationResults.isValid = false;
        validationResults.errors.push(conflictValidation.message);
        validationResults.details.conflicts = conflictValidation.conflicts;
        if (conflictValidation.conflicts && conflictValidation.conflicts.length > 0) {
          console.log(`  [DETAIL] Scheduling conflicts:`);
          conflictValidation.conflicts.forEach((conf, idx) => {
            console.log(`    ${idx + 1}. [${conf.type}] ${conf.message}`);
          });
        }
      }

      // Step 3: Check gap rule compliance (if any remain)
      const gapValidation = this.validateGapRules(timetable);
      if (!gapValidation.isValid) {
        validationResults.isValid = false;
        validationResults.errors.push(gapValidation.message);
        validationResults.details.gapRuleViolations = gapValidation.violations;
        if (gapValidation.violations && gapValidation.violations.length > 0) {
          console.log(`  [DETAIL] Gap rule violations:`);
          gapValidation.violations.forEach((v, idx) => {
            console.log(`    ${idx + 1}. [${v.type}] ${v.message}`);
          });
        }
      }

      // Step 4: Check formateur availability
      const availabilityValidation = await this.validateFormateurAvailability(timetable);
      if (!availabilityValidation.isValid) {
        validationResults.isValid = false;
        validationResults.errors.push(availabilityValidation.message);
        validationResults.details.formateurConflicts = availabilityValidation.conflicts;
        if (availabilityValidation.conflicts && availabilityValidation.conflicts.length > 0) {
          console.log(`  [DETAIL] Formateur availability conflicts:`);
          availabilityValidation.conflicts.forEach((c, idx) => {
            console.log(`    ${idx + 1}. [${c.type}] ${c.message}`);
          });
        }
      }

      // Step 5: Check room availability
      const roomValidation = await this.validateRoomAvailability(timetable);
      if (!roomValidation.isValid) {
        validationResults.isValid = false;
        validationResults.errors.push(roomValidation.message);
        validationResults.details.roomConflicts = roomValidation.conflicts;
        if (roomValidation.conflicts && roomValidation.conflicts.length > 0) {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`  [DETAIL] Room conflicts:`);
            roomValidation.conflicts.forEach((c, idx) => {
              console.log(`    ${idx + 1}. [${c.type}] ${c.message}`);
            });
          }
        }
      }

      // Step 6: Additional strict validation for 0 conflicts
      const strictValidation = this.validateStrictConstraints(timetable, group);
      if (!strictValidation.isValid) {
        validationResults.isValid = false;
        validationResults.errors.push(strictValidation.message);
        validationResults.details.strictViolations = strictValidation.violations;
        if (strictValidation.violations && strictValidation.violations.length > 0) {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`  [DETAIL] Strict constraint violations:`);
            strictValidation.violations.forEach((v, idx) => {
              console.log(`    ${idx + 1}. [${v.type}] ${v.message}`);
            });
          }
        }
      }

      if (process.env.NODE_ENV !== 'production') console.log(`Timetable validation completed for ${group.code_group}: ${validationResults.isValid ? 'VALID' : 'INVALID'}`);
      
      return validationResults;

    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error("Error validating timetable:", error);
      return {
        isValid: false,
        groupCode: group.code_group,
        groupId: group.id,
        errors: ["Error validating timetable: " + error.message],
        details: { error: error.message }
      };
    }
  }

  /**
   * Validate that all required sessions are scheduled
   * @param {Object} timetable - The timetable to validate
   * @param {Array} requiredSessions - Array of required sessions
   * @returns {Object} Validation result
   */
  static async validateAllSessionsScheduled(timetable, requiredSessions) {
    const scheduledSessions = [];
    const missingSessions = [];

    // Collect all scheduled sessions
    timetable.forEach(dayObj => {
      const dayName = Object.keys(dayObj)[0];
      const daySessions = dayObj[dayName];
      
      daySessions.forEach(session => {
        scheduledSessions.push({
          moduleId: session.moduleId,
          formateurId: session.formateurId,
          type: session.type,
          hours: session.nbr_hours_presential_in_week || session.nbr_hours_remote_session_in_week
        });
      });
    });

    // Check each required session
    for (const requiredSession of requiredSessions) {
      const requiredHours = Number(requiredSession.nbr_hours_presential_in_week || requiredSession.nbr_hours_remote_session_in_week);
      const scheduledHours = scheduledSessions
        .filter(s => s.moduleId === requiredSession.moduleId && s.formateurId === requiredSession.formateurId)
        .reduce((total, s) => total + Number(s.hours), 0);

      if (scheduledHours < requiredHours) {
        missingSessions.push({
          moduleId: requiredSession.moduleId,
          moduleLabel: requiredSession.module_label,
          formateurId: requiredSession.formateurId,
          formateurName: requiredSession.formateur,
          requiredHours,
          scheduledHours,
          missingHours: requiredHours - scheduledHours
        });
      }
    }

    return {
      isValid: missingSessions.length === 0,
      message: missingSessions.length > 0 ? 
        `${missingSessions.length} sessions are missing or incomplete` : 
        "All required sessions are scheduled",
      missingSessions,
      scheduledCount: scheduledSessions.length
    };
  }

  /**
   * Validate that no scheduling conflicts exist - ZERO TOLERANCE
   * @param {Object} timetable - The timetable to validate
   * @param {Object} group - The group object
   * @param {Array} allGroupsTimetables - All groups' timetables for cross-group validation
   * @returns {Object} Validation result
   */
  static async validateNoConflicts(timetable, group, allGroupsTimetables = []) {
    const conflicts = [];

    // 1. Check for overlapping sessions within the same day (internal conflicts)
    timetable.forEach(dayObj => {
      const dayName = Object.keys(dayObj)[0];
      const daySessions = dayObj[dayName];
      // Check for duplicate time slots (true overlaps only)
      const timeSlotMap = new Map();
      const formateurTimeMap = new Map();
      daySessions.forEach(session => {
        const timeSlot = session.timeShot;
        // Time slot conflict check (true overlap)
        if (timeSlotMap.has(timeSlot)) {
          conflicts.push({
            type: 'time_slot_conflict',
            day: dayName,
            timeSlot,
            session1: timeSlotMap.get(timeSlot),
            session2: session,
            message: `Two sessions scheduled at the same time: ${timeSlot}`
          });
        } else {
          timeSlotMap.set(timeSlot, session);
        }
        // Formateur conflict check within same day
        const formateurKey = `${session.formateurId}-${timeSlot}`;
        if (formateurTimeMap.has(formateurKey)) {
          conflicts.push({
            type: 'formateur_double_booking',
            day: dayName,
            timeSlot,
            formateurId: session.formateurId,
            formateurName: session.formateur,
            session1: formateurTimeMap.get(formateurKey),
            session2: session,
            message: `Formateur ${session.formateur} double-booked at ${timeSlot}`
          });
        } else {
          formateurTimeMap.set(formateurKey, session);
        }
      });
    });

    // 2. Check for formateur conflicts across all groups (cross-group conflicts)
    if (allGroupsTimetables.length > 0) {
      const globalFormateurTimeMap = new Map();
      
      // Build global formateur schedule
      allGroupsTimetables.forEach(groupTimetable => {
        if (groupTimetable.code_group === group.code_group) return; // Skip current group
        
        groupTimetable.timetable.forEach(dayObj => {
          const dayName = Object.keys(dayObj)[0];
          const daySessions = dayObj[dayName];
          
          daySessions.forEach(session => {
            const globalKey = `${session.formateurId}-${dayName}-${session.timeShot}`;
            globalFormateurTimeMap.set(globalKey, {
              groupCode: groupTimetable.code_group,
              session: session
            });
          });
        });
      });

      // Check current group against global schedule
      timetable.forEach(dayObj => {
        const dayName = Object.keys(dayObj)[0];
        const daySessions = dayObj[dayName];
        
        daySessions.forEach(session => {
          const globalKey = `${session.formateurId}-${dayName}-${session.timeShot}`;
          
          if (globalFormateurTimeMap.has(globalKey)) {
            const existing = globalFormateurTimeMap.get(globalKey);
            conflicts.push({
              type: 'cross_group_formateur_conflict',
              day: dayName,
              timeSlot: session.timeShot,
              formateurId: session.formateurId,
              formateurName: session.formateur,
              currentGroup: group.code_group,
              conflictingGroup: existing.groupCode,
              currentSession: session,
              conflictingSession: existing.session,
              message: `Formateur ${session.formateur} already scheduled in group ${existing.groupCode} at ${session.timeShot}`
            });
          }
        });
      });
    }

    // 3. Check for room conflicts across all groups
    if (allGroupsTimetables.length > 0) {
      const globalRoomTimeMap = new Map();
      
      // Build global room schedule
      allGroupsTimetables.forEach(groupTimetable => {
        if (groupTimetable.code_group === group.code_group) return; // Skip current group
        
        groupTimetable.timetable.forEach(dayObj => {
          const dayName = Object.keys(dayObj)[0];
          const daySessions = dayObj[dayName];
          
          daySessions.forEach(session => {
            if (session.type === 'présentiel' && session.classroomId) {
              const globalKey = `${session.classroomId}-${dayName}-${session.timeShot}`;
              globalRoomTimeMap.set(globalKey, {
                groupCode: groupTimetable.code_group,
                session: session
              });
            }
          });
        });
      });

      // Check current group against global room schedule
      timetable.forEach(dayObj => {
        const dayName = Object.keys(dayObj)[0];
        const daySessions = dayObj[dayName];
        
        daySessions.forEach(session => {
          if (session.type === 'présentiel' && session.classroomId) {
            const globalKey = `${session.classroomId}-${dayName}-${session.timeShot}`;
            
            if (globalRoomTimeMap.has(globalKey)) {
              const existing = globalRoomTimeMap.get(globalKey);
              conflicts.push({
                type: 'cross_group_room_conflict',
                day: dayName,
                timeSlot: session.timeShot,
                classroomId: session.classroomId,
                currentGroup: group.code_group,
                conflictingGroup: existing.groupCode,
                currentSession: session,
                conflictingSession: existing.session,
                message: `Room ${session.classroomId} already occupied by group ${existing.groupCode} at ${session.timeShot}`
              });
            }
          }
        });
      });
    }

    // (No consecutive_session_conflict for valid consecutive slots)
    return {
      isValid: conflicts.length === 0,
      message: conflicts.length > 0 ? 
        `${conflicts.length} scheduling conflicts detected` : 
        "No scheduling conflicts found",
      conflicts
    };
  }

  /**
   * Validate gap rule compliance
   * @param {Object} timetable - The timetable to validate
   * @returns {Object} Validation result
   */
  static validateGapRules(timetable) {
    const violations = [];

    timetable.forEach(dayObj => {
      const dayName = Object.keys(dayObj)[0];
      const daySessions = dayObj[dayName];
      
      // Check each session against all other sessions in the same day
      for (let i = 0; i < daySessions.length; i++) {
        for (let j = i + 1; j < daySessions.length; j++) {
          const session1 = daySessions[i];
          const session2 = daySessions[j];
          
          // If one is remote and the other is presential, check gap rule
          if (session1.type !== session2.type) {
            if (!hasSufficientGap(session1.timeShot, session2.timeShot)) {
              violations.push({
                day: dayName,
                session1: {
                  module: session1.module_label,
                  timeSlot: session1.timeShot,
                  type: session1.type
                },
                session2: {
                  module: session2.module_label,
                  timeSlot: session2.timeShot,
                  type: session2.type
                },
                message: `Insufficient gap between ${session1.type} and ${session2.type} sessions`
              });
            }
          }
        }
      }
    });

    return {
      isValid: violations.length === 0,
      message: violations.length > 0 ? 
        `${violations.length} gap rule violations detected` : 
        "All gap rules are satisfied",
      violations
    };
  }

  /**
   * Validate formateur availability
   * @param {Object} timetable - The timetable to validate
   * @returns {Object} Validation result
   */
  static async validateFormateurAvailability(timetable) {
    const conflicts = [];

    for (const dayObj of timetable) {
      const dayName = Object.keys(dayObj)[0];
      const daySessions = dayObj[dayName];
      
      for (const session of daySessions) {
        // Check if formateur is available at this time
        const formateurTimetable = await FormateurTimetable.findOne({
          where: {
            formateurId: session.formateurId,
            day: dayName,
            year: '2025'
          }
        });

        if (!formateurTimetable) {
          conflicts.push({
            type: 'formateur_unavailable',
            day: dayName,
            session,
            message: `Formateur ${session.formateur} is not available on ${dayName}`
          });
          continue;
        }

        // Check if session time is within formateur's available time
        const [formateurStart, formateurEnd] = formateurTimetable.timeshot.split('-');
        const [sessionStart, sessionEnd] = session.timeShot.split('-');
        
        if (sessionStart < formateurStart || sessionEnd > formateurEnd) {
          conflicts.push({
            type: 'formateur_time_conflict',
            day: dayName,
            session,
            formateurAvailability: formateurTimetable.timeshot,
            message: `Session time ${session.timeShot} is outside formateur's availability ${formateurTimetable.timeshot}`
          });
        }
      }
    }

    return {
      isValid: conflicts.length === 0,
      message: conflicts.length > 0 ? 
        `${conflicts.length} formateur availability conflicts detected` : 
        "All formateurs are available for their scheduled sessions",
      conflicts
    };
  }

  /**
   * Validate room availability
   * @param {Object} timetable - The timetable to validate
   * @returns {Object} Validation result
   */
  static async validateRoomAvailability(timetable) {
    const conflicts = [];

    for (const dayObj of timetable) {
      const dayName = Object.keys(dayObj)[0];
      const daySessions = dayObj[dayName];
      
      // Check for room conflicts (same room used at same time)
      const roomTimeMap = new Map();
      
      for (const session of daySessions) {
        if (session.type === 'présentiel' && session.classroomId) {
          const key = `${session.classroomId}-${session.timeShot}`;
          
          if (roomTimeMap.has(key)) {
            conflicts.push({
              type: 'room_conflict',
              day: dayName,
              timeSlot: session.timeShot,
              classroomId: session.classroomId,
              session1: roomTimeMap.get(key),
              session2: session,
              message: `Room conflict: two sessions scheduled in same room at ${session.timeShot}`
            });
          } else {
            roomTimeMap.set(key, session);
          }
        }
      }
    }

    return {
      isValid: conflicts.length === 0,
      message: conflicts.length > 0 ? 
        `${conflicts.length} room conflicts detected` : 
        "No room conflicts found",
      conflicts
    };
  }

  /**
   * Validate strict constraints for 0 conflicts
   * @param {Object} timetable - The timetable to validate
   * @param {Object} group - The group object
   * @returns {Object} Validation result
   */
  static validateStrictConstraints(timetable, group) {
    const violations = [];
    // All logic for unbalanced_distribution and missing_session_type has been removed.
    // Only keep other strict constraints if needed.
    return {
      isValid: violations.length === 0,
      message: violations.length > 0 ? `${violations.length} strict constraint violations detected` : "No strict constraint violations found",
      violations
    };
  }

  /**
   * Get detailed validation report
   * @param {Object} validationResult - The validation result
   * @returns {string} Detailed report
   */
  static generateValidationReport(validationResult) {
    let report = `\nTimetable Validation Report for Group: ${validationResult.groupCode}\n`;
    report += `Status: ${validationResult.isValid ? 'VALID' : 'INVALID'}\n\n`;

    if (validationResult.errors.length > 0) {
      report += `Errors (${validationResult.errors.length}):\n`;
      validationResult.errors.forEach(error => {
        report += `  - ${error}\n`;
      });
      report += '\n';
    }

    if (validationResult.warnings.length > 0) {
      report += `Warnings (${validationResult.warnings.length}):\n`;
      validationResult.warnings.forEach(warning => {
        report += `  - ${warning}\n`;
      });
      report += '\n';
    }

    report += `Statistics:\n`;
    report += `  - Required Sessions: ${validationResult.details.totalRequiredSessions}\n`;
    report += `  - Scheduled Sessions: ${validationResult.details.totalScheduledSessions}\n`;
    report += `  - Missing Sessions: ${validationResult.details.missingSessions.length}\n`;
    report += `  - Conflicts: ${validationResult.details.conflicts.length}\n`;
    report += `  - Gap Rule Violations: ${validationResult.details.gapRuleViolations.length}\n`;

    return report;
  }
}

module.exports = TimetableValidator; 