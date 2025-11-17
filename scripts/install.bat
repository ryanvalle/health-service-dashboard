@echo off
REM Installation script for Health Check Dashboard
REM This script sets up all dependencies for the desktop application

echo.
echo Health Check Dashboard - Installation Script
echo ================================================
echo.

REM Check Node.js
echo Checking Node.js version...
node -v
echo.

REM Install root dependencies (Electron)
echo Installing Electron dependencies...
call npm install
if errorlevel 1 (
    echo Failed to install Electron dependencies
    exit /b 1
)
echo Electron dependencies installed
echo.

REM Install frontend dependencies
echo Installing frontend dependencies...
cd frontend
call npm install
if errorlevel 1 (
    echo Failed to install frontend dependencies
    exit /b 1
)
cd ..
echo Frontend dependencies installed
echo.

REM Install backend dependencies
echo Installing backend dependencies...
cd backend
call npm install
if errorlevel 1 (
    echo Failed to install backend dependencies
    exit /b 1
)
cd ..
echo Backend dependencies installed
echo.

REM Build frontend
echo Building frontend...
cd frontend
call npm run build
if errorlevel 1 (
    echo Failed to build frontend
    exit /b 1
)
cd ..
echo Frontend built successfully
echo.

REM Initialize database
echo Initializing database...
cd backend
call npm run migrate
if errorlevel 1 (
    echo Failed to initialize database
    exit /b 1
)
cd ..
echo Database initialized
echo.

echo ================================================
echo Installation complete!
echo.
echo To start the desktop app, run:
echo   npm start
echo.
echo Or run as a web app:
echo   cd backend
echo   npm start
echo ================================================
