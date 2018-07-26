'use strict';
module.exports = (sequelize, DataTypes) => {
  var Permission = sequelize.define('Permission', {
    level: DataTypes.ENUM(0, 1, 2),
    userId: DataTypes.INTEGER,
    projectId: DataTypes.INTEGER
  }, {});
  Permission.associate = function(models) {
    // associations can be defined here
  };
  Permission.removeAttribute('id');
  return Permission;
};
