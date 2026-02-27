import { Product, Seller } from '../models/index.js';
import { generateSlug } from '../utils/slug.util.js';

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
    async getProductById(productId) {
        const product = await Product.findById(productId)
            .populate('category', 'name slug')
            .populate('seller', 'name slug');

        if (!product) {
            throw new Error('Товар не найден');
        }

        return product;
    }

    // Создать товар
    async createProduct(data, userId, userRole) {
        const { name, seller } = data;

        // Проверка прав на продавца
        const sellerDoc = await Seller.findById(seller);
        if (!sellerDoc) {
            throw new Error('Продавец не найден');
        }

        // Manager может создавать товары только для своих продавцов
        if (userRole === 'manager' && sellerDoc.createdBy.toString() !== userId.toString()) {
            throw new Error('Доступ запрещён');
        }

        // Генерируем slug
        const baseSlug = generateSlug(name);

        // Проверяем уникальность slug внутри продавца
        let slug = baseSlug;
        let counter = 1;
        while (await Product.findOne({ slug, seller })) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }

        const product = new Product({
            ...data,
            slug
        });

        await product.save();
        return product;
    }

    // Обновить товар
    async updateProduct(productId, data, userId, userRole) {
        const product = await Product.findById(productId).populate('seller');

        if (!product) {
            throw new Error('Товар не найден');
        }

        // Проверка прав
        if (userRole === 'manager' && product.seller.createdBy.toString() !== userId.toString()) {
            throw new Error('Доступ запрещён');
        }

        // Если изменяется название, генерируем новый slug
        if (data.name && data.name !== product.name) {
            const baseSlug = generateSlug(data.name);

            // Проверяем уникальность внутри продавца
            let slug = baseSlug;
            let counter = 1;
            while (await Product.findOne({
                slug,
                seller: product.seller._id,
                _id: { $ne: productId }
            })) {
                slug = `${baseSlug}-${counter}`;
                counter++;
            }

            data.slug = slug;
        }

        Object.assign(product, data);
        await product.save();

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

        await Product.findByIdAndDelete(productId);
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