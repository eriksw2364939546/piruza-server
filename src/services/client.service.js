import { Client } from '../models/index.js';
import { verifyGoogleToken } from '../utils/googleauth.util.js';
import { generateClientToken } from '../utils/jwt.util.js';

class ClientService {
    // Google OAuth логин
    async googleLogin(idToken) {
        // Верификация Google токена
        const googleData = await verifyGoogleToken(idToken);

        // Поиск или создание клиента
        let client = await Client.findOne({ googleId: googleData.googleId });

        if (client) {
            // Обновляем данные если клиент существует
            client.email = googleData.email;
            client.name = googleData.name;
            client.avatar = googleData.avatar;
            await client.save();
        } else {
            // Создаём нового клиента
            client = new Client({
                googleId: googleData.googleId,
                email: googleData.email,
                name: googleData.name,
                avatar: googleData.avatar
            });
            await client.save();
        }

        // Генерируем токен
        const token = generateClientToken(client._id);

        return {
            client: {
                id: client._id,
                email: client.email,
                name: client.name,
                avatar: client.avatar,
                city: client.city
            },
            token
        };
    }

    // Получить профиль клиента с избранными
    async getClientProfile(clientId) {
        const client = await Client.findById(clientId)
            .populate('city', 'name slug')
            .populate('favorites', 'name slug logo averageRating totalRatings');

        if (!client) {
            throw new Error('Клиент не найден');
        }

        return client;
    }

    // Обновить город клиента
    async updateClientCity(clientId, cityId) {
        const client = await Client.findByIdAndUpdate(
            clientId,
            { city: cityId },
            { new: true }
        ).populate('city', 'name slug');

        if (!client) {
            throw new Error('Клиент не найден');
        }

        return client;
    }

    // Добавить/удалить из избранного (toggle)
    async toggleFavorite(clientId, sellerId) {
        const client = await Client.findById(clientId);

        if (!client) {
            throw new Error('Клиент не найден');
        }

        // Проверяем есть ли продавец в избранном
        const index = client.favorites.indexOf(sellerId);

        if (index > -1) {
            // Удаляем из избранного
            client.favorites.splice(index, 1);
            await client.save();
            return { action: 'removed', favorites: client.favorites };
        } else {
            // Добавляем в избранное
            client.favorites.push(sellerId);
            await client.save();
            return { action: 'added', favorites: client.favorites };
        }
    }

    // Получить избранных продавцов
    async getFavorites(clientId) {
        const client = await Client.findById(clientId)
            .populate('favorites', 'name slug logo coverImage averageRating totalRatings address city')
            .populate('favorites.city', 'name slug');

        if (!client) {
            throw new Error('Клиент не найден');
        }

        return client.favorites;
    }
}

export default new ClientService();