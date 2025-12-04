"""
FastAPI сервер для FocusGoal Mini App
"""
from fastapi import FastAPI, Request, Form, Query
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from datetime import datetime, timedelta
import uvicorn

from data.storage import storage

# Создаем FastAPI приложение
app = FastAPI(
    title="FocusGoal Mini App",
    description="Mini App для системы управления целями FocusGoal",
    version="1.0.0"
)

# Настраиваем статические файлы и шаблоны
app.mount("/static", StaticFiles(directory="webapp/static"), name="static")
templates = Jinja2Templates(directory="webapp/templates")

# Главная страница Mini App
@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse(
        "base.html",
        {
            "request": request,
            "title": "FocusGoal Mini App",
            "description": "Система управления целями и привычками"
        }
    )

# Основной интерфейс Mini App
@app.get("/app", response_class=HTMLResponse)
async def mini_app(request: Request, user_id: int = Query(123456789, description="ID пользователя")):
    user = storage.get_user(user_id)
    
    if not user:
        # Если пользователя нет, создаем тестового
        storage.create_user({
            "telegram_id": user_id,
            "username": f"user_{user_id}",
            "first_name": "Тестовый",
            "last_name": "Пользователь"
        })
        user = storage.get_user(user_id)
    
    # Получаем данные пользователя
    goals = storage.get_user_goals(user_id)
    habits = storage.get_user_habits(user_id)
    achievements = storage.get_user_achievements(user_id)
    stats = storage.get_user_stats(user_id)
    
    # Подготавливаем данные для шаблона
    today = datetime.now().strftime("%d.%m.%Y")
    
    # Рассчитываем прогресс уровня
    xp_needed_for_next_level = user["level"] * 100
    level_progress = min((user["xp"] % 100) / 100 * 100, 100) if xp_needed_for_next_level > 0 else 100
    
    context = {
        "request": request,
        "user": user,
        "goals": goals,
        "habits": habits,
        "achievements": achievements[:5],  # Только первые 5
        "stats": stats,
        "today": today,
        "level_progress": level_progress,
        "emojis": {
            "goal": "🎯",
            "habit": "🔄",
            "focus": "🎮",
            "stats": "📊",
            "completed": "✅",
            "active": "⏳",
            "fire": "🔥",
            "trophy": "🏆",
            "star": "⭐"
        }
    }
    
    return templates.TemplateResponse("index.html", context)

# API для получения данных пользователя
@app.get("/api/user/{user_id}")
async def get_user_data(user_id: int):
    user = storage.get_user(user_id)
    if not user:
        return JSONResponse({"error": "User not found"}, status_code=404)
    
    return JSONResponse({
        "success": True,
        "user": user
    })

# API для получения целей
@app.get("/api/goals")
async def get_goals_api(user_id: int = Query(..., description="ID пользователя")):
    goals = storage.get_user_goals(user_id)
    return JSONResponse({
        "success": True,
        "goals": goals,
        "count": len(goals)
    })

# API для создания цели
@app.post("/api/goals")
async def create_goal_api(
    user_id: int = Form(...),
    title: str = Form(...),
    description: str = Form(None),
    priority: str = Form("medium"),
    category: str = Form("general"),
    deadline: str = Form(None)
):
    try:
        goal_data = {
            "title": title,
            "description": description or "",
            "priority": priority,
            "category": category,
            "difficulty": "medium"
        }
        
        if deadline:
            goal_data["deadline"] = deadline
        
        goal_id = storage.create_goal(user_id, goal_data)
        
        # Начисляем XP
        user = storage.get_user(user_id)
        storage.update_user(user_id, {"xp": user["xp"] + 10})
        
        return JSONResponse({
            "success": True,
            "message": "Цель успешно создана! +10 XP",
            "goal_id": goal_id,
            "xp_added": 10
        })
    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)

# API для завершения цели
@app.post("/api/goals/{goal_id}/complete")
async def complete_goal_api(goal_id: int, user_id: int = Form(...)):
    try:
        # Проверяем принадлежность цели
        goal = None
        for g in storage.get_user_goals(user_id):
            if g["id"] == goal_id:
                goal = g
                break
        
        if not goal:
            return JSONResponse({
                "success": False,
                "error": "Goal not found or access denied"
            }, status_code=404)
        
        # Отмечаем как выполненную
        storage.complete_goal(goal_id)
        
        # Начисляем XP в зависимости от приоритета
        xp_rewards = {
            "high": 75,
            "medium": 50,
            "low": 25
        }
        xp_earned = xp_rewards.get(goal["priority"], 50)
        
        user = storage.get_user(user_id)
        storage.update_user(user_id, {"xp": user["xp"] + xp_earned})
        
        return JSONResponse({
            "success": True,
            "message": f"Цель выполнена! +{xp_earned} XP",
            "xp_earned": xp_earned,
            "total_xp": user["xp"] + xp_earned
        })
    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)

# API для получения привычек
@app.get("/api/habits")
async def get_habits_api(user_id: int = Query(..., description="ID пользователя")):
    habits = storage.get_user_habits(user_id)
    return JSONResponse({
        "success": True,
        "habits": habits,
        "count": len(habits)
    })

# API для создания привычки
@app.post("/api/habits")
async def create_habit_api(
    user_id: int = Form(...),
    title: str = Form(...),
    description: str = Form(None),
    frequency: str = Form("daily"),
    reminder_time: str = Form(None)
):
    try:
        habit_data = {
            "title": title,
            "description": description or "",
            "frequency": frequency,
            "reminder_time": reminder_time,
            "category": "general"
        }
        
        habit_id = storage.create_habit(user_id, habit_data)
        
        # Начисляем XP
        user = storage.get_user(user_id)
        storage.update_user(user_id, {"xp": user["xp"] + 5})
        
        return JSONResponse({
            "success": True,
            "message": "Привычка создана! +5 XP",
            "habit_id": habit_id,
            "xp_added": 5
        })
    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)

# API для отметки привычки
@app.post("/api/habits/{habit_id}/track")
async def track_habit_api(habit_id: int, user_id: int = Form(...)):
    try:
        # Проверяем принадлежность привычки
        habit = None
        for h in storage.get_user_habits(user_id):
            if h["id"] == habit_id:
                habit = h
                break
        
        if not habit:
            return JSONResponse({
                "success": False,
                "error": "Habit not found or access denied"
            }, status_code=404)
        
        # Отмечаем выполнение
        storage.track_habit(habit_id)
        
        # Начисляем XP
        user = storage.get_user(user_id)
        xp_earned = 5
        storage.update_user(user_id, {"xp": user["xp"] + xp_earned})
        
        # Получаем обновленные данные привычки
        updated_habit = None
        for h in storage.get_user_habits(user_id):
            if h["id"] == habit_id:
                updated_habit = h
                break
        
        return JSONResponse({
            "success": True,
            "message": "Привычка отмечена! +5 XP",
            "xp_earned": xp_earned,
            "habit": updated_habit
        })
    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)

# API для запуска фокус-сессии
@app.post("/api/focus/start")
async def start_focus_session_api(
    user_id: int = Form(...),
    duration: int = Form(25),
    goal_id: int = Form(None)
):
    try:
        session_id = storage.start_focus_session(user_id, duration)
        
        return JSONResponse({
            "success": True,
            "message": f"Фокус-сессия началась! Длительность: {duration} мин",
            "session_id": session_id,
            "duration": duration
        })
    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)

# API для получения статистики
@app.get("/api/stats")
async def get_stats_api(user_id: int = Query(..., description="ID пользователя")):
    stats = storage.get_user_stats(user_id)
    
    if not stats:
        return JSONResponse({
            "success": False,
            "error": "Stats not found"
        }, status_code=404)
    
    return JSONResponse({
        "success": True,
        "stats": stats
    })

# Страница создания цели
@app.get("/new_goal", response_class=HTMLResponse)
async def new_goal_page(request: Request, user_id: int = Query(123456789)):
    return templates.TemplateResponse(
        "new_goal.html",
        {
            "request": request,
            "user_id": user_id,
            "today": datetime.now().strftime("%Y-%m-%d")
        }
    )

# Страница статистики
@app.get("/stats", response_class=HTMLResponse)
async def stats_page(request: Request, user_id: int = Query(123456789)):
    stats = storage.get_user_stats(user_id)
    user = storage.get_user(user_id)
    
    if not stats:
        stats = {
            "user": {"xp": 0, "level": 1},
            "goals": {"total": 0, "completed": 0, "completion_rate": 0},
            "habits": {"total": 0, "active": 0, "total_streak": 0, "best_streak": 0},
            "focus": {"total_sessions": 0, "total_minutes": 0}
        }
    
    return templates.TemplateResponse(
        "stats.html",
        {
            "request": request,
            "user": user or {},
            "stats": stats,
            "user_id": user_id
        }
    )

# Запуск сервера
if __name__ == "__main__":
    print("🚀 FocusGoal Mini App запускается...")
    print("🌐 Адрес: http://localhost:8000")
    print("📱 Для Telegram: http://localhost:8000/app?user_id=123456789")
    print("⚡ Для остановки нажмите Ctrl+C")
    
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
