import { Router } from 'express';
import productController from '../controllers/product.controller.mjs';
import { authMiddleware } from '../middleware/auth.middleware.mjs';
import { requirePermission } from '../middleware/permission.middleware.mjs';
import { validate } from '../middleware/validate.middleware.mjs';
import {
  createProductSchema,
  updateProductSchema
} from '../validators/product.validator.mjs';

const router = Router();

router.use(authMiddleware);

// Catalog inspection
router.get('/', requirePermission('inventory.view'), productController.getProducts);
router.get('/barcode/:barcode', requirePermission('inventory.view'), productController.getProductByBarcode);
router.get('/low-stock', requirePermission('inventory.view'), productController.getLowStockProducts);
router.get('/:id/barcode', requirePermission('inventory.view'), productController.getProductBarcodeImage);
router.get('/:id', requirePermission('inventory.view'), productController.getProductById);

// Creation, Modification, Deletion
router.post(
  '/',
  requirePermission('inventory.create'),
  validate(createProductSchema),
  productController.createProduct
);
router.patch(
  '/:id',
  requirePermission('inventory.edit'),
  validate(updateProductSchema),
  productController.updateProduct
);
router.delete(
  '/:id',
  requirePermission('inventory.delete'),
  productController.deleteProduct
);

export default router;
