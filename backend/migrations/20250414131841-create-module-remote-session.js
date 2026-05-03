"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Drop the table if it exists (for dev safety)
    await queryInterface.dropTable('ModuleRemoteSessions');
    await queryInterface.createTable("ModuleRemoteSessions", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      moduleId: {
        type: Sequelize.INTEGER,
        references: {
          model: "modules",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      formateurId: {
        type: Sequelize.INTEGER,
        references: {
          model: "formateurs",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      is_started: {
        type: Sequelize.BOOLEAN,
      },
      nbr_hours_remote_session_in_week: {
        type: Sequelize.BOOLEAN,
      },
      mergeId: {
        type: Sequelize.INTEGER,
        references: {
          model: "merges",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    }, {
      uniqueKeys: {
        unique_merge_module_formateur: {
          fields: ['mergeId', 'moduleId', 'formateurId']
        }
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("ModuleRemoteSessions");
  },
};
