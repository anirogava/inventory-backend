"use strict";

const faker = require("@faker-js/faker").faker;
module.exports = {
  up: async (queryInterface, Sequelize) => {
    let inventory = [];
    for (let i = 0; i < 50; i++) {
      inventory.push({
        price: faker.datatype.number(),
        name: faker.random.words(2),
        address: faker.random.arrayElement(["ccm", "cav", "cep", "cag"]),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });
    }
    await queryInterface.bulkInsert("inventory", inventory, {});
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     *
     */
    await queryInterface.bulkDelete("inventory", null, {});
  },
};
