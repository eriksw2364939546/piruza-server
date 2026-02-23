import { Product, Seller } from '../models/index.js';
import { generateSlug } from '../utils/slug.util.js';

class ProductService {
    // Получить товары продавца
    async getProductsBySeller(sellerId) {
        const products = await Product.find({ seller: sellerId })
            .populate('category', 'name slug')
            .sort({ createdAt: -1 });

        return products;
    }

    // Получить товар по slug (внутри продавца)
    async getProductBySlug(sellerId, slug) {
        const product = await Product.findOne({ seller: sellerId, slug })
            .populate('category', 'name slug')
            .populate('seller', 'name slug');

        if (!product) {
            throw new Error('Товар не найден');
        }

        return product;
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
}

export default new ProductService();