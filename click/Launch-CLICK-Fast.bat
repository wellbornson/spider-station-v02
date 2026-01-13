@echo off
title CLICK Management System - Final Stable
color 0b
cd /d "%~dp0"

echo [1/4] Cleaning old sessions...
taskkill /f /im node.exe >nul 2>&1

:: Build check
if not exist ".next" (
    echo [2/4] First time setup: Building CLICK...
    call npm run build
)

echo [3/4] Starting CLICK Engine...
:: Yahan humne '/min' hata kar server ko seedha chalaya hai
:: Taki agar koi error ho to nazar aye
start "CLICK_SERVER" /min npm run start

echo [4/4] Warming up the engine (15 seconds)...
:: Time thora aur barhaya hai taake database connect ho jaye
timeout /t 15 >nul

echo Launching Dashboard...
:: Is baar hum refresh ke sath kholenge
start chrome --app=http://localhost:3000 --start-maximized
exit