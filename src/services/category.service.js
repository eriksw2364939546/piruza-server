import { Category } from '../models/index.js';
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
    async getSellerCategories(sellerId) {
        const categories = await Category.find({
            seller: sellerId,
            isGlobal: false
        })
            .select('name slug')
            .sort({ name: 1 });

        return categories;
    }

    // Получить категорию продавца по slug
    async getSellerCategoryBySlug(sellerId, slug) {
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
        const { name, seller } = data;

        // Генерируем slug
        const baseSlug = generateSlug(name);

        // Проверяем уникальность внутри продавца
        let slug = baseSlug;
        let counter = 1;
        while (await Category.findOne({ slug, seller, isGlobal: false })) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }

        const category = new Category({
            name,
            slug,
            isGlobal: false,
            seller,
            createdBy: userId
        });

        await category.save();
        return category;
    }

    // Обновить категорию
    async updateCategory(categoryId, data, userId, userRole) {
        const { name, description } = data;

        if (!name && !description) {
            throw new Error('Название или описание обязательно для обновления');
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
            // Owner/Admin могут обновлять любые локальные
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

                    // Проверка статуса продавца
                    if (seller.status !== 'active') {
                        throw new Error('Продавец должен быть одобрен Owner/Admin для управления категориями');
                    }
                }
            }
        }

        // Если обновляется название - генерируем новый slug
        if (name) {
            const baseSlug = generateSlug(name);

            // Проверяем уникальность
            let slug = baseSlug;
            let counter = 1;

            if (category.isGlobal) {
                // Для глобальных
                while (await Category.findOne({
                    slug,
                    isGlobal: true,
                    _id: { $ne: categoryId }
                })) {
                    slug = `${baseSlug}-${counter}`;
                    counter++;
                }
            } else {
                // Для локальных (внутри продавца)
                while (await Category.findOne({
                    slug,
                    seller: category.seller,
                    isGlobal: false,
                    _id: { $ne: categoryId }
                })) {
                    slug = `${baseSlug}-${counter}`;
                    counter++;
                }
            }

            category.name = name;
            category.slug = slug;
        }

        // Обновляем описание если передано
        if (description !== undefined) {
            category.description = description;
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
            // Owner/Admin могут удалять любые локальные
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

                // Проверка статуса продавца
                if (seller.status !== 'active') {
                    throw new Error('Продавец должен быть одобрен Owner/Admin для управления категориями');
                }

                await Category.findByIdAndDelete(categoryId);
                return category;
            }
        }

        // Если дошли сюда - удаляем (Owner удаляет глобальную)
        await Category.findByIdAndDelete(categoryId);
        return category;
    }

    // Переключить статус категории (Owner only для глобальных)
    async toggleCategoryStatus(categoryId) {
        const category = await Category.findById(categoryId);

        if (!category) {
            throw new Error('Категория не найдена');
        }

        category.isActive = !category.isActive;
        await category.save();

        return category;
    }
}

export default new CategoryService();