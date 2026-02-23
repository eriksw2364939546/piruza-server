import { Category } from '../models/index.js';
import { generateSlug, generateUniqueSlug } from '../utils/slug.util.js';

class CategoryService {
    // Получить все глобальные категории
    async getGlobalCategories() {
        const categories = await Category.find({ isGlobal: true })
            .select('name slug')
            .sort({ name: 1 });

        return categories;
    }

    // Получить глобальную категорию по slug
    async getGlobalCategoryBySlug(slug) {
        const category = await Category.findOne({ slug, isGlobal: true });

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
    async updateCategory(categoryId, data) {
        const { name } = data;

        if (!name) {
            throw new Error('Название обязательно для обновления');
        }

        const category = await Category.findById(categoryId);

        if (!category) {
            throw new Error('Категория не найдена');
        }

        // Генерируем новый slug
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
        await category.save();

        return category;
    }

    // Удалить категорию
    async deleteCategory(categoryId) {
        const category = await Category.findByIdAndDelete(categoryId);

        if (!category) {
            throw new Error('Категория не найдена');
        }

        return category;
    }
}

export default new CategoryService();