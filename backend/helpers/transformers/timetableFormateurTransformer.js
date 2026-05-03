
const dayOrder = {
  "Lundi": 1,
  "Mardi": 2,
  "Mercredi": 3,
  "Jeudi": 4,
  "Vendredi": 5,
  "Samedi": 6
}
module.exports = {
  transformFormateur: (formateur) => {
    // Calculate total hours based on actual timeshot durations
    let totalHours = 0;

    formateur.FormateurTimetables.forEach(timetable => {
      const timeshot = timetable.timeshot;

      // Calculate hours based on timeshot
      if (timeshot === "08:30-11:00" || timeshot === "11:00-13:30") {
        // 2.5 hours for Saturday slots
        totalHours += 2.5;
      } else if (timeshot === "08:30-13:30" || timeshot === "13:30-18:30") {
        // 5 hours for regular day slots
        totalHours += 5;
      }
    });

    // Derive the display year from the stored year field.
    // The year column in FormateurTimetable is the current academic year (e.g. "2026").
    // We use the system year as fallback in case the DB row has no year yet.
    const systemYear = String(new Date().getFullYear());
    const derivedYear = formateur.FormateurTimetables?.[0]?.year || systemYear;

    // Build the timetable rows, ensuring each entry exposes the year
    // so the frontend can display "Année de formation : XXXX" correctly.
    const timetableRows = formateur.FormateurTimetables
      .sort((a, b) => dayOrder[a.day] - dayOrder[b.day])
      .map(t => ({
        ...t.dataValues,
        year: t.year || systemYear
      }));

    return {
      id: formateur.id,
      mle_formateur: formateur.mle_formateur,
      formateur: formateur.name,
      nbr_hours_in_week: totalHours,
      year: derivedYear,
      academic_year: (function(yearStr) {
        const year = parseInt(yearStr);
        if (isNaN(year)) return '2024-2025';
        const month = new Date().getMonth() + 1;
        return month >= 9 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
      })(derivedYear),
      timetable: timetableRows
    }
  }
}