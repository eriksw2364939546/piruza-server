import { SellerRequest, User } from '../models/index.js';
import {
    sendNewRequestNotification,
    sendRequestApprovalEmail,
    sendRequestRejectionEmail
} from '../utils/email.util.js';

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

        // Получаем Owner и всех Admin
        const owner = await User.findOne({ role: 'owner' }).select('email');
        const admins = await User.find({ role: 'admin' }).select('email');

        // Отправляем email ОДНОВРЕМЕННО Owner И всем Admin
        const adminEmails = admins.map(admin => admin.email);

        await sendNewRequestNotification(
            owner.email,
            adminEmails,
            {
                name,
                businessType,
                legalInfo,
                managerName: manager.name,
                managerEmail: manager.email
            }
        );

        return request;
    }

    // Получить заявки Manager'а (только свои)
    async getRequestsByManager(managerId, filters = {}) {
        const { status } = filters;

        const query = { requestedBy: managerId };

        if (status) {
            query.status = status;
        }

        const requests = await SellerRequest.find(query)
            .populate('reviewedBy', 'name email role')
            .sort({ createdAt: -1 });

        return requests;
    }

    // Получить все заявки (Owner/Admin)
    async getAllRequests(filters = {}) {
        const { status, managerId } = filters;

        const query = {};

        if (status) {
            query.status = status;
        }

        if (managerId) {
            query.requestedBy = managerId;
        }

        const requests = await SellerRequest.find(query)
            .populate('requestedBy', 'name email role')
            .populate('reviewedBy', 'name email role')
            .sort({ createdAt: -1 });

        return requests;
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
            await sendRequestApprovalEmail(
                request.requestedBy.email,
                request.name
            );
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
            await sendRequestRejectionEmail(
                request.requestedBy.email,
                request.name,
                reason
            );
        }

        return request;
    }
}

export default new SellerRequestService();