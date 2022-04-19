"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    queryInterface.addColumn("inventory", "userId", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
  async down(queryInterface, Sequelize) {
    queryInterface.removeColumn("inventoy", "userId", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
};
