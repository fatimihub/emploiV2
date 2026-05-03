const { Merge, ModuleRemoteSession, Module  , Group , GroupsNeedChangeTimetable, Setting } = require("./../models");
const {
  transform,
} = require("./../helpers/transformers/mergeWithModulesRemoteSessionWithoutFilterTransformer.js");
const FormateurAvailabilityValidator = require("../services/formateurAvailabilityValidator.js");

const index = async (req, res) => {
  try {
    const merges = await Merge.findAll({});

    return res.json(merges);
  } catch (err) {
    // Removed console.log statements for production
  }
};

// this show details merge with modules 
const show = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res
      .status(422)
      .json({ errors: "should be send id merge in params!!" });
  }
  try {
    const merge = await Merge.findOne({
      where: {
        id,
      },
      include: [{ model: ModuleRemoteSession, include: [{ model: Module }] }],
    });

    const transformedData = await transform(merge);
    return res.json(transformedData);
  } catch (err) {
    // Removed console.log statements for production
    return res.status(500).json({ errors: "Internal server error" });
  }
};

// this for update state
const updateStateModule = async (req, res) => {
  const { mergeId, moduleId } = req.params;
  const { is_started } = req.body;

  if (!mergeId || !moduleId) {
    return res.status(422).json({
      errors: "should by send in request mergeId and moduleId and is_started!!",
    });
  }

  try {
    // If activating, validate max remote sessions in merge
    if (is_started === true || is_started === 'true' || is_started === 1 || is_started === '1') {
      // Get max allowed from settings (default 1 if not set)
      let maxRemoteSessions = 1;
      const setting = await Setting.findOne({ where: { key: 'max_remote_sessions_per_merge' } });
      if (setting && !isNaN(Number(setting.value))) {
        maxRemoteSessions = Number(setting.value);
      }
      // Count currently active remote sessions in this merge
      const activeSessions = await ModuleRemoteSession.findAll({
        where: {
          mergeId: mergeId,
          is_started: true
        },
        order: [['updatedAt', 'ASC']]
      });
      // If already at max, deactivate the oldest before activating the new one
      if (activeSessions.length >= maxRemoteSessions) {
        const toDeactivate = activeSessions[0];
        await ModuleRemoteSession.update(
          { is_started: false },
          {
            where: {
              mergeId: mergeId,
              moduleId: toDeactivate.moduleId,
            },
          }
        );
      }
    }
    // Update is_started for the requested module
    await ModuleRemoteSession.update(
      { is_started: is_started },
      {
        where: {
          mergeId: mergeId,
          moduleId: moduleId,
        },
      }
    );

    const moduleRemoteSession = await ModuleRemoteSession.findOne({
      where: {
        mergeId: mergeId,
        moduleId: moduleId,
      },
    });

    const merge = await Merge.findOne({
      where: {
        id: mergeId,
      },
      include: [{ model: Group }, { model: ModuleRemoteSession, include: [{ model: Module }] }],
    });

    for (let group of merge.Groups) {
      await GroupsNeedChangeTimetable.upsert({
        groupId: group.id,
      });
    }

    // Use transformer to return updated module list with statuses
    const transformedData = await transform(merge);

    return res.json({
      message: "seccès modifer state module en merge",
      moduleRemoteSession,
      modules: transformedData.modules
    });
  } catch (err) {
    // Removed console.log statements for production
    return res.status(500).json({
      errors: "Internal server error",
      details: err.message,
    });
  }
};


// update nbr hours remote in module for merge
const updateNbrHoursRemoteInWeek = async (req, res) => {
  const { mergeId, moduleId } = req.params;
  const { nbr_hours_remote_session_in_week } = req.body;

  if (
    !nbr_hours_remote_session_in_week ||
    isNaN(nbr_hours_remote_session_in_week)
  ) {
    return res.status(422).json({
      errors:
        "should by send in request mergeId and moduleId and nbr_hours_remote_in_week!!",
    });
  }

  try {
    // Get the current ModuleRemoteSession record to get formateurId and current hours
    const currentRecord = await ModuleRemoteSession.findOne({
      where: {
        mergeId: mergeId,
        moduleId: moduleId,
      },
    });

    if (!currentRecord) {
      return res.status(404).json({
        errors: "ModuleRemoteSession record not found",
      });
    }

    const currentHours = Number(currentRecord.nbr_hours_remote_session_in_week) || 0;
    const requestedHours = Number(nbr_hours_remote_session_in_week);

    // Get the first group from the merge for validation (we'll validate against one group)
    const merge = await Merge.findOne({
      where: { id: mergeId },
      include: [{ model: Group }]
    });

    if (!merge || !merge.Groups || merge.Groups.length === 0) {
      return res.status(404).json({
        errors: "No groups found for this merge",
      });
    }

    const firstGroupId = merge.Groups[0].id;

    // Validate formateur availability before updating
    const validationResult = await FormateurAvailabilityValidator.validateFormateurAvailability(
      currentRecord.formateurId,
      firstGroupId,
      moduleId,
      requestedHours,
      'remote',
      currentHours
    );

    if (!validationResult.isValid) {
      return res.status(422).json({
        errors: validationResult.message,
        details: validationResult.details
      });
    }

    // If validation passes, update the record
    const moduleRemoteSession = await ModuleRemoteSession.update(
      { nbr_hours_remote_session_in_week: nbr_hours_remote_session_in_week },
      {
        where: {
          mergeId: mergeId,
          moduleId: moduleId,
        },
      }
    );

    // Update all groups in the merge
    for (let group of merge.Groups) {
      await GroupsNeedChangeTimetable.upsert({
        groupId: group.id
      });
    }

    return res.json({
      message: "seccès modifer nbr_hours_remote_in_week module en merge",
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

module.exports = { index, show, updateStateModule, updateNbrHoursRemoteInWeek };
