import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupRoutes } from './routes/index.js';
import staticFilesMiddleware from './middlewares/staticfiles.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ВАЖНО: Защита статических файлов (ПЕРЕД express.static!)
// Используем функцию для проверки пути
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

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Piruza Store API is running',
        timestamp: new Date().toISOString()
    });
});

// Подключение роутов
setupRoutes(app);

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

export default app;