import mongoose from 'mongoose';

const citySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'City name is required'],
        trim: true
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true
    },
    isActive: {
        type: Boolean,
        default: false
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

export default mongoose.model('City', citySchema);