import express from 'express';
import sellerController from '../controllers/seller.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import permissionsMiddleware from '../middlewares/permissions.middleware.js';
import checkImageMiddleware from '../middlewares/checkimage.middleware.js';
import statusValidationMiddleware from '../middlewares/statusvalidation.middleware.js';
import validationMiddleware from '../middlewares/validation.middleware.js';
import sellerValidator from '../validators/seller.validator.js';
import uploadPhoto from '../utils/imageupload.util.js';

const router = express.Router();

// ========== ПУБЛИЧНЫЕ РОУТЫ ==========

// GET /api/sellers/public/city/:cityId - Получить публичных продавцов по городу
// Публично: только active
// С токеном Owner/Admin/Manager: все статусы
router.get(
    '/public/city/:cityId',
    (req, res, next) => {
        console.log('🔵 ROUTE MATCHED: /public/city/:cityId');
        console.log('   cityId:', req.params.cityId);
        console.log('   Full URL:', req.originalUrl);
        console.log('   Has token?', !!req.headers.authorization);
        next();
    },
    authMiddleware.optionalAuth,
    sellerController.getPublicSellers
);

// GET /api/sellers/slug/:slug - Получить продавца по slug
// Публично: только active
// С токеном: Owner/Admin видят всех, Manager своих
router.get(
    '/slug/:slug',
    (req, res, next) => {
        console.log('🟢 ROUTE MATCHED: /slug/:slug');
        console.log('   slug:', req.params.slug);
        console.log('   Full URL:', req.originalUrl);
        next();
    },
    authMiddleware.optionalAuth,
    sellerController.getSellerBySlug
);

// GET /api/sellers/:id - Получить продавца по ID
// ВАЖНО: Этот роут должен быть ПОСЛЕ всех специфичных роутов (public, slug, manager)
// Публично: только active
// С токеном: Owner/Admin все, Manager свои + чужие active
router.get(
    '/:id',
    (req, res, next) => {
        console.log('🟡 ROUTE MATCHED: /:id');
        console.log('   id:', req.params.id);
        console.log('   Full URL:', req.originalUrl);
        next();
    },
    authMiddleware.optionalAuth,
    sellerController.getSellerById
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

// ========== ЗАГРУЗКА/ЗАМЕНА ИЗОБРАЖЕНИЙ ==========

// POST /api/sellers/:id/logo - Загрузить logo (первая загрузка)
router.post(
    '/:id/logo',
    authMiddleware.protectAdmin,
    permissionsMiddleware.managerAccess,
    permissionsMiddleware.checkSellerOwnership,
    checkImageMiddleware.checkSellerLogoNotExists, // НОВОЕ: Проверка ПЕРЕД загрузкой
    uploadPhoto.single('image', 'sellers').parse,
    uploadPhoto.single('image', 'sellers').process,
    sellerController.uploadSellerLogo
);

// PUT /api/sellers/:id/logo - Заменить logo
router.put(
    '/:id/logo',
    authMiddleware.protectAdmin,
    permissionsMiddleware.managerAccess,
    permissionsMiddleware.checkSellerOwnership,
    checkImageMiddleware.checkSellerLogoExists, // НОВОЕ: Проверка ПЕРЕД загрузкой
    uploadPhoto.single('image', 'sellers').parse,
    uploadPhoto.single('image', 'sellers').process,
    sellerController.replaceSellerLogo
);

// DELETE /api/sellers/:id/logo - Удалить logo
router.delete(
    '/:id/logo',
    authMiddleware.protectAdmin,
    permissionsMiddleware.managerAccess,
    permissionsMiddleware.checkSellerOwnership,
    sellerController.deleteSellerLogo
);

// POST /api/sellers/:id/cover - Загрузить cover
router.post(
    '/:id/cover',
    authMiddleware.protectAdmin,
    permissionsMiddleware.managerAccess,
    permissionsMiddleware.checkSellerOwnership,
    checkImageMiddleware.checkSellerCoverNotExists, // НОВОЕ: Проверка ПЕРЕД загрузкой
    uploadPhoto.single('image', 'sellers').parse,
    uploadPhoto.single('image', 'sellers').process,
    sellerController.uploadSellerCover
);

// PUT /api/sellers/:id/cover - Заменить cover
router.put(
    '/:id/cover',
    authMiddleware.protectAdmin,
    permissionsMiddleware.managerAccess,
    permissionsMiddleware.checkSellerOwnership,
    checkImageMiddleware.checkSellerCoverExists, // НОВОЕ: Проверка ПЕРЕД загрузкой
    uploadPhoto.single('image', 'sellers').parse,
    uploadPhoto.single('image', 'sellers').process,
    sellerController.replaceSellerCover
);

// DELETE /api/sellers/:id/cover - Удалить cover
router.delete(
    '/:id/cover',
    authMiddleware.protectAdmin,
    permissionsMiddleware.managerAccess,
    permissionsMiddleware.checkSellerOwnership,
    sellerController.deleteSellerCover
);

// ========== УПРАВЛЕНИЕ СТАТУСАМИ (Owner/Admin) ==========

// POST /api/sellers/:id/activate - Активировать продавца (Owner/Admin - с датами)
router.post(
    '/:id/activate',
    authMiddleware.protectAdmin,
    permissionsMiddleware.adminAccess,
    statusValidationMiddleware.checkCanActivate, // НОВОЕ: Проверка статуса ПЕРЕД активацией
    validationMiddleware.validate(sellerValidator.activateSellerSchema),
    sellerController.activateSeller
);

// POST /api/sellers/:id/activate-manager - Активировать продавца (Manager - БЕЗ изменения дат)
router.post(
    '/:id/activate-manager',
    authMiddleware.protectAdmin,
    permissionsMiddleware.managerAccess,
    statusValidationMiddleware.checkCanActivateManager, // Проверка для Manager
    sellerController.activateSellerManager
);

// POST /api/sellers/:id/extend - Продлить продавца
router.post(
    '/:id/extend',
    authMiddleware.protectAdmin,
    permissionsMiddleware.adminAccess,
    statusValidationMiddleware.checkCanExtend, // НОВОЕ: Проверка статуса ПЕРЕД продлением
    validationMiddleware.validate(sellerValidator.activateSellerSchema),
    sellerController.extendSeller
);

// POST /api/sellers/:id/deactivate - Деактивировать продавца
router.post(
    '/:id/deactivate',
    authMiddleware.protectAdmin,
    permissionsMiddleware.adminAccess,
    statusValidationMiddleware.checkCanDeactivate, // НОВОЕ: Проверка статуса ПЕРЕД деактивацией
    sellerController.deactivateSeller
);

// POST /api/sellers/:id/draft - Перевести в draft
router.post(
    '/:id/draft',
    authMiddleware.protectAdmin,
    permissionsMiddleware.managerAccess,
    permissionsMiddleware.checkSellerOwnership,
    statusValidationMiddleware.checkCanMoveToDraft, // НОВОЕ: Проверка статуса
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