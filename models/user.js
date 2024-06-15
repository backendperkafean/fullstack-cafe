'use strict';

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    userId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    cafeId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Cafe',
        key: 'cafeId'
      }
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Role',
        key: 'roleId'
      }
    },
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      allowNull: false,
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'User',
    freezeTableName: true
  });

  User.associate = function(models) {
    User.belongsTo(models.Cafe, { foreignKey: 'cafeId' });
    User.belongsTo(models.Role, { foreignKey: 'roleId' });
    User.hasMany(models.Session, { foreignKey: 'userId' });
    User.hasMany(models.Transaction, { as: 'user', foreignKey: 'userId' });
    User.hasMany(models.Transaction, { as: 'clerk', foreignKey: 'clerkId' });
  };

  return User;
};
