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
        unique: true,
        lowercase: true
    },
    name: {
        type: String,
        required: true
    },
    avatar: {
        type: String, // URL от Google
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
    }], // НОВОЕ - избранные магазины
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Индекс на googleId для быстрого поиска
clientSchema.index({ googleId: 1 });

export default mongoose.model('Client', clientSchema);