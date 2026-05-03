'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Timetables', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      groupId: {
        type: Sequelize.INTEGER ,
        references : {
          model : "groups" , 
          key : "id"
        }
      },
      valid_form: {
        type: Sequelize.DATE
      },
      status : {
        type : Sequelize.ENUM('active', 'archived') ,
        defaultValue: 'archived',
        
      },
      nbr_hours_in_week : {
        type : Sequelize.STRING ,
        defaultValue : 0
      }
      ,
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
    await queryInterface.dropTable('Timetables');
  }
};