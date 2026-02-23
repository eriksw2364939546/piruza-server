import express from 'express';
import ratingController from '../controllers/rating.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import validationMiddleware from '../middlewares/validation.middleware.js';
import ratingValidator from '../validators/rating.validator.js';

const router = express.Router();

// POST /api/ratings/:sellerId - Оценить продавца (Client)
router.post(
    '/:sellerId',
    authMiddleware.protectClient,
    validationMiddleware.validate(ratingValidator.rateSellerSchema),
    ratingController.rateSeller
);

// GET /api/ratings/:sellerId - Получить рейтинг продавца (публичный)
router.get(
    '/:sellerId',
    ratingController.getSellerRating
);

export default router;