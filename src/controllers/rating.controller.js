import ratingService from '../services/rating.service.js';
import { success, error } from '../utils/responsehandler.util.js';
import { getPaginationParams } from '../utils/pagination.util.js';

class RatingController {
    // Оценить продавца (создать или обновить)
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

    // Получить рейтинг продавца (публичный)
    async getSellerRating(req, res) {
        try {
            const { sellerId } = req.params;

            const rating = await ratingService.getSellerRating(sellerId);

            success(res, rating, 'Рейтинг получен');
        } catch (err) {
            error(res, err.message, 404);
        }
    }

    // НОВОЕ: Получить все оценки продавца с деталями клиентов (публичный)
    async getSellerRatings(req, res) {
        try {
            const { sellerId } = req.params;
            const { page, limit } = getPaginationParams(req.query);

            const result = await ratingService.getSellerRatings(sellerId, page, limit);

            success(res, result.data, 'Оценки продавца получены', 200, result.pagination);
        } catch (err) {
            error(res, err.message, 404);
        }
    }

    // НОВОЕ: Получить статистику оценок продавца (публичный)
    async getSellerRatingStats(req, res) {
        try {
            const { sellerId } = req.params;

            const stats = await ratingService.getSellerRatingStats(sellerId);

            success(res, stats, 'Статистика получена');
        } catch (err) {
            error(res, err.message, 404);
        }
    }

    // НОВОЕ: Получить свою оценку для продавца (клиент)
    async getMyRating(req, res) {
        try {
            const { sellerId } = req.params;

            const rating = await ratingService.getClientRatingForSeller(
                sellerId,
                req.client.id
            );

            if (!rating) {
                return success(res, null, 'Вы ещё не оценили этого продавца');
            }

            success(res, rating, 'Ваша оценка получена');
        } catch (err) {
            error(res, err.message, 404);
        }
    }

    // НОВОЕ: Получить историю оценок клиента (клиент)
    async getMyRatings(req, res) {
        try {
            const { page, limit } = getPaginationParams(req.query);

            const result = await ratingService.getClientRatings(req.client.id, page, limit);

            success(res, result.data, 'История оценок получена', 200, result.pagination);
        } catch (err) {
            error(res, err.message, 404);
        }
    }

    // НОВОЕ: Удалить свою оценку (клиент)
    async deleteMyRating(req, res) {
        try {
            const { sellerId } = req.params;

            const rating = await ratingService.deleteRating(
                sellerId,
                req.client.id
            );

            success(res, rating, 'Оценка удалена');
        } catch (err) {
            error(res, err.message, 404);
        }
    }
}

export default new RatingController();