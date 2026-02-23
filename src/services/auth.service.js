import { User } from '../models/index.js';
import { generateToken } from '../utils/jwt.util.js';

class AuthService {
    // Регистрация Admin/Manager (только Owner может создавать)
    async registerAdmin(data, creatorId) {
        const { email, password, name, role } = data;

        // Проверка существования пользователя
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new Error('Пользователь с таким email уже существует');
        }

        // Создание нового пользователя
        const user = new User({
            email,
            password,
            name,
            role,
            createdBy: creatorId
        });

        await user.save();

        // Возвращаем данные без пароля
        return {
            id: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
            createdBy: user.createdBy
        };
    }

    // Вход в систему (Owner/Admin/Manager)
    async loginUser(email, password) {
        // Находим пользователя с паролем
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            throw new Error('Неверный email или пароль');
        }

        // Проверяем активность
        if (!user.isActive) {
            throw new Error('Аккаунт деактивирован');
        }

        // Проверяем пароль
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            throw new Error('Неверный email или пароль');
        }

        // Генерируем токен
        const token = generateToken(user._id, user.role);

        return {
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role
            },
            token
        };
    }

    // Создание Owner при первом запуске
    async createOwner() {
        // Проверяем существование Owner'а
        const ownerExists = await User.findOne({ role: 'owner' });
        if (ownerExists) {
            return null;
        }

        // Создаём Owner из .env
        const owner = new User({
            email: process.env.OWNER_EMAIL,
            password: process.env.OWNER_PASSWORD,
            name: process.env.OWNER_NAME,
            role: 'owner',
            createdBy: null
        });

        await owner.save();
        console.log('✅ Owner created:', owner.email);

        return {
            id: owner._id,
            email: owner.email,
            name: owner.name,
            role: owner.role
        };
    }

    // Получить профиль пользователя
    async getUserProfile(userId) {
        const user = await User.findById(userId)
            .select('-password')
            .populate('createdBy', 'name email role');

        if (!user) {
            throw new Error('Пользователь не найден');
        }

        return user;
    }
}

export default new AuthService();