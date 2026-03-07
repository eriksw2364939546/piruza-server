import AppError from '../utils/apperror.js';
import logger from '../utils/logger.js';

// ========== ОБРАБОТЧИКИ СПЕЦИФИЧНЫХ ОШИБОК ==========

/**
 * Обработка ошибок валидации Mongoose
 */
const handleValidationError = (err) => {
    const errors = Object.values(err.errors).map(el => ({
        field: el.path,
        message: el.message
    }));

    const message = 'Ошибка валидации данных';
    const error = new AppError(message, 400);
    error.errors = errors;

    return error;
};

/**
 * Обработка ошибок дубликатов MongoDB (unique constraint)
 */
const handleDuplicateFieldsError = (err) => {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];

    const message = `Значение "${value}" для поля "${field}" уже существует`;
    return new AppError(message, 400);
};

/**
 * Обработка ошибок CastError (неверный формат ID)
 */
const handleCastError = (err) => {
    const message = `Неверный формат ${err.path}: ${err.value}`;
    return new AppError(message, 400);
};

/**
 * Обработка JWT ошибок - неверный токен
 */
const handleJWTError = () => {
    return new AppError('Неверный токен. Пожалуйста, войдите снова', 401);
};

/**
 * Обработка JWT ошибок - истёкший токен
 */
const handleJWTExpiredError = () => {
    return new AppError('Токен истёк. Пожалуйста, войдите снова', 401);
};

// ========== ОТПРАВКА ОШИБОК ==========

/**
 * Отправка ошибки в режиме разработки (с полной информацией)
 */
const sendErrorDev = (err, res) => {
    res.status(err.statusCode).json({
        success: false,
        status: err.status,
        message: err.message,
        error: err,
        stack: err.stack,
        ...(err.errors && { errors: err.errors })
    });
};

/**
 * Отправка ошибки в режиме production (безопасная)
 */
const sendErrorProd = (err, res) => {
    // Операционная ошибка (доверенная) - показываем клиенту
    if (err.isOperational) {
        const response = {
            success: false,
            message: err.message
        };

        // Добавляем errors если есть (валидация)
        if (err.errors) {
            response.errors = err.errors;
        }

        res.status(err.statusCode).json(response);
    }
    // Программная ошибка (недоверенная) - НЕ показываем детали
    else {
        // Логируем программную ошибку
        logger.error('ПРОГРАММНАЯ ОШИБКА (не операционная)', {
            message: err.message,
            stack: err.stack,
        });

        res.status(500).json({
            success: false,
            message: 'Что-то пошло не так на сервере'
        });
    }
};

// ========== ГЛОБАЛЬНЫЙ ОБРАБОТЧИК ОШИБОК ==========

/**
 * Глобальный middleware для обработки всех ошибок
 * ВАЖНО: Должен быть последним middleware в app.js
 */
const globalErrorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // ЛОГИРУЕМ ОШИБКУ
    logger.error('GlobalErrorHandler caught error', {
        message: err.message,
        statusCode: err.statusCode,
        status: err.status,
        name: err.name,
        code: err.code,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        ...(err.stack && { stack: err.stack }),
    });

    // Development режим - показываем всё
    if (process.env.NODE_ENV === 'development') {
        let error = { ...err };
        error.message = err.message;
        error.name = err.name;

        // Обработка специфичных ошибок Mongoose (в dev тоже!)
        if (err.name === 'CastError') {
            error = handleCastError(err);
        }

        if (err.code === 11000) {
            error = handleDuplicateFieldsError(err);
        }

        if (err.name === 'ValidationError') {
            error = handleValidationError(err);
        }

        // Обработка JWT ошибок
        if (err.name === 'JsonWebTokenError') {
            error = handleJWTError();
        }

        if (err.name === 'TokenExpiredError') {
            error = handleJWTExpiredError();
        }

        sendErrorDev(error, res);
    }
    // Production режим - скрываем детали
    else if (process.env.NODE_ENV === 'production') {
        let error = { ...err };
        error.message = err.message;
        error.name = err.name;

        // Обработка специфичных ошибок Mongoose
        if (err.name === 'CastError') {
            error = handleCastError(err);
        }

        if (err.code === 11000) {
            error = handleDuplicateFieldsError(err);
        }

        if (err.name === 'ValidationError') {
            error = handleValidationError(err);
        }

        // Обработка JWT ошибок
        if (err.name === 'JsonWebTokenError') {
            error = handleJWTError();
        }

        if (err.name === 'TokenExpiredError') {
            error = handleJWTExpiredError();
        }

        sendErrorProd(error, res);
    }
};

export default globalErrorHandler;