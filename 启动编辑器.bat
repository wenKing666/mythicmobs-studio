@echo off
setlocal
title MythicMobs Editor
cd /d "%~dp0"

set "ELECTRON=%~dp0node_modules\electron\dist\electron.exe"
set "APPDIR=%~dp0."

if not exist "%ELECTRON%" goto browser

rem quick preflight: electron --version should return 0
"%ELECTRON%" --version >nul 2>&1
if errorlevel 1 goto browser

start "" "%ELECTRON%" "%APPDIR%"
exit /b 0

:browser
echo Electron runtime not found or failed to start.
echo Opening in default browser instead (no file access).
start "" "%~dp0app\index.html"
timeout /t 3 /nobreak >nul
exit /b 0
