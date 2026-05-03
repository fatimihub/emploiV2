const {
  canAddSessionWithGapRule,
  hasSufficientGap
} = require('./constraints.js');

/**
 * Validates a complete timetable for 2.5-hour gap rule compliance
 * @param {Object} timetable - The timetable to validate
 * @returns {Object} - Validation result with violations and suggestions
 */
const validateTimetableGapRule = (timetable) => {
  const violations = [];
  const suggestions = [];
  
  // Process each day
  timetable.forEach((dayObj, dayIndex) => {
    const dayName = Object.keys(dayObj)[0];
    const daySessions = dayObj[dayName];
    
    // Check each session against all other sessions in the same day
    for (let i = 0; i < daySessions.length; i++) {
      for (let j = i + 1; j < daySessions.length; j++) {
        const session1 = daySessions[i];
        const session2 = daySessions[j];
        
        // Only check if one is remote and the other is presential
        if (session1.type !== session2.type) {
          const hasGap = hasSufficientGap(session1.timeshot || session1.timeShot, session2.timeshot || session2.timeShot);
          
          if (!hasGap) {
            violations.push({
              day: dayName,
              session1: {
                module: session1.module || session1.label,
                timeShot: session1.timeShot,
                type: session1.type,
                formateur: session1.formateur
              },
              session2: {
                module: session2.module || session2.label,
                timeShot: session2.timeShot,
                type: session2.type,
                formateur: session2.formateur
              },
              gap: calculateGap(session1.timeShot, session2.timeShot)
            });
            
            // Generate suggestion
            suggestions.push({
              day: dayName,
              problem: `Gap violation between ${session1.module || session1.label} and ${session2.module || session2.label}`,
              suggestion: `Move one session to ensure at least 2.5 hours gap`
            });
          }
        }
      }
    }
  });
  
  return {
    isValid: violations.length === 0,
    violations,
    suggestions,
    summary: {
      totalViolations: violations.length,
      daysWithViolations: [...new Set(violations.map(v => v.day))].length
    }
  };
};

/**
 * Calculate the gap between two time slots in hours
 * @param {string} slot1 - First time slot
 * @param {string} slot2 - Second time slot
 * @returns {number} - Gap in hours
 */
const calculateGap = (slot1, slot2) => {
  const timeSlotDefinitions = {
    "08:30-11:00": { start: 8 * 60 + 30, end: 11 * 60 },
    "11:00-13:30": { start: 11 * 60, end: 13 * 60 + 30 },
    "13:30-16:00": { start: 13 * 60 + 30, end: 16 * 60 },
    "16:00-18:30": { start: 16 * 60, end: 18 * 60 + 30 }
  };
  
  const def1 = timeSlotDefinitions[slot1];
  const def2 = timeSlotDefinitions[slot2];
  
  if (!def1 || !def2) return 0;
  
  const gapMinutes = Math.abs(def2.start - def1.end);
  return gapMinutes / 60; // Convert to hours
};

/**
 * Generate a detailed report of timetable validation
 * @param {Object} timetable - The timetable to validate
 * @returns {string} - Formatted report
 */
const generateValidationReport = (timetable) => {
  const validation = validateTimetableGapRule(timetable);
  
  let report = 'TIMETABLE VALIDATION REPORT\n';
  report += '='.repeat(50) + '\n\n';
  
  if (validation.isValid) {
    report += 'Timetable is VALID - All 2.5-hour gap rules are satisfied!\n\n';
  } else {
    report += 'Timetable has VIOLATIONS - 2.5-hour gap rules are not satisfied!\n\n';
    
    report += `Summary:\n`;
    report += `   - Total violations: ${validation.summary.totalViolations}\n`;
    report += `   - Days with violations: ${validation.summary.daysWithViolations}\n\n`;
    
    report += 'Violations:\n';
    validation.violations.forEach((violation, index) => {
      report += `   ${index + 1}. ${violation.day}\n`;
      report += `      - ${violation.session1.module} (${violation.session1.type}) at ${violation.session1.timeShot}\n`;
      report += `      - ${violation.session2.module} (${violation.session2.type}) at ${violation.session2.timeShot}\n`;
      report += `      - Gap: ${violation.gap.toFixed(1)} hours (required: 2.5 hours)\n\n`;
    });
    
    if (validation.suggestions.length > 0) {
      report += 'Suggestions:\n';
      validation.suggestions.forEach((suggestion, index) => {
        report += `   ${index + 1}. ${suggestion.day}: ${suggestion.suggestion}\n`;
      });
      report += '\n';
    }
  }
  
  return report;
};

/**
 * Check if a specific day's sessions comply with the gap rule
 * @param {Array} daySessions - Array of sessions for a specific day
 * @returns {Object} - Validation result for the day
 */
const validateDaySessions = (daySessions) => {
  const violations = [];
  
  for (let i = 0; i < daySessions.length; i++) {
    for (let j = i + 1; j < daySessions.length; j++) {
      const session1 = daySessions[i];
      const session2 = daySessions[j];
      
      if (session1.type !== session2.type) {
        const hasGap = hasSufficientGap(session1.timeShot, session2.timeShot);
        
        if (!hasGap) {
          violations.push({
            session1: {
              module: session1.module || session1.label,
              timeShot: session1.timeShot,
              type: session1.type
            },
            session2: {
              module: session2.module || session2.label,
              timeShot: session2.timeShot,
              type: session2.type
            }
          });
        }
      }
    }
  }
  
  return {
    isValid: violations.length === 0,
    violations
  };
};

/**
 * Get statistics about remote vs presential sessions in a timetable
 * @param {Object} timetable - The timetable to analyze
 * @returns {Object} - Statistics
 */
const getTimetableStatistics = (timetable) => {
  let totalSessions = 0;
  let remoteSessions = 0;
  let presentialSessions = 0;
  const dayStats = {};
  
  timetable.forEach((dayObj) => {
    const dayName = Object.keys(dayObj)[0];
    const daySessions = dayObj[dayName];
    
    dayStats[dayName] = {
      total: daySessions.length,
      remote: daySessions.filter(s => s.type === "à distance").length,
      presential: daySessions.filter(s => s.type !== "à distance").length
    };
    
    totalSessions += daySessions.length;
    remoteSessions += dayStats[dayName].remote;
    presentialSessions += dayStats[dayName].presential;
  });
  
  return {
    total: totalSessions,
    remote: remoteSessions,
    presential: presentialSessions,
    byDay: dayStats,
    remotePercentage: totalSessions > 0 ? (remoteSessions / totalSessions * 100).toFixed(1) : 0
  };
};

module.exports = {
  validateTimetableGapRule,
  generateValidationReport,
  validateDaySessions,
  getTimetableStatistics,
  calculateGap,
  checkFormateurConflictsAcrossTimetables
};

/**
 * Checks for formateur conflicts across multiple group timetables.
 * A conflict occurs if the same formateur is scheduled at the same day and time
 * across different groups.
 * @param {Array<Object>} allTimetables - Array of group timetables
 * @returns {Object} - Validation result showing if there are conflicts
 */
function checkFormateurConflictsAcrossTimetables(allTimetables) {
  const formateurSchedule = {};
  const conflicts = [];

  allTimetables.forEach((timetable, groupIndex) => {
    if (!timetable) return;
    timetable.forEach((dayObj) => {
      const dayName = Object.keys(dayObj)[0];
      const daySessions = dayObj[dayName];
      if (!Array.isArray(daySessions)) return;

      daySessions.forEach((session) => {
        if (!session.formateur) return;

        const key = `${session.formateur}-${dayName}-${session.timeShot}`;

        if (formateurSchedule[key]) {
          conflicts.push({
            formateur: session.formateur,
            day: dayName,
            timeShot: session.timeShot,
            group1: formateurSchedule[key].groupIndex,
            group2: groupIndex
          });
        } else {
          formateurSchedule[key] = {
            groupIndex,
            session
          };
        }
      });
    });
  });

  return {
    hasConflicts: conflicts.length > 0,
    conflicts
  };
}