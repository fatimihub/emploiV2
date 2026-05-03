// Move all require statements to the top of the file, after 'use strict' if present
const TimetableValidator = require('./timetableValidator.js');
const TimetableRetryService = require('./timetableRetryService.js');
const { transformGroupwithModules } = require("../helpers/transformers/groupWithSessionPresential.js");
const { GenerationReport, GlobalGenerationReport } = require('../models');
const {
  Group,
  Merge,
  GroupModuleFormateur,
  Branch,
  Module,
  Formateur,
  Classroom,
  FormateurTimetable,
  Session,
  Timetable,
  GroupsNeedChangeTimetable,
  Setting,
  Traning,
} = require("../models/index.js");
const { Op } = require('sequelize');
const {
  getRandomDay,
  getRandomTimeShot,
  getRandomTimeShotInSamedi,
  getNextTimeShot,
} = require("../controllers/GA/randoms.js");
const {
  canAddSessionToDay,
  canAddSessionToDaySamedi,
  checkIfTimeshotTakenInDayEdit,
  checkIfHaveSessionRemoteInDay,
  checkIfSessionWithFormateurTakenByGroup,
  checkFormateurAvailabilityForGroup,
  getValidTimeShotsForFormateurDay,
  isTimeshotTaken,
  canAddSessionWithGapRule,
  findAlternativeTimeSlot
} = require("../controllers/GA/constraints.js");
const { sortSessionInDay } = require("../controllers/GA/helper.js");
const generateTimetableRemoteForEveryMerge = require("../controllers/GA/Generate-remote-timetable.js");

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const TIME_SHOTS = ["08:30-11:00", "11:00-13:30", "13:30-16:00", "16:00-18:30"];

/**
 * Enhanced Timetable Generator
 * 
 * This service provides enhanced timetable generation with:
 * 1. Comprehensive validation
 * 2. Automatic retry logic
 * 3. Conflict detection and resolution
 * 4. Detailed reporting
 */

class EnhancedTimetableGenerator {

  constructor(maxAttempts = 50) {
    this.retryService = new TimetableRetryService(maxAttempts);
    this.generationStats = {
      totalGroups: 0,
      successfulGroups: 0,
      failedGroups: 0,
      totalAttempts: 0,
      averageAttempts: 0
    };
  }

  /**
   * Generate timetables for all groups with enhanced validation and retry
   * @param {string} valide_a_partir_de - Valid from date
   * @param {Object} options - Generation options
   * @returns {Object} Generation results
   */
  async generateAllTimetables(valide_a_partir_de, options = {}) {
    if (process.env.NODE_ENV !== 'production') console.log(`Starting enhanced timetable generation for date: ${valide_a_partir_de}`);

    this.generationStats = {
      totalGroups: 0,
      successfulGroups: 0,
      failedGroups: 0,
      totalAttempts: 0,
      averageAttempts: 0
    };

    const results = {
      success: true,
      message: "Timetable generation completed",
      stats: this.generationStats,
      groups: [],
      errors: []
    };

    try {
      // Check if formateur timetables exist
      const timetablesFormateur = await FormateurTimetable.findOne();
      if (!timetablesFormateur) {
        throw new Error('Before generating group timetables, formateur timetables must be generated first!');
      }

      // Check if this is first generation or update
      const timetablesDB = await Timetable.findAll({});
      const isFirstGeneration = timetablesDB.length === 0;

      if (isFirstGeneration) {
        if (process.env.NODE_ENV !== 'production') console.log("First generation mode - generating for all groups");
        await this.generateFirstTime(valide_a_partir_de, options, results);
      } else {
        if (process.env.NODE_ENV !== 'production') console.log("Update mode - generating for groups that need changes");
        await this.generateUpdates(valide_a_partir_de, options, results);
      }

      // Calculate final statistics
      this.calculateFinalStats(results);

      // Clean up groups that needed changes
      await GroupsNeedChangeTimetable.destroy({ truncate: true });

      if (process.env.NODE_ENV !== 'production') {
        console.log(`Enhanced timetable generation completed`);
        console.log(`Final Statistics:`, this.generationStats);
      }

      return results;

    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error("Error in enhanced timetable generation:", error);
      results.success = false;
      results.message = "Timetable generation failed";
      results.errors.push(error.message);
      return results;
    }
  }

  /**
   * Generate timetables for first time (all groups)
   * @param {string} valide_a_partir_de - Valid from date
   * @param {Object} options - Generation options
   * @param {Object} results - Results object to update
   */
  async generateFirstTime(valide_a_partir_de, options, results) {
    // Cleanup: remove expired stage records
    await Traning.destroy({ where: { date_fin: { [Op.lt]: new Date() } } });
    const branches = await Branch.findAll({
      include: [{ model: Group, include: [Merge] }],
    });

    // Fetch all groups currently en stage (date_start <= now <= date_fin)
    const now = new Date();
    const groupsEnStage = await Traning.findAll({
      where: {
        date_start: { [Op.lte]: now },
        date_fin: { [Op.gte]: now }
      }
    });
    const groupsEnStageIds = groupsEnStage.map(t => t.groupId);

    this.generationStats.totalGroups = branches.reduce((total, branch) => total + branch.Groups.length, 0);

    // Fetch max hours per week from settings
    let maxHoursPerWeek = 35;
    try {
      const presentialSetting = await Setting.findOne({ where: { key: 'max_presential_hours' } });
      if (presentialSetting && !isNaN(Number(presentialSetting.value))) {
        maxHoursPerWeek = Number(presentialSetting.value);
      }
    } catch (e) { }

    // Pre-check: For each group, calculate total planned hours per week and compare to max
    for (const branch of branches) {
      for (const group of branch.Groups) {
        // Skip group if currently en stage
        if (groupsEnStageIds.includes(group.id)) {
          if (process.env.NODE_ENV !== 'production') console.log(`Skipping group ${group.code_group} (ID: ${group.id}) because it is currently en stage.`);
          continue;
        }
        // Get all active modules for this group
        const groupModules = await this.getGroupModulesWithDetails(group.id);
        const activeModules = groupModules.filter(m => m.validate_efm !== true);
        let totalPresential = 0;
        let totalRemote = 0;
        activeModules.forEach(m => {
          totalPresential += Number(m.nbr_hours_presential_in_week || 0);
          // If you want to include remote hours in the weekly max, add here:
          // totalRemote += Number(m.nbr_hours_remote_in_week || 0);
        });
        const totalWeekly = totalPresential; // + totalRemote if needed
        if (totalWeekly > maxHoursPerWeek) {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`\n⚠️  Group ${group.code_group}: Total planned presential hours per week (${totalWeekly}) EXCEEDS max allowed (${maxHoursPerWeek}).`);
            console.log(`   - Consider reducing weekly hours for some modules or pausing modules in some weeks.`);
          }
          // Optionally, skip generation for this group:
          // results.groups.push({ groupCode: group.code_group, success: false, message: `Total planned hours per week exceeds max allowed.` });
          // this.generationStats.failedGroups++;
          // results.errors.push(`Group ${group.code_group}: Total planned hours per week exceeds max allowed.`);
          // continue;
        } else {
          if (process.env.NODE_ENV !== 'production') console.log(`Group ${group.code_group}: Total planned presential hours per week = ${totalWeekly} (OK)`);
        }
        // Proceed with timetable generation
        const groupResult = await this.generateGroupTimetable(group, valide_a_partir_de, options);
        results.groups.push(groupResult);
        if (groupResult.success) {
          this.generationStats.successfulGroups++;
        } else {
          this.generationStats.failedGroups++;
          results.errors.push(`Group ${group.code_group}: ${groupResult.message}`);
        }
      }
    }
    // After all groups processed, aggregate and save global report
    const dateStr = new Date().toLocaleDateString('fr-FR');
    let globalFrenchReport = `Rapport global de génération d'emplois du temps (${dateStr})\n\n`;
    globalFrenchReport += `Résumé :\n- Groupes traités : ${this.generationStats.totalGroups}\n- Succès : ${this.generationStats.successfulGroups}\n- Échecs : ${this.generationStats.failedGroups}\n\n`;
    results.groups.forEach(groupResult => {
      if (groupResult.frenchReport) {
        const cleanReport = groupResult.frenchReport.replace(/[\u{1F600}-\u{1F6FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}]/gu, '');
        globalFrenchReport += `Groupe ${groupResult.groupCode} :\n`;
        globalFrenchReport += cleanReport + '\n';
        globalFrenchReport += '----------------------------------------\n';
      }
    });
    globalFrenchReport += `\nPour toute question, veuillez contacter l'administrateur du système.\n`;
    results.globalFrenchReport = globalFrenchReport;
    try {
      if (process.env.NODE_ENV !== 'production') console.log('Attempting to save global generation report (first time)...');
      await GlobalGenerationReport.create({
        date: new Date(),
        reportText: globalFrenchReport,
        totalGroups: this.generationStats.totalGroups,
        successCount: this.generationStats.successfulGroups,
        failCount: this.generationStats.failedGroups
      });
      if (process.env.NODE_ENV !== 'production') console.log('Global generation report (first time) saved successfully.');
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') console.error('Failed to save global generation report (first time):', err);
    }
  }

  /**
   * Generate timetables for groups that need updates
   * @param {string} valide_a_partir_de - Valid from date
   * @param {Object} options - Generation options
   * @param {Object} results - Results object to update
   */
  async generateUpdates(valide_a_partir_de, options, results) {
    // Cleanup: remove expired stage records
    await Traning.destroy({ where: { date_fin: { [Op.lt]: new Date() } } });
    const groups = await GroupsNeedChangeTimetable.findAll({
      include: [
        { model: Group, include: [{ model: Merge }] }
      ]
    });

    this.generationStats.totalGroups = groups.length;

    const allFrenchReports = [];
    let successCount = 0;
    let failCount = 0;
    let totalGroups = 0;

    for (const groupData of groups) {
      const group = groupData.Group;
      const groupResult = await this.generateGroupTimetable(group, valide_a_partir_de, options);
      results.groups.push(groupResult);
      totalGroups++;
      if (groupResult.success) successCount++;
      else failCount++;
      if (groupResult.frenchReport) {
        allFrenchReports.push({
          groupCode: groupResult.groupCode,
          status: groupResult.success ? 'success' : 'failed',
          frenchReport: groupResult.frenchReport
        });
      }
    }

    // Build global French report: only per-group explanations, no summary or footer
    let globalFrenchReport = '';
    allFrenchReports.forEach(rep => {
      // Remove emojis from each frenchReport
      const cleanReport = rep.frenchReport.replace(/[\u{1F600}-\u{1F6FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}]/gu, '');
      globalFrenchReport += cleanReport + '\n';
    });
    results.globalFrenchReport = globalFrenchReport;
    // Store in a global reports table (French, no emojis)
    try {
      if (process.env.NODE_ENV !== 'production') console.log('Attempting to save global generation report...');
      await GlobalGenerationReport.create({
        date: new Date(),
        reportText: globalFrenchReport,
        totalGroups,
        successCount,
        failCount
      });
      if (process.env.NODE_ENV !== 'production') console.log('Global generation report saved successfully.');
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') console.error('Failed to save global generation report:', err);
    }
  }

  /**
   * Generate timetable for a single group with retry logic and module deactivation
   * @param {Object} group - The group object
   * @param {string} valide_a_partir_de - Valid from date
   * @param {Object} options - Generation options
   * @returns {Object} Generation result
   */
  async generateGroupTimetable(group, valide_a_partir_de, options) {
    if (process.env.NODE_ENV !== 'production') console.log(`\nGenerating timetable for group: ${group.code_group}`);
    try {
      // Get required sessions for the group
      let requiredSessions = await this.getRequiredSessions(group);

      // ADD THIS CHECK:
      if (!requiredSessions || requiredSessions.length === 0) {
        if (process.env.NODE_ENV !== 'production') console.log(`Group ${group.code_group} has no active modules. Skipping timetable generation.`);
        return {
          success: true,
          message: "No active modules for this group. Skipped.",
          timetable: [],
          deactivatedModules: []
        };
      }

      // FAST PRE-CHECK FOR AVAILABLE SLOTS FOR EACH MODULE
      const { getValidTimeShotsForFormateurDay } = require('../controllers/GA/constraints.js');
      const { GroupModuleFormateur } = require('../models');
      let filteredSessions = [];
      for (const session of requiredSessions) {
        let allAvailableSlots = [];
        for (const day of ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]) {
          const slots = await getValidTimeShotsForFormateurDay(session.formateurId, day);
          allAvailableSlots.push(...slots);
        }
        const availableSessions = allAvailableSlots.length;
        const requiredSessionCount = Math.ceil(Number(session.nbr_hours_presential_in_week) / 2.5);
        if (availableSessions < requiredSessionCount) {
          // Mark as unschedulable and skip
          await GroupModuleFormateur.update(
            { is_started: false },
            {
              where: {
                groupId: group.id,
                moduleId: session.moduleId,
                formateurId: session.formateurId
              }
            }
          );
          if (process.env.NODE_ENV !== 'production') console.warn(`Module ${session.module_label} for group ${group.code_group} cannot be scheduled: only ${availableSessions} slots available, but ${requiredSessionCount} required. Skipping.`);
          continue;
        }
        filteredSessions.push(session);
      }
      if (filteredSessions.length === 0) {
        return {
          success: false,
          message: "No modules could be scheduled for this group due to formateur availability.",
          timetable: [],
          deactivatedModules: requiredSessions.map(s => s.module_label)
        };
      }
      requiredSessions = filteredSessions;

      let originalSessions = [...requiredSessions]; // Keep original for comparison

      // Try with 100 attempts first
      const maxAttempts = 100;
      let result = await this.retryService.generateWithRetry(
        (group, options) => this.generateSingleTimetable(group, options),
        group,
        requiredSessions,
        { ...options, maxAttempts }
      );

      // If still no valid timetable, start deactivating modules with most duration
      if (!result.success) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`\n⚠️  Failed to generate valid timetable after ${maxAttempts} attempts`);
          console.log(`🔄 Starting module deactivation strategy for group: ${group.code_group}`);
        }

        result = await this.generateWithModuleDeactivation(group, requiredSessions, valide_a_partir_de, options);
      }

      // Store timetable if successful
      if (result.success) {
        // Validate the generated timetable for conflicts (formateur double-booking, etc.)
        const validationResult = await TimetableValidator.validateTimetable(result.timetable, group, requiredSessions);
        if (!validationResult.isValid) {
          if (process.env.NODE_ENV !== 'production') console.log(`❌ Timetable validation failed for group: ${group.code_group}`);
          return {
            groupCode: group.code_group,
            groupId: group.id,
            success: false,
            message: 'Timetable validation failed: ' + (validationResult.errors && validationResult.errors.length > 0 ? validationResult.errors.join('; ') : 'Unknown conflict'),
            validationResult: validationResult,
            deactivatedModules: result.deactivatedModules || []
          };
        }
        await this.storeTimetableToDB(group.code_group, result.timetable, valide_a_partir_de);
        if (process.env.NODE_ENV !== 'production') console.log(`✅ Timetable stored for group: ${group.code_group}`);
      } else {
        if (process.env.NODE_ENV !== 'production') console.log(`❌ Failed to generate timetable for group: ${group.code_group} even with module deactivation`);
      }

      // Generate detailed report
      const report = this.retryService.generateReport(result);
      const frenchReport = this.retryService.generateFrenchAdminReport(result);
      if (process.env.NODE_ENV !== 'production') console.log(report);
      if (process.env.NODE_ENV !== 'production') console.log(frenchReport);

      // Store the French report in the database
      await GenerationReport.create({
        groupId: group.id,
        groupCode: group.code_group,
        date: new Date(),
        reportText: frenchReport,
        status: result.success ? 'success' : 'failed',
      });

      return {
        groupCode: group.code_group,
        groupId: group.id,
        success: result.success,
        message: result.success ? "Timetable generated successfully" : result.message,
        attemptCount: result.attemptCount,
        validationResult: result.validationResult,
        report: report,
        frenchReport: frenchReport,
        deactivatedModules: result.deactivatedModules || []
      };
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error(`Error generating timetable for group ${group.code_group}:`, error);
      return {
        groupCode: group.code_group,
        groupId: group.id,
        success: false,
        message: error.message,
        error: error
      };
    }
  }

  /**
   * Generate a single timetable attempt for a group
   * @param {Object} group - The group object
   * @param {Object} options - Generation options
   * @returns {Object} Generated timetable
   */
  async generateSingleTimetable(group, options) {
    // Generate remote timetables
    const remoteTimetables = await generateTimetableRemoteForEveryMerge();

    // Build merged remote timetable for the group
    const mergeResult = await this.buildMergedGroupRemoteTimetable(group.Merges, remoteTimetables);

    if (mergeResult.conflictDetected) {
      // Handle conflicts by retrying remote generation
      throw new Error("Remote timetable conflicts detected - retrying generation");
    }

    // Get presential sessions
    const presentialSessions = await this.getPresentialSessions(group);

    // Create empty timetable structure
    const timetable = this.createEmptyTimetable();

    // Merge with remote sessions
    if (mergeResult.merged) {
      timetable.forEach((dayObj, index) => {
        const dayName = Object.keys(dayObj)[0];
        if (mergeResult.merged[index] && mergeResult.merged[index][dayName]) {
          dayObj[dayName] = mergeResult.merged[index][dayName];
        }
      });
    }

    // Place presential sessions
    for (const moduleSession of presentialSessions) {
      await this.placeSessionWithValidation(timetable, [], moduleSession);
    }

    return timetable;
  }

  /**
   * Get required sessions for a group
   * @param {Object} group - The group object
   * @returns {Array} Array of required sessions
   */
  async getRequiredSessions(group) {
    const groupData = await Group.findOne({
      where: { id: group.id },
      include: [{
        model: GroupModuleFormateur,
        include: [
          { model: Module, as: "module" },
          {
            model: Formateur,
            as: "formateur",
            include: [{ model: Classroom, as: "classroom" }],
          },
        ],
      }],
    });

    return transformGroupwithModules(groupData);
  }

  /**
   * Get presential sessions for a group
   * @param {Object} group - The group object
   * @returns {Array} Array of presential sessions
   */
  async getPresentialSessions(group) {
    return await this.getRequiredSessions(group);
  }

  /**
   * Create empty timetable structure
   * @returns {Array} Empty timetable array
   */
  createEmptyTimetable() {
    return DAYS.map(day => ({ [day]: [] }));
  }

  /**
   * Build merged group remote timetable
   * @param {Array} merges - Array of merges
   * @param {Array} remoteTimetables - Array of remote timetables
   * @returns {Object} Merge result
   */
  async buildMergedGroupRemoteTimetable(merges, remoteTimetables) {
    const mergedTimetable = this.createEmptyTimetable();
    let conflictDetected = false;

    for (const merge of merges) {
      const remoteTimetable = remoteTimetables.find(rt => rt.mergeId === merge.id);

      if (remoteTimetable) {
        // Merge remote sessions into the main timetable
        remoteTimetable.timetable.forEach((dayObj, index) => {
          const dayName = Object.keys(dayObj)[0];
          const daySessions = dayObj[dayName];

          daySessions.forEach(session => {
            mergedTimetable[index][dayName].push(session);
          });
        });
      }
    }

    return {
      merged: mergedTimetable,
      conflictDetected
    };
  }

  /**
   * Place session with validation
   * @param {Array} timetable - The timetable
   * @param {Array} groupsTimetables - Other groups' timetables
   * @param {Object} moduleSession - The session to place
   */
  async placeSessionWithValidation(timetable, groupsTimetables, moduleSession) {
    let attemptCount = 0;
    let placed = false;
    let lastError = null;

    while (!placed && attemptCount < 1000) {
      try {
        const randomDay = getRandomDay();
        const indexDay = DAYS.indexOf(randomDay);
        const dayKey = DAYS[indexDay];

        if (indexDay === -1 || !timetable[indexDay] || !timetable[indexDay][dayKey]) {
          attemptCount++;
          continue;
        }

        const timeShot = indexDay === 5 ? getRandomTimeShotInSamedi() : getRandomTimeShot();
        const timeshotAfterCheck = checkIfTimeshotTakenInDayEdit(timetable[indexDay][dayKey], timeShot);
        const session = {
          ...moduleSession,
          timeShot: timeshotAfterCheck
        };

        const validatedSession = checkIfHaveSessionRemoteInDay(timetable[indexDay][dayKey], session);

        // Check formateur availability and cross-group conflicts
        const timetableFormateur = await FormateurTimetable.findOne({
          where: {
            formateurId: validatedSession.formateurId,
            day: randomDay
          }
        });

        if (!timetableFormateur) {
          lastError = `No formateur timetable found for ${validatedSession.formateurId} on ${randomDay}`;
          attemptCount++;
          continue;
        }

        // FIX 6: Check cross-group FORMATEUR conflict
        const existingSession = await Session.findOne({
          where: {
            formateurId: validatedSession.formateurId,
            day: randomDay,
            timeshot: validatedSession.timeShot
          },
          include: [{
            model: Timetable,
            where: { status: 'active' }
          }]
        });

        if (existingSession) {
          lastError = `Cross-group conflict: formateur ${validatedSession.formateurId} already scheduled on ${randomDay} ${validatedSession.timeShot}`;
          attemptCount++;
          continue;
        }

        // FIX 6: Check cross-group CLASSROOM conflict — a room cannot be used by two groups
        // at the same time. Previously this check was missing entirely.
        if (validatedSession.classroomId) {
          const classroomConflict = await Session.findOne({
            where: {
              classroomId: validatedSession.classroomId,
              day: randomDay,
              timeshot: validatedSession.timeShot
            },
            include: [{
              model: Timetable,
              where: { status: 'active' }
            }]
          });
          if (classroomConflict) {
            lastError = `Cross-group conflict: classroom ${validatedSession.classroomId} already booked on ${randomDay} ${validatedSession.timeShot}`;
            attemptCount++;
            continue;
          }
        }

        const [availStart, availEnd] = timetableFormateur.timeshot.split('-').map(t => t.trim());
        const [sessionStart, sessionEnd] = validatedSession.timeShot.split('-').map(t => t.trim());

        const toMinutes = (t) => {
          const [h, m] = t.split(':');
          return h * 60 + Number(m);
        };

        const sessionStartMin = toMinutes(sessionStart);
        const sessionEndMin = toMinutes(sessionEnd);
        const availStartMin = toMinutes(availStart);
        const availEndMin = toMinutes(availEnd);

        const isAvailable = sessionStartMin >= availStartMin && sessionEndMin <= availEndMin;

        if (!isAvailable) {
          lastError = `Formateur ${validatedSession.formateurId} not available on ${randomDay} ${validatedSession.timeShot} (available: ${timetableFormateur.timeshot})`;
          attemptCount++;
          continue;
        }

        if (
          isAvailable &&
          canAddSessionToDay(timetable, indexDay, moduleSession) &&
          checkIfSessionWithFormateurTakenByGroup(groupsTimetables, session, randomDay) &&
          (indexDay !== 5 || canAddSessionToDaySamedi(timetable, indexDay, validatedSession)) &&
          canAddSessionWithGapRule(timetable[indexDay][dayKey], validatedSession)
        ) {
          // Handle 5-hour sessions (two consecutive slots)
          if (moduleSession.nbr_hours_presential_in_week === 5) {
            const nextTime = getNextTimeShot(timeShot);
            if (nextTime == null) {
              lastError = `No consecutive slot available for 5-hour session on ${randomDay}`;
              attemptCount++;
              continue;
            }

            const [sessionNextStart, sessionNextEnd] = nextTime.split('-').map(t => t.trim());
            const sessionNextStartMin = toMinutes(sessionNextStart);
            const sessionNextEndMin = toMinutes(sessionNextEnd);
            const isAvailableNextSession = sessionNextStartMin >= availStartMin && sessionNextEndMin <= availEndMin;

            if (isTimeshotTaken(timetable[indexDay][dayKey], nextTime) || !isAvailableNextSession) {
              lastError = `Second slot ${nextTime} not available for 5-hour session on ${randomDay}`;
              attemptCount++;
              continue;
            }

            const sessionTwo = {
              ...moduleSession,
              timeShot: checkIfTimeshotTakenInDayEdit(timetable[indexDay][dayKey], nextTime),
            };

            const validatedSessionTwo = checkIfHaveSessionRemoteInDay(timetable[indexDay][dayKey], sessionTwo);

            if (checkIfSessionWithFormateurTakenByGroup(groupsTimetables, validatedSessionTwo, randomDay) &&
              canAddSessionWithGapRule(timetable[indexDay][dayKey], validatedSessionTwo)) {
              this.pushSessionToDay(timetable[indexDay][dayKey], validatedSessionTwo);
            } else {
              lastError = `Second 5-hour session slot failed validation on ${randomDay}`;
              attemptCount++;
              continue;
            }
          }

          this.pushSessionToDay(timetable[indexDay][dayKey], validatedSession);
          placed = true;
        } else {
          lastError = `Session validation failed on ${randomDay} ${validatedSession.timeShot}`;
          attemptCount++;
        }
      } catch (error) {
        lastError = `Error in attempt ${attemptCount}: ${error.message}`;
        attemptCount++;
      }
    }

    if (!placed && lastError) {
      console.warn(`Failed to place session ${moduleSession.module_label} after ${attemptCount} attempts. Last error: ${lastError}`);
    }

    return placed;
  }

  /**
   * Push session to day
   * @param {Array} daySessions - Day sessions array
   * @param {Object} session - Session to add
   */
  pushSessionToDay(daySessions, session) {
    // FIX 7: Do NOT call checkIfTimeshotTakenInDayEdit here.
    // The session's timeShot was already fully validated before this method is called.
    // Silently mutating it here would place the session in an unvalidated slot,
    // potentially bypassing formateur availability and gap-rule checks.
    daySessions.push(session);
  }

  /**
   * Store timetable to database
   * @param {string} groupCode - Group code
   * @param {Array} timetableData - Timetable data
   * @param {string} valide_a_partir_de - Valid from date
   */
  async storeTimetableToDB(groupCode, timetableData, valide_a_partir_de) {
    try {
      const group = await Group.findOne({ where: { code_group: groupCode } });
      if (!group) throw new Error(`Group ${groupCode} not found`);

      // Update status of all existing timetables for this group to archived
      const timetablesGroup = await Timetable.findAll({ where: { groupId: group.id } });
      if (timetablesGroup.length > 0) {
        await Timetable.update({ status: 'archived' }, {
          where: { groupId: group.id },
        });
      }

      // Create new timetable
      const timetable = await Timetable.create({
        groupId: group.id,
        valid_form: valide_a_partir_de,
        status: 'active'
      });

      let nbr_hours_in_week = 0;

      // Store sessions
      for (const dayObj of timetableData) {
        const dayName = Object.keys(dayObj)[0];
        const sessions = dayObj[dayName];

        for (const session of sessions) {
          // FIX 8: DB-level duplicate guard checks BOTH formateur AND classroom conflicts.
          // Previously only formateurId was checked, allowing classroom double-bookings
          // to be silently persisted to the database.
          const [existingFormateur, existingClassroom] = await Promise.all([
            Session.findOne({
              where: {
                formateurId: session.formateurId,
                day: dayName,
                timeshot: session.timeShot
              },
              include: [{ model: Timetable, where: { status: 'active' } }]
            }),
            session.classroomId
              ? Session.findOne({
                where: {
                  classroomId: session.classroomId,
                  day: dayName,
                  timeshot: session.timeShot
                },
                include: [{ model: Timetable, where: { status: 'active' } }]
              })
              : Promise.resolve(null)
          ]);

          if (existingFormateur) {
            console.error(`🚫 DB CONFLICT PREVENTED: Formateur ${session.formateurId} already active on ${dayName} ${session.timeShot} — ${session.module_label || 'unknown'} skipped.`);
            continue;
          }
          if (existingClassroom) {
            console.error(`🚫 DB CONFLICT PREVENTED: Classroom ${session.classroomId} already booked on ${dayName} ${session.timeShot} — ${session.module_label || 'unknown'} skipped.`);
            continue;
          }

          try {
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
            nbr_hours_in_week += 2.5;
          } catch (error) {
            console.warn(`Failed to create session for ${session.module_label} on ${dayName}:`, error.message);
          }
        }
      }

      // Update total hours
      await Timetable.update({ nbr_hours_in_week: nbr_hours_in_week }, {
        where: {
          groupId: group.id,
          status: 'active'
        },
      });

      if (process.env.NODE_ENV !== 'production') console.log(`Timetable stored for group ${groupCode}`);

    } catch (err) {
      if (process.env.NODE_ENV !== 'production') console.error(`Error saving timetable:`, err);
      throw err;
    }
  }

  /**
   * Generate timetable by progressively deactivating modules with most duration
   * @param {Object} group - The group object
   * @param {Array} requiredSessions - Required sessions
   * @param {string} valide_a_partir_de - Valid from date
   * @param {Object} options - Generation options
   * @returns {Object} Generation result
   */
  async generateWithModuleDeactivation(group, requiredSessions, valide_a_partir_de, options) {
    if (process.env.NODE_ENV !== 'production') console.log(`\n�� Starting module deactivation strategy for group: ${group.code_group}`);

    // Get all modules for this group with their details
    const groupModules = await this.getGroupModulesWithDetails(group.id);

    // Sort modules by duration (highest first) and filter out finished modules
    const sortableModules = groupModules
      .filter(module => !module.validate_efm) // Skip finished modules
      .sort((a, b) => b.nbr_hours_presential_in_week - a.nbr_hours_presential_in_week);

    if (process.env.NODE_ENV !== 'production') {
      console.log(`📋 Found ${sortableModules.length} non-finished modules to potentially deactivate`);
      sortableModules.forEach(module => {
        console.log(`   - ${module.module_label}: ${module.nbr_hours_presential_in_week} hours`);
      });
    }

    // Try deactivating modules one by one, starting with the highest duration
    for (let i = 0; i < sortableModules.length; i++) {
      const moduleToDeactivate = sortableModules[i];
      if (process.env.NODE_ENV !== 'production') console.log(`\n🔄 Attempt ${i + 1}: Deactivating module "${moduleToDeactivate.module_label}" (${moduleToDeactivate.nbr_hours_presential_in_week} hours)`);

      // Create a copy of required sessions without this module
      const filteredSessions = requiredSessions.filter(session =>
        session.moduleId !== moduleToDeactivate.moduleId
      );

      if (process.env.NODE_ENV !== 'production') console.log(`   📊 Sessions before: ${requiredSessions.length}, after: ${filteredSessions.length}`);

      if (filteredSessions.length === 0) {
        if (process.env.NODE_ENV !== 'production') console.log(`   ⚠️  No sessions left after deactivation, skipping this module`);
        continue;
      }

      // Try to generate timetable with reduced sessions
      try {
        const result = await this.retryService.generateWithRetry(
          (group, options) => this.generateSingleTimetable(group, options),
          group,
          filteredSessions,
          { ...options, maxAttempts: 100 } // Reduced attempts for deactivation attempts
        );

        if (result.success) {
          if (process.env.NODE_ENV !== 'production') console.log(`✅ Success! Generated valid timetable after deactivating "${moduleToDeactivate.module_label}"`);

          // Update the module status in database to deactivated
          await this.deactivateModule(group.id, moduleToDeactivate.moduleId);

          return {
            ...result,
            deactivatedModules: [{
              moduleId: moduleToDeactivate.moduleId,
              moduleLabel: moduleToDeactivate.module_label,
              hours: moduleToDeactivate.nbr_hours_presential_in_week,
              reason: "Deactivated due to scheduling constraints"
            }]
          };
        } else {
          if (process.env.NODE_ENV !== 'production') console.log(`   ❌ Still failed after deactivating "${moduleToDeactivate.module_label}"`);
        }
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') console.log(`   ❌ Error during deactivation attempt: ${error.message}`);
      }
    }

    // If we get here, even deactivating all modules didn't work
    if (process.env.NODE_ENV !== 'production') console.log(`❌ Failed to generate timetable even after deactivating all non-finished modules`);
    throw new Error(`Could not generate valid timetable for group ${group.code_group} even with module deactivation strategy`);
  }

  /**
   * Get group modules with detailed information
   * @param {number} groupId - Group ID
   * @returns {Array} Array of modules with details
   */
  async getGroupModulesWithDetails(groupId) {
    const groupModules = await GroupModuleFormateur.findAll({
      where: { groupId, is_started: true },
      include: [
        { model: Module, as: 'module' },
        { model: Formateur, as: 'formateur' }
      ]
    });

    return groupModules.map(gm => ({
      moduleId: gm.moduleId,
      module_label: gm.module.label,
      nbr_hours_presential_in_week: gm.nbr_hours_presential_in_week,
      validate_efm: gm.validate_efm,
      mhp_realise: gm.mhp_realise,
      mhsyn_realise: gm.mhsyn_realise
    }));
  }

  /**
   * Deactivate a module for a group
   * @param {number} groupId - Group ID
   * @param {number} moduleId - Module ID
   */
  async deactivateModule(groupId, moduleId) {
    try {
      await GroupModuleFormateur.update(
        { is_started: false },
        { where: { groupId, moduleId } }
      );
      if (process.env.NODE_ENV !== 'production') console.log(`   ✅ Module ${moduleId} deactivated for group ${groupId}`);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error(`   ❌ Error deactivating module: ${error.message}`);
    }
  }

  /**
   * Calculate final statistics
   * @param {Object} results - Results object
   */
  calculateFinalStats(results) {
    this.generationStats.totalAttempts = results.groups.reduce((total, group) => {
      return total + (group.attemptCount || 0);
    }, 0);

    this.generationStats.averageAttempts = this.generationStats.totalGroups > 0 ?
      (this.generationStats.totalAttempts / this.generationStats.totalGroups).toFixed(2) : 0;

    results.stats = this.generationStats;
  }

  /**
   * Generate comprehensive generation report
   * @param {Object} results - Generation results
   * @returns {string} Detailed report
   */
  generateComprehensiveReport(results) {
    let report = `\nEnhanced Timetable Generation Report\n`;
    report += `==========================================\n\n`;

    report += `Overall Status: ${results.success ? 'SUCCESS' : 'FAILED'}\n`;
    report += `Valid From: ${results.validFrom || 'N/A'}\n\n`;

    report += `Generation Statistics:\n`;
    report += `  - Total Groups: ${this.generationStats.totalGroups}\n`;
    report += `  - Successful: ${this.generationStats.successfulGroups}\n`;
    report += `  - Failed: ${this.generationStats.failedGroups}\n`;
    report += `  - Success Rate: ${this.generationStats.totalGroups > 0 ?
      ((this.generationStats.successfulGroups / this.generationStats.totalGroups) * 100).toFixed(1) : 0}%\n`;
    report += `  - Total Attempts: ${this.generationStats.totalAttempts}\n`;
    report += `  - Average Attempts: ${this.generationStats.averageAttempts}\n\n`;

    if (results.errors.length > 0) {
      report += `Errors (${results.errors.length}):\n`;
      results.errors.forEach(error => {
        report += `  - ${error}\n`;
      });
      report += `\n`;
    }

    report += `Group Results:\n`;
    results.groups.forEach(group => {
      const status = group.success ? 'SUCCESS' : 'FAILED';
      report += `  ${status} ${group.groupCode}: ${group.message}\n`;
      if (group.attemptCount) {
        report += `    Attempts: ${group.attemptCount}\n`;
      }
      // Add deactivated modules information
      if (group.deactivatedModules && group.deactivatedModules.length > 0) {
        report += `    Deactivated Modules:\n`;
        group.deactivatedModules.forEach(module => {
          report += `      - ${module.moduleLabel}: ${module.hours} hours (${module.reason})\n`;
        });
      }
      // Add remote session assignment summary if available
      if (group.remoteAssignments && group.remoteAssignments.length > 0) {
        report += `    Remote Sessions Assigned:\n`;
        group.remoteAssignments.forEach(session => {
          report += `      - Day: ${session.day}, Slot: ${session.slot}, Module: ${session.module_label || session.moduleId}, Formateur: ${session.formateur || session.formateurId}\n`;
        });
      }
      if (group.unassignedRemoteSessions && group.unassignedRemoteSessions.length > 0) {
        report += `    Remote Sessions NOT Assigned (conflict/gap):\n`;
        group.unassignedRemoteSessions.forEach(session => {
          report += `      - Module: ${session.module_label || session.moduleId}, Formateur: ${session.formateur || session.formateurId}\n`;
        });
      }
    });

    return report;
  }

  /**
   * Best-practice: Generate timetable for a group using robust conflict-aware assignment and backtracking
   * @param {Object} group - The group object
   * @param {Array} allGroupsTimetables - Array of all groups' timetables (for global conflict check)
   * @returns {Object} Result with timetable or error
   */
  async generateGroupTimetableBestPractice(group, allGroupsTimetables) {
    // Prepare sessions: get all required sessions for this group
    const requiredSessions = await this.getRequiredSessions(group);
    if (!requiredSessions || requiredSessions.length === 0) {
      return { success: false, message: 'No sessions to schedule for this group', timetable: [] };
    }
    // Call the best-practice generator
    const { timetable, unscheduledModules } = await generateTimetableBestPractice(requiredSessions, allGroupsTimetables);
    if (timetable) {
      return { success: true, timetable, unscheduledModules };
    } else {
      return { success: false, message: 'Could not generate a valid timetable for this group', timetable: [], unscheduledModules };
    }
  }

  /**
   * Best-practice: Generate timetables for all groups using robust conflict-aware assignment and backtracking
   * @returns {Array} Array of results for each group
   */
  async generateAllTimetablesBestPractice() {
    // Get all groups
    const groups = await Group.findAll();
    const allGroupsTimetables = [];
    const results = [];
    for (const group of groups) {
      // Generate timetable for this group
      const result = await this.generateGroupTimetableBestPractice(group, allGroupsTimetables);
      results.push({ groupCode: group.code_group, ...result });
      // If successful, add to allGroupsTimetables for future conflict checking
      if (result.success) {
        allGroupsTimetables.push(result.timetable);
      }
    }
    return results;
  }
}

/**
 * Génère un rapport lisible en français pour l'utilisateur final
 * @param {string} groupCode - Le code du groupe
 * @param {Array} unscheduledModules - [{ moduleLabel, reason }]
 * @returns {string} Rapport en français
 */
function generateFrenchReport(groupCode, unscheduledModules) {
  let report = '';
  if (!unscheduledModules || unscheduledModules.length === 0) {
    report = `Succès : Tous les modules sont planifiés pour le groupe ${groupCode}.`;
  } else {
    report = `Certains modules n'ont pas pu être planifiés pour le groupe ${groupCode} :\n`;
    for (const unscheduled of unscheduledModules) {
      report += `- Module '${unscheduled.moduleLabel}' non planifié car ${unscheduled.reason}.\n`;
    }
  }
  // Remove emojis from the report
  return report.replace(/[\u{1F600}-\u{1F6FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}]/gu, '');
}

/**
 * Génère un rapport global lisible en français pour l'administrateur
 * @param {Array} groupResults - [{ groupCode, unscheduledModules }]
 * @returns {string} Rapport global en français
 */
function generateGlobalFrenchAdminReport(groupResults) {
  let report = '';
  for (const result of groupResults) {
    report += generateFrenchReport(result.groupCode, result.unscheduledModules) + '\n';
  }
  // Remove emojis from the global report
  return report.replace(/[\u{1F600}-\u{1F6FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}]/gu, '');
}

/**
 * Best-practice: Place session with robust conflict-aware assignment and backtracking
 * @param {Array} timetable - The timetable for the current group
 * @param {Array} allGroupsTimetables - Array of all groups' timetables (for global conflict check)
 * @param {Object} moduleSession - The session to place
 * @param {Object} formateurSchedules - Map of formateurId -> { day: { timeslot: session } }
 * @returns {boolean} true if placed, false if not
 */
async function placeSessionBestPractice(timetable, allGroupsTimetables, moduleSession, formateurSchedules) {
  const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  const TIME_SHOTS = ["08:30-11:00", "11:00-13:30", "13:30-16:00", "16:00-18:30"];
  for (const day of DAYS) {
    for (const slot of TIME_SHOTS) {
      // Check if slot is free in this group's timetable
      const dayObj = timetable.find(obj => Object.keys(obj)[0] === day);
      if (!dayObj) continue;
      const sessions = dayObj[day];
      if (sessions.some(s => s.timeshot === slot)) continue;
      // Check if formateur is free in this slot across all groups
      let conflict = false;
      for (const groupTimetable of allGroupsTimetables) {
        const groupDayObj = groupTimetable.find(obj => Object.keys(obj)[0] === day);
        if (!groupDayObj) continue;
        const groupSessions = groupDayObj[day];
        if (groupSessions.some(s => s.timeshot === slot && s.formateurId === moduleSession.formateurId)) {
          conflict = true;
          break;
        }
      }
      // Also check local formateurSchedules
      if (
        formateurSchedules[moduleSession.formateurId] &&
        formateurSchedules[moduleSession.formateurId][day] &&
        formateurSchedules[moduleSession.formateurId][day][slot]
      ) {
        conflict = true;
      }
      if (conflict) continue;
      // Assign session
      sessions.push({ ...moduleSession, timeshot: slot, day });
      if (!formateurSchedules[moduleSession.formateurId]) formateurSchedules[moduleSession.formateurId] = {};
      if (!formateurSchedules[moduleSession.formateurId][day]) formateurSchedules[moduleSession.formateurId][day] = {};
      formateurSchedules[moduleSession.formateurId][day][slot] = { ...moduleSession, timeshot: slot, day };
      return true;
    }
  }
  // If not placed, return false to trigger backtracking or deactivation
  return false;
}

/**
 * Best-practice: Generate timetable for a group using robust conflict-aware assignment and backtracking
 * @param {Array} sessions - Array of sessions to schedule
 * @param {Array} allGroupsTimetables - Array of all groups' timetables (for global conflict check)
 * @returns {Array} The generated timetable, or null if not possible
 */
async function generateTimetableBestPractice(sessions, allGroupsTimetables) {
  const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  const TIME_SHOTS = ["08:30-11:00", "11:00-13:30", "13:30-16:00", "16:00-18:30"];
  // Initialize empty timetable structure
  const timetable = DAYS.map(day => ({ [day]: [] }));
  const formateurSchedules = {};
  const unscheduledModules = [];

  // Helper for deep copy
  function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // Recursive backtracking function
  async function backtrack(index) {
    if (index === sessions.length) return true; // All sessions placed
    const session = sessions[index];
    let placed = false;
    // Try all possible slots for this session
    for (const day of DAYS) {
      for (const slot of TIME_SHOTS) {
        // Check if slot is free in this group's timetable
        const dayObj = timetable.find(obj => Object.keys(obj)[0] === day);
        if (!dayObj) continue;
        const sessionsArr = dayObj[day];
        if (sessionsArr.some(s => s.timeshot === slot)) continue;
        // Check if formateur is free in this slot across all groups
        let conflict = false;
        for (const groupTimetable of allGroupsTimetables) {
          const groupDayObj = groupTimetable.find(obj => Object.keys(obj)[0] === day);
          if (!groupDayObj) continue;
          const groupSessions = groupDayObj[day];
          if (groupSessions.some(s => s.timeshot === slot && s.formateurId === session.formateurId)) {
            conflict = true;
            break;
          }
        }
        // Also check local formateurSchedules
        if (
          formateurSchedules[session.formateurId] &&
          formateurSchedules[session.formateurId][day] &&
          formateurSchedules[session.formateurId][day][slot]
        ) {
          conflict = true;
        }
        if (conflict) continue;
        // Assign session
        sessionsArr.push({ ...session, timeshot: slot, day });
        if (!formateurSchedules[session.formateurId]) formateurSchedules[session.formateurId] = {};
        if (!formateurSchedules[session.formateurId][day]) formateurSchedules[session.formateurId][day] = {};
        formateurSchedules[session.formateurId][day][slot] = { ...session, timeshot: slot, day };
        // Recurse
        if (await backtrack(index + 1)) return true;
        // Backtrack: remove session
        sessionsArr.pop();
        delete formateurSchedules[session.formateurId][day][slot];
      }
    }
    // If not placed, record as unscheduled and continue
    unscheduledModules.push({
      moduleLabel: session.label || session.moduleLabel || session.module || '',
      reason: "le formateur est déjà occupé à ce créneau horaire"
    });
    return await backtrack(index + 1);
  }

  await backtrack(0);
  return { timetable, unscheduledModules };
}

module.exports = EnhancedTimetableGenerator;
module.exports.generateFrenchReport = generateFrenchReport;
module.exports.generateGlobalFrenchAdminReport = generateGlobalFrenchAdminReport; 