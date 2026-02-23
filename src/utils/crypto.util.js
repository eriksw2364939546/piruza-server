import CryptoJS from 'crypto-js';

// Функция для получения ключа (ленивая загрузка)
const getEncryptionKey = () => {
    const key = process.env.CRYPTO_KEY || process.env.SECRET_HASH;

    if (!key) {
        console.error('❌ CRITICAL: CRYPTO_KEY or SECRET_HASH not found in .env!');
        throw new Error('Encryption key not configured');
    }

    return key;
};

// Шифрование данных (AES-256)
export const encrypt = (text) => {
    if (!text || text === null || text === undefined) return null;
    if (typeof text !== 'string') text = String(text);

    try {
        const encrypted = CryptoJS.AES.encrypt(text, getEncryptionKey()).toString();
        return encrypted;
    } catch (error) {
        console.error('❌ Encryption error:', error.message);
        throw new Error('Failed to encrypt data');
    }
};

// Дешифрование данных
export const decrypt = (encryptedText) => {
    if (!encryptedText || encryptedText === null || encryptedText === undefined) return null;
    if (typeof encryptedText !== 'string') return encryptedText;

    try {
        const bytes = CryptoJS.AES.decrypt(encryptedText, getEncryptionKey());
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);

        // Если дешифрование не удалось, возвращаем исходное значение
        if (!decrypted || decrypted === '') {
            return encryptedText;
        }

        return decrypted;
    } catch (error) {
        console.error('❌ Decryption error:', error.message);
        // Возвращаем исходное значение если не удалось расшифровать
        return encryptedText;
    }
};

// Хеширование данных (односторонее - для проверки целостности)
export const hash = (text) => {
    if (!text || text === null || text === undefined) return null;
    if (typeof text !== 'string') text = String(text);

    try {
        const hashed = CryptoJS.SHA256(text + getEncryptionKey()).toString();
        return hashed;
    } catch (error) {
        console.error('❌ Hashing error:', error.message);
        throw new Error('Failed to hash data');
    }
};

// Проверка зашифрованных данных
export const isEncrypted = (text) => {
    if (!text || typeof text !== 'string') return false;

    try {
        // Пробуем расшифровать
        const bytes = CryptoJS.AES.decrypt(text, getEncryptionKey());
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        return decrypted !== '';
    } catch {
        return false;
    }
};

// Хеширование email для Meta модели (em поле)
export const hashMeta = (email) => {
    if (!email || email === null || email === undefined) return null;
    if (typeof email !== 'string') email = String(email);

    try {
        // SHA-256 хеш для быстрого поиска в Meta
        const hashed = CryptoJS.SHA256(email.toLowerCase()).toString();
        return hashed;
    } catch (error) {
        console.error('❌ Meta hashing error:', error.message);
        throw new Error('Failed to hash email for meta');
    }
};