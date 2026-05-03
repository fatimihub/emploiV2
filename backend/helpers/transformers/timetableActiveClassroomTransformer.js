const dayOrder = {
    "Lundi" : 1 , 
    "Mardi" : 2 , 
    "Mercredi" : 3  , 
    "Jeudi" : 4 , 
    "Vendredi" : 5 ,
    "Samedi" : 6
}

module.exports = {
   
    transform: (groups) => {
        const classroomInfo = groups[0]?.Sessions[0]?.classroom;
        // Group sessions by day and timeshot
        const daysMap = {};
        groups.forEach(group => {
            group.Sessions.forEach(session => {
                const day = session.day;
                const timeshot = session.timeshot;
                if (!daysMap[day]) daysMap[day] = {};
                if (!daysMap[day][timeshot]) daysMap[day][timeshot] = [];
                daysMap[day][timeshot].push(session);
            });
        });
        // Build timetable and deduplicate for total hours
        const timetable = Object.keys(dayOrder).map(day => {
            const slots = daysMap[day] || {};
            const slotArr = Object.keys(slots).map(timeshot => {
                const sessions = slots[timeshot];
                // Merge modules, formateurs, groups if multiple sessions in the same slot
                return {
                    timeshot,
                    module: sessions.map(s => s.module.label).join(', '),
                    type: sessions[0].type === 'presential' ? 'presential' : 'à distance',
                    color: sessions[0].module.color, 
                    day,
                    formateur: Array.from(new Set(sessions.map(s => s.formateur.name))).join(', '),
                    salle: sessions[0].type === 'presential' ? sessions[0].classroom?.label  : 'Teams',
                    group: sessions.map(s => s.group.code_group).join(', ')
                };
            });
            // Fill empty slots
            const allSlots = ["08:30-11:00", "11:00-13:30", "13:30-16:00", "16:00-18:30"];
            const filledSlots = allSlots.map(ts => slotArr.find(s => s.timeshot === ts) || null);
            return { [day]: filledSlots.filter(Boolean) };
        });
        // For total hours, only count unique (day, timeshot) slots
        return {
            id: classroomInfo?.id,
            valid_form: groups[0]?.valid_form.toLocaleDateString() , 
            status: 'active', 
            nbr_hours_in_week: calculateWeeklyHours(daysMap), 
            salle: classroomInfo?.label,
            academic_year: groups[0]?.group?.academic_year || (function(date) {
                if (!date) return '2024-2025';
                const d = new Date(date);
                const year = d.getFullYear();
                const month = d.getMonth() + 1;
                return month >= 9 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
            })(groups[0]?.valid_form),
            timetable: timetable
        };
    }
};

function calculateWeeklyHours(daysMap) {
    let totalHours = 0;
    const seen = new Set();
    Object.entries(daysMap).forEach(([day, slots]) => {
        Object.keys(slots).forEach(timeshot => {
            const key = day + '-' + timeshot;
            if (!seen.has(key)) {
                seen.add(key);
                const [start, end] = timeshot.split('-');
                const startTime = new Date(`2000-01-01T${start}:00`);
                const endTime = new Date(`2000-01-01T${end}:00`);
                totalHours += (endTime - startTime) / (1000 * 60 * 60);
            }
        });
    });
    return totalHours.toFixed(1);
}

