"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Classroom extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Classroom.init(
    {
      label: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
      },
      is_available: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "Classroom",
      tableName: "classrooms",
      timestamps: true
    }
  );

  Classroom.associate = (models) => {
    Classroom.hasMany(models.Formateur, {
      foreignKey: "classroomId",
      as: "formateurs",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    Classroom.hasMany(models.Session, {
      foreignKey: "classroomId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return Classroom;
};
