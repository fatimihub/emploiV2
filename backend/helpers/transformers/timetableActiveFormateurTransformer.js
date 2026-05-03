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
        const formateurInfo = groups[0]?.Sessions[0]?.formateur;
        const daysMap = {};
        groups.forEach(group => {
            group.Sessions.forEach(session => {
                const day = session.day;
                if (!daysMap[day]) {
                    daysMap[day] = [];
                }
                
                daysMap[day].push({
                    id: session.id,
                    module: session.module.label,
                    type: session.type === 'presential' ? 'presential' : 'à distance',
                    timeshot: session.timeshot,
                    color: session.module.color, 
                    day: day,
                    formateur: session.formateur.name,
                    salle : session.type === 'presential' ? session.classroom?.label  : 'Teams',
                    group: session.group.code_group
                });
            });
        });
        
        const timetable = Object.keys(dayOrder).map(day => {
            return daysMap[day] ? { [day]: daysMap[day] } : { [day] : []};
        })


        return {
            id: formateurInfo?.id,
            valid_form: groups[0]?.valid_form.toLocaleDateString() , 
            status: 'active', 
            nbr_hours_in_week: Number(calculateWeeklyHours(daysMap)), 
            formateur: formateurInfo?.name,
            mle_formateur: formateurInfo?.mle_formateur,
            timetable: timetable
        };
    }
};

function calculateWeeklyHours(daysMap) {
    let totalHours = 0;
    const uniqueSlots = new Set();
    Object.values(daysMap).forEach(sessions => {
        sessions.forEach(session => {
            const key = session.day + '-' + session.timeshot;
            if (!uniqueSlots.has(key)) {
                const [start, end] = session.timeshot.split('-');
                const startTime = new Date(`2000-01-01T${start}:00`);
                const endTime = new Date(`2000-01-01T${end}:00`);
                totalHours += (endTime - startTime) / (1000 * 60 * 60);
                uniqueSlots.add(key);
            }
        });
    });
    return Number(totalHours.toFixed(1));
}

