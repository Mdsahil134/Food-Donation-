# API Gateway (Nginx)

This project uses **Nginx** as the API gateway and static router:

- `/` → `frontend` (built React app)
- `/api/auth/*` → `auth-service`
- `/api/donations/*` → `donation-service`
- `/uploads/*` → `donation-service` (food images)
- `/api/notifications/*` → `notification-service`
- `/api/tracking/*` → `tracking-service`

Configuration lives in `../nginx/nginx.conf` and is mounted by `docker/docker-compose.yml`.
