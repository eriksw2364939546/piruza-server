import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupRoutes } from './routes/index.js';
import { generalLimiter, adminLimiter } from './middlewares/ratelimit.middleware.js';
import globalErrorHandler from './middlewares/errorhandler.middleware.js';
import AppError from './utils/apperror.js';
import logger from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

function sanitizeNoSQL(obj) {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(item => sanitizeNoSQL(item));

    const sanitized = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const cleanKey = key.replace(/[$\.]/g, '');
            const value = obj[key];
            sanitized[cleanKey] = typeof value === 'object' && value !== null
                ? sanitizeNoSQL(value)
                : value;
        }
    }
    return sanitized;
}

function sanitizeXSS(obj) {
    if (typeof obj === 'string') {
        return obj
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }
    if (typeof obj !== 'object' || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(item => sanitizeXSS(item));

    const sanitized = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            sanitized[key] = sanitizeXSS(obj[key]);
        }
    }
    return sanitized;
}

// ========== БЕЗОПАСНОСТЬ ==========

// 1. HELMET
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
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// 2. CORS
app.use(cors());

// 3. Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ========== HTTP ЛОГИРОВАНИЕ ==========

app.use((req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userAgent: req.get('user-agent'),
        };

        if (res.statusCode >= 500) {
            logger.error('HTTP Request - Server Error', logData);
        } else if (res.statusCode >= 400) {
            logger.warn('HTTP Request - Client Error', logData);
        } else {
            logger.http('HTTP Request - Success', logData);
        }
    });

    next();
});

// ========== ПРОДОЛЖЕНИЕ БЕЗОПАСНОСТИ ==========

// 4. NoSQL Injection + XSS защита
app.use((req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeNoSQL(req.body);
        req.body = sanitizeXSS(req.body);
    }

    if (req.query && typeof req.query === 'object') {
        const cleanedQuery = sanitizeNoSQL(req.query);
        for (const key in req.query) delete req.query[key];
        for (const key in cleanedQuery) req.query[key] = cleanedQuery[key];
    }

    if (req.params && typeof req.params === 'object') {
        const cleanedParams = sanitizeNoSQL(req.params);
        for (const key in req.params) delete req.params[key];
        for (const key in cleanedParams) req.params[key] = cleanedParams[key];
    }

    next();
});

// 5. Rate Limiting
// Публичные роуты — умеренный лимит по IP
app.use('/api/sellers/public', generalLimiter);
app.use('/api/auth/login', generalLimiter);
// Все остальные /api — мягкий лимит для авторизованных пользователей
app.use('/api', adminLimiter);

// ========== СТАТИЧЕСКИЕ ФАЙЛЫ ==========

// Публичный доступ — UUID в имени файла обеспечивает защиту от перебора
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// ========== РОУТЫ ==========

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
            xssProtection: 'custom',
            globalErrorHandler: 'enabled',
            logger: 'winston',
            email: 'nodemailer'
        }
    });
});

app.get('/test/email', async (req, res) => {
    try {
        const { sendTestEmail } = await import('./utils/email.util.js');
        const testEmail = req.query.to || 'erik222333444555@gmail.com';
        const result = await sendTestEmail(testEmail);
        res.json({ success: true, message: 'Тестовое письмо отправлено!', messageId: result.messageId, sentTo: testEmail });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Ошибка отправки email', error: err.message });
    }
});

setupRoutes(app);

// ========== ERROR HANDLERS ==========

app.use((req, res, next) => {
    next(new AppError(`Маршрут ${req.originalUrl} не найден`, 404));
});

app.use(globalErrorHandler);

export default app;