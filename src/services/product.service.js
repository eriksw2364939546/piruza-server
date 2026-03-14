import { Product, Seller, Category } from '../models/index.js';
import { generateSlug } from '../utils/slug.util.js';
import slugify from 'slugify';
import { paginate } from '../utils/pagination.util.js';

class ProductService {
    // Получить товары продавца
    // Публично: только active продавцы
    // Owner/Admin: все продавцы
    // Manager: свои продавцы (любой статус)
    async getProductsBySeller(sellerId, userId = null, userRole = null, page = 1, limit = 20) {
        // Если НЕТ токена (публичный доступ) - проверяем статус продавца
        if (!userId || !userRole) {
            const seller = await Seller.findOne({
                _id: sellerId,
                status: 'active',
                activationEndDate: { $gt: new Date() }
            });

            if (!seller) {
                throw new Error('Продавец не найден или неактивен');
            }

            const query = Product.find({ seller: sellerId })
                .populate('category', 'name slug')
                .sort({ createdAt: -1 });

            return await paginate(query, page, limit);
        }

        // Если ЕСТЬ токен - проверяем права
        const seller = await Seller.findById(sellerId);

        if (!seller) {
            throw new Error('Продавец не найден');
        }

        // Owner и Admin видят всех
        if (userRole === 'owner' || userRole === 'admin') {
            const query = Product.find({ seller: sellerId })
                .populate('category', 'name slug')
                .sort({ createdAt: -1 });

            return await paginate(query, page, limit);
        }

        // Manager видит только своих (любой статус)
        if (userRole === 'manager') {
            if (seller.createdBy.toString() !== userId.toString()) {
                throw new Error('Доступ запрещён. Вы можете видеть только товары своих продавцов');
            }

            const query = Product.find({ seller: sellerId })
                .populate('category', 'name slug')
                .sort({ createdAt: -1 });

            return await paginate(query, page, limit);
        }

        throw new Error('Доступ запрещён');
    }

    // Получить товар по slug
    // Публично: только active продавцы
    // Owner/Admin: все продавцы
    // Manager: свои продавцы (любой статус)
    async getProductBySlug(sellerId, slug, userId = null, userRole = null) {
        // Если НЕТ токена (публичный доступ) - проверяем статус продавца
        if (!userId || !userRole) {
            const seller = await Seller.findOne({
                _id: sellerId,
                status: 'active',
                activationEndDate: { $gt: new Date() }
            });

            if (!seller) {
                throw new Error('Продавец не найден или неактивен');
            }

            const product = await Product.findOne({ seller: sellerId, slug })
                .populate('category', 'name slug')
                .populate('seller', 'name slug');

            if (!product) {
                throw new Error('Товар не найден');
            }

            return product;
        }

        // Если ЕСТЬ токен - проверяем права
        const seller = await Seller.findById(sellerId);

        if (!seller) {
            throw new Error('Продавец не найден');
        }

        // Owner и Admin видят всех
        if (userRole === 'owner' || userRole === 'admin') {
            const product = await Product.findOne({ seller: sellerId, slug })
                .populate('category', 'name slug')
                .populate('seller', 'name slug');

            if (!product) {
                throw new Error('Товар не найден');
            }

            return product;
        }

        // Manager видит только своих (любой статус)
        if (userRole === 'manager') {
            if (seller.createdBy.toString() !== userId.toString()) {
                throw new Error('Доступ запрещён. Вы можете видеть только товары своих продавцов');
            }

            const product = await Product.findOne({ seller: sellerId, slug })
                .populate('category', 'name slug')
                .populate('seller', 'name slug');

            if (!product) {
                throw new Error('Товар не найден');
            }

            return product;
        }

        throw new Error('Доступ запрещён');
    }

    // Получить товар по ID
    async getProductById(productId, userId = null, userRole = null) {
        const product = await Product.findById(productId)
            .populate('seller', 'name slug status city globalCategories createdBy')
            .populate('category', 'name slug');

        if (!product) {
            throw new Error('Товар не найден');
        }

        // ЛОГИКА ПО РОЛЯМ:

        // 1. БЕЗ ТОКЕНА (публичный доступ)
        if (!userId || !userRole) {
            // Продавец должен быть active
            if (product.seller.status !== 'active') {
                throw new Error('Продавец не найден или неактивен');
            }
            return product;
        }

        // 2. OWNER/ADMIN - видят всё
        if (userRole === 'owner' || userRole === 'admin') {
            return product;
        }

        // 3. MANAGER - только своих продавцов
        if (userRole === 'manager') {
            if (product.seller.createdBy.toString() !== userId.toString()) {
                throw new Error('Доступ запрещён. Вы можете видеть только товары своих продавцов');
            }
            return product;
        }

        // 4. Неизвестная роль
        throw new Error('Неверная роль пользователя');
    }

    // Получить товары по локальной категории
    async getProductsByCategory(categoryId, userId = null, userRole = null, page = 1, limit = 20) {
        const category = await Category.findById(categoryId);

        if (!category) {
            throw new Error('Категория не найдена');
        }

        // Получаем продавца для проверки доступа
        const seller = await Seller.findById(category.seller);

        if (!seller) {
            throw new Error('Продавец не найден');
        }

        // Без токена — только active продавцы
        if (!userId || !userRole) {
            if (seller.status !== 'active' || seller.activationEndDate <= new Date()) {
                throw new Error('Продавец не найден или неактивен');
            }
        }

        // Manager — только свои
        if (userRole === 'manager') {
            if (seller.createdBy.toString() !== userId.toString()) {
                throw new Error('Доступ запрещён');
            }
        }

        const query = Product.find({ category: categoryId })
            .populate('category', 'name slug')
            .sort({ createdAt: -1 });

        return await paginate(query, page, limit);
    }

    // Создать товар (ТОЛЬКО ЕСЛИ ПРОДАВЕЦ В DRAFT!)
    async createProduct(productData, userId, userRole) {
        const seller = await Seller.findById(productData.seller);

        if (!seller) {
            throw new Error('Продавец не найден');
        }

        // ========== ПРОВЕРКА СТАТУСА ПРОДАВЦА ==========
        if (seller.status !== 'draft') {
            throw new Error(`Нельзя создавать товары для продавца в статусе '${seller.status}'. Переведите продавца в draft.`);
        }
        // ===============================================

        // Проверка доступа
        if (userRole === 'manager') {
            if (seller.createdBy.toString() !== userId.toString()) {
                throw new Error('Вы можете создавать товары только для своих продавцов');
            }
        }

        // Проверка категории
        const category = await Category.findById(productData.category);

        if (!category) {
            throw new Error('Категория не найдена');
        }

        // Запрет на глобальные категории
        if (category.isGlobal) {
            throw new Error('Нельзя создать товар в глобальной категории. Используйте локальную категорию продавца');
        }

        // Проверка что категория принадлежит продавцу
        if (category.seller.toString() !== productData.seller.toString()) {
            throw new Error('Категория не принадлежит этому продавцу');
        }

        // Проверка активности категории
        if (!category.isActive) {
            throw new Error('Нельзя создать товар в неактивной категории');
        }

        // Проверка уникальности названия
        const existingProduct = await Product.findOne({
            name: productData.name,
            seller: productData.seller
        });

        if (existingProduct) {
            throw new Error(`Товар "${productData.name}" уже существует у этого продавца`);
        }

        // Генерируем slug
        productData.slug = slugify(productData.name, { lower: true, strict: true });

        // Создаём товар
        const product = new Product(productData);
        await product.save();

        console.log(`✅ Товар "${product.name}" создан для продавца "${seller.name}"`);

        return product;
    }

    // Обновить товар (ТОЛЬКО ЕСЛИ ПРОДАВЕЦ В DRAFT!)
    async updateProduct(productId, updateData, userId, userRole) {
        const product = await Product.findById(productId);

        if (!product) {
            throw new Error('Товар не найден');
        }

        const seller = await Seller.findById(product.seller);

        if (!seller) {
            throw new Error('Продавец не найден');
        }

        // ========== ПРОВЕРКА СТАТУСА ПРОДАВЦА ==========
        if (seller.status !== 'draft') {
            throw new Error(`Нельзя редактировать товар продавца в статусе '${seller.status}'. Переведите продавца в draft.`);
        }
        // ===============================================

        // Проверка доступа
        if (userRole === 'manager') {
            if (seller.createdBy.toString() !== userId.toString()) {
                throw new Error('Вы можете обновлять только товары своих продавцов');
            }
        }

        // Запрет на изменение продавца
        if (updateData.seller) {
            delete updateData.seller;
            console.log('⚠️  Попытка изменить продавца товара - игнорировано');
        }

        // Проверка категории
        if (updateData.category && updateData.category !== product.category.toString()) {
            const category = await Category.findById(updateData.category);

            if (!category) {
                throw new Error('Категория не найдена');
            }

            if (category.isGlobal) {
                throw new Error('Нельзя переместить товар в глобальную категорию');
            }

            if (category.seller.toString() !== product.seller.toString()) {
                throw new Error('Категория не принадлежит продавцу этого товара');
            }

            if (!category.isActive) {
                throw new Error('Нельзя переместить товар в неактивную категорию');
            }
        }

        // Проверка уникальности названия
        if (updateData.name && updateData.name !== product.name) {
            const existingProduct = await Product.findOne({
                name: updateData.name,
                seller: product.seller,
                _id: { $ne: productId }
            });

            if (existingProduct) {
                throw new Error(`Товар "${updateData.name}" уже существует у этого продавца`);
            }

            updateData.slug = slugify(updateData.name, { lower: true, strict: true });
        }

        Object.assign(product, updateData);
        await product.save();

        console.log(`✅ Товар "${product.name}" обновлён`);

        return product;
    }

    // Удалить товар (ТОЛЬКО ЕСЛИ ПРОДАВЕЦ В DRAFT!)
    async deleteProduct(productId, userId, userRole) {
        const product = await Product.findById(productId);

        if (!product) {
            throw new Error('Товар не найден');
        }

        const seller = await Seller.findById(product.seller);

        if (!seller) {
            throw new Error('Продавец не найден');
        }

        // ========== ПРОВЕРКА СТАТУСА ПРОДАВЦА ==========
        if (seller.status !== 'draft') {
            throw new Error(`Нельзя удалять товары продавца в статусе '${seller.status}'. Переведите продавца в draft.`);
        }
        // ===============================================

        // Проверка доступа
        if (userRole === 'manager') {
            if (seller.createdBy.toString() !== userId.toString()) {
                throw new Error('Вы можете удалять только товары своих продавцов');
            }
        }

        // Удаляем все изображения товара
        if (product.images && product.images.length > 0) {
            const fs = await import('fs/promises');
            const path = await import('path');

            for (const imagePath of product.images) {
                const fullPath = path.join(process.cwd(), imagePath);
                try {
                    await fs.unlink(fullPath);
                } catch (err) {
                    console.error(`Ошибка удаления изображения ${imagePath}:`, err);
                }
            }
        }

        await product.deleteOne();

        console.log(`✅ Товар "${product.name}" удалён`);

        return product;
    }
    // Заменить изображение товара (с удалением старого файла)
    async replaceProductImage(productId, newImagePath, userId, userRole) {
        // Получаем товар
        const product = await this.getProductById(productId, userId, userRole);
        const oldImagePath = product.image;

        // Удаляем старый файл
        if (oldImagePath) {
            const fs = await import('fs/promises');
            const path = await import('path');
            const oldFilePath = path.join(process.cwd(), 'public', oldImagePath);

            try {
                await fs.unlink(oldFilePath);
                console.log(`🗑️  Удалён старый файл товара: ${oldImagePath}`);
            } catch (err) {
                console.log(`⚠️  Не удалось удалить старый файл товара: ${oldImagePath}`);
            }
        }

        // Обновляем товар
        return await this.updateProduct(productId, { image: newImagePath }, userId, userRole);
    }

    // Удалить изображение товара (ТОЛЬКО ЕСЛИ ПРОДАВЕЦ В DRAFT!)
    async deleteProductImage(productId, imagePath, userId, userRole) {
        const product = await Product.findById(productId);

        if (!product) {
            throw new Error('Товар не найден');
        }

        const seller = await Seller.findById(product.seller);

        if (!seller) {
            throw new Error('Продавец не найден');
        }

        // ========== ПРОВЕРКА СТАТУСА ПРОДАВЦА ==========
        if (seller.status !== 'draft') {
            throw new Error(`Нельзя удалять изображения товара в статусе '${seller.status}'. Переведите продавца в draft.`);
        }
        // ===============================================

        // Проверка доступа
        if (userRole === 'manager') {
            if (seller.createdBy.toString() !== userId.toString()) {
                throw new Error('Доступ запрещён');
            }
        }

        // Проверка что изображение существует
        if (!product.image) {
            throw new Error('Изображение не найдено');
        }

        // Удаляем файл
        const fs = await import('fs/promises');
        const path = await import('path');
        const fullPath = path.join(process.cwd(), 'public', product.image);

        try {
            await fs.unlink(fullPath);
        } catch (err) {
            console.error('Ошибка удаления файла:', err);
        }

        // Удаляем поле
        product.image = null;
        await product.save();

        console.log(`✅ Изображение удалено у товара "${product.name}"`);

        return product;
    }

}

export default new ProductService();