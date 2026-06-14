@echo off
chcp 65001 >nul 2>&1
setlocal

set "MIMOCODE_HOME=%~dp0.dev-home"

set "WORK_DIR=%~dp0"
if not "%~1"=="" set "WORK_DIR=%~1"
if "%WORK_DIR:~-1%"=="\" set "WORK_DIR=%WORK_DIR:~0,-1%"

bun run --cwd "%~dp0packages\opencode" --conditions=browser src\index.ts "%WORK_DIR%"

endlocal