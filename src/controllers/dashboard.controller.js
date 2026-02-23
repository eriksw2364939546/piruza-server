import dashboardService from '../services/dashboard.service.js';
import { success, error } from '../utils/responsehandler.util.js';

class DashboardController {
    // Получить общую статистику
    async getOverview(req, res) {
        try {
            const stats = await dashboardService.getOverviewStats(
                req.user.id,
                req.user.role
            );

            success(res, stats, 'Статистика получена');
        } catch (err) {
            error(res, err.message, 500);
        }
    }

    // Получить статистику по Manager'ам (Owner/Admin)
    async getManagersStats(req, res) {
        try {
            const stats = await dashboardService.getManagersStats();

            success(res, stats, 'Статистика по Manager получена');
        } catch (err) {
            error(res, err.message, 500);
        }
    }

    // Получить продавцов по статусам
    async getSellersByStatus(req, res) {
        try {
            const sellers = await dashboardService.getSellersByStatus(
                req.user.id,
                req.user.role
            );

            success(res, sellers, 'Продавцы по статусам получены');
        } catch (err) {
            error(res, err.message, 500);
        }
    }
}

export default new DashboardController();