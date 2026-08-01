# Contract Reader — የኮንትራት ተንታኝ

AI-powered contract analysis for Ethiopian legal practice. Upload a contract and get a
clause-by-clause risk assessment — referencing the Ethiopian Civil Code (1960), Labour
Proclamation No. 1156/2019, and related laws — with full English **and** Amharic output.

## Features

- **Contract upload & OCR** — PDF, DOCX (mammoth), and scanned images (tesseract.js OCR)
- **AI clause analysis** — every clause scored (favorable / neutral / unfavorable / risky),
  with severity, explanation, and negotiation suggestions via Groq
- **Bilingual output** — English + Amharic summaries, findings, and recommendations
- **Accounts** — signup with instant auto-login (no email verification), JWT sessions,
  password reset via email, and optional TOTP 2FA for the super admin
- **Admin dashboard** (super admin only) — user management, request logs, security logs,
  system health, role transfer, and 2FA

## Tech stack

| Layer    | Stack |
| -------- | ----- |
| Backend  | NestJS 11, Prisma, PostgreSQL, JWT (`@nestjs/jwt`), bcrypt, otplib (2FA), Groq SDK, Multer, pdf-parse, mammoth, tesseract.js |
| Frontend | React 19, Vite 6, Tailwind CSS, React Router 7, axios |
| Hosting  | Vercel (single serverless function) or Docker |

## Project structure

```
api/main.ts              Vercel serverless entry point (bootstraps Nest, exports handler)
src/                     NestJS backend (auth, contracts, analysis, ai, admin, email, users)
frontend/                React + Vite frontend (served by the backend in production)
prisma/                  Prisma schema + SQL migrations
vercel.json              Vercel deployment configuration
docker-compose.yml       Local Postgres + API containers
```

## Local development

### 1. Prerequisites

- Node.js 22+
- PostgreSQL 16 (or use the included `docker compose`)

### 2. Install dependencies

```bash
npm install
npm --prefix frontend ci   # reproducible install — the frontend lockfile is committed
```

### 3. Configure environment

Create a `.env` in the project root:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/job_tracker?schema=public
JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES_IN=7d
GROQ_API_KEY=your-groq-api-key
# Optional:
# GROQ_MODEL=llama-3.3-70b-versatile
# MAILERSEND_API_KEY=...
# MAILERSEND_FROM_EMAIL=no-reply@yourdomain.com
# MAILERSEND_FROM_NAME=Contract Reader
# FRONTEND_URL=http://localhost:5173
# PORT=3000
```

### 4. Start PostgreSQL (optional)

```bash
docker compose up -d db
```

### 5. Prepare the database

```bash
npx prisma generate
npx prisma migrate deploy
```

### 6. Run the app

```bash
# Terminal 1 — backend (http://localhost:3000)
npm run start:dev

# Terminal 2 — frontend dev server (http://localhost:5173, proxies /api → :3000)
npm --prefix frontend run dev
```

Open http://localhost:5173.

### Environment variables

| Variable | Description | Default |
| -------- | ----------- | ------- |
| `DATABASE_URL` | PostgreSQL connection string | — (required) |
| `JWT_SECRET` | JWT signing secret | — (required) |
| `JWT_EXPIRES_IN` | Session token lifetime | `7d` |
| `GROQ_API_KEY` | Groq API key (needed for AI analysis) | — |
| `GROQ_MODEL` | Groq model name | `llama-3.3-70b-versatile` |
| `MAILERSEND_API_KEY` | Mailersend key (password-reset emails) | — |
| `MAILERSEND_FROM_EMAIL` / `MAILERSEND_FROM_NAME` | Sender identity for emails | `no-reply@yourdomain.com` / `Contract Reader` |
| `FRONTEND_URL` | Base URL used in email links | `http://localhost:5173` |
| `PORT` | API port | `3000` |
| `REQUEST_LOG_RETENTION_DAYS` | Request-log cleanup retention | `30` |
| `REQUEST_LOG_CLEANUP_INTERVAL_HOURS` | Request-log cleanup interval | `24` |

## Testing & quality

```bash
npm run lint              # ESLint (backend + api/)
npm run format:check      # Prettier
npm test                  # Backend unit tests
npm run test:e2e          # Backend e2e tests (needs Postgres + .env)
npm --prefix frontend test  # Frontend unit tests
```

CI runs all of the above on every push/PR (see `.github/workflows/ci.yml`).

## Deployment

### Vercel (current setup)

The app deploys to Vercel as a **single serverless function** that serves both the
`/api/*` endpoints and the React frontend.

- **Function entry point: `api/main.ts`** — bootstraps the NestJS app with the same
  configuration as `src/main.ts` (validation pipe, exception filter, global `api`
  prefix), but calls `app.init()` instead of `listen()` and caches the app across warm
  invocations. The exported default `handler(req, res)` routes every request through
  the underlying Express instance, preserving the original URL path.
- **`src/main.ts`** remains the entry point for local dev and Docker (`app.listen()`).
- **`vercel.json`**:
  - `buildCommand: "npm run build"` — runs `prisma generate`, `nest build`, and the
    frontend build.
  - `functions: { "api/main.ts": { "maxDuration": 60, "includeFiles": "frontend/dist/**" } }`
    — bundles the built React app with the function (the Nest `ServeStaticModule` serves
    it from `frontend/dist`).
  - `rewrites: [ { "source": "/(.*)", "destination": "/api/main" } ]` — sends all
    traffic (API + SPA routes) to the function with the original path preserved.

**Deploy steps:**

1. Push to the connected Git repository (or `vercel deploy`).
2. In the Vercel project dashboard, add the environment variables listed above
   (`DATABASE_URL`, `JWT_SECRET`, `GROQ_API_KEY`, `GROQ_MODEL`, `FRONTEND_URL`).
3. After the build, verify `/` (SPA) and `/api/auth/login` (API) both respond.

> On Vercel, contract uploads automatically use in-memory storage with `/tmp` writes
> (`process.env.VERCEL`), since the filesystem is ephemeral. Uploads are not persisted
> across invocations.

### Docker (alternative)

First create a `.env` file with at least `DATABASE_URL` and `JWT_SECRET` (and
`GROQ_API_KEY` for AI analysis) — the compose file refuses to start without
`JWT_SECRET`:

```bash
docker compose up --build
```

The container runs `prisma migrate deploy` then `npm run start:prod` on port 3000.

## Super admin — where is it?

The **first account ever registered** automatically becomes the **super admin**
(`isSuperAdmin` + `isAdmin`). That account owns the admin dashboard.

- **How to find yours:** if the database is fresh, simply sign up the first account —
  that's it. If the database already has users, the super admin is whoever registered
  first (not a new signup).
- **How to access:** sign in with that account. A 🛡️ **Admin** link appears in the
  navbar, or go directly to `/admin`.
- **Safety net:** if no super admin exists (e.g. the account was deleted in the DB),
  the backend automatically promotes the first registered non-deleted user on the next
  admin request, so the dashboard can never be locked out.
- **Transfer:** from the Admin Dashboard → **Users** tab, use the 👑 **Transfer** button
  to hand the role to another user. The current super admin is demoted to a regular admin.
- **2FA:** protect the super admin account with TOTP from the **Super Admin** card in
  the dashboard.
- Only the super admin can open `/admin`; other users with the `isAdmin` role cannot
  access the dashboard.
