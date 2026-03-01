import { Category, Seller } from '../models/index.js';
import { generateSlug, generateUniqueSlug } from '../utils/slug.util.js';

class CategoryService {
    // Получить все глобальные категории (публично - только активные)
    async getGlobalCategories() {
        const categories = await Category.find({
            isGlobal: true,
            isActive: true // Показываем только активные
        })
            .select('name slug description')
            .sort({ name: 1 });

        return categories;
    }

    // Получить ВСЕ глобальные категории (Owner - включая неактивные)
    async getAllGlobalCategories() {
        const categories = await Category.find({ isGlobal: true })
            .select('name slug description isActive')
            .sort({ name: 1 });

        return categories;
    }

    // Получить глобальную категорию по slug (публично - только активные)
    async getGlobalCategoryBySlug(slug) {
        const category = await Category.findOne({
            slug,
            isGlobal: true,
            isActive: true // Только активные
        });

        if (!category) {
            throw new Error('Глобальная категория не найдена');
        }

        return category;
    }

    // Получить глобальную категорию по slug (Owner - включая неактивные)
    async getGlobalCategoryBySlugAdmin(slug) {
        const category = await Category.findOne({
            slug,
            isGlobal: true
        });

        if (!category) {
            throw new Error('Глобальная категория не найдена');
        }

        return category;
    }

    // Получить категории продавца
    // Получить категории продавца
    // Публично: только если продавец active
    // Owner/Admin: все
    // Manager: свои (любой статус)
    async getSellerCategories(sellerId, userId = null, userRole = null) {
        // Проверяем продавца
        const seller = await Seller.findById(sellerId).populate('createdBy', '_id');

        if (!seller) {
            throw new Error('Продавец не найден');
        }

        // Если НЕТ токена (публичный доступ) - только active продавцы
        if (!userId || !userRole) {
            if (seller.status !== 'active' || seller.activationEndDate <= new Date()) {
                throw new Error('Продавец не найден или неактивен');
            }
        }
        // Owner/Admin видят всех
        else if (userRole !== 'owner' && userRole !== 'admin') {
            // Manager видит только своих
            if (userRole === 'manager') {
                const isOwner = seller.createdBy._id.toString() === userId.toString();

                if (!isOwner) {
                    // Чужой продавец - только active
                    if (seller.status !== 'active' || seller.activationEndDate <= new Date()) {
                        throw new Error('Доступ запрещён');
                    }
                }
            }
        }

        const categories = await Category.find({
            seller: sellerId,
            isGlobal: false
        })
            .select('name slug')
            .sort({ name: 1 });

        return categories;
    }

    // Получить категорию продавца по slug
    // Публично: только если продавец active
    // Owner/Admin: все
    // Manager: свои (любой статус)
    async getSellerCategoryBySlug(sellerId, slug, userId = null, userRole = null) {
        // Проверяем продавца
        const seller = await Seller.findById(sellerId).populate('createdBy', '_id');

        if (!seller) {
            throw new Error('Продавец не найден');
        }

        // Если НЕТ токена (публичный доступ) - только active продавцы
        if (!userId || !userRole) {
            if (seller.status !== 'active' || seller.activationEndDate <= new Date()) {
                throw new Error('Продавец не найден или неактивен');
            }
        }
        // Owner/Admin видят всех
        else if (userRole !== 'owner' && userRole !== 'admin') {
            // Manager видит только своих
            if (userRole === 'manager') {
                const isOwner = seller.createdBy._id.toString() === userId.toString();

                if (!isOwner) {
                    // Чужой продавец - только active
                    if (seller.status !== 'active' || seller.activationEndDate <= new Date()) {
                        throw new Error('Доступ запрещён');
                    }
                }
            }
        }

        const category = await Category.findOne({
            seller: sellerId,
            slug,
            isGlobal: false
        });

        if (!category) {
            throw new Error('Категория продавца не найдена');
        }

        return category;
    }

    // Создать глобальную категорию
    async createGlobalCategory(data, userId) {
        const { name } = data;

        // Генерируем slug
        const baseSlug = generateSlug(name);

        // Проверяем уникальность среди глобальных категорий
        let slug = baseSlug;
        let counter = 1;
        while (await Category.findOne({ slug, isGlobal: true })) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }

        const category = new Category({
            name,
            slug,
            isGlobal: true,
            seller: null,
            createdBy: userId
        });

        await category.save();
        return category;
    }

    // Создать локальную категорию продавца
    async createSellerCategory(data, userId) {
        const { name, seller, description } = data;

        // Проверяем существование продавца
        const sellerDoc = await Seller.findById(seller);

        if (!sellerDoc) {
            throw new Error('Продавец не найден. Локальная категория не может существовать без продавца');
        }

        // НОВОЕ: Проверка статуса продавца - можно создавать/редактировать ТОЛЬКО у draft
        if (sellerDoc.status !== 'draft') {
            throw new Error(`Невозможно создать категорию. Продавец должен быть в статусе draft. Текущий статус: ${sellerDoc.status}`);
        }

        // Генерируем slug
        const baseSlug = generateSlug(name);

        // НОВОЕ: Проверяем уникальность БЕЗ автодобавления -1
        const existingCategory = await Category.findOne({
            slug: baseSlug,
            seller,
            isGlobal: false
        });

        if (existingCategory) {
            throw new Error(`Категория с названием "${name}" уже существует у этого продавца`);
        }

        const category = new Category({
            name,
            slug: baseSlug,
            description,
            isGlobal: false,
            isActive: true, // Локальные категории сразу активны
            seller,
            createdBy: userId
        });

        await category.save();
        return category;
    }

    // Обновить категорию
    async updateCategory(categoryId, data, userId, userRole) {
        const { name, description, isActive } = data;

        if (!name && !description && isActive === undefined) {
            throw new Error('Название, описание или статус обязательно для обновления');
        }

        const category = await Category.findById(categoryId).populate('seller');

        if (!category) {
            throw new Error('Категория не найдена');
        }

        // Если глобальная категория - только Owner
        if (category.isGlobal && userRole !== 'owner') {
            throw new Error('Только Owner может обновлять глобальные категории');
        }

        // Если локальная категория
        if (!category.isGlobal) {
            // НОВОЕ: Проверка статуса продавца - редактировать можно ТОЛЬКО draft (для ВСЕХ ролей)
            if (category.seller) {
                const sellerDoc = await Seller.findById(category.seller);

                if (sellerDoc && sellerDoc.status !== 'draft') {
                    throw new Error(`Невозможно обновить категорию. Продавец должен быть в статусе draft для редактирования. Текущий статус: ${sellerDoc.status}. Сначала переведите продавца в draft`);
                }
            }

            // Owner/Admin могут обновлять любые локальные (но только у draft продавцов)
            if (userRole !== 'owner' && userRole !== 'admin') {
                // Manager может обновлять только свои локальные
                if (userRole === 'manager') {
                    if (!category.seller) {
                        throw new Error('Категория не привязана к продавцу');
                    }

                    const seller = category.seller;

                    // Проверка владения продавцом
                    if (seller.createdBy.toString() !== userId.toString()) {
                        throw new Error('Доступ запрещён. Вы можете обновлять только категории своих продавцов');
                    }
                }
            }
        }

        // Если обновляется название - генерируем новый slug
        if (name) {
            const baseSlug = generateSlug(name);

            if (category.isGlobal) {
                // Для глобальных - проверяем уникальность БЕЗ автодобавления
                const existing = await Category.findOne({
                    slug: baseSlug,
                    isGlobal: true,
                    _id: { $ne: categoryId }
                });

                if (existing) {
                    throw new Error(`Глобальная категория с названием "${name}" уже существует`);
                }

                category.slug = baseSlug;
            } else {
                // Для локальных - проверяем уникальность внутри продавца БЕЗ автодобавления
                const existing = await Category.findOne({
                    slug: baseSlug,
                    seller: category.seller,
                    isGlobal: false,
                    _id: { $ne: categoryId }
                });

                if (existing) {
                    throw new Error(`Категория с названием "${name}" уже существует у этого продавца`);
                }

                category.slug = baseSlug;
            }

            category.name = name;
        }

        // Обновляем описание если передано
        if (description !== undefined) {
            category.description = description;
        }

        // НОВОЕ: Обновляем isActive если передано (только Owner для глобальных)
        if (isActive !== undefined) {
            if (category.isGlobal && userRole !== 'owner') {
                throw new Error('Только Owner может изменять статус глобальных категорий');
            }

            // НОВОЕ: Если ГЛОБАЛЬНАЯ категория деактивируется
            // → переводим ВСЕ продавцы с этой категорией (ВО ВСЕХ ГОРОДАХ) в draft
            if (category.isGlobal && isActive === false) {
                const { Seller } = await import('../models/index.js');

                const result = await Seller.updateMany(
                    {
                        globalCategories: categoryId,
                        status: { $in: ['active', 'expired', 'inactive'] }
                    },
                    {
                        $set: { status: 'draft' }
                    }
                );

                console.log(`🔴 Глобальная категория "${category.name}" деактивирована. Переведено в draft: ${result.modifiedCount} продавцов (во всех городах)`);
            }

            // НОВОЕ: Если ГЛОБАЛЬНАЯ категория активируется
            // → продавцы остаются в draft, Owner/Admin должны вручную активировать
            if (category.isGlobal && isActive === true) {
                console.log(`🟢 Глобальная категория "${category.name}" активирована. Продавцы остаются в draft`);
            }

            category.isActive = isActive;
        }

        await category.save();

        return category;
    }

    // Удалить категорию
    async deleteCategory(categoryId, userId, userRole) {
        const category = await Category.findById(categoryId).populate('seller');

        if (!category) {
            throw new Error('Категория не найдена');
        }

        // Если глобальная категория - только Owner
        if (category.isGlobal && userRole !== 'owner') {
            throw new Error('Только Owner может удалять глобальные категории');
        }

        // Если локальная категория
        if (!category.isGlobal) {
            // НОВОЕ: Проверка статуса продавца - удалять можно ТОЛЬКО у draft (для ВСЕХ ролей)
            if (category.seller) {
                const sellerDoc = await Seller.findById(category.seller);

                if (sellerDoc && sellerDoc.status !== 'draft') {
                    throw new Error(`Невозможно удалить категорию. Продавец должен быть в статусе draft. Текущий статус: ${sellerDoc.status}. Сначала переведите продавца в draft`);
                }
            }

            // Owner/Admin могут удалять любые локальные (но только у draft продавцов)
            if (userRole === 'owner' || userRole === 'admin') {
                await Category.findByIdAndDelete(categoryId);
                return category;
            }

            // Manager может удалять только свои локальные
            if (userRole === 'manager') {
                if (!category.seller) {
                    throw new Error('Категория не привязана к продавцу');
                }

                const seller = category.seller;

                // Проверка владения продавцом
                if (seller.createdBy.toString() !== userId.toString()) {
                    throw new Error('Доступ запрещён. Вы можете удалять только категории своих продавцов');
                }

                await Category.findByIdAndDelete(categoryId);
                return category;
            }
        }

        // Если дошли сюда - удаляем (Owner удаляет глобальную)
        await Category.findByIdAndDelete(categoryId);
        return category;
    }
}

export default new CategoryService();