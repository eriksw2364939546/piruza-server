import rateLimit from 'express-rate-limit';

// По IP — для публичных роутов
const keyByIP = (req) => req.ip;

// По userId (если авторизован) или IP
const keyByUser = (req) => req.user?.id || req.ip;

// 1. АВТОРИЗАЦИЯ (LOGIN) - строгий
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 10,
    keyGenerator: keyByIP,
    message: { success: false, message: 'Слишком много попыток входа. Попробуйте через 15 минут' },
    standardHeaders: true,
    legacyHeaders: false,
});

// 2. РЕГИСТРАЦИЯ - строгий
export const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 час
    max: 3,
    keyGenerator: keyByIP,
    message: { success: false, message: 'Слишком много попыток регистрации. Попробуйте через час' },
    standardHeaders: true,
    legacyHeaders: false,
});

// 3. СОЗДАНИЕ ПРОДАВЦА - средний
export const createSellerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    keyGenerator: keyByUser,
    message: { success: false, message: 'Слишком много попыток создания продавцов. Попробуйте позже' },
    standardHeaders: true,
    legacyHeaders: false,
});

// 4. РЕЙТИНГИ
export const ratingLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    keyGenerator: keyByUser,
    message: { success: false, message: 'Слишком много оценок. Попробуйте через 15 минут' },
    standardHeaders: true,
    legacyHeaders: false,
});

// 5. ПУБЛИЧНЫЕ РОУТЫ — умеренный лимит
export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    keyGenerator: keyByIP,
    message: { success: false, message: 'Слишком много запросов. Попробуйте через 15 минут' },
    standardHeaders: true,
    legacyHeaders: false,
});

// 6. ADMIN ПАНЕЛЬ — мягкий лимит для авторизованных пользователей
export const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 2000, // авторизованный пользователь — кликает свободно
    keyGenerator: keyByUser,
    message: { success: false, message: 'Слишком много запросов. Попробуйте через 15 минут' },
    standardHeaders: true,
    legacyHeaders: false,
});

// 7. ЗАГРУЗКА ФАЙЛОВ
export const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 50,
    keyGenerator: keyByUser,
    message: { success: false, message: 'Слишком много загрузок файлов. Попробуйте позже' },
    standardHeaders: true,
    legacyHeaders: false,
});

// 8. СОЗДАНИЕ ЗАЯВОК
export const requestLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000,
    max: 5,
    keyGenerator: keyByUser,
    message: { success: false, message: 'Слишком много заявок. Попробуйте завтра' },
    standardHeaders: true,
    legacyHeaders: false,
});