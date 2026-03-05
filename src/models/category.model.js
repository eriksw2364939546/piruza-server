import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Category name is required'],
        trim: true
    },
    slug: {
        type: String,
        lowercase: true
    },
    description: {
        type: String,
        trim: true
    },
    isGlobal: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: false // По умолчанию неактивна до привязки продавцов
    },
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Seller',
        default: null // null для глобальных категорий
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// ========== ИНДЕКСЫ ==========

// Уникальность: глобальные slug уникальны, локальные - внутри продавца
categorySchema.index({ slug: 1, isGlobal: 1 }, {
    unique: true,
    partialFilterExpression: { isGlobal: true }
});

categorySchema.index({ slug: 1, seller: 1 }, {
    unique: true,
    partialFilterExpression: { isGlobal: false }
});

// Поиск по продавцу (для локальных категорий)
categorySchema.index({ seller: 1, isGlobal: 1 });

// Фильтр по активности
categorySchema.index({ isActive: 1 });

// Поиск глобальных категорий
categorySchema.index({ isGlobal: 1, isActive: 1 });

// Для автора (кто создал)
categorySchema.index({ createdBy: 1 });

export default mongoose.model('Category', categorySchema);