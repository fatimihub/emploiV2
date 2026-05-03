const colorManager = require('../../services/colorManager');
const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const getTimetable = (Sessions) => {
  // Collect unique modules in this group
  const uniqueModules = [];
  const seen = new Set();
  Sessions.forEach(session => {
    const key = session.module.code_module;
    if (!seen.has(key)) {
      uniqueModules.push({
        id: session.module.id,
        code: session.module.code_module,
        label: session.module.label
      });
      seen.add(key);
    }
  });
  // Assign unique colors to modules
  const colorMap = colorManager.assignUniqueColorsToModules(uniqueModules.map(m => ({ id: m.code, label: m.label })));

  const sessions = Sessions.map((session) => {
    return {
      id: session.id,
      module: session.module.label,
      type: session.type,
      timeshot: session.timeshot,
      color: colorMap[session.module.code_module],
      day: session.day,
      formateur: session.formateur.name,
      formateurId: session.formateurId,
      salle: session.type === 'à distance' ? "Teams" : (session.classroom ? session.classroom.label : "Teams"),
    };
  })

  return DAYS.map((day) => ({
    [day]: sessions
      .filter((session) => session.day === day)
      .sort((a, b) => a.timeshot.localeCompare(b.timeshot)),
  }));
};

module.exports = {
  transformTimetableGroup: (timetable) => {
    if (!timetable) return null;
    const valid_form = new Date(timetable.valid_form)
    
    // Calculate correct total hours from actual sessions
    let totalHours = 0;
    if (timetable.Sessions && timetable.Sessions.length > 0) {
      // Each session slot is 2.5 hours
      totalHours = timetable.Sessions.length * 2.5;
    }
    
    return {
      id: timetable.id,
      groupId: timetable.group.id, // Add groupId for frontend
      valid_form: valid_form?.toLocaleDateString(),
      status: timetable.status,
      nbr_hours_in_week : totalHours, // Use calculated total instead of stored value
      groupe: timetable.group.code_group,
      niveau: timetable.group.niveau,
      year_of_formation: timetable.group.year_of_formation ? `${timetable.group.year_of_formation} - ${timetable.group.year_of_formation + 1}` : '',
      academic_year: timetable.group.academic_year || (function(date) {
        if (!date) return '2024-2025';
        const d = new Date(date);
        const year = d.getFullYear();
        const month = d.getMonth() + 1;
        return month >= 9 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
      })(timetable.valid_form),
      code_branch: timetable.group?.branch?.code_branch || '',
      label_branch: timetable.group?.branch?.label || '',
      timetable :getTimetable(timetable.Sessions)
    };
  },
};
