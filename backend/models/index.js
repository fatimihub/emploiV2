'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const { getDatabasePath } = require('../helpers/databasePath');
const basename = path.basename(__filename);
const env = (process.env.NODE_ENV || 'development').trim();
const configData = require(__dirname + '/../config/config.json')[env];

const config = { ...configData };
if (config.dialect === 'sqlite') {
  config.storage = getDatabasePath();
}
const db = {};

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

fs
  .readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

sequelize.options.logging = false 

db.sequelize = sequelize;
db.Sequelize = Sequelize;

// These models are already registered by the auto-loader above
const GenerationReport = db['GenerationReport'];
const GlobalGenerationReport = db['GlobalGenerationReport'];

module.exports = {
  ...db,
  GenerationReport,
  GlobalGenerationReport,
};
