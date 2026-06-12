@echo off
chcp 65001 >nul 2>&1
setlocal

set "MIMOCODE_HOME=%~dp0.dev-home"

where bun >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] bun not found. Please install Bun.
    pause
    exit /b 1
)

set "WORK_DIR=%~dp0"
if not "%~1"=="" (
    set "WORK_DIR=%~1"
)

:: 启动时把 WORK_DIR 作为 project 参数传入 CLI
bun run --cwd "%~dp0packages\opencode" --conditions=browser src\index.ts "%WORK_DIR%"

endlocal