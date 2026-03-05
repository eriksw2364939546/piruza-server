/**
 * Универсальная функция пагинации для MongoDB запросов
 * 
 * @param {Object} query - Mongoose query объект (НЕ выполненный!)
 * @param {Number} page - Номер страницы (default: 1)
 * @param {Number} limit - Количество элементов на странице (default: 20)
 * @returns {Object} - { data, pagination }
 */
export const paginate = async (query, page = 1, limit = 20) => {
    // Преобразуем в числа и валидируем
    const currentPage = parseInt(page) || 1;
    const itemsPerPage = parseInt(limit) || 20;

    // Ограничение максимального лимита (защита от злоупотребления)
    const maxLimit = 100;
    const safeLimit = Math.min(itemsPerPage, maxLimit);

    // Вычисляем skip
    const skip = (currentPage - 1) * safeLimit;

    // Получаем общее количество документов
    const total = await query.clone().countDocuments();

    // Получаем данные с пагинацией
    const data = await query.skip(skip).limit(safeLimit);

    // Вычисляем метаданные пагинации
    const totalPages = Math.ceil(total / safeLimit);

    return {
        data,
        pagination: {
            page: currentPage,
            limit: safeLimit,
            total,
            totalPages,
            hasNext: currentPage < totalPages,
            hasPrev: currentPage > 1
        }
    };
};

/**
 * Извлечение параметров пагинации из query params
 * 
 * @param {Object} query - req.query объект
 * @returns {Object} - { page, limit }
 */
export const getPaginationParams = (query) => {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;

    return { page, limit };
};