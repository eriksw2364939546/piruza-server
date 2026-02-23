import authRoute from './auth.route.js';
import clientRoute from './client.route.js';
import cityRoute from './city.route.js';
import categoryRoute from './category.route.js';
import sellerRoute from './seller.route.js';
import productRoute from './product.route.js';
import ratingRoute from './rating.route.js';
import sellerRequestRoute from './sellerrequest.route.js';
import dashboardRoute from './dashboard.route.js';

// Функция для подключения всех роутов
export const setupRoutes = (app) => {
    // Базовый префикс: /api

    app.use('/api/auth', authRoute);
    app.use('/api/client', clientRoute);
    app.use('/api/cities', cityRoute);
    app.use('/api/categories', categoryRoute);
    app.use('/api/sellers', sellerRoute);
    app.use('/api/products', productRoute);
    app.use('/api/ratings', ratingRoute);
    app.use('/api/requests', sellerRequestRoute);
    app.use('/api/dashboard', dashboardRoute);

    console.log('✅ Routes initialized');
};