"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class GroupModuleFormateur extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  GroupModuleFormateur.init(
    {
      groupId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      moduleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      formateurId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      nbr_hours_presential_in_week: {
        type: DataTypes.STRING,
        defaultValue: 0,
      },
      nbr_hours_remote_in_week: {
        type: DataTypes.STRING,
        defaultValue: 0,
      },
      mhp_realise: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      mhsyn_realise: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      nbr_cc: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      validate_efm: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
      is_started: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: "GroupModuleFormateur",
      tableName: "GroupModuleFormateurs",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["groupId", "moduleId"],
          name: "unique_group_module",
        },
      ],
    }
  );

  GroupModuleFormateur.associate = (models) => {
    GroupModuleFormateur.belongsTo(models.Formateur, {
      foreignKey: "formateurId",
      as: "formateur",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    GroupModuleFormateur.belongsTo(models.Module, {
      foreignKey: "moduleId",
      as: "module",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    GroupModuleFormateur.belongsTo(models.Group, {
      foreignKey: "groupId",
      as: "group",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  // GroupModuleFormateur.sync({ force: true });
  return GroupModuleFormateur;
};
