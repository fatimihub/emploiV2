const express = require("express");
const { index, getAllUniqueValidFromDates, filterTimetableHistoric } = require("../../../controllers/HistoricTimetables/HistoricTimetableGroupsController.js");
const { index: indexFormateurs, getAllUniqueValidFromDates: getFormateurDates } = require("../../../controllers/HistoricTimetables/HistoricTimetableFormateursController.js");
const { index: indexSalles, getAllUniqueValidFromDates: getSalleDates } = require("../../../controllers/HistoricTimetables/HistoricTimetableClassroomController.js");
const router = express.Router();

// Groups historic
router.get('/historic-timetables/groups', index)
router.get('/get-all-unique-valid-from-dates', getAllUniqueValidFromDates)
router.get('/historic-timetables/groups-filter', filterTimetableHistoric)

// Formateurs historic
router.get('/historic-timetables/formateurs', indexFormateurs)
router.get('/get-all-unique-valid-from-dates-formateurs', getFormateurDates)

// Salles (classrooms) historic
router.get('/historic-timetables/salles', indexSalles)
router.get('/get-all-unique-valid-from-dates-salles', getSalleDates)

module.exports = router
