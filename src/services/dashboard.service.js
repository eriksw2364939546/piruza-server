import { Seller, SellerRequest, User } from '../models/index.js';
import { decrypt } from '../utils/crypto.util.js';

class DashboardService {
    // НОВАЯ ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ - фильтрация продавцов по активности
    filterSellersByAccessibility(sellers) {
        return sellers.filter(seller => {
            // Проверка города
            if (!seller.city || !seller.city.isActive) {
                return false;
            }

            // Проверка категорий
            if (!seller.globalCategories || seller.globalCategories.length === 0) {
                return false;
            }

            const hasInactiveCategory = seller.globalCategories.some(cat => !cat.isActive);
            if (hasInactiveCategory) {
                return false;
            }

            return true;
        });
    }

    // Общая статистика (Owner/Admin/Manager)
    async getOverviewStats(userId, userRole) {
        if (userRole === 'owner') {
            // Owner видит ВСЮ систему
            return await this.getAdminOverview(false);
        } else if (userRole === 'admin') {
            // Admin видит только с активными городами/категориями
            return await this.getAdminOverview(true);
        } else {
            // Manager видит только свои с активными городами/категориями
            return await this.getManagerOverview(userId, true);
        }
    }

    // Статистика для Owner/Admin
    async getAdminOverview(filterByAccessibility = false) {
        if (!filterByAccessibility) {
            // Owner - простой подсчёт БЕЗ фильтрации
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
        } else {
            // Admin - загружаем ВСЕХ и фильтруем
            const allSellers = await Seller.find()
                .populate('city', 'isActive')
                .populate('globalCategories', 'isActive');

            // Фильтруем по активности
            const filteredSellers = this.filterSellersByAccessibility(allSellers);

            // Подсчёт по статусам
            const sellersStats = {
                total: filteredSellers.length,
                active: filteredSellers.filter(s => s.status === 'active').length,
                draft: filteredSellers.filter(s => s.status === 'draft').length,
                expired: filteredSellers.filter(s => s.status === 'expired').length,
                inactive: filteredSellers.filter(s => s.status === 'inactive').length
            };

            // Заявки (Admin видит все)
            const [
                pendingRequests,
                approvedRequests,
                rejectedRequests
            ] = await Promise.all([
                SellerRequest.countDocuments({ status: 'pending' }),
                SellerRequest.countDocuments({ status: 'approved' }),
                SellerRequest.countDocuments({ status: 'rejected' })
            ]);

            return {
                sellers: sellersStats,
                requests: {
                    pending: pendingRequests,
                    approved: approvedRequests,
                    rejected: rejectedRequests
                }
            };
        }
    }

    // Статистика для Manager
    async getManagerOverview(managerId, filterByAccessibility = false) {
        if (!filterByAccessibility) {
            // БЕЗ фильтрации (не используется сейчас)
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
        } else {
            // С фильтрацией по активности
            const allSellers = await Seller.find({ createdBy: managerId })
                .populate('city', 'isActive')
                .populate('globalCategories', 'isActive');

            // Фильтруем по активности
            const filteredSellers = this.filterSellersByAccessibility(allSellers);

            // Подсчёт по статусам
            const sellersStats = {
                total: filteredSellers.length,
                active: filteredSellers.filter(s => s.status === 'active').length,
                draft: filteredSellers.filter(s => s.status === 'draft').length,
                expired: filteredSellers.filter(s => s.status === 'expired').length,
                inactive: filteredSellers.filter(s => s.status === 'inactive').length
            };

            // Заявки Manager'а
            const [
                pendingRequests,
                approvedRequests,
                rejectedRequests
            ] = await Promise.all([
                SellerRequest.countDocuments({ requestedBy: managerId, status: 'pending' }),
                SellerRequest.countDocuments({ requestedBy: managerId, status: 'approved' }),
                SellerRequest.countDocuments({ requestedBy: managerId, status: 'rejected' })
            ]);

            return {
                sellers: sellersStats,
                requests: {
                    pending: pendingRequests,
                    approved: approvedRequests,
                    rejected: rejectedRequests
                }
            };
        }
    }

    // Статистика по Manager'ам (только для Owner/Admin)
    async getManagersStats(userRole) {
        const managers = await User.find({ role: 'manager' })
            .select('name email')
            .sort({ name: 1 });

        const stats = [];

        for (const manager of managers) {
            // Расшифровываем имя и email
            const managerName = decrypt(manager.name);
            const managerEmail = decrypt(manager.email);

            if (userRole === 'owner') {
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
                        name: managerName,
                        email: managerEmail
                    },
                    sellers: { total: totalSellers, active: activeSellers },
                    requests: { pending: pendingRequests, approved: approvedRequests, rejected: rejectedRequests }
                });

            } else {
                const allSellers = await Seller.find({ createdBy: manager._id })
                    .populate('city', 'isActive')
                    .populate('globalCategories', 'isActive');

                const filteredSellers = this.filterSellersByAccessibility(allSellers);

                const [
                    pendingRequests,
                    approvedRequests,
                    rejectedRequests
                ] = await Promise.all([
                    SellerRequest.countDocuments({ requestedBy: manager._id, status: 'pending' }),
                    SellerRequest.countDocuments({ requestedBy: manager._id, status: 'approved' }),
                    SellerRequest.countDocuments({ requestedBy: manager._id, status: 'rejected' })
                ]);

                stats.push({
                    manager: {
                        id: manager._id,
                        name: managerName,
                        email: managerEmail
                    },
                    sellers: {
                        total: filteredSellers.length,
                        active: filteredSellers.filter(s => s.status === 'active').length
                    },
                    requests: { pending: pendingRequests, approved: approvedRequests, rejected: rejectedRequests }
                });
            }
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

        // Загружаем продавцов с populate
        const [
            draftSellers,
            activeSellers,
            expiredSellers,
            inactiveSellers
        ] = await Promise.all([
            Seller.find({ ...query, status: 'draft' })
                .populate('city', 'name isActive')  // ← Добавлен isActive
                .populate('globalCategories', 'name isActive')  // ← Добавлен isActive
                .populate('createdBy', 'name email')
                .select('name slug city globalCategories createdBy createdAt')
                .sort({ createdAt: -1 }),

            Seller.find({ ...query, status: 'active' })
                .populate('city', 'name isActive')
                .populate('globalCategories', 'name isActive')
                .populate('createdBy', 'name email')
                .select('name slug city globalCategories activationEndDate createdBy createdAt')
                .sort({ activationEndDate: 1 }),

            Seller.find({ ...query, status: 'expired' })
                .populate('city', 'name isActive')
                .populate('globalCategories', 'name isActive')
                .populate('createdBy', 'name email')
                .select('name slug city globalCategories activationEndDate createdBy createdAt')
                .sort({ activationEndDate: -1 }),

            Seller.find({ ...query, status: 'inactive' })
                .populate('city', 'name isActive')
                .populate('globalCategories', 'name isActive')
                .populate('createdBy', 'name email')
                .select('name slug city globalCategories createdBy createdAt')
                .sort({ createdAt: -1 })
        ]);

        // НОВОЕ: Фильтрация для Admin/Manager
        if (userRole !== 'owner') {
            return {
                draft: this.filterSellersByAccessibility(draftSellers),
                active: this.filterSellersByAccessibility(activeSellers),
                expired: this.filterSellersByAccessibility(expiredSellers),
                inactive: this.filterSellersByAccessibility(inactiveSellers)
            };
        }

        // Owner видит всех
        return {
            draft: draftSellers,
            active: activeSellers,
            expired: expiredSellers,
            inactive: inactiveSellers
        };
    }
}

export default new DashboardService();