# Lexy – Contract Generation Platform

Lexy is a full-stack contract generation platform built with:
- **NestJS** backend (contracts, chat, authentication, Stripe-ready)
- **React** frontend (modern dark UI, contract workspace)
- **Python mlend** service (Anthropic-powered contract reasoning + drafting)
- **PostgreSQL** database with contract catalog + templates

The system lets a user:
1. Sign up and create a draft
2. Answer 8–25 clarifying questions via hybrid chat + form
3. Generate a full contract (plain text → later PDF/DOCX)
4. Regenerate or refine drafts

---

## Project Structure

- **backend/** → NestJS REST API, contract engine, DB migrations, seeding  
- **frontend/** → React UI (contracts dashboard, editor, chat flow)  
- **mlend/** → FastAPI orchestrator using Anthropic (Sonnet 4.1)  

Each layer runs independently but works together through HTTP.

---

# 1. Backend (NestJS)

### Install + setup

nvm use  
npm install

### Database migrations

npm run migration:generate -- src/migrations/init  
npm run migration:run

### Seed contract catalog

npm run seed:contracts

### Start backend API

npm run start:dev

Backend defaults:
- Runs on: **http://localhost:8000**
- Environment: Uses `.env` (DB connection, JWT secret, MLEND_URL)

---

# 2. Frontend (React)

### Install dependencies

npm install

### Start dev server

npm run dev

Frontend defaults:
- Runs on: **http://localhost:5173**
- Talks to backend via VITE_API_URL

---

# 3. MLEND (Python – Anthropic Orchestration)

### Activate environment

conda activate <env>

### Install requirements

pip3 install -r requirements.txt

### Start the ML service

uvicorn main:app --reload --port 5000

MLEND defaults:
- Runs on: **http://localhost:5000**
- Exposes:
  - `/contract/chat`
  - `/contract/generate`
  - `/health`

---

## Recommended Dev Order (Wiring Tip)

1. Start **Postgres**  
2. Start **MLEND** (Python)  
3. Start **backend** (NestJS) – connects to DB + MLEND  
4. Start **frontend** – connects to backend  

This keeps logs readable and helps isolate issues.

---

## Environment Variables Mentioned in .env.example files

Backend needs:
backend/.env

MLEND needs:
mlend/.env

Frontend needs:
frontend/.env

---

## Health Checks

Backend:  
http://localhost:8000/api/health

MLEND:  
http://localhost:5000/health

---

## Notes

- Contract catalog seeds ~170+ contract types + templates  
- Chat is powered by structured context injection  
- Generation uses full context + combined form/chat answers  
- Safe defaults: plain text output, no markdown  
- Ready for PDF/DOCX export pipeline later

---

# Lexy is now ready to run locally end-to-end 🎉

