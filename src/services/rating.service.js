import { SellerRating, Seller } from '../models/index.js';

class RatingService {
    // Оценить продавца (create или update)
    async rateSeller(sellerId, rating, clientId) {
        // Проверяем существование продавца
        const seller = await Seller.findById(sellerId);
        if (!seller) {
            throw new Error('Продавец не найден');
        }

        // НОВОЕ: Проверка статуса продавца
        if (seller.status !== 'active') {
            throw new Error('Можно оценивать только активных продавцов');
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
            console.log(`✅ Клиент ${clientId} обновил оценку продавца ${seller.name}: ${rating}⭐`);
        } else {
            // Создаём новую оценку
            sellerRating = new SellerRating({
                seller: sellerId,
                client: clientId,
                rating
            });
            await sellerRating.save();
            console.log(`✅ Клиент ${clientId} поставил оценку продавцу ${seller.name}: ${rating}⭐`);
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
            console.log(`📊 Пересчёт рейтинга: 0⭐ (0 оценок)`);
            return;
        }

        // Вычисляем средний рейтинг
        const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
        const average = sum / ratings.length;

        await Seller.findByIdAndUpdate(sellerId, {
            averageRating: Math.round(average * 10) / 10, // Округляем до 1 знака после запятой
            totalRatings: ratings.length
        });

        console.log(`📊 Пересчёт рейтинга: ${average.toFixed(1)}⭐ (${ratings.length} оценок)`);
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

    // НОВОЕ: Получить все оценки продавца с деталями клиентов
    async getSellerRatings(sellerId) {
        const ratings = await SellerRating.find({ seller: sellerId })
            .populate('client', 'name avatar email')
            .sort({ createdAt: -1 });

        return ratings;
    }

    // НОВОЕ: Получить оценку клиента для конкретного продавца
    async getClientRatingForSeller(sellerId, clientId) {
        const rating = await SellerRating.findOne({
            seller: sellerId,
            client: clientId
        });

        return rating;
    }

    // НОВОЕ: Удалить оценку клиента
    async deleteRating(sellerId, clientId) {
        const rating = await SellerRating.findOneAndDelete({
            seller: sellerId,
            client: clientId
        });

        if (!rating) {
            throw new Error('Оценка не найдена');
        }

        console.log(`🗑️  Клиент ${clientId} удалил свою оценку продавца ${sellerId}`);

        // Пересчитываем рейтинг продавца
        await this.recalculateSellerRating(sellerId);

        return rating;
    }

    // НОВОЕ: Получить статистику оценок продавца (детализация по звёздам)
    async getSellerRatingStats(sellerId) {
        const ratings = await SellerRating.find({ seller: sellerId });

        if (ratings.length === 0) {
            return {
                totalRatings: 0,
                averageRating: 0,
                distribution: {
                    5: 0,
                    4: 0,
                    3: 0,
                    2: 0,
                    1: 0
                }
            };
        }

        // Подсчёт распределения
        const distribution = {
            5: 0,
            4: 0,
            3: 0,
            2: 0,
            1: 0
        };

        ratings.forEach(rating => {
            distribution[rating.rating]++;
        });

        const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
        const averageRating = sum / ratings.length;

        return {
            totalRatings: ratings.length,
            averageRating: parseFloat(averageRating.toFixed(1)),
            distribution
        };
    }
}

export default new RatingService();