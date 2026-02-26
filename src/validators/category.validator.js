import Joi from 'joi';

class CategoryValidator {
    // Схема для создания глобальной категории
    createGlobalCategorySchema = Joi.object({
        name: Joi.string()
            .min(2)
            .required()
            .messages({
                'string.min': 'Название категории должно быть минимум 2 символа',
                'any.required': 'Название категории обязательно'
            }),

        isGlobal: Joi.boolean()
            .valid(true)
            .required()
            .messages({
                'any.only': 'Для глобальной категории isGlobal должен быть true',
                'any.required': 'Поле isGlobal обязательно'
            })
    });

    // Схема для создания локальной категории продавца
    createSellerCategorySchema = Joi.object({
        name: Joi.string()
            .min(2)
            .required()
            .messages({
                'string.min': 'Название категории должно быть минимум 2 символа',
                'any.required': 'Название категории обязательно'
            }),

        seller: Joi.string()
            .required()
            .messages({
                'any.required': 'ID продавца обязателен'
            }),

        isGlobal: Joi.boolean()
            .valid(false)
            .required()
            .messages({
                'any.only': 'Для локальной категории isGlobal должен быть false',
                'any.required': 'Поле isGlobal обязательно'
            })
    });

    // Схема для обновления категории
    updateCategorySchema = Joi.object({
        name: Joi.string()
            .min(2)
            .optional()
            .messages({
                'string.min': 'Название категории должно быть минимум 2 символа'
            }),

        description: Joi.string()
            .optional(),

        isActive: Joi.boolean()
            .optional()
    });
}

export default new CategoryValidator();