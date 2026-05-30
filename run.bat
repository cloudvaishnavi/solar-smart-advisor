@echo off
echo Starting SolarSmart Advisor...

:: Copy .env if it does not exist
if not exist backend\.env (
    echo Copying .env.example to backend\.env...
    copy .env.example backend\.env
)

:: Start Backend in a new window
echo Launching Backend...
start "SolarSmart Advisor Backend" cmd /k "cd backend && python -m venv venv && call venv\Scripts\activate.bat && pip install -r requirements.txt && python run.py"

:: Start Frontend in a new window
echo Launching Frontend...
start "SolarSmart Advisor Frontend" cmd /k "cd frontend && npm install && npm run dev"

echo Done. Both backend and frontend have been launched in separate terminal windows.
