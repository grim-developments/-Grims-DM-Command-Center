@echo off
setlocal
cd /d "%~dp0"
where npm >nul 2>nul
if errorlevel 1 (echo Install Node.js LTS first.& pause& exit /b 1)
call npm install
if errorlevel 1 (echo npm install failed.& pause& exit /b 1)
call npm run build:win
if errorlevel 1 (echo Build failed.& pause& exit /b 1)
echo Installer generated in dist.
explorer "%~dp0dist"
pause
