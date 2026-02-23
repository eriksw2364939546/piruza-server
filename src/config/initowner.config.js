import authService from '../services/auth.service.js';

// Инициализация Owner при первом запуске
export const initializeOwner = async () => {
    try {
        console.log('🔍 Проверка существования Owner...');

        const owner = await authService.createOwner();

        if (owner) {
            console.log('✅ Owner успешно создан:');
            console.log(`   Email: ${owner.email}`);
            console.log(`   Name: ${owner.name}`);
            console.log(`   Role: ${owner.role}`);
        } else {
            console.log('ℹ️  Owner уже существует');
        }
    } catch (error) {
        console.error('❌ Ошибка при инициализации Owner:', error.message);
        throw error;
    }
};