const express = require("express");
const router = express.Router();
const {
  index,
  show,
  updateStateModule,
  updateNbrHoursPresentailInWeek,
  getGenerationReportsForGroup,
  getAllGlobalGenerationReports,
  getOpenModulesByGroup,
  getAllModulesByGroup,
  getAvailableModulesForTimeSlot,
} = require("./../../../controllers/GroupController.js");
const { validateAddSession, addSession, getFormateurBusySlots } = require('./../../../controllers/GA/PersonalizeTimetableController.js');


router.get("/groups", index);
router.get("/groups/:id", show);
router.patch("/groups/:groupId/module/:moduleId", updateStateModule);
router.patch(
  "/groups/:groupId/module/:moduleId/edit-nbr-hours-presentail",
  updateNbrHoursPresentailInWeek
);

router.get('/groups/:groupId/generation-reports', getGenerationReportsForGroup);


router.get('/global-generation-reports', getAllGlobalGenerationReports);

router.get('/modules/by-group/:groupId', getOpenModulesByGroup);
router.get('/all-modules/by-group/:groupId', getAllModulesByGroup);
router.get('/available-modules/:groupId', getAvailableModulesForTimeSlot);

router.post('/group/:groupId/validate-add-session', validateAddSession);
router.post('/group/:groupId/add-session', addSession);

router.get('/formateur/:formateurId/busy-slots', getFormateurBusySlots);

module.exports = router;
