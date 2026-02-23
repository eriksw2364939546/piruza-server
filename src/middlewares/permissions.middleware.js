import { Seller } from '../models/index.js';

class PermissionsMiddleware {
    // Доступ только для Owner
    ownerOnly(req, res, next) {
        if (req.user.role !== 'owner') {
            return res.status(403).json({
                success: false,
                message: 'Доступ запрещён. Требуется роль Owner'
            });
        }
        next();
    }

    // Доступ для Owner и Admin (НЕ для Manager)
    adminAccess(req, res, next) {
        if (req.user.role !== 'owner' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Доступ запрещён. Требуется роль Owner или Admin'
            });
        }
        next();
    }

    // Доступ для Owner, Admin и Manager
    managerAccess(req, res, next) {
        const allowedRoles = ['owner', 'admin', 'manager'];

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Доступ запрещён'
            });
        }
        next();
    }

    // Проверка владения продавцом (для Manager)
    async checkSellerOwnership(req, res, next) {
        try {
            const sellerId = req.params.id || req.params.sellerId;

            if (!sellerId) {
                return res.status(400).json({
                    success: false,
                    message: 'ID продавца не указан'
                });
            }

            // Owner и Admin могут редактировать всех
            if (req.user.role === 'owner' || req.user.role === 'admin') {
                return next();
            }

            // Manager может редактировать только своих
            const seller = await Seller.findById(sellerId);

            if (!seller) {
                return res.status(404).json({
                    success: false,
                    message: 'Продавец не найден'
                });
            }

            if (seller.createdBy.toString() !== req.user.id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Доступ запрещён. Вы можете редактировать только своих продавцов'
                });
            }

            next();
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Ошибка проверки прав доступа'
            });
        }
    }
}

export default new PermissionsMiddleware();