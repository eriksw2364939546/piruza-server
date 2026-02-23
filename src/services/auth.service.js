import { User, Meta } from '../models/index.js';
import { generateToken } from '../utils/jwt.util.js';
import { encrypt, decrypt, hashMeta } from '../utils/crypto.util.js';
import bcrypt from 'bcryptjs';

class AuthService {
    // Регистрация Admin/Manager (только Owner может создавать)
    async registerAdmin(data, creatorId) {
        const { email, password, name, role } = data;

        // Проверка существования через Meta
        const existingMeta = await Meta.findOne({
            em: hashMeta(email),
            role: 'moderator'
        });

        if (existingMeta) {
            throw new Error('Пользователь с таким email уже существует');
        }

        // Шифрование данных перед сохранением
        const encryptedEmail = encrypt(email.toLowerCase());
        const encryptedName = encrypt(name);
        const hashedPassword = await bcrypt.hash(password, 12);

        // Создание нового пользователя
        const user = new User({
            email: encryptedEmail,
            password: hashedPassword,
            name: encryptedName,
            role,
            createdBy: creatorId
        });

        await user.save();

        // Создание Meta записи
        const meta = new Meta({
            moderator: user._id,
            role: 'moderator',
            em: hashMeta(email)
        });

        await meta.save();

        // Дешифрование для возврата
        return {
            id: user._id,
            email: decrypt(user.email),
            name: decrypt(user.name),
            role: user.role,
            createdBy: user.createdBy
        };
    }

    // Вход в систему (Owner/Admin/Manager)
    async loginUser(email, password) {
        // Находим через Meta
        const metaInfo = await Meta.findOne({
            em: hashMeta(email),
            role: 'moderator'
        }).populate({
            path: 'moderator',
            select: '+password'
        });

        if (!metaInfo || !metaInfo.moderator) {
            throw new Error('Неверный email или пароль');
        }

        const user = metaInfo.moderator;

        // Проверяем активность
        if (!user.isActive) {
            throw new Error('Аккаунт деактивирован');
        }

        // Проверяем пароль
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new Error('Неверный email или пароль');
        }

        // Генерируем токен
        const token = generateToken(user._id, user.role);

        // Дешифруем данные для возврата
        return {
            user: {
                id: user._id,
                email: decrypt(user.email),
                name: decrypt(user.name),
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

        const ownerEmail = process.env.OWNER_EMAIL;

        // Шифрование данных
        const encryptedEmail = encrypt(ownerEmail.toLowerCase());
        const encryptedName = encrypt(process.env.OWNER_NAME);
        const hashedPassword = await bcrypt.hash(process.env.OWNER_PASSWORD, 12);

        // Создаём Owner
        const owner = new User({
            email: encryptedEmail,
            password: hashedPassword,
            name: encryptedName,
            role: 'owner',
            createdBy: null
        });

        await owner.save();

        // Создаём Meta для Owner
        const meta = new Meta({
            moderator: owner._id,
            role: 'moderator',
            em: hashMeta(ownerEmail)
        });

        await meta.save();

        console.log('✅ Owner created:', ownerEmail);

        return {
            id: owner._id,
            email: ownerEmail,
            name: process.env.OWNER_NAME,
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

        // Дешифруем данные
        const decrypted = user.toObject();

        if (decrypted.email) {
            decrypted.email = decrypt(decrypted.email);
        }

        if (decrypted.name) {
            decrypted.name = decrypt(decrypted.name);
        }

        // Дешифруем createdBy если есть
        if (decrypted.createdBy) {
            if (decrypted.createdBy.email) {
                decrypted.createdBy.email = decrypt(decrypted.createdBy.email);
            }
            if (decrypted.createdBy.name) {
                decrypted.createdBy.name = decrypt(decrypted.createdBy.name);
            }
        }

        return decrypted;
    }

    // Обновить свой профиль
    async updateOwnProfile(userId, data) {
        const { email, password, name } = data;

        const user = await User.findById(userId).select('+password');
        if (!user) {
            throw new Error('Пользователь не найден');
        }

        // Дешифруем текущий email для сравнения
        const currentEmail = decrypt(user.email);

        // Если меняется email
        if (email && email !== currentEmail) {
            // Проверка уникальности через Meta
            const emailExists = await Meta.findOne({
                em: hashMeta(email),
                role: 'moderator'
            });

            if (emailExists) {
                throw new Error('Email уже используется');
            }

            // Шифруем новый email
            user.email = encrypt(email.toLowerCase());

            // Обновляем em в Meta
            await Meta.findOneAndUpdate(
                { moderator: userId, role: 'moderator' },
                { em: hashMeta(email) }
            );
        }

        if (password) {
            user.password = await bcrypt.hash(password, 12);
        }

        if (name) {
            user.name = encrypt(name);
        }

        await user.save();

        // Дешифруем для возврата
        return {
            id: user._id,
            email: decrypt(user.email),
            name: decrypt(user.name),
            role: user.role
        };
    }

    // Обновить профиль другого пользователя (Owner)
    async updateUserProfile(targetUserId, data, currentUserId, currentUserRole) {
        if (currentUserRole !== 'owner') {
            throw new Error('Доступ запрещён. Только Owner может редактировать других пользователей');
        }

        const targetUser = await User.findById(targetUserId).select('+password');
        if (!targetUser) {
            throw new Error('Пользователь не найден');
        }

        if (targetUser._id.toString() === currentUserId.toString()) {
            throw new Error('Используйте /api/auth/profile для редактирования своего профиля');
        }

        if (targetUser.role === 'owner') {
            throw new Error('Нельзя редактировать других Owner. Owner только один в системе');
        }

        const { email, password, name, isActive } = data;

        // Дешифруем текущий email
        const currentEmail = decrypt(targetUser.email);

        if (email && email !== currentEmail) {
            const emailExists = await Meta.findOne({
                em: hashMeta(email),
                role: 'moderator'
            });

            if (emailExists) {
                throw new Error('Email уже используется');
            }

            targetUser.email = encrypt(email.toLowerCase());

            await Meta.findOneAndUpdate(
                { moderator: targetUserId, role: 'moderator' },
                { em: hashMeta(email) }
            );
        }

        if (password) {
            targetUser.password = await bcrypt.hash(password, 12);
        }

        if (name) {
            targetUser.name = encrypt(name);
        }

        if (isActive !== undefined) {
            targetUser.isActive = isActive;
        }

        await targetUser.save();

        return {
            id: targetUser._id,
            email: decrypt(targetUser.email),
            name: decrypt(targetUser.name),
            role: targetUser.role,
            isActive: targetUser.isActive
        };
    }

    // Удалить пользователя
    async deleteUser(targetUserId, currentUserId, currentUserRole) {
        if (currentUserRole !== 'owner') {
            throw new Error('Доступ запрещён. Только Owner может удалять пользователей');
        }

        const targetUser = await User.findById(targetUserId);
        if (!targetUser) {
            throw new Error('Пользователь не найден');
        }

        if (targetUser._id.toString() === currentUserId.toString()) {
            throw new Error('Нельзя удалить самого себя');
        }

        if (targetUser.role === 'owner') {
            throw new Error('Нельзя удалить других Owner. Owner только один в системе');
        }

        // Удаляем Meta запись
        await Meta.findOneAndDelete({ moderator: targetUserId, role: 'moderator' });

        // Удаляем пользователя
        await User.findByIdAndDelete(targetUserId);

        return {
            id: targetUser._id,
            email: decrypt(targetUser.email),
            name: decrypt(targetUser.name),
            role: targetUser.role
        };
    }
}

export default new AuthService();