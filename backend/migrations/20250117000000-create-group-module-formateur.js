"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("GroupModuleFormateurs", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      groupId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "groups",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      moduleId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "modules",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      formateurId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "formateurs",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      nbr_hours_presential_in_week: {
        type: Sequelize.STRING,
        defaultValue: 0,
      },
      nbr_hours_remote_in_week: {
        type: Sequelize.STRING,
        defaultValue: 0,
      },
      mhp_realise: {
        type: Sequelize.INTEGER,
      },
      mhsyn_realise: {
        type: Sequelize.INTEGER,
      },
      nbr_cc: {
        type: Sequelize.INTEGER,
      },
      validate_efm: {
        type: Sequelize.INTEGER,
      },
      is_started: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    try {
      await queryInterface.addIndex('GroupModuleFormateurs', {
        fields: ['groupId', 'formateurId' , "moduleId"],
        unique: true,
        name: 'unique_group_module_formateur'
      });
    } catch (e) {
      if (!/already exists/.test(e.message)) throw e;
    }
    
  },
  
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("GroupModuleFormateurs");
  },
};
