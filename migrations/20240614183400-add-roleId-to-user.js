'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add roleId column to User table with a default value
    await queryInterface.addColumn('User', 'roleId', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0, // Replace with your default roleId value
      references: {
        model: 'Role',
        key: 'roleId'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    // Update existing rows to set a default roleId value
    await queryInterface.sequelize.query(
      'UPDATE "User" SET "roleId" = :defaultRoleId WHERE "roleId" IS NULL',
      {
        replacements: { defaultRoleId: 0 }, // Replace with your default roleId value
        type: Sequelize.QueryTypes.UPDATE
      }
    );
  },

  down: async (queryInterface, Sequelize) => {
    // Remove roleId column from User table
    await queryInterface.removeColumn('User', 'roleId');
  }
};
