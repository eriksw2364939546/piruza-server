// Middleware для проверки существования изображения ПЕРЕД загрузкой

import { Seller, Product } from '../models/index.js';

class CheckImageMiddleware {
    // Проверка logo продавца (для POST)
    checkSellerLogoNotExists = async (req, res, next) => {
        try {
            const { id } = req.params;

            const seller = await Seller.findById(id);

            if (!seller) {
                return res.status(404).json({
                    success: false,
                    message: 'Продавец не найден'
                });
            }

            if (seller.logo) {
                return res.status(400).json({
                    success: false,
                    message: 'Logo уже существует. Используйте PUT для замены'
                });
            }

            next();
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Ошибка проверки logo'
            });
        }
    }

    // Проверка logo продавца (для PUT)
    checkSellerLogoExists = async (req, res, next) => {
        try {
            const { id } = req.params;

            const seller = await Seller.findById(id);

            if (!seller) {
                return res.status(404).json({
                    success: false,
                    message: 'Продавец не найден'
                });
            }

            if (!seller.logo) {
                return res.status(400).json({
                    success: false,
                    message: 'Logo не существует. Используйте POST для первой загрузки'
                });
            }

            next();
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Ошибка проверки logo'
            });
        }
    }

    // Проверка cover продавца (для POST)
    checkSellerCoverNotExists = async (req, res, next) => {
        try {
            const { id } = req.params;

            const seller = await Seller.findById(id);

            if (!seller) {
                return res.status(404).json({
                    success: false,
                    message: 'Продавец не найден'
                });
            }

            if (seller.coverImage) {
                return res.status(400).json({
                    success: false,
                    message: 'Cover уже существует. Используйте PUT для замены'
                });
            }

            next();
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Ошибка проверки cover'
            });
        }
    }

    // Проверка cover продавца (для PUT)
    checkSellerCoverExists = async (req, res, next) => {
        try {
            const { id } = req.params;

            const seller = await Seller.findById(id);

            if (!seller) {
                return res.status(404).json({
                    success: false,
                    message: 'Продавец не найден'
                });
            }

            if (!seller.coverImage) {
                return res.status(400).json({
                    success: false,
                    message: 'Cover не существует. Используйте POST для первой загрузки'
                });
            }

            next();
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Ошибка проверки cover'
            });
        }
    }

    // Проверка image товара (для POST)
    checkProductImageNotExists = async (req, res, next) => {
        try {
            const { id } = req.params;

            const product = await Product.findById(id);

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Товар не найден'
                });
            }

            if (product.image) {
                return res.status(400).json({
                    success: false,
                    message: 'Изображение уже существует. Используйте PUT для замены'
                });
            }

            next();
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Ошибка проверки изображения'
            });
        }
    }

    // Проверка image товара (для PUT)
    checkProductImageExists = async (req, res, next) => {
        try {
            const { id } = req.params;

            const product = await Product.findById(id);

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Товар не найден'
                });
            }

            if (!product.image) {
                return res.status(400).json({
                    success: false,
                    message: 'Изображение не существует. Используйте POST для первой загрузки'
                });
            }

            next();
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Ошибка проверки изображения'
            });
        }
    }
}

export default new CheckImageMiddleware();