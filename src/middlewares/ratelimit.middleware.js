import rateLimit from 'express-rate-limit';

// 1. АВТОРИЗАЦИЯ (LOGIN) - строгий лимит
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 5, // Максимум 5 попыток
    message: {
        success: false,
        message: 'Слишком много попыток входа. Попробуйте через 15 минут'
    },
    standardHeaders: true,
    legacyHeaders: false
    // ← УБРАЛИ keyGenerator!
});

// 2. РЕГИСТРАЦИЯ - строгий лимит
export const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 час
    max: 3, // Максимум 3 регистрации
    message: {
        success: false,
        message: 'Слишком много попыток регистрации. Попробуйте через час'
    },
    standardHeaders: true,
    legacyHeaders: false
    // ← УБРАЛИ keyGenerator!
});

// 3. СОЗДАНИЕ ПРОДАВЦА - средний лимит
export const createSellerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 час
    max: 10, // Максимум 10 продавцов в час
    message: {
        success: false,
        message: 'Слишком много попыток создания продавцов. Попробуйте позже'
    },
    standardHeaders: true,
    legacyHeaders: false
    // ← УБРАЛИ keyGenerator!
});

// 4. РЕЙТИНГИ - защита от спама оценками
export const ratingLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 20, // Максимум 20 оценок за 15 минут
    message: {
        success: false,
        message: 'Слишком много оценок. Попробуйте через 15 минут'
    },
    standardHeaders: true,
    legacyHeaders: false
    // ← УБРАЛИ keyGenerator!
});

// 5. ОБЩИЙ API - мягкий лимит для всех остальных запросов
export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 100, // Максимум 100 запросов
    message: {
        success: false,
        message: 'Слишком много запросов. Попробуйте через 15 минут'
    },
    standardHeaders: true,
    legacyHeaders: false
    // ← УБРАЛИ keyGenerator!
});

// 6. ЗАГРУЗКА ФАЙЛОВ - средний лимит
export const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 час
    max: 50, // Максимум 50 загрузок в час
    message: {
        success: false,
        message: 'Слишком много загрузок файлов. Попробуйте позже'
    },
    standardHeaders: true,
    legacyHeaders: false
    // ← УБРАЛИ keyGenerator!
});

// 7. СОЗДАНИЕ ЗАЯВОК - защита от спама заявками
export const requestLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 часа
    max: 5, // Максимум 5 заявок в день
    message: {
        success: false,
        message: 'Слишком много заявок. Попробуйте завтра'
    },
    standardHeaders: true,
    legacyHeaders: false
    // ← УБРАЛИ keyGenerator!
});