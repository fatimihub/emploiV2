'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Branch extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Branch.init({
    code_branch: {
      type : DataTypes.STRING , 
      allowNull:false ,
      unique : true
    },
    label:{
      type : DataTypes.STRING , 
      allowNull:false 
    },
  }, {
    sequelize,
    modelName: 'Branch',
    tableName : 'branches',
    timestamps: true
  });

  Branch.associate = (models) => {
    Branch.hasMany(models.Group , { foreignKey : 'branchId' } )
    Branch.belongsToMany(models.Module , {through  : models.BranchModule , as : 'modules'})
 }
  return Branch;
};