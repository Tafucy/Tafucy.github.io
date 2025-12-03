// app.js - Основная логика Telegram Mini App

// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
let isDataSent = false;

// Основная функция инициализации
function initApp() {
    console.log('Инициализация Telegram Mini App...');
    
    // 1. Подготовка приложения
    tg.ready();
    tg.expand(); // Раскрываем на весь экран
    
    // 2. Отображение данных пользователя
    displayUserInfo();
    
    // 3. Применение текущей темы Telegram
    applyTheme();
    
    // 4. Настройка обработчиков событий
    setupEventListeners();
    
    // 5. Настройка основной кнопки (опционально)
    setupMainButton();
    
    console.log('Приложение инициализировано. Тема:', tg.colorScheme);
}

// Отображение информации о пользователе
function displayUserInfo() {
    const user = tg.initDataUnsafe.user;
    
    if (user) {
        document.getElementById('user-name').textContent = 
            `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Анонимный пользователь';
        document.getElementById('user-id').textContent = user.id;
        document.getElementById('user-username').textContent = 
            user.username ? `@${user.username}` : 'не указан';
        document.getElementById('user-language').textContent = 
            user.language_code || 'не определен';
    } else {
        // Режим отладки (когда запущено не в Telegram)
        document.getElementById('user-name').textContent = 'Режим отладки (не в Telegram)';
        document.getElementById('user-id').textContent = 'N/A';
        document.getElementById('user-username').textContent = 'N/A';
        document.getElementById('user-language').textContent = 'N/A';
        
        // Показываем предупреждение
        showAlert('Приложение запущено вне Telegram. Некоторые функции недоступны.', 'error');
    }
}

// Применение темы оформления Telegram
function applyTheme() {
    const theme = tg.colorScheme;
    const themeBadge = document.getElementById('user-theme');
    
    if (theme === 'dark') {
        document.body.classList.add('theme-dark');
        themeBadge.textContent = 'Тёмная';
        themeBadge.style.background = '#333';
    } else {
        document.body.classList.remove('theme-dark');
        themeBadge.textContent = 'Светлая';
        themeBadge.style.background = '#2481cc';
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Кнопка отправки данных
    document.getElementById('btn-send').addEventListener('click', sendDataToBot);
    
    // Кнопка показа alert
    document.getElementById('btn-alert').addEventListener('click', () => {
        tg.showAlert('Привет! Это тестовое сообщение из вашего Mini App. 🎉');
        tg.HapticFeedback.impactOccurred('light'); // Тактильный отклик
    });
    
    // Кнопка закрытия
    document.getElementById('btn-close').addEventListener('click', () => {
        tg.close();
    });
    
    // Обработчик изменения темы
    tg.onEvent('themeChanged', applyTheme);
    
    // Обработчик изменения viewport
    tg.onEvent('viewportChanged', (event) => {
        console.log('Viewport изменён:', event);
    });
}

// Настройка главной кнопки (внизу экрана)
function setupMainButton() {
    tg.MainButton.setText('✅ Отправить форму');
    tg.MainButton.onClick(sendDataToBot);
    
    // Показываем кнопку, если есть текст в поле ввода
    document.getElementById('user-input').addEventListener('input', function(e) {
        if (e.target.value.trim().length > 0 && !tg.MainButton.isVisible) {
            tg.MainButton.show();
        } else if (e.target.value.trim().length === 0 && tg.MainButton.isVisible) {
            tg.MainButton.hide();
        }
    });
}

// Функция отправки данных в Telegram бота
function sendDataToBot() {
    if (isDataSent) {
        showAlert('Данные уже были отправлены ранее!', 'error');
        tg.HapticFeedback.impactOccurred('heavy');
        return;
    }
    
    const userInput = document.getElementById('user-input').value.trim();
    
    if (!userInput) {
        showAlert('Пожалуйста, введите текст перед отправкой!', 'error');
        tg.HapticFeedback.impactOccurred('medium');
        return;
    }
    
    // Формируем данные для отправки
    const dataToSend = {
        action: 'user_message',
        text: userInput,
        user: tg.initDataUnsafe.user ? {
            id: tg.initDataUnsafe.user.id,
            first_name: tg.initDataUnsafe.user.first_name
        } : null,
        timestamp: new Date().toISOString(),
        theme: tg.colorScheme
    };
    
    console.log('Отправка данных:', dataToSend);
    
    // Отправляем данные через Telegram Web App API
    tg.sendData(JSON.stringify(dataToSend));
    
    // Визуальная обратная связь
    isDataSent = true;
    tg.HapticFeedback.notificationOccurred('success');
    showAlert('✅ Данные успешно отправлены боту!', 'success');
    
    // Блокируем повторную отправку
    document.getElementById('btn-send').disabled = true;
    document.getElementById('btn-send').textContent = '✓ Отправлено';
    tg.MainButton.hide();
    
    // Очищаем поле ввода через 2 секунды
    setTimeout(() => {
        document.getElementById('user-input').value = '';
    }, 2000);
}

// Вспомогательная функция для показа сообщений
function showAlert(message, type = 'success') {
    const alertDiv = document.getElementById('app-alert');
    alertDiv.textContent = message;
    alertDiv.className = `alert alert-${type}`;
    alertDiv.style.display = 'block';
    
    // Автоматически скрываем через 5 секунд
    setTimeout(() => {
        alertDiv.style.display = 'none';
    }, 5000);
}

// Запускаем приложение при полной загрузке DOM
document.addEventListener('DOMContentLoaded', initApp);

// Экспорт функций для отладки (опционально)
window.App = {
    initApp,
    sendDataToBot,
    showAlert,
    applyTheme
};
