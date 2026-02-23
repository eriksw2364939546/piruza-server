import express from 'express';
import sellerRequestController from '../controllers/sellerrequest.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import permissionsMiddleware from '../middlewares/permissions.middleware.js';
import validationMiddleware from '../middlewares/validation.middleware.js';
import sellerRequestValidator from '../validators/sellerrequest.validator.js';

const router = express.Router();

// ========== MANAGER РОУТЫ ==========

// POST /api/requests - Создать заявку (Manager)
router.post(
    '/',
    authMiddleware.protectAdmin,
    permissionsMiddleware.managerAccess,
    validationMiddleware.validate(sellerRequestValidator.createRequestSchema),
    sellerRequestController.createRequest
);

// GET /api/requests/my - Получить свои заявки (Manager)
router.get(
    '/my',
    authMiddleware.protectAdmin,
    permissionsMiddleware.managerAccess,
    sellerRequestController.getMyRequests
);

// ========== OWNER/ADMIN РОУТЫ ==========

// GET /api/requests - Получить все заявки (Owner/Admin)
router.get(
    '/',
    authMiddleware.protectAdmin,
    permissionsMiddleware.adminAccess,
    sellerRequestController.getAllRequests
);

// GET /api/requests/:id - Получить заявку по ID
router.get(
    '/:id',
    authMiddleware.protectAdmin,
    permissionsMiddleware.managerAccess,
    sellerRequestController.getRequestById
);

// POST /api/requests/:id/approve - Одобрить заявку (Owner/Admin)
router.post(
    '/:id/approve',
    authMiddleware.protectAdmin,
    permissionsMiddleware.adminAccess,
    sellerRequestController.approveRequest
);

// POST /api/requests/:id/reject - Отклонить заявку (Owner/Admin)
router.post(
    '/:id/reject',
    authMiddleware.protectAdmin,
    permissionsMiddleware.adminAccess,
    validationMiddleware.validate(sellerRequestValidator.rejectRequestSchema),
    sellerRequestController.rejectRequest
);

export default router;