const XLSX = require("xlsx");
const multer = require("multer");
const colorManager = require("../../services/colorManager.js");
const ModuleSchedulingValidator = require("../../services/moduleSchedulingValidator.js");
const {
  Branch,
  Formateur,
  Group,
  Module,
  Classroom,
  GroupModuleFormateur,
  GroupMerge,
  Merge,
  ModuleRemoteSession,
  sequelize,
  Setting,
  GroupsNeedChangeTimetable
} = require("../../models/index.js");

const importData = async (req, res) => {
  if (!req.file) {
    return res.json({ errors: "Le fichier Excel est requis !" });
  }

  // Use transaction for atomicity and better performance
  const transaction = await sequelize.transaction();

  try {
    if (process.env.NODE_ENV !== 'production') console.log("Starting high-performance import...");
    const startTime = Date.now();

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);
    
    if (
      !rows[0]["Code Filière"] &&
      !rows[0]["Groupe"] &&
      !rows[0]["Code Module"] &&
      !rows[0]["Module"]
    ) {
      await transaction.rollback();
      return res.status(422).json({ errors: "Veuillez choisir un fichier correct !" });
    }

    if (process.env.NODE_ENV !== 'production') console.log(`Processing ${rows.length} rows...`);

    // Create default classroom
    await Classroom.upsert({
      label: "UnKnown",
      is_available: true,
    }, { transaction });

    const classroomDefault = await Classroom.findOne({
      where: { label: "UnKnown" },
      transaction
    });

    // Step 1: Collect all unique data for bulk operations
    if (process.env.NODE_ENV !== 'production') console.log("Step 1: Collecting unique data...");
    
    // Filter rows to only include those with "CDJ" as Créneau
    const filteredRows = rows.filter(row => {
      const creneau = row["Créneau"];
      if (!creneau || creneau.toString().trim().toUpperCase() !== "CDJ") {
        if (process.env.NODE_ENV !== 'production') console.log(`Skipping row: Créneau = "${creneau}" (not CDJ)`);
        return false;
      }
      return true;
    });
    
    if (process.env.NODE_ENV !== 'production') console.log(`Filtered to ${filteredRows.length} rows with CDJ time slot out of ${rows.length} total rows`);
    
    const uniqueBranches = new Map();
    const uniqueMerges = new Map();
    const uniqueGroups = new Map();
    const uniqueModules = new Map();
    const uniqueFormateurs = new Map();
    const groupModuleFormateurs = [];
    const moduleRemoteSessions = [];

    for (let row of filteredRows) {
      // Collect branches
      if (row["Code Filière"] && row["filière"]) {
        uniqueBranches.set(row["Code Filière"], {
        code_branch: row["Code Filière"],
        label: row["filière"],
      });
      }

      // Collect merges
      if (row["FusionGroupe"]) {
        uniqueMerges.set(row["FusionGroupe"], {
          groups: row["FusionGroupe"],
        });
      }

      // Collect groups
      if (row["Groupe"] && row["Code Filière"]) {
        uniqueGroups.set(row["Groupe"], {
        code_group: row["Groupe"],
        effective: row["Effectif Groupe"],
        year_of_formation: row["Année de formation"],
        academic_year: row["Année"], // Extract dynamic academic year from "Année" column
          code_branch: row["Code Filière"], // Reference for later
          niveau: row["Niveau"]
        });
      }

      // Collect modules (normalize key)
      if (row["Code Module"] && row["Module"]) {
        const codeModuleNorm = String(row["Code Module"]).trim().toLowerCase();
        const labelNorm = String(row["Module"]).trim().toLowerCase();
        const key = `${codeModuleNorm}-${labelNorm}`;
        if (uniqueModules.has(key)) {
          // Track duplicates but don't log for every row to avoid UI blocking
          if (!uniqueModules.get(key).isDuplicate) {
            uniqueModules.get(key).isDuplicate = true;
          }
        } else {
          uniqueModules.set(key, {
            code_module: row["Code Module"],
            label: row["Module"],
            is_regionnal: row["Régional"] === "O",
            mhp_s1: row["MHP S1 DRIF"],
            mhsyn_s1: row["MHSYN S1 DRIF"],
            mhp_s2: row["MHP S2 DRIF"],
            mhsyn_s2: row["MHSYN S2 DRIF"],
            color: colorManager.getColorForModule(row["Module"]),
            isDuplicate: false
          });
        }
      }

      // Collect formateurs
      if (row["Mle Affecté Présentiel Actif"] && row["Formateur Affecté Présentiel Actif"]) {
        uniqueFormateurs.set(row["Mle Affecté Présentiel Actif"], {
          mle_formateur: row["Mle Affecté Présentiel Actif"],
          name: row["Formateur Affecté Présentiel Actif"],
          is_available: true,
          classroomId: classroomDefault.id,
        });
      }

      if (row["Mle Affecté Syn Actif"] && row["Formateur Affecté Syn Actif"]) {
        uniqueFormateurs.set(row["Mle Affecté Syn Actif"], {
          mle_formateur: row["Mle Affecté Syn Actif"],
          name: row["Formateur Affecté Syn Actif"],
          is_available: true,
          classroomId: classroomDefault.id,
        });
      }
    }

    // Single summary log for duplicates
    if (process.env.NODE_ENV !== 'production') {
      const duplicates = Array.from(uniqueModules.values()).filter(m => m.isDuplicate);
      if (duplicates.length > 0) {
        console.log(`Found ${duplicates.length} modules with duplicate entries in Excel. Unique modules collected: ${uniqueModules.size}`);
      }
    }

    // Step 2: Bulk upsert branches
    if (process.env.NODE_ENV !== 'production') console.log("Step 2: Bulk upserting branches...");
    const branchData = Array.from(uniqueBranches.values());
    await Branch.bulkCreate(branchData, {
      updateOnDuplicate: ['label'],
      transaction
    });

    // Get branch lookup map
    const branches = await Branch.findAll({ transaction });
    const branchMap = new Map();
    branches.forEach(b => branchMap.set(b.code_branch, b.id));

    // Step 3: Bulk upsert merges
    if (process.env.NODE_ENV !== 'production') console.log("Step 3: Bulk upserting merges...");
    const mergeData = Array.from(uniqueMerges.values());
    await Merge.bulkCreate(mergeData, {
      updateOnDuplicate: ['groups'],
      transaction
    });

    // Get merge lookup map
    const merges = await Merge.findAll({ transaction });
    const mergeMap = new Map();
    merges.forEach(m => mergeMap.set(m.groups, m.id));

    // Step 4: Bulk upsert groups (with branchId) - ONLY FOR GROUPS WITH MODULES
    if (process.env.NODE_ENV !== 'production') console.log("Step 4: Bulk upserting groups...");
    
    // First, determine which groups actually have modules
    const groupsWithModules = new Set();
    for (let row of filteredRows) {
      if (row["Groupe"] && row["Code Module"] && row["Module"]) {
        groupsWithModules.add(row["Groupe"]);
      }
    }
    
    if (process.env.NODE_ENV !== 'production') console.log(`Found ${groupsWithModules.size} groups with modules out of ${uniqueGroups.size} total groups`);
    
    // Only create groups that have modules
    const groupData = Array.from(uniqueGroups.values())
      .filter(group => groupsWithModules.has(group.code_group))
      .map(group => ({
      ...group,
      branchId: branchMap.get(group.code_branch)
      }))
      .filter(group => group.branchId);

    await Group.bulkCreate(groupData, {
      updateOnDuplicate: ['effective', 'year_of_formation', 'branchId', 'niveau', 'academic_year'],
      transaction
    });

    // Get group lookup map
    const groups = await Group.findAll({ transaction });
    const groupMap = new Map();
    groups.forEach(g => groupMap.set(g.code_group, g.id));

    // Step 5: Bulk upsert modules
    if (process.env.NODE_ENV !== 'production') console.log("Step 5: Bulk upserting modules...");
    const moduleData = Array.from(uniqueModules.values());

    // Fetch all existing modules from the database and build a normalized key set
    const existingModules = await Module.findAll({ attributes: ['code_module', 'label'] });
    const existingModuleKeys = new Set(
      existingModules.map(m => `${String(m.code_module).trim().toLowerCase()}-${String(m.label).trim().toLowerCase()}`)
    );

    // Filter out modules that already exist in the database
    const modulesToInsert = moduleData.filter(m => {
      const key = `${String(m.code_module).trim().toLowerCase()}-${String(m.label).trim().toLowerCase()}`;
      return !existingModuleKeys.has(key);
    });

    await Module.bulkCreate(modulesToInsert, {
      updateOnDuplicate: ['label', 'is_regionnal', 'mhp_s1', 'mhsyn_s1', 'mhp_s2', 'mhsyn_s2', 'color'],
      transaction
    });

    // Get module lookup map
    const modules = await Module.findAll({ transaction });
    const moduleMap = new Map();
    modules.forEach(m => moduleMap.set(`${m.code_module}-${m.label}`, m.id));

    // Step 6: Bulk upsert formateurs
    if (process.env.NODE_ENV !== 'production') console.log("Step 6: Bulk upserting formateurs...");
    const formateurData = Array.from(uniqueFormateurs.values());

    // Find the 'UnKnown' classroom id
    const unknownClassroom = await Classroom.findOne({ where: { label: 'UnKnown' }, transaction });
    const unknownClassroomId = unknownClassroom ? unknownClassroom.id : null;

    // For each formateur, if classroomId is 'UnKnown', remove it from the upsert data
    const formateurDataForUpsert = formateurData.map(f => {
      if (f.classroomId === unknownClassroomId) {
        // Do not update classroomId if it's 'UnKnown'
        const { classroomId, ...rest } = f;
        return rest;
      }
      return f;
    });

    await Formateur.bulkCreate(formateurDataForUpsert, {
      updateOnDuplicate: ['name', 'is_available'], // do not update classroomId if 'UnKnown'
      transaction
    });

    // Get formateur lookup map
    const formateurs = await Formateur.findAll({ transaction });
    const formateurMap = new Map();
    formateurs.forEach(f => formateurMap.set(f.mle_formateur, f.id));

    // Step 7: Process associations and complex relationships
    if (process.env.NODE_ENV !== 'production') console.log("Step 7: Processing associations...");
    
    // Collect group-module data for validation
    const groupModuleData = [];
    
    for (let row of filteredRows) {
      // Only include modules that are started (fit in the weekly limit)
      if (row._force_is_started === false) continue;
      const groupId = groupMap.get(row["Groupe"]);
      const moduleId = moduleMap.get(`${row["Code Module"]}-${row["Module"]}`);
      const mergeId = row["FusionGroupe"] ? mergeMap.get(row["FusionGroupe"]) : null;

      // Group-Merge associations
      if (groupId && mergeId) {
        await GroupMerge.findOrCreate({
          where: { groupId, mergeId },
          defaults: { groupId, mergeId },
          transaction
        });
      }

      // Collect data for module scheduling validation
      if (groupId && moduleId && row["Mle Affecté Présentiel Actif"] && row["Mle Affecté Syn Actif"]) {
        groupModuleData.push({
          groupId,
          moduleId,
          mhp_realise: row["MH Réalisée Présentiel"],
          mhsyn_realise: row["MH Réalisée Sync"],
          validate_efm: row["Validation EFM"] == "oui" ? true : false
        });
      }
    }

    // Debug: Log which modules are being validated
    const debugGroupModules = {};
    for (const item of groupModuleData) {
      if (!debugGroupModules[item.groupId]) debugGroupModules[item.groupId] = [];
      const moduleObj = modules.find(m => m.id === item.moduleId);
      debugGroupModules[item.groupId].push(moduleObj ? moduleObj.code_module : item.moduleId);
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log('VALIDATING ONLY STARTED MODULES PER GROUP:');
      Object.entries(debugGroupModules).forEach(([groupId, moduleCodes]) => {
        console.log(`  Group ${groupId}: ${moduleCodes.join(', ')}`);
      });
    }

    // Remove adjustment logic that depended on validationResult
    // (No need to apply adjustments or update groupModuleData)

    // --- UPDATED LOGIC: Only start modules if enough duration remains ---
    // Build a map: groupId -> [{ row, module, presentialHours }]
    const groupPresentialMap = {};
    for (let row of filteredRows) {
      const groupId = groupMap.get(row["Groupe"]);
      const moduleId = moduleMap.get(`${row["Code Module"]}-${row["Module"]}`);
      if (!groupId || !moduleId) continue;
      const module = modules.find(m => m.id === moduleId);
      if (!module) continue;
      const presentialHours = getNumberHoursModulePresentailInWeek(module);
      if (!groupPresentialMap[groupId]) groupPresentialMap[groupId] = [];
      groupPresentialMap[groupId].push({ row, module, presentialHours });
    }
    // For each group, only start modules if enough duration remains
    Object.entries(groupPresentialMap).forEach(async ([groupId, moduleList]) => {
      // Fetch max weekly hours from settings
      let remaining = 35;
      try {
        const presentialSetting = await Setting.findOne({ where: { key: 'max_presential_hours' } });
        if (presentialSetting && !isNaN(Number(presentialSetting.value))) {
          remaining = Number(presentialSetting.value);
        }
      } catch (e) {}
      // Keep order as in file (or sort by priority if needed)
      for (let m of moduleList) {
        if (remaining >= m.presentialHours) {
          m.row._deactivated = false;
          m.row._force_is_started = true;
          remaining -= m.presentialHours;
        } else {
          m.row._deactivated = false;
          m.row._force_is_started = false;
        }
      }
    });
    // --- END UPDATED LOGIC ---

    // --- VALIDATION FOR REPORTING ONLY ---
    // (Removed: no validation step, import proceeds based on is_started logic only)
    // --- END VALIDATION FOR REPORTING ONLY ---

    // Continue with original association processing using adjusted data
    for (let row of filteredRows) {
      if (row._deactivated) continue; // (kept for compatibility, but not used now)
      const groupId = groupMap.get(row["Groupe"]);
      const moduleId = moduleMap.get(`${row["Code Module"]}-${row["Module"]}`);
      const mergeId = row["FusionGroupe"] ? mergeMap.get(row["FusionGroupe"]) : null;

      // Group-Module-Formateur associations
      if (groupId && moduleId && row["Mle Affecté Présentiel Actif"] && row["Mle Affecté Syn Actif"]) {
        const formateurPresentialId = formateurMap.get(row["Mle Affecté Présentiel Actif"]);
        const formateurSynId = formateurMap.get(row["Mle Affecté Syn Actif"]);

        if (formateurPresentialId && formateurSynId) {
          const module = modules.find(m => m.id === moduleId);
          
          // Get adjusted hours if available
          const adjustedData = groupModuleData.find(item => 
            item.groupId === groupId && item.moduleId === moduleId
          );
          
          const presentialHours = adjustedData && adjustedData.adjustmentApplied 
            ? adjustedData.adjustedHours 
            : getNumberHoursModulePresentailInWeek(module);
          
          const remoteHours = getNumberHoursModuleRemoteInWeek(module);
          
          // Use _force_is_started if set
          const isStarted = typeof row._force_is_started === 'boolean' ? row._force_is_started : checkModuleWithGroupIsStarted(module);
          
          // Use upsert for robust updating
          await GroupModuleFormateur.upsert({
              formateurId: formateurPresentialId, // Primary formateur (presential)
              moduleId: moduleId,
              groupId: groupId,
              mhp_realise: row["MH Réalisée Présentiel"],
              mhsyn_realise: row["MH Réalisée Sync"],
              nbr_hours_presential_in_week: presentialHours,
              nbr_hours_remote_in_week: remoteHours,
              is_started: isStarted,
              nbr_cc: row["NB CC"],
              validate_efm: row["Validation EFM"] == "oui" ? true : false,
          }, {
            transaction
          });

          // ModuleRemoteSession (for remote sessions)
          if (mergeId) {
            await ModuleRemoteSession.upsert({
              formateurId: formateurSynId,
              moduleId: moduleId,
              mergeId: mergeId,
              nbr_hours_remote_session_in_week: remoteHours,
              is_started: checkModuleIsStartedRemoteSessionWithMergeGroup(module),
            }, {
              conflictFields: ["mergeId", "moduleId", "formateurId"],
              transaction
            });
          }
        }
      }
    }

    // Step 8: Create branch-module associations
    if (process.env.NODE_ENV !== 'production') console.log("Step 8: Creating branch-module associations...");
    const branchModuleAssociations = [];
    for (let row of filteredRows) {
      const branchId = branchMap.get(row["Code Filière"]);
      const moduleId = moduleMap.get(`${row["Code Module"]}-${row["Module"]}`);
      
      if (branchId && moduleId) {
        branchModuleAssociations.push({ branchId, moduleId });
      }
    }

    // Use bulkCreate for branch-module associations
    if (branchModuleAssociations.length > 0) {
      await sequelize.models.BranchModule.bulkCreate(branchModuleAssociations, {
        ignoreDuplicates: true,
        transaction
      });
    }

    // Step 9: Cleanup - Remove groups without modules
    if (process.env.NODE_ENV !== 'production') console.log("Step 9: Cleaning up groups without modules...");
    const groupsWithModulesInDB = await GroupModuleFormateur.findAll({
      attributes: ['groupId'],
      group: ['groupId'],
      transaction
    });
    
    const groupsWithModulesIds = new Set(groupsWithModulesInDB.map(g => g.groupId));
    const allGroups = await Group.findAll({ transaction });
    
    const groupsToDelete = allGroups.filter(group => !groupsWithModulesIds.has(group.id));
    
    if (groupsToDelete.length > 0) {
      if (process.env.NODE_ENV !== 'production') console.log(`Removing ${groupsToDelete.length} groups without modules: ${groupsToDelete.map(g => g.code_group).join(', ')}`);
      
      for (const group of groupsToDelete) {
        await Group.destroy({
          where: { id: group.id },
          transaction
        });
      }
    } else {
      if (process.env.NODE_ENV !== 'production') console.log("No groups without modules found");
    }

    // Step 10: Mark groups with open or finished modules as needing timetable changes
    const groupIdsWithModules = await GroupModuleFormateur.findAll({
      attributes: ['groupId'],
      group: ['groupId'],
      transaction
    });
    for (const g of groupIdsWithModules) {
      await GroupsNeedChangeTimetable.upsert({ groupId: g.groupId }, { transaction });
    }

    // Commit transaction
    await transaction.commit();

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    if (process.env.NODE_ENV !== 'production') console.log(`Import completed in ${duration.toFixed(2)} seconds!`);
    if (process.env.NODE_ENV !== 'production') console.log(`Processed ${filteredRows.length} rows with CDJ time slot out of ${rows.length} total rows`);
    if (process.env.NODE_ENV !== 'production') console.log(`Created/Updated ${uniqueBranches.size} branches`);
    if (process.env.NODE_ENV !== 'production') console.log(`Created/Updated ${uniqueGroups.size} groups`);
    if (process.env.NODE_ENV !== 'production') console.log(`Created/Updated ${uniqueModules.size} modules`);
    if (process.env.NODE_ENV !== 'production') console.log(`Created/Updated ${uniqueFormateurs.size} formateurs`);

    return res.json({ 
      message: "Importation réussie",
      performance: {
        duration: `${duration.toFixed(2)} secondes`,
        rowsProcessed: filteredRows.length,
        totalRows: rows.length,
        cdjRows: filteredRows.length,
        branches: uniqueBranches.size,
        groups: uniqueGroups.size,
        modules: uniqueModules.size,
        formateurs: uniqueFormateurs.size
      }
    });

  } catch (err) {
    await transaction.rollback();
    console.error("Import error:", err);
    return res.status(422).json({ errors: "Erreur lors de la lecture du fichier.", details: err.message });
  }
};

// Helper functions (unchanged)
const getNumberHoursModulePresentailInWeek = (module) => {
  const totalHoursInModulePresentail = module.mhp_s1 + module.mhp_s2;

  if (totalHoursInModulePresentail <= 30) {
    return 2.5;
  } else if (totalHoursInModulePresentail <= 90) {
    return 10;
  } else {
    return 15;
  }
};

const getNumberHoursModuleRemoteInWeek = (module) => {
  const totalHoursInModuleRemote = module.mhsyn_s1 + module.mhsyn_s2;
  if (totalHoursInModuleRemote > 10) {
    return 5;
  } else if (totalHoursInModuleRemote <= 10 && totalHoursInModuleRemote != 0) {
    return 2.5;
  }

  return 0;
};

const checkModuleWithGroupIsStarted = (module) => {
  if (
    module.mhp_realise + module.mhsyn_realise > 0 &&
    module.mhp_realise + module.mhsyn_realise !=
      module.mhp_s1 + module.mhp_s2 + module.mhsyn_s1 + module.mhsyn_s2 &&
    module.validate_efm == false
  ) {
    return true;
  }
  return false;
};

const checkModuleIsStartedRemoteSessionWithMergeGroup = (module) => {
  if (
    module.mhsyn_realise > 0 &&
    module.mhsyn_realise != module.mhsyn_s1 + module.mhsyn_s2 &&
    module.validate_efm == false
  ) {
    return true;
  }
  return false;
};

// Legacy functions for backward compatibility
const getRandomColor = () => {
  return colorManager.getContrastSafeHexColor();
};

const getContrastSafeColor = () => {
  return colorManager.getContrastSafeHSLColor();
};

const getHighContrastColor = () => {
  return colorManager.getContrastSafeHexColor();
};

module.exports = { importData };
