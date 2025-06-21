# CalHacks 2025 Backend

This is the backend API built with **FastAPI** for the CalHacks 2025 project.  
It provides REST endpoints to support the frontend application.

---

## Features

- FastAPI-powered backend
- CORS support (for frontend-backend communication)
- Health check endpoint
- POST endpoint for item creation (example)
- Auto-reloading during development

---

## Project Structure

```
CalHacks2025/
├── backend/
│   ├── main.py               # FastAPI app
│   ├── venv/                 # Virtual environment (not tracked)
│   ├── __pycache__/          # Python cache files
├── .gitignore
├── README.md
└── requirements.txt
```

---

## 🛠️ Setup Instructions

### 1. Clone the repository


### 2. Create a virtual environment

####  On Windows:
```
cd CalHacks2025/backend
python -m venv venv
venv\Scripts\activate
```

####  On macOS/Linux:
```
cd CalHacks2025/backend
python3 -m venv venv
source venv/bin/activate
```

### 3. Install dependencies
```
pip install -r ../requirements.txt
```

### 4. Run the server (with auto-reload)
```
uvicorn main:app --reload
```

> The API will be available at [http://localhost:8000](http://localhost:8000)

---

## Available Endpoints

| Method | Endpoint         | Description               |
|--------|------------------|---------------------------|
| GET    | `/`              |                           |
| POST   | `/`              |                           |

---

## Notes

- The `venv/` folder is excluded via `.gitignore` — each dev should create their own.
- Be sure to update `requirements.txt` after adding new packages:  
  ```
  pip freeze > requirements.txt
  ```

---

## Contributors

- Brian Contreras
- Santiago Del Rio Obando
- Kenia Sanchez
- Ozzy Valdiviezo