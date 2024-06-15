'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Transaction', {
      transactionId: {
        type: Sequelize.STRING,
        primaryKey: true,
        allowNull: false
      },
      itemId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: 'Item',
          key: 'itemId'
        }
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Transaction');
  }
};
