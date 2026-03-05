//sellerrating.model.js
import mongoose from 'mongoose';

const sellerRatingSchema = new mongoose.Schema({
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Seller',
        required: true
    },
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    }
}, {
    timestamps: true
});

// ========== ИНДЕКСЫ ==========

// Один клиент = одна оценка на продавца (уникальность)
sellerRatingSchema.index({ seller: 1, client: 1 }, { unique: true });

// Поиск всех оценок продавца
sellerRatingSchema.index({ seller: 1 });

// Поиск оценок клиента
sellerRatingSchema.index({ client: 1 });

// Поиск по рейтингу (для статистики)
sellerRatingSchema.index({ rating: 1 });

// Составной индекс: оценки продавца по рейтингу
sellerRatingSchema.index({ seller: 1, rating: 1 });

// Сортировка по дате создания (последние оценки)
sellerRatingSchema.index({ createdAt: -1 });

// Составной индекс: последние оценки продавца
sellerRatingSchema.index({ seller: 1, createdAt: -1 });

export default mongoose.model('SellerRating', sellerRatingSchema);