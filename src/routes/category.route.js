import express from 'express';
import categoryController from '../controllers/category.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import permissionsMiddleware from '../middlewares/permissions.middleware.js';
import validationMiddleware from '../middlewares/validation.middleware.js';
import categoryValidator from '../validators/category.validator.js';

const router = express.Router();

// ========== ГЛОБАЛЬНЫЕ КАТЕГОРИИ ==========

// GET /api/categories/global - Получить все глобальные категории
router.get(
    '/global',
    categoryController.getGlobalCategories
);

// GET /api/categories/global/slug/:slug - Получить глобальную категорию по slug
router.get(
    '/global/slug/:slug',
    categoryController.getGlobalCategoryBySlug
);

// POST /api/categories/global - Создать глобальную категорию (Owner/Admin)
router.post(
    '/global',
    authMiddleware.protectAdmin,
    permissionsMiddleware.adminAccess,
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

// POST /api/categories/seller - Создать категорию продавца (Owner/Admin)
router.post(
    '/seller',
    authMiddleware.protectAdmin,
    permissionsMiddleware.adminAccess,
    validationMiddleware.validate(categoryValidator.createSellerCategorySchema),
    categoryController.createSellerCategory
);

// ========== ОБЩИЕ ОПЕРАЦИИ ==========

// PUT /api/categories/:id - Обновить категорию (Owner/Admin)
router.put(
    '/:id',
    authMiddleware.protectAdmin,
    permissionsMiddleware.adminAccess,
    validationMiddleware.validate(categoryValidator.updateCategorySchema),
    categoryController.updateCategory
);

// DELETE /api/categories/:id - Удалить категорию (Owner/Admin)
router.delete(
    '/:id',
    authMiddleware.protectAdmin,
    permissionsMiddleware.adminAccess,
    categoryController.deleteCategory
);

export default router;