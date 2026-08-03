@echo off
REM Setup script for Puppeteer Chrome installation

echo.
echo ========================================
echo Puppeteer Chrome Installation Setup
echo ========================================
echo.

echo Checking Node.js installation...
node --version
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo Checking npm installation...
npm --version
if errorlevel 1 (
    echo ERROR: npm is not installed!
    echo Please install npm with Node.js
    pause
    exit /b 1
)

echo.
echo ========================================
echo Installing Chromium for Puppeteer...
echo This may take 2-5 minutes
echo ========================================
echo.

call npx puppeteer browsers install chrome

if errorlevel 1 (
    echo.
    echo WARNING: Chromium installation failed
    echo Will fall back to alternative PDF generation
    pause
    exit /b 1
) else (
    echo.
    echo ========================================
    echo SUCCESS: Chromium installed!
    echo ========================================
    echo.
    echo Chromium cache location:
    echo C:\Users\%USERNAME%\.cache\puppeteer
    echo.
    pause
    exit /b 0
)
