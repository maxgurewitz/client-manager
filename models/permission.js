'use strict';
module.exports = (sequelize, DataTypes) => {
  var Permission = sequelize.define('Permission', {
    userId: DataTypes.NUMBER,
    projectId: DataTypes.NUMBER
  }, {});
  Permission.associate = function(models) {
    // associations can be defined here
  };
  Permission.removeAttribute('id');
  return Permission;
};
