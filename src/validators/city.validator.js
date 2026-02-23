import Joi from 'joi';

class CityValidator {
    // Схема для создания города
    createCitySchema = Joi.object({
        name: Joi.string()
            .min(2)
            .required()
            .messages({
                'string.min': 'Название города должно быть минимум 2 символа',
                'any.required': 'Название города обязательно'
            })
    });

    // Схема для обновления города
    updateCitySchema = Joi.object({
        name: Joi.string()
            .min(2)
            .optional()
            .messages({
                'string.min': 'Название города должно быть минимум 2 символа'
            }),

        isActive: Joi.boolean()
            .optional()
    });
}

export default new CityValidator();