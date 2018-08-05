'use strict';
const replaceEnum = require('sequelize-replace-enum-postgres').default;

module.exports = {
  up: (queryInterface, Sequelize) => {
    return replaceEnum({
      queryInterface,
      tableName: 'Permissions',
      columnName: 'level',
      defaultValue: '2',
      newValues: ['0', '1', '2'],
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('Permissions', {
      where: {
        level: '2'
      }
    });

    return replaceEnum({
      queryInterface,
      tableName: 'Permissions',
      columnName: 'level',
      newValues: ['0', '1'],
    });
  }
};
