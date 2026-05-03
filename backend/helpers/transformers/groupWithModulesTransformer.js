
module.exports = {
    transformGroupwithModules : (group) => {
         const modules = group.GroupModuleFormateurs.map(module => {
            return {
                moduleId :module.module.id ,
                code_module : module.module.code_module , 
                module_label : module.module.label ,
                nbr_hours_presential_in_week : module.nbr_hours_presential_in_week ,
                nbr_hours_remote_in_week : module.nbr_hours_remote_in_week , 
                is_started : module.is_started,
                validate_efm: module.validate_efm,
                mhp_realise: module.mhp_realise,
                mhsyn_realise: module.mhsyn_realise,
                mhp_s1: module.module.mhp_s1,
                mhp_s2: module.module.mhp_s2,
                mhsyn_s1: module.module.mhsyn_s1,
                mhsyn_s2: module.module.mhsyn_s2
            }
         });
         return {
             id : group.id , 
             code_group : group.code_group , 
             modules,
             modules_ouverts: modules.filter(m => m.is_started === true && m.validate_efm !== true),
             autres_modules: modules.filter(m => m.is_started === false && m.validate_efm !== true),
             modules_finis: modules.filter(m => m.validate_efm === true)
         }
    }
}