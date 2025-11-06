@echo off
REM WhatsApp CRM Database Setup Script for Windows
REM This script sets up the PostgreSQL database and runs migrations

echo ========================================
echo WhatsApp CRM Database Setup
echo ========================================
echo.

REM Check if .env file exists
if not exist .env (
    echo [ERROR] .env file not found
    echo Please copy .env.example to .env and configure your database settings
    echo   copy .env.example .env
    exit /b 1
)

echo [INFO] Checking prerequisites...

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed
    echo Please install Node.js 20+ before continuing
    exit /b 1
)

echo [OK] Node.js is installed
node --version

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm is not installed
    exit /b 1
)

echo [OK] npm is installed
npm --version

echo.
echo [INFO] Installing dependencies...
call npm install

echo.
echo [INFO] Generating Prisma Client...
call npm run prisma:generate

echo.
echo [INFO] Running database migrations...
echo Note: This will create all tables and indexes

call npm run prisma:migrate
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Migration failed
    echo.
    echo Common issues:
    echo   1. Database server is not running
    echo   2. Database credentials are incorrect
    echo   3. Database does not exist
    echo.
    echo To create the database manually:
    echo   psql postgres -c "CREATE DATABASE whatsapp_crm;"
    exit /b 1
)

echo [OK] Migrations completed successfully

echo.
set /p SEED="Do you want to seed the database with sample data? (y/n): "
if /i "%SEED%"=="y" (
    echo [INFO] Seeding database...
    call npm run prisma:seed
    if %ERRORLEVEL% EQU 0 (
        echo [OK] Database seeded successfully
        echo.
        echo Demo login credentials:
        echo   Email: owner@whatsappcrm.com
        echo   Password: password123
    ) else (
        echo [WARNING] Seeding failed or was skipped
    )
) else (
    echo Skipping database seeding
)

echo.
echo ========================================
echo Database setup completed successfully!
echo ========================================
echo.
echo Next steps:
echo   1. Start the development server: npm run dev
echo   2. View database in Prisma Studio: npm run prisma:studio
echo   3. Check API health: curl http://localhost:5000/health
echo.

pause
