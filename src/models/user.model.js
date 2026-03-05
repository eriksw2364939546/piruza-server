import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 6,
        select: false
    },
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    role: {
        type: String,
        enum: ['owner', 'admin', 'manager'],
        default: 'manager'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
}, {
    timestamps: true
});

// ========== ИНДЕКСЫ ==========

// Уникальный индекс на email (для логина)
userSchema.index({ email: 1 }, { unique: true });

// Фильтр по роли
userSchema.index({ role: 1 });

// Фильтр по активности
userSchema.index({ isActive: 1 });

// Составной индекс: активные пользователи по роли
userSchema.index({ role: 1, isActive: 1 });

// Поиск по создателю (кто создал пользователя)
userSchema.index({ createdBy: 1 });

// Сортировка по дате создания
userSchema.index({ createdAt: -1 });

// Составной индекс: активные Manager'ы
userSchema.index({ role: 1, isActive: 1, createdAt: -1 });

// ЧИСТАЯ МОДЕЛЬ - БЕЗ ХУКОВ, БЕЗ МЕТОДОВ, БЕЗ ЛИШНИХ ПОЛЕЙ
// Вся логика в сервисах!

export default mongoose.model('User', userSchema);