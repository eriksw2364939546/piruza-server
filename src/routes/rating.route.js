import express from 'express';
import ratingController from '../controllers/rating.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import permissionsMiddleware from '../middlewares/permissions.middleware.js';
import validationMiddleware from '../middlewares/validation.middleware.js';
import ratingValidator from '../validators/rating.validator.js';
import { ratingLimiter } from '../middlewares/ratelimit.middleware.js';

const router = express.Router();

// ========== OWNER ONLY РОУТЫ ==========

// GET /api/ratings/seller/:sellerId — рейтинг продавца (только Owner)
router.get(
    '/seller/:sellerId',
    authMiddleware.protectAdmin,
    permissionsMiddleware.ownerOnly,
    ratingController.getSellerRating
);

// GET /api/ratings/seller/:sellerId/list — все оценки продавца (только Owner)
router.get(
    '/seller/:sellerId/list',
    authMiddleware.protectAdmin,
    permissionsMiddleware.ownerOnly,
    ratingController.getSellerRatings
);

// GET /api/ratings/seller/:sellerId/stats — статистика оценок (только Owner)
router.get(
    '/seller/:sellerId/stats',
    authMiddleware.protectAdmin,
    permissionsMiddleware.ownerOnly,
    ratingController.getSellerRatingStats
);

// ========== КЛИЕНТСКИЕ РОУТЫ (требуется Client токен) ==========

// POST /api/ratings/seller/:sellerId — оценить продавца (Client)
router.post(
    '/seller/:sellerId',
    authMiddleware.protectClient,
    ratingLimiter,
    validationMiddleware.validate(ratingValidator.rateSellerSchema),
    ratingController.rateSeller
);

// GET /api/ratings/seller/:sellerId/my — своя оценка для продавца (Client)
router.get(
    '/seller/:sellerId/my',
    authMiddleware.protectClient,
    ratingController.getMyRating
);

// GET /api/ratings/my — история своих оценок (Client)
router.get(
    '/my',
    authMiddleware.protectClient,
    ratingController.getMyRatings
);

// DELETE /api/ratings/seller/:sellerId/my — удалить свою оценку (Client)
router.delete(
    '/seller/:sellerId/my',
    authMiddleware.protectClient,
    ratingController.deleteMyRating
);

export default router;