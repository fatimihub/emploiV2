"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Formateur extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Formateur.init(
    {
      mle_formateur: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      is_available: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      classroomId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "Formateur",
      tableName: "formateurs",
      timestamps: true
    }
  );
  Formateur.associate = (models) => {
    Formateur.hasMany(models.GroupModuleFormateur, {
      foreignKey: "formateurId",
    });
    Formateur.belongsTo(models.Classroom, {
      foreignKey: "classroomId",
      as: "classroom",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    Formateur.hasMany(models.ModuleRemoteSession);
    Formateur.hasMany(models.Session);
    Formateur.hasMany(models.FormateurTimetable);
  };

  return Formateur;
};
