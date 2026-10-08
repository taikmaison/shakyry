@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul || (echo Нужен Node.js: https://nodejs.org & pause & exit /b 1)
start "" cmd /c "timeout /t 3 >nul & start http://127.0.0.1:8024/"
node run.js
pause
