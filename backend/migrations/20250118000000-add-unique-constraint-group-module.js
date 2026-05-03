'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // For SQLite, we need to handle duplicates differently
    // First, get all duplicate records
    const duplicates = await queryInterface.sequelize.query(`
      SELECT groupId, moduleId, MIN(id) as keepId
      FROM GroupModuleFormateurs 
      GROUP BY groupId, moduleId 
      HAVING COUNT(*) > 1
    `, { type: Sequelize.QueryTypes.SELECT });

    // Delete duplicates, keeping only the first one
    for (const duplicate of duplicates) {
      await queryInterface.sequelize.query(`
        DELETE FROM GroupModuleFormateurs 
        WHERE groupId = ? AND moduleId = ? AND id != ?
      `, {
        replacements: [duplicate.groupId, duplicate.moduleId, duplicate.keepId],
        type: Sequelize.QueryTypes.DELETE
      });
    }

    // Add unique constraint
    try {
      await queryInterface.addIndex('GroupModuleFormateurs', {
        fields: ['groupId', 'moduleId'],
        unique: true,
        name: 'unique_group_module'
      });
    } catch (e) {
      if (!/already exists/.test(e.message)) throw e;
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('GroupModuleFormateurs', 'unique_group_module');
  }
}; 