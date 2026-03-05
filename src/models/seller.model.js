import mongoose from 'mongoose';

const sellerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Seller name is required'],
        trim: true
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true
    },
    businessType: {
        type: String, // Тип бизнеса (из заявки)
        trim: true
    },
    legalInfo: {
        type: String, // Минимум юр данных (из заявки)
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    address: {
        type: String,
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    whatsapp: {
        type: String,
        trim: true
    },
    logo: {
        type: String,
        default: null
    },
    coverImage: {
        type: String,
        default: null
    },
    city: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'City'
    },
    globalCategories: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    }],
    status: {
        type: String,
        enum: ['draft', 'active', 'expired', 'inactive'],
        default: 'draft'
    },
    activationStartDate: {
        type: Date,
        default: null
    },
    activationEndDate: {
        type: Date,
        default: null
    },
    averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    totalRatings: {
        type: Number,
        default: 0
    },
    viewsCount: {
        type: Number,
        default: 0
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true // Manager, Admin или Owner
    }
}, {
    timestamps: true
});

// ========== ИНДЕКСЫ ==========

// Поиск по slug (уже unique, но добавляем для оптимизации)
sellerSchema.index({ slug: 1 });

// Поиск по городу
sellerSchema.index({ city: 1 });

// Фильтр по статусу
sellerSchema.index({ status: 1 });

// Поиск по глобальным категориям
sellerSchema.index({ globalCategories: 1 });

// Поиск по автору (createdBy) - для Manager'а
sellerSchema.index({ createdBy: 1 });

// Составной индекс: активные продавцы в городе
sellerSchema.index({ city: 1, status: 1 });

// Составной индекс: продавцы по категории и статусу
sellerSchema.index({ globalCategories: 1, status: 1 });

// Составной индекс: продавцы Manager'а по статусу
sellerSchema.index({ createdBy: 1, status: 1 });

// Составной индекс: активные продавцы по городу и категории (для публичных запросов)
sellerSchema.index({ city: 1, globalCategories: 1, status: 1 });

// Поиск истекающих продавцов (для cron job)
sellerSchema.index({ activationEndDate: 1, status: 1 });

// Сортировка по рейтингу
sellerSchema.index({ averageRating: -1 });

// Сортировка по популярности (просмотры)
sellerSchema.index({ viewsCount: -1 });

// Текстовый поиск по названию, описанию и типу бизнеса
sellerSchema.index({ name: 'text', description: 'text', businessType: 'text' });

export default mongoose.model('Seller', sellerSchema);