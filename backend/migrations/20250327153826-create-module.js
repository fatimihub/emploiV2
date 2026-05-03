'use strict';


/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Modules', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      code_module: {
        type: Sequelize.STRING , 
       
      },
      label: {
        type: Sequelize.STRING , 
      },
      is_regionnal: {
        type: Sequelize.BOOLEAN
      },
      mhp_s1: {
        type: Sequelize.INTEGER
      },
      mhsyn_s1: {
        type: Sequelize.INTEGER
      },
      mhp_s2: {
        type: Sequelize.INTEGER
      },
      mhsyn_s2: {
        type: Sequelize.INTEGER
      },
      color : {
        type : Sequelize.STRING
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
  
    });
    try {
      await queryInterface.addIndex('Modules', {
        fields: [ 'code_module', 'label'],
        unique: true,
        name: 'unique_code_module_and_label'
      });
    } catch (e) {
      if (!/already exists/.test(e.message)) throw e;
    }
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Modules');
  }
};