import { SellerRating, Seller } from '../models/index.js';
import { paginate } from '../utils/pagination.util.js';

class RatingService {
    // Оценить продавца (create или update)
    async rateSeller(sellerId, rating, clientId) {
        const seller = await Seller.findById(sellerId);
        if (!seller) throw new Error('Продавец не найден');
        if (seller.status !== 'active') throw new Error('Можно оценивать только активных продавцов');

        let sellerRating = await SellerRating.findOne({ seller: sellerId, client: clientId });

        if (sellerRating) {
            sellerRating.rating = rating;
            await sellerRating.save();
        } else {
            sellerRating = new SellerRating({ seller: sellerId, client: clientId, rating });
            await sellerRating.save();
        }

        await this.recalculateSellerRating(sellerId);
        return sellerRating;
    }

    // Пересчитать средний рейтинг
    async recalculateSellerRating(sellerId) {
        const ratings = await SellerRating.find({ seller: sellerId });

        if (ratings.length === 0) {
            await Seller.findByIdAndUpdate(sellerId, { averageRating: 0, totalRatings: 0 });
            return;
        }

        const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
        const average = sum / ratings.length;

        await Seller.findByIdAndUpdate(sellerId, {
            averageRating: Math.round(average * 10) / 10,
            totalRatings: ratings.length
        });
    }

    // Получить рейтинг продавца
    async getSellerRating(sellerId) {
        const seller = await Seller.findById(sellerId).select('averageRating totalRatings');
        if (!seller) throw new Error('Продавец не найден');
        return { averageRating: seller.averageRating, totalRatings: seller.totalRatings };
    }

    // Получить историю оценок клиента
    async getClientRatings(clientId, page = 1, limit = 20) {
        const query = SellerRating.find({ client: clientId })
            .populate('seller', 'name slug logo')
            .sort({ createdAt: -1 });
        return await paginate(query, page, limit);
    }

    // Для Owner — получить все оценки всех клиентов с фильтрами
    async getAllRatings(page = 1, limit = 20, { rating = '', query = '' } = {}) {
        let filter = {};
        if (rating) filter.rating = Number(rating);

        let dbQuery = SellerRating.find(filter)
            .populate('client', 'name email avatar')
            .populate('seller', 'name slug')
            .sort({ createdAt: -1 });

        const all = await dbQuery;

        const filtered = query
            ? all.filter(r =>
                r.client?.name?.toLowerCase().includes(query.toLowerCase()) ||
                r.client?.email?.toLowerCase().includes(query.toLowerCase())
            )
            : all;

        const total = filtered.length;
        const skip = (page - 1) * limit;
        const data = filtered.slice(skip, skip + limit);

        return {
            data,
            pagination: { total, page, limit, pages: Math.ceil(total / limit) }
        };
    }

    // Получить все оценки продавца — с фильтром по рейтингу и поиском по клиенту
    async getSellerRatings(sellerId, page = 1, limit = 20, { rating = '', query = '' } = {}) {
        // Сначала получаем все оценки с populate клиента
        let filter = { seller: sellerId };
        if (rating) filter.rating = Number(rating);

        let dbQuery = SellerRating.find(filter)
            .populate('client', 'name email avatar')
            .sort({ createdAt: -1 });

        const all = await dbQuery;

        // Поиск по имени/email клиента (в памяти, так как populate)
        const filtered = query
            ? all.filter(r =>
                r.client?.name?.toLowerCase().includes(query.toLowerCase()) ||
                r.client?.email?.toLowerCase().includes(query.toLowerCase())
            )
            : all;

        // Ручная пагинация
        const total = filtered.length;
        const skip = (page - 1) * limit;
        const data = filtered.slice(skip, skip + limit);
        const pages = Math.ceil(total / limit);

        return {
            data,
            pagination: { total, page, limit, pages }
        };
    }

    // Получить оценку клиента для конкретного продавца
    async getClientRatingForSeller(sellerId, clientId) {
        return await SellerRating.findOne({ seller: sellerId, client: clientId });
    }

    // Удалить оценку клиента
    async deleteRating(sellerId, clientId) {
        const rating = await SellerRating.findOneAndDelete({ seller: sellerId, client: clientId });
        if (!rating) throw new Error('Оценка не найдена');
        await this.recalculateSellerRating(sellerId);
        return rating;
    }

    // Статистика оценок по звёздам
    async getSellerRatingStats(sellerId) {
        const ratings = await SellerRating.find({ seller: sellerId });

        if (ratings.length === 0) {
            return { totalRatings: 0, averageRating: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };
        }

        const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        ratings.forEach(r => { distribution[r.rating]++; });

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