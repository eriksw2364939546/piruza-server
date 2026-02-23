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

// ЧИСТАЯ МОДЕЛЬ - БЕЗ ХУКОВ, БЕЗ МЕТОДОВ
// Вся логика в сервисах!

export default mongoose.model('Client', clientSchema);