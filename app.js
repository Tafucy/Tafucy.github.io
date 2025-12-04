// Telegram Web App Initialization
const tg = window.Telegram.WebApp;
let isParsing = false;
let parseTimer = null;
let currentTaskId = null;

// Initialize Web App
tg.expand();
tg.enableClosingConfirmation();
tg.setHeaderColor('#0088cc');
tg.setBackgroundColor('#ffffff');

// State Management
let appState = {
    user: null,
    results: [],
    stats: {
        totalParsed: 0,
        totalMembers: 0,
        avgCoverage: 0
    },
    settings: {
        autoSave: true,
        notifications: true,
        darkMode: false,
        sessionTimeout: 30,
        secureConnection: true
    },
    parseOptions: {
        parseAdmins: true,
        parseBots: true,
        parsePremium: true,
        parseRegular: true,
        parseNoUsername: true,
        delay: 1.0
    }
};

// DOM Elements
const elements = {
    // User info
    userName: document.getElementById('user-name'),
    userAvatar: document.getElementById('user-avatar'),
    userStatus: document.getElementById('user-status'),
    
    // Navigation
    navButtons: document.querySelectorAll('.nav-btn'),
    bottomNavButtons: document.querySelectorAll('.bottom-nav-btn'),
    sections: document.querySelectorAll('.section'),
    
    // Parsing
    groupLink: document.getElementById('group-link'),
    pasteBtn: document.getElementById('paste-btn'),
    parseCheckboxes: {
        admins: document.getElementById('parse-admins'),
        bots: document.getElementById('parse-bots'),
        premium: document.getElementById('parse-premium'),
        regular: document.getElementById('parse-regular'),
        noUsername: document.getElementById('parse-no-username')
    },
    delaySlider: document.getElementById('delay-slider'),
    delayValue: document.getElementById('delay-value'),
    startParseBtn: document.getElementById('start-parse-btn'),
    cancelParseBtn: document.getElementById('cancel-parse-btn'),
    
    // Progress
    progressSection: document.getElementById('progress-section'),
    progressPercent: document.getElementById('progress-percent'),
    progressFill: document.getElementById('progress-fill'),
    parseStatus: document.getElementById('parse-status'),
    membersFound: document.getElementById('members-found'),
    parseTime: document.getElementById('parse-time'),
    parseSpeed: document.getElementById('parse-speed'),
    realTimeStats: document.getElementById('real-time-stats'),
    
    // Stats
    statCounts: {
        owner: document.getElementById('owner-count'),
        admins: document.getElementById('admins-count'),
        bots: document.getElementById('bots-count'),
        premium: document.getElementById('premium-count')
    },
    
    // Results
    resultsContainer: document.getElementById('results-container'),
    searchInput: document.getElementById('search-input'),
    searchBtn: document.getElementById('search-btn'),
    filterButtons: document.querySelectorAll('.filter-btn'),
    
    // Statistics
    totalParsed: document.getElementById('total-parsed'),
    totalMembers: document.getElementById('total-members'),
    avgCoverage: document.getElementById('avg-coverage'),
    
    // Settings
    autoSave: document.getElementById('auto-save'),
    notifications: document.getElementById('notifications'),
    darkMode: document.getElementById('dark-mode'),
    secureConnection: document.getElementById('secure-connection'),
    sessionTimeout: document.getElementById('session-timeout'),
    
    // Buttons
    exportDataBtn: document.getElementById('export-data-btn'),
    clearDataBtn: document.getElementById('clear-data-btn'),
    resetSettingsBtn: document.getElementById('reset-settings-btn'),
    exportAllBtn: document.getElementById('export-all-btn'),
    clearResultsBtn: document.getElementById('clear-results-btn'),
    
    // Modal
    modal: document.getElementById('result-modal'),
    modalTitle: document.getElementById('modal-title'),
    modalBody: document.getElementById('modal-body'),
    closeModal: document.getElementById('close-modal'),
    exportModalBtn: document.getElementById('export-modal-btn'),
    shareModalBtn: document.getElementById('share-modal-btn'),
    
    // FAB
    fab: document.getElementById('fab'),
    
    // Theme toggle
    themeToggle: document.getElementById('theme-toggle'),
    refreshBtn: document.getElementById('refresh-btn'),
    
    // Loading
    loadingOverlay: document.getElementById('loading-overlay')
};

// Initialize App
document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
    try {
        showLoading();
        
        // Initialize Telegram Web App
        await initTelegram();
        
        // Load user data
        await loadUserData();
        
        // Load saved state
        loadState();
        
        // Setup event listeners
        setupEventListeners();
        
        // Update UI
        updateUI();
        
        // Load initial data
        await loadInitialData();
        
        hideLoading();
        
        showToast('Приложение готово к работе!', 'success');
        
    } catch (error) {
        console.error('App initialization error:', error);
        showToast('Ошибка инициализации приложения', 'error');
        hideLoading();
    }
}

// Telegram Web App Functions
async function initTelegram() {
    tg.ready();
    
    // Get user data from Telegram
    const user = tg.initDataUnsafe?.user;
    if (user) {
        appState.user = {
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            username: user.username,
            languageCode: user.language_code,
            isPremium: user.is_premium || false,
            photoUrl: user.photo_url
        };
        
        // Update UI with user data
        elements.userName.textContent = `${user.first_name} ${user.last_name || ''}`;
        if (user.photo_url) {
            elements.userAvatar.src = user.photo_url;
        }
    }
    
    // Handle theme change
    if (tg.colorScheme === 'dark') {
        appState.settings.darkMode = true;
        enableDarkMode();
    }
    
    // Handle back button
    tg.BackButton.onClick(() => {
        if (elements.modal.classList.contains('hidden')) {
            tg.close();
        } else {
            closeModal();
        }
    });
    
    // Handle viewport changes
    tg.onEvent('viewportChanged', () => {
        tg.expand();
    });
}

// State Management
function saveState() {
    try {
        localStorage.setItem('telegramParserState', JSON.stringify(appState));
    } catch (error) {
        console.error('Error saving state:', error);
    }
}

function loadState() {
    try {
        const saved = localStorage.getItem('telegramParserState');
        if (saved) {
            const parsed = JSON.parse(saved);
            
            // Merge settings
            appState.settings = { ...appState.settings, ...parsed.settings };
            
            // Merge parse options
            if (parsed.parseOptions) {
                appState.parseOptions = parsed.parseOptions;
            }
            
            // Restore UI state
            updateSettingsUI();
            updateParseOptionsUI();
        }
    } catch (error) {
        console.error('Error loading state:', error);
    }
}

// Event Listeners
function setupEventListeners() {
    // Navigation
    elements.navButtons.forEach(btn => {
        btn.addEventListener('click', () => switchSection(btn.dataset.section));
    });
    
    elements.bottomNavButtons.forEach(btn => {
        btn.addEventListener('click', () => switchSection(btn.dataset.section));
    });
    
    // Parsing
    elements.pasteBtn.addEventListener('click', pasteFromClipboard);
    elements.startParseBtn.addEventListener('click', startParsing);
    elements.cancelParseBtn.addEventListener('click', cancelParsing);
    
    // Parse options
    Object.keys(elements.parseCheckboxes).forEach(key => {
        elements.parseCheckboxes[key].addEventListener('change', updateParseOptions);
    });
    
    elements.delaySlider.addEventListener('input', updateDelayValue);
    
    // Results
    elements.searchBtn.addEventListener('click', searchResults);
    elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchResults();
    });
    
    elements.filterButtons.forEach(btn => {
        btn.addEventListener('click', () => filterResults(btn.dataset.filter));
    });
    
    // Settings
    elements.autoSave.addEventListener('change', updateSetting);
    elements.notifications.addEventListener('change', updateSetting);
    elements.darkMode.addEventListener('change', updateSetting);
    elements.secureConnection.addEventListener('change', updateSetting);
    elements.sessionTimeout.addEventListener('change', updateSetting);
    
    // Action buttons
    elements.exportDataBtn.addEventListener('click', exportAllData);
    elements.clearDataBtn.addEventListener('click', clearCache);
    elements.resetSettingsBtn.addEventListener('click', resetSettings);
    elements.exportAllBtn.addEventListener('click', exportAllResults);
    elements.clearResultsBtn.addEventListener('click', clearAllResults);
    
    // Modal
    elements.closeModal.addEventListener('click', closeModal);
    elements.exportModalBtn.addEventListener('click', exportModalResult);
    elements.shareModalBtn.addEventListener('click', shareResult);
    
    // FAB
    elements.fab.addEventListener('click', () => {
        switchSection('parse');
        elements.groupLink.focus();
    });
    
    // Theme toggle
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.refreshBtn.addEventListener('click', refreshApp);
    
    // Telegram events
    tg.onEvent('themeChanged', () => {
        if (tg.colorScheme === 'dark') {
            enableDarkMode();
        } else {
            disableDarkMode();
        }
    });
}

// UI Functions
function switchSection(sectionId) {
    // Update navigation
    elements.navButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.section === sectionId);
    });
    
    elements.bottomNavButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.section === sectionId);
    });
    
    // Show selected section
    elements.sections.forEach(section => {
        section.classList.toggle('active', section.id === `${sectionId}-section`);
    });
    
    // Update back button
    if (sectionId === 'parse') {
        tg.BackButton.hide();
    } else {
        tg.BackButton.show();
    }
}

function updateUI() {
    // Update user info
    if (appState.user) {
        elements.userName.textContent = 
            `${appState.user.firstName} ${appState.user.lastName || ''}`;
    }
    
    // Update stats
    elements.totalParsed.textContent = appState.stats.totalParsed;
    elements.totalMembers.textContent = appState.stats.totalMembers.toLocaleString();
    elements.avgCoverage.textContent = `${appState.stats.avgCoverage}%`;
}

function updateSettingsUI() {
    const settings = appState.settings;
    
    elements.autoSave.checked = settings.autoSave;
    elements.notifications.checked = settings.notifications;
    elements.darkMode.checked = settings.darkMode;
    elements.secureConnection.checked = settings.secureConnection;
    elements.sessionTimeout.value = settings.sessionTimeout;
    
    if (settings.darkMode) {
        enableDarkMode();
    }
}

function updateParseOptionsUI() {
    const options = appState.parseOptions;
    
    elements.parseCheckboxes.admins.checked = options.parseAdmins;
    elements.parseCheckboxes.bots.checked = options.parseBots;
    elements.parseCheckboxes.premium.checked = options.parsePremium;
    elements.parseCheckboxes.regular.checked = options.parseRegular;
    elements.parseCheckboxes.noUsername.checked = options.parseNoUsername;
    elements.delaySlider.value = options.delay;
    elements.delayValue.textContent = `${options.delay} сек`;
}

// Parsing Functions
async function startParsing() {
    const groupLink = elements.groupLink.value.trim();
    
    if (!groupLink) {
        showToast('Введите ссылку на группу', 'warning');
        elements.groupLink.focus();
        return;
    }
    
    if (!isValidGroupLink(groupLink)) {
        showToast('Неверный формат ссылки', 'error');
        return;
    }
    
    if (isParsing) {
        showToast('Парсинг уже выполняется', 'warning');
        return;
    }
    
    try {
        isParsing = true;
        currentTaskId = generateTaskId();
        
        // Show progress section
        elements.progressSection.classList.remove('hidden');
        
        // Update UI
        elements.startParseBtn.disabled = true;
        elements.cancelParseBtn.disabled = false;
        elements.parseStatus.textContent = 'Подключение к группе...';
        
        // Send request to bot
        const response = await sendToBot('start_parse', {
            group_link: groupLink,
            task_id: currentTaskId,
            options: appState.parseOptions
        });
        
        if (response.success) {
            // Start progress simulation
            simulateProgress();
            
            showToast('Парсинг начался', 'success');
            
            // Start polling for results
            startPolling(currentTaskId);
            
        } else {
            throw new Error(response.error || 'Ошибка запуска парсинга');
        }
        
    } catch (error) {
        console.error('Parsing error:', error);
        showToast(`Ошибка: ${error.message}`, 'error');
        resetParsing();
    }
}

async function cancelParsing() {
    if (!isParsing || !currentTaskId) return;
    
    if (confirm('Остановить парсинг?')) {
        try {
            await sendToBot('cancel_parse', { task_id: currentTaskId });
            showToast('Парсинг остановлен', 'warning');
        } catch (error) {
            console.error('Cancel error:', error);
        } finally {
            resetParsing();
        }
    }
}

function resetParsing() {
    isParsing = false;
    currentTaskId = null;
    
    if (parseTimer) {
        clearInterval(parseTimer);
        parseTimer = null;
    }
    
    elements.startParseBtn.disabled = false;
    elements.cancelParseBtn.disabled = true;
    elements.progressSection.classList.add('hidden');
    
    // Reset progress
    updateProgress(0, 'Ожидание...');
}

function simulateProgress() {
    let progress = 0;
    let statuses = [
        'Получение информации о группе...',
        'Сбор участников...',
        'Категоризация...',
        'Сохранение результатов...',
        'Готово!'
    ];
    let statusIndex = 0;
    
    parseTimer = setInterval(() => {
        if (!isParsing) {
            clearInterval(parseTimer);
            return;
        }
        
        progress += Math.random() * 5;
        
        if (progress >= 25 && statusIndex < 1) statusIndex = 1;
        if (progress >= 50 && statusIndex < 2) statusIndex = 2;
        if (progress >= 75 && statusIndex < 3) statusIndex = 3;
        if (progress >= 100 && statusIndex < 4) statusIndex = 4;
        
        if (progress >= 100) {
            progress = 100;
            clearInterval(parseTimer);
        }
        
        updateProgress(progress, statuses[statusIndex]);
        
        // Simulate finding members
        if (progress < 100) {
            const found = Math.floor(progress * 10);
            elements.membersFound.textContent = found.toLocaleString();
            
            // Update real-time stats
            updateRealTimeStats(found);
        }
        
    }, 500);
}

function updateProgress(percent, status) {
    elements.progressPercent.textContent = `${Math.round(percent)}%`;
    elements.progressFill.style.width = `${percent}%`;
    elements.parseStatus.textContent = status;
    
    // Update time
    if (percent > 0 && percent < 100) {
        const elapsed = Math.floor(percent / 20); // Simulate time
        elements.parseTime.textContent = `00:${elapsed.toString().padStart(2, '0')}`;
    }
}

function updateRealTimeStats(totalMembers) {
    // Simulate finding different types of members
    const stats = {
        owner: Math.floor(totalMembers * 0.01),
        admins: Math.floor(totalMembers * 0.05),
        bots: Math.floor(totalMembers * 0.03),
        premium: Math.floor(totalMembers * 0.1)
    };
    
    Object.keys(stats).forEach(key => {
        elements.statCounts[key].textContent = stats[key];
    });
}

// Bot Communication
async function sendToBot(command, data = {}) {
    try {
        const payload = {
            command,
            user_id: appState.user?.id,
            ...data
        };
        
        // In a real app, this would send data to your bot
        // For now, simulate response
        return await simulateBotResponse(command, data);
        
    } catch (error) {
        console.error('Bot communication error:', error);
        throw error;
    }
}

async function simulateBotResponse(command, data) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    switch (command) {
        case 'start_parse':
            return {
                success: true,
                task_id: data.task_id,
                group_title: data.group_link.replace('@', '').replace('https://t.me/', ''),
                message: 'Парсинг начат'
            };
            
        case 'cancel_parse':
            return { success: true, message: 'Парсинг отменен' };
            
        case 'get_results':
            return {
                success: true,
                results: generateMockResults()
            };
            
        default:
            return { success: false, error: 'Unknown command' };
    }
}

function startPolling(taskId) {
    const pollInterval = setInterval(async () => {
        if (!isParsing) {
            clearInterval(pollInterval);
            return;
        }
        
        try {
            // In real app, check task status from bot
            // For now, simulate completion after 10 seconds
            if (Math.random() < 0.1) { // 10% chance per poll
                clearInterval(pollInterval);
                
                // Simulate completion
                setTimeout(() => {
                    completeParsing(taskId);
                }, 1000);
            }
            
        } catch (error) {
            console.error('Polling error:', error);
        }
    }, 2000);
}

async function completeParsing(taskId) {
    isParsing = false;
    clearInterval(parseTimer);
    
    // Show completion
    updateProgress(100, 'Готово!');
    elements.membersFound.textContent = '1,250';
    
    // Update stats
    updateRealTimeStats(1250);
    
    // Add mock result
    const mockResult = generateMockResult(taskId, elements.groupLink.value);
    appState.results.unshift(mockResult);
    
    // Update UI
    await loadResults();
    updateStats();
    
    // Show success message
    showToast('Парсинг успешно завершен!', 'success');
    
    // Reset after delay
    setTimeout(() => {
        resetParsing();
        elements.lastResults.classList.remove('hidden');
    }, 3000);
}

// Results Management
async function loadResults() {
    try {
        showLoading();
        
        // In real app, fetch from bot
        // For now, use mock data
        if (appState.results.length === 0) {
            appState.results = generateMockResults();
        }
        
        renderResults(appState.results);
        hideLoading();
        
    } catch (error) {
        console.error('Load results error:', error);
        showToast('Ошибка загрузки результатов', 'error');
        hideLoading();
    }
}

function renderResults(results) {
    if (!results || results.length === 0) {
        elements.resultsContainer.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 48px; margin-bottom: 20px;">📭</div>
                <h3>Нет результатов</h3>
                <p>Начните парсинг, чтобы увидеть результаты здесь</p>
            </div>
        `;
        return;
    }
    
    const html = results.map((result, index) => `
        <div class="result-card" data-index="${index}">
            <h3>${result.group_title}</h3>
            <div class="result-info">
                <span>📅 ${new Date(result.parsed_at).toLocaleDateString()}</span>
                <span>👥 ${result.total_parsed.toLocaleString()}</span>
            </div>
            <div class="result-actions">
                <button class="view-btn" onclick="viewResult(${index})">👁️ Просмотр</button>
                <button class="download-btn" onclick="downloadResult('${result.filename}')">📥 Скачать</button>
                <button class="delete-btn" onclick="deleteResult(${index})">🗑️ Удалить</button>
            </div>
        </div>
    `).join('');
    
    elements.resultsContainer.innerHTML = html;
}

function searchResults() {
    const query = elements.searchInput.value.toLowerCase().trim();
    
    if (!query) {
        renderResults(appState.results);
        return;
    }
    
    const filtered = appState.results.filter(result =>
        result.group_title.toLowerCase().includes(query) ||
        result.filename.toLowerCase().includes(query)
    );
    
    renderResults(filtered);
}

function filterResults(filter) {
    // Update filter buttons
    elements.filterButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    
    let filtered = [...appState.results];
    
    const now = new Date();
    switch (filter) {
        case 'today':
            filtered = filtered.filter(result => {
                const date = new Date(result.parsed_at);
                return date.toDateString() === now.toDateString();
            });
            break;
            
        case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            filtered = filtered.filter(result => new Date(result.parsed_at) >= weekAgo);
            break;
            
        case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            filtered = filtered.filter(result => new Date(result.parsed_at) >= monthAgo);
            break;
    }
    
    renderResults(filtered);
}

// Utility Functions
function isValidGroupLink(link) {
    const patterns = [
        /^@[a-zA-Z0-9_]{5,32}$/,
        /^https:\/\/t\.me\/[a-zA-Z0-9_]{5,32}$/,
        /^https:\/\/t\.me\/joinchat\/[a-zA-Z0-9_-]+$/
    ];
    
    return patterns.some(pattern => pattern.test(link));
}

function generateTaskId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function pasteFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        elements.groupLink.value = text;
        showToast('Текст вставлен из буфера', 'success');
    } catch (error) {
        console.error('Paste error:', error);
        showToast('Не удалось вставить текст', 'error');
    }
}

function updateParseOptions() {
    appState.parseOptions = {
        parseAdmins: elements.parseCheckboxes.admins.checked,
        parseBots: elements.parseCheckboxes.bots.checked,
        parsePremium: elements.parseCheckboxes.premium.checked,
        parseRegular: elements.parseCheckboxes.regular.checked,
        parseNoUsername: elements.parseCheckboxes.noUsername.checked,
        delay: parseFloat(elements.delaySlider.value)
    };
    
    saveState();
}

function updateDelayValue() {
    const value = parseFloat(elements.delaySlider.value);
    elements.delayValue.textContent = `${value} сек`;
    updateParseOptions();
}

function updateSetting() {
    appState.settings = {
        autoSave: elements.autoSave.checked,
        notifications: elements.notifications.checked,
        darkMode: elements.darkMode.checked,
        secureConnection: elements.secureConnection.checked,
        sessionTimeout: parseInt(elements.sessionTimeout.value)
    };
    
    saveState();
    
    // Apply theme if changed
    if (appState.settings.darkMode) {
        enableDarkMode();
    } else {
        disableDarkMode();
    }
}

function toggleTheme() {
    if (appState.settings.darkMode) {
        disableDarkMode();
    } else {
        enableDarkMode();
    }
    appState.settings.darkMode = !appState.settings.darkMode;
    saveState();
    updateSettingsUI();
}

function enableDarkMode() {
    document.documentElement.style.setProperty('--bg-color', '#1a1a1a');
    document.documentElement.style.setProperty('--bg-secondary', '#2d2d2d');
    document.documentElement.style.setProperty('--text-color', '#ffffff');
    document.documentElement.style.setProperty('--text-secondary', '#b0b0b0');
    document.documentElement.style.setProperty('--border-color', '#404040');
}

function disableDarkMode() {
    document.documentElement.style.setProperty('--bg-color', '#ffffff');
    document.documentElement.style.setProperty('--bg-secondary', '#f8f9fa');
    document.documentElement.style.setProperty('--text-color', '#212529');
    document.documentElement.style.setProperty('--text-secondary', '#6c757d');
    document.documentElement.style.setProperty('--border-color', '#dee2e6');
}

async function refreshApp() {
    showLoading();
    await loadInitialData();
    hideLoading();
    showToast('Данные обновлены', 'success');
}

// Modal Functions
function openModal(title, content) {
    elements.modalTitle.textContent = title;
    elements.modalBody.innerHTML = content;
    elements.modal.classList.remove('hidden');
    tg.BackButton.show();
}

function closeModal() {
    elements.modal.classList.add('hidden');
    tg.BackButton.hide();
}

function viewResult(index) {
    const result = appState.results[index];
    
    const content = `
        <div class="result-details">
            <div class="detail-item">
                <strong>Группа:</strong> ${result.group_title}
            </div>
            <div class="detail-item">
                <strong>Дата:</strong> ${new Date(result.parsed_at).toLocaleString()}
            </div>
            <div class="detail-item">
                <strong>Всего участников:</strong> ${result.total_parsed.toLocaleString()}
            </div>
            <div class="detail-item">
                <strong>В группе:</strong> ${result.total_members_count?.toLocaleString() || 'Неизвестно'}
            </div>
            
            <div class="stats-grid">
                <div class="stat-box">
                    <div class="stat-value">${result.categories?.admins || 0}</div>
                    <div class="stat-label">⚡ Админы</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">${result.categories?.bots || 0}</div>
                    <div class="stat-label">🤖 Боты</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">${result.categories?.premium || 0}</div>
                    <div class="stat-label">⭐ Premium</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">${result.categories?.regular || 0}</div>
                    <div class="stat-label">👤 Обычные</div>
                </div>
            </div>
        </div>
    `;
    
    // Store current result index for export/share
    elements.exportModalBtn.dataset.index = index;
    elements.shareModalBtn.dataset.index = index;
    
    openModal('Результат парсинга', content);
}

function exportModalResult() {
    const index = elements.exportModalBtn.dataset.index;
    if (index !== undefined) {
        downloadResult(appState.results[index].filename);
    }
}

async function shareResult() {
    const index = elements.shareModalBtn.dataset.index;
    if (index !== undefined) {
        const result = appState.results[index];
        
        // In real app, this would share via Telegram
        // For now, copy to clipboard
        const shareText = `Результат парсинга ${result.group_title}: ${result.total_parsed} участников`;
        
        try {
            await navigator.clipboard.writeText(shareText);
            showToast('Ссылка скопирована в буфер', 'success');
        } catch (error) {
            showToast('Не удалось скопировать', 'error');
        }
    }
}

function downloadResult(filename) {
    // In real app, download from server
    // For now, create a mock file
    const content = `Результат парсинга ${filename}\nДата: ${new Date().toLocaleString()}\n\nТестовый файл`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Файл скачивается', 'success');
}

function deleteResult(index) {
    if (confirm('Удалить этот результат?')) {
        appState.results.splice(index, 1);
        saveState();
        renderResults(appState.results);
        updateStats();
        showToast('Результат удален', 'success');
    }
}

// Data Management
async function exportAllData() {
    showLoading();
    
    try {
        // Create ZIP with all results
        const zipContent = JSON.stringify(appState, null, 2);
        const blob = new Blob([zipContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `telegram-parser-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('Данные экспортированы', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showToast('Ошибка экспорта', 'error');
    } finally {
        hideLoading();
    }
}

async function exportAllResults() {
    // Similar to exportAllData but only results
    showLoading();
    
    try {
        const resultsData = {
            exported_at: new Date().toISOString(),
            results: appState.results
        };
        
        const blob = new Blob([JSON.stringify(resultsData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `parser-results-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('Все результаты экспортированы', 'success');
    } catch (error) {
        console.error('Export results error:', error);
        showToast('Ошибка экспорта', 'error');
    } finally {
        hideLoading();
    }
}

function clearCache() {
    if (confirm('Очистить весь кэш приложения?')) {
        localStorage.clear();
        appState.results = [];
        saveState();
        renderResults([]);
        updateStats();
        showToast('Кэш очищен', 'success');
    }
}

function clearAllResults() {
    if (confirm('Удалить все результаты?')) {
        appState.results = [];
        saveState();
        renderResults([]);
        updateStats();
        showToast('Все результаты удалены', 'success');
    }
}

function resetSettings() {
    if (confirm('Сбросить все настройки к значениям по умолчанию?')) {
        appState.settings = {
            autoSave: true,
            notifications: true,
            darkMode: false,
            sessionTimeout: 30,
            secureConnection: true
        };
        
        saveState();
        updateSettingsUI();
        showToast('Настройки сброшены', 'success');
    }
}

// Stats Functions
function updateStats() {
    if (appState.results.length === 0) {
        appState.stats = {
            totalParsed: 0,
            totalMembers: 0,
            avgCoverage: 0
        };
    } else {
        const totalParsed = appState.results.length;
        const totalMembers = appState.results.reduce((sum, r) => sum + (r.total_parsed || 0), 0);
        const avgCoverage = appState.results.length > 0 
            ? Math.round(appState.results.reduce((sum, r) => {
                const coverage = r.total_members_count > 0 
                    ? (r.total_parsed / r.total_members_count) * 100 
                    : 0;
                return sum + coverage;
            }, 0) / appState.results.length)
            : 0;
        
        appState.stats = {
            totalParsed,
            totalMembers,
            avgCoverage
        };
    }
    
    elements.totalParsed.textContent = appState.stats.totalParsed;
    elements.totalMembers.textContent = appState.stats.totalMembers.toLocaleString();
    elements.avgCoverage.textContent = `${appState.stats.avgCoverage}%`;
}

// Helper Functions
function showLoading() {
    elements.loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    elements.loadingOverlay.classList.add('hidden');
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${getToastIcon(type)}</span>
        <span class="toast-message">${message}</span>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function getToastIcon(type) {
    switch (type) {
        case 'success': return '✅';
        case 'error': return '❌';
        case 'warning': return '⚠️';
        default: return 'ℹ️';
    }
}

async function loadUserData() {
    // Load user-specific data if available
    const userId = appState.user?.id;
    if (userId) {
        const userKey = `user_${userId}_data`;
        const saved = localStorage.getItem(userKey);
        if (saved) {
            try {
                const userData = JSON.parse(saved);
                appState.results = userData.results || [];
                appState.stats = userData.stats || appState.stats;
            } catch (error) {
                console.error('Error loading user data:', error);
            }
        }
    }
}

async function loadInitialData() {
    await loadUserData();
    await loadResults();
    updateStats();
}

// Mock Data Generation
function generateMockResults() {
    const groups = ['Telegram', 'Python Developers', 'JavaScript News', 'Startup Hub', 'Crypto World'];
    const results = [];
    
    for (let i = 0; i < 5; i++) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000 * 3);
        results.push(generateMockResult(`task_${i}`, `@${groups[i]?.toLowerCase().replace(/\s+/g, '')}`));
    }
    
    return results;
}

function generateMockResult(taskId, groupLink) {
    const groupNames = ['Telegram Official', 'Python Community', 'JS Developers', 'Startup Network', 'Crypto Signals'];
    const randomName = groupNames[Math.floor(Math.random() * groupNames.length)];
    const totalParsed = Math.floor(Math.random() * 5000) + 1000;
    
    return {
        task_id: taskId,
        group_title: randomName,
        group_link: groupLink || `@${randomName.toLowerCase().replace(/\s+/g, '')}`,
        filename: `result_${taskId}.txt`,
        total_parsed: totalParsed,
        total_members_count: Math.floor(totalParsed * (1 + Math.random() * 0.3)),
        parsed_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        categories: {
            owner: 1,
            admins: Math.floor(totalParsed * 0.05),
            bots: Math.floor(totalParsed * 0.03),
            premium: Math.floor(totalParsed * 0.12),
            regular: Math.floor(totalParsed * 0.75),
            no_username: Math.floor(totalParsed * 0.05)
        }
    };
}

// Expose functions to global scope for onclick handlers
window.viewResult = viewResult;
window.downloadResult = downloadResult;
window.deleteResult = deleteResult;

// Initialize when page loads
window.addEventListener('load', initApp);
