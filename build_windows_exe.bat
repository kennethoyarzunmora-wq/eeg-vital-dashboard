@echo off
setlocal
cd /d "%~dp0"

python -m pip install --upgrade pip
python -m pip install -r requirements-desktop.txt

pyinstaller ^
  --noconfirm ^
  --clean ^
  --windowed ^
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

echo.
echo Build listo:
echo dist\EEG Local Analyzer\EEG Local Analyzer.exe
pause
