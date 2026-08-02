@echo off
chcp 65001 >nul
title 寻找小蜘蛛 本地版
echo ============================================
echo   寻找小蜘蛛 本地服务器启动器
echo ============================================
echo.
echo   正在检查 MySQL 服务...
sc query MySQL80 | findstr /i "RUNNING" >nul 2>&1
if errorlevel 1 (
  echo   [警告] MySQL80 服务未运行，请先启动 MySQL 服务！
  echo   net start MySQL80
) else (
  echo   [OK] MySQL 服务运行中
)
echo.
echo   正在启动 Node 服务器 (端口 8899)...
cd /d "%~dp0"
start /b "" node server\server.js > "%TEMP%\spideytracker-server.log" 2>&1
timeout /t 3 /nobreak >nul
echo   服务器已启动 (日志: %TEMP%\spideytracker-server.log)
echo.
echo   正在打开专用浏览器 (spideytracker.net 指向本地)...
set CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist %CHROME% set CHROME="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if not exist %CHROME% set CHROME="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not exist %CHROME% set CHROME="C:\Program Files\Microsoft\Edge\Application\msedge.exe"
set PROFILE=%~dp0spideytracker-chrome-profile
start "" %CHROME% --user-data-dir="%PROFILE%" --new-window --no-proxy-server --host-resolver-rules="MAP spideytracker.net 127.0.0.1" "http://spideytracker.net:8899/"
echo   浏览器已打开 (使用独立配置目录)
echo.
echo   注册验证码会打印在 %TEMP%\spideytracker-server.log 中
echo   关闭本窗口不会停止服务器
pause >nul
