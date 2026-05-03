const { Group, Timetable, Session, Module, Formateur, Classroom, Branch, Setting } = require('../../models');
const { canAddSessionWithGapRule, getValidTimeShotsForFormateurDay } = require('./constraints');
const { transformTimetableGroup } = require('../../helpers/transformers/timetableGroupTransformer');

// Validate if a session can be added to the timetable
async function validateAddSession(req, res) {
  try {
    const { groupId } = req.params;
    const { day, timeSlot, moduleId, formateurId, classroomId, type } = req.body;
    // Fetch the group's timetable
    const timetable = await Timetable.findOne({ where: { groupId, status: 'active' } });
    if (!timetable) return res.status(404).json({ valid: false, errors: ['Timetable not found'] });

    // Fetch ALL sessions for this day across all active timetables to check conflicts properly
    const allSessionsToday = await Session.findAll({
      where: { day },
      include: [{ model: Timetable, as: 'timetable', where: { status: 'active' } }]
    });

    const dayGroupSessions = allSessionsToday.filter(s => s.groupId == groupId);
    const dayFormateurSessions = allSessionsToday.filter(s => s.formateurId == formateurId);
    const dayClassroomSessions = classroomId ? allSessionsToday.filter(s => s.classroomId == classroomId) : [];

    const newSession = { moduleId, formateurId, classroomId, timeShot: timeSlot, type };
    const errors = [];

    // 1. Time slot conflict (group)
    if (dayGroupSessions.some(s => s.timeshot === timeSlot)) {
      errors.push('Ce créneau est déjà occupé pour ce groupe.');
    }

    // 2. Formateur conflict (across all groups)
    if (dayFormateurSessions.some(s => s.timeshot === timeSlot)) {
      errors.push('Le formateur est déjà occupé à ce créneau (dans ce groupe ou un autre).');
    }

    // 3. Classroom conflict (across all groups)
    if (classroomId && dayClassroomSessions.some(s => s.timeshot === timeSlot)) {
      errors.push('La salle est déjà occupée à ce créneau.');
    }

    // 4. Saturday afternoon constraint
    if (day === 'Samedi' && (timeSlot === '13:30-16:00' || timeSlot === '16:00-18:30')) {
      errors.push('Impossible d\'ajouter une séance le samedi après-midi (après 13:30).');
    }

    // 5. Gap rule check for Group
    if (!canAddSessionWithGapRule(dayGroupSessions, newSession)) {
      errors.push('Viol de la règle d’espacement (2.5h) pour le groupe entre remote/présentiel.');
    }

    // 6. Gap rule check for Formateur (very important for travel time)
    if (!canAddSessionWithGapRule(dayFormateurSessions, newSession)) {
      errors.push('Viol de la règle d’espacement (2.5h) pour le formateur entre remote/présentiel.');
    }

    // 7. Max hours per week for Formateur
    const [maxPresSetting, maxRemSetting] = await Promise.all([
      Setting.findOne({ where: { key: 'max_presential_hours' } }),
      Setting.findOne({ where: { key: 'max_remote_hours' } })
    ]);
    const maxPresHours = maxPresSetting ? parseFloat(maxPresSetting.value) : 35;
    const maxRemHours = maxRemSetting ? parseFloat(maxRemSetting.value) : 10;

    const allFormateurSessions = await Session.findAll({ 
      where: { formateurId },
      include: [{ model: Timetable, as: 'timetable', where: { status: 'active' } }]
    });

    const currentPresHours = allFormateurSessions.filter(s => s.type === 'présentiel').length * 2.5;
    const currentRemHours = allFormateurSessions.filter(s => s.type === 'à distance').length * 2.5;

    if (type === 'présentiel' && currentPresHours + 2.5 > maxPresHours) {
      errors.push(`Limite d'heures présentielles dépassée pour ce formateur (${maxPresHours}h max. Actuel: ${currentPresHours}h).`);
    } else if (type === 'à distance' && currentRemHours + 2.5 > maxRemHours) {
      errors.push(`Limite d'heures à distance dépassée pour ce formateur (${maxRemHours}h max. Actuel: ${currentRemHours}h).`);
    }

    if (errors.length > 0) {
      return res.json({ valid: false, errors });
    }
    return res.json({ valid: true });
  } catch (err) {
    return res.status(500).json({ valid: false, errors: [err.message] });
  }
}

// Actually add the session if valid
async function addSession(req, res) {
  try {
    const { groupId } = req.params;
    const { day, timeSlot, moduleId, formateurId, classroomId, type } = req.body;
    // Validate first
    req.body.type = type;
    const validation = await validateAddSession({ ...req, body: req.body }, { json: v => v, status: () => ({ json: v => v }) });
    if (!validation.valid) {
      return res.status(400).json({ success: false, errors: validation.errors });
    }
    // Find timetable
    const timetable = await Timetable.findOne({ where: { groupId, status: 'active' } });
    if (!timetable) return res.status(404).json({ success: false, errors: ['Timetable not found'] });
    // Create session
    await Session.create({
      timetableId: timetable.id,
      groupId,
      moduleId,
      formateurId,
      classroomId,
      timeshot: timeSlot,
      type,
      day,
    });

    // Fetch the updated timetable with all associations for transformation
    const updatedTimetable = await Timetable.findOne({
      where: { id: timetable.id },
      include: [
        {
          model: Group, as: 'group',
          include: [
            { model: Branch, as: "branch" }
          ]
        },
        {
          model: Session,
          include: [
            { model: Formateur, as: 'formateur' },
            { model: Classroom, as: "classroom" },
            { model: Module, as: "module" }
          ]
        }
      ]
    });

    return res.json({ 
      success: true, 
      updatedTimetable: transformTimetableGroup(updatedTimetable) 
    });
  } catch (err) {
    return res.status(500).json({ success: false, errors: [err.message] });
  }
}

async function getFormateurBusySlots(req, res) {
  try {
    const { formateurId } = req.params;
    const year = String(new Date().getFullYear());
    const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

    // 1. Get profile availability for the whole week
    const profileAvailability = await FormateurTimetable.findAll({
      where: { formateurId, year }
    });

    // 2. Fetch all active sessions for this formateur across all groups
    const busySessions = await Session.findAll({
      where: { formateurId },
      include: [
        { model: Timetable, as: 'timetable', where: { status: 'active' } }
      ]
    });

    const weeklyData = {};

    DAYS.forEach(day => {
      const dayProfile = profileAvailability.filter(a => a.day === day);
      const dayBusy = busySessions.filter(s => s.day === day);

      const ALL_SLOTS = day === 'Samedi'
        ? ['08:30-11:00', '11:00-13:30']
        : ['08:30-11:00', '11:00-13:30', '13:30-16:00', '16:00-18:30'];

      const availableSlots = new Set();
      dayProfile.forEach(({ timeshot }) => {
        ALL_SLOTS.forEach(slot => {
          if (isTimeSlotWithin(slot, timeshot)) {
            availableSlots.add(slot);
          }
        });
      });

      weeklyData[day] = {
        availableSlots: Array.from(availableSlots),
        busySlots: dayBusy.map(s => ({
          timeshot: s.timeshot,
          timetableId: s.timetableId
        }))
      };
    });

    return res.json({ 
      success: true, 
      weeklyData
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { validateAddSession, addSession, getFormateurBusySlots };