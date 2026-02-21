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

// Индекс на requestedBy для быстрой выборки заявок по Manager'у
sellerRequestSchema.index({ requestedBy: 1 });

export default mongoose.model('SellerRequest', sellerRequestSchema);