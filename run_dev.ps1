# TCGHub Runner - Windows PowerShell

Write-Host "Iniciando TCGHub Microservices..." -ForegroundColor Blue

# Start Backend API
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; python -m venv venv; .\venv\Scripts\Activate; pip install -r requirements.txt; python -m uvicorn main:app --reload --port 8000" -WindowStyle Normal

# Start AI Service
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd ai_service; python -m venv venv; .\venv\Scripts\Activate; pip install -r requirements.txt; python -m uvicorn main:app --reload --port 8001" -WindowStyle Normal

# Start Frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev" -WindowStyle Normal

Write-Host "Serviços iniciados:" -ForegroundColor Green
Write-Host "API Core: http://localhost:8000"
Write-Host "AI Service: http://localhost:8001"
Write-Host "Frontend: http://localhost:3000"
