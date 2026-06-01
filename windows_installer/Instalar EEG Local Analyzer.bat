@echo off
setlocal
cd /d "%~dp0"
powershell.exe -ExecutionPolicy Bypass -NoProfile -File "%~dp0install.ps1"
if errorlevel 1 (
  echo.
  echo No se pudo instalar EEG Local Analyzer.
  pause
  exit /b 1
)
