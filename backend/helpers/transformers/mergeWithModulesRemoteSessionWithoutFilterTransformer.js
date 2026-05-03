module.exports = {
    transform: async (merge) => {
        const { GroupModuleFormateur, Module } = require('../../models');
        
        // Get all modules for this merge's groups
        const groups = await merge.getGroups();
        const groupIds = groups.map(group => group.id);
        
        // Get GroupModuleFormateur records for all groups in this merge
        const groupModuleFormateurs = await GroupModuleFormateur.findAll({
            where: {
                groupId: groupIds
            },
            include: [{
                model: Module,
                as: 'module'
            }]
        });

        // Create a map of moduleId to validate_efm status
        const moduleValidationMap = new Map();
        groupModuleFormateurs.forEach(gmf => {
            if (!moduleValidationMap.has(gmf.moduleId)) {
                moduleValidationMap.set(gmf.moduleId, {
                    validate_efm: gmf.validate_efm,
                    mhp_realise: gmf.mhp_realise,
                    mhsyn_realise: gmf.mhsyn_realise,
                    mhp_s1: gmf.module.mhp_s1,
                    mhp_s2: gmf.module.mhp_s2,
                    mhsyn_s1: gmf.module.mhsyn_s1,
                    mhsyn_s2: gmf.module.mhsyn_s2
                });
            }
        });

        return {
            id : merge.id , 
            groups : merge.groups ,
            modules: merge.ModuleRemoteSessions
            .map((item) => {
              const moduleValidation = moduleValidationMap.get(item.Module.id) || {};
              return {
                moduleId: item.Module.id,
                module_label: item.Module.label,
                code_module: item.Module.code_module,
                is_started: item.is_started,
                nbr_hours_remote_session_in_week: item.nbr_hours_remote_session_in_week,
                validate_efm: moduleValidation.validate_efm || false,
                mhp_realise: moduleValidation.mhp_realise || 0,
                mhsyn_realise: moduleValidation.mhsyn_realise || 0,
                mhp_s1: moduleValidation.mhp_s1 || 0,
                mhp_s2: moduleValidation.mhp_s2 || 0,
                mhsyn_s1: moduleValidation.mhsyn_s1 || 0,
                mhsyn_s2: moduleValidation.mhsyn_s2 || 0
              };
            }),
        }
    }
}