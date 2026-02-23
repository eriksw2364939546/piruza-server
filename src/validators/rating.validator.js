import Joi from 'joi';

class RatingValidator {
    // Схема для оценки продавца
    rateSellerSchema = Joi.object({
        rating: Joi.number()
            .integer()
            .min(1)
            .max(5)
            .required()
            .messages({
                'number.min': 'Оценка должна быть от 1 до 5',
                'number.max': 'Оценка должна быть от 1 до 5',
                'any.required': 'Оценка обязательна'
            })
    });
}

export default new RatingValidator();