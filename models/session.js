'use strict';
module.exports = (sequelize, DataTypes) => {
  var Session = sequelize.define('Session', {
    userId: DataTypes.STRING,
    expiration: DataTypes.DATE,
    uuid: DataTypes.STRING
  });
  Session.associate = function(models) {
    // associations can be defined here
  };
  Session.removeAttribute('id');
  return Session;
};
