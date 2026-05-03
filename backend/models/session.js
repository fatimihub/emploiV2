"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Session extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Session.init(
    {
      timetableId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      groupId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      classroomId: {
        type: DataTypes.INTEGER,
        // allowNull: false,
      },
      moduleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      formateurId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      timeshot: {
        type: DataTypes.TIME,
        allowNull: false,
      },
      day: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "Session",
      tableName: "sessions",
      timestamps: true
    }
  );
  Session.associate = (models) => {
    Session.belongsTo(models.Module, {
      foreignKey: "moduleId",
      as: "module",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    Session.belongsTo(models.Group, {
      foreignKey: "groupId",
      as: "group",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    Session.belongsTo(models.Formateur, {
      foreignKey: "formateurId",
      as: "formateur",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    Session.belongsTo(models.Timetable, {
      foreignKey: "timetableId",
      as: "timetable",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    Session.belongsTo(models.Classroom, {
      foreignKey: "classroomId",
      as: "classroom",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return Session;
};
