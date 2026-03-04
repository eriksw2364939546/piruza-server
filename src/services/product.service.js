import { Product, Seller, Category } from '../models/index.js';
import { generateSlug } from '../utils/slug.util.js';
import slugify from 'slugify';

class ProductService {
    // Получить товары продавца
    // Публично: только active продавцы
    // Owner/Admin: все продавцы
    // Manager: свои продавцы (любой статус)
    async getProductsBySeller(sellerId, userId = null, userRole = null) {
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

            const products = await Product.find({ seller: sellerId })
                .populate('category', 'name slug')
                .sort({ createdAt: -1 });

            return products;
        }

        // Если ЕСТЬ токен - проверяем права
        const seller = await Seller.findById(sellerId);

        if (!seller) {
            throw new Error('Продавец не найден');
        }

        // Owner и Admin видят всех
        if (userRole === 'owner' || userRole === 'admin') {
            const products = await Product.find({ seller: sellerId })
                .populate('category', 'name slug')
                .sort({ createdAt: -1 });

            return products;
        }

        // Manager видит только своих (любой статус)
        if (userRole === 'manager') {
            if (seller.createdBy.toString() !== userId.toString()) {
                throw new Error('Доступ запрещён. Вы можете видеть только товары своих продавцов');
            }

            const products = await Product.find({ seller: sellerId })
                .populate('category', 'name slug')
                .sort({ createdAt: -1 });

            return products;
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

    // Создать товар
    async createProduct(productData, userId, userRole) {
        // 1. ПРОВЕРКА КАТЕГОРИИ
        const category = await Category.findById(productData.category);

        if (!category) {
            throw new Error('Категория не найдена');
        }

        // Запрет на глобальные категории
        if (category.isGlobal) {
            throw new Error('Нельзя создавать товар под глобальную категорию. Используйте локальную категорию продавца');
        }

        // Проверка, что категория принадлежит продавцу
        if (category.seller.toString() !== productData.seller.toString()) {
            throw new Error('Категория не принадлежит указанному продавцу');
        }

        // Проверка активности категории
        if (!category.isActive) {
            throw new Error('Нельзя создавать товар под неактивную категорию');
        }

        // 2. ПРОВЕРКА ПРОДАВЦА
        const seller = await Seller.findById(productData.seller);

        if (!seller) {
            throw new Error('Продавец не найден');
        }

        // Manager может создавать товары только для своих продавцов
        if (userRole === 'manager') {
            if (seller.createdBy.toString() !== userId.toString()) {
                throw new Error('Вы можете создавать товары только для своих продавцов');
            }
        }

        // 3. ПРОВЕРКА УНИКАЛЬНОСТИ НАЗВАНИЯ У ПРОДАВЦА
        const existingProduct = await Product.findOne({
            name: productData.name,
            seller: productData.seller
        });

        if (existingProduct) {
            throw new Error(`Товар "${productData.name}" уже существует у этого продавца`);
        }

        // 4. ГЕНЕРАЦИЯ SLUG
        const slug = slugify(productData.name, { lower: true, strict: true });

        // 5. СОЗДАНИЕ ТОВАРА
        const product = new Product({
            ...productData,
            slug
        });

        await product.save();

        console.log(`✅ Товар "${product.name}" создан для продавца ${seller.name}`);

        return product;
    }

    // Обновить товар
    async updateProduct(productId, updateData, userId, userRole) {
        const product = await Product.findById(productId);

        if (!product) {
            throw new Error('Товар не найден');
        }

        const seller = await Seller.findById(product.seller);

        if (!seller) {
            throw new Error('Продавец не найден');
        }

        // Manager может обновлять только товары своих продавцов
        if (userRole === 'manager') {
            if (seller.createdBy.toString() !== userId.toString()) {
                throw new Error('Вы можете обновлять только товары своих продавцов');
            }
        }

        // ЗАЩИТА: Запрет на изменение продавца
        if (updateData.seller) {
            delete updateData.seller;
            console.log('⚠️  Попытка изменить продавца товара - игнорировано');
        }

        // НОВОЕ: Если обновляется категория
        if (updateData.category && updateData.category !== product.category.toString()) {
            const category = await Category.findById(updateData.category);

            if (!category) {
                throw new Error('Категория не найдена');
            }

            // Запрет на глобальные категории
            if (category.isGlobal) {
                throw new Error('Нельзя переместить товар в глобальную категорию. Используйте локальную категорию продавца');
            }

            // Проверка, что категория принадлежит продавцу
            if (category.seller.toString() !== product.seller.toString()) {
                throw new Error('Категория не принадлежит продавцу этого товара');
            }

            // Проверка активности категории
            if (!category.isActive) {
                throw new Error('Нельзя переместить товар в неактивную категорию');
            }
        }

        // НОВОЕ: Если обновляется название
        if (updateData.name && updateData.name !== product.name) {
            // Проверка уникальности нового названия
            const existingProduct = await Product.findOne({
                name: updateData.name,
                seller: product.seller,
                _id: { $ne: productId }  // Исключаем текущий товар
            });

            if (existingProduct) {
                throw new Error(`Товар "${updateData.name}" уже существует у этого продавца`);
            }

            // Обновляем slug при изменении названия
            updateData.slug = slugify(updateData.name, { lower: true, strict: true });
        }

        // Обновляем товар
        Object.assign(product, updateData);
        await product.save();

        console.log(`✅ Товар "${product.name}" обновлён`);

        return product;
    }

    // Удалить товар
    async deleteProduct(productId, userId, userRole) {
        const product = await Product.findById(productId).populate('seller');

        if (!product) {
            throw new Error('Товар не найден');
        }

        // Проверка прав
        if (userRole === 'manager' && product.seller.createdBy.toString() !== userId.toString()) {
            throw new Error('Доступ запрещён');
        }

        // НОВОЕ: Удаление изображения с диска
        if (product.image) {
            const fs = await import('fs/promises');
            const path = await import('path');
            const imagePath = path.join(process.cwd(), 'public', product.image);

            try {
                await fs.unlink(imagePath);
                console.log(`  ✅ Удалено изображение товара: ${product.image}`);
            } catch (err) {
                console.log(`  ⚠️  Не удалось удалить изображение товара: ${product.image}`);
            }
        }

        // Удаление товара из БД
        await Product.findByIdAndDelete(productId);

        console.log(`🗑️  Товар "${product.name}" удалён`);

        return product;
    }
    // Заменить изображение товара (с удалением старого файла)
    async replaceProductImage(productId, newImagePath, userId, userRole) {
        // Получаем товар
        const product = await this.getProductById(productId);
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

    // Удалить изображение товара
    async deleteProductImage(productId, userId, userRole) {
        // Получаем товар
        const product = await this.getProductById(productId);

        if (!product.image) {
            throw new Error('У товара нет изображения');
        }

        const oldImagePath = product.image;

        // Удаляем файл с диска
        const fs = await import('fs/promises');
        const path = await import('path');
        const oldFilePath = path.join(process.cwd(), 'public', oldImagePath);

        try {
            await fs.unlink(oldFilePath);
            console.log(`🗑️  Удалено изображение товара: ${oldImagePath}`);
        } catch (err) {
            console.log(`⚠️  Не удалось удалить файл: ${oldImagePath}`);
        }

        // Обновляем товар
        return await this.updateProduct(productId, { image: null }, userId, userRole);
    }
}

export default new ProductService();