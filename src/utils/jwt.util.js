import jwt from 'jsonwebtoken';

// Генерация токена для User (Owner/Admin/Manager)
export const generateToken = (userId, role) => {
    return jwt.sign(
        { userId, role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

// Генерация токена для Client
export const generateClientToken = (clientId) => {
    return jwt.sign(
        { clientId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

// Верификация токена (для User и Client)
export const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        throw new Error('Invalid or expired token');
    }
};