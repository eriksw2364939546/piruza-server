// Middleware для защиты статических файлов (картинок)

import { Seller, Product } from '../models/index.js';
import { verifyToken } from '../utils/jwt.util.js';
import path from 'path';
import fs from 'fs/promises';

class StaticFilesMiddleware {
    // Middleware для защиты файлов продавцов
    protectSellerFiles = async (req, res, next) => {
        try {
            // Извлекаем filename из пути
            // req.path = /sellers/uuid.webp
            const filename = req.path.replace('/sellers/', '');
            const filepath = `/uploads/sellers/${filename}`;

            // Ищем продавца по logo или coverImage
            const seller = await Seller.findOne({
                $or: [
                    { logo: filepath },
                    { coverImage: filepath }
                ]
            }).populate('createdBy', '_id');

            if (!seller) {
                return res.status(404).json({
                    success: false,
                    message: 'Файл не найден'
                });
            }

            // Проверяем токен (опционально)
            const token = req.headers.authorization?.split(' ')[1];
            let userRole = null;
            let userId = null;

            if (token) {
                try {
                    const decoded = verifyToken(token);
                    userRole = decoded.role;
                    userId = decoded.userId;
                } catch (err) {
                    // Невалидный токен - игнорируем, продолжаем как публичный
                }
            }

            // Применяем логику доступа
            const canAccess = this.checkSellerAccess(seller, userId, userRole);

            if (!canAccess) {
                return res.status(403).json({
                    success: false,
                    message: 'Доступ к файлу запрещён'
                });
            }

            // Доступ разрешён - отдаём файл
            next();
        } catch (error) {
            console.error('❌ Ошибка protectSellerFiles:', error);
            return res.status(500).json({
                success: false,
                message: 'Ошибка доступа к файлу'
            });
        }
    }

    // Middleware для защиты файлов товаров
    protectProductFiles = async (req, res, next) => {
        try {
            // Извлекаем filename из пути
            // req.path = /products/uuid.webp
            const filename = req.path.replace('/products/', '');
            const filepath = `/uploads/products/${filename}`;

            // Ищем товар по image
            const product = await Product.findOne({ image: filepath })
                .populate({
                    path: 'seller',
                    populate: { path: 'createdBy', select: '_id' }
                });

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Файл не найден'
                });
            }

            const seller = product.seller;

            // Проверяем токен (опционально)
            const token = req.headers.authorization?.split(' ')[1];
            let userRole = null;
            let userId = null;

            if (token) {
                try {
                    const decoded = verifyToken(token);
                    userRole = decoded.role;
                    userId = decoded.userId;
                } catch (err) {
                    // Невалидный токен - игнорируем
                }
            }

            // Применяем логику доступа (проверяем продавца товара)
            const canAccess = this.checkSellerAccess(seller, userId, userRole);

            if (!canAccess) {
                return res.status(403).json({
                    success: false,
                    message: 'Доступ к файлу запрещён'
                });
            }

            // Доступ разрешён - отдаём файл
            next();
        } catch (error) {
            console.error('❌ Ошибка protectProductFiles:', error);
            return res.status(500).json({
                success: false,
                message: 'Ошибка доступа к файлу'
            });
        }
    }

    // Общая логика проверки доступа к продавцу
    checkSellerAccess(seller, userId, userRole) {
        // Если НЕТ токена (публичный доступ) - только active
        if (!userId || !userRole) {
            return seller.status === 'active' && seller.activationEndDate > new Date();
        }

        // Owner/Admin видят всё
        if (userRole === 'owner' || userRole === 'admin') {
            return true;
        }

        // Manager видит СВОИХ (любой статус) + ЧУЖИХ (только active)
        if (userRole === 'manager') {
            const isOwner = seller.createdBy._id.toString() === userId.toString();

            if (isOwner) {
                // Свой продавец - любой статус
                return true;
            } else {
                // Чужой продавец - только active
                return seller.status === 'active' && seller.activationEndDate > new Date();
            }
        }

        return false;
    }
}

export default new StaticFilesMiddleware();