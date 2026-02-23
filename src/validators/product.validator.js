import Joi from 'joi';

class ProductValidator {
    // Схема для создания товара
    createProductSchema = Joi.object({
        name: Joi.string()
            .min(2)
            .required()
            .messages({
                'string.min': 'Название товара должно быть минимум 2 символа',
                'any.required': 'Название товара обязательно'
            }),

        code: Joi.string()
            .optional(),

        description: Joi.string()
            .optional(),

        price: Joi.number()
            .min(0)
            .optional()
            .messages({
                'number.min': 'Цена не может быть отрицательной'
            }),

        seller: Joi.string()
            .required()
            .messages({
                'any.required': 'ID продавца обязателен'
            }),

        category: Joi.string()
            .optional(),

        isAvailable: Joi.boolean()
            .optional()
    });

    // Схема для обновления товара
    updateProductSchema = Joi.object({
        name: Joi.string()
            .min(2)
            .optional()
            .messages({
                'string.min': 'Название товара должно быть минимум 2 символа'
            }),

        code: Joi.string()
            .optional(),

        description: Joi.string()
            .optional(),

        price: Joi.number()
            .min(0)
            .optional()
            .messages({
                'number.min': 'Цена не может быть отрицательной'
            }),

        category: Joi.string()
            .optional(),

        isAvailable: Joi.boolean()
            .optional()
    });
}

export default new ProductValidator();