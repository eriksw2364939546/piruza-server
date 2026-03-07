import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Определяем уровни логов
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

// Цвета для консоли
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};

winston.addColors(colors);

// Формат для консоли (с цветами и эмодзи)
const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize({ all: true }),
    winston.format.printf((info) => {
        const emoji = {
            error: '❌',
            warn: '⚠️',
            info: 'ℹ️',
            http: '🌐',
            debug: '🔍',
        };
        return `${info.timestamp} ${emoji[info.level] || ''} [${info.level}]: ${info.message}`;
    })
);

// Формат для файлов (JSON)
const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Транспорты - куда пишем логи
const transports = [
    // Консоль (для development)
    new winston.transports.Console({
        format: consoleFormat,
    }),

    // Файл для ВСЕХ логов (ротация каждый день)
    new DailyRotateFile({
        filename: path.join(__dirname, '../../logs/combined-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d', // Хранить 14 дней
        format: fileFormat,
    }),

    // Файл только для ОШИБОК
    new DailyRotateFile({
        level: 'error',
        filename: path.join(__dirname, '../../logs/error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d', // Хранить 30 дней
        format: fileFormat,
    }),
];

// Создаём логгер
const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    levels,
    transports,
    // Обработка необработанных ошибок
    exceptionHandlers: [
        new DailyRotateFile({
            filename: path.join(__dirname, '../../logs/exceptions-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '30d',
        }),
    ],
    rejectionHandlers: [
        new DailyRotateFile({
            filename: path.join(__dirname, '../../logs/rejections-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '30d',
        }),
    ],
});

export default logger;