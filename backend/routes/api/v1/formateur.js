const express = require("express");
const router = express.Router();
const {index , formateursDisponible  ,   formateursNonDisponible , updateAvailableFormateur, addFormateur} = require('./../../../controllers/FormateurController.js')

router.get('/formateurs' , index)
router.post('/formateurs', addFormateur)

router.get('/formateurs-disponible' , formateursDisponible )

router.get('/formateurs-non-disponible' , formateursNonDisponible )

router.patch('/formateurs-non-disponible/:formateurId' , updateAvailableFormateur )


module.exports = router