import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [groupLink, setGroupLink] = useState('');
  const [results, setResults] = useState([]);
  const [currentTask, setCurrentTask] = useState(null);
  const [stats, setStats] = useState(null);

  // Проверка подключения к боту
  useEffect(() => {
    checkConnection();
    loadResults();
  }, []);

  const checkConnection = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/status`);
      const data = await response.json();
      setIsConnected(data.status === 'online');
    } catch (error) {
      console.error('Connection error:', error);
      setIsConnected(false);
    }
  };

  const loadResults = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/results`);
      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Error loading results:', error);
    }
  };

  const startParsing = async () => {
    if (!groupLink.trim()) {
      alert('Введите ссылку на группу');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/parse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ group_link: groupLink }),
      });

      const data = await response.json();
      
      if (data.success) {
        setCurrentTask({
          id: data.task_id,
          group_title: data.group_title,
          status: 'parsing',
          progress: 0
        });
        
        // Начинаем отслеживание прогресса
        pollTaskStatus(data.task_id);
      } else {
        alert(`Ошибка: ${data.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  };

  const pollTaskStatus = async (taskId) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/task/${taskId}`);
        const data = await response.json();
        
        if (data.status === 'completed') {
          clearInterval(interval);
          setCurrentTask(null);
          loadResults(); // Обновляем список результатов
          alert('Парсинг завершен!');
        } else if (data.status === 'error') {
          clearInterval(interval);
          setCurrentTask(null);
          alert(`Ошибка: ${data.error}`);
        } else {
          setCurrentTask(prev => ({
            ...prev,
            status: data.status,
            progress: data.progress || 0
          }));
        }
      } catch (error) {
        console.error('Polling error:', error);
        clearInterval(interval);
      }
    }, 3000);
  };

  const downloadResult = (filename) => {
    window.open(`${process.env.REACT_APP_API_URL}/download/${filename}`, '_blank');
  };

  const deleteResult = async (filename) => {
    if (window.confirm('Удалить этот результат?')) {
      try {
        await fetch(`${process.env.REACT_APP_API_URL}/delete/${filename}`, {
          method: 'DELETE',
        });
        loadResults();
      } catch (error) {
        console.error('Delete error:', error);
      }
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🤖 Telegram Parser Web App</h1>
        <div className={`status ${isConnected ? 'connected' : 'disconnected'}`}>
          Статус: {isConnected ? '✅ Подключен' : '❌ Отключен'}
        </div>
      </header>

      <main className="App-main">
        {/* Секция парсинга */}
        <section className="parsing-section">
          <h2>🚀 Парсинг группы</h2>
          <div className="input-group">
            <input
              type="text"
              placeholder="Введите ссылку на группу (@username или https://t.me/...)"
              value={groupLink}
              onChange={(e) => setGroupLink(e.target.value)}
              disabled={loading}
            />
            <button 
              onClick={startParsing}
              disabled={loading || !isConnected}
            >
              {loading ? '⏳ Парсинг...' : 'Начать парсинг'}
            </button>
          </div>
          
          {currentTask && (
            <div className="task-progress">
              <h3>📊 Текущая задача</h3>
              <p><strong>Группа:</strong> {currentTask.group_title}</p>
              <p><strong>Статус:</strong> {currentTask.status}</p>
              {currentTask.progress > 0 && (
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${currentTask.progress}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </section>

        {/* Секция результатов */}
        <section className="results-section">
          <h2>📁 Мои результаты</h2>
          {results.length === 0 ? (
            <p className="no-results">Нет результатов парсинга</p>
          ) : (
            <div className="results-grid">
              {results.map((result, index) => (
                <div key={index} className="result-card">
                  <h3>{result.group_title}</h3>
                  <div className="result-info">
                    <p>📅 {new Date(result.parsed_at).toLocaleString()}</p>
                    <p>👥 Участников: {result.total_parsed}</p>
                    {result.total_members_count > 0 && (
                      <p>📊 Охват: {((result.total_parsed / result.total_members_count) * 100).toFixed(1)}%</p>
                    )}
                  </div>
                  <div className="result-actions">
                    <button 
                      onClick={() => downloadResult(result.filename)}
                      className="btn-download"
                    >
                      📥 Скачать
                    </button>
                    <button 
                      onClick={() => deleteResult(result.filename)}
                      className="btn-delete"
                    >
                      ❌ Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Статистика */}
        <section className="stats-section">
          <h2>📈 Статистика</h2>
          {stats ? (
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Всего спарсено</h3>
                <p className="stat-number">{stats.total_parsed}</p>
                <p>групп</p>
              </div>
              <div className="stat-card">
                <h3>Участников</h3>
                <p className="stat-number">{stats.total_members}</p>
                <p>всего</p>
              </div>
              <div className="stat-card">
                <h3>Средний охват</h3>
                <p className="stat-number">{stats.avg_coverage}%</p>
                <p>парсинга</p>
              </div>
            </div>
          ) : (
            <p>Статистика загружается...</p>
          )}
        </section>
      </main>

      <footer className="App-footer">
        <p>Telegram Parser Bot &copy; 2024</p>
        <p className="instructions">
          💡 Инструкция: Добавьте бота в группу как администратора для полного доступа к участникам
        </p>
      </footer>
    </div>
  );
}

export default App;
