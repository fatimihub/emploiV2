const express  = require('express')
const { index , addClassroom , classroomsNonDisponible , updateAvailableClassroom , classroomsDisponible, updateClassroom, deleteClassroom, updateFormateurInClassroom } = require('../../../controllers/ClassroomController.js')
const router = express.Router()


router.get('/classrooms' , index)
router.post('/add-classroom' , addClassroom)
router.get('/classrooms-disponible' , classroomsDisponible)
router.get('/classrooms-non-disponible' , classroomsNonDisponible )
router.patch('/classrooms-non-disponible/:classroomId' , updateAvailableClassroom )
router.put('/classrooms/:id', updateClassroom)
router.delete('/classrooms/:id', deleteClassroom);
router.post('/update-formateur-in-classroom', updateFormateurInClassroom);


module.exports = router 