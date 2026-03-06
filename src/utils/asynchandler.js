/**
 * Wrapper для async функций контроллеров
 * Автоматически ловит ошибки и передаёт в next()
 * 
 * @param {Function} fn - Async функция контроллера
 * @returns {Function} - Wrapped функция
 * 
 * @example
 * // Вместо:
 * async getAllSellers(req, res) {
 *   try {
 *     const sellers = await sellerService.getAllSellers();
 *     res.json(sellers);
 *   } catch (err) {
 *     res.status(500).json({ error: err.message });
 *   }
 * }
 * 
 * // Используем:
 * getAllSellers = asyncHandler(async (req, res, next) => {
 *   const sellers = await sellerService.getAllSellers();
 *   res.json(sellers);
 * });
 */
export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};