'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Permissions', {
      level: {
        allowNull: false,
        type: Sequelize.ENUM(0, 1)
      },
      userId: {
        unique: 'permissionCombination',
        allowNull: false,
        type: Sequelize.INTEGER,
        references: {
          model: 'Users',
          key: 'id',
          deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE
        }
      },
      projectId: {
        unique: 'permissionCombination',
        allowNull: false,
        type: Sequelize.INTEGER,
        references: {
          model: 'Projects',
          key: 'id',
          deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE
        }
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
    return queryInterface.dropTable('Permissions');
  }
};
