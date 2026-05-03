const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { 
  Setting, 
  Administrator ,
  sequelize
} = require('../models');
const { resetAllTables } = require('../services/resetService.js');

// Match the secret with AuthController
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'default-secret-key-for-development-only';

// Get all settings
const index = async (req, res) => {
  try {
    const settings = await Setting.findAll();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

// Get a specific setting by key
const getByKey = async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await Setting.findOne({ where: { key } });
    
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    
    res.json(setting);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
};

// Create or update a setting
const createOrUpdate = async (req, res) => {
  try {
    const { key, value, description } = req.body;
    
    if (!key || value === undefined) {
      return res.status(400).json({ error: 'La clé et la valeur sont requises.' });
    }
    
    const [setting, created] = await Setting.findOrCreate({
      where: { key },
      defaults: { value: value.toString(), description }
    });
    
    if (!created) {
      // Update existing setting
      await setting.update({ 
        value: value.toString(), 
        description: description || setting.description 
      });
    }
    
    res.json(setting);
  } catch (error) {
    res.status(500).json({ error: 'Échec de la création/mise à jour du paramètre.' });
  }
};

// Delete a setting
const destroy = async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await Setting.findOne({ where: { key } });
    
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    
    await setting.destroy();
    res.json({ message: 'Setting deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete setting' });
  }
};

// Initialize default settings
const initializeDefaults = async ({ transaction } = {}) => {
  try {
    const defaultSettings = [
      {
        key: 'show_register_button',
        value: 'true',
        description: 'Enable or disable the register button on login page'
      },
      {
        key: 'max_presential_hours',
        value: '35',
        description: 'Maximum presential hours per week'
      },
      {
        key: 'max_remote_hours',
        value: '10',
        description: 'Maximum remote hours per week'
      },
      {
        key: 'reset_database_password',
        value: 'admin123',
        description: 'Password required to reset the database'
      }
    ];
    
    for (const setting of defaultSettings) {
      await Setting.findOrCreate({
        where: { key: setting.key },
        defaults: setting,
        transaction
      });
    }
    
  } catch (error) {
    console.error('Error initializing default settings:', error);
    throw error; // Re-throw to be caught by the transaction
  }
};

const resetDatabase = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { password } = req.body;
    
    if (!password) {
      await transaction.rollback(); 
      return res.status(400).json({ error: 'Mot de passe requis' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      await transaction.rollback(); 
      return res.status(401).json({ error: 'Token d\'authentification manquant ou invalide' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;

    try {
      decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
    } catch (error) {
      await transaction.rollback();
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Token invalide', details: error.message });
      } else if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Session expirée, veuillez vous reconnecter', details: error.expiredAt });
      }
      return res.status(500).json({ error: 'Erreur d\'authentification', details: error.message });
    }

    const admin = await Administrator.findOne({ 
      where: { 
        id: decoded.id,
        email: decoded.email
      } 
    });

    if (!admin) {
      await transaction.rollback();
      return res.status(401).json({ error: 'Administrateur non trouvé' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      await transaction.rollback();
      return res.status(401).json({ error: 'Mot de passe incorrect' });
    }

    req.admin = admin; // Authentication successful

    // Database Reset only runs if authentication passed completely
    await resetAllTables(transaction);
    await initializeDefaults({ transaction });

    await transaction.commit();

    res.json({
      message: 'Base de données réinitialisée avec succès',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    await transaction.rollback();
    res.status(500).json({
      error: 'Échec de la réinitialisation de la base de données',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get current reset password (for admin reference)
const getResetPassword = async (req, res) => {
  try {
    const setting = await Setting.findOne({ where: { key: 'reset_database_password' } });
    res.json({ 
      message: 'Current reset password',
      password: setting ? setting.value : 'admin123',
      note: 'Change this in the settings to update'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get reset password' });
  }
};

module.exports = { 
  index, 
  getByKey, 
  createOrUpdate, 
  destroy, 
  initializeDefaults, 
  resetDatabase,
  getResetPassword
}; 