import { SellerRating, Seller } from '../models/index.js';

class RatingService {
    // Оценить продавца (create или update)
    async rateSeller(sellerId, rating, clientId) {
        // Проверяем существование продавца
        const seller = await Seller.findById(sellerId);
        if (!seller) {
            throw new Error('Продавец не найден');
        }

        // Ищем существующую оценку
        let sellerRating = await SellerRating.findOne({
            seller: sellerId,
            client: clientId
        });

        if (sellerRating) {
            // Обновляем существующую оценку
            sellerRating.rating = rating;
            await sellerRating.save();
        } else {
            // Создаём новую оценку
            sellerRating = new SellerRating({
                seller: sellerId,
                client: clientId,
                rating
            });
            await sellerRating.save();
        }

        // Пересчитываем рейтинг продавца
        await this.recalculateSellerRating(sellerId);

        return sellerRating;
    }

    // Пересчитать средний рейтинг продавца
    async recalculateSellerRating(sellerId) {
        const ratings = await SellerRating.find({ seller: sellerId });

        if (ratings.length === 0) {
            // Нет оценок
            await Seller.findByIdAndUpdate(sellerId, {
                averageRating: 0,
                totalRatings: 0
            });
            return;
        }

        // Вычисляем средний рейтинг
        const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
        const average = sum / ratings.length;

        await Seller.findByIdAndUpdate(sellerId, {
            averageRating: Math.round(average * 10) / 10, // Округляем до 1 знака после запятой
            totalRatings: ratings.length
        });
    }

    // Получить рейтинг продавца
    async getSellerRating(sellerId) {
        const seller = await Seller.findById(sellerId)
            .select('averageRating totalRatings');

        if (!seller) {
            throw new Error('Продавец не найден');
        }

        return {
            averageRating: seller.averageRating,
            totalRatings: seller.totalRatings
        };
    }

    // Получить историю оценок клиента
    async getClientRatings(clientId) {
        const ratings = await SellerRating.find({ client: clientId })
            .populate('seller', 'name slug logo')
            .sort({ createdAt: -1 });

        return ratings;
    }
}

export default new RatingService();