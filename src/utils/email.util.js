import nodemailer from 'nodemailer';
import logger from './logger.js';

// ========== СОЗДАНИЕ ТРАНСПОРТА (LAZY) ==========

// Создаём transporter только когда нужен (после загрузки .env)
const getTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT),
        secure: false, // true для 465, false для 587
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });
};

// Функция проверки подключения
export const verifyEmailConnection = () => {
    console.log('📧 EMAIL CONFIG CHECK (Brevo):');
    console.log('  EMAIL_HOST:', process.env.EMAIL_HOST);
    console.log('  EMAIL_PORT:', process.env.EMAIL_PORT);
    console.log('  EMAIL_USER:', process.env.EMAIL_USER);
    console.log('  EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '***exists***' : '***MISSING***');
    console.log('  EMAIL_FROM:', process.env.EMAIL_FROM);

    const transporter = getTransporter();

    transporter.verify((error, success) => {
        if (error) {
            logger.error('Email transporter verification failed', {
                error: error.message,
            });
            console.error('❌ Email configuration error:', error.message);
        } else {
            logger.info('Email transporter is ready');
            console.log('✅ Email transporter is ready to send messages (Brevo)');
        }
    });
};

// ========== 1. EMAIL ПРИ АКТИВАЦИИ МЕНЕДЖЕРУ ==========

export const sendActivationEmail = async (managerEmail, sellerName, endDate) => {
    try {
        const transporter = getTransporter();

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: managerEmail,
            subject: '🎉 Продавец активирован - Piruza Store',
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .info-box { background: #f9f9f9; padding: 20px; margin: 20px 0; border-left: 4px solid #667eea; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; background: #f9f9f9; }
        .highlight { color: #667eea; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Продавец активирован!</h1>
        </div>
        <div class="content">
            <p>Здравствуйте!</p>
            
            <p>Отличные новости! Ваш продавец <span class="highlight">${sellerName}</span> был успешно активирован в системе Piruza Store.</p>
            
            <div class="info-box">
                <h3>📋 Детали активации:</h3>
                <p><strong>Название продавца:</strong> ${sellerName}</p>
                <p><strong>Статус:</strong> <span style="color: green;">✅ Активен</span></p>
                <p><strong>Дата окончания:</strong> ${new Date(endDate).toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })}</p>
            </div>
            
            <p>Теперь ваш продавец виден клиентам и готов принимать заказы!</p>
            
            <p>С уважением,<br><strong>Команда Piruza Store</strong></p>
        </div>
        <div class="footer">
            <p>Это автоматическое сообщение. Пожалуйста, не отвечайте на него.</p>
            <p>&copy; ${new Date().getFullYear()} Piruza Store. Все права защищены.</p>
        </div>
    </div>
</body>
</html>
            `
        };

        const info = await transporter.sendMail(mailOptions);

        logger.info('Activation email sent to manager', {
            messageId: info.messageId,
            sellerName,
            recipientEmail: managerEmail,
        });

        console.log(`✅ Activation email sent to manager: ${managerEmail}`);

        return { success: true, messageId: info.messageId };

    } catch (error) {
        logger.error('Failed to send activation email to manager', {
            error: error.message,
            sellerName,
            recipientEmail: managerEmail,
        });

        console.error('❌ Error sending activation email to manager:', error.message);

        return { success: false, error: error.message };
    }
};

// ========== 2. НАПОМИНАНИЕ ОБ ИСТЕЧЕНИИ СРОКА ==========

export const sendExpirationReminder = async (managerEmail, sellerName, endDate) => {
    try {
        const transporter = getTransporter();

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: managerEmail,
            subject: '⚠️ Напоминание: срок действия продавца истекает - Piruza Store',
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #f59e0b 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .warning-box { background: #fef3c7; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; background: #f9f9f9; }
        .highlight { color: #dc2626; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚠️ Внимание! Срок действия истекает</h1>
        </div>
        <div class="content">
            <p>Здравствуйте!</p>
            
            <p>Срок действия продавца <span class="highlight">${sellerName}</span> истекает через <strong>5 дней</strong>.</p>
            
            <div class="warning-box">
                <h3>⏰ Важная информация:</h3>
                <p><strong>Название продавца:</strong> ${sellerName}</p>
                <p><strong>Дата истечения:</strong> ${new Date(endDate).toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })}</p>
            </div>
            
            <p>Пожалуйста, свяжитесь с администратором для продления.</p>
            
            <p>С уважением,<br><strong>Команда Piruza Store</strong></p>
        </div>
        <div class="footer">
            <p>Это автоматическое сообщение. Пожалуйста, не отвечайте на него.</p>
            <p>&copy; ${new Date().getFullYear()} Piruza Store. Все права защищены.</p>
        </div>
    </div>
</body>
</html>
            `
        };

        const info = await transporter.sendMail(mailOptions);

        logger.info('Expiration reminder sent', {
            messageId: info.messageId,
            sellerName,
            recipientEmail: managerEmail,
        });

        console.log(`✅ Expiration reminder sent to ${managerEmail}`);

        return { success: true, messageId: info.messageId };

    } catch (error) {
        logger.error('Failed to send expiration reminder', {
            error: error.message,
            sellerName,
            recipientEmail: managerEmail,
        });

        console.error('❌ Error sending expiration reminder:', error.message);

        return { success: false, error: error.message };
    }
};

// ========== 3. УВЕДОМЛЕНИЕ О НОВОЙ ЗАЯВКЕ ==========

export const sendNewRequestNotification = async (ownerEmail, adminEmails, requestData) => {
    try {
        const transporter = getTransporter();

        const recipients = [ownerEmail, ...adminEmails].filter(Boolean).join(', ');

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: recipients,
            subject: '📝 Новая заявка на создание продавца - Piruza Store',
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .info-box { background: #f9f9f9; padding: 20px; margin: 20px 0; border-left: 4px solid #3b82f6; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; background: #f9f9f9; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📝 Новая заявка от Manager'а</h1>
        </div>
        <div class="content">
            <p>Здравствуйте!</p>
            
            <p>Получена новая заявка на создание продавца.</p>
            
            <div class="info-box">
                <h3>📋 Детали заявки:</h3>
                <p><strong>Название продавца:</strong> ${requestData.name}</p>
                <p><strong>Тип бизнеса:</strong> ${requestData.businessType}</p>
                <p><strong>Юридическая информация:</strong> ${requestData.legalInfo}</p>
                <p><strong>Запросил:</strong> ${requestData.managerName} (${requestData.managerEmail})</p>
            </div>
            
            <p>Пожалуйста, рассмотрите заявку в панели управления.</p>
            
            <p>С уважением,<br><strong>Команда Piruza Store</strong></p>
        </div>
        <div class="footer">
            <p>Это автоматическое сообщение. Пожалуйста, не отвечайте на него.</p>
            <p>&copy; ${new Date().getFullYear()} Piruza Store. Все права защищены.</p>
        </div>
    </div>
</body>
</html>
            `
        };

        const info = await transporter.sendMail(mailOptions);

        logger.info('New request notification sent', {
            messageId: info.messageId,
            requestName: requestData.name,
            recipients,
        });

        console.log(`✅ New request notification sent to Owner/Admin`);

        return { success: true, messageId: info.messageId };

    } catch (error) {
        logger.error('Failed to send request notification', {
            error: error.message,
            requestName: requestData.name,
        });

        console.error('❌ Error sending request notification:', error.message);

        return { success: false, error: error.message };
    }
};

// ========== 4. EMAIL ОБ ОДОБРЕНИИ ЗАЯВКИ ==========

export const sendRequestApprovalEmail = async (managerEmail, sellerName) => {
    try {
        const transporter = getTransporter();

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: managerEmail,
            subject: '✅ Заявка одобрена - Piruza Store',
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .success-box { background: #d1fae5; padding: 20px; margin: 20px 0; border-left: 4px solid #10b981; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; background: #f9f9f9; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Поздравляем! Заявка одобрена</h1>
        </div>
        <div class="content">
            <p>Здравствуйте!</p>
            
            <div class="success-box">
                <h3>🎉 Отличные новости!</h3>
                <p>Ваша заявка на создание продавца <strong>${sellerName}</strong> была одобрена.</p>
            </div>
            
            <p>Теперь вы можете создать полного продавца в панели управления.</p>
            
            <p>С уважением,<br><strong>Команда Piruza Store</strong></p>
        </div>
        <div class="footer">
            <p>Это автоматическое сообщение. Пожалуйста, не отвечайте на него.</p>
            <p>&copy; ${new Date().getFullYear()} Piruza Store. Все права защищены.</p>
        </div>
    </div>
</body>
</html>
            `
        };

        const info = await transporter.sendMail(mailOptions);

        logger.info('Approval email sent', {
            messageId: info.messageId,
            sellerName,
            recipientEmail: managerEmail,
        });

        console.log(`✅ Approval email sent to ${managerEmail}`);

        return { success: true, messageId: info.messageId };

    } catch (error) {
        logger.error('Failed to send approval email', {
            error: error.message,
            sellerName,
            recipientEmail: managerEmail,
        });

        console.error('❌ Error sending approval email:', error.message);

        return { success: false, error: error.message };
    }
};

// ========== 5. EMAIL ОБ ОТКЛОНЕНИИ ЗАЯВКИ ==========

export const sendRequestRejectionEmail = async (managerEmail, sellerName, reason) => {
    try {
        const transporter = getTransporter();

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: managerEmail,
            subject: '❌ Заявка отклонена - Piruza Store',
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .rejection-box { background: #fee2e2; padding: 20px; margin: 20px 0; border-left: 4px solid #ef4444; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; background: #f9f9f9; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>❌ Заявка отклонена</h1>
        </div>
        <div class="content">
            <p>Здравствуйте!</p>
            
            <p>К сожалению, ваша заявка на создание продавца <strong>${sellerName}</strong> была отклонена.</p>
            
            <div class="rejection-box">
                <h3>📝 Причина отклонения:</h3>
                <p>${reason}</p>
            </div>
            
            <p>Вы можете создать новую заявку с исправлениями.</p>
            
            <p>С уважением,<br><strong>Команда Piruza Store</strong></p>
        </div>
        <div class="footer">
            <p>Это автоматическое сообщение. Пожалуйста, не отвечайте на него.</p>
            <p>&copy; ${new Date().getFullYear()} Piruza Store. Все права защищены.</p>
        </div>
    </div>
</body>
</html>
            `
        };

        const info = await transporter.sendMail(mailOptions);

        logger.info('Rejection email sent', {
            messageId: info.messageId,
            sellerName,
            recipientEmail: managerEmail,
            reason,
        });

        console.log(`✅ Rejection email sent to ${managerEmail}`);

        return { success: true, messageId: info.messageId };

    } catch (error) {
        logger.error('Failed to send rejection email', {
            error: error.message,
            sellerName,
            recipientEmail: managerEmail,
        });

        console.error('❌ Error sending rejection email:', error.message);

        return { success: false, error: error.message };
    }
};

// ========== 6. EMAIL АКТИВАЦИИ ПРОДАВЦУ ==========

export const sendActivationEmailToSeller = async (sellerEmail, sellerName, endDate, activatorName) => {
    try {
        const transporter = getTransporter();

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: sellerEmail,
            subject: '🎉 Ваш профиль активирован - Piruza Store',
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .info-box { background: #f9f9f9; padding: 20px; margin: 20px 0; border-left: 4px solid #667eea; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; background: #f9f9f9; }
        .highlight { color: #667eea; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Поздравляем!</h1>
        </div>
        <div class="content">
            <p>Здравствуйте, <strong>${sellerName}</strong>!</p>
            
            <p><span class="highlight">${activatorName}</span> активировал ваш профиль продавца в системе Piruza Store.</p>
            
            <div class="info-box">
                <h3>📋 Детали активации:</h3>
                <p><strong>Активирован:</strong> ${activatorName}</p>
                <p><strong>Статус:</strong> <span style="color: green;">✅ Активен</span></p>
                <p><strong>Активен до:</strong> ${new Date(endDate).toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })}</p>
            </div>
            
            <p>Теперь ваш магазин виден клиентам и готов принимать заказы!</p>
            
            <p>Желаем успешных продаж!</p>
            
            <p>С уважением,<br><strong>Команда Piruza Store</strong></p>
        </div>
        <div class="footer">
            <p>Это автоматическое сообщение. Пожалуйста, не отвечайте на него.</p>
            <p>&copy; ${new Date().getFullYear()} Piruza Store. Все права защищены.</p>
        </div>
    </div>
</body>
</html>
            `
        };

        const info = await transporter.sendMail(mailOptions);

        logger.info('Activation email sent to seller', {
            messageId: info.messageId,
            sellerName,
            recipientEmail: sellerEmail,
            activatorName,
        });

        console.log(`✅ Activation email sent to seller: ${sellerEmail}`);

        return { success: true, messageId: info.messageId };

    } catch (error) {
        logger.error('Failed to send activation email to seller', {
            error: error.message,
            sellerName,
            recipientEmail: sellerEmail,
        });

        console.error('❌ Error sending activation email to seller:', error.message);

        return { success: false, error: error.message };
    }
};

// ========== 7. НАПОМИНАНИЕ ПРОДАВЦУ ОБ ИСТЕЧЕНИИ ==========

export const sendExpirationReminderToSeller = async (sellerEmail, sellerName, endDate) => {
    try {
        const transporter = getTransporter();

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: sellerEmail,
            subject: '⚠️ Внимание: срок действия профиля истекает - Piruza Store',
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #f59e0b 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .warning-box { background: #fef3c7; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; background: #f9f9f9; }
        .highlight { color: #dc2626; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚠️ Напоминание</h1>
        </div>
        <div class="content">
            <p>Здравствуйте, <strong>${sellerName}</strong>!</p>
            
            <p>Срок действия вашего профиля в Piruza Store истекает через <span class="highlight">5 дней</span>.</p>
            
            <div class="warning-box">
                <h3>⏰ Важная информация:</h3>
                <p><strong>Дата истечения:</strong> ${new Date(endDate).toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })}</p>
            </div>
            
            <p>Пожалуйста, свяжитесь с вашим менеджером для продления профиля.</p>
            
            <p>После истечения срока ваш магазин будет скрыт от клиентов.</p>
            
            <p>С уважением,<br><strong>Команда Piruza Store</strong></p>
        </div>
        <div class="footer">
            <p>Это автоматическое сообщение. Пожалуйста, не отвечайте на него.</p>
            <p>&copy; ${new Date().getFullYear()} Piruza Store. Все права защищены.</p>
        </div>
    </div>
</html>
            `
        };

        const info = await transporter.sendMail(mailOptions);

        logger.info('Expiration reminder sent to seller', {
            messageId: info.messageId,
            sellerName,
            recipientEmail: sellerEmail,
        });

        console.log(`✅ Expiration reminder sent to seller: ${sellerEmail}`);

        return { success: true, messageId: info.messageId };

    } catch (error) {
        logger.error('Failed to send expiration reminder to seller', {
            error: error.message,
            sellerName,
            recipientEmail: sellerEmail,
        });

        console.error('❌ Error sending expiration reminder to seller:', error.message);

        return { success: false, error: error.message };
    }
};

// ========== 8. УВЕДОМЛЕНИЕ МЕНЕДЖЕРУ ОБ ИСТЕЧЕНИИ ==========

export const sendExpirationNotificationToManager = async (managerEmail, sellerName) => {
    try {
        const transporter = getTransporter();

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: managerEmail,
            subject: '❌ Срок действия продавца истёк - Piruza Store',
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .alert-box { background: #fee2e2; padding: 20px; margin: 20px 0; border-left: 4px solid #ef4444; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; background: #f9f9f9; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>❌ Срок действия истёк</h1>
        </div>
        <div class="content">
            <p>Здравствуйте!</p>
            
            <p>Срок действия продавца <strong>${sellerName}</strong> истёк.</p>
            
            <div class="alert-box">
                <h3>📋 Статус:</h3>
                <p><strong>Продавец:</strong> ${sellerName}</p>
                <p><strong>Статус:</strong> <span style="color: #dc2626;">❌ Истёк</span></p>
            </div>
            
            <p>Профиль продавца скрыт из публичного доступа.</p>
            
            <p>Для повторной активации обратитесь к администратору.</p>
            
            <p>С уважением,<br><strong>Команда Piruza Store</strong></p>
        </div>
        <div class="footer">
            <p>Это автоматическое сообщение. Пожалуйста, не отвечайте на него.</p>
            <p>&copy; ${new Date().getFullYear()} Piruza Store. Все права защищены.</p>
        </div>
    </div>
</body>
</html>
            `
        };

        const info = await transporter.sendMail(mailOptions);

        logger.info('Expiration notification sent to manager', {
            messageId: info.messageId,
            sellerName,
            recipientEmail: managerEmail,
        });

        console.log(`✅ Expiration notification sent to manager: ${managerEmail}`);

        return { success: true, messageId: info.messageId };

    } catch (error) {
        logger.error('Failed to send expiration notification to manager', {
            error: error.message,
            sellerName,
            recipientEmail: managerEmail,
        });

        console.error('❌ Error sending expiration notification to manager:', error.message);

        return { success: false, error: error.message };
    }
};

// ========== 9. УВЕДОМЛЕНИЕ ПРОДАВЦУ ОБ ИСТЕЧЕНИИ ==========

export const sendExpirationNotificationToSeller = async (sellerEmail, sellerName) => {
    try {
        const transporter = getTransporter();

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: sellerEmail,
            subject: '❌ Срок действия профиля истёк - Piruza Store',
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .alert-box { background: #fee2e2; padding: 20px; margin: 20px 0; border-left: 4px solid #ef4444; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; background: #f9f9f9; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>❌ Срок действия истёк</h1>
        </div>
        <div class="content">
            <p>Здравствуйте, <strong>${sellerName}</strong>!</p>
            
            <p>Срок действия вашего профиля в Piruza Store истёк.</p>
            
            <div class="alert-box">
                <h3>📋 Статус:</h3>
                <p><strong>Статус профиля:</strong> <span style="color: #dc2626;">❌ Истёк</span></p>
            </div>
            
            <p>Ваш магазин скрыт из публичного доступа.</p>
            
            <p>Для продления профиля свяжитесь с вашим менеджером.</p>
            
            <p>С уважением,<br><strong>Команда Piruza Store</strong></p>
        </div>
        <div class="footer">
            <p>Это автоматическое сообщение. Пожалуйста, не отвечайте на него.</p>
            <p>&copy; ${new Date().getFullYear()} Piruza Store. Все права защищены.</p>
        </div>
    </div>
</body>
</html>
            `
        };

        const info = await transporter.sendMail(mailOptions);

        logger.info('Expiration notification sent to seller', {
            messageId: info.messageId,
            sellerName,
            recipientEmail: sellerEmail,
        });

        console.log(`✅ Expiration notification sent to seller: ${sellerEmail}`);

        return { success: true, messageId: info.messageId };

    } catch (error) {
        logger.error('Failed to send expiration notification to seller', {
            error: error.message,
            sellerName,
            recipientEmail: sellerEmail,
        });

        console.error('❌ Error sending expiration notification to seller:', error.message);

        return { success: false, error: error.message };
    }
};

// ========== 10. УВЕДОМЛЕНИЕ МЕНЕДЖЕРУ О ПРОДЛЕНИИ ==========

export const sendExtensionEmail = async (managerEmail, sellerName, newEndDate) => {
    try {
        const transporter = getTransporter();

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: managerEmail,
            subject: '📅 Срок действия продавца продлён - Piruza Store',
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .info-box { background: #dbeafe; padding: 20px; margin: 20px 0; border-left: 4px solid #3b82f6; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; background: #f9f9f9; }
        .highlight { color: #3b82f6; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📅 Срок продлён</h1>
        </div>
        <div class="content">
            <p>Здравствуйте!</p>
            
            <p>Срок действия продавца <span class="highlight">${sellerName}</span> был успешно продлён.</p>
            
            <div class="info-box">
                <h3>📋 Новые данные:</h3>
                <p><strong>Название продавца:</strong> ${sellerName}</p>
                <p><strong>Активен до:</strong> ${new Date(newEndDate).toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })}</p>
            </div>
            
            <p>Ваш продавец продолжает работать в системе.</p>
            
            <p>С уважением,<br><strong>Команда Piruza Store</strong></p>
        </div>
        <div class="footer">
            <p>Это автоматическое сообщение. Пожалуйста, не отвечайте на него.</p>
            <p>&copy; ${new Date().getFullYear()} Piruza Store. Все права защищены.</p>
        </div>
    </div>
</body>
</html>
            `
        };

        const info = await transporter.sendMail(mailOptions);

        logger.info('Extension email sent to manager', {
            messageId: info.messageId,
            sellerName,
            recipientEmail: managerEmail,
            newEndDate,
        });

        console.log(`✅ Extension email sent to manager: ${managerEmail}`);

        return { success: true, messageId: info.messageId };

    } catch (error) {
        logger.error('Failed to send extension email to manager', {
            error: error.message,
            sellerName,
            recipientEmail: managerEmail,
        });

        console.error('❌ Error sending extension email to manager:', error.message);

        return { success: false, error: error.message };
    }
};

// ========== 11. УВЕДОМЛЕНИЕ ПРОДАВЦУ О ПРОДЛЕНИИ ==========

export const sendExtensionEmailToSeller = async (sellerEmail, sellerName, newEndDate) => {
    try {
        const transporter = getTransporter();

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: sellerEmail,
            subject: '📅 Ваш профиль продлён - Piruza Store',
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .info-box { background: #dbeafe; padding: 20px; margin: 20px 0; border-left: 4px solid #3b82f6; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; background: #f9f9f9; }
        .highlight { color: #3b82f6; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📅 Отличные новости!</h1>
        </div>
        <div class="content">
            <p>Здравствуйте, <strong>${sellerName}</strong>!</p>
            
            <p>Срок действия вашего профиля был успешно продлён.</p>
            
            <div class="info-box">
                <h3>📋 Новая дата:</h3>
                <p><strong>Активен до:</strong> ${new Date(newEndDate).toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })}</p>
            </div>
            
            <p>Ваш магазин продолжает работать и виден клиентам.</p>
            
            <p>Желаем успешных продаж!</p>
            
            <p>С уважением,<br><strong>Команда Piruza Store</strong></p>
        </div>
        <div class="footer">
            <p>Это автоматическое сообщение. Пожалуйста, не отвечайте на него.</p>
            <p>&copy; ${new Date().getFullYear()} Piruza Store. Все права защищены.</p>
        </div>
    </div>
</body>
</html>
            `
        };

        const info = await transporter.sendMail(mailOptions);

        logger.info('Extension email sent to seller', {
            messageId: info.messageId,
            sellerName,
            recipientEmail: sellerEmail,
            newEndDate,
        });

        console.log(`✅ Extension email sent to seller: ${sellerEmail}`);

        return { success: true, messageId: info.messageId };

    } catch (error) {
        logger.error('Failed to send extension email to seller', {
            error: error.message,
            sellerName,
            recipientEmail: sellerEmail,
        });

        console.error('❌ Error sending extension email to seller:', error.message);

        return { success: false, error: error.message };
    }
};

// ========== 12. УВЕДОМЛЕНИЕ OWNER О АКТИВАЦИИ ADMIN'ОМ ==========

export const sendActivationNotificationToOwner = async (ownerEmail, sellerName, endDate, activatorName, creatorName) => {
    try {
        const transporter = getTransporter();

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: ownerEmail,
            subject: '💰 Admin активировал продавца - Piruza Store',
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .info-box { background: #f3e8ff; padding: 20px; margin: 20px 0; border-left: 4px solid #8b5cf6; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; background: #f9f9f9; }
        .highlight { color: #8b5cf6; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>💰 Активация продавца</h1>
        </div>
        <div class="content">
            <p>Здравствуйте!</p>
            
            <p>Администратор <span class="highlight">${activatorName}</span> активировал продавца.</p>
            
            <div class="info-box">
                <h3>📋 Детали активации:</h3>
                <p><strong>Продавец:</strong> ${sellerName}</p>
                <p><strong>Активирован Admin'ом:</strong> ${activatorName}</p>
                <p><strong>Создатель:</strong> ${creatorName}</p>
                <p><strong>Активен до:</strong> ${new Date(endDate).toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })}</p>
            </div>
            
            <p>Это уведомление для контроля активаций и денежных операций.</p>
            
            <p>С уважением,<br><strong>Команда Piruza Store</strong></p>
        </div>
        <div class="footer">
            <p>Это автоматическое сообщение. Пожалуйста, не отвечайте на него.</p>
            <p>&copy; ${new Date().getFullYear()} Piruza Store. Все права защищены.</p>
        </div>
    </div>
</body>
</html>
            `
        };

        const info = await transporter.sendMail(mailOptions);

        logger.info('Activation notification sent to owner', {
            messageId: info.messageId,
            sellerName,
            recipientEmail: ownerEmail,
            activatorName,
        });

        console.log(`✅ Activation notification sent to owner: ${ownerEmail}`);

        return { success: true, messageId: info.messageId };

    } catch (error) {
        logger.error('Failed to send activation notification to owner', {
            error: error.message,
            sellerName,
            recipientEmail: ownerEmail,
        });

        console.error('❌ Error sending activation notification to owner:', error.message);

        return { success: false, error: error.message };
    }
};

// ========== 13. УВЕДОМЛЕНИЕ СОЗДАТЕЛЮ О АКТИВАЦИИ ==========

export const sendActivationNotificationToCreator = async (creatorEmail, sellerName, endDate, activatorName) => {
    try {
        const transporter = getTransporter();

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: creatorEmail,
            subject: '🎉 Ваш продавец активирован - Piruza Store',
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .info-box { background: #f9f9f9; padding: 20px; margin: 20px 0; border-left: 4px solid #667eea; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; background: #f9f9f9; }
        .highlight { color: #667eea; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Продавец активирован!</h1>
        </div>
        <div class="content">
            <p>Здравствуйте!</p>
            
            <p><span class="highlight">${activatorName}</span> активировал вашего продавца <span class="highlight">${sellerName}</span>.</p>
            
            <div class="info-box">
                <h3>📋 Детали активации:</h3>
                <p><strong>Название продавца:</strong> ${sellerName}</p>
                <p><strong>Активирован:</strong> ${activatorName}</p>
                <p><strong>Статус:</strong> <span style="color: green;">✅ Активен</span></p>
                <p><strong>Активен до:</strong> ${new Date(endDate).toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })}</p>
            </div>
            
            <p>Теперь продавец виден клиентам и готов принимать заказы!</p>
            
            <p>С уважением,<br><strong>Команда Piruza Store</strong></p>
        </div>
        <div class="footer">
            <p>Это автоматическое сообщение. Пожалуйста, не отвечайте на него.</p>
            <p>&copy; ${new Date().getFullYear()} Piruza Store. Все права защищены.</p>
        </div>
    </div>
</html>
            `
        };

        const info = await transporter.sendMail(mailOptions);

        logger.info('Activation notification sent to creator', {
            messageId: info.messageId,
            sellerName,
            recipientEmail: creatorEmail,
            activatorName,
        });

        console.log(`✅ Activation notification sent to creator: ${creatorEmail}`);

        return { success: true, messageId: info.messageId };

    } catch (error) {
        logger.error('Failed to send activation notification to creator', {
            error: error.message,
            sellerName,
            recipientEmail: creatorEmail,
        });

        console.error('❌ Error sending activation notification to creator:', error.message);

        return { success: false, error: error.message };
    }
};

// ========== 14. УВЕДОМЛЕНИЕ OWNER О ПРОДЛЕНИИ ADMIN'ОМ ==========

export const sendExtensionNotificationToOwner = async (ownerEmail, sellerName, newEndDate, activatorName, creatorName) => {
    try {
        const transporter = getTransporter();

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: ownerEmail,
            subject: '💰 Admin продлил продавца - Piruza Store',
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .info-box { background: #f3e8ff; padding: 20px; margin: 20px 0; border-left: 4px solid #8b5cf6; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; background: #f9f9f9; }
        .highlight { color: #8b5cf6; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>💰 Продление продавца</h1>
        </div>
        <div class="content">
            <p>Здравствуйте!</p>
            
            <p>Администратор <span class="highlight">${activatorName}</span> продлил срок действия продавца.</p>
            
            <div class="info-box">
                <h3>📋 Детали продления:</h3>
                <p><strong>Продавец:</strong> ${sellerName}</p>
                <p><strong>Продлён Admin'ом:</strong> ${activatorName}</p>
                <p><strong>Создатель:</strong> ${creatorName}</p>
                <p><strong>Активен до:</strong> ${new Date(newEndDate).toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })}</p>
            </div>
            
            <p>Это уведомление для контроля продлений и денежных операций.</p>
            
            <p>С уважением,<br><strong>Команда Piruza Store</strong></p>
        </div>
        <div class="footer">
            <p>Это автоматическое сообщение. Пожалуйста, не отвечайте на него.</p>
            <p>&copy; ${new Date().getFullYear()} Piruza Store. Все права защищены.</p>
        </div>
    </div>
</body>
</html>
            `
        };

        const info = await transporter.sendMail(mailOptions);

        logger.info('Extension notification sent to owner', {
            messageId: info.messageId,
            sellerName,
            recipientEmail: ownerEmail,
            activatorName,
        });

        console.log(`✅ Extension notification sent to owner: ${ownerEmail}`);

        return { success: true, messageId: info.messageId };

    } catch (error) {
        logger.error('Failed to send extension notification to owner', {
            error: error.message,
            sellerName,
            recipientEmail: ownerEmail,
        });

        console.error('❌ Error sending extension notification to owner:', error.message);

        return { success: false, error: error.message };
    }
};

// ========== 15. УВЕДОМЛЕНИЕ СОЗДАТЕЛЮ О ПРОДЛЕНИИ ==========

export const sendExtensionNotificationToCreator = async (creatorEmail, sellerName, newEndDate, activatorName) => {
    try {
        const transporter = getTransporter();

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: creatorEmail,
            subject: '📅 Ваш продавец продлён - Piruza Store',
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .info-box { background: #dbeafe; padding: 20px; margin: 20px 0; border-left: 4px solid #3b82f6; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; background: #f9f9f9; }
        .highlight { color: #3b82f6; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📅 Продавец продлён!</h1>
        </div>
        <div class="content">
            <p>Здравствуйте!</p>
            
            <p><span class="highlight">${activatorName}</span> продлил срок действия вашего продавца <span class="highlight">${sellerName}</span>.</p>
            
            <div class="info-box">
                <h3>📋 Детали продления:</h3>
                <p><strong>Название продавца:</strong> ${sellerName}</p>
                <p><strong>Продлён:</strong> ${activatorName}</p>
                <p><strong>Активен до:</strong> ${new Date(newEndDate).toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })}</p>
            </div>
            
            <p>Продавец продолжает работать в системе.</p>
            
            <p>С уважением,<br><strong>Команда Piruza Store</strong></p>
        </div>
        <div class="footer">
            <p>Это автоматическое сообщение. Пожалуйста, не отвечайте на него.</p>
            <p>&copy; ${new Date().getFullYear()} Piruza Store. Все права защищены.</p>
        </div>
    </div>
</body>
</html>
            `
        };

        const info = await transporter.sendMail(mailOptions);

        logger.info('Extension notification sent to creator', {
            messageId: info.messageId,
            sellerName,
            recipientEmail: creatorEmail,
            activatorName,
        });

        console.log(`✅ Extension notification sent to creator: ${creatorEmail}`);

        return { success: true, messageId: info.messageId };

    } catch (error) {
        logger.error('Failed to send extension notification to creator', {
            error: error.message,
            sellerName,
            recipientEmail: creatorEmail,
        });

        console.error('❌ Error sending extension notification to creator:', error.message);

        return { success: false, error: error.message };
    }
};

// ========== 16. ТЕСТОВОЕ ПИСЬМО ==========

export const sendTestEmail = async (toEmail) => {
    try {
        const transporter = getTransporter();

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f4f4f4; }
        .box { background: white; padding: 40px; border-radius: 10px; display: inline-block; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .success { color: #10b981; font-size: 48px; }
    </style>
</head>
<body>
    <div class="box">
        <div class="success">✅</div>
        <h1>Email работает!</h1>
        <p>Это тестовое письмо от Piruza Store</p>
        <p>Если вы получили это письмо, значит настройка прошла успешно!</p>
        <p><strong>Время отправки:</strong> ${new Date().toLocaleString('ru-RU')}</p>
    </div>
</body>
</html>
        `;

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: toEmail,
            subject: '✅ Тест email - Piruza Store',
            html: htmlContent,
        };

        const info = await transporter.sendMail(mailOptions);

        logger.info('Test email sent', {
            messageId: info.messageId,
            toEmail,
        });

        console.log('✅ Test email sent to:', toEmail);

        return { success: true, messageId: info.messageId };

    } catch (error) {
        logger.error('Failed to send test email', {
            error: error.message,
            toEmail,
        });

        console.error('❌ Failed to send test email:', error.message);

        throw error;
    }
};