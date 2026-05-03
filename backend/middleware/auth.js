const jwt = require('jsonwebtoken');
const { Administrator } = require('../models');

const path = require('path');
// Load environment variables from the parent directory where .env is located
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'your-secret-key';

const authenticateJWT = async (req, res, next) => {
  try {
    // Auth middleware executing...
    console.log(`🔒 Authenticating request: ${req.method} ${req.originalUrl || req.path}`);

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log(`❌ No auth header for: ${req.method} ${req.path}`);
      return res.status(401).json({
        success: false,
        error: 'Token d\'authentification manquant ou invalide'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);

    // Find admin by ID from token
    const admin = await Administrator.findByPk(decoded.id);

    if (!admin) {
      return res.status(401).json({
        success: false,
        error: 'Utilisateur non autorisé'
      });
    }

    // Attach user to request object
    req.user = {
      id: admin.id,
      email: admin.email,
      role: 'admin' // Assuming all users with token are admins
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Token invalide'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Session expirée, veuillez vous reconnecter'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erreur d\'authentification'
    });
  }
};

module.exports = {
  authenticateJWT
};
