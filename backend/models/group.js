"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Group extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Group.init(
    {
      code_group: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      effective: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      year_of_formation: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      branchId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      niveau : {
        type : DataTypes.STRING ,
        allowNull: false
      },
      academic_year: {
        type: DataTypes.STRING,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "Group",
      tableName: "groups",
      timestamps: true
    }
  );
  Group.associate = (models) => {
    Group.belongsTo(models.Branch, {
      foreignKey: "branchId",
      as: "branch",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    Group.hasMany(models.Timetable);
    Group.hasMany(models.Session);
    Group.hasMany(models.GroupModuleFormateur, { foreignKey: "groupId" });
    Group.belongsToMany(models.Merge, { through: "GroupMerges" });
    Group.hasMany(models.Traning);
  };

  return Group;
};
