'use strict';
module.exports = (sequelize, DataTypes) => {
  const Item = sequelize.define('Item', {
    itemId: {
      type: DataTypes.STRING,
      primaryKey: true
    },
    stock: DataTypes.INTEGER,
    cafeId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Cafe',
        key: 'cafeId'
      }
    }
  }, {
    tableName: 'Item',
    freezeTableName: true
  });

  Item.associate = function(models) {
    Item.belongsTo(models.Cafe, { foreignKey: 'cafeId' });
    Item.hasMany(models.Transaction, { foreignKey: 'itemId' });
  };

  return Item;
};
