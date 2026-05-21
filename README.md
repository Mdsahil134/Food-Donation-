# FoodBridge — Food Waste Donation Platform

FoodBridge is a **production-style demo** of a food rescue network: donors list surplus meals, NGOs accept nearby pickups, and everyone gets **notifications**, **expiry automation**, and **pickup tracking**. The codebase is split into **containerized microservices** behind **Nginx**, with **PostgreSQL**, **Prometheus + Grafana**, **Elasticsearch + Logstash + Kibana**, **GitHub Actions CI**, optional **Jenkins** (self-hosted), and **Kubernetes** manifests.

## Architecture (summary)

| Service | Port (internal) | Responsibility |
|--------|-----------------|----------------|
| **auth-service** | 4001 | JWT auth, RBAC, email flows (register, verify, reset) |
| **donation-service** | 4002 | Donations CRUD, images, expiry job, admin stats |
| **notification-service** | 4003 | In-app notifications + optional SMTP email |
| **tracking-service** | 4004 | Pickup sessions, route points, distance API |
| **frontend** | 80 | React (Vite) + Tailwind static assets |
| **nginx** | 80 (mapped **18080** on host by default) | Reverse proxy / API gateway |

Public entry: **http://localhost:18080** after `docker compose up` (set `FOODBRIDGE_GATEWAY_PORT` if you need another host port).

## Quick start (Docker Compose)

From the `docker` directory:

```powershell
cd docker
docker compose up --build
```

Wait for Postgres healthchecks, then open **http://localhost:18080**.

### Default URLs

| Tool | URL |
|------|-----|
| App (via gateway) | http://localhost:18080 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3001 (admin / admin) |
| Kibana | http://localhost:5601 |
| Logstash GELF | UDP `localhost:12201` |

### First admin user (demo)

Compose sets `ALLOW_PUBLIC_ADMIN=true` on **auth-service** so you can register with role **admin** from the API or by temporarily exposing that flag. For normal demos, register as **donor** or **NGO** from the UI. To promote a user without the flag, update `role` in the `users` table in `foodbridge_auth`.

### Environment & secrets

- Shared **JWT** signing key must match on all services (`JWT_SECRET` in compose).
- **INTERNAL_API_KEY** secures service-to-service calls (notifications internal endpoint, tracking session creation).
- Replace demo passwords before any real deployment.

### Dev frontend (without Docker)

```powershell
cd frontend
npm install
npm run dev
```

Vite proxies `/api` and `/uploads` to `http://localhost:18080` — run the gateway stack or individual services as needed.

## Repository layout

```
auth-service/ donation-service/ notification-service/ tracking-service/
frontend/ nginx/ docker/ jenkins/ monitoring/ logging/ docs/ kubernetes/ backend/
```

- **`docker/docker-compose.yml`** — full stack (DB, microservices, Nginx, observability, ELK).
- **`docs/`** — architecture diagram, API outline, deployment notes.
- **`kubernetes/`** — sample manifests for clusters.
- **`backend/`** — overview pointer (implementation lives in `*-service` folders).

## CI/CD

| Tool | Location | What it runs |
|------|----------|----------------|
| **GitHub Actions** | `.github/workflows/ci.yml` | Tests, Docker image builds (push off by default) |
| **Jenkins** | `jenkins/` + root `Jenkinsfile` | Same pipeline locally; see [jenkins/README.md](jenkins/README.md) |

Quick start Jenkins:

```powershell
cd jenkins
docker compose up --build -d
```

Then open **http://localhost:8080** and create a **Pipeline** job from SCM with script path `Jenkinsfile`.

## Security notes

This repo is a **template / teaching stack**. Harden for production: disable `ALLOW_PUBLIC_ADMIN`, enable TLS on Nginx, rotate secrets, enable Elasticsearch security, add real SMTP, rate-limit at the edge, and run dependency scanning in CI.

## License

MIT (adjust as needed for your course or organization).

New Features