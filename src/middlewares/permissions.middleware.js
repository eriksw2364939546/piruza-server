import { Seller, Product } from '../models/index.js';

class PermissionsMiddleware {
    // Доступ только для Owner
    ownerOnly = (req, res, next) => {
        if (req.user.role !== 'owner') {
            return res.status(403).json({
                success: false,
                message: 'Доступ запрещён. Требуется роль Owner'
            });
        }
        next();
    }

    // Доступ только для Manager
    managerOnly = (req, res, next) => {
        if (req.user.role !== 'manager') {
            return res.status(403).json({
                success: false,
                message: 'Доступ запрещён. Требуется роль Manager'
            });
        }
        next();
    }

    // Доступ для Owner и Admin (НЕ для Manager)
    adminAccess = (req, res, next) => {
        if (req.user.role !== 'owner' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Доступ запрещён. Требуется роль Owner или Admin'
            });
        }
        next();
    }

    // Доступ для Owner, Admin и Manager
    managerAccess = (req, res, next) => {
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
    checkSellerOwnership = async (req, res, next) => {
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
            console.error('❌ Ошибка checkSellerOwnership:', error);
            return res.status(500).json({
                success: false,
                message: 'Ошибка проверки прав доступа'
            });
        }
    }

    // Проверка доступа к локальным категориям продавца
    checkSellerCategoryAccess = async (req, res, next) => {
        try {
            const sellerId = req.body.seller || req.params.sellerId;

            if (!sellerId) {
                return res.status(400).json({
                    success: false,
                    message: 'ID продавца не указан'
                });
            }

            // Проверяем существование продавца (для всех ролей)
            const seller = await Seller.findById(sellerId);

            if (!seller) {
                return res.status(404).json({
                    success: false,
                    message: 'Продавец не найден. Локальная категория не может существовать без продавца'
                });
            }

            // Owner и Admin могут управлять всеми локальными категориями
            if (req.user.role === 'owner' || req.user.role === 'admin') {
                return next();
            }

            // Manager может управлять только категориями СВОИХ продавцов
            if (req.user.role === 'manager') {
                // Проверка владения продавцом
                if (seller.createdBy.toString() !== req.user.id.toString()) {
                    return res.status(403).json({
                        success: false,
                        message: 'Доступ запрещён. Вы можете управлять только категориями своих продавцов'
                    });
                }

                return next();
            }

            // Если роль не определена
            return res.status(403).json({
                success: false,
                message: 'Доступ запрещён'
            });
        } catch (error) {
            console.error('❌ Ошибка checkSellerCategoryAccess:', error);
            return res.status(500).json({
                success: false,
                message: 'Ошибка проверки прав доступа к категориям'
            });
        }
    }

    // Проверка доступа к товарам продавца (для Manager)
    checkProductAccess = async (req, res, next) => {
        try {
            console.log('🔍 checkProductAccess вызван');
            console.log('   req.user.role:', req.user.role);
            console.log('   req.params:', req.params);
            console.log('   req.body:', req.body);

            // Owner и Admin могут управлять всеми товарами
            if (req.user.role === 'owner' || req.user.role === 'admin') {
                console.log('✅ Owner/Admin - доступ разрешён');
                return next();
            }

            // Manager может управлять только товарами СВОИХ продавцов
            if (req.user.role === 'manager') {
                let sellerId = (req.body && req.body.seller) || req.params.sellerId;
                console.log('   sellerId из body/params:', sellerId);

                // НОВОЕ: Если sellerId нет (например, при загрузке картинки товара),
                // получаем товар по ID и достаём seller из товара
                if (!sellerId && req.params.id) {
                    console.log('   Получаю товар по ID:', req.params.id);
                    console.log('   Product модель:', Product);

                    const product = await Product.findById(req.params.id);
                    console.log('   Найденный товар:', product);

                    if (!product) {
                        console.log('❌ Товар не найден!');
                        return res.status(404).json({
                            success: false,
                            message: 'Товар не найден'
                        });
                    }

                    sellerId = product.seller;
                    console.log('   sellerId из товара:', sellerId);
                }

                if (!sellerId) {
                    return res.status(400).json({
                        success: false,
                        message: 'ID продавца не указан'
                    });
                }

                const seller = await Seller.findById(sellerId);

                if (!seller) {
                    return res.status(404).json({
                        success: false,
                        message: 'Продавец не найден'
                    });
                }

                // Проверка владения
                if (seller.createdBy.toString() !== req.user.id.toString()) {
                    return res.status(403).json({
                        success: false,
                        message: 'Доступ запрещён. Вы можете управлять только товарами своих продавцов'
                    });
                }

                return next();
            }

            return res.status(403).json({
                success: false,
                message: 'Доступ запрещён'
            });
        } catch (error) {
            console.error('❌ Ошибка checkProductAccess:', error);
            return res.status(500).json({
                success: false,
                message: 'Ошибка проверки прав доступа к товарам'
            });
        }
    }

    // Проверка одобренной заявки для Manager (для создания продавца)
    checkApprovedRequest = async (req, res, next) => {
        try {
            const { SellerRequest } = await import('../models/index.js');

            // Owner и Admin могут создавать продавцов БЕЗ заявки
            if (req.user.role === 'owner' || req.user.role === 'admin') {
                return next();
            }

            // Manager ДОЛЖЕН иметь одобренную заявку
            if (req.user.role === 'manager') {
                // Ищем одобренную И НЕиспользованную заявку Manager'а
                const approvedRequest = await SellerRequest.findOne({
                    requestedBy: req.user.id,
                    status: 'approved',
                    isUsed: false // ВАЖНО: только неиспользованные
                }).sort({ reviewedAt: -1 }); // Последняя одобренная

                if (!approvedRequest) {
                    return res.status(403).json({
                        success: false,
                        message: 'У вас нет доступной одобренной заявки. Создайте новую заявку через /api/requests и дождитесь одобрения Owner/Admin'
                    });
                }

                // Добавляем заявку в req для использования в контроллере
                req.approvedRequest = approvedRequest;

                return next();
            }

            return res.status(403).json({
                success: false,
                message: 'Доступ запрещён'
            });
        } catch (error) {
            console.error('❌ Ошибка checkApprovedRequest:', error);
            return res.status(500).json({
                success: false,
                message: 'Ошибка проверки одобренной заявки'
            });
        }
    }
}

export default new PermissionsMiddleware();