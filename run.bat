@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo   EduPulse LMS - Automated Setup and Launch
echo ===================================================

REM 1. Check or create .env
if not exist .env (
    if exist .env.example (
        echo [*] Creating .env from .env.example...
        copy .env.example .env >nul
    ) else (
        echo [!] Warning: .env file not found.
    )
)

REM 2. Generate Prisma Client
echo [1/4] Generating Prisma Client...
call npx prisma generate
if %errorlevel% neq 0 (
    echo [ERROR] Prisma generate failed.
    pause
    exit /b %errorlevel%
)

REM 3. Push Database Schema
echo [2/4] Syncing database schema...
call npx prisma db push
if %errorlevel% neq 0 (
    echo [ERROR] Database schema push failed.
    pause
    exit /b %errorlevel%
)

REM 4. Seed Database
echo [3/4] Seeding database with initial data...
call npx tsx prisma/seed.ts
if %errorlevel% neq 0 (
    echo [ERROR] Database seeding failed.
    pause
    exit /b %errorlevel%
)

REM 5. Launch Next.js Dev Server
echo [4/4] Launching Next.js Development Server...
echo ===================================================
echo   LMS Ready! Access at: http://localhost:3000
echo ===================================================
call npm run dev
