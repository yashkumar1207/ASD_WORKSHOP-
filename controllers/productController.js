const productService = require('../services/productService');

async function listProducts(req, res, next) {
  try {
    const products = await productService.listProducts();
    return res.status(200).json(products);
  } catch (error) {
    next(error);
  }
}

async function getProductById(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const product = await productService.findProductById(id);
    if (!product) {
      return res.status(404).json({ error: `Product with ID ${id} not found` });
    }

    return res.status(200).json(product);
  } catch (error) {
    next(error);
  }
}

async function createProduct(req, res, next) {
  try {
    const { name, price } = req.body;
    if (!name || price === undefined || isNaN(Number(price))) {
      return res.status(400).json({ error: 'Valid product name and price are required' });
    }

    const createdProduct = await productService.createProduct({ name, price });
    return res.status(201).json(createdProduct);
  } catch (error) {
    next(error);
  }
}

async function updateProduct(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const { name, price } = req.body;
    if (!name || price === undefined || isNaN(Number(price))) {
      return res.status(400).json({ error: 'Valid product name and price are required' });
    }

    const updatedProduct = await productService.updateProduct(id, { name, price });
    if (!updatedProduct) {
      return res.status(404).json({ error: `Product with ID ${id} not found` });
    }

    return res.status(200).json(updatedProduct);
  } catch (error) {
    next(error);
  }
}

async function patchProduct(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    if (req.body.price !== undefined && isNaN(Number(req.body.price))) {
      return res.status(400).json({ error: 'Price must be a valid number' });
    }

    const updatedProduct = await productService.patchProduct(id, req.body);
    if (!updatedProduct) {
      return res.status(404).json({ error: `Product with ID ${id} not found` });
    }

    return res.status(200).json(updatedProduct);
  } catch (error) {
    next(error);
  }
}

async function deleteProduct(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const deletedProduct = await productService.deleteProduct(id);
    if (!deletedProduct) {
      return res.status(404).json({ error: `Product with ID ${id} not found` });
    }

    return res.status(200).json({
      message: `Product with ID ${id} deleted successfully`,
      product: deletedProduct,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  patchProduct,
  deleteProduct,
};
