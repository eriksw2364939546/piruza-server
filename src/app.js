import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupRoutes } from './routes/index.js';
import staticFilesMiddleware from './middlewares/staticfiles.middleware.js';
import { generalLimiter } from './middlewares/ratelimit.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

// Функция очистки от NoSQL Injection
function sanitizeNoSQL(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeNoSQL(item));
    }

    const sanitized = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            // Удаляем $ и . из ключей
            const cleanKey = key.replace(/[$\.]/g, '');
            const value = obj[key];

            // Рекурсивно очищаем значения
            if (typeof value === 'object' && value !== null) {
                sanitized[cleanKey] = sanitizeNoSQL(value);
            } else {
                sanitized[cleanKey] = value;
            }
        }
    }
    return sanitized;
}

// Функция очистки от XSS
function sanitizeXSS(obj) {
    if (typeof obj === 'string') {
        return obj
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }

    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeXSS(item));
    }

    const sanitized = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            sanitized[key] = sanitizeXSS(obj[key]);
        }
    }
    return sanitized;
}

// ========== БЕЗОПАСНОСТЬ ==========

// 1. HELMET - Security Headers (ПЕРВЫМ!)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: {
        maxAge: 31536000, // 1 год
        includeSubDomains: true,
        preload: true
    }
}));

// 2. CORS
app.use(cors());

// 3. Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4. КАСТОМНАЯ ЗАЩИТА от NoSQL Injection и XSS
app.use((req, res, next) => {
    // Защита от NoSQL Injection и XSS для req.body
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeNoSQL(req.body);
        req.body = sanitizeXSS(req.body);
    }

    // Защита req.query (НЕ перезаписываем, а очищаем существующие ключи)
    if (req.query && typeof req.query === 'object') {
        const cleanedQuery = sanitizeNoSQL(req.query);

        // Удаляем старые ключи
        for (const key in req.query) {
            delete req.query[key];
        }

        // Добавляем очищенные ключи
        for (const key in cleanedQuery) {
            req.query[key] = cleanedQuery[key];
        }
    }

    // Защита req.params (НЕ перезаписываем, а очищаем существующие ключи)
    if (req.params && typeof req.params === 'object') {
        const cleanedParams = sanitizeNoSQL(req.params);

        // Удаляем старые ключи
        for (const key in req.params) {
            delete req.params[key];
        }

        // Добавляем очищенные ключи
        for (const key in cleanedParams) {
            req.params[key] = cleanedParams[key];
        }
    }

    next();
});

// 5. Rate Limiting - общий лимит для всех API запросов
app.use('/api', generalLimiter);

// ========== СТАТИЧЕСКИЕ ФАЙЛЫ ==========

// Защита статических файлов (ПЕРЕД express.static!)
app.use('/uploads', (req, res, next) => {
    // Проверяем путь и вызываем соответствующий middleware
    if (req.path.startsWith('/sellers/')) {
        return staticFilesMiddleware.protectSellerFiles(req, res, next);
    } else if (req.path.startsWith('/products/')) {
        return staticFilesMiddleware.protectProductFiles(req, res, next);
    }
    // Если не sellers и не products - пропускаем дальше
    next();
});

// Статические файлы (uploads) - ПОСЛЕ middleware защиты
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// ========== РОУТЫ ==========

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Piruza Store API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        security: {
            helmet: 'enabled',
            rateLimit: 'enabled',
            noSQLProtection: 'custom',
            xssProtection: 'custom'
        }
    });
});

// Подключение всех роутов
setupRoutes(app);

// ========== ERROR HANDLERS ==========

// 404 Handler - роут не найден
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Global Error Handler - обработка ошибок
app.use((err, req, res, next) => {
    console.error('❌ Error:', err);

    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

export default app;