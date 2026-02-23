import { Seller, SellerRequest, User } from '../models/index.js';

class DashboardService {
    // Общая статистика (Owner/Admin/Manager)
    async getOverviewStats(userId, userRole) {
        if (userRole === 'owner' || userRole === 'admin') {
            // Статистика для Owner/Admin (вся система)
            return await this.getAdminOverview();
        } else {
            // Статистика для Manager (только свои)
            return await this.getManagerOverview(userId);
        }
    }

    // Статистика для Owner/Admin
    async getAdminOverview() {
        const [
            totalSellers,
            activeSellers,
            draftSellers,
            expiredSellers,
            inactiveSellers,
            pendingRequests,
            approvedRequests,
            rejectedRequests
        ] = await Promise.all([
            Seller.countDocuments(),
            Seller.countDocuments({ status: 'active' }),
            Seller.countDocuments({ status: 'draft' }),
            Seller.countDocuments({ status: 'expired' }),
            Seller.countDocuments({ status: 'inactive' }),
            SellerRequest.countDocuments({ status: 'pending' }),
            SellerRequest.countDocuments({ status: 'approved' }),
            SellerRequest.countDocuments({ status: 'rejected' })
        ]);

        return {
            sellers: {
                total: totalSellers,
                active: activeSellers,
                draft: draftSellers,
                expired: expiredSellers,
                inactive: inactiveSellers
            },
            requests: {
                pending: pendingRequests,
                approved: approvedRequests,
                rejected: rejectedRequests
            }
        };
    }

    // Статистика для Manager
    async getManagerOverview(managerId) {
        const [
            totalSellers,
            activeSellers,
            draftSellers,
            expiredSellers,
            inactiveSellers,
            pendingRequests,
            approvedRequests,
            rejectedRequests
        ] = await Promise.all([
            Seller.countDocuments({ createdBy: managerId }),
            Seller.countDocuments({ createdBy: managerId, status: 'active' }),
            Seller.countDocuments({ createdBy: managerId, status: 'draft' }),
            Seller.countDocuments({ createdBy: managerId, status: 'expired' }),
            Seller.countDocuments({ createdBy: managerId, status: 'inactive' }),
            SellerRequest.countDocuments({ requestedBy: managerId, status: 'pending' }),
            SellerRequest.countDocuments({ requestedBy: managerId, status: 'approved' }),
            SellerRequest.countDocuments({ requestedBy: managerId, status: 'rejected' })
        ]);

        return {
            sellers: {
                total: totalSellers,
                active: activeSellers,
                draft: draftSellers,
                expired: expiredSellers,
                inactive: inactiveSellers
            },
            requests: {
                pending: pendingRequests,
                approved: approvedRequests,
                rejected: rejectedRequests
            }
        };
    }

    // Статистика по Manager'ам (только для Owner/Admin)
    async getManagersStats() {
        // Получаем всех Manager'ов
        const managers = await User.find({ role: 'manager' })
            .select('name email')
            .sort({ name: 1 });

        const stats = [];

        for (const manager of managers) {
            const [
                totalSellers,
                activeSellers,
                pendingRequests,
                approvedRequests,
                rejectedRequests
            ] = await Promise.all([
                Seller.countDocuments({ createdBy: manager._id }),
                Seller.countDocuments({ createdBy: manager._id, status: 'active' }),
                SellerRequest.countDocuments({ requestedBy: manager._id, status: 'pending' }),
                SellerRequest.countDocuments({ requestedBy: manager._id, status: 'approved' }),
                SellerRequest.countDocuments({ requestedBy: manager._id, status: 'rejected' })
            ]);

            stats.push({
                manager: {
                    id: manager._id,
                    name: manager.name,
                    email: manager.email
                },
                sellers: {
                    total: totalSellers,
                    active: activeSellers
                },
                requests: {
                    pending: pendingRequests,
                    approved: approvedRequests,
                    rejected: rejectedRequests
                }
            });
        }

        return stats;
    }

    // Продавцы сгруппированные по статусам (Owner/Admin/Manager)
    async getSellersByStatus(userId, userRole) {
        const query = {};

        // Manager видит только своих
        if (userRole === 'manager') {
            query.createdBy = userId;
        }

        const [
            draftSellers,
            activeSellers,
            expiredSellers,
            inactiveSellers
        ] = await Promise.all([
            Seller.find({ ...query, status: 'draft' })
                .populate('city', 'name')
                .populate('createdBy', 'name email')
                .select('name slug city createdBy createdAt')
                .sort({ createdAt: -1 }),

            Seller.find({ ...query, status: 'active' })
                .populate('city', 'name')
                .populate('createdBy', 'name email')
                .select('name slug city activationEndDate createdBy createdAt')
                .sort({ activationEndDate: 1 }),

            Seller.find({ ...query, status: 'expired' })
                .populate('city', 'name')
                .populate('createdBy', 'name email')
                .select('name slug city activationEndDate createdBy createdAt')
                .sort({ activationEndDate: -1 }),

            Seller.find({ ...query, status: 'inactive' })
                .populate('city', 'name')
                .populate('createdBy', 'name email')
                .select('name slug city createdBy createdAt')
                .sort({ createdAt: -1 })
        ]);

        return {
            draft: draftSellers,
            active: activeSellers,
            expired: expiredSellers,
            inactive: inactiveSellers
        };
    }
}

export default new DashboardService();