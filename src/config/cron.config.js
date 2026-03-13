import cron from 'node-cron';
import sellerService from '../services/seller.service.js';
import { Seller } from '../models/index.js';
import {
    sendExpirationReminder,
    sendExpirationReminderToSeller,
    sendExpirationNotificationToManager,
    sendExpirationNotificationToSeller
} from '../utils/email.util.js';
import { getUserEmail, decryptField } from '../helpers/decrypt.helper.js';

// Настройка всех cron задач
export const setupCronJobs = () => {
    // 1. Проверка истёкших продавцов (каждый день в 00:00)
    cron.schedule('0 0 * * *', async () => {
        try {
            console.log('🕐 [CRON] Проверка истёкших продавцов...');

            const now = new Date();
            const expiredSellers = await Seller.find({
                status: 'active',
                activationEndDate: { $lte: now }
            }).populate('createdBy', 'email name role');

            let count = 0;

            for (const seller of expiredSellers) {
                // Меняем статус на expired
                seller.status = 'expired';
                await seller.save();

                // ========== РАСШИФРОВКА ==========
                const creatorEmail = seller.createdBy ? getUserEmail(seller.createdBy) : null;
                const sellerEmail = seller.email || null;
                // =================================

                // ========== EMAIL УВЕДОМЛЕНИЯ ==========

                // Email создателю (Owner/Admin/Manager - ВСЕМ)
                if (seller.createdBy && creatorEmail) {
                    await sendExpirationNotificationToManager(
                        creatorEmail,
                        seller.name
                    );
                }

                // Email Seller (ВСЕГДА)
                if (sellerEmail) {
                    await sendExpirationNotificationToSeller(
                        sellerEmail,
                        seller.name
                    );
                }

                // ========== КОНЕЦ EMAIL ==========

                count++;
                console.log(`   ⏰ Продавец "${seller.name}" истёк и переведён в expired`);
            }

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

            const expiringSellers = await Seller.find({
                status: 'active',
                activationEndDate: {
                    $gte: now,
                    $lte: fiveDaysLater
                }
            }).populate('createdBy', 'email name role');

            let count = 0;

            for (const seller of expiringSellers) {
                // ========== РАСШИФРОВКА ==========
                const creatorEmail = seller.createdBy ? getUserEmail(seller.createdBy) : null;
                const sellerEmail = seller.email || null;
                // =================================

                // ========== EMAIL УВЕДОМЛЕНИЯ ==========

                // Email создателю (Owner/Admin/Manager - ВСЕМ)
                if (seller.createdBy && creatorEmail) {
                    await sendExpirationReminder(
                        creatorEmail,
                        seller.name,
                        seller.activationEndDate
                    );
                }

                // Email Seller (ВСЕГДА)
                if (sellerEmail) {
                    await sendExpirationReminderToSeller(
                        sellerEmail,
                        seller.name,
                        seller.activationEndDate
                    );
                }

                // ========== КОНЕЦ EMAIL ==========

                count++;
                console.log(`   ⚠️ Напоминание отправлено для продавца "${seller.name}"`);
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