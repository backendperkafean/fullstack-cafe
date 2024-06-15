'use strict';
module.exports = (sequelize, DataTypes) => {
  const Cafe = sequelize.define('Cafe', {
    cafeId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    ownerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'User',
        key: 'userId'
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
    tableName: 'Cafe',
    freezeTableName: true
  });

  Cafe.associate = function(models) {
    Cafe.belongsTo(models.User, { foreignKey: 'ownerId' });
    Cafe.hasMany(models.Item, { foreignKey: 'cafeId' });
    Cafe.hasMany(models.User, { foreignKey: 'cafeId' });
  };

  return Cafe;
};
