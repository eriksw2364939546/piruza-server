import express from 'express';
import ratingController from '../controllers/rating.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import validationMiddleware from '../middlewares/validation.middleware.js';
import ratingValidator from '../validators/rating.validator.js';

const router = express.Router();

// ========== ПУБЛИЧНЫЕ РОУТЫ ==========

// GET /api/ratings/seller/:sellerId - Получить рейтинг продавца (публично)
router.get(
    '/seller/:sellerId',
    ratingController.getSellerRating
);

// GET /api/ratings/seller/:sellerId/list - Получить все оценки продавца (публично)
router.get(
    '/seller/:sellerId/list',
    ratingController.getSellerRatings
);

// GET /api/ratings/seller/:sellerId/stats - Получить статистику оценок (публично)
router.get(
    '/seller/:sellerId/stats',
    ratingController.getSellerRatingStats
);

// ========== КЛИЕНТСКИЕ РОУТЫ (требуется Client токен) ==========

// POST /api/ratings/seller/:sellerId - Оценить продавца (Client)
router.post(
    '/seller/:sellerId',
    authMiddleware.protectClient,
    validationMiddleware.validate(ratingValidator.rateSellerSchema),
    ratingController.rateSeller
);

// GET /api/ratings/seller/:sellerId/my - Получить свою оценку для продавца (Client)
router.get(
    '/seller/:sellerId/my',
    authMiddleware.protectClient,
    ratingController.getMyRating
);

// GET /api/ratings/my - Получить историю своих оценок (Client)
router.get(
    '/my',
    authMiddleware.protectClient,
    ratingController.getMyRatings
);

// DELETE /api/ratings/seller/:sellerId/my - Удалить свою оценку (Client)
router.delete(
    '/seller/:sellerId/my',
    authMiddleware.protectClient,
    ratingController.deleteMyRating
);

export default router;