import mongoose from 'mongoose';
import slugify from 'slugify';

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
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Генерация slug перед сохранением
citySchema.pre('save', function (next) {
    if (this.isModified('name')) {
        this.slug = slugify(this.name, { lower: true, strict: true, locale: 'fr' });
    }
    next();
});

// Обновление slug при update
citySchema.pre('findOneAndUpdate', function (next) {
    const update = this.getUpdate();
    if (update.name) {
        update.slug = slugify(update.name, { lower: true, strict: true, locale: 'fr' });
    }
    next();
});

export default mongoose.model('City', citySchema);