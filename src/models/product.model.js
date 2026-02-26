import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true
    },
    slug: {
        type: String,
        lowercase: true
    },
    code: {
        type: String, // Артикул
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    price: {
        type: Number,
        min: 0
    },
    image: {
        type: String,
        default: null
    },
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Seller',
        required: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    },
    isAvailable: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Уникальность slug внутри продавца
productSchema.index({ slug: 1, seller: 1 }, { unique: true });

export default mongoose.model('Product', productSchema);