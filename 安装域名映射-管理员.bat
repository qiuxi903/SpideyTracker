@echo off
chcp 65001 >nul
title 安装 spideytracker.net 域名映射
echo ============================================
echo   安装域名映射 (需要管理员权限)
echo ============================================
echo.
echo   将把下面这行加入 hosts 文件:
echo     127.0.0.1 spideytracker.net
echo.
echo   安装后任何浏览器访问 spideytracker.net 都指向本地镜像
echo   请在弹出的 UAC 窗口点击"是"
echo.
pause
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo 尝试提升管理员权限...
  powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)
findstr /C:"127.0.0.1 spideytracker.net" C:\Windows\System32\drivers\etc\hosts >nul 2>&1
if %errorlevel% equ 0 (
  echo   已存在，无需重复添加
) else (
  echo 127.0.0.1 spideytracker.net >> C:\Windows\System32\drivers\etc\hosts
  echo   ✓ 已写入 hosts 文件！
)
echo.
echo   现在可用任何浏览器访问: http://spideytracker.net:8899/
echo.
echo   如需还原: 删除 hosts 中 "127.0.0.1 spideytracker.net" 行
pause
