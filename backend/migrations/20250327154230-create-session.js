"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Sessions", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      timetableId: {
        type: Sequelize.INTEGER,
        references: {
          model: "timetables",
          key: "id",
        },
      },
      groupId: {
        type: Sequelize.INTEGER,
        references: {
          model: "groups",
          key: "id",
        },
      },
      classroomId: {
        type: Sequelize.INTEGER,
        references: {
          model: "classrooms",
          key: "id",
        },
      },
      moduleId: {
        type: Sequelize.INTEGER,
        references: {
          model: "modules",
          key: "id",
        },
      },
      formateurId: {
        type: Sequelize.INTEGER,
        references: {
          model: "formateurs",
          key: "id",
        },
      },
      type: {
        type: Sequelize.STRING,
      },
      timeshot: {
        type: Sequelize.TIME,
      },
    
      day: {
        type: Sequelize.STRING,
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
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Sessions");
  },
};
