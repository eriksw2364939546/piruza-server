import Joi from 'joi';

class SellerRequestValidator {
    // Схема для создания заявки (Manager)
    createRequestSchema = Joi.object({
        name: Joi.string()
            .min(2)
            .required()
            .messages({
                'string.min': 'Название продавца должно быть минимум 2 символа',
                'any.required': 'Название продавца обязательно'
            }),

        businessType: Joi.string()
            .min(2)
            .required()
            .messages({
                'string.min': 'Тип бизнеса должен быть минимум 2 символа',
                'any.required': 'Тип бизнеса обязателен'
            }),

        legalInfo: Joi.string()
            .min(5)
            .required()
            .messages({
                'string.min': 'Юридическая информация должна быть минимум 5 символов',
                'any.required': 'Юридическая информация обязательна'
            })
    });

    // Схема для отклонения заявки (Owner/Admin)
    rejectRequestSchema = Joi.object({
        rejectionReason: Joi.string()
            .min(5)
            .required()
            .messages({
                'string.min': 'Причина отклонения должна быть минимум 5 символов',
                'any.required': 'Причина отклонения обязательна'
            })
    });
}

export default new SellerRequestValidator();