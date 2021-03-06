'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Sessions', {
      userId: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: {
          model: 'Users',
          key: 'id',
          deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE
        }
      },
      expiration: {
        allowNull: false,
        type: Sequelize.DATE
      },
      uuid: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.STRING
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
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('Sessions');
  }
};
