import express from 'express';
import cityController from '../controllers/city.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import permissionsMiddleware from '../middlewares/permissions.middleware.js';
import validationMiddleware from '../middlewares/validation.middleware.js';
import cityValidator from '../validators/city.validator.js';

const router = express.Router();

// GET /api/cities - Получить все города (Owner only - включая неактивные)
router.get(
    '/',
    authMiddleware.protectAdmin,
    permissionsMiddleware.ownerOnly,
    cityController.getAllCities
);

// GET /api/cities/active - Получить только активные города (публично)
router.get(
    '/active',
    cityController.getActiveCities
);

// GET /api/cities/slug/:slug - Получить город по slug (публично - только активные)
router.get(
    '/slug/:slug',
    cityController.getCityBySlug
);

// GET /api/cities/admin/slug/:slug - Получить город по slug (Owner - включая неактивные)
router.get(
    '/admin/slug/:slug',
    authMiddleware.protectAdmin,
    permissionsMiddleware.ownerOnly,
    cityController.getCityBySlugAdmin
);

// POST /api/cities - Создать город (Owner only)
router.post(
    '/',
    authMiddleware.protectAdmin,
    permissionsMiddleware.ownerOnly,
    validationMiddleware.validate(cityValidator.createCitySchema),
    cityController.createCity
);

// PUT /api/cities/:id - Обновить город (Owner only)
router.put(
    '/:id',
    authMiddleware.protectAdmin,
    permissionsMiddleware.ownerOnly,
    validationMiddleware.validate(cityValidator.updateCitySchema),
    cityController.updateCity
);

// PATCH /api/cities/:id/toggle - Переключить статус (Owner only)
router.patch(
    '/:id/toggle',
    authMiddleware.protectAdmin,
    permissionsMiddleware.ownerOnly,
    cityController.toggleStatus
);

export default router;