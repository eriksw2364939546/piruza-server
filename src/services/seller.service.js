import { Seller, City, Category, Product } from '../models/index.js';
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
    async createSeller(data, userId, userRole) {
        const { name, city, globalCategories, localCategories, products } = data;

        // Admin и Manager должны выбирать ТОЛЬКО активные города
        if (userRole !== 'owner') {
            const cityDoc = await City.findById(city);

            if (!cityDoc) {
                throw new Error('Город не найден');
            }

            if (!cityDoc.isActive) {
                throw new Error('Можно выбрать только активный город. Обратитесь к Owner для активации города');
            }
        }

        // Admin и Manager должны выбирать ТОЛЬКО активные глобальные категории
        if (userRole !== 'owner' && globalCategories && globalCategories.length > 0) {
            const categories = await Category.find({
                _id: { $in: globalCategories },
                isGlobal: true
            });

            // Проверяем что все категории активны
            const inactiveCategories = categories.filter(cat => !cat.isActive);

            if (inactiveCategories.length > 0) {
                const names = inactiveCategories.map(c => c.name).join(', ');
                throw new Error(`Неактивные категории: ${names}. Обратитесь к Owner для активации`);
            }
        }

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

        // НОВОЕ: Создаём локальные категории если переданы
        const createdCategories = [];
        if (localCategories && localCategories.length > 0) {
            for (const catData of localCategories) {
                const catSlug = generateSlug(catData.name);

                // Проверяем уникальность slug внутри продавца
                let uniqueSlug = catSlug;
                let counter = 1;
                while (await Category.findOne({ slug: uniqueSlug, seller: seller._id, isGlobal: false })) {
                    uniqueSlug = `${catSlug}-${counter}`;
                    counter++;
                }

                const category = new Category({
                    name: catData.name,
                    description: catData.description,
                    slug: uniqueSlug,
                    isGlobal: false,
                    isActive: true, // Локальные категории сразу активны
                    seller: seller._id,
                    createdBy: userId
                });

                await category.save();
                createdCategories.push(category);
            }

            console.log(`✅ Создано ${createdCategories.length} локальных категорий для продавца ${seller.name}`);
        }

        // НОВОЕ: Создаём товары если переданы
        if (products && products.length > 0) {
            for (const productData of products) {
                // Если указан categoryIndex - берём категорию из созданных
                let categoryId = null;
                if (productData.categoryIndex !== undefined && createdCategories[productData.categoryIndex]) {
                    categoryId = createdCategories[productData.categoryIndex]._id;
                }

                const productSlug = generateSlug(productData.name);

                // Проверяем уникальность slug внутри продавца
                let uniqueProductSlug = productSlug;
                let counter = 1;
                while (await Product.findOne({ slug: uniqueProductSlug, seller: seller._id })) {
                    uniqueProductSlug = `${productSlug}-${counter}`;
                    counter++;
                }

                const product = new Product({
                    name: productData.name,
                    code: productData.code,
                    description: productData.description,
                    price: productData.price,
                    slug: uniqueProductSlug,
                    seller: seller._id,
                    category: categoryId
                });

                await product.save();
            }

            console.log(`✅ Создано ${products.length} товаров для продавца ${seller.name}`);
        }

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

        // Если Admin/Manager меняет город - проверяем активность
        if (userRole !== 'owner' && data.city && data.city !== seller.city?.toString()) {
            const cityDoc = await City.findById(data.city);

            if (!cityDoc) {
                throw new Error('Город не найден');
            }

            if (!cityDoc.isActive) {
                throw new Error('Можно выбрать только активный город. Обратитесь к Owner для активации города');
            }
        }

        // Если Admin/Manager меняет глобальные категории - проверяем активность
        if (userRole !== 'owner' && data.globalCategories && data.globalCategories.length > 0) {
            const categories = await Category.find({
                _id: { $in: data.globalCategories },
                isGlobal: true
            });

            const inactiveCategories = categories.filter(cat => !cat.isActive);

            if (inactiveCategories.length > 0) {
                const names = inactiveCategories.map(c => c.name).join(', ');
                throw new Error(`Неактивные категории: ${names}. Обратитесь к Owner для активации`);
            }
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

        // Admin/Manager могут выбирать ТОЛЬКО активные категории
        if (userRole !== 'owner' && globalCategories && globalCategories.length > 0) {
            const categories = await Category.find({
                _id: { $in: globalCategories },
                isGlobal: true
            });

            const inactiveCategories = categories.filter(cat => !cat.isActive);

            if (inactiveCategories.length > 0) {
                const names = inactiveCategories.map(c => c.name).join(', ');
                throw new Error(`Неактивные категории: ${names}. Обратитесь к Owner для активации`);
            }
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

    // Удалить продавца (Owner/Admin/Manager своих)
    async deleteSeller(sellerId, userId, userRole) {
        const seller = await Seller.findById(sellerId);

        if (!seller) {
            throw new Error('Продавец не найден');
        }

        // Manager может удалять только своих продавцов
        if (userRole === 'manager') {
            if (seller.createdBy.toString() !== userId.toString()) {
                throw new Error('Доступ запрещён. Вы можете удалять только своих продавцов');
            }
        }

        // ВАЖНО: Удаляем все локальные категории продавца
        await Category.deleteMany({
            seller: sellerId,
            isGlobal: false
        });

        console.log(`✅ Удалены локальные категории продавца ${seller.name}`);

        // Удаляем продавца
        await Seller.findByIdAndDelete(sellerId);

        return seller;
    }
}

export default new SellerService();