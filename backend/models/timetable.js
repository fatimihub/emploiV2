'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Timetable extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Timetable.init({
    groupId:{ 
      type : DataTypes.INTEGER , 
      allowNull:false
    },
    valid_form:{
      type : DataTypes.DATE , 
      allowNull:false 
    },
    status : {
      type : DataTypes.ENUM('active', 'archived'), 
      defaultValue : 'archived'
    },
    nbr_hours_in_week : {
      type : DataTypes.STRING ,
      defaultValue : 0
    }
  }, {
    sequelize,
    modelName: 'Timetable',
    tableName: 'timetables',
    timestamps: true
  });
  Timetable.associate = (models) => {
    Timetable.belongsTo(models.Group , { foreignKey : "groupId" , as : "group", onDelete:"CASCADE" , onUpdate : "CASCADE"})
    Timetable.hasMany(models.Session )

  }
 
  return Timetable;
};