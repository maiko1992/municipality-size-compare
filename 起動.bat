@echo off
cd /d %~dp0
start "" powershell -ExecutionPolicy Bypass -File scripts\serve.ps1
timeout /t 2 /nobreak >nul
start "" http://localhost:8000/index.html
