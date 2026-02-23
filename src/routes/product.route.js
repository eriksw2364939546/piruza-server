import express from 'express';
import productController from '../controllers/product.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import permissionsMiddleware from '../middlewares/permissions.middleware.js';
import validationMiddleware from '../middlewares/validation.middleware.js';
import productValidator from '../validators/product.validator.js';
import uploadPhoto from '../utils/imageupload.util.js';

const router = express.Router();

// ========== ПУБЛИЧНЫЕ РОУТЫ ==========

// GET /api/products/seller/:sellerId - Получить товары продавца
router.get(
    '/seller/:sellerId',
    productController.getProductsBySeller
);

// GET /api/products/seller/:sellerId/slug/:slug - Получить товар по slug
router.get(
    '/seller/:sellerId/slug/:slug',
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
    validationMiddleware.validate(productValidator.createProductSchema),
    productController.createProduct
);

// PUT /api/products/:id - Обновить товар
router.put(
    '/:id',
    authMiddleware.protectAdmin,
    permissionsMiddleware.managerAccess,
    validationMiddleware.validate(productValidator.updateProductSchema),
    productController.updateProduct
);

// ========== ЗАГРУЗКА ИЗОБРАЖЕНИЯ ==========

// POST /api/products/:id/image - Загрузить изображение товара
router.post(
    '/:id/image',
    authMiddleware.protectAdmin,
    permissionsMiddleware.managerAccess,
    uploadPhoto.single('image', 'products').parse,
    uploadPhoto.single('image', 'products').process,
    productController.uploadProductImage
);

// ========== УДАЛЕНИЕ ==========

// DELETE /api/products/:id - Удалить товар
router.delete(
    '/:id',
    authMiddleware.protectAdmin,
    permissionsMiddleware.managerAccess,
    productController.deleteProduct
);

export default router;