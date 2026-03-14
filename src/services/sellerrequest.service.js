import { SellerRequest, User } from '../models/index.js';
import {
    sendNewRequestNotification,
    sendRequestApprovalEmail,
    sendRequestRejectionEmail
} from '../utils/email.util.js';
import { paginate } from '../utils/pagination.util.js';
import CryptoJS from 'crypto-js';

// Функция расшифровки email
const decryptEmail = (encryptedEmail) => {
    try {
        const bytes = CryptoJS.AES.decrypt(encryptedEmail, process.env.CRYPTO_KEY);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        return decrypted || null;
    } catch (error) {
        console.error('❌ Ошибка расшифровки email:', error.message);
        return null;
    }
};

class SellerRequestService {
    // Создать заявку (Manager)
    async createRequest(data, managerId) {
        const { name, businessType, legalInfo } = data;

        // Создаём заявку
        const request = new SellerRequest({
            name,
            businessType,
            legalInfo,
            status: 'pending',
            requestedBy: managerId
        });

        await request.save();

        // Получаем данные Manager'а для email
        const manager = await User.findById(managerId).select('name email');

        console.log('📧 [EMAIL DEBUG] Manager (зашифрованный):', manager);

        // Получаем Owner и всех Admin
        const owner = await User.findOne({ role: 'owner' }).select('email');
        const admins = await User.find({ role: 'admin' }).select('email');

        console.log('📧 [EMAIL DEBUG] Owner (зашифрованный):', owner);
        console.log('📧 [EMAIL DEBUG] Admins (зашифрованные):', admins);

        // РАСШИФРОВЫВАЕМ EMAIL
        const managerEmail = manager?.email ? decryptEmail(manager.email) : null;
        const managerName = manager?.name ? decryptEmail(manager.name) : 'Manager';
        const ownerEmail = owner?.email ? decryptEmail(owner.email) : null;
        const adminEmails = admins
            .map(admin => admin.email ? decryptEmail(admin.email) : null)
            .filter(Boolean);

        console.log('📧 [EMAIL DEBUG] Manager email (расшифрованный):', managerEmail);
        console.log('📧 [EMAIL DEBUG] Owner email (расшифрованный):', ownerEmail);
        console.log('📧 [EMAIL DEBUG] Admin emails (расшифрованные):', adminEmails);

        // ПРОВЕРКА: Если Owner не найден
        if (!ownerEmail) {
            console.error('❌ [EMAIL ERROR] Owner email не найден или не расшифрован!');
        }

        // ПРОВЕРКА: Если Admin нет
        if (adminEmails.length === 0) {
            console.warn('⚠️ [EMAIL WARNING] Admin emails не найдены');
        }

        // Отправляем email ТОЛЬКО если есть хотя бы один получатель
        if (ownerEmail || adminEmails.length > 0) {
            try {
                await sendNewRequestNotification(
                    ownerEmail,
                    adminEmails,
                    {
                        name,
                        businessType,
                        legalInfo,
                        managerName: managerName,
                        managerEmail: managerEmail
                    }
                );
                console.log('✅ [EMAIL] Уведомление о новой заявке отправлено');
            } catch (emailError) {
                console.error('❌ [EMAIL ERROR]:', emailError.message);
                // НЕ падаем - заявка уже создана
            }
        } else {
            console.error('❌ [EMAIL ERROR] Нет получателей! Owner и Admin не найдены в БД');
        }

        return request;
    }

    // Получить заявки Manager'а (только свои)
    async getRequestsByManager(managerId, filters = {}, page = 1, limit = 20) {
        const { status } = filters;

        const query = { requestedBy: managerId };

        if (status) {
            query.status = status;
        }

        const requestsQuery = SellerRequest.find(query)
            .populate('reviewedBy', 'name email role')
            .sort({ createdAt: -1 });

        return await paginate(requestsQuery, page, limit);
    }

    // Получить все заявки (Owner/Admin)
    async getAllRequests(filters = {}, page = 1, limit = 20) {
        const { status, managerId } = filters;

        const query = {};
        if (status) query.status = status;
        if (managerId) query.requestedBy = managerId;

        const requestsQuery = SellerRequest.find(query)
            .populate('requestedBy', 'name email role')
            .populate('reviewedBy', 'name email role')
            .sort({ createdAt: -1 });

        const result = await paginate(requestsQuery, page, limit);

        // Расшифровываем name и email
        result.data = result.data.map(req => {
            const r = req.toObject ? req.toObject() : req;
            if (r.requestedBy) {
                r.requestedBy.name = decryptEmail(r.requestedBy.name);
                r.requestedBy.email = decryptEmail(r.requestedBy.email);
            }
            if (r.reviewedBy) {
                r.reviewedBy.name = decryptEmail(r.reviewedBy.name);
                r.reviewedBy.email = decryptEmail(r.reviewedBy.email);
            }
            return r;
        });

        return result;
    }

    // Получить заявку по ID
    async getRequestById(requestId, userId, userRole) {
        const request = await SellerRequest.findById(requestId)
            .populate('requestedBy', 'name email role')
            .populate('reviewedBy', 'name email role');

        if (!request) {
            throw new Error('Заявка не найдена');
        }

        // Manager может видеть только свои заявки
        if (userRole === 'manager' && request.requestedBy._id.toString() !== userId.toString()) {
            throw new Error('Доступ запрещён');
        }

        return request;
    }

    // Одобрить заявку (Owner/Admin)
    async approveRequest(requestId, reviewerId) {
        const request = await SellerRequest.findById(requestId)
            .populate('requestedBy', 'email name');

        if (!request) {
            throw new Error('Заявка не найдена');
        }

        if (request.status !== 'pending') {
            throw new Error('Заявка уже рассмотрена');
        }

        // Обновляем статус
        request.status = 'approved';
        request.reviewedBy = reviewerId;
        request.reviewedAt = new Date();

        await request.save();

        // Отправляем email Manager'у
        if (request.requestedBy && request.requestedBy.email) {
            try {
                const managerEmail = decryptEmail(request.requestedBy.email);

                if (managerEmail) {
                    await sendRequestApprovalEmail(managerEmail, request.name);
                    console.log('✅ [EMAIL] Уведомление об одобрении отправлено Manager');
                } else {
                    console.error('❌ [EMAIL ERROR] Не удалось расшифровать email Manager');
                }
            } catch (emailError) {
                console.error('❌ [EMAIL ERROR]:', emailError.message);
            }
        }

        return request;
    }

    // Отклонить заявку (Owner/Admin)
    async rejectRequest(requestId, reviewerId, reason) {
        const request = await SellerRequest.findById(requestId)
            .populate('requestedBy', 'email name');

        if (!request) {
            throw new Error('Заявка не найдена');
        }

        if (request.status !== 'pending') {
            throw new Error('Заявка уже рассмотрена');
        }

        // Обновляем статус
        request.status = 'rejected';
        request.reviewedBy = reviewerId;
        request.reviewedAt = new Date();
        request.rejectionReason = reason;

        await request.save();

        // Отправляем email Manager'у с причиной
        if (request.requestedBy && request.requestedBy.email) {
            try {
                const managerEmail = decryptEmail(request.requestedBy.email);

                if (managerEmail) {
                    await sendRequestRejectionEmail(managerEmail, request.name, reason);
                    console.log('✅ [EMAIL] Уведомление об отклонении отправлено Manager');
                } else {
                    console.error('❌ [EMAIL ERROR] Не удалось расшифровать email Manager');
                }
            } catch (emailError) {
                console.error('❌ [EMAIL ERROR]:', emailError.message);
            }
        }

        return request;
    }
}

export default new SellerRequestService();