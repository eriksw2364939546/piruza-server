import { Seller } from '../models/index.js';
import { generateSlug, generateUniqueSlug } from '../utils/slug.util.js';
import { sendActivationEmail } from '../utils/email.util.js';

class SellerService {
    // Получить всех продавцов (с учётом роли)
    async getAllSellers(filters, userId, userRole) {
        const { query, status, city, category } = filters;

        const queryObj = {};

        // Owner/Admin видят всех, Manager только своих
        if (userRole === 'manager') {
            queryObj.createdBy = userId;
        }

        // Фильтры
        if (status) queryObj.status = status;
        if (city) queryObj.city = city;
        if (category) queryObj.globalCategories = category;

        // Поиск по названию
        if (query) {
            queryObj.$or = [
                { name: { $regex: query, $options: 'i' } },
                { slug: { $regex: query, $options: 'i' } }
            ];
        }

        const sellers = await Seller.find(queryObj)
            .populate('city', 'name slug')
            .populate('globalCategories', 'name slug')
            .populate('createdBy', 'name email role')
            .sort({ createdAt: -1 });

        return sellers;
    }

    // Получить продавцов конкретного Manager'а (для Owner/Admin dashboard)
    async getSellersByManager(managerId) {
        const sellers = await Seller.find({ createdBy: managerId })
            .populate('city', 'name slug')
            .populate('globalCategories', 'name slug')
            .sort({ createdAt: -1 });

        return sellers;
    }

    // Получить публичных продавцов (только active)
    async getPublicSellers(cityId, globalCategoryId) {
        const queryObj = {
            status: 'active',
            activationEndDate: { $gt: new Date() } // Не истёкшие
        };

        if (cityId) queryObj.city = cityId;
        if (globalCategoryId) queryObj.globalCategories = globalCategoryId;

        const sellers = await Seller.find(queryObj)
            .populate('city', 'name slug')
            .populate('globalCategories', 'name slug')
            .select('name slug logo coverImage averageRating totalRatings address city globalCategories')
            .sort({ averageRating: -1, totalRatings: -1 });

        return sellers;
    }

    // Получить продавца по slug
    async getSellerBySlug(slug) {
        const seller = await Seller.findOne({ slug })
            .populate('city', 'name slug')
            .populate('globalCategories', 'name slug')
            .populate('createdBy', 'name email');

        if (!seller) {
            throw new Error('Продавец не найден');
        }

        // Увеличиваем счётчик просмотров
        seller.viewsCount += 1;
        await seller.save();

        return seller;
    }

    // Получить продавца по ID
    async getSellerById(sellerId, userId, userRole) {
        const seller = await Seller.findById(sellerId)
            .populate('city', 'name slug')
            .populate('globalCategories', 'name slug')
            .populate('createdBy', 'name email role');

        if (!seller) {
            throw new Error('Продавец не найден');
        }

        // Проверка прав (Manager может только своих)
        if (userRole === 'manager' && seller.createdBy._id.toString() !== userId.toString()) {
            throw new Error('Доступ запрещён');
        }

        return seller;
    }

    // Создать продавца (после одобрения заявки)
    async createSeller(data, userId) {
        const { name } = data;

        // Генерируем slug
        const baseSlug = generateSlug(name);
        const slug = await generateUniqueSlug(Seller, baseSlug);

        const seller = new Seller({
            ...data,
            slug,
            status: 'draft', // Всегда создаётся как draft
            createdBy: userId
        });

        await seller.save();
        return seller;
    }

    // Обновить продавца
    async updateSeller(sellerId, data, userId, userRole) {
        const seller = await Seller.findById(sellerId);

        if (!seller) {
            throw new Error('Продавец не найден');
        }

        // Проверка прав
        if (userRole === 'manager' && seller.createdBy.toString() !== userId.toString()) {
            throw new Error('Доступ запрещён');
        }

        // Если изменяется название, генерируем новый slug
        if (data.name && data.name !== seller.name) {
            const baseSlug = generateSlug(data.name);
            data.slug = await generateUniqueSlug(Seller, baseSlug, sellerId);
        }

        Object.assign(seller, data);
        await seller.save();

        return seller;
    }

    // Обновить глобальные категории
    async updateSellerGlobalCategories(sellerId, globalCategories, userId, userRole) {
        const seller = await Seller.findById(sellerId);

        if (!seller) {
            throw new Error('Продавец не найден');
        }

        // Проверка прав
        if (userRole === 'manager' && seller.createdBy.toString() !== userId.toString()) {
            throw new Error('Доступ запрещён');
        }

        seller.globalCategories = globalCategories;
        await seller.save();

        return seller;
    }

    // Активировать продавца (Owner/Admin)
    async activateSeller(sellerId, months) {
        const seller = await Seller.findById(sellerId)
            .populate('createdBy', 'email name');

        if (!seller) {
            throw new Error('Продавец не найден');
        }

        const now = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + months);

        seller.status = 'active';
        seller.activationStartDate = now;
        seller.activationEndDate = endDate;

        await seller.save();

        // Отправляем email Manager'у
        if (seller.createdBy && seller.createdBy.email) {
            await sendActivationEmail(seller.createdBy.email, seller.name, endDate);
        }

        return seller;
    }

    // Продлить продавца
    async extendSeller(sellerId, months) {
        const seller = await Seller.findById(sellerId)
            .populate('createdBy', 'email name');

        if (!seller) {
            throw new Error('Продавец не найден');
        }

        const currentEndDate = seller.activationEndDate || new Date();
        const newEndDate = new Date(currentEndDate);
        newEndDate.setMonth(newEndDate.getMonth() + months);

        seller.activationEndDate = newEndDate;

        // Если был expired, делаем active
        if (seller.status === 'expired') {
            seller.status = 'active';
        }

        await seller.save();

        // Отправляем email
        if (seller.createdBy && seller.createdBy.email) {
            await sendActivationEmail(seller.createdBy.email, seller.name, newEndDate);
        }

        return seller;
    }

    // Деактивировать продавца вручную
    async deactivateSeller(sellerId) {
        const seller = await Seller.findById(sellerId);

        if (!seller) {
            throw new Error('Продавец не найден');
        }

        seller.status = 'inactive';
        await seller.save();

        return seller;
    }

    // Перевести в draft
    async moveToDraft(sellerId, userId, userRole) {
        const seller = await Seller.findById(sellerId);

        if (!seller) {
            throw new Error('Продавец не найден');
        }

        // Проверка прав
        if (userRole === 'manager' && seller.createdBy.toString() !== userId.toString()) {
            throw new Error('Доступ запрещён');
        }

        seller.status = 'draft';
        seller.activationStartDate = null;
        seller.activationEndDate = null;
        await seller.save();

        return seller;
    }

    // Проверить истёкших продавцов (Cron задача)
    async checkExpiredSellers() {
        const now = new Date();

        const expiredSellers = await Seller.find({
            status: 'active',
            activationEndDate: { $lt: now }
        });

        for (const seller of expiredSellers) {
            seller.status = 'expired';
            await seller.save();
            console.log(`✅ Seller ${seller.name} status changed to expired`);
        }

        return expiredSellers.length;
    }
}

export default new SellerService();