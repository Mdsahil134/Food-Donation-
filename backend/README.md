# Backend overview

Business logic is implemented as **independent Node.js (Express) services**, each with its own PostgreSQL database. There is no single `server.js` monolith: use the service directories at the repository root (`auth-service`, `donation-service`, `notification-service`, `tracking-service`).

Shared concerns (JWT secret, internal API key, CORS) are configured per service via environment variables in `docker/docker-compose.yml`.

For HTTP routing and TLS termination at the edge, see **`nginx/`** (gateway pattern).
