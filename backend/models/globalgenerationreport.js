const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class GlobalGenerationReport extends Model {}
  GlobalGenerationReport.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    reportText: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    totalGroups: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    successCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    failCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    sequelize,
    modelName: 'GlobalGenerationReport',
    tableName: 'GlobalGenerationReports',
  });
  return GlobalGenerationReport;
}; 