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

    // Проверка владения продавцом
    async checkSellerOwnership(req, res, next) {
        try {
            const sellerId = req.params.id || req.params.sellerId;

            if (!sellerId) {
                return res.status(400).json({
                    success: false,
                    message: 'ID продавца не указан'
                });
            }

            // Owner проходит без проверок
            if (req.user.role === 'owner') {
                return next();
            }

            // НОВОЕ: Для Admin/Manager - загружаем с проверкой активности
            const seller = await Seller.findById(sellerId)
                .populate('city', 'name slug isActive')
                .populate('globalCategories', 'name slug isActive');

            if (!seller) {
                return res.status(404).json({
                    success: false,
                    message: 'Продавец не найден'
                });
            }

            // НОВОЕ: Проверка активности города для Admin/Manager
            if (!seller.city || !seller.city.isActive) {
                return res.status(403).json({
                    success: false,
                    message: 'Доступ запрещён. Город продавца неактивен. Обратитесь к Owner'
                });
            }

            // НОВОЕ: Проверка активности категорий для Admin/Manager
            if (!seller.globalCategories || seller.globalCategories.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: 'Доступ запрещён. У продавца нет глобальных категорий'
                });
            }

            const inactiveCategories = seller.globalCategories.filter(cat => !cat.isActive);
            // console.log('🔍 city:', seller.city);
            // console.log('🔍 globalCategories:', JSON.stringify(seller.globalCategories));
            // console.log('🔍 inactiveCategories:', inactiveCategories)
            if (inactiveCategories.length > 0) {
                const names = inactiveCategories.map(c => c.name).join(', ');
                return res.status(403).json({
                    success: false,
                    message: `Доступ запрещён. Неактивные категории: ${names}. Обратитесь к Owner`
                });
            }

            // Проверка для Manager - только свои продавцы
            if (req.user.role === 'manager') {
                if (seller.createdBy.toString() !== req.user.id.toString()) {
                    return res.status(403).json({
                        success: false,
                        message: 'Доступ запрещён. Вы можете редактировать только своих продавцов'
                    });
                }
            }

            next();
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Ошибка проверки прав доступа'
            });
        }
    }

    // Проверка доступа к локальным категориям продавца
    async checkSellerCategoryAccess(req, res, next) {
        try {
            const sellerId = req.body.seller || req.params.sellerId;

            if (!sellerId) {
                return res.status(400).json({
                    success: false,
                    message: 'ID продавца не указан'
                });
            }

            // ВАЖНО: Owner проходит БЕЗ ПРОВЕРОК (ДО загрузки seller!)
            if (req.user.role === 'owner') {
                return next();
            }

            // Для Admin/Manager - загружаем и проверяем продавца
            const seller = await Seller.findById(sellerId)
                .populate('city', 'name slug isActive')
                .populate('globalCategories', 'name slug isActive');

            if (!seller) {
                return res.status(404).json({
                    success: false,
                    message: 'Продавец не найден'
                });
            }

            // Проверка активности города
            if (!seller.city || !seller.city.isActive) {
                return res.status(403).json({
                    success: false,
                    message: 'Доступ запрещён. Город продавца неактивен. Обратитесь к Owner'
                });
            }

            // Проверка активности категорий
            if (!seller.globalCategories || seller.globalCategories.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: 'Доступ запрещён. У продавца нет глобальных категорий'
                });
            }

            const inactiveCategories = seller.globalCategories.filter(cat => !cat.isActive);
            if (inactiveCategories.length > 0) {
                const names = inactiveCategories.map(c => c.name).join(', ');
                return res.status(403).json({
                    success: false,
                    message: `Доступ запрещён. Неактивные категории: ${names}. Обратитесь к Owner`
                });
            }

            // Проверка для Manager - только свои продавцы
            if (req.user.role === 'manager') {
                if (seller.createdBy.toString() !== req.user.id.toString()) {
                    return res.status(403).json({
                        success: false,
                        message: 'Доступ запрещён. Вы можете работать только со своими продавцами'
                    });
                }
            }

            next();
        } catch (error) {
            console.error('checkSellerCategoryAccess error:', error);
            return res.status(500).json({
                success: false,
                message: 'Ошибка проверки прав доступа'
            });
        }
    }

    // Проверка доступа к товарам продавца
    async checkProductAccess(req, res, next) {
        try {
            let sellerId;

            console.log('🔍 checkProductAccess START');
            console.log('  Method:', req.method);
            console.log('  URL:', req.url);
            console.log('  Params:', req.params);
            console.log('  Body:', req.body);

            // ИСПРАВЛЕНО: Если создание товара (POST на /products БЕЗ :id)
            if (req.method === 'POST' && !req.params.id) {
                sellerId = req.body.seller;
                console.log('  POST request (create) - sellerId from body:', sellerId);
            } else {
                // Если редактирование/удаление/загрузка изображения - находим товар
                const productId = req.params.id;
                console.log('  Request with productId:', productId);

                if (!productId) {
                    console.log('  ❌ productId is missing');
                    return res.status(400).json({
                        success: false,
                        message: 'ID товара не указан'
                    });
                }

                const product = await Product.findById(productId);
                console.log('  Product found:', product ? 'YES' : 'NO');

                if (product) {
                    console.log('  Product details:', {
                        _id: product._id,
                        name: product.name,
                        seller: product.seller,
                        sellerType: typeof product.seller
                    });
                }

                if (!product) {
                    console.log('  ❌ Product not found');
                    return res.status(404).json({
                        success: false,
                        message: 'Товар не найден'
                    });
                }

                sellerId = product.seller;
                console.log('  sellerId from product:', sellerId);
            }

            console.log('  Final sellerId:', sellerId);

            if (!sellerId) {
                console.log('  ❌ sellerId is missing');
                return res.status(400).json({
                    success: false,
                    message: 'ID продавца не указан'
                });
            }

            // ВАЖНО: Owner проходит БЕЗ ПРОВЕРОК
            if (req.user.role === 'owner') {
                console.log('  ✅ Owner bypass - no checks');
                return next();
            }

            console.log('  Loading seller with id:', sellerId);

            // Для Admin/Manager - загружаем и проверяем продавца
            const seller = await Seller.findById(sellerId)
                .populate('city', 'name slug isActive')
                .populate('globalCategories', 'name slug isActive');

            console.log('  Seller found:', seller ? 'YES' : 'NO');

            if (!seller) {
                console.log('  ❌ Seller not found');
                return res.status(404).json({
                    success: false,
                    message: 'Продавец не найден'
                });
            }

            console.log('  Seller city:', seller.city);
            console.log('  Seller categories:', seller.globalCategories);

            // Проверка активности города
            if (!seller.city || !seller.city.isActive) {
                console.log('  ❌ City is inactive');
                return res.status(403).json({
                    success: false,
                    message: 'Доступ запрещён. Город продавца неактивен. Обратитесь к Owner'
                });
            }

            // Проверка активности категорий
            if (!seller.globalCategories || seller.globalCategories.length === 0) {
                console.log('  ❌ No global categories');
                return res.status(403).json({
                    success: false,
                    message: 'Доступ запрещён. У продавца нет глобальных категорий'
                });
            }

            const inactiveCategories = seller.globalCategories.filter(cat => !cat.isActive);
            if (inactiveCategories.length > 0) {
                const names = inactiveCategories.map(c => c.name).join(', ');
                console.log('  ❌ Inactive categories:', names);
                return res.status(403).json({
                    success: false,
                    message: `Доступ запрещён. Неактивные категории: ${names}. Обратитесь к Owner`
                });
            }

            // Проверка для Manager - только свои продавцы
            if (req.user.role === 'manager') {
                if (seller.createdBy.toString() !== req.user.id.toString()) {
                    console.log('  ❌ Manager access denied - not their seller');
                    return res.status(403).json({
                        success: false,
                        message: 'Доступ запрещён. Вы можете работать только со своими продавцами'
                    });
                }
            }

            console.log('  ✅ All checks passed');
            next();
        } catch (error) {
            console.error('❌ checkProductAccess error:', error);
            console.error('Error stack:', error.stack);
            return res.status(500).json({
                success: false,
                message: 'Ошибка проверки прав доступа'
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