function calculateWeeklyHours(timetables) {
    let totalHours = 0;
    const uniqueSlots = new Set();
    timetables.forEach(timetable => {
        const key = timetable.day + '-' + timetable.timeshot;
        if (!uniqueSlots.has(key)) {
            const [start, end] = timetable.timeshot.split('-');
            const startTime = new Date(`2000-01-01T${start}:00`);
            const endTime = new Date(`2000-01-01T${end}:00`);
            totalHours += (endTime - startTime) / (1000 * 60 * 60);
            uniqueSlots.add(key);
        }
    });
    return Number(totalHours.toFixed(1));
}

module.exports = {
  transform: (formateur) => {
    const totalHours = calculateWeeklyHours(formateur.FormateurTimetables);
    return {
      id: formateur.id,
      mle_formateur: formateur.mle_formateur,
      formateur: formateur.name,
      nbr_hours_in_week: totalHours
    };
  }
};
