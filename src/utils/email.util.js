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

// ========== 1. EMAIL ПРИ АКТИВАЦИИ ПРОДАВЦА ==========

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
        .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
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
            
            <p>Если у вас есть вопросы, свяжитесь с нами.</p>
            
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

        logger.info('Activation email sent', {
            messageId: info.messageId,
            sellerName,
            recipientEmail: managerEmail,
        });

        console.log(`✅ Activation email sent to ${managerEmail}`);

        return { success: true, messageId: info.messageId };

    } catch (error) {
        logger.error('Failed to send activation email', {
            error: error.message,
            sellerName,
            recipientEmail: managerEmail,
        });

        console.error('❌ Error sending activation email:', error.message);

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

// ========== 6. ТЕСТОВОЕ ПИСЬМО ==========

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