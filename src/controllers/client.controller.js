import clientService from '../services/client.service.js';
import ratingService from '../services/rating.service.js';
import { success, error } from '../utils/responsehandler.util.js';
import { getPaginationParams } from '../utils/pagination.util.js';

class ClientController {
    // Google OAuth логин
    async googleLogin(req, res) {
        try {
            const { idToken } = req.body;

            const result = await clientService.googleLogin(idToken);

            success(res, result, 'Вход выполнен успешно');
        } catch (err) {
            error(res, err.message, 401);
        }
    }

    // Получить профиль клиента
    async getProfile(req, res) {
        try {
            const profile = await clientService.getClientProfile(req.client.id);

            success(res, profile, 'Профиль получен');
        } catch (err) {
            error(res, err.message, 404);
        }
    }

    // Обновить город клиента
    async updateCity(req, res) {
        try {
            const { city } = req.body;

            const client = await clientService.updateClientCity(req.client.id, city);

            success(res, client, 'Город обновлён');
        } catch (err) {
            error(res, err.message, 400);
        }
    }

    // Добавить/удалить из избранного
    async toggleFavorite(req, res) {
        try {
            const { sellerId } = req.params;

            const result = await clientService.toggleFavorite(req.client.id, sellerId);

            const message = result.action === 'added'
                ? 'Продавец добавлен в избранное'
                : 'Продавец удалён из избранного';

            success(res, result, message);
        } catch (err) {
            error(res, err.message, 400);
        }
    }

    // Получить избранных продавцов
    async getFavorites(req, res) {
        try {
            const favorites = await clientService.getFavorites(req.client.id);

            success(res, favorites, 'Избранные продавцы получены');
        } catch (err) {
            error(res, err.message, 404);
        }
    }

    // Получить историю оценок клиента
    async getRatings(req, res) {
        try {
            const { page, limit } = getPaginationParams(req.query);
            const result = await ratingService.getClientRatings(req.client.id, page, limit);
            success(res, result.data, 'История оценок получена', 200, result.pagination);
        } catch (err) {
            error(res, err.message, 404);
        }
    }

    // ── OWNER ONLY ────────────────────────────────────

    // GET /api/clients — список всех клиентов
    async getAllClients(req, res) {
        try {
            const { page, limit } = getPaginationParams(req.query);
            const { query = '', isActive = '' } = req.query;

            const result = await clientService.getAllClients(page, limit, { query, isActive });
            success(res, result.data, 'Клиенты получены', 200, result.pagination);
        } catch (err) {
            error(res, err.message, 500);
        }
    }

    // GET /api/clients/:id — профиль клиента по ID
    async getClientById(req, res) {
        try {
            const { id } = req.params;
            const client = await clientService.getClientById(id);
            success(res, client, 'Клиент получен');
        } catch (err) {
            error(res, err.message, 404);
        }
    }


    // GET /api/clients/:id/ratings — оценки клиента (с фильтром по rating)
    async getClientRatings(req, res) {
        try {
            const { id } = req.params;
            const { page, limit } = getPaginationParams(req.query);
            const { rating = '' } = req.query;

            const result = await ratingService.getClientRatings(id, page, limit, { rating });
            success(res, result.data, 'Оценки клиента получены', 200, result.pagination);
        } catch (err) {
            error(res, err.message, 404);
        }
    }

    // PATCH /api/clients/:id/toggle-active — блокировка/разблокировка
    async toggleClientActive(req, res) {
        try {
            const { id } = req.params;
            const client = await clientService.toggleClientActive(id);
            const message = client.isActive ? 'Клиент разблокирован' : 'Клиент заблокирован';
            success(res, client, message);
        } catch (err) {
            error(res, err.message, 400);
        }
    }
}

export default new ClientController();