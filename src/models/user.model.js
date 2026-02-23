import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 6,
        select: false
    },
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    role: {
        type: String,
        enum: ['owner', 'admin', 'manager'],
        default: 'manager'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
}, {
    timestamps: true
});

// ЧИСТАЯ МОДЕЛЬ - БЕЗ ХУКОВ, БЕЗ МЕТОДОВ, БЕЗ ЛИШНИХ ПОЛЕЙ
// Вся логика в сервисах!

export default mongoose.model('User', userSchema);