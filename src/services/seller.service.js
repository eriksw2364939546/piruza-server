import { Seller, City, Category, Product } from '../models/index.js';
import { generateSlug, generateUniqueSlug } from '../utils/slug.util.js';
import { sendActivationEmail } from '../utils/email.util.js';
import { paginate } from '../utils/pagination.util.js';
import { decrypt } from '../utils/crypto.util.js';

class SellerService {
    // НОВАЯ ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ - проверка доступности продавца
    checkSellerAccessibility(seller, userRole) {
        // Owner видит всё
        if (userRole === 'owner') {
            return true;
        }

        // Admin/Manager - проверка города
        if (!seller.city || !seller.city.isActive) {
            return false;
        }

        // Admin/Manager - проверка категорий
        if (!seller.globalCategories || seller.globalCategories.length === 0) {
            return false;
        }

        const hasInactiveCategory = seller.globalCategories.some(cat => !cat.isActive);
        if (hasInactiveCategory) {
            return false;
        }

        return true;
    }

    // Получить всех продавцов (Owner все, Admin фильтрованные, Manager свои фильтрованные)
    async getAllSellers(filters, userId, userRole, page = 1, limit = 20) {
        const { query, status, city, category } = filters;

        console.log('🔍 getAllSellers filters:', JSON.stringify(filters));
        console.log('🔍 userId:', userId, 'userRole:', userRole);
        console.log('🔍 queryObj.createdBy will be:', filters.mine === 'true' ? userId : 'not set');

        const queryObj = {};

        if (userRole === 'manager') {
            queryObj.createdBy = userId;
        } else if (filters.mine === 'true') {
            queryObj.createdBy = userId;
        }

        if (status) queryObj.status = status;

        // ── Город: slug или ObjectId ──
        if (city) {
            const isObjectId = /^[0-9a-fA-F]{24}$/.test(city);
            if (isObjectId) {
                queryObj.city = city;
            } else {
                const cityDoc = await City.findOne({ slug: city }).select('_id');
                queryObj.city = cityDoc ? cityDoc._id : null;
            }
        }

        // ── Категория: slug или ObjectId ──
        if (category) {
            const isObjectId = /^[0-9a-fA-F]{24}$/.test(category);
            if (isObjectId) {
                queryObj.globalCategories = category;
            } else {
                const catDoc = await Category.findOne({ slug: category, isGlobal: true }).select('_id');
                queryObj.globalCategories = catDoc ? catDoc._id : null;
            }
        }

        if (query) {
            queryObj.$or = [
                { name: { $regex: query, $options: 'i' } },
                { slug: { $regex: query, $options: 'i' } }
            ];
        }

        const sellersQuery = Seller.find(queryObj)
            .populate('city', 'name slug isActive')
            .populate('globalCategories', 'name slug isActive')
            .populate('createdBy', 'name email role')
            .sort({ createdAt: -1 });

        if (userRole === 'owner') {
            const result = await paginate(sellersQuery, page, limit);
            result.data = result.data.map(seller => {
                const s = seller.toObject ? seller.toObject() : seller;
                if (s.createdBy) {
                    s.createdBy.name = decrypt(s.createdBy.name);
                    s.createdBy.email = decrypt(s.createdBy.email);
                }
                return s;
            });
            return result;
        }

        const allSellers = await sellersQuery;
        const filteredSellers = allSellers.filter(seller => {
            return this.checkSellerAccessibility(seller, userRole);
        });

        const skip = (page - 1) * limit;
        const paginatedData = filteredSellers.slice(skip, skip + limit);
        const total = filteredSellers.length;
        const totalPages = Math.ceil(total / limit);

        return {
            data: paginatedData.map(seller => {
                const s = seller.toObject ? seller.toObject() : seller;
                if (s.createdBy) {
                    s.createdBy.name = decrypt(s.createdBy.name);
                    s.createdBy.email = decrypt(s.createdBy.email);
                }
                return s;
            }),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        };
    }

    // Получить продавцов конкретного Manager'а (для Owner/Admin dashboard)
    async getSellersByManager(managerId, page = 1, limit = 20) {
        const query = Seller.find({ createdBy: managerId })
            .populate('city', 'name slug')
            .populate('globalCategories', 'name slug')
            .sort({ createdAt: -1 });

        return await paginate(query, page, limit);
    }

    // Универсальный публичный метод с query параметрами
    async getPublicSellersUniversal(citySlug = null, categorySlug = null, page = 1, limit = 20, query = '', sort = '') {
        const now = new Date();

        // Базовый фильтр
        const filter = {
            status: 'active',
            activationEndDate: { $gt: now }
        };

        // ФИЛЬТР ПО ГОРОДУ (slug)
        if (citySlug) {
            const cityDoc = await City.findOne({ slug: citySlug, isActive: true });

            if (!cityDoc) {
                throw new Error('Город не найден или неактивен');
            }

            filter.city = cityDoc._id;
        }

        // ФИЛЬТР ПО КАТЕГОРИИ (slug)
        if (categorySlug) {
            const categoryDoc = await Category.findOne({
                slug: categorySlug,
                isGlobal: true,
                isActive: true
            });

            if (!categoryDoc) {
                throw new Error('Категория не найдена или неактивна');
            }

            filter.globalCategories = categoryDoc._id;
        }

        // ФИЛЬТР ПО НАЗВАНИЮ
        if (query) {
            filter.$or = [
                { name: { $regex: query, $options: 'i' } },
                { slug: { $regex: query, $options: 'i' } },
            ];
        }

        // СОРТИРОВКА
        const sortObj = sort === 'views'
            ? { viewsCount: -1 }
            : { createdAt: -1 };

        const sellersQuery = Seller.find(filter)
            .populate({
                path: 'city',
                match: { isActive: true },
                select: 'name slug'
            })
            .populate({
                path: 'globalCategories',
                match: { isActive: true },
                select: 'name slug'
            })
            .select('name slug logo coverImage averageRating totalRatings viewsCount city globalCategories')
            .sort(sortObj);

        const allSellers = await sellersQuery;

        // Фильтруем где город или категории стали null
        const filteredSellers = allSellers.filter(seller => {
            if (!seller.city) return false;
            if (seller.globalCategories.length === 0) return false;
            return true;
        });

        // Ручная пагинация
        const skip = (page - 1) * limit;
        const paginatedData = filteredSellers.slice(skip, skip + limit);
        const total = filteredSellers.length;
        const totalPages = Math.ceil(total / limit);

        return {
            data: paginatedData,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        };
    }

    // Получить ВСЕ активные продавцы (публично, БЕЗ фильтра по городу)
    async getActiveSellers(globalCategoryId = null, page = 1, limit = 20) {
        const now = new Date();

        // Базовый фильтр: только active + срок не истёк
        const query = {
            status: 'active',
            activationEndDate: { $gt: now }
        };

        // Фильтр по категории (опционально)
        if (globalCategoryId) {
            query.globalCategories = globalCategoryId;
        }

        const sellersQuery = Seller.find(query)
            .populate({
                path: 'city',
                match: { isActive: true },
                select: 'name slug'
            })
            .populate({
                path: 'globalCategories',
                match: { isActive: true },
                select: 'name slug'
            })
            .select('name slug logo coverImage averageRating totalRatings city globalCategories')
            .sort({ createdAt: -1 });

        // Получаем всех для фильтрации
        const allSellers = await sellersQuery;

        // Фильтруем продавцов где город или категории стали null (неактивные)
        const filteredSellers = allSellers.filter(seller => {
            // Если город null → скрываем
            if (!seller.city) return false;

            // Если все категории стали null → скрываем
            if (seller.globalCategories.length === 0) return false;

            return true;
        });

        // Ручная пагинация
        const skip = (page - 1) * limit;
        const paginatedData = filteredSellers.slice(skip, skip + limit);
        const total = filteredSellers.length;
        const totalPages = Math.ceil(total / limit);

        return {
            data: paginatedData,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        };
    }

    // Получить активных продавцов по slug города (публично)
    async getSellersByCitySlug(citySlug, globalCategoryId = null, page = 1, limit = 20) {
        // Найти город по slug
        const cityDoc = await City.findOne({ slug: citySlug, isActive: true });

        if (!cityDoc) {
            throw new Error('Город не найден или неактивен');
        }

        const now = new Date();

        // Базовый фильтр
        const query = {
            status: 'active',
            activationEndDate: { $gt: now },
            city: cityDoc._id
        };

        // Опциональный фильтр по категории
        if (globalCategoryId) {
            query.globalCategories = globalCategoryId;
        }

        const sellersQuery = Seller.find(query)
            .populate({
                path: 'city',
                select: 'name slug'
            })
            .populate({
                path: 'globalCategories',
                match: { isActive: true },
                select: 'name slug'
            })
            .select('name slug logo coverImage averageRating totalRatings city globalCategories')
            .sort({ createdAt: -1 });

        // Получаем всех для фильтрации
        const allSellers = await sellersQuery;

        // Фильтруем где категории стали null
        const filteredSellers = allSellers.filter(seller => {
            return seller.globalCategories.length > 0;
        });

        // Ручная пагинация
        const skip = (page - 1) * limit;
        const paginatedData = filteredSellers.slice(skip, skip + limit);
        const total = filteredSellers.length;
        const totalPages = Math.ceil(total / limit);

        return {
            data: paginatedData,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        };
    }

    // Получить публичных продавцов
    // Публично: только active + isActive города/категорий
    // Owner/Admin/Manager с токеном: по логике ролей
    async getPublicSellers(cityId, globalCategoryId, userId = null, userRole = null, page = 1, limit = 20) {
        // НОВОЕ: Проверяем существование и активность города
        if (cityId) {
            const cityDoc = await City.findById(cityId);

            if (!cityDoc) {
                throw new Error('Такого города нет');
            }

            // Если город неактивен И пользователь НЕ Owner → ошибка
            if (!cityDoc.isActive && userRole !== 'owner') {
                throw new Error('Такого города нет');
            }
        }

        const queryObj = {};

        // Логика по ролям
        if (!userId || !userRole) {
            // Публичный доступ - только active и не истёкшие
            queryObj.status = 'active';
            queryObj.activationEndDate = { $gt: new Date() };
        } else if (userRole === 'manager') {
            // Manager - только свои
            queryObj.createdBy = userId;
        }
        // Owner/Admin - без фильтра по createdBy (видят всех)

        if (cityId) queryObj.city = cityId;
        if (globalCategoryId) queryObj.globalCategories = globalCategoryId;

        console.log('🔍 getPublicSellers queryObj:', JSON.stringify(queryObj, null, 2));

        const sellersQuery = Seller.find(queryObj)
            .populate('city', 'name slug isActive')
            .populate('globalCategories', 'name slug isActive')
            .select('name slug logo coverImage averageRating totalRatings address city globalCategories status')
            .sort({ averageRating: -1, totalRatings: -1 });

        // Получаем всех для фильтрации
        const allSellers = await sellersQuery;

        // НОВОЕ: Фильтруем по isActive города и категорий (кроме Owner)
        let filteredSellers = allSellers;

        if (userRole !== 'owner') {
            filteredSellers = allSellers.filter(seller => {
                // Проверяем активность города
                if (!seller.city || !seller.city.isActive) {
                    return false;
                }

                // Проверяем активность всех глобальных категорий
                if (seller.globalCategories && seller.globalCategories.length > 0) {
                    const hasInactiveCategory = seller.globalCategories.some(cat => !cat.isActive);
                    if (hasInactiveCategory) {
                        return false;
                    }
                }

                return true;
            });
        }

        // Ручная пагинация
        const skip = (page - 1) * limit;
        const paginatedData = filteredSellers.slice(skip, skip + limit);
        const total = filteredSellers.length;
        const totalPages = Math.ceil(total / limit);

        return {
            data: paginatedData,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        };
    }

    // Получить продавца по slug
    async getSellerBySlug(slug, userId = null, userRole = null) {
        // Если НЕТ токена (публичный доступ) - только active
        if (!userId || !userRole) {
            const seller = await Seller.findOne({
                slug,
                status: 'active',
                activationEndDate: { $gt: new Date() }
            })
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

        // Если ЕСТЬ токен - проверяем права
        const seller = await Seller.findOne({ slug })
            .populate('city', 'name slug isActive')
            .populate('globalCategories', 'name slug isActive')
            .populate('createdBy', 'name email');

        if (!seller) {
            throw new Error('Продавец не найден');
        }

        // НОВОЕ: Проверка доступности для Admin/Manager
        if (userRole === 'admin' || userRole === 'manager') {
            const accessible = this.checkSellerAccessibility(seller, userRole);

            if (!accessible) {
                throw new Error('Доступ запрещён. Продавец недоступен (неактивный город или категории)');
            }
        }

        // Owner и Admin видят всех (уже проверили доступность выше)
        if (userRole === 'owner' || userRole === 'admin') {
            seller.viewsCount += 1;
            await seller.save();
            return seller;
        }

        // Manager видит только своих (любой статус)
        if (userRole === 'manager') {
            if (seller.createdBy._id.toString() !== userId.toString()) {
                throw new Error('Доступ запрещён. Вы можете видеть только своих продавцов');
            }

            seller.viewsCount += 1;
            await seller.save();
            return seller;
        }

        throw new Error('Доступ запрещён');
    }

    // Получить продавца по ID
    async getSellerById(sellerId, userId, userRole) {
        const seller = await Seller.findById(sellerId)
            .populate('city', 'name slug isActive')
            .populate('globalCategories', 'name slug isActive')
            .populate('createdBy', 'name email role');

        if (!seller) {
            throw new Error('Продавец не найден');
        }

        // НОВОЕ: Проверка доступности для Admin/Manager
        if (userRole === 'admin' || userRole === 'manager') {
            const accessible = this.checkSellerAccessibility(seller, userRole);

            if (!accessible) {
                throw new Error('Доступ запрещён. Продавец недоступен (неактивный город или категории)');
            }
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

        // ========== ПРОВЕРКА ГОРОДА (ВСЕ РОЛИ) ==========
        const cityDoc = await City.findById(city);

        if (!cityDoc) {
            throw new Error('Город не найден');
        }

        // Admin и Manager должны выбирать ТОЛЬКО активные города
        if (userRole !== 'owner') {
            if (!cityDoc.isActive) {
                throw new Error('Можно выбрать только активный город. Обратитесь к Owner для активации города');
            }
        }

        // ========== ПРОВЕРКА ГЛОБАЛЬНЫХ КАТЕГОРИЙ ==========

        // Admin и Manager ДОЛЖНЫ указать хотя бы ОДНУ активную глобальную категорию
        if (userRole !== 'owner') {
            if (!globalCategories || globalCategories.length === 0) {
                throw new Error('Необходимо выбрать хотя бы одну глобальную категорию');
            }
        }

        // Если globalCategories переданы - проверяем их
        if (globalCategories && globalCategories.length > 0) {
            const categories = await Category.find({
                _id: { $in: globalCategories },
                isGlobal: true
            });

            // Проверяем что ВСЕ переданные категории существуют
            if (categories.length !== globalCategories.length) {
                throw new Error('Одна или несколько глобальных категорий не найдены');
            }

            // Admin и Manager должны выбирать ТОЛЬКО активные категории
            if (userRole !== 'owner') {
                const inactiveCategories = categories.filter(cat => !cat.isActive);

                if (inactiveCategories.length > 0) {
                    const names = inactiveCategories.map(c => c.name).join(', ');
                    throw new Error(`Неактивные категории: ${names}. Обратитесь к Owner для активации`);
                }
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

    // Обновить продавца (ТОЛЬКО В DRAFT!)
    async updateSeller(sellerId, updateData, userId, userRole) {
        const seller = await Seller.findById(sellerId)
            .populate('city', 'isActive')
            .populate('globalCategories', 'isActive');

        if (!seller) {
            throw new Error('Продавец не найден');
        }

        // ========== ПРОВЕРКА СТАТУСА ==========
        if (seller.status !== 'draft') {
            throw new Error(`Нельзя редактировать продавца в статусе '${seller.status}'. Переведите в draft для изменений.`);
        }

        // ========== ПРОВЕРКА ПРАВ ДОСТУПА ==========

        if (userRole === 'owner') {
            // Owner редактирует любого — без ограничений
        }
        else if (userRole === 'admin') {
            // Проверка текущего города
            if (!seller.city || !seller.city.isActive) {
                throw new Error('Доступ запрещён');
            }
            // Проверка текущих категорий
            const hasInactiveCategory = seller.globalCategories.some(cat => !cat.isActive);
            if (hasInactiveCategory) {
                throw new Error('Доступ запрещён');
            }
        }
        else if (userRole === 'manager') {
            // Только свои продавцы
            if (seller.createdBy.toString() !== userId.toString()) {
                throw new Error('Доступ запрещён');
            }
            // Проверка текущего города
            if (!seller.city || !seller.city.isActive) {
                throw new Error('Доступ запрещён');
            }
            // Проверка текущих категорий
            const hasInactiveCategory = seller.globalCategories.some(cat => !cat.isActive);
            if (hasInactiveCategory) {
                throw new Error('Доступ запрещён');
            }
        }

        // ========== ПРОВЕРКА НОВЫХ ЗНАЧЕНИЙ ==========
        // Если admin/manager меняет город — новый должен быть активным
        if (updateData.city && userRole !== 'owner') {
            const newCity = await City.findById(updateData.city).select('isActive');
            if (!newCity || !newCity.isActive) {
                throw new Error('Нельзя установить неактивный город');
            }
        }

        // Если admin/manager меняет категории — все новые должны быть активными
        if (updateData.globalCategories?.length && userRole !== 'owner') {
            const newCategories = await Category.find({
                _id: { $in: updateData.globalCategories }
            }).select('isActive');
            const hasInactive = newCategories.some(c => !c.isActive);
            if (hasInactive) {
                throw new Error('Нельзя установить неактивные категории');
            }
        }
        // =============================================

        // Если меняется name → обновляем slug
        if (updateData.name && updateData.name !== seller.name) {
            updateData.slug = await generateUniqueSlug(Seller, updateData.name, sellerId);
        }

        Object.assign(seller, updateData);
        await seller.save();

        return seller;
    }

    // Обновить глобальные категории (ТОЛЬКО В DRAFT!)
    async updateSellerGlobalCategories(sellerId, globalCategories, userId, userRole) {
        const seller = await Seller.findById(sellerId)
            .populate('city', 'isActive')
            .populate('globalCategories', 'isActive');

        if (!seller) {
            throw new Error('Продавец не найден');
        }

        // ========== ПРОВЕРКА СТАТУСА ==========

        if (seller.status !== 'draft') {
            throw new Error(`Нельзя изменять категории продавца в статусе '${seller.status}'. Переведите в draft.`);
        }

        // ========== КОНЕЦ ПРОВЕРКИ ==========

        // Проверка прав доступа
        if (userRole === 'owner') {
            // OK
        } else {
            if (seller.createdBy.toString() !== userId) {
                throw new Error('Доступ запрещён');
            }

            if (!seller.city.isActive) {
                throw new Error('Доступ запрещён');
            }

            const hasInactiveCategory = seller.globalCategories.some(cat => !cat.isActive);
            if (hasInactiveCategory) {
                throw new Error('Доступ запрещён');
            }
        }

        // Проверяем что все новые категории существуют и активны
        const categories = await Category.find({
            _id: { $in: globalCategories },
            isGlobal: true
        });

        if (categories.length !== globalCategories.length) {
            throw new Error('Одна или несколько категорий не найдены');
        }

        const hasInactive = categories.some(cat => !cat.isActive);
        if (hasInactive) {
            throw new Error('Нельзя назначить неактивную категорию');
        }

        // Обновляем
        seller.globalCategories = globalCategories;
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
    // Активировать продавца (Manager) - БЕЗ изменения дат
    async activateSellerManager(sellerId, userId) {
        const seller = await Seller.findById(sellerId)
            .populate('createdBy', '_id');

        if (!seller) {
            throw new Error('Продавец не найден');
        }

        // Проверка владения
        if (seller.createdBy._id.toString() !== userId.toString()) {
            throw new Error('Доступ запрещён');
        }

        // Просто меняем статус на active, даты НЕ трогаем!
        seller.status = 'active';
        await seller.save();

        return seller;
    }

    // Активировать продавца (Owner/Admin)
    async activateSeller(sellerId, months) {
        const seller = await Seller.findById(sellerId)
            .populate('createdBy', 'email name')
            .populate('city', 'isActive')
            .populate('globalCategories', 'isActive');

        if (!seller) {
            throw new Error('Продавец не найден');
        }

        // ========== ПРОВЕРКА ЛОКАЛЬНЫХ КАТЕГОРИЙ И ТОВАРОВ ==========

        // 1. Проверка локальных категорий (isGlobal: false, seller: sellerId)
        const categoriesCount = await Category.countDocuments({
            seller: sellerId,
            isGlobal: false,
            isActive: true
        });

        if (categoriesCount === 0) {
            throw new Error('Нельзя активировать продавца без локальных категорий. Создайте хотя бы одну категорию.');
        }

        // 2. Проверка товаров
        const productsCount = await Product.countDocuments({
            seller: sellerId
        });

        if (productsCount === 0) {
            throw new Error('Нельзя активировать продавца без товаров. Добавьте хотя бы один товар.');
        }

        // ========== ПРОВЕРКА ГОРОДА И ГЛОБАЛЬНЫХ КАТЕГОРИЙ ==========

        // Проверка города
        if (!seller.city || !seller.city.isActive) {
            throw new Error('Город неактивен, активация невозможна');
        }

        // Проверка глобальных категорий
        const hasInactiveCategory = seller.globalCategories.some(cat => !cat.isActive);
        if (hasInactiveCategory) {
            throw new Error('Одна или несколько глобальных категорий неактивны');
        }

        // ========== ЛОГИКА АКТИВАЦИИ ==========

        const now = new Date();

        // ЛОГИКА: Если draft И срок НЕ истёк → НЕ меняем даты
        if (seller.status === 'draft' && seller.activationEndDate && seller.activationEndDate > now) {
            seller.status = 'active';
            await seller.save();
            return seller;
        }

        // НОВОЕ: Проверка months
        if (!months || months === undefined) {
            throw new Error('Количество месяцев обязательно для активации');
        }

        // ЛОГИКА: Устанавливаем НОВЫЕ даты
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + months);

        seller.status = 'active';
        seller.activationStartDate = now;
        seller.activationEndDate = endDate;

        await seller.save();

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
        // ВАЖНО: Даты НЕ удаляем! Они сохраняются для возможности повторной активации без изменения дат
        // seller.activationStartDate = null;  ← УДАЛЕНО
        // seller.activationEndDate = null;    ← УДАЛЕНО
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

        console.log(`🗑️  Начинаю полное удаление продавца ${seller.name}`);

        // 1. УДАЛЕНИЕ ТОВАРОВ И ИХ ИЗОБРАЖЕНИЙ
        const products = await Product.find({ seller: sellerId });

        if (products.length > 0) {
            const fs = await import('fs/promises');
            const path = await import('path');

            // Удаляем изображения товаров с диска
            for (const product of products) {
                if (product.image) {
                    const imagePath = path.join(process.cwd(), 'public', product.image);

                    try {
                        await fs.unlink(imagePath);
                        console.log(`  ✅ Удалено изображение товара: ${product.image}`);
                    } catch (err) {
                        console.log(`  ⚠️  Не удалось удалить изображение товара: ${product.image}`);
                    }
                }
            }

            // Удаляем товары из БД
            await Product.deleteMany({ seller: sellerId });
            console.log(`  ✅ Удалено товаров из БД: ${products.length}`);
        }

        // 2. УДАЛЕНИЕ ЛОКАЛЬНЫХ КАТЕГОРИЙ
        const categoriesResult = await Category.deleteMany({
            seller: sellerId,
            isGlobal: false
        });

        if (categoriesResult.deletedCount > 0) {
            console.log(`  ✅ Удалено локальных категорий: ${categoriesResult.deletedCount}`);
        }

        // 3. УДАЛЕНИЕ LOGO С ДИСКА
        if (seller.logo) {
            const fs = await import('fs/promises');
            const path = await import('path');
            const logoPath = path.join(process.cwd(), 'public', seller.logo);

            try {
                await fs.unlink(logoPath);
                console.log(`  ✅ Удалён logo: ${seller.logo}`);
            } catch (err) {
                console.log(`  ⚠️  Не удалось удалить logo: ${seller.logo}`);
            }
        }

        // 4. УДАЛЕНИЕ COVER С ДИСКА
        if (seller.coverImage) {
            const fs = await import('fs/promises');
            const path = await import('path');
            const coverPath = path.join(process.cwd(), 'public', seller.coverImage);

            try {
                await fs.unlink(coverPath);
                console.log(`  ✅ Удалён cover: ${seller.coverImage}`);
            } catch (err) {
                console.log(`  ⚠️  Не удалось удалить cover: ${seller.coverImage}`);
            }
        }

        // 5. УДАЛЕНИЕ ПРОДАВЦА ИЗ БД
        await Seller.findByIdAndDelete(sellerId);
        console.log(`✅ Продавец ${seller.name} полностью удалён`);

        return seller;
    }


    // Заменить logo (ТОЛЬКО В DRAFT!)
    async replaceSellerLogo(sellerId, newLogoPath, userId, userRole) {
        const seller = await Seller.findById(sellerId);

        if (!seller) {
            throw new Error('Продавец не найден');
        }

        // ========== ПРОВЕРКА СТАТУСА ==========
        if (seller.status !== 'draft') {
            throw new Error(`Нельзя заменять изображения продавца в статусе '${seller.status}'. Переведите в draft.`);
        }
        // ======================================

        // Проверка доступа
        if (userRole !== 'owner' && seller.createdBy.toString() !== userId) {
            throw new Error('Доступ запрещён');
        }

        // Удаляем старое изображение
        if (seller.logo) {
            const fs = await import('fs/promises');
            const path = await import('path');
            const oldPath = path.join(process.cwd(), 'public', seller.logo);

            try {
                await fs.unlink(oldPath);
            } catch (err) {
                console.error('Ошибка удаления старого logo:', err);
            }
        }

        seller.logo = newLogoPath;
        await seller.save();

        return seller;
    }
    // Удалить logo (ТОЛЬКО В DRAFT!)
    async deleteSellerLogo(sellerId, userId, userRole) {
        const seller = await Seller.findById(sellerId);

        if (!seller) {
            throw new Error('Продавец не найден');
        }

        // ========== ПРОВЕРКА СТАТУСА ==========
        if (seller.status !== 'draft') {
            throw new Error(`Нельзя удалять изображения продавца в статусе '${seller.status}'. Переведите в draft.`);
        }
        // ======================================

        // Проверка доступа
        if (userRole !== 'owner' && seller.createdBy.toString() !== userId) {
            throw new Error('Доступ запрещён');
        }

        if (!seller.logo) {
            throw new Error('У продавца нет logo');
        }

        // Удаляем файл
        const fs = await import('fs/promises');
        const path = await import('path');
        const logoPath = path.join(process.cwd(), 'public', seller.logo);

        try {
            await fs.unlink(logoPath);
        } catch (err) {
            console.error('Ошибка удаления logo:', err);
        }

        seller.logo = null;
        await seller.save();

        return seller;
    }

    // Заменить cover (ТОЛЬКО В DRAFT!)
    async replaceSellerCover(sellerId, newCoverPath, userId, userRole) {
        const seller = await Seller.findById(sellerId);

        if (!seller) {
            throw new Error('Продавец не найден');
        }

        // ========== ПРОВЕРКА СТАТУСА ==========
        if (seller.status !== 'draft') {
            throw new Error(`Нельзя заменять изображения продавца в статусе '${seller.status}'. Переведите в draft.`);
        }
        // ======================================

        // Проверка доступа
        if (userRole !== 'owner' && seller.createdBy.toString() !== userId) {
            throw new Error('Доступ запрещён');
        }

        // Удаляем старое изображение
        if (seller.coverImage) {
            const fs = await import('fs/promises');
            const path = await import('path');
            const oldPath = path.join(process.cwd(), 'public', seller.coverImage);


            try {
                await fs.unlink(oldPath);
            } catch (err) {
                console.error('Ошибка удаления старого cover:', err);
            }
        }

        seller.coverImage = newCoverPath;
        await seller.save();

        return seller;
    }

    // Удалить cover (ТОЛЬКО В DRAFT!)
    async deleteSellerCover(sellerId, userId, userRole) {
        const seller = await Seller.findById(sellerId);

        if (!seller) {
            throw new Error('Продавец не найден');
        }

        // ========== ПРОВЕРКА СТАТУСА ==========
        if (seller.status !== 'draft') {
            throw new Error(`Нельзя удалять изображения продавца в статусе '${seller.status}'. Переведите в draft.`);
        }
        // ======================================

        // Проверка доступа
        if (userRole !== 'owner' && seller.createdBy.toString() !== userId) {
            throw new Error('Доступ запрещён');
        }

        if (!seller.coverImage) {
            throw new Error('У продавца нет cover');
        }

        // Удаляем файл
        const fs = await import('fs/promises');
        const path = await import('path');
        const coverPath = path.join(process.cwd(), 'public', seller.coverImage);

        try {
            await fs.unlink(coverPath);
        } catch (err) {
            console.error('Ошибка удаления cover:', err);
        }

        seller.coverImage = null;
        await seller.save();

        return seller;
    }
}

export default new SellerService();