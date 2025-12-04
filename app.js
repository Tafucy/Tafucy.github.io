const tg = window.Telegram.WebApp;

tg.expand();
tg.MainButton.setText("Сохранить").show();

let goals = [];

function createGoal() {
    const title = document.getElementById('goal-title').value;
    const desc = document.getElementById('goal-desc').value;
    
    if (!title) {
        alert("Введите название цели");
        return;
    }
    
    tg.sendData(JSON.stringify({
        action: "create_goal",
        title: title,
        description: desc
    }));
    
    document.getElementById('goal-title').value = '';
    document.getElementById('goal-desc').value = '';
    alert("Цель отправлена боту!");
}

function loadGoals() {
    tg.sendData(JSON.stringify({
        action: "get_goals"
    }));
}

tg.onEvent('webAppDataReceived', (event) => {
    const data = JSON.parse(event);
    if (data.goals) {
        const list = document.getElementById('goals-list');
        list.innerHTML = '';
        data.goals.forEach(goal => {
            const li = document.createElement('li');
            li.textContent = `${goal.title} - ${goal.completed ? '✅' : '⏳'}`;
            list.appendChild(li);
        });
    }
});

// Инициализация
tg.ready();
loadGoals();
