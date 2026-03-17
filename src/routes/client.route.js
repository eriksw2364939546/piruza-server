import express from 'express';
import clientController from '../controllers/client.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import permissionsMiddleware from '../middlewares/permissions.middleware.js';
import validationMiddleware from '../middlewares/validation.middleware.js';
import clientValidator from '../validators/client.validator.js';

const router = express.Router();

// ========== ПУБЛИЧНЫЕ РОУТЫ ==========

// POST /api/clients/google-login
router.post(
    '/google-login',
    validationMiddleware.validate(clientValidator.googleLoginSchema),
    clientController.googleLogin
);

// ========== КЛИЕНТСКИЕ РОУТЫ ==========

// GET /api/clients/profile
router.get(
    '/profile',
    authMiddleware.protectClient,
    clientController.getProfile
);

// PATCH /api/clients/city
router.patch(
    '/city',
    authMiddleware.protectClient,
    validationMiddleware.validate(clientValidator.updateClientCitySchema),
    clientController.updateCity
);

// POST /api/clients/favorites/:sellerId
router.post(
    '/favorites/:sellerId',
    authMiddleware.protectClient,
    clientController.toggleFavorite
);

// GET /api/clients/favorites
router.get(
    '/favorites',
    authMiddleware.protectClient,
    clientController.getFavorites
);

// GET /api/clients/ratings
router.get(
    '/ratings',
    authMiddleware.protectClient,
    clientController.getRatings
);

// ========== OWNER ONLY РОУТЫ ==========

// GET /api/clients — список всех клиентов
router.get(
    '/',
    authMiddleware.protectAdmin,
    permissionsMiddleware.ownerOnly,
    clientController.getAllClients
);

// GET /api/clients/:id — профиль клиента
router.get(
    '/:id',
    authMiddleware.protectAdmin,
    permissionsMiddleware.ownerOnly,
    clientController.getClientById
);

// GET /api/clients/:id/ratings — оценки клиента
router.get(
    '/:id/ratings',
    authMiddleware.protectAdmin,
    permissionsMiddleware.ownerOnly,
    clientController.getClientRatings
);

// PATCH /api/clients/:id/toggle-active — блокировка
router.patch(
    '/:id/toggle-active',
    authMiddleware.protectAdmin,
    permissionsMiddleware.ownerOnly,
    clientController.toggleClientActive
);

export default router;