import cron from 'node-cron';
import sellerService from '../services/seller.service.js';
import { Seller, User } from '../models/index.js';
import { sendExpirationReminder } from '../utils/email.util.js';

// Настройка всех cron задач
export const setupCronJobs = () => {
    // 1. Проверка истёкших продавцов (каждый день в 00:00)
    cron.schedule('0 0 * * *', async () => {
        try {
            console.log('🕐 [CRON] Проверка истёкших продавцов...');

            const count = await sellerService.checkExpiredSellers();

            console.log(`✅ [CRON] Обработано истёкших продавцов: ${count}`);
        } catch (error) {
            console.error('❌ [CRON] Ошибка проверки истёкших продавцов:', error);
        }
    });

    // 2. Напоминания об истечении (каждый день в 10:00)
    cron.schedule('0 10 * * *', async () => {
        try {
            console.log('🕐 [CRON] Отправка напоминаний об истечении...');

            const now = new Date();
            const fiveDaysLater = new Date();
            fiveDaysLater.setDate(fiveDaysLater.getDate() + 5);

            // Находим продавцов, которые истекают через 5 дней
            const expiringSellersDocs = await Seller.find({
                status: 'active',
                activationEndDate: {
                    $gte: now,
                    $lte: fiveDaysLater
                }
            }).populate('createdBy', 'email name');

            let count = 0;

            for (const seller of expiringSellersDocs) {
                if (seller.createdBy && seller.createdBy.email) {
                    // Email Manager'у
                    await sendExpirationReminder(
                        seller.createdBy.email,
                        seller.name,
                        seller.activationEndDate
                    );
                    count++;
                }
            }

            // Также отправляем Owner и Admin
            const owner = await User.findOne({ role: 'owner' }).select('email');
            const admins = await User.find({ role: 'admin' }).select('email');

            if (expiringSellersDocs.length > 0) {
                const allEmails = [owner?.email, ...admins.map(a => a.email)].filter(Boolean);

                for (const email of allEmails) {
                    for (const seller of expiringSellersDocs) {
                        await sendExpirationReminder(email, seller.name, seller.activationEndDate);
                    }
                }
            }

            console.log(`✅ [CRON] Отправлено напоминаний: ${count}`);
        } catch (error) {
            console.error('❌ [CRON] Ошибка отправки напоминаний:', error);
        }
    });

    console.log('✅ Cron jobs initialized');
    console.log('   - Проверка истёкших продавцов: каждый день в 00:00');
    console.log('   - Напоминания об истечении: каждый день в 10:00');
};