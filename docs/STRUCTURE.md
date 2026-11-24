# Project structure

FoodBridge is organized by responsibility so a new contributor can find code quickly:

| Folder | Purpose |
|--------|---------|
| `services/` | Independently deployable Node.js backend services |
| `apps/` | User-facing applications |
| `infra/` | Runtime infrastructure configuration shared by the stack |
| `deploy/` | Local and cluster deployment definitions |
| `docs/` | Architecture, API, deployment, and onboarding documentation |
| `.github/` | GitHub Actions workflows |

## Backend services

Each folder under `services/` is a standalone Node.js application with its own:

- `package.json` and lockfile
- `Dockerfile`
- `src/` implementation
- Jest configuration and tests

The services communicate through the internal Docker network. Nginx exposes their public routes through the gateway configuration in `infra/gateway/nginx.conf`.

## Frontend

The React/Vite application lives in `apps/frontend`. Its production image is built by `apps/frontend/Dockerfile` and served by Nginx.

## Deployment

- Use `deploy/docker/docker-compose.yml` for local development and demos.
- Use `deploy/kubernetes/` as a starting point for Kubernetes deployments.
- Use `deploy/jenkins/` for the optional self-hosted CI server.

Run Docker Compose from `deploy/docker`, because the Compose file uses paths relative to that directory:

```powershell
cd deploy/docker
docker compose up --build
```
