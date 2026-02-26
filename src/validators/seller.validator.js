import Joi from 'joi';

class SellerValidator {
    // Схема для создания продавца (после одобрения заявки)
    createSellerSchema = Joi.object({
        name: Joi.string()
            .min(2)
            .required()
            .messages({
                'string.min': 'Название должно быть минимум 2 символа',
                'any.required': 'Название обязательно'
            }),

        businessType: Joi.string()
            .optional(),

        legalInfo: Joi.string()
            .optional(),

        description: Joi.string()
            .optional(),

        address: Joi.string()
            .optional(),

        phone: Joi.string()
            .optional(),

        whatsapp: Joi.string()
            .optional(),

        city: Joi.string()
            .required()
            .messages({
                'any.required': 'ID города обязателен'
            }),

        globalCategories: Joi.array()
            .items(Joi.string())
            .optional(),

        // НОВОЕ: Локальные категории
        localCategories: Joi.array()
            .items(Joi.object({
                name: Joi.string()
                    .required()
                    .messages({
                        'any.required': 'Название категории обязательно'
                    }),
                description: Joi.string()
                    .optional()
            }))
            .optional(),

        // НОВОЕ: Товары
        products: Joi.array()
            .items(Joi.object({
                name: Joi.string()
                    .required()
                    .messages({
                        'any.required': 'Название товара обязательно'
                    }),
                code: Joi.string().optional(),
                description: Joi.string().optional(),
                price: Joi.number().min(0).optional(),
                categoryIndex: Joi.number().integer().min(0).optional() // Индекс из localCategories
            }))
            .optional()
    });

    // Схема для обновления продавца
    updateSellerSchema = Joi.object({
        name: Joi.string()
            .min(2)
            .optional()
            .messages({
                'string.min': 'Название должно быть минимум 2 символа'
            }),

        businessType: Joi.string()
            .optional(),

        legalInfo: Joi.string()
            .optional(),

        description: Joi.string()
            .optional(),

        address: Joi.string()
            .optional(),

        phone: Joi.string()
            .optional(),

        whatsapp: Joi.string()
            .optional(),

        city: Joi.string()
            .optional(),

        globalCategories: Joi.array()
            .items(Joi.string())
            .optional()
    });

    // Схема для активации продавца
    activateSellerSchema = Joi.object({
        months: Joi.number()
            .integer()
            .min(1)
            .required()
            .messages({
                'number.min': 'Минимальный срок активации - 1 месяц',
                'any.required': 'Количество месяцев обязательно'
            })
    });

    // Схема для обновления глобальных категорий
    updateGlobalCategoriesSchema = Joi.object({
        globalCategories: Joi.array()
            .items(Joi.string())
            .required()
            .messages({
                'any.required': 'Массив категорий обязателен'
            })
    });
}

export default new SellerValidator();