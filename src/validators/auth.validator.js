import Joi from 'joi';

class AuthValidator {
    // Схема для регистрации Admin/Manager (Owner создаёт)
    registerAdminSchema = Joi.object({
        email: Joi.string()
            .email()
            .required()
            .messages({
                'string.email': 'Некорректный email',
                'any.required': 'Email обязателен'
            }),

        password: Joi.string()
            .min(6)
            .required()
            .messages({
                'string.min': 'Пароль должен быть минимум 6 символов',
                'any.required': 'Пароль обязателен'
            }),

        name: Joi.string()
            .min(2)
            .required()
            .messages({
                'string.min': 'Имя должно быть минимум 2 символа',
                'any.required': 'Имя обязательно'
            }),

        role: Joi.string()
            .valid('admin', 'manager')
            .required()
            .messages({
                'any.only': 'Роль должна быть admin или manager',
                'any.required': 'Роль обязательна'
            })
    });

    // Схема для логина
    loginSchema = Joi.object({
        email: Joi.string()
            .email()
            .required()
            .messages({
                'string.email': 'Некорректный email',
                'any.required': 'Email обязателен'
            }),

        password: Joi.string()
            .required()
            .messages({
                'any.required': 'Пароль обязателен'
            })
    });

    // Схема для обновления профиля (свой)
    updateOwnProfileSchema = Joi.object({
        email: Joi.string()
            .email()
            .optional()
            .messages({
                'string.email': 'Некорректный email'
            }),

        password: Joi.string()
            .min(6)
            .optional()
            .messages({
                'string.min': 'Пароль должен быть минимум 6 символов'
            }),

        name: Joi.string()
            .min(2)
            .optional()
            .messages({
                'string.min': 'Имя должно быть минимум 2 символа'
            }),
        role: Joi.any()
            .forbidden()
            .messages({
                'any.unknown': 'Нельзя изменить свою роль.'
            })
    });

    // Схема для обновления другого пользователя (Owner → Admin/Manager)
    updateUserSchema = Joi.object({
        email: Joi.string()
            .email()
            .optional()
            .messages({
                'string.email': 'Некорректный email'
            }),

        password: Joi.string()
            .min(6)
            .optional()
            .messages({
                'string.min': 'Пароль должен быть минимум 6 символов'
            }),

        name: Joi.string()
            .min(2)
            .optional()
            .messages({
                'string.min': 'Имя должно быть минимум 2 символа'
            }),

        role: Joi.string()
            .valid('admin', 'manager')
            .optional()
            .messages({
                'any.only': 'Роль должна быть admin или manager'
            }),

        isActive: Joi.boolean()
            .optional()
    });
}

export default new AuthValidator();