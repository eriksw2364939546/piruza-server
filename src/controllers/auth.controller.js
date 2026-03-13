import authService from '../services/auth.service.js';
import { success, error } from '../utils/responsehandler.util.js';

class AuthController {
    // Регистрация Admin/Manager (только Owner)
    async registerAdmin(req, res) {
        try {
            const user = await authService.registerAdmin(req.body, req.user.id);

            success(res, user, 'Пользователь успешно создан', 201);
        } catch (err) {
            error(res, err.message, 400);
        }
    }

    // Вход в систему (Owner/Admin/Manager)
    async login(req, res) {
        try {
            const { email, password } = req.body;

            const result = await authService.loginUser(email, password);

            success(res, result, 'Вход выполнен успешно');
        } catch (err) {
            error(res, err.message, 401);
        }
    }

    // Получить профиль текущего пользователя
    async getProfile(req, res) {
        try {
            const profile = await authService.getUserProfile(req.user.id);

            success(res, profile, 'Профиль получен');
        } catch (err) {
            error(res, err.message, 404);
        }
    }
    // Получить список пользователей (Owner/Admin)
    async getAllUsers(req, res) {
        try {
            const { role } = req.query;  // Фильтр по роли

            const users = await authService.getAllUsers(
                role,
                req.user.id,
                req.user.role
            );

            success(res, users, 'Пользователи получены');
        } catch (err) {
            error(res, err.message, err.message === 'Доступ запрещён' ? 403 : 500);
        }
    }
    // Получить пользователя по ID (с проверкой доступа)
    async getUserById(req, res) {
        try {
            const { id } = req.params;

            const user = await authService.getUserById(
                id,              // userId
                req.user.id,     // requesterId
                req.user.role    // requesterRole
            );

            success(res, user, 'Пользователь получен');
        } catch (err) {
            error(res, err.message, err.message === 'Доступ запрещён' ? 403 : 404);
        }
    }

    // Обновить свой профиль
    async updateOwnProfile(req, res) {
        try {
            const user = await authService.updateOwnProfile(req.user.id, req.body);

            success(res, user, 'Профиль обновлён');
        } catch (err) {
            error(res, err.message, 400);
        }
    }

    // Обновить профиль другого пользователя (Owner → Admin/Manager)
    async updateUserProfile(req, res) {
        try {
            const { id } = req.params;

            const user = await authService.updateUserProfile(
                id,
                req.body,
                req.user.id,
                req.user.role
            );

            success(res, user, 'Пользователь обновлён');
        } catch (err) {
            error(res, err.message, err.message.includes('Доступ запрещён') ? 403 : 400);
        }
    }

    // Удалить пользователя (Owner only)
    async deleteUser(req, res) {
        try {
            const { id } = req.params;

            const user = await authService.deleteUser(
                id,
                req.user.id,
                req.user.role
            );

            success(res, user, 'Пользователь удалён');
        } catch (err) {
            error(res, err.message, err.message.includes('Доступ запрещён') ? 403 : 400);
        }
    }
}

export default new AuthController();