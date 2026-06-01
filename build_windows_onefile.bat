@echo off
setlocal
cd /d "%~dp0"

python -m pip install --upgrade pip
python -m pip install -r requirements-desktop.txt

python -m PyInstaller ^
  --noconfirm ^
  --clean ^
  --windowed ^
  --onefile ^
  --name "EEG Local Analyzer" ^
  --add-data "index.html;." ^
  --add-data "styles.css;." ^
  --add-data "app.js;." ^
  --add-data "vendor;vendor" ^
  --add-data "vital_to_json.py;." ^
  --hidden-import vitaldb ^
  --hidden-import webview ^
  --hidden-import scipy.signal ^
  --hidden-import pandas ^
  desktop_app.py

if errorlevel 1 (
  echo.
  echo ERROR: No se pudo construir el ejecutable unico.
  pause
  exit /b 1
)

if not exist installer mkdir installer
copy /Y "dist\EEG Local Analyzer.exe" "installer\EEG_Local_Analyzer_Standalone.exe"

echo.
echo Ejecutable unico listo:
echo installer\EEG_Local_Analyzer_Standalone.exe
pause
