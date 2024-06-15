'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add roleId
    await queryInterface.addColumn('User', 'roleId', {
      type: Sequelize.INTEGER,
      references: {
        model: 'Role', // Use plural form
        key: 'roleId'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // Add cafeId
    await queryInterface.addColumn('User', 'cafeId', {
      type: Sequelize.INTEGER,
      references: {
        model: 'Cafe', // Use plural form
        key: 'cafeId'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    await queryInterface.addColumn('User', 'createdAt', {
      type: Sequelize.DATE,
      allowNull: false,
    });

    // Add cafeId
    await queryInterface.addColumn('User', 'updatedAt', {
      type: Sequelize.DATE,
      allowNull: false,
    });
  },
  down: async (queryInterface, Sequelize) => {
    // No need to remove the columns here, since they were not added by this migration
  }
};
