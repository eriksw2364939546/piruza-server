const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Статические файлы
app.use('/uploads', express.static(path.join(__dirname, '../public')));

// Тестовый маршрут
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Piruza Store API is running' });
});

// Обработка 404
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error'
    });
});

module.exports = app;