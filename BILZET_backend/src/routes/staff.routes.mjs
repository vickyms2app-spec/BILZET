import { Router } from 'express';
import staffController from '../controllers/staff.controller.mjs';
import { authMiddleware } from '../middleware/auth.middleware.mjs';

const router = Router();

router.use(authMiddleware);

// Staff Directory
router.get('/', staffController.getStaffList);
router.post('/', staffController.createStaff);
router.patch('/:id', staffController.updateStaff);
router.delete('/:id', staffController.deleteStaff);

// Attendance
router.post('/attendance', staffController.markAttendance);
router.get('/attendance', staffController.getAttendanceList);

// Payroll
router.post('/payroll', staffController.generatePayroll);
router.get('/payroll', staffController.getPayrollHistory);

export default router;
