import { Router } from 'express';
import expenseController from '../controllers/expense.controller.mjs';
import { authMiddleware } from '../middleware/auth.middleware.mjs';
import { authorizeRoles } from '../middleware/role.middleware.mjs';
import { validate } from '../middleware/validate.middleware.mjs';
import {
  createExpenseSchema,
  updateExpenseSchema
} from '../validators/expense.validator.mjs';
import { ROLES } from '../utils/constants.mjs';

const router = Router();

router.use(authMiddleware);
router.use(authorizeRoles(ROLES.ADMIN, ROLES.MANAGER));

router.get('/', expenseController.getExpenses);
router.post('/', validate(createExpenseSchema), expenseController.createExpense);
router.get('/:id', expenseController.getExpenseById);
router.patch('/:id', validate(updateExpenseSchema), expenseController.updateExpense);
router.delete('/:id', authorizeRoles(ROLES.ADMIN), expenseController.deleteExpense);

export default router;
