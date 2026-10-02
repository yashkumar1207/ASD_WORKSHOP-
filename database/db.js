const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'db.json');

async function readProducts() {
  const content = await fs.promises.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

async function saveProducts(products) {
  await fs.promises.writeFile(filePath, JSON.stringify(products, null, 2), 'utf-8');
}

async function readProductsWithSimulatedDelay() {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return readProducts();
}

module.exports = {
  readProducts,
  saveProducts,
  readProductsWithSimulatedDelay,
};
