"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Module extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Module.init(
    {
      code_module: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      label: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      is_regionnal: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      mhp_s1: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      mhsyn_s1: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      mhp_s2: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      mhsyn_s2: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      color : {
        type : DataTypes.STRING
      }
    },
    {
      sequelize,
      modelName: "Module",
      // tableName : "modules" ,
      // indexes : [
      //   {
      //     unique : true ,
      //     fields : ['code_module' , 'label'] ,
      //     name : 'unique_code_module_and_label'
      //   }
      // ]
    }
  );

  Module.associate = (models) => {
    Module.hasMany(models.GroupModuleFormateur, { foreignKey: "moduleId" });
    Module.belongsToMany(models.Branch, { through: models.BranchModule });
    Module.hasMany(models.Session);
    Module.hasMany(models.ModuleRemoteSession);
    Module.belongsToMany(models.Merge, { through: "ModuleMerges" });
  };

  // Module.sync({alter : true})

  return Module;
};
