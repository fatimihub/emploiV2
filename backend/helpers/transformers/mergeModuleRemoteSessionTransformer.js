// module.exports = {
//   transform: (merge) => {
//     return {
//       id: merge.id,
//       groups: merge.groups,
//       modules_open: merge.ModuleRemoteSessions
//       .filter(item => item.is_started == true )
//       .map((item) => {
//         return {
//           moduleId: item.Module.id,
//           label: item.Module.label,
//           code_module: item.Module.code_module,
//           is_started: item.is_started,
//           nbr_hours_remote_session_in_week:
//           item.nbr_hours_remote_session_in_week,
//           type :'à distance' , 
//           formateurId : item.Formateur.id ,
//           formateur: item.Formateur ? item.Formateur.name : null,
//           formateur_is_available: item.Formateur
//             ? item.Formateur.is_available
//             : null,
//         };
//         return item;
//       }),
//     };
//   },

// };
module.exports = {
  transform: (merge) => {
    const modules = [];

    merge.ModuleRemoteSessions
      .filter(item => item.is_started === true)
      .forEach(session => {
        const module = session.Module;
        const formateur = session.Formateur;

        const totalHours = parseFloat(session.nbr_hours_remote_session_in_week);

        let remainingHours = totalHours;

        while (remainingHours > 0) {
          // Always use 2.5 hour atomic chunks so that Generate-remote-timetable
          // can place them independently in 2.5 hour slots
          let chunk = 2.5;

          modules.push({
            moduleId: module.id,
            code_module: module.code_module,
            module_label: module.label,
            nbr_hours_remote_session_in_week: chunk,
            is_started: session.is_started,
            type: 'à distance',
            formateurId: formateur.id,
            formateur: formateur ? formateur.name : null,
            formateur_is_available: formateur ? formateur.is_available : null,
          });

          remainingHours -= chunk;
        }
      });

    return {
      id: merge.id,
      groups: merge.groups,
      modules_open: modules,
    };
  },
};