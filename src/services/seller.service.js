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

    // Получить публичных продавцов
    // Публично: только active + isActive города/категорий
    // Owner/Admin/Manager с токеном: по логике ролей
    async getPublicSellers(cityId, globalCategoryId, userId = null, userRole = null) {
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

        const sellers = await Seller.find(queryObj)
            .populate('city', 'name slug isActive')
            .populate('globalCategories', 'name slug isActive')
            .select('name slug logo coverImage averageRating totalRatings address city globalCategories status')
            .sort({ averageRating: -1, totalRatings: -1 });

        // НОВОЕ: Фильтруем по isActive города и категорий (кроме Owner)
        let filteredSellers = sellers;

        if (userRole !== 'owner') {
            filteredSellers = sellers.filter(seller => {
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

        return filteredSellers;
    }

    // Получить продавца по slug
    // Публично: только active и не истёкшие
    // Owner/Admin: все продавцы
    // Manager: свои продавцы (любой статус)
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
            .populate('city', 'name slug')
            .populate('globalCategories', 'name slug')
            .populate('createdBy', 'name email');

        if (!seller) {
            throw new Error('Продавец не найден');
        }

        // Owner и Admin видят всех
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

        // НОВОЕ: Проверяем город для ВСЕХ ролей (включая Owner)
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

        // НОВОЕ: Проверяем глобальные категории для ВСЕХ ролей
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

    // Обновить продавца
    async updateSeller(sellerId, data, userId, userRole) {
        const { localCategories, products, ...sellerData } = data;

        const seller = await Seller.findById(sellerId);

        if (!seller) {
            throw new Error('Продавец не найден');
        }

        // Проверка прав
        if (userRole === 'manager' && seller.createdBy.toString() !== userId.toString()) {
            throw new Error('Доступ запрещён');
        }

        // Если Admin/Manager меняет город - проверяем активность
        if (userRole !== 'owner' && sellerData.city && sellerData.city !== seller.city?.toString()) {
            const cityDoc = await City.findById(sellerData.city);

            if (!cityDoc) {
                throw new Error('Город не найден');
            }

            if (!cityDoc.isActive) {
                throw new Error('Можно выбрать только активный город. Обратитесь к Owner для активации города');
            }
        }

        // Если Admin/Manager меняет глобальные категории - проверяем активность
        if (userRole !== 'owner' && sellerData.globalCategories && sellerData.globalCategories.length > 0) {
            const categories = await Category.find({
                _id: { $in: sellerData.globalCategories },
                isGlobal: true
            });

            // Проверяем что все категории существуют
            if (categories.length !== sellerData.globalCategories.length) {
                throw new Error('Одна или несколько глобальных категорий не найдены');
            }

            const inactiveCategories = categories.filter(cat => !cat.isActive);

            if (inactiveCategories.length > 0) {
                const names = inactiveCategories.map(c => c.name).join(', ');
                throw new Error(`Неактивные категории: ${names}. Обратитесь к Owner для активации`);
            }
        }

        // Если изменяется название, генерируем новый slug
        if (sellerData.name && sellerData.name !== seller.name) {
            const baseSlug = generateSlug(sellerData.name);
            sellerData.slug = await generateUniqueSlug(Seller, baseSlug, sellerId);
        }

        // Обновляем основные данные продавца
        Object.assign(seller, sellerData);
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
                    isActive: true,
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
            .populate('createdBy', 'email name');

        if (!seller) {
            throw new Error('Продавец не найден');
        }

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

        // Отправляем email
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
    // Заменить logo продавца (с удалением старого файла)
    async replaceSellerLogo(sellerId, newLogoPath, userId, userRole) {
        // Получаем продавца
        const seller = await this.getSellerById(sellerId, userId, userRole);
        const oldLogoPath = seller.logo;

        // Удаляем старый файл
        if (oldLogoPath) {
            const fs = await import('fs/promises');
            const path = await import('path');
            const oldFilePath = path.join(process.cwd(), 'public', oldLogoPath);

            try {
                await fs.unlink(oldFilePath);
                console.log(`🗑️  Удалён старый logo: ${oldLogoPath}`);
            } catch (err) {
                console.log(`⚠️  Не удалось удалить старый logo: ${oldLogoPath}`);
            }
        }

        // Обновляем продавца
        return await this.updateSeller(sellerId, { logo: newLogoPath }, userId, userRole);
    }

    // Удалить logo продавца
    async deleteSellerLogo(sellerId, userId, userRole) {
        // Получаем продавца
        const seller = await this.getSellerById(sellerId, userId, userRole);

        if (!seller.logo) {
            throw new Error('У продавца нет logo');
        }

        const oldLogoPath = seller.logo;

        // Удаляем файл с диска
        const fs = await import('fs/promises');
        const path = await import('path');
        const oldFilePath = path.join(process.cwd(), 'public', oldLogoPath);

        try {
            await fs.unlink(oldFilePath);
            console.log(`🗑️  Удалён logo: ${oldLogoPath}`);
        } catch (err) {
            console.log(`⚠️  Не удалось удалить logo: ${oldLogoPath}`);
        }

        // Обновляем продавца
        return await this.updateSeller(sellerId, { logo: null }, userId, userRole);
    }

    // Заменить cover продавца (с удалением старого файла)
    async replaceSellerCover(sellerId, newCoverPath, userId, userRole) {
        // Получаем продавца
        const seller = await this.getSellerById(sellerId, userId, userRole);
        const oldCoverPath = seller.coverImage;

        // Удаляем старый файл
        if (oldCoverPath) {
            const fs = await import('fs/promises');
            const path = await import('path');
            const oldFilePath = path.join(process.cwd(), 'public', oldCoverPath);

            try {
                await fs.unlink(oldFilePath);
                console.log(`🗑️  Удалён старый cover: ${oldCoverPath}`);
            } catch (err) {
                console.log(`⚠️  Не удалось удалить старый cover: ${oldCoverPath}`);
            }
        }

        // Обновляем продавца
        return await this.updateSeller(sellerId, { coverImage: newCoverPath }, userId, userRole);
    }

    // Удалить cover продавца
    async deleteSellerCover(sellerId, userId, userRole) {
        // Получаем продавца
        const seller = await this.getSellerById(sellerId, userId, userRole);

        if (!seller.coverImage) {
            throw new Error('У продавца нет cover');
        }

        const oldCoverPath = seller.coverImage;

        // Удаляем файл с диска
        const fs = await import('fs/promises');
        const path = await import('path');
        const oldFilePath = path.join(process.cwd(), 'public', oldCoverPath);

        try {
            await fs.unlink(oldFilePath);
            console.log(`🗑️  Удалён cover: ${oldCoverPath}`);
        } catch (err) {
            console.log(`⚠️  Не удалось удалить cover: ${oldCoverPath}`);
        }

        // Обновляем продавца
        return await this.updateSeller(sellerId, { coverImage: null }, userId, userRole);
    }
}

export default new SellerService();