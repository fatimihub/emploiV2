const express = require("express");
const router = express.Router();
const { index, getByKey, createOrUpdate, destroy, resetDatabase, getResetPassword } = require('../../../controllers/SettingController.js');
const { authenticateJWT } = require('../../../middleware/auth');

// Public routes (no authentication required)
router.get('/settings', index);
router.get('/settings/:key', getByKey);

// Apply authentication middleware to PROTECTED routes
router.use(authenticateJWT);

// Create or update setting
router.post('/settings', createOrUpdate);

// Update setting by key
router.put('/settings/:key', createOrUpdate);

// Delete setting
router.delete('/settings/:key', destroy);

// Reset database with password confirmation
router.post('/reset-database', resetDatabase);

// Get current reset password (for admin reference)
router.get('/reset-password', getResetPassword);

module.exports = router;