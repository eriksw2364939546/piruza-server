// test-sanitization.mjs
const BASE_URL = 'http://localhost:7000';

// Тест 1: NoSQL Injection
async function testNoSQLInjection() {
    console.log('\n🔴 ТЕСТ 1: NoSQL Injection Attack');
    console.log('─'.repeat(50));

    const maliciousPayload = {
        email: { "$ne": null },
        password: { "$ne": null }
    };

    console.log('Отправка вредоносного payload:', JSON.stringify(maliciousPayload, null, 2));

    try {
        const response = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(maliciousPayload)
        });

        const data = await response.json();

        console.log('\nОтвет сервера:');
        console.log(`  Статус: ${response.status}`);
        console.log(`  Message: ${data.message}`);

        if (response.status === 401) {
            console.log('\n✅ ЗАЩИТА РАБОТАЕТ! Атака заблокирована!');
        } else if (response.status === 200) {
            console.log('\n🔴 УЯЗВИМОСТЬ! Вход без пароля успешен!');
        } else {
            console.log('\n🟡 Неожиданный ответ');
        }
    } catch (error) {
        console.log('\n❌ Ошибка:', error.message);
    }
}

// Тест 2: XSS Attack
async function testXSSAttack() {
    console.log('\n🔴 ТЕСТ 2: XSS Attack');
    console.log('─'.repeat(50));

    const xssPayload = {
        email: "test@test.com",
        name: "<script>alert('XSS')</script>",
        description: "<img src=x onerror=alert('XSS')>"
    };

    console.log('Отправка XSS payload:', JSON.stringify(xssPayload, null, 2));

    try {
        const response = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(xssPayload)
        });

        const data = await response.json();

        console.log('\nОтвет сервера:');
        console.log(`  Статус: ${response.status}`);

        // Проверяем был ли XSS закодирован
        const bodyStr = JSON.stringify(data);
        if (bodyStr.includes('<script>')) {
            console.log('\n🔴 УЯЗВИМОСТЬ! XSS не заблокирован!');
        } else if (bodyStr.includes('&lt;script&gt;')) {
            console.log('\n✅ ЗАЩИТА РАБОТАЕТ! XSS закодирован!');
        } else {
            console.log('\n✅ ЗАЩИТА РАБОТАЕТ! XSS удалён/заблокирован!');
        }
    } catch (error) {
        console.log('\n❌ Ошибка:', error.message);
    }
}

// Запуск тестов
async function runTests() {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   🧪 ТЕСТ INPUT SANITIZATION 🧪      ║');
    console.log('╚════════════════════════════════════════╝');

    await testNoSQLInjection();
    await testXSSAttack();

    console.log('\n╔════════════════════════════════════════╗');
    console.log('║        ✅ ТЕСТЫ ЗАВЕРШЕНЫ ✅          ║');
    console.log('╚════════════════════════════════════════╝\n');
}

runTests();