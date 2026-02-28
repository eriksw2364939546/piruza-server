import sellerService from '../services/seller.service.js';
import { success, error } from '../utils/responsehandler.util.js';

class SellerController {
    // Получить всех продавцов (Owner/Admin видят всех, Manager только своих)
    async getAllSellers(req, res) {
        try {
            const filters = {
                query: req.query.query,
                status: req.query.status,
                city: req.query.city,
                category: req.query.category
            };

            const sellers = await sellerService.getAllSellers(
                filters,
                req.user.id,
                req.user.role
            );

            success(res, sellers, 'Продавцы получены');
        } catch (err) {
            error(res, err.message, 500);
        }
    }

    // Получить продавцов конкретного Manager'а (для Owner/Admin)
    async getSellersByManager(req, res) {
        try {
            const { managerId } = req.params;

            const sellers = await sellerService.getSellersByManager(managerId);

            success(res, sellers, 'Продавцы Manager получены');
        } catch (err) {
            error(res, err.message, 500);
        }
    }

    // Получить публичных продавцов (только active)
    async getPublicSellers(req, res) {
        try {
            const { cityId } = req.params;
            const { category } = req.query;

            const sellers = await sellerService.getPublicSellers(cityId, category);

            success(res, sellers, 'Продавцы получены');
        } catch (err) {
            error(res, err.message, 500);
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
    // Активировать продавца (Owner/Admin)
    async activateSeller(req, res) {
        try {
            const { id } = req.params;
            const { months } = req.body;

            const seller = await sellerService.activateSeller(id, months);

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

            const seller = await sellerService.extendSeller(id, months);

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

            success(res, seller, 'Продавец и его локальные категории удалены');
        } catch (err) {
            error(res, err.message, err.message === 'Доступ запрещён' ? 403 : 400);
        }
    }
}

export default new SellerController();