import express from 'express';
import categoryController from '../controllers/category.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import permissionsMiddleware from '../middlewares/permissions.middleware.js';
import validationMiddleware from '../middlewares/validation.middleware.js';
import categoryValidator from '../validators/category.validator.js';

const router = express.Router();

// ========== ГЛОБАЛЬНЫЕ КАТЕГОРИИ ==========

// GET /api/categories/global - Получить глобальные категории (публично - только активные)
router.get(
    '/global',
    categoryController.getGlobalCategories
);

// GET /api/categories/global/all - Получить ВСЕ глобальные (Owner - включая неактивные)
router.get(
    '/global/all',
    authMiddleware.protectAdmin,
    permissionsMiddleware.ownerOnly,
    categoryController.getAllGlobalCategories
);

// GET /api/categories/global/slug/:slug - Получить глобальную категорию по slug (публично - только активные)
router.get(
    '/global/slug/:slug',
    categoryController.getGlobalCategoryBySlug
);

// GET /api/categories/global/admin/slug/:slug - Получить глобальную категорию по slug (Owner - включая неактивные)
router.get(
    '/global/admin/slug/:slug',
    authMiddleware.protectAdmin,
    permissionsMiddleware.ownerOnly,
    categoryController.getGlobalCategoryBySlugAdmin
);

// POST /api/categories/global - Создать глобальную категорию (Owner only)
router.post(
    '/global',
    authMiddleware.protectAdmin,
    permissionsMiddleware.ownerOnly,
    validationMiddleware.validate(categoryValidator.createGlobalCategorySchema),
    categoryController.createGlobalCategory
);

// ========== ЛОКАЛЬНЫЕ КАТЕГОРИИ ПРОДАВЦА ==========

// GET /api/categories/seller/:sellerId - Получить категории продавца
router.get(
    '/seller/:sellerId',
    categoryController.getSellerCategories
);

// GET /api/categories/seller/:sellerId/slug/:slug - Получить категорию продавца по slug
router.get(
    '/seller/:sellerId/slug/:slug',
    categoryController.getSellerCategoryBySlug
);

// POST /api/categories/seller - Создать категорию продавца (Owner/Admin/Manager своих)
router.post(
    '/seller',
    authMiddleware.protectAdmin,
    permissionsMiddleware.managerAccess,
    permissionsMiddleware.checkSellerCategoryAccess,
    validationMiddleware.validate(categoryValidator.createSellerCategorySchema),
    categoryController.createSellerCategory
);

// ========== ОБЩИЕ ОПЕРАЦИИ ==========

// PUT /api/categories/:id - Обновить категорию
// Owner: любые категории
// Admin: любые локальные категории
// Manager: только свои локальные категории (продавец active)
router.put(
    '/:id',
    authMiddleware.protectAdmin,
    permissionsMiddleware.managerAccess,
    validationMiddleware.validate(categoryValidator.updateCategorySchema),
    categoryController.updateCategory
);

// DELETE /api/categories/:id - Удалить категорию
// Owner: любые категории
// Admin: любые локальные категории
// Manager: только свои локальные категории (продавец active)
router.delete(
    '/:id',
    authMiddleware.protectAdmin,
    permissionsMiddleware.managerAccess,
    categoryController.deleteCategory
);

export default router;