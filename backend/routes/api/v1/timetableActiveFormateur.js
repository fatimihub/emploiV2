const express = require("express");
const router = express.Router();
const {index , show } = require('./../../../controllers/TimetableFormateurController.js')

router.get('/timetables/active/formateurs' , index)
router.get('/timetables/active/formateurs/:mleFormateur' , show)

module.exports = router