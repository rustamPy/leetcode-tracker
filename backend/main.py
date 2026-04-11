import uuid
import json
from pathlib import Path
from typing import Optional

import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

USERNAME = "thisisrustam"
API_BASE = "https://alfa-leetcode-api.onrender.com"
TASKS_FILE = Path(__file__).parent / "data" / "tasks.json"

app = FastAPI(title="LeetCode Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_tasks() -> list:
    if TASKS_FILE.exists():
        return json.loads(TASKS_FILE.read_text())
    return []


def save_tasks(tasks: list) -> None:
    TASKS_FILE.parent.mkdir(parents=True, exist_ok=True)
    TASKS_FILE.write_text(json.dumps(tasks, indent=2))


class TaskIn(BaseModel):
    title: str
    titleSlug: str
    difficulty: Optional[str] = None
    status: str
    tags: Optional[list[str]] = []
    url: Optional[str] = None


class TaskUpdate(BaseModel):
    status: Optional[str] = None


def _fetch(path: str, params: str = "") -> dict:
    try:
        r = requests.get(f"{API_BASE}{path}{params}", timeout=15)
        r.raise_for_status()
        return r.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.get("/api/profile")
def get_profile():
    return _fetch(f"/{USERNAME}/profile")


@app.get("/api/solved")
def get_solved():
    return _fetch(f"/{USERNAME}/solved")


@app.get("/api/submissions")
def get_submissions(limit: int = 100):
    return _fetch(f"/{USERNAME}/acSubmission", f"?limit={limit}")


@app.get("/api/calendar")
def get_calendar():
    return _fetch(f"/{USERNAME}/calendar")


@app.get("/api/problems")
def get_problems(
    difficulty: str = "",
    tags: str = "",
    limit: int = 20,
    skip: int = 0,
):
    params = f"?limit={limit}&skip={skip}"
    if difficulty:
        params += f"&difficulty={difficulty.upper()}"
    if tags:
        params += f"&tags={tags}"
    return _fetch("/problems", params)


@app.get("/api/problem")
def get_problem(titleSlug: str):
    return _fetch("/select", f"?titleSlug={titleSlug}")


@app.get("/api/daily")
def get_daily():
    return _fetch("/daily")


@app.get("/api/tasks")
def get_tasks():
    return load_tasks()


@app.post("/api/tasks", status_code=201)
def create_task(task: TaskIn):
    tasks = load_tasks()
    new_task = task.model_dump()
    new_task["id"] = str(uuid.uuid4())
    tasks.append(new_task)
    save_tasks(tasks)
    return new_task


@app.put("/api/tasks/{task_id}")
def update_task(task_id: str, update: TaskUpdate):
    tasks = load_tasks()
    for task in tasks:
        if task["id"] == task_id:
            if update.status is not None:
                task["status"] = update.status
            save_tasks(tasks)
            return task
    raise HTTPException(status_code=404, detail="Task not found")


@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: str):
    tasks = load_tasks()
    updated = [t for t in tasks if t["id"] != task_id]
    if len(updated) == len(tasks):
        raise HTTPException(status_code=404, detail="Task not found")
    save_tasks(updated)
    return {"ok": True}
