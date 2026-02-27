import express from 'express';
import productController from '../controllers/product.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import permissionsMiddleware from '../middlewares/permissions.middleware.js';
import checkImageMiddleware from '../middlewares/checkimage.middleware.js';
import validationMiddleware from '../middlewares/validation.middleware.js';
import productValidator from '../validators/product.validator.js';
import uploadPhoto from '../utils/imageupload.util.js';

const router = express.Router();

// ========== ПУБЛИЧНЫЕ РОУТЫ ==========

// GET /api/products/seller/:sellerId - Получить товары продавца
// Публично: только active продавцы
// С токеном: Owner/Admin видят всех, Manager своих
router.get(
    '/seller/:sellerId',
    authMiddleware.optionalAuth,
    productController.getProductsBySeller
);

// GET /api/products/seller/:sellerId/slug/:slug - Получить товар по slug
// Публично: только active продавцы
// С токеном: Owner/Admin видят всех, Manager своих
router.get(
    '/seller/:sellerId/slug/:slug',
    authMiddleware.optionalAuth,
    productController.getProductBySlug
);

// ========== ADMIN РОУТЫ ==========

// GET /api/products/:id - Получить товар по ID
router.get(
    '/:id',
    authMiddleware.protectAdmin,
    permissionsMiddleware.managerAccess,
    productController.getProductById
);

// POST /api/products - Создать товар
router.post(
    '/',
    authMiddleware.protectAdmin,
    permissionsMiddleware.managerAccess,
    permissionsMiddleware.checkProductAccess,
    validationMiddleware.validate(productValidator.createProductSchema),
    productController.createProduct
);

// PUT /api/products/:id - Обновить товар
router.put(
    '/:id',
    authMiddleware.protectAdmin,
    permissionsMiddleware.managerAccess,
    permissionsMiddleware.checkProductAccess,
    validationMiddleware.validate(productValidator.updateProductSchema),
    productController.updateProduct
);

// ========== ЗАГРУЗКА/ЗАМЕНА ИЗОБРАЖЕНИЯ ==========

// POST /api/products/:id/image - Загрузить изображение (первая загрузка)
router.post(
    '/:id/image',
    authMiddleware.protectAdmin,
    permissionsMiddleware.managerAccess,
    permissionsMiddleware.checkProductAccess,
    checkImageMiddleware.checkProductImageNotExists, // НОВОЕ: Проверка ПЕРЕД загрузкой
    uploadPhoto.single('image', 'products').parse,
    uploadPhoto.single('image', 'products').process,
    productController.uploadProductImage
);

// PUT /api/products/:id/image - Заменить изображение
router.put(
    '/:id/image',
    authMiddleware.protectAdmin,
    permissionsMiddleware.managerAccess,
    permissionsMiddleware.checkProductAccess,
    checkImageMiddleware.checkProductImageExists, // НОВОЕ: Проверка ПЕРЕД загрузкой
    uploadPhoto.single('image', 'products').parse,
    uploadPhoto.single('image', 'products').process,
    productController.replaceProductImage
);

// DELETE /api/products/:id/image - Удалить изображение товара
router.delete(
    '/:id/image',
    authMiddleware.protectAdmin,
    permissionsMiddleware.managerAccess,
    permissionsMiddleware.checkProductAccess,
    productController.deleteProductImage
);

// ========== УДАЛЕНИЕ ==========

// DELETE /api/products/:id - Удалить товар
router.delete(
    '/:id',
    authMiddleware.protectAdmin,
    permissionsMiddleware.managerAccess,
    permissionsMiddleware.checkProductAccess,
    productController.deleteProduct
);

export default router;