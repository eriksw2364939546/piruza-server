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
    // Получить список пользователей (Owner видит всех, Admin видит admin+manager)
    async getAllUsers(role, requesterId, requesterRole) {
        // ПРАВИЛО ДОСТУПА:
        // Owner → видит всех (owner, admin, manager)
        // Admin → видит admin + manager (НЕ видит owner)
        // Manager → 403

        if (requesterRole === 'manager') {
            throw new Error('Доступ запрещён');
        }

        // Построение фильтра
        let roleFilter = {};

        if (requesterRole === 'owner') {
            // Owner видит всех
            if (role) {
                roleFilter.role = role;
            } else {
                roleFilter.role = { $in: ['owner', 'admin', 'manager'] };
            }
        } else if (requesterRole === 'admin') {
            // Admin видит только admin и manager
            if (role) {
                if (role === 'owner') {
                    throw new Error('Доступ запрещён');
                }
                roleFilter.role = role;
            } else {
                roleFilter.role = { $in: ['admin', 'manager'] };
            }
        }

        // Исключаем самого запросившего
        const filter = {
            ...roleFilter,
            _id: { $ne: requesterId }
        };

        // Получаем пользователей
        const users = await User.find(filter)
            .select('-password')
            .populate('createdBy', 'name email role')
            .sort({ createdAt: -1 });

        // Расшифровываем
        const decryptedUsers = users.map(user => {
            const decrypted = {
                _id: user._id,
                email: decrypt(user.email),
                name: decrypt(user.name),
                role: user.role,
                isActive: user.isActive,
                createdAt: user.createdAt
            };

            // Дешифруем createdBy если есть
            if (user.createdBy) {
                decrypted.createdBy = {
                    _id: user.createdBy._id,
                    email: decrypt(user.createdBy.email),
                    name: decrypt(user.createdBy.name),
                    role: user.createdBy.role
                };
            }

            return decrypted;
        });

        return decryptedUsers;
    }
    // Получить пользователя по ID (с проверкой доступа по ролям)
    async getUserById(userId, requesterId, requesterRole) {
        const user = await User.findById(userId)
            .select('-password')
            .populate('createdBy', 'name email role');

        if (!user) {
            throw new Error('Пользователь не найден');
        }

        // ========== ПРОВЕРКА ДОСТУПА ПО РОЛЯМ ==========

        // Manager → 403 (не может видеть других)
        if (requesterRole === 'manager') {
            throw new Error('Доступ запрещён');
        }

        // Admin → видит admin + manager (НЕ owner)
        if (requesterRole === 'admin') {
            if (user.role === 'owner') {
                throw new Error('Доступ запрещён');
            }
        }

        // Owner → видит всех (проверка не нужна)

        // ================================================

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
        const { email, password, name, role } = data;

        // Проверка: нельзя менять свою роль самому себе
        if (role) {
            throw new Error('Нельзя изменить свою роль. Только Owner может изменять роли пользователей');
        }

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

    // Обновить профиль другого пользователя (Owner) ИЛИ СЕБЯ
    async updateUserProfile(targetUserId, data, currentUserId, currentUserRole) {
        const targetUser = await User.findById(targetUserId).select('+password');

        if (!targetUser) {
            throw new Error('Пользователь не найден');
        }

        // Проверка: редактирует себя или другого?
        const isSelf = targetUser._id.toString() === currentUserId.toString();

        if (!isSelf) {
            // Редактирует ДРУГОГО → только Owner может
            if (currentUserRole !== 'owner') {
                throw new Error('Доступ запрещён. Только Owner может редактировать других пользователей');
            }

            // Owner не может редактировать других Owner'ов
            if (targetUser.role === 'owner') {
                throw new Error('Нельзя редактировать других Owner. Owner только один в системе');
            }
        } else {
            // Редактирует СЕБЯ → все могут, но НЕ могут менять свою роль
            if (data.role && data.role !== targetUser.role) {
                throw new Error('Нельзя изменить свою роль. Только Owner может изменять роли пользователей');
            }

            // Owner не может деактивировать себя
            if (targetUser.role === 'owner' && data.isActive === false) {
                throw new Error('Нельзя деактивировать себя');
            }
        }

        const { email, password, name, role, isActive } = data;

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

        // Роль можно менять ТОЛЬКО если Owner редактирует другого
        if (role && !isSelf && currentUserRole === 'owner') {
            targetUser.role = role;
        }

        // isActive можно менять ТОЛЬКО если Owner редактирует другого
        if (isActive !== undefined && !isSelf && currentUserRole === 'owner') {
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