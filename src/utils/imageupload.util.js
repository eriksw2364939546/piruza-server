import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class UploadPhotoUtil {
    constructor() {
        // Базовая папка uploads
        this.baseUploadDir = path.join(process.cwd(), 'public/uploads');

        // Создаем базовую папку если не существует
        if (!fs.existsSync(this.baseUploadDir)) {
            fs.mkdirSync(this.baseUploadDir, { recursive: true });
        }

        // Настройка multer для хранения в памяти (не на диске!)
        this.storage = multer.memoryStorage();

        // Настройка фильтра файлов
        this.fileFilter = (req, file, cb) => {
            const allowedMimeTypes = [
                'image/jpeg',
                'image/jpg',
                'image/png',
                'image/webp'
            ];

            if (allowedMimeTypes.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new Error('invalid_format'), false);
            }
        };

        // Основная конфигурация multer
        this.upload = multer({
            storage: this.storage,
            fileFilter: this.fileFilter,
            limits: {
                fileSize: 5 * 1024 * 1024, // 5 MB (из .env MAX_FILE_SIZE)
                files: 1
            }
        });

        // Привязываем контекст для методов
        this.handleUploadError = this.handleUploadError.bind(this);
        this.processImage = this.processImage.bind(this);
        this.getUploadDir = this.getUploadDir.bind(this);
    }

    // Получить путь к папке для конкретного типа (sellers/products/categories)
    getUploadDir(entityType) {
        const uploadDir = path.join(this.baseUploadDir, entityType);

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        return uploadDir;
    }

    /**
     * НОВЫЙ ПОДХОД: Разделяем на 2 этапа
     * 1. parse - только парсинг form-data (multer читает файл в память)
     * 2. process - обработка и сохранение изображения на диск
     * 
     * Валидация body происходит МЕЖДУ этапами!
     */

    // Middleware для одного ОБЯЗАТЕЛЬНОГО изображения
    single(fieldName = 'image', entityType = 'general') {
        const self = this;
        const uploadSingle = this.upload.single(fieldName);

        return {
            // Этап 1: Парсинг form-data
            parse: (req, res, next) => {
                uploadSingle(req, res, (error) => {
                    if (error) {
                        return self.handleUploadError(error, res);
                    }

                    console.log('📦 [UploadPhoto.parse] req.body:', req.body);
                    console.log('📦 [UploadPhoto.parse] req.file:', req.file ? 'файл загружен' : 'нет файла');

                    next();
                });
            },

            // Этап 2: Обработка и сохранение (ОБЯЗАТЕЛЬНОЕ изображение)
            process: async (req, res, next) => {
                try {
                    if (!req.file) {
                        return res.status(400).json({
                            success: false,
                            message: 'Изображение обязательно'
                        });
                    }

                    const imagePath = await self.processImage(req.file.buffer, entityType);
                    req.processedImage = imagePath;
                    next();
                } catch (error) {
                    console.error('❌ Image processing error:', error);
                    return res.status(500).json({
                        success: false,
                        message: 'Ошибка обработки изображения'
                    });
                }
            }
        };
    }

    // Middleware для ОПЦИОНАЛЬНОГО изображения
    optional(fieldName = 'image', entityType = 'general') {
        const self = this;
        const uploadSingle = this.upload.single(fieldName);

        return {
            // Этап 1: Парсинг form-data
            parse: (req, res, next) => {
                uploadSingle(req, res, (error) => {
                    if (error && error.code !== 'LIMIT_UNEXPECTED_FILE') {
                        return self.handleUploadError(error, res);
                    }

                    console.log('📦 [UploadPhoto.parse optional] req.body:', req.body);
                    console.log('📦 [UploadPhoto.parse optional] req.file:', req.file ? 'файл загружен' : 'нет файла');

                    next();
                });
            },

            // Этап 2: Обработка и сохранение (ОПЦИОНАЛЬНОЕ изображение)
            process: async (req, res, next) => {
                try {
                    if (!req.file) {
                        // Файл не обязателен — пропускаем
                        return next();
                    }

                    const imagePath = await self.processImage(req.file.buffer, entityType);
                    req.processedImage = imagePath;
                    next();
                } catch (error) {
                    console.error('❌ Image processing error:', error);
                    return res.status(500).json({
                        success: false,
                        message: 'Ошибка обработки изображения'
                    });
                }
            }
        };
    }

    // Обработка изображения с оптимизацией
    async processImage(buffer, entityType = 'general', width = 1200) {
        const uuid = uuidv4();
        const uploadDir = this.getUploadDir(entityType);

        const filename = `${uuid}.webp`;
        const outputPath = path.join(uploadDir, filename);

        // Настройки изображения
        const config = {
            width: width,
            quality: 80,
            maxSize: 100 * 1024 // 100KB
        };

        let quality = config.quality;
        let imageBuffer;

        // Обрабатываем изображение с автоматическим уменьшением качества
        do {
            imageBuffer = await sharp(buffer)
                .resize(config.width, null, {
                    fit: 'inside',
                    withoutEnlargement: false
                })
                .webp({ quality })
                .toBuffer();

            if (imageBuffer.length > config.maxSize) {
                quality -= 5;
            }
        } while (imageBuffer.length > config.maxSize && quality > 20);

        // Сохраняем файл
        await fs.promises.writeFile(outputPath, imageBuffer);

        // Возвращаем путь: /uploads/sellers/uuid.webp
        return `/uploads/${entityType}/${filename}`;
    }

    // Удаление файла изображения
    async deleteImage(imagePath) {
        if (!imagePath) return;

        try {
            // /uploads/sellers/uuid.webp -> public/uploads/sellers/uuid.webp
            const filePath = path.join(process.cwd(), 'public', imagePath);

            if (fs.existsSync(filePath)) {
                await fs.promises.unlink(filePath);
                console.log(`✅ Удален файл: ${filePath}`);
            }
        } catch (error) {
            console.error(`❌ Ошибка удаления файла:`, error);
        }
    }

    // Обработка ошибок загрузки
    handleUploadError(error, res) {
        console.error('❌ Upload error:', error);

        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'Файл слишком большой. Максимальный размер: 5 MB'
            });
        }

        if (error.message === 'invalid_format') {
            return res.status(400).json({
                success: false,
                message: 'Неподдерживаемый формат файла. Разрешены: JPG, PNG, WebP'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Ошибка загрузки файла'
        });
    }
}

export default new UploadPhotoUtil();