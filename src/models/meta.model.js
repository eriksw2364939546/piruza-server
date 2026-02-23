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

// Только индексы - БЕЗ ЛОГИКИ
metaSchema.index({ em: 1, role: 1 });

export default mongoose.model('Meta', metaSchema);