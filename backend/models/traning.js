'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Traning extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Traning.init({
    groupId: DataTypes.INTEGER,
    date_start: DataTypes.DATE,
    date_fin: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'Traning',
    timestamps: true
  });
  Traning.associate = (models) => {
     Traning.belongsTo(models.Group , { foreignKey : 'groupId' , as : 'group',  onDelete : 'CASCADE' , onUpdate : 'CASCADE' })
  }
  return Traning;
};