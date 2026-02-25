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

// Уникальность: глобальные slug уникальны, локальные - внутри продавца
categorySchema.index({ slug: 1, isGlobal: 1 }, {
    unique: true,
    partialFilterExpression: { isGlobal: true }
});

categorySchema.index({ slug: 1, seller: 1 }, {
    unique: true,
    partialFilterExpression: { isGlobal: false }
});

export default mongoose.model('Category', categorySchema);