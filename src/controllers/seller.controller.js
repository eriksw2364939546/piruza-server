import sellerService from '../services/seller.service.js';
import { success, error } from '../utils/responsehandler.util.js';
import { getPaginationParams } from '../utils/pagination.util.js';
import {
    sendActivationEmail,
    sendActivationEmailToSeller,
    sendActivationNotificationToOwner,
    sendActivationNotificationToCreator,
    sendExtensionEmail,
    sendExtensionEmailToSeller,
    sendExtensionNotificationToOwner,
    sendExtensionNotificationToCreator
} from '../utils/email.util.js';
import { getUserEmail, getUserName, decryptField } from '../helpers/decrypt.helper.js';

class SellerController {
    // Получить всех продавцов (Owner/Admin видят всех, Manager только своих)
    async getAllSellers(req, res) {
        try {
            const filters = {
                query: req.query.query,
                status: req.query.status,
                city: req.query.city,
                category: req.query.category,
                mine: req.query.mine,
            };

            const { page, limit } = getPaginationParams(req.query);

            const result = await sellerService.getAllSellers(
                filters,
                req.user.id,
                req.user.role,
                page,
                limit
            );

            success(res, result.data, 'Продавцы получены', 200, result.pagination);
        } catch (err) {
            error(res, err.message, 500);
        }
    }

    // Получить продавцов конкретного Manager'а (для Owner/Admin)
    async getSellersByManager(req, res) {
        try {
            const { managerId } = req.params;
            const { page, limit } = getPaginationParams(req.query);

            const result = await sellerService.getSellersByManager(managerId, page, limit);

            success(res, result.data, 'Продавцы Manager получены', 200, result.pagination);
        } catch (err) {
            error(res, err.message, 500);
        }
    }

    // Универсальный публичный endpoint с query параметрами
    // Универсальный публичный endpoint с query параметрами
    async getPublicSellersUniversal(req, res) {
        try {
            const { city, category, page, limit, query, sort } = req.query;
            const { page: p, limit: l } = getPaginationParams(req.query);

            const result = await sellerService.getPublicSellersUniversal(
                city || null,
                category || null,
                p,
                l,
                query || '',
                sort || ''
            );

            const message = result.pagination.total === 0
                ? '0 продавцов'
                : `${result.pagination.total} продавцов`;

            success(res, result.data, message, 200, result.pagination);
        } catch (err) {
            const statusCode = err.message.includes('не найден') ? 404 : 500;
            error(res, err.message, statusCode);
        }
    }

    // Получить ВСЕ активные продавцы (публично)
    async getActiveSellers(req, res) {
        try {
            const { category } = req.query;
            const { page, limit } = getPaginationParams(req.query);

            const result = await sellerService.getActiveSellers(category, page, limit);

            const message = result.pagination.total === 0 ? '0 продавцов' : `${result.pagination.total} активных продавцов`;

            success(res, result.data, message, 200, result.pagination);
        } catch (err) {
            error(res, err.message, 500);
        }
    }

    // Получить активных продавцов по slug города (публично)
    async getSellersByCitySlug(req, res) {
        try {
            const { slug } = req.params;
            const { category } = req.query;
            const { page, limit } = getPaginationParams(req.query);

            const result = await sellerService.getSellersByCitySlug(slug, category, page, limit);

            const message = result.pagination.total === 0 ? '0 продавцов' : `${result.pagination.total} продавцов`;

            success(res, result.data, message, 200, result.pagination);
        } catch (err) {
            const statusCode = err.message.includes('не найден') ? 404 : 500;
            error(res, err.message, statusCode);
        }
    }

    // Получить публичных продавцов (только active)
    async getPublicSellers(req, res) {
        try {
            const { cityId } = req.params;
            const { category } = req.query;
            const { page, limit } = getPaginationParams(req.query);

            // Передаём userId и userRole если есть токен
            const userId = req.user?.id || null;
            const userRole = req.user?.role || null;

            const result = await sellerService.getPublicSellers(cityId, category, userId, userRole, page, limit);

            // НОВОЕ: Если массив пустой → сообщение "0 продавцов"
            const message = result.pagination.total === 0 ? '0 продавцов' : 'Продавцы получены';

            success(res, result.data, message, 200, result.pagination);
        } catch (err) {
            // Если ошибка "Такого города нет" → 404
            const statusCode = err.message === 'Такого города нет' ? 404 : 500;
            error(res, err.message, statusCode);
        }
    }

    // Получить продавца по slug
    async getSellerBySlug(req, res) {
        try {
            const { slug } = req.params;

            // Передаём userId и userRole если токен есть
            const userId = req.user?.id || null;
            const userRole = req.user?.role || null;

            const seller = await sellerService.getSellerBySlug(slug, userId, userRole);

            success(res, seller, 'Продавец получен');
        } catch (err) {
            error(res, err.message, 404);
        }
    }

    // Получить продавца по ID
    async getSellerById(req, res) {
        try {
            const { id } = req.params;

            const seller = await sellerService.getSellerById(
                id,
                req.user.id,
                req.user.role
            );

            success(res, seller, 'Продавец получен');
        } catch (err) {
            error(res, err.message, err.message === 'Доступ запрещён' ? 403 : 404);
        }
    }

    // Создать продавца (после одобрения заявки)
    async createSeller(req, res) {
        try {
            const seller = await sellerService.createSeller(
                req.body,
                req.user.id,
                req.user.role
            );

            // НОВОЕ: Помечаем заявку как использованную (только для Manager)
            if (req.user.role === 'manager' && req.approvedRequest) {
                const { SellerRequest } = await import('../models/index.js');

                req.approvedRequest.isUsed = true;
                req.approvedRequest.usedAt = new Date();
                await req.approvedRequest.save();

                console.log(`✅ Заявка ${req.approvedRequest._id} помечена как использованная`);
            }

            success(res, seller, 'Продавец создан', 201);
        } catch (err) {
            console.error('❌ Ошибка создания продавца:', err);
            error(res, err.message, 400);
        }
    }

    // Обновить продавца
    async updateSeller(req, res) {
        try {
            const { id } = req.params;

            const seller = await sellerService.updateSeller(
                id,
                req.body,
                req.user.id,
                req.user.role
            );

            success(res, seller, 'Продавец обновлён');
        } catch (err) {
            error(res, err.message, err.message === 'Доступ запрещён' ? 403 : 400);
        }
    }

    // Обновить глобальные категории
    async updateSellerGlobalCategories(req, res) {
        try {
            const { id } = req.params;
            const { globalCategories } = req.body;

            const seller = await sellerService.updateSellerGlobalCategories(
                id,
                globalCategories,
                req.user.id,
                req.user.role
            );

            success(res, seller, 'Категории обновлены');
        } catch (err) {
            error(res, err.message, err.message === 'Доступ запрещён' ? 403 : 400);
        }
    }

    // Загрузить logo (POST)
    async uploadSellerLogo(req, res) {
        try {
            const { id } = req.params;

            if (!req.processedImage) {
                return error(res, 'Изображение не загружено', 400);
            }

            const seller = await sellerService.updateSeller(
                id,
                { logo: req.processedImage },
                req.user.id,
                req.user.role
            );

            success(res, seller, 'Logo загружен');
        } catch (err) {
            error(res, err.message, 400);
        }
    }

    // Заменить logo (PUT)
    async replaceSellerLogo(req, res) {
        try {
            const { id } = req.params;

            if (!req.processedImage) {
                return error(res, 'Изображение не загружено', 400);
            }

            const seller = await sellerService.replaceSellerLogo(
                id,
                req.processedImage,
                req.user.id,
                req.user.role
            );

            success(res, seller, 'Logo заменён');
        } catch (err) {
            error(res, err.message, 400);
        }
    }

    // Удалить logo (DELETE)
    async deleteSellerLogo(req, res) {
        try {
            const { id } = req.params;

            const seller = await sellerService.deleteSellerLogo(
                id,
                req.user.id,
                req.user.role
            );

            success(res, seller, 'Logo удалён');
        } catch (err) {
            error(res, err.message, 400);
        }
    }

    // Загрузить cover (POST)
    async uploadSellerCover(req, res) {
        try {
            const { id } = req.params;

            if (!req.processedImage) {
                return error(res, 'Изображение не загружено', 400);
            }

            const seller = await sellerService.updateSeller(
                id,
                { coverImage: req.processedImage },
                req.user.id,
                req.user.role
            );

            success(res, seller, 'Cover загружен');
        } catch (err) {
            error(res, err.message, 400);
        }
    }

    // Заменить cover (PUT)
    async replaceSellerCover(req, res) {
        try {
            const { id } = req.params;

            if (!req.processedImage) {
                return error(res, 'Изображение не загружено', 400);
            }

            const seller = await sellerService.replaceSellerCover(
                id,
                req.processedImage,
                req.user.id,
                req.user.role
            );

            success(res, seller, 'Cover заменён');
        } catch (err) {
            error(res, err.message, 400);
        }
    }

    // Удалить cover (DELETE)
    async deleteSellerCover(req, res) {
        try {
            const { id } = req.params;

            const seller = await sellerService.deleteSellerCover(
                id,
                req.user.id,
                req.user.role
            );

            success(res, seller, 'Cover удалён');
        } catch (err) {
            error(res, err.message, 400);
        }
    }


    // Активировать продавца (Owner/Admin)
    async activateSeller(req, res) {
        try {
            const { id } = req.params;
            const months = req.body.months !== undefined ? req.body.months : undefined;

            // Получаем продавца ДО активации
            const { Seller, User } = await import('../models/index.js');
            const sellerBefore = await Seller.findById(id)
                .populate('createdBy', 'email name role');

            if (!sellerBefore) {
                return error(res, 'Продавец не найден', 404);
            }

            const previousStatus = sellerBefore.status;
            const previousEndDate = sellerBefore.activationEndDate;
            const createdByRole = sellerBefore.createdBy.role;

            // ========== РАСШИФРОВКА ==========
            const createdByEmail = getUserEmail(sellerBefore.createdBy);
            const createdByName = getUserName(sellerBefore.createdBy);
            // =================================

            const activatorRole = req.user.role;
            const activatorName = req.user.name ? decryptField(req.user.name) : req.user.role;

            // Активируем продавца
            const seller = await sellerService.activateSeller(id, months);

            // ========== EMAIL ПРОДАВЦА (НЕ ШИФРУЕТСЯ!) ==========
            const sellerEmail = seller.email || null;
            // ====================================================

            // Проверяем изменились ли даты (платная операция)
            const datesChanged = !previousEndDate ||
                seller.activationEndDate?.getTime() !== previousEndDate?.getTime();

            // Письма только если: новые даты установлены ИЛИ был inactive
            const shouldSendEmails =
                datesChanged ||
                previousStatus === 'inactive' ||
                previousStatus === 'expired';

            // ========== EMAIL УВЕДОМЛЕНИЯ ==========
            if (shouldSendEmails) {

                const ownerEmail = process.env.OWNER_EMAIL;

                // СЛУЧАЙ 1: createdBy = Owner
                if (createdByRole === 'owner') {
                    if (activatorRole === 'owner') {
                        // Owner активирует своего → только Seller
                        if (sellerEmail) {
                            await sendActivationEmailToSeller(
                                sellerEmail,
                                seller.name,
                                seller.activationEndDate,
                                'Owner'
                            );
                        }
                    } else if (activatorRole === 'admin') {
                        // Admin активирует продавца Owner'а → Seller + Owner
                        if (sellerEmail) {
                            await sendActivationEmailToSeller(
                                sellerEmail,
                                seller.name,
                                seller.activationEndDate,
                                `Admin ${activatorName}`
                            );
                        }
                        await sendActivationNotificationToOwner(
                            ownerEmail,
                            seller.name,
                            seller.activationEndDate,
                            `Admin ${activatorName}`,
                            'Owner'
                        );
                    }
                }

                // СЛУЧАЙ 2: createdBy = Admin
                else if (createdByRole === 'admin') {
                    if (activatorRole === 'owner') {
                        // Owner активирует продавца Admin'а → Seller + Admin(создатель)
                        if (sellerEmail) {
                            await sendActivationEmailToSeller(
                                sellerEmail,
                                seller.name,
                                seller.activationEndDate,
                                'Owner'
                            );
                        }
                        if (createdByEmail) {
                            await sendActivationNotificationToCreator(
                                createdByEmail,
                                seller.name,
                                seller.activationEndDate,
                                'Owner'
                            );
                        }
                    } else if (activatorRole === 'admin') {
                        const decryptedCurrentUserEmail = req.user.email ? decryptField(req.user.email) : null;

                        if (createdByEmail === decryptedCurrentUserEmail) {
                            // Admin сам активирует → Seller + Owner
                            if (sellerEmail) {
                                await sendActivationEmailToSeller(
                                    sellerEmail,
                                    seller.name,
                                    seller.activationEndDate,
                                    `Admin ${activatorName}`
                                );
                            }
                            await sendActivationNotificationToOwner(
                                ownerEmail,
                                seller.name,
                                seller.activationEndDate,
                                `Admin ${activatorName}`,
                                `Admin ${createdByName}`
                            );
                        } else {
                            // Другой Admin → Seller + Owner + Admin(создатель)
                            if (sellerEmail) {
                                await sendActivationEmailToSeller(
                                    sellerEmail,
                                    seller.name,
                                    seller.activationEndDate,
                                    `Admin ${activatorName}`
                                );
                            }
                            await sendActivationNotificationToOwner(
                                ownerEmail,
                                seller.name,
                                seller.activationEndDate,
                                `Admin ${activatorName}`,
                                `Admin ${createdByName}`
                            );
                            if (createdByEmail) {
                                await sendActivationNotificationToCreator(
                                    createdByEmail,
                                    seller.name,
                                    seller.activationEndDate,
                                    `Admin ${activatorName}`
                                );
                            }
                        }
                    }
                }

                // СЛУЧАЙ 3: createdBy = Manager
                else if (createdByRole === 'manager') {
                    if (activatorRole === 'owner') {
                        // Owner активирует продавца Manager'а → Manager + Seller
                        if (createdByEmail) {
                            await sendActivationEmail(
                                createdByEmail,
                                seller.name,
                                seller.activationEndDate
                            );
                        }
                        if (sellerEmail) {
                            await sendActivationEmailToSeller(
                                sellerEmail,
                                seller.name,
                                seller.activationEndDate,
                                'Owner'
                            );
                        }
                    } else if (activatorRole === 'admin') {
                        // Admin активирует продавца Manager'а → Manager + Seller + Owner
                        if (createdByEmail) {
                            await sendActivationEmail(
                                createdByEmail,
                                seller.name,
                                seller.activationEndDate
                            );
                        }
                        if (sellerEmail) {
                            await sendActivationEmailToSeller(
                                sellerEmail,
                                seller.name,
                                seller.activationEndDate,
                                `Admin ${activatorName}`
                            );
                        }
                        await sendActivationNotificationToOwner(
                            ownerEmail,
                            seller.name,
                            seller.activationEndDate,
                            `Admin ${activatorName}`,
                            `Manager ${createdByName}`
                        );
                    }
                }
            }
            // ========== КОНЕЦ EMAIL ==========

            success(res, seller, 'Продавец активирован');
        } catch (err) {
            error(res, err.message, 400);
        }
    }

    // Активировать продавца (Manager) - БЕЗ изменения дат
    async activateSellerManager(req, res) {
        try {
            const { id } = req.params;

            const seller = await sellerService.activateSellerManager(id, req.user.id);

            // EMAIL НЕ ОТПРАВЛЯЕТСЯ - Manager редактирует по просьбе владельца

            success(res, seller, 'Продавец активирован');
        } catch (err) {
            error(res, err.message, 400);
        }
    }

    // Продлить продавца
    async extendSeller(req, res) {
        try {
            const { id } = req.params;
            const { months } = req.body;

            // Получаем продавца ДО продления
            const { Seller, User } = await import('../models/index.js');
            const sellerBefore = await Seller.findById(id)
                .populate('createdBy', 'email name role');

            if (!sellerBefore) {
                return error(res, 'Продавец не найден', 404);
            }

            const createdByRole = sellerBefore.createdBy.role;

            // ========== РАСШИФРОВКА ==========
            const createdByEmail = getUserEmail(sellerBefore.createdBy);
            const createdByName = getUserName(sellerBefore.createdBy);
            // =================================

            const activatorRole = req.user.role;
            const activatorName = req.user.name ? decryptField(req.user.name) : req.user.role;

            // Продлеваем
            const seller = await sellerService.extendSeller(id, months);

            const sellerEmail = seller.email || null;

            // ========== EMAIL УВЕДОМЛЕНИЯ ==========
            const ownerEmail = process.env.OWNER_EMAIL;

            // СЛУЧАЙ 1: createdBy = Owner
            if (createdByRole === 'owner') {
                if (activatorRole === 'owner') {
                    // Owner продлевает своего → только Seller
                    if (sellerEmail) {
                        await sendExtensionEmailToSeller(
                            sellerEmail,
                            seller.name,
                            seller.activationEndDate
                        );
                    }
                } else if (activatorRole === 'admin') {
                    // Admin продлевает продавца Owner'а → Seller + Owner
                    if (sellerEmail) {
                        await sendExtensionEmailToSeller(
                            sellerEmail,
                            seller.name,
                            seller.activationEndDate
                        );
                    }
                    await sendExtensionNotificationToOwner(
                        ownerEmail,
                        seller.name,
                        seller.activationEndDate,
                        `Admin ${activatorName}`,
                        'Owner'
                    );
                }
            }

            // СЛУЧАЙ 2: createdBy = Admin
            else if (createdByRole === 'admin') {
                if (activatorRole === 'owner') {
                    // Owner продлевает продавца Admin'а → Seller + Admin(создатель)
                    if (sellerEmail) {
                        await sendExtensionEmailToSeller(
                            sellerEmail,
                            seller.name,
                            seller.activationEndDate
                        );
                    }
                    if (createdByEmail) {
                        await sendExtensionNotificationToCreator(
                            createdByEmail,
                            seller.name,
                            seller.activationEndDate,
                            'Owner'
                        );
                    }
                } else if (activatorRole === 'admin') {
                    // Admin продлевает продавца Admin'а
                    const decryptedCurrentUserEmail = req.user.email ? decryptField(req.user.email) : null;

                    if (createdByEmail === decryptedCurrentUserEmail) {
                        // Admin сам продлевает → Seller + Owner
                        if (sellerEmail) {
                            await sendExtensionEmailToSeller(
                                sellerEmail,
                                seller.name,
                                seller.activationEndDate
                            );
                        }
                        await sendExtensionNotificationToOwner(
                            ownerEmail,
                            seller.name,
                            seller.activationEndDate,
                            `Admin ${activatorName}`,
                            `Admin ${createdByName}`
                        );
                    } else {
                        // Другой Admin → Seller + Owner + Admin(создатель)
                        if (sellerEmail) {
                            await sendExtensionEmailToSeller(
                                sellerEmail,
                                seller.name,
                                seller.activationEndDate
                            );
                        }
                        await sendExtensionNotificationToOwner(
                            ownerEmail,
                            seller.name,
                            seller.activationEndDate,
                            `Admin ${activatorName}`,
                            `Admin ${createdByName}`
                        );
                        if (createdByEmail) {
                            await sendExtensionNotificationToCreator(
                                createdByEmail,
                                seller.name,
                                seller.activationEndDate,
                                `Admin ${activatorName}`
                            );
                        }
                    }
                }
            }

            // СЛУЧАЙ 3: createdBy = Manager
            else if (createdByRole === 'manager') {
                if (activatorRole === 'owner') {
                    // Owner продлевает продавца Manager'а → Manager + Seller
                    if (createdByEmail) {
                        await sendExtensionEmail(
                            createdByEmail,
                            seller.name,
                            seller.activationEndDate
                        );
                    }
                    if (sellerEmail) {
                        await sendExtensionEmailToSeller(
                            sellerEmail,
                            seller.name,
                            seller.activationEndDate
                        );
                    }
                } else if (activatorRole === 'admin') {
                    // Admin продлевает продавца Manager'а → Manager + Seller + Owner
                    if (createdByEmail) {
                        await sendExtensionEmail(
                            createdByEmail,
                            seller.name,
                            seller.activationEndDate
                        );
                    }
                    if (sellerEmail) {
                        await sendExtensionEmailToSeller(
                            sellerEmail,
                            seller.name,
                            seller.activationEndDate
                        );
                    }
                    await sendExtensionNotificationToOwner(
                        ownerEmail,
                        seller.name,
                        seller.activationEndDate,
                        `Admin ${activatorName}`,
                        `Manager ${createdByName}`
                    );
                }
            }
            // ========== КОНЕЦ EMAIL ==========

            success(res, seller, 'Срок продлён');
        } catch (err) {
            error(res, err.message, 400);
        }
    }

    // Деактивировать продавца
    async deactivateSeller(req, res) {
        try {
            const { id } = req.params;

            const seller = await sellerService.deactivateSeller(id);

            // EMAIL НЕ ОТПРАВЛЯЕТСЯ - техническое действие

            success(res, seller, 'Продавец деактивирован');
        } catch (err) {
            error(res, err.message, 400);
        }
    }

    // Перевести в draft
    async moveToDraft(req, res) {
        try {
            const { id } = req.params;

            const seller = await sellerService.moveToDraft(
                id,
                req.user.id,
                req.user.role
            );

            // EMAIL НЕ ОТПРАВЛЯЕТСЯ - техническое действие

            success(res, seller, 'Продавец переведён в черновик');
        } catch (err) {
            error(res, err.message, err.message === 'Доступ запрещён' ? 403 : 400);
        }
    }

    // Удалить продавца (Owner/Admin/Manager своих)
    async deleteSeller(req, res) {
        try {
            const { id } = req.params;

            const seller = await sellerService.deleteSeller(
                id,
                req.user.id,
                req.user.role
            );

            success(res, seller, 'Продавец полностью удалён (товары, категории, изображения)');
        } catch (err) {
            error(res, err.message, err.message === 'Доступ запрещён' ? 403 : 400);
        }
    }

}

export default new SellerController();