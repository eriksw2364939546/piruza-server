import slugify from 'slugify';

// Генерация slug из текста
export const generateSlug = (text, options = {}) => {
    const defaultOptions = {
        lower: true,
        strict: true, // убирает все спецсимволы кроме дефиса
        locale: 'fr'  // поддержка французского (é→e, ç→c и т.д.)
    };

    return slugify(text, { ...defaultOptions, ...options });
};

// Генерация уникального slug
// Model     — Mongoose модель для проверки уникальности
// name      — исходное имя (например "Boulangerie Parisienne!")
// excludeId — _id текущего документа (при обновлении)
export const generateUniqueSlug = async (Model, name, excludeId = null) => {
    // Сначала генерируем чистый slug из имени
    const baseSlug = generateSlug(name);

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