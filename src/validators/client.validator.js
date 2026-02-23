import Joi from 'joi';

class ClientValidator {
    // Схема для Google OAuth логина
    googleLoginSchema = Joi.object({
        idToken: Joi.string()
            .required()
            .messages({
                'any.required': 'Google ID Token обязателен'
            })
    });

    // Схема для обновления города клиента
    updateClientCitySchema = Joi.object({
        city: Joi.string()
            .required()
            .messages({
                'any.required': 'ID города обязателен'
            })
    });

    // Схема для добавления/удаления из избранного
    toggleFavoriteSchema = Joi.object({
        sellerId: Joi.string()
            .required()
            .messages({
                'any.required': 'ID продавца обязателен'
            })
    });
}

export default new ClientValidator();