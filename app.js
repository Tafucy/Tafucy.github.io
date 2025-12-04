// web_app/app.js
const tg = window.Telegram.WebApp;
const CONFIG = window.CONFIG || {};

// Инициализация Telegram WebApp
tg.expand();
tg.enableClosingConfirmation();
tg.setHeaderColor('#667eea');
tg.setBackgroundColor('#f0f2f5');

// Основное состояние приложения
let goals = [];
let isLoading = false;

// DOM элементы
const goalsList = document.getElementById('goals-list');
const createGoalBtn = document.getElementById('create-goal-btn');
const goalTitleInput = document.getElementById('goal-title');
const goalDescInput = document.getElementById('goal-desc');

// Инициализация
function initApp() {
    console.log(`${CONFIG.APP_NAME} v${CONFIG.VERSION} запущен`);
    
    // Загружаем цели при старте
    loadGoals();
    
    // Назначаем обработчики
    createGoalBtn.addEventListener('click', createGoal);
    
    // Обработчик получения данных от бота
    tg.onEvent('webAppDataReceived', handleBotResponse);
    
    // Показываем, что приложение готово
    tg.ready();
    tg.MainButton.hide();
}

// Загрузка целей
function loadGoals() {
    setIsLoading(true);
    
    // Запрашиваем цели у бота
    tg.sendData(JSON.stringify({
        action: 'get_goals',
        timestamp: Date.now()
    }));
}

// Создание цели
function createGoal() {
    const title = goalTitleInput.value.trim();
    const description = goalDescInput.value.trim();
    
    if (!title) {
        showMessage('Введите название цели', 'warning');
        return;
    }
    
    // Отправляем данные боту
    tg.sendData(JSON.stringify({
        action: 'create_goal',
        title: title,
        description: description,
        created_at: new Date().toISOString()
    }));
    
    // Очищаем поля
    goalTitleInput.value = '';
    goalDescInput.value = '';
    
    setIsLoading(true);
    showMessage('Цель создается...', 'info');
}

// Обработка ответа от бота
function handleBotResponse(event) {
    try {
        const data = JSON.parse(event.data);
        
        if (data.action === 'update_goals') {
            goals = data.goals || [];
            renderGoals();
            showMessage('Цели обновлены', 'success');
        } else if (data.action === 'goal_created') {
            loadGoals(); // Перезагружаем список
            showMessage('✅ Цель создана!', 'success');
        } else if (data.action === 'error') {
            showMessage(data.message || 'Ошибка', 'danger');
        }
    } catch (error) {
        console.error('Ошибка обработки данных:', error);
        showMessage('Ошибка загрузки данных', 'danger');
    }
    
    setIsLoading(false);
}

// Отображение целей
function renderGoals() {
    if (!goalsList) return;
    
    if (goals.length === 0) {
        goalsList.innerHTML = `
            <div class="empty-state">
                <p>🎯 У вас пока нет целей</p>
                <p>Создайте первую цель выше!</p>
            </div>
        `;
        return;
    }
    
    goalsList.innerHTML = goals.map(goal => `
        <li class="goal-item" data-id="${goal.id}">
            <div>
                <div class="goal-title">${escapeHtml(goal.title)}</div>
                ${goal.description ? `<div class="goal-desc">${escapeHtml(goal.description)}</div>` : ''}
                <div class="goal-status">
                    ${goal.completed ? '✅ Выполнено' : '⏳ В процессе'}
                </div>
            </div>
            <button class="delete-btn" onclick="deleteGoal(${goal.id})">🗑️</button>
        </li>
    `).join('');
}

// Удаление цели
function deleteGoal(goalId) {
    if (!confirm(CONFIG.TEXTS?.confirmDelete || 'Удалить цель?')) return;
    
    tg.sendData(JSON.stringify({
        action: 'delete_goal',
        goal_id: goalId
    }));
    
    setIsLoading(true);
}

// Вспомогательные функции
function setIsLoading(loading) {
    isLoading = loading;
    createGoalBtn.disabled = loading;
    createGoalBtn.textContent = loading 
        ? (CONFIG.TEXTS?.loading || 'Загрузка...') 
        : '➕ Создать цель';
}

function showMessage(text, type = 'info') {
    // Можно реализовать toast-уведомления
    console.log(`${type}: ${text}`);
    
    // Простой alert для демо
    if (type === 'danger') {
        alert(`⚠️ ${text}`);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Экспортируем функции для использования в HTML
window.deleteGoal = deleteGoal;
window.initApp = initApp;

// Запускаем приложение при загрузке
document.addEventListener('DOMContentLoaded', initApp);
