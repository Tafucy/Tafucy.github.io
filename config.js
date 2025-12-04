// web_app/config.js
const CONFIG = {
    // Настройки приложения
    APP_NAME: 'FocusGoal',
    VERSION: '1.0.0',
    
    // Настройки бота (может пригодиться для API запросов)
    BOT_USERNAME: '@YourBotUsername',
    
    // Цвета
    COLORS: {
        primary: '#667eea',
        secondary: '#764ba2',
        success: '#4CAF50',
        danger: '#ff4757',
        warning: '#ffa502'
    },
    
    // Локализация
    TEXTS: {
        goalCreated: 'Цель создана!',
        goalDeleted: 'Цель удалена',
        confirmDelete: 'Удалить цель?',
        loading: 'Загрузка...'
    }
};

// Экспорт для использования
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else {
    window.CONFIG = CONFIG;
}
