'use strict';
module.exports = (sequelize, DataTypes) => {
  const Role = sequelize.define('Role', {
    roleId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: DataTypes.STRING
  }, {
    tableName: 'Role',
    freezeTableName: true
  });

  Role.associate = function(models) {
    // associations can be defined here
  };

  return Role;
};
