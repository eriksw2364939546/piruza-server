import CryptoJS from 'crypto-js';

/**
 * ========================================
 * HELPER ДЛЯ РАСШИФРОВКИ ЗАШИФРОВАННЫХ ПОЛЕЙ
 * ========================================
 * 
 * Этот helper используется для расшифровки полей (email, name и т.д.),
 * которые были зашифрованы в user.model.js с помощью crypto-js
 * 
 * ИСПОЛЬЗОВАНИЕ:
 * import { decryptEmail, decryptName, decryptField } from '../helpers/расшифровка.helper.js';
 * 
 * const email = decryptEmail(user.email);
 * const name = decryptName(user.name);
 */

/**
 * Базовая функция расшифровки любого поля
 * @param {string} encryptedText - Зашифрованный текст (из БД)
 * @returns {string|null} - Расшифрованный текст или null при ошибке
 */
export const decryptField = (encryptedText) => {
    // Если поле пустое или undefined
    if (!encryptedText) {
        return null;
    }

    try {
        // Расшифровываем с помощью AES и CRYPTO_KEY из .env
        const bytes = CryptoJS.AES.decrypt(encryptedText, process.env.CRYPTO_KEY);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);

        // Если расшифровка вернула пустую строку
        if (!decrypted) {
            console.error('⚠️ [DECRYPT] Расшифровка вернула пустую строку');
            return null;
        }

        return decrypted;

    } catch (error) {
        console.error('❌ [DECRYPT] Ошибка расшифровки:', error.message);
        console.error('   Зашифрованный текст:', encryptedText.substring(0, 50) + '...');
        return null;
    }
};

/**
 * Расшифровать email
 * @param {string} encryptedEmail - Зашифрованный email из БД
 * @returns {string|null} - Расшифрованный email или null
 */
export const decryptEmail = (encryptedEmail) => {
    const email = decryptField(encryptedEmail);

    if (email) {
        console.log(`✅ [DECRYPT] Email расшифрован: ${email}`);
    } else {
        console.error('❌ [DECRYPT] Не удалось расшифровать email');
    }

    return email;
};

/**
 * Расшифровать имя
 * @param {string} encryptedName - Зашифрованное имя из БД
 * @returns {string|null} - Расшифрованное имя или null
 */
export const decryptName = (encryptedName) => {
    const name = decryptField(encryptedName);

    if (name) {
        console.log(`✅ [DECRYPT] Name расшифровано: ${name}`);
    } else {
        console.error('❌ [DECRYPT] Не удалось расшифровать name');
    }

    return name;
};

/**
 * Расшифровать несколько полей объекта
 * @param {Object} obj - Объект с зашифрованными полями
 * @param {Array<string>} fields - Массив имён полей для расшифровки
 * @returns {Object} - Объект с расшифрованными полями
 * 
 * ПРИМЕР:
 * const user = { email: 'U2FsdGVk...', name: 'U2FsdGVk...' };
 * const decrypted = decryptFields(user, ['email', 'name']);
 * // { email: 'test@example.com', name: 'John Doe' }
 */
export const decryptFields = (obj, fields = []) => {
    if (!obj) return null;

    const decrypted = { ...obj };

    for (const field of fields) {
        if (obj[field]) {
            decrypted[field] = decryptField(obj[field]);
        }
    }

    return decrypted;
};

/**
 * Расшифровать email у объекта User (из populate)
 * @param {Object} user - User объект с зашифрованными полями
 * @returns {string|null} - Расшифрованный email
 * 
 * ПРИМЕР:
 * const seller = await Seller.findById(id).populate('createdBy', 'email name');
 * const managerEmail = getUserEmail(seller.createdBy);
 */
export const getUserEmail = (user) => {
    if (!user || !user.email) {
        return null;
    }

    return decryptField(user.email);
};

/**
 * Расшифровать имя у объекта User (из populate)
 * @param {Object} user - User объект с зашифрованными полями
 * @returns {string|null} - Расшифрованное имя
 */
export const getUserName = (user) => {
    if (!user || !user.name) {
        return null;
    }

    return decryptField(user.name);
};

/**
 * Расшифровать массив email адресов
 * @param {Array<Object>} users - Массив User объектов
 * @returns {Array<string>} - Массив расшифрованных email
 * 
 * ПРИМЕР:
 * const admins = await User.find({ role: 'admin' }).select('email');
 * const adminEmails = getEmailsFromUsers(admins);
 * // ['admin1@test.com', 'admin2@test.com']
 */
export const getEmailsFromUsers = (users = []) => {
    return users
        .map(user => getUserEmail(user))
        .filter(Boolean); // Убираем null значения
};

// Экспортируем все функции по умолчанию
export default {
    decryptField,
    decryptEmail,
    decryptName,
    decryptFields,
    getUserEmail,
    getUserName,
    getEmailsFromUsers
};