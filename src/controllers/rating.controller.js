import ratingService from '../services/rating.service.js';
import { success, error } from '../utils/responsehandler.util.js';

class RatingController {
    // Оценить продавца
    async rateSeller(req, res) {
        try {
            const { sellerId } = req.params;
            const { rating } = req.body;

            const result = await ratingService.rateSeller(
                sellerId,
                rating,
                req.client.id
            );

            success(res, result, 'Оценка сохранена', 201);
        } catch (err) {
            error(res, err.message, 400);
        }
    }

    // Получить рейтинг продавца
    async getSellerRating(req, res) {
        try {
            const { sellerId } = req.params;

            const rating = await ratingService.getSellerRating(sellerId);

            success(res, rating, 'Рейтинг получен');
        } catch (err) {
            error(res, err.message, 404);
        }
    }
}

export default new RatingController();