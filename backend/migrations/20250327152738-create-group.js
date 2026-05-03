'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Groups', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      code_group: {
        type: Sequelize.STRING , 
        unique : true 
      },
      effective: {
        type: Sequelize.INTEGER
      },
      year_of_formation: {
        type: Sequelize.INTEGER
      },
      branchId: {
        type: Sequelize.INTEGER ,
        references : {
          model : "branches" , 
          key : "id"
        }
      },
      
      niveau : {
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
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Groups');
  }
};