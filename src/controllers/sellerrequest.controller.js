import sellerRequestService from '../services/sellerrequest.service.js';
import { success, error } from '../utils/responsehandler.util.js';

class SellerRequestController {
    // Создать заявку (Manager)
    async createRequest(req, res) {
        try {
            const request = await sellerRequestService.createRequest(
                req.body,
                req.user.id
            );

            success(res, request, 'Заявка создана', 201);
        } catch (err) {
            error(res, err.message, 400);
        }
    }

    // Получить свои заявки (Manager)
    async getMyRequests(req, res) {
        try {
            const filters = {
                status: req.query.status
            };

            const requests = await sellerRequestService.getRequestsByManager(
                req.user.id,
                filters
            );

            success(res, requests, 'Заявки получены');
        } catch (err) {
            error(res, err.message, 500);
        }
    }

    // Получить все заявки (Owner/Admin)
    async getAllRequests(req, res) {
        try {
            const filters = {
                status: req.query.status,
                managerId: req.query.managerId
            };

            const requests = await sellerRequestService.getAllRequests(filters);

            success(res, requests, 'Все заявки получены');
        } catch (err) {
            error(res, err.message, 500);
        }
    }

    // Получить заявку по ID
    async getRequestById(req, res) {
        try {
            const { id } = req.params;

            const request = await sellerRequestService.getRequestById(
                id,
                req.user.id,
                req.user.role
            );

            success(res, request, 'Заявка получена');
        } catch (err) {
            error(res, err.message, err.message === 'Доступ запрещён' ? 403 : 404);
        }
    }

    // Одобрить заявку (Owner/Admin)
    async approveRequest(req, res) {
        try {
            const { id } = req.params;

            const request = await sellerRequestService.approveRequest(
                id,
                req.user.id
            );

            success(res, request, 'Заявка одобрена');
        } catch (err) {
            error(res, err.message, 400);
        }
    }

    // Отклонить заявку (Owner/Admin)
    async rejectRequest(req, res) {
        try {
            const { id } = req.params;
            const { rejectionReason } = req.body;

            const request = await sellerRequestService.rejectRequest(
                id,
                req.user.id,
                rejectionReason
            );

            success(res, request, 'Заявка отклонена');
        } catch (err) {
            error(res, err.message, 400);
        }
    }
}

export default new SellerRequestController();