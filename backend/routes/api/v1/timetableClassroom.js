const express = require("express");
const router = express.Router();
const { index , show } = require('./../../../controllers/TimetableClassroomController.js')

router.get('/classrooms-timetable' , index)
router.get('/classrooms-timetable/:id' , show)

module.exports = router


