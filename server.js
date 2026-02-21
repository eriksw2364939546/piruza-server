import dotenv from 'dotenv';
import app from './src/app.js';
import connectDB from './src/config/database.config.js';
import initializeOwner from './src/config/initowner.config.js';
import setupCronJobs from './src/config/cronjobs.config.js';

// Загрузка переменных окружения
dotenv.config();

const PORT = process.env.PORT || 7000;

// Функция запуска сервера
const startServer = async () => {
    try {
        // Подключение к MongoDB
        await connectDB();
        console.log('✅ Database connected successfully');

        // Инициализация Owner (создание если не существует)
        await initializeOwner();
        console.log('✅ Owner initialization complete');

        // Настройка Cron задач
        setupCronJobs();
        console.log('✅ Cron jobs initialized');

        // Запуск сервера
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        console.error('❌ Server startup error:', error.message);
        process.exit(1);
    }
};

// Запуск сервера
startServer();