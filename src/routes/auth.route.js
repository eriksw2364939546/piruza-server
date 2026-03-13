import express from 'express';
import authController from '../controllers/auth.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import permissionsMiddleware from '../middlewares/permissions.middleware.js';
import validationMiddleware from '../middlewares/validation.middleware.js';
import authValidator from '../validators/auth.validator.js';
import { authLimiter, registerLimiter } from '../middlewares/ratelimit.middleware.js';

const router = express.Router();

// POST /api/auth/register - Регистрация Admin/Manager (только Owner)
router.post(
    '/register',
    authMiddleware.protectAdmin,
    permissionsMiddleware.ownerOnly,
    registerLimiter,  // ← ДОБАВЛЕНО
    validationMiddleware.validate(authValidator.registerAdminSchema),
    authController.registerAdmin
);

// POST /api/auth/login - Вход в систему
router.post(
    '/login',
    authLimiter,  // ← ДОБАВЛЕНО
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
//GET / api / auth / users - Список(БЕЗ параметра)
router.get(
    '/users',
    authMiddleware.protectAdmin,
    authController.getAllUsers
);
// GET /api/auth/users/:id - Пользователь по ID (Owner/Admin)
router.get(
    '/users/:id',
    authMiddleware.protectAdmin,
    authController.getUserById
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