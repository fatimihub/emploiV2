const { Group, Branch, GroupModuleFormateur, Module , GroupsNeedChangeTimetable, Setting, Formateur, Timetable, Session } = require("./../models");
const { transform } = require("./../helpers/transformers/groupTransformer.js");
const {
  transformGroupwithModules,
} = require("./../helpers/transformers/groupWithModulesTransformer.js");
const FormateurAvailabilityValidator = require("../services/formateurAvailabilityValidator.js");
const { getGenerationReportsForGroup, getAllGlobalGenerationReports } = require('./GA/GroupController.js');


const index = async (req, res) => {
  try {
    const groups = await Group.findAll({
      include: [{ model: Branch, as: "branch" }],
    });

    const data = groups.map((group) => transform(group));

    return res.json(data);
  } catch (err) {
    // Removed console.log statements for production
  }
};

// this show one details one groupe with the modules
const show = async (req, res) => {
  const { id } = req.params;
  const group = await Group.findOne({
    where: {
      id: id,
    },
    include: [
      {
        model: GroupModuleFormateur,
        include: [{ model: Module, as: "module" }],
      },
    ],
  });

  const data = transformGroupwithModules(group);
  return res.json(data);
};

// this for update state module for group
const updateStateModule = async (req, res) => {
  const { groupId, moduleId } = req.params;
  const { is_started } = req.body;

  if (!groupId || !moduleId) {
    return res.status(422).json({
      errors: "should by send in request groupId and moduleId and is_started!!",
    });
  }

  try {
    // Only update is_started, no strict validation here
    const groupModuleFormateur = await GroupModuleFormateur.update(
      { is_started: is_started },
      {
        where: {
          groupId: groupId,
          moduleId: moduleId,
        },
      }
    );

    await GroupsNeedChangeTimetable.upsert({
      groupId : groupId
    });

    return res.json({ 
      message: "seccès modifer state module en groupe"
    });

  } catch (err) {
    // Removed console.log statements for production
    return res.status(422).json({"errors" : 'Error'+err });
  }
};


// update nbr hours presential in module for group
const updateNbrHoursPresentailInWeek = async (req, res) => {
  const { groupId, moduleId } = req.params;
  const { nbr_hours_presential_in_week } = req.body;

  if (!nbr_hours_presential_in_week) {
    return res.status(422).json({
      errors:
        "should by send in request groupId and moduleId and nbr_hours_presential_in_week!!",
    });
  }

  try {
    // Get the current GroupModuleFormateur record to get formateurId and current hours
    const currentRecord = await GroupModuleFormateur.findOne({
      where: {
        groupId: groupId,
        moduleId: moduleId,
      },
    });

    if (!currentRecord) {
      return res.status(404).json({
        errors: "GroupModuleFormateur record not found",
      });
    }

    const currentHours = Number(currentRecord.nbr_hours_presential_in_week) || 0;
    const requestedHours = Number(nbr_hours_presential_in_week);

    // Validate formateur availability before updating
    const validationResult = await FormateurAvailabilityValidator.validateFormateurAvailability(
      currentRecord.formateurId,
      groupId,
      moduleId,
      requestedHours,
      'presential',
      currentHours
    );

    if (!validationResult.isValid) {
      return res.status(422).json({
        errors: validationResult.message,
        details: validationResult.details
      });
    }

    // If validation passes, update the record
    const groupModuleFormateur = await GroupModuleFormateur.update(
      { nbr_hours_presential_in_week: nbr_hours_presential_in_week },
      {
        where: {
          groupId: groupId,
          moduleId: moduleId,
        },
      }
    );

    await GroupsNeedChangeTimetable.upsert({
      groupId : groupId
    });

    return res.json({
      message: "seccès modifer nbr_hours_presential_in_week module en groupe",
      validation: validationResult
    });

  } catch (err) {
    // Removed console.log statements for production
    return res.status(500).json({
      errors: "Internal server error",
      details: err.message
    });
  }
};

// Get open modules for a group
const getOpenModulesByGroup = async (req, res) => {
  const { groupId } = req.params;
  try {
    const groupModules = await GroupModuleFormateur.findAll({
      where: { groupId, is_started: true, validate_efm: false },
      include: [
        { model: Module, as: 'module' },
        { model: Formateur, as: 'formateur' }
      ]
    });
    const modules = groupModules.map(gm => ({
      id: gm.moduleId,
      label: gm.module?.label,
      formateurId: gm.formateurId,
      formateur: gm.formateur?.name || ''
    }));
    res.json(modules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAllModulesByGroup = async (req, res) => {
  const { groupId } = req.params;
  try {
    const groupModules = await GroupModuleFormateur.findAll({
      where: { groupId },
      include: [
        { model: Module, as: 'module' },
        { model: Formateur, as: 'formateur' }
      ]
    });
    const modules = groupModules.map(gm => ({
      id: gm.moduleId,
      label: gm.module?.label,
      formateurId: gm.formateurId,
      formateur: gm.formateur?.name || ''
    }));
    res.json(modules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get available modules with available formateurs for specific time slot and day
const getAvailableModulesForTimeSlot = async (req, res) => {
  const { groupId } = req.params;
  const { day, timeSlot } = req.query;
  
  console.log(`🔍 [BACKEND] Getting available modules for group ${groupId}, ${day} ${timeSlot}`);
  
  if (!groupId || !day || !timeSlot) {
    return res.status(400).json({ 
      error: 'groupId, day, and timeSlot are required' 
    });
  }

  try {
    // Get all group modules
    const groupModules = await GroupModuleFormateur.findAll({
      where: { groupId },
      include: [
        { model: Module, as: 'module' },
        { model: Formateur, as: 'formateur' }
      ]
    });

    console.log(`📚 [BACKEND] Found ${groupModules.length} total modules for group ${groupId}`);

    // Check formateur availability for each module
    const availableModules = [];
    let skippedModules = 0;
    
    for (const gm of groupModules) {
      if (!gm.module || !gm.formateur) {
        skippedModules++;
        continue;
      }
      
      console.log(`👨‍🏫 [BACKEND] Checking formateur ${gm.formateur.name} for module ${gm.module.label}`);
      
      // Check if formateur is available at this time slot
      let isFormateurAvailable = true;

      const conflictingSession = await Session.findOne({
        where: {
          day,
          timeshot: timeSlot,
          formateurId: gm.formateurId,
        },
        include: [
          {
            model: Timetable,
            as: 'timetable',
            required: true,
            where: { status: 'active' },
          },
          { model: Module, as: 'module' },
        ],
      });

      if (conflictingSession) {
        isFormateurAvailable = false;
        console.log(
          `❌ [BACKEND] Formateur ${gm.formateur.name} is busy at ${day} ${timeSlot} with group ${conflictingSession.timetable?.groupId}`
        );
      }
      
      if (isFormateurAvailable) {
        availableModules.push({
          id: gm.moduleId,
          label: gm.module.label,
          formateurId: gm.formateurId,
          formateur: gm.formateur.name,
          classroomId: gm.formateur.classroomId
        });
        console.log(`✅ [BACKEND] Formateur ${gm.formateur.name} is available for module ${gm.module.label}`);
      }
    }

    console.log(`📊 [BACKEND] Result: ${availableModules.length} available modules, ${skippedModules} skipped modules`);
    res.json(availableModules);
  } catch (err) {
    console.error('❌ [BACKEND] Error getting available modules:', err);
    res.status(500).json({ error: err.message });
  }
};


module.exports = {
  index,
  show,
  updateStateModule,
  updateNbrHoursPresentailInWeek,
  getGenerationReportsForGroup,
  getAllGlobalGenerationReports,
  getOpenModulesByGroup,
  getAllModulesByGroup,
  getAvailableModulesForTimeSlot,
};
