/**
 * Кастомный класс ошибок для приложения
 * Наследуется от Error и добавляет дополнительную информацию
 */
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);

        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true; // Отличает наши ошибки от программных

        Error.captureStackTrace(this, this.constructor);
    }
}

export default AppError;