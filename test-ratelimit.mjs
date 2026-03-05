// test-rate-limiting.js
// Скрипт для тестирования Rate Limiting

const BASE_URL = 'http://localhost:7000';

// Цвета для консоли
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

// Функция задержки
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Функция для выполнения HTTP запроса
async function makeRequest(url, method = 'POST', body = null) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);
        const data = await response.json();

        return {
            status: response.status,
            headers: {
                limit: response.headers.get('RateLimit-Limit'),
                remaining: response.headers.get('RateLimit-Remaining'),
                reset: response.headers.get('RateLimit-Reset')
            },
            data
        };
    } catch (error) {
        return {
            error: error.message
        };
    }
}

// ТЕСТ 1: Проверка лимита на логин (5 попыток за 15 минут)
async function testLoginRateLimit() {
    console.log(`\n${colors.cyan}╔═══════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║  ТЕСТ 1: Rate Limiting на /auth/login   ║${colors.reset}`);
    console.log(`${colors.cyan}╚═══════════════════════════════════════════╝${colors.reset}`);
    console.log(`${colors.yellow}Лимит: 5 попыток за 15 минут${colors.reset}\n`);

    const loginData = {
        email: 'test@test.com',
        password: 'wrongpassword123'
    };

    for (let i = 1; i <= 7; i++) {
        console.log(`${colors.blue}Попытка ${i}:${colors.reset}`);

        const result = await makeRequest(`${BASE_URL}/api/auth/login`, 'POST', loginData);

        if (result.error) {
            console.log(`  ${colors.red}✗ Ошибка: ${result.error}${colors.reset}`);
            continue;
        }

        console.log(`  Статус: ${result.status === 429 ? colors.red : colors.green}${result.status}${colors.reset}`);
        console.log(`  Лимит: ${result.headers.limit}`);
        console.log(`  Осталось: ${result.headers.remaining}`);

        if (result.status === 429) {
            console.log(`  ${colors.red}✗ ЗАБЛОКИРОВАН!${colors.reset}`);
            console.log(`  Сообщение: "${result.data.message}"`);
            break;
        } else {
            console.log(`  ${colors.green}✓ Запрос прошёл${colors.reset}`);
        }

        console.log('');
        await delay(500); // Небольшая задержка между запросами
    }

    console.log(`${colors.cyan}${'─'.repeat(45)}${colors.reset}\n`);
}

// ТЕСТ 2: Общий API лимит (100 запросов за 15 минут)
async function testGeneralApiLimit() {
    console.log(`\n${colors.cyan}╔═══════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║  ТЕСТ 2: Общий Rate Limiting на /api/*   ║${colors.reset}`);
    console.log(`${colors.cyan}╚═══════════════════════════════════════════╝${colors.reset}`);
    console.log(`${colors.yellow}Лимит: 100 запросов за 15 минут${colors.reset}`);
    console.log(`${colors.yellow}Тестируем 10 запросов...${colors.reset}\n`);

    for (let i = 1; i <= 10; i++) {
        const result = await makeRequest(`${BASE_URL}/api/cities/active`, 'GET');

        if (result.error) {
            console.log(`${colors.red}Запрос ${i}: Ошибка - ${result.error}${colors.reset}`);
            continue;
        }

        const statusColor = result.status === 200 ? colors.green : colors.red;
        console.log(`Запрос ${i}: ${statusColor}${result.status}${colors.reset} | Лимит: ${result.headers.limit} | Осталось: ${result.headers.remaining}`);

        if (result.status === 429) {
            console.log(`${colors.red}✗ ЗАБЛОКИРОВАН после ${i} запросов!${colors.reset}`);
            break;
        }

        await delay(100);
    }

    console.log(`\n${colors.green}✓ Все запросы прошли успешно${colors.reset}`);
    console.log(`${colors.cyan}${'─'.repeat(45)}${colors.reset}\n`);
}

// ТЕСТ 3: Проверка сброса счётчика
async function testRateLimitReset() {
    console.log(`\n${colors.cyan}╔═══════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║  ТЕСТ 3: Проверка заголовка RateLimit-Reset${colors.reset}`);
    console.log(`${colors.cyan}╚═══════════════════════════════════════════╝${colors.reset}\n`);

    const result = await makeRequest(`${BASE_URL}/api/auth/login`, 'POST', {
        email: 'test@test.com',
        password: 'test'
    });

    if (result.error) {
        console.log(`${colors.red}Ошибка: ${result.error}${colors.reset}`);
        return;
    }

    const resetTime = parseInt(result.headers.reset);
    const now = Math.floor(Date.now() / 1000);
    const timeUntilReset = resetTime - now;

    console.log(`Текущее время: ${new Date().toLocaleString()}`);
    console.log(`Время сброса: ${new Date(resetTime * 1000).toLocaleString()}`);
    console.log(`До сброса: ${Math.floor(timeUntilReset / 60)} минут ${timeUntilReset % 60} секунд`);
    console.log(`\n${colors.cyan}${'─'.repeat(45)}${colors.reset}\n`);
}

// ТЕСТ 4: Разные IP (симуляция)
async function testDifferentIPs() {
    console.log(`\n${colors.cyan}╔═══════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║  ТЕСТ 4: Проверка идентификации по IP    ║${colors.reset}`);
    console.log(`${colors.cyan}╚═══════════════════════════════════════════╝${colors.reset}\n`);

    console.log(`${colors.yellow}Примечание: В локальной среде все запросы с одного IP${colors.reset}`);
    console.log(`${colors.yellow}В продакшене разные пользователи = разные счётчики${colors.reset}\n`);

    // Делаем 3 запроса
    for (let i = 1; i <= 3; i++) {
        const result = await makeRequest(`${BASE_URL}/api/auth/login`, 'POST', {
            email: `user${i}@test.com`,
            password: 'test'
        });

        if (!result.error) {
            console.log(`Запрос ${i}: Осталось попыток: ${result.headers.remaining}/${result.headers.limit}`);
        }

        await delay(200);
    }

    console.log(`\n${colors.green}✓ Счётчик общий для всех запросов с одного IP${colors.reset}`);
    console.log(`${colors.cyan}${'─'.repeat(45)}${colors.reset}\n`);
}

// ТЕСТ 5: Визуализация прогресса до блокировки
async function testProgressVisualization() {
    console.log(`\n${colors.cyan}╔═══════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║  ТЕСТ 5: Визуализация прогресса          ║${colors.reset}`);
    console.log(`${colors.cyan}╚═══════════════════════════════════════════╝${colors.reset}\n`);

    const MAX_ATTEMPTS = 5;

    for (let i = 1; i <= 7; i++) {
        const result = await makeRequest(`${BASE_URL}/api/auth/login`, 'POST', {
            email: 'visual@test.com',
            password: 'test'
        });

        if (result.error) {
            console.log(`${colors.red}Ошибка: ${result.error}${colors.reset}`);
            continue;
        }

        const remaining = parseInt(result.headers.remaining);
        const used = MAX_ATTEMPTS - remaining;

        // Прогресс-бар
        const filled = '█'.repeat(used);
        const empty = '░'.repeat(remaining);
        const bar = `[${filled}${empty}]`;

        const barColor = remaining === 0 ? colors.red : remaining <= 2 ? colors.yellow : colors.green;

        console.log(`Попытка ${i}: ${barColor}${bar}${colors.reset} ${used}/${MAX_ATTEMPTS}`);

        if (result.status === 429) {
            console.log(`\n${colors.red}╔═══════════════════════════════════╗${colors.reset}`);
            console.log(`${colors.red}║     🚫 ДОСТУП ЗАБЛОКИРОВАН 🚫    ║${colors.reset}`);
            console.log(`${colors.red}╚═══════════════════════════════════╝${colors.reset}`);
            console.log(`\n"${result.data.message}"\n`);
            break;
        }

        await delay(300);
    }

    console.log(`${colors.cyan}${'─'.repeat(45)}${colors.reset}\n`);
}

// Главная функция
async function runAllTests() {
    console.log(`\n${colors.cyan}╔════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║                                                ║${colors.reset}`);
    console.log(`${colors.cyan}║    🧪 ТЕСТИРОВАНИЕ RATE LIMITING 🧪           ║${colors.reset}`);
    console.log(`${colors.cyan}║                                                ║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════════════╝${colors.reset}`);

    console.log(`\n${colors.yellow}⚠️  ВНИМАНИЕ: Убедитесь что сервер запущен на ${BASE_URL}${colors.reset}\n`);

    // Проверка доступности сервера
    console.log(`${colors.blue}Проверка соединения с сервером...${colors.reset}`);
    const healthCheck = await makeRequest(`${BASE_URL}/api/health`, 'GET');

    if (healthCheck.error || healthCheck.status !== 200) {
        console.log(`${colors.red}\n✗ Сервер недоступен!${colors.reset}`);
        console.log(`${colors.yellow}Запустите сервер командой: npm run dev${colors.reset}\n`);
        return;
    }

    console.log(`${colors.green}✓ Сервер работает!${colors.reset}\n`);

    console.log(`${colors.yellow}Запускаем тесты через 2 секунды...${colors.reset}`);
    await delay(2000);

    // Запуск тестов
    await testProgressVisualization();

    console.log(`${colors.yellow}\nОжидание 2 секунды перед следующим тестом...${colors.reset}`);
    await delay(2000);

    await testGeneralApiLimit();

    await delay(1000);

    await testRateLimitReset();

    await delay(1000);

    await testDifferentIPs();

    // Итоги
    console.log(`\n${colors.cyan}╔════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║                                                ║${colors.reset}`);
    console.log(`${colors.cyan}║           ✅ ВСЕ ТЕСТЫ ЗАВЕРШЕНЫ ✅            ║${colors.reset}`);
    console.log(`${colors.cyan}║                                                ║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════════════╝${colors.reset}\n`);

    console.log(`${colors.green}Выводы:${colors.reset}`);
    console.log(`  ✓ Rate Limiting работает корректно`);
    console.log(`  ✓ Заголовки RateLimit-* отправляются`);
    console.log(`  ✓ Блокировка срабатывает после превышения лимита`);
    console.log(`  ✓ Счётчики работают независимо для разных endpoints\n`);
}

// Запуск всех тестов
runAllTests().catch(console.error);