import clientService from '../services/client.service.js';
import ratingService from '../services/rating.service.js';
import { success, error } from '../utils/responsehandler.util.js';

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
            const ratings = await ratingService.getClientRatings(req.client.id);

            success(res, ratings, 'История оценок получена');
        } catch (err) {
            error(res, err.message, 404);
        }
    }
}

export default new ClientController();