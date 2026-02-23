import cityService from '../services/city.service.js';
import { success, error } from '../utils/responsehandler.util.js';

class CityController {
    // Получить все города
    async getAllCities(req, res) {
        try {
            const cities = await cityService.getAllCities();

            success(res, cities, 'Города получены');
        } catch (err) {
            error(res, err.message, 500);
        }
    }

    // Получить только активные города
    async getActiveCities(req, res) {
        try {
            const cities = await cityService.getActiveCities();

            success(res, cities, 'Активные города получены');
        } catch (err) {
            error(res, err.message, 500);
        }
    }

    // Получить город по slug
    async getCityBySlug(req, res) {
        try {
            const { slug } = req.params;

            const city = await cityService.getCityBySlug(slug);

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
}

export default new CityController();