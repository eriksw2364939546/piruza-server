import dotenv from 'dotenv';
dotenv.config();

import app from './src/app.js';
import connectDB from './src/config/database.config.js';
import { initializeOwner } from './src/config/initowner.config.js';
import { setupCronJobs } from './src/config/cron.config.js';
import { verifyEmailConnection } from './src/utils/email.util.js';

const PORT = process.env.PORT || 7000;

const startServer = async () => {
    try {
        // 1. Подключение к БД
        await connectDB();

        // 2. Инициализация Owner (если нет)
        await initializeOwner();

        // 3. Запуск Cron задач
        setupCronJobs();

        // 4. Проверка Email конфигурации
        verifyEmailConnection();

        // 5. Запуск сервера
        app.listen(PORT, () => {
            console.log(`✅ Server running on port ${PORT}`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
        });
    } catch (error) {
        console.error('❌ Server startup failed:', error);
        process.exit(1);
    }
};

startServer();