import productService from '../services/product.service.js';
import { success, error } from '../utils/responsehandler.util.js';

class ProductController {
    // Получить товары продавца
    async getProductsBySeller(req, res) {
        try {
            const { sellerId } = req.params;

            // Передаём userId и userRole если токен есть
            const userId = req.user?.id || null;
            const userRole = req.user?.role || null;

            const products = await productService.getProductsBySeller(sellerId, userId, userRole);

            success(res, products, 'Товары получены');
        } catch (err) {
            error(res, err.message, 500);
        }
    }

    // Получить товар по slug (внутри продавца)
    async getProductBySlug(req, res) {
        try {
            const { sellerId, slug } = req.params;

            // Передаём userId и userRole если токен есть
            const userId = req.user?.id || null;
            const userRole = req.user?.role || null;

            const product = await productService.getProductBySlug(sellerId, slug, userId, userRole);

            success(res, product, 'Товар получен');
        } catch (err) {
            error(res, err.message, 404);
        }
    }

    // Получить товар по ID
    async getProductById(req, res) {
        try {
            const { id } = req.params;

            const product = await productService.getProductById(id);

            success(res, product, 'Товар получен');
        } catch (err) {
            error(res, err.message, 404);
        }
    }

    // Создать товар
    async createProduct(req, res) {
        try {
            const product = await productService.createProduct(
                req.body,
                req.user.id,
                req.user.role
            );

            success(res, product, 'Товар создан', 201);
        } catch (err) {
            error(res, err.message, err.message === 'Доступ запрещён' ? 403 : 400);
        }
    }

    // Обновить товар
    async updateProduct(req, res) {
        try {
            const { id } = req.params;

            const product = await productService.updateProduct(
                id,
                req.body,
                req.user.id,
                req.user.role
            );

            success(res, product, 'Товар обновлён');
        } catch (err) {
            error(res, err.message, err.message === 'Доступ запрещён' ? 403 : 400);
        }
    }

    // Загрузить изображение товара (POST)
    async uploadProductImage(req, res) {
        try {
            const { id } = req.params;

            if (!req.processedImage) {
                return error(res, 'Изображение не загружено', 400);
            }

            const product = await productService.updateProduct(
                id,
                { image: req.processedImage },
                req.user.id,
                req.user.role
            );

            success(res, product, 'Изображение загружено');
        } catch (err) {
            error(res, err.message, 400);
        }
    }

    // Заменить изображение товара (PUT)
    async replaceProductImage(req, res) {
        try {
            const { id } = req.params;

            if (!req.processedImage) {
                return error(res, 'Изображение не загружено', 400);
            }

            const product = await productService.replaceProductImage(
                id,
                req.processedImage,
                req.user.id,
                req.user.role
            );

            success(res, product, 'Изображение заменено');
        } catch (err) {
            error(res, err.message, 400);
        }
    }

    // НОВОЕ: Удалить изображение товара
    async deleteProductImage(req, res) {
        try {
            const { id } = req.params;

            const product = await productService.deleteProductImage(
                id,
                req.user.id,
                req.user.role
            );

            success(res, product, 'Изображение удалено');
        } catch (err) {
            error(res, err.message, 400);
        }
    }

    // Удалить товар
    async deleteProduct(req, res) {
        try {
            const { id } = req.params;

            const product = await productService.deleteProduct(
                id,
                req.user.id,
                req.user.role
            );

            success(res, product, 'Товар удалён');
        } catch (err) {
            error(res, err.message, err.message === 'Доступ запрещён' ? 403 : 400);
        }
    }
}

export default new ProductController();