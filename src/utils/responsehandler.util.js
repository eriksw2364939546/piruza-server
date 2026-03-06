// Успешный ответ
export const success = (res, data = null, message = 'Success', statusCode = 200, pagination = null) => {
    const response = {
        success: true,
        message,
        data
    };

    // Добавляем пагинацию если она есть
    if (pagination) {
        response.pagination = pagination;
    }

    return res.status(statusCode).json(response);
};

// Ошибка
export const error = (res, message = 'Error', statusCode = 500, errors = null) => {
    const response = {
        success: false,
        message
    };

    if (errors) {
        response.errors = errors;
    }

    return res.status(statusCode).json(response);
};