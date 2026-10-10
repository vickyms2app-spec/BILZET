import { Router } from 'express';
import staffController from '../controllers/staff.controller.mjs';
import { authMiddleware } from '../middleware/auth.middleware.mjs';
import { requirePermission, requireAnyPermission } from '../middleware/permission.middleware.mjs';

const router = Router();

router.use(authMiddleware);

// ─── SELF ATTENDANCE (STAFF CLOCK) ───
router.get('/attendance/me', requirePermission('attendance.view_self'), staffController.getMyAttendanceToday);
router.get('/attendance/history', requirePermission('attendance.view_self'), staffController.getMyAttendanceHistory);
router.post('/attendance/check-in', requirePermission('attendance.check_in'), staffController.checkInSelf);
router.post('/attendance/check-out', requirePermission('attendance.check_out'), staffController.checkOutSelf);

// ─── ATTENDANCE SUPERVISION (ADMIN / HR) ───
router.get('/attendance', requireAnyPermission('attendance.view_all', 'staff.attendance'), staffController.getAttendanceList);
router.post('/attendance', requireAnyPermission('attendance.manage', 'staff.attendance'), staffController.markAttendance);
router.patch('/attendance/:id', requireAnyPermission('attendance.manage', 'staff.attendance'), staffController.updateAttendance);
router.delete('/attendance/:id', requireAnyPermission('attendance.manage', 'staff.attendance'), staffController.deleteAttendance);

// ─── STAFF DIRECTORY ───
router.get('/', requireAnyPermission('staff.view', 'team.view'), staffController.getStaffList);
router.post('/', requirePermission('staff.create'), staffController.createStaff);
router.patch('/:id', requirePermission('staff.edit'), staffController.updateStaff);
router.delete('/:id', requirePermission('staff.delete'), staffController.deleteStaff);

// ─── PAYROLL ───
router.post('/payroll', requirePermission('staff.payroll'), staffController.generatePayroll);
router.get('/payroll', requirePermission('staff.payroll'), staffController.getPayrollHistory);

export default router;
