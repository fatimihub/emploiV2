
module.exports = {
    transformGroupwithModules : (group) => {
        const modules =  [] 
        
        group.GroupModuleFormateurs
        .filter(module => module.is_started === true)
        .forEach(gmf => {
             const module = gmf.module  
             const formateur = gmf.formateur 

             // Skip if module or formateur is missing
             if (!module || !formateur) {
               console.warn('Missing module or formateur for session:', {
                 moduleId: module?.id,
                 formateurId: formateur?.id
               });
               return;
             }

             const totalHours = parseFloat(gmf.nbr_hours_presential_in_week)

             let remainingHours = totalHours 

             while(remainingHours > 0){
                 let chunk = remainingHours >= 5 ? 5 : 2.5

                 modules.push({
                    moduleId  : module.id ,
                    code_module : module.code_module , 
                    module_label :  module.label ,
                    nbr_hours_presential_in_week : chunk  ,
                    is_started : gmf.is_started , 
                    type :'presential' ,
                    formateurId : formateur.id ,
                    formateur: formateur.name ,
                    classroom : `Salle${formateur.classroomId}`, 
                    classroomId : formateur.classroomId ,
                    classroom_is_available : true , // Assume available
                    formateur_is_available : formateur.is_available ,
                 })

                 remainingHours -= chunk
             }

        })

        return modules
    }
}