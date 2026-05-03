'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Merge extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Merge.init({
    groups:{ 
      type : DataTypes.STRING ,
      allowNull : false , 
      unique : true
    }, 
    // timetable : {
    //   type : DataTypes.JSON
    // }
  }, {
    sequelize,
    modelName: 'Merge',
    tableName : 'merges',
    timestamps: true
  });
   Merge.associate = (models) => {
    Merge.belongsToMany(models.Group , { through : 'GroupMerges'})
    Merge.hasMany( models.ModuleRemoteSession )
   }
  return Merge;
};