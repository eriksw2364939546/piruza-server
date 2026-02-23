import express from 'express';
import clientController from '../controllers/client.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import validationMiddleware from '../middlewares/validation.middleware.js';
import clientValidator from '../validators/client.validator.js';

const router = express.Router();

// POST /api/client/google-login - Google OAuth логин
router.post(
    '/google-login',
    validationMiddleware.validate(clientValidator.googleLoginSchema),
    clientController.googleLogin
);

// GET /api/client/profile - Получить профиль клиента
router.get(
    '/profile',
    authMiddleware.protectClient,
    clientController.getProfile
);

// PATCH /api/client/city - Обновить город клиента
router.patch(
    '/city',
    authMiddleware.protectClient,
    validationMiddleware.validate(clientValidator.updateClientCitySchema),
    clientController.updateCity
);

// POST /api/client/favorites/:sellerId - Добавить/удалить из избранного
router.post(
    '/favorites/:sellerId',
    authMiddleware.protectClient,
    clientController.toggleFavorite
);

// GET /api/client/favorites - Получить избранных продавцов
router.get(
    '/favorites',
    authMiddleware.protectClient,
    clientController.getFavorites
);

// GET /api/client/ratings - Получить историю оценок
router.get(
    '/ratings',
    authMiddleware.protectClient,
    clientController.getRatings
);

export default router;