'use strict';
module.exports = (sequelize, DataTypes) => {
  const Transaction = sequelize.define('Transaction', {
    transactionId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    itemId: {
      type: DataTypes.STRING,
      references: {
        model: 'Item',
        key: 'itemId'
      }
    },
    stock: DataTypes.INTEGER,
    userId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'User',
        key: 'userId'
      }
    },
    clerkId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'User',
        key: 'userId'
      }
    }
  }, {
    tableName: 'Transaction',
    freezeTableName: true
  });

  Transaction.associate = function(models) {
    Transaction.belongsTo(models.Item, { foreignKey: 'itemId' });
    Transaction.belongsTo(models.User, { as: 'user', foreignKey: 'userId' });
    Transaction.belongsTo(models.User, { as: 'clerk', foreignKey: 'clerkId' });
  };

  return Transaction;
};
