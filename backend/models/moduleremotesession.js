"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class ModuleRemoteSession extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  ModuleRemoteSession.init(
    {
      moduleId: DataTypes.INTEGER,
      formateurId: DataTypes.INTEGER,
      is_started: DataTypes.BOOLEAN,
      nbr_hours_remote_session_in_week: DataTypes.INTEGER ,
      mergeId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "ModuleRemoteSession",
      timestamps: true
    }
  );

  ModuleRemoteSession.associate = (models) => {
    ModuleRemoteSession.belongsTo(models.Formateur, {
      foreignKey: "formateurId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    ModuleRemoteSession.belongsTo(models.Module, {
      foreignKey: "moduleId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    ModuleRemoteSession.belongsTo(models.Merge, {
      foreignKey: "mergeId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };
  return ModuleRemoteSession;
};
