import { City } from '../models/index.js';
import { generateSlug, generateUniqueSlug } from '../utils/slug.util.js';
import { paginate } from '../utils/pagination.util.js';
import { encrypt, decrypt, hashMeta } from '../utils/crypto.util.js';

class CityService {
    // Получить все города
    async getAllCities(page = 1, limit = 20) {
        const query = City.find()
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        const result = await paginate(query, page, limit);

        // Расшифровываем name и email у createdBy
        result.data = result.data.map(city => {
            if (city.createdBy) {
                city.createdBy.name = decrypt(city.createdBy.name);
                city.createdBy.email = decrypt(city.createdBy.email);
            }
            return city;
        });

        return result;
    }

    // Получить только активные города
    async getActiveCities(page = 1, limit = 20) {
        const query = City.find({ isActive: true })
            .select('name slug')
            .sort({ name: 1 });

        return await paginate(query, page, limit);
    }

    // Получить город по slug (публично - только активные)
    async getCityBySlug(slug) {
        const city = await City.findOne({
            slug,
            isActive: true // Только активные
        });

        if (!city) {
            throw new Error('Город не найден');
        }

        return city;
    }

    // Получить город по slug (Owner - включая неактивные)
    async getCityBySlugAdmin(slug) {
        const city = await City.findOne({ slug });

        if (!city) {
            throw new Error('Город не найден');
        }

        return city;
    }

    // Создать город
    async createCity(data, userId) {
        const { name } = data;

        // Проверяем существование города с таким же названием (регистронезависимо)
        const existingCity = await City.findOne({
            name: { $regex: new RegExp(`^${name}$`, 'i') }
        });

        if (existingCity) {
            throw new Error('Город с таким названием уже существует');
        }

        // Генерируем slug из названия
        const baseSlug = generateSlug(name);
        const slug = await generateUniqueSlug(City, baseSlug);

        // Создаём город
        const city = new City({
            name,
            slug,
            createdBy: userId
        });

        await city.save();
        return city;
    }

    // Обновить город
    async updateCity(cityId, data) {
        const { name, isActive } = data;

        const updateData = {};

        // Если изменяется название, генерируем новый slug
        if (name) {
            // Проверяем уникальность названия (кроме текущего города)
            const existingCity = await City.findOne({
                name: { $regex: new RegExp(`^${name}$`, 'i') },
                _id: { $ne: cityId }
            });

            if (existingCity) {
                throw new Error('Город с таким названием уже существует');
            }

            updateData.name = name;
            const baseSlug = generateSlug(name);
            updateData.slug = await generateUniqueSlug(City, baseSlug, cityId);
        }

        if (isActive !== undefined) {
            updateData.isActive = isActive;

            // НОВОЕ: Если город деактивируется (isActive: false)
            // → переводим ВСЕ продавцы этого города в draft
            if (isActive === false) {
                const { Seller } = await import('../models/index.js');

                const result = await Seller.updateMany(
                    {
                        city: cityId,
                        status: { $in: ['active', 'expired', 'inactive'] } // Только не-draft продавцы
                    },
                    {
                        $set: { status: 'draft' }
                    }
                );

                console.log(`🔴 Город деактивирован. Переведено в draft: ${result.modifiedCount} продавцов`);
            }

            // НОВОЕ: Если город активируется (isActive: true)
            // → продавцы остаются в draft, Owner/Admin должны вручную активировать
            if (isActive === true) {
                console.log(`🟢 Город активирован. Продавцы остаются в draft`);
            }
        }

        const city = await City.findByIdAndUpdate(
            cityId,
            updateData,
            { new: true }
        );

        if (!city) {
            throw new Error('Город не найден');
        }

        return city;
    }

    // Переключить статус активности
    async toggleCityStatus(cityId) {
        const city = await City.findById(cityId);

        if (!city) {
            throw new Error('Город не найден');
        }

        const newStatus = !city.isActive;
        city.isActive = newStatus;

        // НОВОЕ: Если город деактивируется (isActive: false)
        // → переводим ВСЕ продавцы этого города в draft
        if (newStatus === false) {
            const { Seller } = await import('../models/index.js');

            const result = await Seller.updateMany(
                {
                    city: cityId,
                    status: { $in: ['active', 'expired', 'inactive'] }
                },
                {
                    $set: { status: 'draft' }
                }
            );

            console.log(`🔴 Город деактивирован (toggle). Переведено в draft: ${result.modifiedCount} продавцов`);
        }

        // НОВОЕ: Если город активируется (isActive: true)
        // → продавцы остаются в draft, Owner/Admin должны вручную активировать
        if (newStatus === true) {
            console.log(`🟢 Город активирован (toggle). Продавцы остаются в draft`);
        }

        await city.save();

        return city;
    }

    // Удалить город (Owner only)
    async deleteCity(cityId) {
        const city = await City.findById(cityId);

        if (!city) {
            throw new Error('Город не найден');
        }

        // Проверка: есть ли продавцы в этом городе?
        const { Seller } = await import('../models/index.js');

        const sellersCount = await Seller.countDocuments({ city: cityId });

        if (sellersCount > 0) {
            throw new Error(`Невозможно удалить город. Существует ${sellersCount} продавцов в этом городе. Сначала удалите или переместите продавцов.`);
        }

        await City.findByIdAndDelete(cityId);

        console.log(`🗑️  Город "${city.name}" удалён`);

        return city;
    }
}

export default new CityService();