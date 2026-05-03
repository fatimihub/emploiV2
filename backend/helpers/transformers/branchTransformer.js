module.exports = {
  transform: (branch) => {
    return {
      id: branch.id,
      code_branch: branch.code_branch,
      label: branch.label,
      groups: branch.Groups.map((group) => {
        return {
          id: group.id,
          code_group: group.code_group,
          code_branch: branch.code_branch,
          modules_open: group.GroupModuleFormateurs.filter(
            (item) => item.is_started == true
          ).map((item) => {
            return {
              id: item.module.id,
              label: item.module.label,
              mle_formateur: item.formateur.mle_formateur,
              formateur: item.formateur.name,
              formateurIsAvailable: item.formateur.is_available,
              classroom: item.formateur.classroom.label,
              classroomIsAvailable: item.formateur.classroom.is_available,
              mhp_s1: item.module.mhp_s1,
              mhsyn_s1: item.module.mhsyn_s1,
              mhp_s2: item.module.mhp_s2,
              mhsyn_s2: item.module.mhsyn_s2,
              mhp_realise: item.module.mhp_realise,
              mhsyn_realise: item.module.mhsyn_realise,
              validate_efm: item.module.validate_efm,
            };
          }),
        };
        return group;
      }),
    };
  },

  transformMany: function (branches) {
    return branches.map((branch) => this.transform(branch));
  },
};
