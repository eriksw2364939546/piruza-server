import nodemailer from 'nodemailer';

// Настройка транспорта nodemailer
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true для 465, false для других портов
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Проверка подключения
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ Email configuration error:', error);
    } else {
        console.log('✅ Email server is ready');
    }
});

// 1. Email при активации продавца
export const sendActivationEmail = async (managerEmail, sellerName, endDate) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: managerEmail,
            subject: 'Продавец активирован - Piruza Store',
            html: `
        <h2>Продавец успешно активирован!</h2>
        <p>Ваш продавец <strong>${sellerName}</strong> был активирован.</p>
        <p><strong>Дата окончания:</strong> ${new Date(endDate).toLocaleDateString('fr-FR')}</p>
        <p>Продавец будет отображаться публично до указанной даты.</p>
        <br>
        <p>С уважением,<br>Команда Piruza Store</p>
      `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Activation email sent to ${managerEmail}`);
    } catch (error) {
        console.error('❌ Error sending activation email:', error);
    }
};

// 2. Напоминание об истечении срока (за 5 дней)
export const sendExpirationReminder = async (managerEmail, sellerName, endDate) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: managerEmail,
            subject: 'Напоминание: срок действия продавца истекает - Piruza Store',
            html: `
        <h2>Внимание! Срок действия истекает</h2>
        <p>Срок действия продавца <strong>${sellerName}</strong> истекает через 5 дней.</p>
        <p><strong>Дата истечения:</strong> ${new Date(endDate).toLocaleDateString('fr-FR')}</p>
        <p>Пожалуйста, свяжитесь с администратором для продления.</p>
        <br>
        <p>С уважением,<br>Команда Piruza Store</p>
      `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Expiration reminder sent to ${managerEmail}`);
    } catch (error) {
        console.error('❌ Error sending expiration reminder:', error);
    }
};

// 3. Уведомление Owner/Admin о новой заявке от Manager'а
export const sendNewRequestNotification = async (ownerEmail, adminEmails, requestData) => {
    try {
        const recipients = [ownerEmail, ...adminEmails].filter(Boolean).join(', ');

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: recipients,
            subject: 'Новая заявка на создание продавца - Piruza Store',
            html: `
        <h2>Новая заявка от Manager'а</h2>
        <p><strong>Название продавца:</strong> ${requestData.name}</p>
        <p><strong>Тип бизнеса:</strong> ${requestData.businessType}</p>
        <p><strong>Юридическая информация:</strong> ${requestData.legalInfo}</p>
        <p><strong>Запросил:</strong> ${requestData.managerName} (${requestData.managerEmail})</p>
        <br>
        <p>Пожалуйста, рассмотрите заявку в панели управления.</p>
        <br>
        <p>С уважением,<br>Команда Piruza Store</p>
      `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ New request notification sent to Owner/Admin`);
    } catch (error) {
        console.error('❌ Error sending request notification:', error);
    }
};

// 4. Email Manager'у об одобрении заявки
export const sendRequestApprovalEmail = async (managerEmail, sellerName) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: managerEmail,
            subject: 'Заявка одобрена - Piruza Store',
            html: `
        <h2>Поздравляем! Ваша заявка одобрена</h2>
        <p>Ваша заявка на создание продавца <strong>${sellerName}</strong> была одобрена.</p>
        <p>Теперь вы можете создать полного продавца в панели управления.</p>
        <br>
        <p>С уважением,<br>Команда Piruza Store</p>
      `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Approval email sent to ${managerEmail}`);
    } catch (error) {
        console.error('❌ Error sending approval email:', error);
    }
};

// 5. Email Manager'у об отклонении заявки
export const sendRequestRejectionEmail = async (managerEmail, sellerName, reason) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: managerEmail,
            subject: 'Заявка отклонена - Piruza Store',
            html: `
        <h2>Заявка отклонена</h2>
        <p>К сожалению, ваша заявка на создание продавца <strong>${sellerName}</strong> была отклонена.</p>
        <p><strong>Причина:</strong> ${reason}</p>
        <p>Вы можете создать новую заявку с исправлениями.</p>
        <br>
        <p>С уважением,<br>Команда Piruza Store</p>
      `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Rejection email sent to ${managerEmail}`);
    } catch (error) {
        console.error('❌ Error sending rejection email:', error);
    }
};