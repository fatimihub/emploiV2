const express = require("express");
const router = express.Router();
const {index} = require('./../../../controllers/BranchController.js')

router.get('/branches' , index )

module.exports = router