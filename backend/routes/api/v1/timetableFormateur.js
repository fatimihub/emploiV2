const express = require("express");
const router = express.Router();
const {
  index,
  show,
  exportFormateursExcel,
  exportFormateursPdf
} = require("./../../../controllers/TimetableFormateurInYearController.js");

router.get("/timetable-formateurs", index);
router.get("/timetable-formateurs/:mle_formateur", show);
router.get('/timetable-formateurs/excel', exportFormateursExcel);
router.get('/timetable-formateurs/pdf', exportFormateursPdf);


module.exports = router;
