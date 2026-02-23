import express from 'express';
import dashboardController from '../controllers/dashboard.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import permissionsMiddleware from '../middlewares/permissions.middleware.js';

const router = express.Router();

// GET /api/dashboard/overview - Общая статистика
// Owner/Admin: вся система
// Manager: только свои показатели
router.get(
    '/overview',
    authMiddleware.protectAdmin,
    permissionsMiddleware.managerAccess,
    dashboardController.getOverview
);

// GET /api/dashboard/managers - Статистика по всем Manager'ам (Owner/Admin)
router.get(
    '/managers',
    authMiddleware.protectAdmin,
    permissionsMiddleware.adminAccess,
    dashboardController.getManagersStats
);

// GET /api/dashboard/sellers-by-status - Продавцы по статусам
// Owner/Admin: все продавцы
// Manager: только свои
router.get(
    '/sellers-by-status',
    authMiddleware.protectAdmin,
    permissionsMiddleware.managerAccess,
    dashboardController.getSellersByStatus
);

export default router;