import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema({
    googleId: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        trim: true
    },
    name: {
        type: String,
        required: true
    },
    avatar: {
        type: String,
        default: null
    },
    city: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'City',
        default: null
    },
    favorites: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Seller'
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// ========== ИНДЕКСЫ ==========

// Поиск по googleId (уже unique, но добавляем для оптимизации)
clientSchema.index({ googleId: 1 });

// Поиск по email (для логина/поиска)
clientSchema.index({ email: 1 });

// Фильтр по активности
clientSchema.index({ isActive: 1 });

// Поиск клиентов по городу
clientSchema.index({ city: 1 });

// Поиск по избранным продавцам
clientSchema.index({ favorites: 1 });

// Составной индекс для активных клиентов в городе
clientSchema.index({ city: 1, isActive: 1 });

// ЧИСТАЯ МОДЕЛЬ - БЕЗ ХУКОВ, БЕЗ МЕТОДОВ
// Вся логика в сервисах!

export default mongoose.model('Client', clientSchema);