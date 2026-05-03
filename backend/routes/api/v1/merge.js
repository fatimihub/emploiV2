const express = require("express");
const router = express.Router();
const {index , show , updateStateModule , updateNbrHoursRemoteInWeek} = require('./../../../controllers/MergeController.js')

router.get('/merges' , index)
router.get('/merges/:id' , show)
router.patch("/merges/:mergeId/module/:moduleId", updateStateModule);
router.patch("/merges/:mergeId/module/:moduleId/edit-nbr-hours-remote",
    updateNbrHoursRemoteInWeek
  );

module.exports = router