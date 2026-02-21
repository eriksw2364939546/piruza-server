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

// Один клиент = одна оценка на продавца
sellerRatingSchema.index({ seller: 1, client: 1 }, { unique: true });

export default mongoose.model('SellerRating', sellerRatingSchema);