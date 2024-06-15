'use strict';
module.exports = (sequelize, DataTypes) => {
  const Session = sequelize.define('Session', {
    sessionId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'User',
        key: 'userId'
      }
    },
    token: DataTypes.STRING,
    isValid: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'Session',
    freezeTableName: true
  });

  Session.associate = function(models) {
    Session.belongsTo(models.User, { foreignKey: 'userId' });
  };

  return Session;
};
