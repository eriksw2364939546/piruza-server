import express from 'express';
import authController from '../controllers/auth.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import permissionsMiddleware from '../middlewares/permissions.middleware.js';
import validationMiddleware from '../middlewares/validation.middleware.js';
import authValidator from '../validators/auth.validator.js';

const router = express.Router();

// POST /api/auth/register - Регистрация Admin/Manager (только Owner)
router.post(
    '/register',
    authMiddleware.protectAdmin,
    permissionsMiddleware.ownerOnly,
    validationMiddleware.validate(authValidator.registerAdminSchema),
    authController.registerAdmin
);

// POST /api/auth/login - Вход в систему
router.post(
    '/login',
    validationMiddleware.validate(authValidator.loginSchema),
    authController.login
);

// GET /api/auth/profile - Получить профиль текущего пользователя
router.get(
    '/profile',
    authMiddleware.protectAdmin,
    authController.getProfile
);

// PUT /api/auth/profile - Обновить свой профиль
router.put(
    '/profile',
    authMiddleware.protectAdmin,
    validationMiddleware.validate(authValidator.updateOwnProfileSchema),
    authController.updateOwnProfile
);

// PUT /api/auth/users/:id - Обновить профиль другого пользователя (Owner only)
router.put(
    '/users/:id',
    authMiddleware.protectAdmin,
    permissionsMiddleware.ownerOnly,
    validationMiddleware.validate(authValidator.updateUserSchema),
    authController.updateUserProfile
);

// DELETE /api/auth/users/:id - Удалить пользователя (Owner only)
router.delete(
    '/users/:id',
    authMiddleware.protectAdmin,
    permissionsMiddleware.ownerOnly,
    authController.deleteUser
);

export default router;