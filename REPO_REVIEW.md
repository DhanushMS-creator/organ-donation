# Organ Donation Coordination Platform — Repo Review (Jan 2026)

## Summary
This repository contains a full-stack prototype of an **Organ Donation / Transplant Coordination Platform**. It provides a **Python (Flask) REST API backend** backed by a **SQLite database** (default in this workspace) and a **React + Vite** web frontend with pages for login, dashboards, patient registry/registration, organ inventory, alerts, transports, transplants, unmatched organs, and secure messaging.

The overall goal is to help a transplant coordination team:
- Register and manage patients awaiting transplants
- Track organ-related specifications and inventory context
- Coordinate matching/triage workflows
- Plan/track transport workflows ("green corridor" concept appears in docs)
- Communicate securely between teams

## What It Does (Functional Scope)
### 1) Patient & Waitlist Management
- Create/register patients with demographics, blood type, organ required, urgency, and location.
- List and retrieve patient records.

### 2) Organ Information
- Provides organ specifications (e.g., viability windows, storage temperature ranges, preservation solutions).

### 3) Matching / Coordination Workflows
- The documentation describes match-finding and ranking endpoints (multi-criteria scoring using compatibility, proximity, urgency, and survival probability).
- The frontend includes views aligned with these workflows (e.g., Transplants, Unmatched Organs).

### 4) Transport Planning
- Documentation describes planning multiple routes and coordinating “green corridor” style notifications.
- The frontend includes pages for transports.

### 5) Secure Communications
- Backend includes endpoints for secure key registration/lookup and secure message relay.
- Frontend includes a Secure Messages page.

> Note: The repo contains both “documented architecture” and “currently active implementation”. The active Flask server in the backend is explicitly a “rebuilt working server” that focuses on endpoints used by the React UI (health/organs/patients/auth/secure messaging + DB). Some additional endpoints described in docs may exist in other modules or represent planned scope.

## Tech Stack

## Frontend (Web UI)
Located under [frontend-react/](frontend-react/).
- **React** (React 19)
- **React Router** (`react-router-dom`) for routing
- **Vite** for dev server and build
- **Tailwind CSS** + **PostCSS** + **Autoprefixer** for styling pipeline
- **Leaflet** for map visualization

Dev server proxy (so the frontend can call the backend without CORS pain in development):
- Proxies `/api` and `/health` to `http://127.0.0.1:5001` (see [frontend-react/vite.config.js](frontend-react/vite.config.js))

## Backend (REST API)
Located under [backend/](backend/).
- **Python** + **Flask** for HTTP API
- **Flask-CORS** for cross-origin configuration during development
- **SQLAlchemy** for ORM/database access
- Default persistence: **SQLite** database file `organ_donation.db` at repo root (as configured in [backend/app.py](backend/app.py))

Authentication / security primitives used in the active backend:
- **itsdangerous** token serializer
- **Werkzeug** password hashing

Dependencies are expressed in two main ways:
- [backend/requirements-sqlite.txt](backend/requirements-sqlite.txt): minimal requirements for the SQLite-backed server path
- [requirements.txt](requirements.txt): broader set (includes Postgres/PostGIS-related libraries and additional tooling)

## Architecture & Repo Layout (What’s Where)
High-level:
- [backend/app.py](backend/app.py): Flask app entrypoint
- [backend/database/](backend/database/): DB initialization and SQLAlchemy models
- [backend/services/](backend/services/): domain logic modules (matching, routing, notifications, error handling)
- [backend/utils/](backend/utils/): helpers (e.g., exporting)
- [frontend-react/src/pages/](frontend-react/src/pages/): UI pages (Login, Dashboard, Patient Registration/Registry, Inventory, Alerts, Secure Messages, etc.)
- [docs/API.md](docs/API.md): API documentation and examples
- [QUICKSTART.md](QUICKSTART.md): setup/run instructions

## Key API Surfaces (What You Can Call)
Based on the docs and current implementation patterns, the platform centers around:
- Health: `GET /health`
- Organs: `GET /api/organs`, `GET /api/organs/{organ_type}`
- Patients: `POST /api/patients`, `GET /api/patients`, `GET /api/patients/{id}`
- Matching (documented): `POST /api/matches/find`, `GET /api/matches`
- Routing (documented): `POST /api/routes/plan`, `GET /api/routes`
- Notifications (documented): `GET /api/notifications`
- Errors (documented): `GET /api/errors`, `GET /api/errors/summary`
- Secure chat / messaging: secure messaging endpoints (and/or `/api/chat/*` as described in docs)

For canonical request/response examples, see [docs/API.md](docs/API.md).

## How To Run (Local Dev)
### Backend
From repo root:
- Create venv + install deps (recommended via the repo’s setup instructions)
- Start server:

```bash
source venv/bin/activate
python backend/app.py
```

By default the backend runs on `http://127.0.0.1:5001`.

Quick check:
```bash
curl http://127.0.0.1:5001/health
```

### Frontend
From repo root:
```bash
cd frontend-react
npm install
npm run dev
```

Open:
- `http://127.0.0.1:5173/login`

## Notable Design Choices / Observations
- **SQLite-first runtime** in this workspace: the active backend defaults to a local SQLite DB for easy local development.
- **Docs describe a larger “production” posture** (e.g., Postgres/PostGIS), while the runnable path here is geared for easy demo/dev.
- **Seeding demo users**: the backend seeds demo accounts if absent (useful for UI testing).
- **Porting consideration on macOS**: the backend uses port **5001** by default (often safer than 5000 on some macOS setups).

## Suggested Next Improvements (If You Continue This Project)
- Align documentation and implementation so the documented endpoints exactly match the running backend.
- Add CI checks (lint/tests) and a single “dev up” command to start backend + frontend together.
- Harden auth (JWT/session model), add RBAC enforcement, and audit logging for access to PHI.
- Add integration tests for core flows (register patient → find match → plan route → notify).

---

Generated from repository docs and primary entrypoints:
- [INDEX.md](INDEX.md)
- [QUICKSTART.md](QUICKSTART.md)
- [docs/API.md](docs/API.md)
- [backend/app.py](backend/app.py)
- [frontend-react/package.json](frontend-react/package.json)
- [frontend-react/vite.config.js](frontend-react/vite.config.js)
