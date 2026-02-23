import { Client, Meta } from '../models/index.js';
import { verifyGoogleToken } from '../utils/googleauth.util.js';
import { generateClientToken } from '../utils/jwt.util.js';
import { encrypt, decrypt, hashMeta } from '../utils/crypto.util.js';

class ClientService {
    // Google OAuth логин
    async googleLogin(idToken) {
        // Верификация Google токена
        const googleData = await verifyGoogleToken(idToken);

        // Поиск через Meta
        const metaInfo = await Meta.findOne({
            em: hashMeta(googleData.email),
            role: 'client'
        }).populate('client');

        let client;

        if (metaInfo && metaInfo.client) {
            // Клиент существует - обновляем данные
            client = metaInfo.client;

            // Шифруем данные перед сохранением
            client.email = encrypt(googleData.email.toLowerCase());
            client.name = encrypt(googleData.name);
            client.avatar = googleData.avatar;

            await client.save();

            // Дешифруем для возврата
            client.email = googleData.email;
            client.name = googleData.name;
        } else {
            // Создаём нового клиента - шифруем данные
            const encryptedEmail = encrypt(googleData.email.toLowerCase());
            const encryptedName = encrypt(googleData.name);

            client = new Client({
                googleId: googleData.googleId,
                email: encryptedEmail,
                name: encryptedName,
                avatar: googleData.avatar
            });

            await client.save();

            // Создаём Meta запись
            const meta = new Meta({
                client: client._id,
                role: 'client',
                em: hashMeta(googleData.email)
            });

            await meta.save();

            // Дешифруем для возврата
            client.email = googleData.email;
            client.name = googleData.name;
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

    // Получить профиль клиента
    async getClientProfile(clientId) {
        const client = await Client.findById(clientId)
            .populate('city', 'name slug')
            .populate('favorites', 'name slug logo averageRating totalRatings');

        if (!client) {
            throw new Error('Клиент не найден');
        }

        // Дешифруем данные
        const decrypted = client.toObject();
        decrypted.email = decrypt(decrypted.email);
        decrypted.name = decrypt(decrypted.name);

        return decrypted;
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

        // Дешифруем данные
        const decrypted = client.toObject();
        decrypted.email = decrypt(decrypted.email);
        decrypted.name = decrypt(decrypted.name);

        return decrypted;
    }

    // Добавить/удалить из избранного
    async toggleFavorite(clientId, sellerId) {
        const client = await Client.findById(clientId);

        if (!client) {
            throw new Error('Клиент не найден');
        }

        const index = client.favorites.indexOf(sellerId);

        if (index > -1) {
            client.favorites.splice(index, 1);
            await client.save();
            return { action: 'removed', favorites: client.favorites };
        } else {
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