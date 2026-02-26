import express from 'express';
import sellerController from '../controllers/seller.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import permissionsMiddleware from '../middlewares/permissions.middleware.js';
import validationMiddleware from '../middlewares/validation.middleware.js';
import sellerValidator from '../validators/seller.validator.js';
import uploadPhoto from '../utils/imageupload.util.js';

const router = express.Router();

// ========== ПУБЛИЧНЫЕ РОУТЫ ==========

// GET /api/sellers/public/city/:cityId - Получить публичных продавцов по городу
router.get(
    '/public/city/:cityId',
    sellerController.getPublicSellers
);

// GET /api/sellers/slug/:slug - Получить продавца по slug
router.get(
    '/slug/:slug',
    sellerController.getSellerBySlug
);

// ========== ADMIN РОУТЫ ==========

// GET /api/sellers - Получить всех продавцов (Owner/Admin все, Manager свои)
router.get(
    '/',
    authMiddleware.protectAdmin,
    permissionsMiddleware.managerAccess,
    sellerController.getAllSellers
);

// GET /api/sellers/manager/:managerId - Получить продавцов Manager'а (Owner/Admin)
router.get(
    '/manager/:managerId',
    authMiddleware.protectAdmin,
    permissionsMiddleware.adminAccess,
    sellerController.getSellersByManager
);

// GET /api/sellers/:id - Получить продавца по ID
router.get(
    '/:id',
    authMiddleware.protectAdmin,
    permissionsMiddleware.managerAccess,
    sellerController.getSellerById
);

// POST /api/sellers - Создать продавца (после одобрения заявки)
router.post(
    '/',
    authMiddleware.protectAdmin,
    permissionsMiddleware.managerAccess,
    permissionsMiddleware.checkApprovedRequest, // НОВОЕ: Проверка одобренной заявки для Manager
    validationMiddleware.validate(sellerValidator.createSellerSchema),
    sellerController.createSeller
);

// PUT /api/sellers/:id - Обновить продавца
router.put(
    '/:id',
    authMiddleware.protectAdmin,
    permissionsMiddleware.managerAccess,
    permissionsMiddleware.checkSellerOwnership,
    validationMiddleware.validate(sellerValidator.updateSellerSchema),
    sellerController.updateSeller
);

// PATCH /api/sellers/:id/categories - Обновить глобальные категории
router.patch(
    '/:id/categories',
    authMiddleware.protectAdmin,
    permissionsMiddleware.managerAccess,
    permissionsMiddleware.checkSellerOwnership,
    validationMiddleware.validate(sellerValidator.updateGlobalCategoriesSchema),
    sellerController.updateSellerGlobalCategories
);

// ========== ЗАГРУЗКА ИЗОБРАЖЕНИЙ ==========

// POST /api/sellers/:id/images?type=logo - Загрузить logo
// POST /api/sellers/:id/images?type=cover - Загрузить coverImage
router.post(
    '/:id/images',
    authMiddleware.protectAdmin,
    permissionsMiddleware.managerAccess,
    permissionsMiddleware.checkSellerOwnership,
    uploadPhoto.single('image', 'sellers').parse,
    uploadPhoto.single('image', 'sellers').process,
    sellerController.uploadSellerImages
);

// ========== УПРАВЛЕНИЕ СТАТУСАМИ (Owner/Admin) ==========

// POST /api/sellers/:id/activate - Активировать продавца
router.post(
    '/:id/activate',
    authMiddleware.protectAdmin,
    permissionsMiddleware.adminAccess,
    validationMiddleware.validate(sellerValidator.activateSellerSchema),
    sellerController.activateSeller
);

// POST /api/sellers/:id/extend - Продлить продавца
router.post(
    '/:id/extend',
    authMiddleware.protectAdmin,
    permissionsMiddleware.adminAccess,
    validationMiddleware.validate(sellerValidator.activateSellerSchema),
    sellerController.extendSeller
);

// POST /api/sellers/:id/deactivate - Деактивировать продавца
router.post(
    '/:id/deactivate',
    authMiddleware.protectAdmin,
    permissionsMiddleware.adminAccess,
    sellerController.deactivateSeller
);

// POST /api/sellers/:id/draft - Перевести в draft
router.post(
    '/:id/draft',
    authMiddleware.protectAdmin,
    permissionsMiddleware.managerAccess,
    permissionsMiddleware.checkSellerOwnership,
    sellerController.moveToDraft
);

// DELETE /api/sellers/:id - Удалить продавца и его локальные категории
// Owner/Admin: любых продавцов
// Manager: только своих продавцов
router.delete(
    '/:id',
    authMiddleware.protectAdmin,
    permissionsMiddleware.managerAccess,
    permissionsMiddleware.checkSellerOwnership,
    sellerController.deleteSeller
);

export default router;