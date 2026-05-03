const { 
  GroupModuleFormateur, 
  FormateurTimetable, 
  Session, 
  Timetable,
  Formateur,
  Setting,
  Group
} = require("../models");

/**
 * Formateur Availability Validator Service
 * 
 * This service validates if a formateur can take the requested number of hours
 * by checking their availability, existing schedule, and potential conflicts.
 */

class FormateurAvailabilityValidator {
  
  /**
   * Main validation function to check if formateur can take requested hours
   * @param {number} formateurId - The formateur ID
   * @param {number} groupId - The group ID
   * @param {number} moduleId - The module ID
   * @param {number} requestedHours - The requested number of hours
   * @param {string} sessionType - 'presential' or 'remote'
   * @param {number} currentHours - Current hours (for updates)
   * @returns {Object} Validation result with details
   */
  static async validateFormateurAvailability(formateurId, groupId, moduleId, requestedHours, sessionType = 'presential', currentHours = 0) {
    try {
      // Step 1: Check if formateur exists and is available
      const formateur = await Formateur.findByPk(formateurId);
      if (!formateur) {
        return {
          isValid: false,
          message: "Formateur not found",
          details: { formateurId }
        };
      }

      if (!formateur.is_available) {
        return {
          isValid: false,
          message: "Formateur is not available",
          details: { formateurId, formateurName: formateur.name }
        };
      }

      // Step 2: Get formateur's availability schedule
      const formateurAvailability = await this.getFormateurAvailability(formateurId);
      
      // Step 3: Calculate available time slots
      const availableSlots = this.calculateAvailableSlots(formateurAvailability);
      
      // Step 4: Check if requested hours can fit in available slots
      const hoursValidation = this.validateHoursFitInSlots(requestedHours, availableSlots, sessionType);
      
      if (!hoursValidation.isValid) {
        return {
          isValid: false,
          message: hoursValidation.message,
          details: {
            requestedHours,
            availableSlots: availableSlots.length,
            totalAvailableHours: availableSlots.length * 2.5,
            formateurId,
            formateurName: formateur.name
          }
        };
      }

      // Step 5: Check for conflicts with existing schedule
      const conflictCheck = await this.checkScheduleConflicts(formateurId, groupId, moduleId, requestedHours, currentHours);
      
      if (!conflictCheck.isValid) {
        return {
          isValid: false,
          message: conflictCheck.message,
          details: {
            ...conflictCheck.details,
            formateurId,
            formateurName: formateur.name
          }
        };
      }

      // Step 6: Check weekly hour limits
      const weeklyLimitCheck = await this.checkWeeklyHourLimits(formateurId, requestedHours, currentHours, sessionType, groupId);
      
      if (!weeklyLimitCheck.isValid) {
        return {
          isValid: false,
          message: weeklyLimitCheck.message,
          details: {
            ...weeklyLimitCheck.details,
            formateurId,
            formateurName: formateur.name
          }
        };
      }

      return {
        isValid: true,
        message: "Formateur can take the requested hours",
        details: {
          formateurId,
          formateurName: formateur.name,
          requestedHours,
          availableSlots: availableSlots.length,
          totalAvailableHours: availableSlots.length * 2.5,
          suggestedSlots: this.suggestOptimalSlots(availableSlots, requestedHours, sessionType)
        }
      };

    } catch (error) {
      console.error("Error validating formateur availability:", error);
      return {
        isValid: false,
        message: "Error validating formateur availability",
        details: { error: error.message }
      };
    }
  }

  /**
   * Get formateur's availability schedule
   * @param {number} formateurId 
   * @returns {Array} Array of availability records
   */
  static async getFormateurAvailability(formateurId) {
    return await FormateurTimetable.findAll({
      where: {
        formateurId,
        year: '2025' // Current year
      },
      order: [['day', 'ASC']]
    });
  }

  /**
   * Calculate available time slots from formateur availability
   * @param {Array} availability 
   * @returns {Array} Array of available time slots
   */
  static calculateAvailableSlots(availability) {
    const availableSlots = [];
    const timeSlots = ["08:30-11:00", "11:00-13:30", "13:30-16:00", "16:00-18:30"];
    const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

    days.forEach(day => {
      const dayAvailability = availability.find(a => a.day === day);
      
      if (dayAvailability) {
        if (day === "Samedi") {
          if (dayAvailability.timeshot === "08:30-11:00" || dayAvailability.timeshot === "11:00-13:30") {
            availableSlots.push({ day, timeSlot: dayAvailability.timeshot });
          }
        } else {
          if (dayAvailability.timeshot === "08:30-13:30") {
            availableSlots.push(
              { day, timeSlot: "08:30-11:00" },
              { day, timeSlot: "11:00-13:30" }
            );
          } else if (dayAvailability.timeshot === "13:30-18:30") {
            availableSlots.push(
              { day, timeSlot: "13:30-16:00" },
              { day, timeSlot: "16:00-18:30" }
            );
          }
        }
      }
    });

    return availableSlots;
  }

  /**
   * Validate if requested hours can fit in available slots
   * @param {number} requestedHours 
   * @param {Array} availableSlots 
   * @param {string} sessionType 
   * @returns {Object} Validation result
   */
  static validateHoursFitInSlots(requestedHours, availableSlots, sessionType) {
    const totalAvailableHours = availableSlots.length * 2.5;
    
    if (requestedHours > totalAvailableHours) {
      return {
        isValid: false,
        message: `Requested ${requestedHours} hours exceed available ${totalAvailableHours} hours`
      };
    }

    // Check if hours can be distributed properly (must be multiples of 2.5)
    if (requestedHours % 2.5 !== 0) {
      return {
        isValid: false,
        message: "Hours must be multiples of 2.5"
      };
    }

    return {
      isValid: true,
      message: "Hours can fit in available slots"
    };
  }

  /**
   * Check for conflicts with existing schedule
   * @param {number} formateurId 
   * @param {number} groupId 
   * @param {number} moduleId 
   * @param {number} requestedHours 
   * @param {number} currentHours 
   * @returns {Object} Conflict check result
   */
  static async checkScheduleConflicts(formateurId, groupId, moduleId, requestedHours, currentHours) {
    try {
      // Get all active timetables for this formateur
      const activeSessions = await Session.findAll({
        include: [
          {
            model: Timetable,
            as: 'timetable',
            where: { status: 'active' },
            include: [{ model: Group, as: 'group' }]
          },
          { model: Formateur, as: 'formateur' }
        ],
        where: {
          formateurId: formateurId
        }
      });

      // Calculate current total hours for this formateur
      const currentTotalHours = activeSessions.length * 2.5;
      
      // Calculate net change in hours
      const netHoursChange = requestedHours - currentHours;
      const newTotalHours = currentTotalHours + netHoursChange;

      // Check if this would exceed reasonable limits
      const maxWeeklyHours = 40; // Maximum hours per week
      if (newTotalHours > maxWeeklyHours) {
        return {
          isValid: false,
          message: `Total weekly hours (${newTotalHours}) would exceed maximum (${maxWeeklyHours})`,
          details: {
            currentTotalHours,
            requestedHours,
            netHoursChange,
            newTotalHours,
            maxWeeklyHours
          }
        };
      }

      // Check for specific time slot conflicts
      const timeSlotConflicts = await this.checkTimeSlotConflicts(formateurId, groupId, moduleId);
      
      if (timeSlotConflicts.length > 0) {
        return {
          isValid: false,
          message: "Conflicts found with existing schedule",
          details: {
            conflicts: timeSlotConflicts,
            currentTotalHours,
            requestedHours
          }
        };
      }

      return {
        isValid: true,
        message: "No conflicts found with existing schedule"
      };

    } catch (error) {
      console.error("Error checking schedule conflicts:", error);
      return {
        isValid: false,
        message: "Error checking schedule conflicts",
        details: { error: error.message }
      };
    }
  }

  /**
   * Check for specific time slot conflicts
   * @param {number} formateurId 
   * @param {number} groupId 
   * @param {number} moduleId 
   * @returns {Array} Array of conflicts
   */
  static async checkTimeSlotConflicts(formateurId, groupId, moduleId) {
    const conflicts = [];

    // Get all sessions for this formateur
    const formateurSessions = await Session.findAll({
      include: [
        {
          model: Timetable,
          as: 'timetable',
          where: { status: 'active' }
        }
      ],
      where: {
        formateurId: formateurId
      }
    });

    // Group sessions by day and time slot
    const scheduleMap = {};
    formateurSessions.forEach(session => {
      if (!scheduleMap[session.day]) {
        scheduleMap[session.day] = {};
      }
      if (!scheduleMap[session.day][session.timeshot]) {
        scheduleMap[session.day][session.timeshot] = [];
      }
      scheduleMap[session.day][session.timeshot].push(session);
    });

    // Check for double bookings
    Object.keys(scheduleMap).forEach(day => {
      Object.keys(scheduleMap[day]).forEach(timeSlot => {
        const sessions = scheduleMap[day][timeSlot];
        if (sessions.length > 1) {
          conflicts.push({
            type: 'double_booking',
            day,
            timeSlot,
            sessions: sessions.map(s => ({
              groupId: s.groupId,
              moduleId: s.moduleId,
              groupCode: s.group?.code_group
            }))
          });
        }
      });
    });

    return conflicts;
  }

  /**
   * Check weekly hour limits
   * @param {number} formateurId 
   * @param {number} requestedHours 
   * @param {number} currentHours 
   * @param {string} sessionType 
   * @param {number} groupId - The group ID for presential sessions
   * @returns {Object} Weekly limit check result
   */
  static async checkWeeklyHourLimits(formateurId, requestedHours, currentHours, sessionType, groupId = null) {
    try {
      // Get current weekly hours for this formateur
      const currentWeeklyHours = await this.getCurrentWeeklyHours(formateurId, sessionType, groupId);
      
      const netHoursChange = requestedHours - currentHours;
      const newWeeklyHours = currentWeeklyHours + netHoursChange;

      // Fetch limits from settings
      let presentialLimit = 35;
      let remoteLimit = 10;
      try {
        const presentialSetting = await Setting.findOne({ where: { key: 'max_presential_hours' } });
        if (presentialSetting && !isNaN(Number(presentialSetting.value))) {
          presentialLimit = Number(presentialSetting.value);
        }
        const remoteSetting = await Setting.findOne({ where: { key: 'max_remote_hours' } });
        if (remoteSetting && !isNaN(Number(remoteSetting.value))) {
          remoteLimit = Number(remoteSetting.value);
        }
      } catch (e) {
        // fallback to defaults
      }

      // Different limits for different session types
      const limits = {
        presential: presentialLimit, // Maximum presential hours per week
        remote: remoteLimit      // Maximum remote hours per week
      };

      const limit = limits[sessionType] || presentialLimit;

      if (newWeeklyHours > limit) {
        return {
          isValid: false,
          message: `Weekly ${sessionType} hours (${newWeeklyHours}) would exceed limit (${limit})`,
          details: {
            currentWeeklyHours,
            requestedHours,
            netHoursChange,
            newWeeklyHours,
            limit,
            sessionType
          }
        };
      }

      return {
        isValid: true,
        message: "Weekly hour limits are satisfied"
      };

    } catch (error) {
      console.error("Error checking weekly hour limits:", error);
      return {
        isValid: false,
        message: "Error checking weekly hour limits",
        details: { error: error.message }
      };
    }
  }

  /**
   * Get current weekly hours for a formateur
   * @param {number} formateurId 
   * @param {string} sessionType 
   * @param {number} groupId - The group ID for presential sessions
   * @returns {number} Current weekly hours
   */
  static async getCurrentWeeklyHours(formateurId, sessionType, groupId = null) {
    try {
      if (sessionType === 'remote') {
        // For remote sessions, check ModuleRemoteSession
        const { ModuleRemoteSession } = require("../models");
        const remoteSessions = await ModuleRemoteSession.findAll({
          where: {
            formateurId,
            is_started: true
          }
        });
        return remoteSessions.reduce((total, session) => {
          return total + Number(session.nbr_hours_remote_session_in_week || 0);
        }, 0);
      } else {
        // For presential sessions, check GroupModuleFormateur
        const whereClause = {
          formateurId,
          is_started: true
        };
        if (groupId) {
          whereClause.groupId = groupId;
        }
        const presentialSessions = await GroupModuleFormateur.findAll({
          where: whereClause
        });
        return presentialSessions.reduce((total, session) => {
          return total + Number(session.nbr_hours_presential_in_week || 0);
        }, 0);
      }
    } catch (error) {
      console.error("Error getting current weekly hours:", error);
      return 0;
    }
  }

  /**
   * Suggest optimal time slots for the requested hours
   * @param {Array} availableSlots 
   * @param {number} requestedHours 
   * @param {string} sessionType 
   * @returns {Array} Suggested slots
   */
  static suggestOptimalSlots(availableSlots, requestedHours, sessionType) {
    const slotsNeeded = Math.ceil(requestedHours / 2.5);
    const suggestions = [];

    // Simple algorithm: take the first available slots
    for (let i = 0; i < Math.min(slotsNeeded, availableSlots.length); i++) {
      suggestions.push(availableSlots[i]);
    }

    return suggestions;
  }

  /**
   * Get detailed formateur schedule for a specific period
   * @param {number} formateurId 
   * @param {string} startDate 
   * @param {string} endDate 
   * @returns {Object} Detailed schedule
   */
  static async getFormateurSchedule(formateurId, startDate = null, endDate = null) {
    try {
      const whereClause = { formateurId };
      
      if (startDate && endDate) {
        whereClause.createdAt = {
          [require('sequelize').Op.between]: [startDate, endDate]
        };
      }

      const sessions = await Session.findAll({
        include: [
          {
            model: Timetable,
            where: { status: 'active' },
            include: [{ model: Group, as: 'group' }]
          },
          { model: Formateur, as: 'formateur' },
          { model: Module, as: 'module' }
        ],
        where: whereClause,
        order: [['day', 'ASC'], ['timeshot', 'ASC']]
      });

      // Group by day
      const scheduleByDay = {};
      sessions.forEach(session => {
        if (!scheduleByDay[session.day]) {
          scheduleByDay[session.day] = [];
        }
        scheduleByDay[session.day].push({
          timeSlot: session.timeshot,
          module: session.module.label,
          group: session.group.code_group,
          type: session.type
        });
      });

      return {
        formateurId,
        totalSessions: sessions.length,
        totalHours: sessions.length * 2.5,
        scheduleByDay
      };

    } catch (error) {
      console.error("Error getting formateur schedule:", error);
      throw error;
    }
  }
}

module.exports = FormateurAvailabilityValidator; 