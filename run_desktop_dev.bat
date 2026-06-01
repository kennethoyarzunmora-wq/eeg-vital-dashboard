@echo off
setlocal
cd /d "%~dp0"
python -m pip install -r requirements-desktop.txt
python desktop_app.py
