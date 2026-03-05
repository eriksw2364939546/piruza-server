import mongoose from 'mongoose';

const metaSchema = new mongoose.Schema({
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        default: null
    },
    moderator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    role: {
        type: String,
        enum: ['client', 'moderator'],
        required: true
    },
    em: {
        type: String,
        required: true,
        unique: true
    }
}, {
    timestamps: true
});

// ========== ИНДЕКСЫ ==========

// Поиск по em и роли
metaSchema.index({ em: 1, role: 1 });

// Поиск по em (уже unique, но добавляем для оптимизации)
metaSchema.index({ em: 1 });

// Поиск по client
metaSchema.index({ client: 1 });

// Поиск по moderator
metaSchema.index({ moderator: 1 });

// Фильтр по роли
metaSchema.index({ role: 1 });

export default mongoose.model('Meta', metaSchema);