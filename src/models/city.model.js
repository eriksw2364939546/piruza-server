import mongoose from 'mongoose';

const citySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'City name is required'],
        trim: true
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true
    },
    isActive: {
        type: Boolean,
        default: false
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

// Поиск по slug (уже unique, но добавляем для оптимизации)
citySchema.index({ slug: 1 });

// Фильтр по активности
citySchema.index({ isActive: 1 });

// Поиск активных городов
citySchema.index({ isActive: 1, name: 1 });

// Для автора (кто создал)
citySchema.index({ createdBy: 1 });

export default mongoose.model('City', citySchema);