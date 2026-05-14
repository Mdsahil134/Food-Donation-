# FoodBridge HTTP API (outline)

Base URL when using Docker Compose: `http://localhost:18080` (default gateway port; override with `FOODBRIDGE_GATEWAY_PORT`).

Interactive OpenAPI UIs (per service, via gateway):

- `/api/auth/docs`
- `/api/donations/docs`
- `/api/notifications/docs`
- `/api/tracking/docs`

## Auth (`/api/auth`)

| Method | Path | Notes |
|--------|------|--------|
| POST | `/register` | Body: `email`, `password`, `name`, optional `role` |
| POST | `/login` | Returns JWT + user |
| POST | `/logout` | Client-side token discard |
| GET | `/verify-email?token=` | Marks email verified |
| POST | `/forgot-password` | Sends reset email (SMTP or JSON transport) |
| POST | `/reset-password` | Body: `token`, `password` |
| GET | `/me` | Auth required |
| GET | `/users` | Admin |
| PATCH | `/users/:id/role` | Admin |

## Donations (`/api/donations`)

| Method | Path | Notes |
|--------|------|--------|
| POST | `/` | Multipart: food fields + optional `image`; donor/admin |
| GET | `/mine` | Donor history |
| GET | `/nearby` | Query: `lat`, `lng`, optional `radiusKm`, `foodType` |
| GET | `/open` | All open listings |
| GET | `/admin/stats` | Admin analytics |
| GET | `/:id` | Single donation (donor, NGO, admin rules apply) |
| POST | `/:id/accept` | NGO |
| POST | `/:id/complete` | NGO that accepted |
| DELETE | `/:id` | Admin moderation |

## Notifications (`/api/notifications`)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/` | List for current user |
| PATCH | `/:id/read` | Mark read |
| POST | `/internal` | Header `X-Internal-Key` required |

## Tracking (`/api/tracking`)

| Method | Path | Notes |
|--------|------|--------|
| POST | `/sessions` | Internal: create session |
| GET | `/sessions/by-donation/:donationId` | Donor / assigned NGO / admin |
| POST | `/sessions/:id/location` | NGO location ping |
| POST | `/distance` | Haversine helper |

All authenticated routes expect `Authorization: Bearer <jwt>`.
