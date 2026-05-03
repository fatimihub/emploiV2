const {
  Session, FormateurTimetable, ModuleRemoteSession, GroupModuleFormateur, GroupMerge,
  GroupsNeedChangeTimetable, Traning, BranchModule, Timetable, Formateur, Group, Module,
  Classroom, Merge, Branch, Setting, sequelize
} = require('../models');

// Define the deletion order from most dependent (children) to least dependent (parents).
const TRUNCATION_ORDER = [
  // 1. Logs, Timetables, Sessions (Most dependent)
  'Session',
  'FormateurTimetable',
  'ModuleRemoteSession',
  'GroupsNeedChangeTimetable',
  'Timetable',

  // 2. Junction/Association Tables
  'GroupModuleFormateur',
  'BranchModule',
  'Traning',

  // 3. Main Entities that reference other entities
  'GroupMerge',
  'Merge',
  'Group',

  // 4. Base Entities
  'Module',
  'Formateur',
  'Classroom',
  'Branch',

  // 5. Configuration
  'Setting'
];

async function resetAllTables(transaction) {
  for (const modelName of TRUNCATION_ORDER) {
    const model = sequelize.models[modelName];

    // Skip if model isn't registered or is the Administrator
    if (!model || modelName === 'Administrator') continue;

    try {
      console.log(`Truncating table: ${model.tableName}`);
      await model.destroy({
        where: {},
        truncate: true,
        force: true,
        transaction
      });
    } catch (err) {
      // Warn but continue — a missing table should not abort the whole reset
      console.warn(`Warning: could not truncate ${model.tableName}: ${err.message}`);
    }
  }
}

module.exports = { resetAllTables };