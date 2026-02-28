// Middleware для валидации переходов статусов продавцов

import { Seller } from '../models/index.js';

class StatusValidationMiddleware {
    // Проверка перед активацией Manager (только draft в сроке, БЕЗ изменения дат)
    checkCanActivateManager = async (req, res, next) => {
        try {
            const { id } = req.params;

            const seller = await Seller.findById(id).populate('createdBy', '_id');

            if (!seller) {
                return res.status(404).json({
                    success: false,
                    message: 'Продавец не найден'
                });
            }

            // Проверка владения (только свои продавцы)
            if (seller.createdBy._id.toString() !== req.user.id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Доступ запрещён. Вы можете активировать только своих продавцов'
                });
            }

            // Проверка: нельзя активировать уже активного
            if (seller.status === 'active') {
                return res.status(400).json({
                    success: false,
                    message: 'Продавец уже активен'
                });
            }

            // Проверка: нельзя активировать если срок истёк
            if (!seller.activationEndDate || seller.activationEndDate <= new Date()) {
                return res.status(403).json({
                    success: false,
                    message: 'Срок действия истёк. Обратитесь к Owner/Admin для активации'
                });
            }

            // Проверка: можно активировать только draft (в рамках оплаченного периода)
            if (seller.status === 'expired') {
                return res.status(403).json({
                    success: false,
                    message: 'Продавец истёкший. Обратитесь к Owner/Admin для активации'
                });
            }

            if (seller.status === 'inactive') {
                return res.status(403).json({
                    success: false,
                    message: 'Продавец деактивирован. Обратитесь к Owner/Admin для активации'
                });
            }

            if (seller.status !== 'draft') {
                return res.status(400).json({
                    success: false,
                    message: `Невозможно активировать продавца со статусом "${seller.status}"`
                });
            }

            next();
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Ошибка проверки статуса'
            });
        }
    }

    // Проверка перед активацией Owner/Admin (можно: draft, expired, inactive)
    checkCanActivate = async (req, res, next) => {
        try {
            const { id } = req.params;

            const seller = await Seller.findById(id);

            if (!seller) {
                return res.status(404).json({
                    success: false,
                    message: 'Продавец не найден'
                });
            }

            // Проверка: нельзя активировать уже активного
            if (seller.status === 'active') {
                return res.status(400).json({
                    success: false,
                    message: 'Продавец уже активен. Используйте /extend для продления'
                });
            }

            // Можно активировать только: draft, expired, inactive
            if (!['draft', 'expired', 'inactive'].includes(seller.status)) {
                return res.status(400).json({
                    success: false,
                    message: `Невозможно активировать продавца со статусом "${seller.status}"`
                });
            }

            next();
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Ошибка проверки статуса'
            });
        }
    }

    // Проверка перед продлением (можно: active, expired)
    checkCanExtend = async (req, res, next) => {
        try {
            const { id } = req.params;

            const seller = await Seller.findById(id);

            if (!seller) {
                return res.status(404).json({
                    success: false,
                    message: 'Продавец не найден'
                });
            }

            // Можно продлить только: active, expired
            if (!['active', 'expired'].includes(seller.status)) {
                return res.status(400).json({
                    success: false,
                    message: `Невозможно продлить продавца со статусом "${seller.status}". Используйте /activate`
                });
            }

            next();
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Ошибка проверки статуса'
            });
        }
    }

    // Проверка перед деактивацией (можно: active, expired)
    checkCanDeactivate = async (req, res, next) => {
        try {
            const { id } = req.params;

            const seller = await Seller.findById(id);

            if (!seller) {
                return res.status(404).json({
                    success: false,
                    message: 'Продавец не найден'
                });
            }

            // Проверка: нельзя деактивировать уже неактивного
            if (seller.status === 'inactive') {
                return res.status(400).json({
                    success: false,
                    message: 'Продавец уже деактивирован'
                });
            }

            // Можно деактивировать только: active, expired
            if (!['active', 'expired'].includes(seller.status)) {
                return res.status(400).json({
                    success: false,
                    message: `Невозможно деактивировать продавца со статусом "${seller.status}"`
                });
            }

            next();
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Ошибка проверки статуса'
            });
        }
    }

    // Проверка перед переводом в draft (можно: active, inactive, expired)
    checkCanMoveToDraft = async (req, res, next) => {
        try {
            const { id } = req.params;

            const seller = await Seller.findById(id);

            if (!seller) {
                return res.status(404).json({
                    success: false,
                    message: 'Продавец не найден'
                });
            }

            // Проверка: нельзя перевести в draft уже draft
            if (seller.status === 'draft') {
                return res.status(400).json({
                    success: false,
                    message: 'Продавец уже в статусе draft'
                });
            }

            // Можно перевести в draft: active, inactive, expired
            if (!['active', 'inactive', 'expired'].includes(seller.status)) {
                return res.status(400).json({
                    success: false,
                    message: `Невозможно перевести в draft продавца со статусом "${seller.status}"`
                });
            }

            next();
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Ошибка проверки статуса'
            });
        }
    }
}

export default new StatusValidationMiddleware();