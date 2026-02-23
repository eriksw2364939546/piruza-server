class ValidationMiddleware {
    // Middleware для валидации через Joi схему
    validate(schema) {
        return (req, res, next) => {
            const { error, value } = schema.validate(req.body, {
                abortEarly: false, // Собираем все ошибки, не останавливаемся на первой
                stripUnknown: true // Удаляем поля, которых нет в схеме
            });

            if (error) {
                // Форматируем ошибки валидации
                const errors = error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message
                }));

                return res.status(400).json({
                    success: false,
                    message: 'Ошибка валидации',
                    errors
                });
            }

            // Заменяем req.body на валидированные и очищенные данные
            req.body = value;
            next();
        };
    }
}

export default new ValidationMiddleware();