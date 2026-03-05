import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true
    },
    slug: {
        type: String,
        lowercase: true
    },
    code: {
        type: String, // Артикул
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    price: {
        type: Number,
        min: 0
    },
    image: {
        type: String,
        default: null
    },
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Seller',
        required: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    },
    isAvailable: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// ========== ИНДЕКСЫ ==========

// Уникальность slug внутри продавца
productSchema.index({ slug: 1, seller: 1 }, { unique: true });

// Поиск товаров по продавцу
productSchema.index({ seller: 1 });

// Поиск по категории
productSchema.index({ category: 1 });

// Поиск доступных товаров
productSchema.index({ isAvailable: 1 });

// Составной индекс: товары продавца по категории
productSchema.index({ seller: 1, category: 1 });

// Составной индекс: доступные товары продавца
productSchema.index({ seller: 1, isAvailable: 1 });

// Поиск по артикулу (если используется)
productSchema.index({ code: 1 });

// Сортировка по цене
productSchema.index({ price: 1 });

// Текстовый поиск по названию и описанию
productSchema.index({ name: 'text', description: 'text' });

export default mongoose.model('Product', productSchema);