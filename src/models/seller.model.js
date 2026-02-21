import mongoose from 'mongoose';
import slugify from 'slugify';

const sellerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Seller name is required'],
        trim: true
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true
    },
    businessType: {
        type: String, // Тип бизнеса (из заявки)
        trim: true
    },
    legalInfo: {
        type: String, // Минимум юр данных (из заявки)
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    address: {
        type: String,
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    whatsapp: {
        type: String,
        trim: true
    },
    logo: {
        type: String,
        default: null
    },
    coverImage: {
        type: String,
        default: null
    },
    city: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'City'
    },
    globalCategories: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    }],
    status: {
        type: String,
        enum: ['draft', 'active', 'expired', 'inactive'],
        default: 'draft'
    },
    activationStartDate: {
        type: Date,
        default: null
    },
    activationEndDate: {
        type: Date,
        default: null
    },
    averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    totalRatings: {
        type: Number,
        default: 0
    },
    viewsCount: {
        type: Number,
        default: 0
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true // Manager, Admin или Owner
    }
}, {
    timestamps: true
});

// Генерация slug перед сохранением
sellerSchema.pre('save', function (next) {
    if (this.isModified('name')) {
        this.slug = slugify(this.name, { lower: true, strict: true, locale: 'fr' });
    }
    next();
});

// Обновление slug при update
sellerSchema.pre('findOneAndUpdate', function (next) {
    const update = this.getUpdate();
    if (update.name) {
        update.slug = slugify(update.name, { lower: true, strict: true, locale: 'fr' });
    }
    next();
});

export default mongoose.model('Seller', sellerSchema);