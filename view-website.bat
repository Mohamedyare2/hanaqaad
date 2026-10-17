@echo off
echo Starting local server...
python --version >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
    start http://localhost:8000
    python -m http.server 8000
) ELSE (
    echo Python not found, opening index.html directly...
    start index.html
)
