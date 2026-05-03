"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class FormateurTimetable extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  FormateurTimetable.init(
    {
      formateurId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      timeshot: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      day: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      year: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "FormateurTimetable",
      timestamps: true
    }
  );
  FormateurTimetable.associate = (models) => {
    FormateurTimetable.belongsTo(models.Formateur, {
      foreignKey: "formateurId",
      as: "formateur",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  // FormateurTimetable.sync({ force: true });
  return FormateurTimetable;
};
