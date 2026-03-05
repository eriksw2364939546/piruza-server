import mongoose from 'mongoose';

const sellerRequestSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Seller name is required'],
        trim: true
    },
    businessType: {
        type: String,
        required: [true, 'Business type is required'],
        trim: true
    },
    legalInfo: {
        type: String,
        required: [true, 'Legal info is required'],
        trim: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    isUsed: {
        type: Boolean,
        default: false // true = уже создан продавец по этой заявке
    },
    usedAt: {
        type: Date,
        default: null // Когда заявка была использована
    },
    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Manager, который создал заявку
        required: true
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Owner/Admin, кто одобрил/отклонил
        default: null
    },
    reviewedAt: {
        type: Date,
        default: null
    },
    rejectionReason: {
        type: String,
        trim: true,
        default: null
    }
}, {
    timestamps: true
});

// ========== ИНДЕКСЫ ==========

// Индекс на requestedBy для быстрой выборки заявок по Manager'у
sellerRequestSchema.index({ requestedBy: 1 });

// Фильтр по статусу
sellerRequestSchema.index({ status: 1 });

// Поиск неиспользованных одобренных заявок (для createSeller)
sellerRequestSchema.index({ status: 1, isUsed: 1 });

// Составной индекс: заявки Manager'а по статусу
sellerRequestSchema.index({ requestedBy: 1, status: 1 });

// Составной индекс: одобренные неиспользованные заявки Manager'а
sellerRequestSchema.index({ requestedBy: 1, status: 1, isUsed: 1 });

// Поиск по проверяющему (кто одобрил/отклонил)
sellerRequestSchema.index({ reviewedBy: 1 });

// Сортировка по дате создания (новые заявки первыми)
sellerRequestSchema.index({ createdAt: -1 });

// Сортировка по дате проверки
sellerRequestSchema.index({ reviewedAt: -1 });

// Составной индекс: pending заявки отсортированные по дате
sellerRequestSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('SellerRequest', sellerRequestSchema);