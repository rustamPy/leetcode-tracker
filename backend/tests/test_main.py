import json
import uuid
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest
from fastapi.testclient import TestClient

import main


@pytest.fixture(autouse=True)
def tmp_tasks_file(tmp_path, monkeypatch):
    tasks_file = tmp_path / "tasks.json"
    monkeypatch.setattr(main, "TASKS_FILE", tasks_file)
    yield tasks_file


@pytest.fixture()
def client():
    return TestClient(main.app)


def test_get_tasks_empty(client):
    resp = client.get("/api/tasks")
    assert resp.status_code == 200
    assert resp.json() == []


def test_create_task_returns_201(client):
    payload = {
        "title": "Two Sum",
        "titleSlug": "two-sum",
        "difficulty": "Easy",
        "status": "todo",
        "tags": ["array", "hash-table"],
        "url": "https://leetcode.com/problems/two-sum/",
    }
    resp = client.post("/api/tasks", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Two Sum"
    assert data["titleSlug"] == "two-sum"
    assert data["status"] == "todo"
    assert "id" in data
    uuid.UUID(data["id"])


def test_create_task_persists(client):
    payload = {
        "title": "Add Two Numbers",
        "titleSlug": "add-two-numbers",
        "difficulty": "Medium",
        "status": "in-progress",
    }
    client.post("/api/tasks", json=payload)
    resp = client.get("/api/tasks")
    assert resp.status_code == 200
    tasks = resp.json()
    assert len(tasks) == 1
    assert tasks[0]["titleSlug"] == "add-two-numbers"


def test_create_multiple_tasks_have_unique_ids(client):
    for i in range(3):
        client.post(
            "/api/tasks",
            json={"title": f"Task {i}", "titleSlug": f"task-{i}", "status": "todo"},
        )
    tasks = client.get("/api/tasks").json()
    ids = [t["id"] for t in tasks]
    assert len(set(ids)) == 3


def test_update_task_status(client):
    resp = client.post(
        "/api/tasks",
        json={"title": "Problem", "titleSlug": "problem", "status": "todo"},
    )
    task_id = resp.json()["id"]

    update_resp = client.put(f"/api/tasks/{task_id}", json={"status": "completed"})
    assert update_resp.status_code == 200
    assert update_resp.json()["status"] == "completed"


def test_update_task_not_found(client):
    resp = client.put(f"/api/tasks/{uuid.uuid4()}", json={"status": "completed"})
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Task not found"


def test_delete_task(client):
    resp = client.post(
        "/api/tasks",
        json={"title": "Problem", "titleSlug": "problem", "status": "todo"},
    )
    task_id = resp.json()["id"]

    del_resp = client.delete(f"/api/tasks/{task_id}")
    assert del_resp.status_code == 200
    assert del_resp.json() == {"ok": True}

    tasks = client.get("/api/tasks").json()
    assert tasks == []


def test_delete_task_not_found(client):
    resp = client.delete(f"/api/tasks/{uuid.uuid4()}")
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Task not found"


def test_get_profile_proxies_external_api(client):
    mock_response = MagicMock()
    mock_response.json.return_value = {"username": "thisisrustam", "ranking": 1000}
    mock_response.raise_for_status = MagicMock()

    with patch("main.requests.get", return_value=mock_response) as mocked:
        resp = client.get("/api/profile")
    assert resp.status_code == 200
    assert resp.json()["username"] == "thisisrustam"
    mocked.assert_called_once()


def test_get_solved_proxies_external_api(client):
    mock_response = MagicMock()
    mock_response.json.return_value = {"solvedProblem": 42}
    mock_response.raise_for_status = MagicMock()

    with patch("main.requests.get", return_value=mock_response):
        resp = client.get("/api/solved")
    assert resp.status_code == 200
    assert resp.json()["solvedProblem"] == 42


def test_get_daily_proxies_external_api(client):
    mock_response = MagicMock()
    mock_response.json.return_value = {"titleSlug": "two-sum"}
    mock_response.raise_for_status = MagicMock()

    with patch("main.requests.get", return_value=mock_response):
        resp = client.get("/api/daily")
    assert resp.status_code == 200
    assert resp.json()["titleSlug"] == "two-sum"


def test_external_api_failure_returns_502(client):
    import requests as req_lib

    with patch("main.requests.get", side_effect=req_lib.RequestException("timeout")):
        resp = client.get("/api/profile")
    assert resp.status_code == 502


def test_get_problem_by_slug(client):
    mock_response = MagicMock()
    mock_response.json.return_value = {"titleSlug": "two-sum", "title": "Two Sum"}
    mock_response.raise_for_status = MagicMock()

    with patch("main.requests.get", return_value=mock_response):
        resp = client.get("/api/problem", params={"titleSlug": "two-sum"})
    assert resp.status_code == 200
    assert resp.json()["titleSlug"] == "two-sum"


def test_get_problems_with_filters(client):
    mock_response = MagicMock()
    mock_response.json.return_value = {"problems": []}
    mock_response.raise_for_status = MagicMock()

    with patch("main.requests.get", return_value=mock_response) as mocked:
        resp = client.get(
            "/api/problems",
            params={"difficulty": "easy", "tags": "array", "limit": 10, "skip": 5},
        )
    assert resp.status_code == 200
    call_url = mocked.call_args[0][0]
    assert "EASY" in call_url
    assert "array" in call_url
    assert "limit=10" in call_url
    assert "skip=5" in call_url
