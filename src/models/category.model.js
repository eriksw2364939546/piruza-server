import mongoose from 'mongoose';
import slugify from 'slugify';

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
    isGlobal: {
        type: Boolean,
        default: false
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

// Генерация slug перед сохранением
categorySchema.pre('save', function (next) {
    if (this.isModified('name')) {
        this.slug = slugify(this.name, { lower: true, strict: true, locale: 'fr' });
    }
    next();
});

// Обновление slug при update
categorySchema.pre('findOneAndUpdate', function (next) {
    const update = this.getUpdate();
    if (update.name) {
        update.slug = slugify(update.name, { lower: true, strict: true, locale: 'fr' });
    }
    next();
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