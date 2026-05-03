const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { Login, Register } = require('../../../controllers/Auth/AuthController.js')
const { updateInfo, updatePassword, deleteAccount, countAdministrators, updateAvatar } = require('../../../controllers/Auth/AdministratorController.js')
const { authenticateJWT } = require('../../../middleware/auth.js')

const router = express.Router()

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../../../backend/uploads/admin-images');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage for avatar uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir)
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname))
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    }
});

// Public routes (no authentication required)
router.post('/login', Login)
router.post('/register', Register)
router.get('/administrators/count', countAdministrators)

// Protected routes (authentication required)
router.patch('/update-info-administrator', authenticateJWT, updateInfo)
router.patch('/update-password', authenticateJWT, updatePassword)
router.delete('/delete-account/:email', authenticateJWT, deleteAccount)

// Avatar Upload
router.patch('/update-avatar', authenticateJWT, upload.single('avatar'), updateAvatar)

module.exports = router