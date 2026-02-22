import slugify from 'slugify';

// Генерация slug из текста
export const generateSlug = (text, options = {}) => {
    const defaultOptions = {
        lower: true,
        strict: true,
        locale: 'fr' // Поддержка французского языка
    };

    return slugify(text, { ...defaultOptions, ...options });
};

// Генерация уникального slug
export const generateUniqueSlug = async (Model, baseSlug, excludeId = null) => {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
        const query = { slug };
        if (excludeId) {
            query._id = { $ne: excludeId };
        }

        const exists = await Model.findOne(query);

        if (!exists) {
            return slug;
        }

        slug = `${baseSlug}-${counter}`;
        counter++;
    }
};