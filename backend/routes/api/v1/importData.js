const express = require('express')
const {importData} = require('../../../controllers/Import/ImportDataController.js')
const {importDataClassroom } = require('../../../controllers/Import/ImportDataClassroomController.js')
const router = express.Router()
const multer = require('multer')
const { getDataNeed } = require('../../../controllers/GA/data.js')

const storage = multer.memoryStorage()
const upload = multer({storage : storage})

router.post('/import-data'  , upload.single('file'), importData )

router.post('/import-data-classroom'  , upload.single('file'), importDataClassroom )

router.get('/get-data-need' , getDataNeed )

module.exports = router 