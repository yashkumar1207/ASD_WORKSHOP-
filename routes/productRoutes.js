const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { cacheMiddleware, invalidateCacheMiddleware } = require('../middleware/cacheMiddleware');

router.get('/', cacheMiddleware, productController.listProducts);
router.get('/:id', cacheMiddleware, productController.getProductById);

router.post('/', invalidateCacheMiddleware, productController.createProduct);
router.put('/:id', invalidateCacheMiddleware, productController.updateProduct);
router.patch('/:id', invalidateCacheMiddleware, productController.patchProduct);
router.delete('/:id', invalidateCacheMiddleware, productController.deleteProduct);

module.exports = router;
