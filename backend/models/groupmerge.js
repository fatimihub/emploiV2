'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class GroupMerge extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  GroupMerge.init({
    groupId:{ 
       type : DataTypes.INTEGER , 
       allowNull : false 
      },
    mergeId:{ 
        type : DataTypes.INTEGER , 
        allowNull : false
     }
  }, {
    sequelize,
    modelName: 'GroupMerge',
    tableName : 'groupmerges' ,
    timestamps: true,
    indexes : [
      {
        fields : ['groupId' , 'mergeId'] ,
        unique : true , 
        
      }
    ]

  });

  return GroupMerge;
};