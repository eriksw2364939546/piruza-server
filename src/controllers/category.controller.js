import categoryService from '../services/category.service.js';
import { success, error } from '../utils/responsehandler.util.js';

class CategoryController {
    // Получить все глобальные категории
    async getGlobalCategories(req, res) {
        try {
            const categories = await categoryService.getGlobalCategories();

            success(res, categories, 'Глобальные категории получены');
        } catch (err) {
            error(res, err.message, 500);
        }
    }

    // Получить глобальную категорию по slug (публично - только активные)
    async getGlobalCategoryBySlug(req, res) {
        try {
            const { slug } = req.params;

            const category = await categoryService.getGlobalCategoryBySlug(slug);

            success(res, category, 'Категория получена');
        } catch (err) {
            error(res, err.message, 404);
        }
    }

    // Получить глобальную категорию по slug (Owner - включая неактивные)
    async getGlobalCategoryBySlugAdmin(req, res) {
        try {
            const { slug } = req.params;

            const category = await categoryService.getGlobalCategoryBySlugAdmin(slug);

            success(res, category, 'Категория получена');
        } catch (err) {
            error(res, err.message, 404);
        }
    }

    // Получить категории продавца
    async getSellerCategories(req, res) {
        try {
            const { sellerId } = req.params;

            // Передаём userId и userRole если есть токен
            const userId = req.user?.id || null;
            const userRole = req.user?.role || null;

            const categories = await categoryService.getSellerCategories(sellerId, userId, userRole);

            success(res, categories, 'Категории продавца получены');
        } catch (err) {
            const statusCode = err.message.includes('не найден') ? 404 : 403;
            error(res, err.message, statusCode);
        }
    }

    // Получить категорию продавца по slug
    async getSellerCategoryBySlug(req, res) {
        try {
            const { sellerId, slug } = req.params;

            // Передаём userId и userRole если есть токен
            const userId = req.user?.id || null;
            const userRole = req.user?.role || null;

            const category = await categoryService.getSellerCategoryBySlug(sellerId, slug, userId, userRole);

            success(res, category, 'Категория продавца получена');
        } catch (err) {
            const statusCode = err.message.includes('не найден') ? 404 : 403;
            error(res, err.message, statusCode);
        }
    }

    // Создать глобальную категорию
    async createGlobalCategory(req, res) {
        try {
            const category = await categoryService.createGlobalCategory(req.body, req.user.id);

            success(res, category, 'Глобальная категория создана', 201);
        } catch (err) {
            error(res, err.message, 400);
        }
    }

    // Создать локальную категорию продавца
    async createSellerCategory(req, res) {
        try {
            const category = await categoryService.createSellerCategory(req.body, req.user.id);

            success(res, category, 'Категория продавца создана', 201);
        } catch (err) {
            error(res, err.message, 400);
        }
    }

    // Обновить категорию
    async updateCategory(req, res) {
        try {
            const { id } = req.params;

            const category = await categoryService.updateCategory(
                id,
                req.body,
                req.user.id,
                req.user.role
            );

            success(res, category, 'Категория обновлена');
        } catch (err) {
            error(res, err.message, 400);
        }
    }

    // Удалить категорию
    async deleteCategory(req, res) {
        try {
            const { id } = req.params;

            const category = await categoryService.deleteCategory(
                id,
                req.user.id,
                req.user.role
            );

            success(res, category, 'Категория удалена');
        } catch (err) {
            error(res, err.message, 400);
        }
    }

    // Получить ВСЕ глобальные категории (Owner - включая неактивные)
    async getAllGlobalCategories(req, res) {
        try {
            const categories = await categoryService.getAllGlobalCategories();

            success(res, categories, 'Все глобальные категории получены');
        } catch (err) {
            error(res, err.message, 500);
        }
    }
}

export default new CategoryController();