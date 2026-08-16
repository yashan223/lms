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

REM 2. Start Docker Database Container
echo [1/5] Starting PostgreSQL with Docker Compose...
call docker compose up -d
if %errorlevel% neq 0 (
    echo [ERROR] Could not start Docker container. Please ensure Docker Desktop is running.
    pause
    exit /b %errorlevel%
)

REM 3. Generate Prisma Client
echo [2/5] Generating Prisma Client...
call npx prisma generate
if %errorlevel% neq 0 (
    echo [ERROR] Prisma generate failed.
    pause
    exit /b %errorlevel%
)

REM 4. Push Database Schema
echo [3/5] Syncing database schema...
call npx prisma db push
if %errorlevel% neq 0 (
    echo [ERROR] Database schema push failed.
    pause
    exit /b %errorlevel%
)

REM 5. Seed Database
echo [4/5] Seeding database with initial data...
call npx tsx prisma/seed.ts
if %errorlevel% neq 0 (
    echo [ERROR] Database seeding failed.
    pause
    exit /b %errorlevel%
)

REM 6. Launch Next.js Dev Server
echo [5/5] Launching Next.js Development Server...
echo ===================================================
echo   LMS Ready! Access at: http://localhost:3000
echo ===================================================
call npm run dev
