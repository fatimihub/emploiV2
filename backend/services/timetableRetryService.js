const TimetableValidator = require('./timetableValidator.js');
const { transformGroupwithModules } = require("../helpers/transformers/groupWithSessionPresential.js");
const { getValidTimeShotsForFormateurDay } = require('../controllers/GA/constraints.js');
const { GroupModuleFormateur } = require('../models');

/**
 * Timetable Retry Service
 * 
 * This service handles timetable generation with automatic retry logic:
 * 1. Generates timetable
 * 2. Validates the generated timetable
 * 3. Retries if validation fails
 * 4. Stops after maximum attempts or when valid timetable is found
 */

class TimetableRetryService {
  
  constructor(maxAttempts = 50) {
    this.maxAttempts = maxAttempts;
    this.attemptCount = 0;
    this.validationHistory = [];
  }

  /**
   * Generate timetable with retry logic
   * @param {Function} generateFunction - The timetable generation function
   * @param {Object} group - The group object
   * @param {Array} requiredSessions - Array of required sessions
   * @param {Object} options - Additional options
   * @returns {Object} Generation result with validation details
   */
  async generateWithRetry(generateFunction, group, requiredSessions, options = {}) {
    // Use maxAttempts from options or fall back to constructor default
    // For deterministic logic, we do not use attempts or retries

    // === FAST PRE-CHECK FOR AVAILABLE SLOTS ===
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
        throw new Error(`Module ${session.module_label} for group ${group.code_group} cannot be scheduled: only ${availableSessions} slots available, but ${requiredSessionCount} required.`);
      }
    }

    // Deterministic: call the generation function once
    try {
        const timetable = await this.generateTimetable(generateFunction, group, options);
        const validationResult = await TimetableValidator.validateTimetable(timetable, group, requiredSessions);
        if (validationResult.isValid) {
          return {
            success: true,
            timetable,
            validationResult,
          attemptCount: 1,
          validationHistory: [{ attempt: 1, isValid: true, errors: [], warnings: [], details: validationResult.details }]
          };
        } else {
            return {
              success: false,
              timetable,
              validationResult,
          attemptCount: 1,
          validationHistory: [{ attempt: 1, isValid: false, errors: validationResult.errors, warnings: validationResult.warnings, details: validationResult.details }],
          message: `Module(s) could not be scheduled deterministically: ${validationResult.errors.join('; ')}`
        };
        }
    } catch (error) {
      throw new Error(`Deterministic scheduling failed: ${error.message}`);
    }
  }

  /**
   * Generate a single timetable attempt
   * @param {Function} generateFunction - The generation function
   * @param {Object} group - The group object
   * @param {Object} options - Generation options
   * @returns {Object} Generated timetable
   */
  async generateTimetable(generateFunction, group, options) {
    // This is a placeholder - the actual generation logic will be passed in
    // The generateFunction should handle the actual timetable generation
    return await generateFunction(group, options);
  }

  /**
   * Analyze validation history to provide insights
   * @returns {Object} Analysis of validation attempts
   */
  analyzeValidationHistory() {
    if (this.validationHistory.length === 0) {
      return { message: "No validation history available" };
    }

    const totalAttempts = this.validationHistory.length;
    const successfulAttempts = this.validationHistory.filter(v => v.isValid).length;
    const failedAttempts = totalAttempts - successfulAttempts;

    // Find most common errors
    const errorCounts = {};
    this.validationHistory.forEach(validation => {
      validation.errors.forEach(error => {
        errorCounts[error] = (errorCounts[error] || 0) + 1;
      });
    });

    const commonErrors = Object.entries(errorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([error, count]) => ({ error, count }));

    // Find best attempt (least errors)
    const bestAttempt = this.validationHistory.reduce((best, current) => {
      if (current.isValid) return current;
      if (!best.isValid) return current;
      return current.errors.length < best.errors.length ? current : best;
    });

    return {
      totalAttempts,
      successfulAttempts,
      failedAttempts,
      successRate: (successfulAttempts / totalAttempts) * 100,
      commonErrors,
      bestAttempt: {
        attempt: bestAttempt.attempt,
        errors: bestAttempt.errors.length,
        isValid: bestAttempt.isValid
      }
    };
  }

  /**
   * Get suggestions for improving generation success
   * @param {Object} validationResult - The validation result
   * @returns {Array} Array of suggestions
   */
  getImprovementSuggestions(validationResult) {
    const suggestions = [];

    if (validationResult.details.missingSessions.length > 0) {
      suggestions.push({
        type: 'missing_sessions',
        priority: 'high',
        message: 'Some sessions could not be scheduled. Consider:',
        actions: [
          'Check formateur availability for missing sessions',
          'Verify room availability',
          'Review time slot constraints',
          'Consider reducing session hours if possible'
        ]
      });
    }

    if (validationResult.details.conflicts.length > 0) {
      suggestions.push({
        type: 'conflicts',
        priority: 'high',
        message: 'Scheduling conflicts detected. Consider:',
        actions: [
          'Review formateur schedules for overlaps',
          'Check room assignments',
          'Verify time slot availability',
          'Consider alternative time slots'
        ]
      });
    }

    if (validationResult.details.gapRuleViolations.length > 0) {
      suggestions.push({
        type: 'gap_rules',
        priority: 'medium',
        message: 'Gap rule violations found. Consider:',
        actions: [
          'Review remote/presential session placement',
          'Ensure 2.5-hour gaps between different session types',
          'Consider rescheduling conflicting sessions'
        ]
      });
    }

    if (validationResult.details.hourViolations && validationResult.details.hourViolations.length > 0) {
      suggestions.push({
        type: 'hour_limits',
        priority: 'medium',
        message: 'Weekly hour limits exceeded. Consider:',
        actions: [
          'Review formateur workload distribution',
          'Consider reducing hours for some modules',
          'Check for alternative formateurs',
          'Verify hour calculations'
        ]
      });
    }

    return suggestions;
  }

  /**
   * Generate a comprehensive report
   * @param {Object} result - The generation result
   * @returns {string} Detailed report
   */
  generateReport(result) {
    let report = `\n📊 Timetable Generation Report\n`;
    report += `Group: ${result.validationResult.groupCode}\n`;
    report += `Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}\n`;
    // Deterministic: no attempts, so just show 1 or N/A
    report += `Deterministic Scheduling: Yes\n\n`;

    if (result.success) {
      report += `🎉 Valid timetable generated successfully!\n`;
      report += `📈 Statistics:\n`;
      report += `  - Total sessions: ${result.validationResult.details.totalScheduledSessions || 0}\n`;
      report += `  - Required sessions: ${result.validationResult.details.totalRequiredSessions || 0}\n`;
      const conflicts = (result.validationResult.details.conflicts || []);
      report += `  - Conflicts: ${conflicts.length}\n`;
      const gapRuleViolations = (result.validationResult.details.gapRuleViolations || []);
      report += `  - Gap violations: ${gapRuleViolations.length}\n\n`;
    } else {
      report += `⚠️  Failed to generate valid timetable\n`;
      report += `📋 Issues found:\n`;
      (result.validationResult.errors || []).forEach(error => {
        report += `  - ${error}\n`;
      });
      report += `\n`;
    }

    // Add analysis (skip attempt stats, just show errors)
    const analysis = this.analyzeValidationHistory() || { successRate: undefined, commonErrors: [] };
    report += `📈 Analysis:\n`;
    report += `  - Success rate: ${analysis.successRate !== undefined ? analysis.successRate + '%' : 'N/A'}\n`;
    report += `  - Common errors: ${(analysis.commonErrors || []).length}\n\n`;

    // Add suggestions
    const suggestions = this.getImprovementSuggestions(result.validationResult) || [];
    if (suggestions.length > 0) {
      report += `💡 Improvement Suggestions:\n`;
      suggestions.forEach(suggestion => {
        report += `  ${suggestion.priority === 'high' ? '🔴' : '🟡'} ${suggestion.message}\n`;
        (suggestion.actions || []).forEach(action => {
          report += `    • ${action}\n`;
        });
        report += `\n`;
      });
    }

    return report;
  }

  /**
   * Generate a French, non-technical, admin-friendly report
   * @param {Object} result - The generation result
   * @returns {string} French report
   */
  generateFrenchAdminReport(result) {
    let rapport = `\n📝 Rapport de génération d'emploi du temps\n`;
    rapport += `Groupe : ${result.validationResult.groupCode}\n`;
    if (result.success) {
      rapport += `✅ L'emploi du temps a été généré avec succès.\n`;
      rapport += `Nombre total de séances planifiées : ${result.validationResult.details.totalScheduledSessions || 0}.\n`;
      rapport += `Nombre de séances requises : ${result.validationResult.details.totalRequiredSessions || 0}.\n`;
      const conflicts = (result.validationResult.details.conflicts || []);
      if (conflicts.length === 0) {
        rapport += `Aucun conflit détecté.\n`;
      } else {
        rapport += `Conflits détectés :\n`;
        conflicts.forEach((conf, idx) => {
          rapport += `  ${idx + 1}. ${conf}\n`;
        });
      }
      const gapRuleViolations = (result.validationResult.details.gapRuleViolations || []);
      if (gapRuleViolations.length > 0) {
        rapport += `Attention : Certaines règles d'espacement n'ont pas été respectées.\n`;
      }
    } else {
      rapport += `❌ L'emploi du temps n'a pas pu être généré.\n`;
      rapport += `Raisons :\n`;
      (result.validationResult.errors || []).forEach((error, idx) => {
        rapport += `  ${idx + 1}. ${error}\n`;
      });
      if (result.validationResult.details && result.validationResult.details.missingSessions && (result.validationResult.details.missingSessions || []).length > 0) {
        rapport += `Séances non planifiées :\n`;
        (result.validationResult.details.missingSessions || []).forEach((sess, idx) => {
          rapport += `  ${idx + 1}. Module : ${sess.module_label}, Formateur : ${sess.formateur}, Jour : ${sess.day}, Créneau : ${sess.timeShot}\n`;
        });
      }
    }
    // Add remote session assignment summary if available
    if (result.remoteAssignments && result.remoteAssignments.length > 0) {
      rapport += `\nSéances à distance attribuées :\n`;
      result.remoteAssignments.forEach((session, idx) => {
        rapport += `  ${idx + 1}. Jour : ${session.day}, Créneau : ${session.slot}, Module : ${session.module_label || session.moduleId}, Formateur : ${session.formateur || session.formateurId}\n`;
      });
    }
    if (result.unassignedRemoteSessions && result.unassignedRemoteSessions.length > 0) {
      rapport += `\nSéances à distance NON attribuées (conflit ou règle d'espacement) :\n`;
      result.unassignedRemoteSessions.forEach((session, idx) => {
        rapport += `  ${idx + 1}. Module : ${session.module_label || session.moduleId}, Formateur : ${session.formateur || session.formateurId}\n`;
      });
    }
    rapport += `\nPour toute question, veuillez contacter l'administrateur du système.\n`;
    return rapport;
  }

  /**
   * Utility function to add delay
   * @param {number} ms - Milliseconds to delay
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Reset the service state
   */
  reset() {
    this.attemptCount = 0;
    this.validationHistory = [];
  }
}

module.exports = TimetableRetryService; 