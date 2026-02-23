import express from 'express';
import cityController from '../controllers/city.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import permissionsMiddleware from '../middlewares/permissions.middleware.js';
import validationMiddleware from '../middlewares/validation.middleware.js';
import cityValidator from '../validators/city.validator.js';

const router = express.Router();

// GET /api/cities - Получить все города
router.get(
    '/',
    cityController.getAllCities
);

// GET /api/cities/active - Получить только активные города
router.get(
    '/active',
    cityController.getActiveCities
);

// GET /api/cities/slug/:slug - Получить город по slug
router.get(
    '/slug/:slug',
    cityController.getCityBySlug
);

// POST /api/cities - Создать город (Owner/Admin)
router.post(
    '/',
    authMiddleware.protectAdmin,
    permissionsMiddleware.adminAccess,
    validationMiddleware.validate(cityValidator.createCitySchema),
    cityController.createCity
);

// PUT /api/cities/:id - Обновить город (Owner/Admin)
router.put(
    '/:id',
    authMiddleware.protectAdmin,
    permissionsMiddleware.adminAccess,
    validationMiddleware.validate(cityValidator.updateCitySchema),
    cityController.updateCity
);

// PATCH /api/cities/:id/toggle - Переключить статус (Owner/Admin)
router.patch(
    '/:id/toggle',
    authMiddleware.protectAdmin,
    permissionsMiddleware.adminAccess,
    cityController.toggleStatus
);

export default router;