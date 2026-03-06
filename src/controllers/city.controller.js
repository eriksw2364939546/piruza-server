import cityService from '../services/city.service.js';
import { success, error } from '../utils/responsehandler.util.js';
import { getPaginationParams } from '../utils/pagination.util.js';

class CityController {
    // Получить все города
    async getAllCities(req, res) {
        try {
            const { page, limit } = getPaginationParams(req.query);

            const result = await cityService.getAllCities(page, limit);

            success(res, result.data, 'Города получены', 200, result.pagination);
        } catch (err) {
            error(res, err.message, 500);
        }
    }

    // Получить только активные города
    async getActiveCities(req, res) {
        try {
            const { page, limit } = getPaginationParams(req.query);

            const result = await cityService.getActiveCities(page, limit);

            success(res, result.data, 'Активные города получены', 200, result.pagination);
        } catch (err) {
            error(res, err.message, 500);
        }
    }

    // Получить город по slug (публично - только активные)
    async getCityBySlug(req, res) {
        try {
            const { slug } = req.params;

            const city = await cityService.getCityBySlug(slug);

            success(res, city, 'Город получен');
        } catch (err) {
            error(res, err.message, 404);
        }
    }

    // Получить город по slug (Owner - включая неактивные)
    async getCityBySlugAdmin(req, res) {
        try {
            const { slug } = req.params;

            const city = await cityService.getCityBySlugAdmin(slug);

            success(res, city, 'Город получен');
        } catch (err) {
            error(res, err.message, 404);
        }
    }

    // Создать город
    async createCity(req, res) {
        try {
            const city = await cityService.createCity(req.body, req.user.id);

            success(res, city, 'Город создан', 201);
        } catch (err) {
            error(res, err.message, 400);
        }
    }

    // Обновить город
    async updateCity(req, res) {
        try {
            const { id } = req.params;

            const city = await cityService.updateCity(id, req.body);

            success(res, city, 'Город обновлён');
        } catch (err) {
            error(res, err.message, 400);
        }
    }

    // Переключить статус активности
    async toggleStatus(req, res) {
        try {
            const { id } = req.params;

            const city = await cityService.toggleCityStatus(id);

            success(res, city, 'Статус города изменён');
        } catch (err) {
            error(res, err.message, 400);
        }
    }

    // Удалить город (Owner only)
    async deleteCity(req, res) {
        try {
            const { id } = req.params;

            const city = await cityService.deleteCity(id);

            success(res, city, 'Город удалён');
        } catch (err) {
            error(res, err.message, 400);
        }
    }
}

export default new CityController();