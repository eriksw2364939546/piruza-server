import { verifyToken } from '../utils/jwt.util.js';
import { User, Client } from '../models/index.js';

class AuthMiddleware {
    // Опциональная аутентификация (для публичных endpoints с условным доступом)
    // Если токен есть - проверяет и добавляет req.user
    // Если токена нет - продолжает без ошибки
    async optionalAuth(req, res, next) {
        try {
            const token = req.headers.authorization?.split(' ')[1];

            // Если токена нет - просто продолжаем (публичный доступ)
            if (!token) {
                return next();
            }

            // Если токен есть - проверяем
            const decoded = verifyToken(token);

            if (!decoded.userId || !decoded.role) {
                // Невалидный токен - игнорируем, продолжаем как публичный доступ
                return next();
            }

            // Проверка существования пользователя
            const user = await User.findById(decoded.userId);

            if (!user || !user.isActive) {
                // Пользователь не найден - игнорируем, продолжаем как публичный доступ
                return next();
            }

            // Добавляем данные пользователя в req
            req.user = {
                id: user._id,
                role: user.role,
                email: user.email,
                name: user.name
            };

            next();
        } catch (error) {
            // Ошибка токена - игнорируем, продолжаем как публичный доступ
            next();
        }
    }

    // Middleware для защиты роутов Owner/Admin/Manager
    async protectAdmin(req, res, next) {
        try {
            // Проверка наличия токена
            const token = req.headers.authorization?.split(' ')[1];

            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'Токен не предоставлен'
                });
            }

            // Верификация токена
            const decoded = verifyToken(token);

            if (!decoded.userId || !decoded.role) {
                return res.status(401).json({
                    success: false,
                    message: 'Неверный токен'
                });
            }

            // Проверка существования пользователя
            const user = await User.findById(decoded.userId);

            if (!user || !user.isActive) {
                return res.status(401).json({
                    success: false,
                    message: 'Пользователь не найден или неактивен'
                });
            }

            // Добавляем данные пользователя в req
            req.user = {
                id: user._id,
                role: user.role,
                email: user.email,
                name: user.name
            };

            next();
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: error.message === 'Invalid or expired token'
                    ? 'Токен истёк или невалиден'
                    : 'Ошибка аутентификации'
            });
        }
    }

    // Middleware для защиты роутов Client (Google OAuth)
    async protectClient(req, res, next) {
        try {
            // Проверка наличия токена
            const token = req.headers.authorization?.split(' ')[1];

            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'Токен не предоставлен'
                });
            }

            // Верификация токена
            const decoded = verifyToken(token);

            if (!decoded.clientId) {
                return res.status(401).json({
                    success: false,
                    message: 'Неверный токен'
                });
            }

            // Проверка существования клиента
            const client = await Client.findById(decoded.clientId);

            if (!client || !client.isActive) {
                return res.status(401).json({
                    success: false,
                    message: 'Клиент не найден или неактивен'
                });
            }

            // Добавляем данные клиента в req
            req.client = {
                id: client._id,
                email: client.email,
                name: client.name,
                googleId: client.googleId
            };

            next();
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: error.message === 'Invalid or expired token'
                    ? 'Токен истёк или невалиден'
                    : 'Ошибка аутентификации'
            });
        }
    }
}

export default new AuthMiddleware();