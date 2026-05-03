const express = require("express");
// const { generate_population } = require('./../../../controllers/GA/Generate-timetable-v0.js')
const {
  generate_timetables,
  getFrenchReport,
  exportGlobalReportPdf,
  deleteGlobalGenerationReport,
} = require("./../../../controllers/GA/Generate-timetable.js");
const {
  generateFormateurTimetable,
} = require("../../../controllers/GA/Generate-timetable-formateur.js");

const router = express.Router();

router.post("/generate-timetable", generate_timetables);

router.post("/generate-timetable-formateurs", generateFormateurTimetable);

router.get('/timetable/report/:groupCode', getFrenchReport);
router.post('/timetable/report/pdf', exportGlobalReportPdf);
router.delete('/global-generation-reports/:id', deleteGlobalGenerationReport);

module.exports = router;
