const express = require("express");
const { index  , store, destroy } = require("../../../controllers/GroupsEnStageController.js");
const router = express.Router();

router.get('/groups-en-stage' , index)
router.post('/groups-en-stage' , store )
router.delete('/groups-en-stage/:id', destroy);

module.exports = router