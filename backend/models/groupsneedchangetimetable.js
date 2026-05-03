'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class GroupsNeedChangeTimetable extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  GroupsNeedChangeTimetable.init({
    groupId: {
      type : DataTypes.INTEGER , 
      unique : true
    }
  }, {
    sequelize,
    modelName: 'GroupsNeedChangeTimetable',
    timestamps: true
  });

  GroupsNeedChangeTimetable.associate = (models) => {
    GroupsNeedChangeTimetable.belongsTo(models.Group , { foreignKey : 'groupId' })
  }

  return GroupsNeedChangeTimetable;
};