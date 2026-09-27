import { Router } from 'express';
import productController from '../controllers/product.controller.mjs';
import { authMiddleware } from '../middleware/auth.middleware.mjs';
import { authorizeRoles } from '../middleware/role.middleware.mjs';
import { validate } from '../middleware/validate.middleware.mjs';
import {
  createProductSchema,
  updateProductSchema
} from '../validators/product.validator.mjs';
import { ROLES } from '../utils/constants.mjs';

const router = Router();

router.use(authMiddleware);

// Publicly readable by all authorized staff (ADMIN, MANAGER, CASHIER)
router.get('/', productController.getProducts);
router.get('/barcode/:barcode', productController.getProductByBarcode);
router.get('/low-stock', authorizeRoles(ROLES.ADMIN, ROLES.MANAGER), productController.getLowStockProducts);
router.get('/:id/barcode', productController.getProductBarcodeImage);
router.get('/:id', productController.getProductById);

// Creation, Modification, Deletion (ADMIN, MANAGER)
router.post(
  '/',
  authorizeRoles(ROLES.ADMIN, ROLES.MANAGER),
  validate(createProductSchema),
  productController.createProduct
);
router.patch(
  '/:id',
  authorizeRoles(ROLES.ADMIN, ROLES.MANAGER),
  validate(updateProductSchema),
  productController.updateProduct
);
router.delete(
  '/:id',
  authorizeRoles(ROLES.ADMIN, ROLES.MANAGER),
  productController.deleteProduct
);

export default router;
