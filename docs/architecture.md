# FoodBridge architecture

## Logical view

```mermaid
flowchart LR
  subgraph clients [Clients]
    B[Browser]
  end
  subgraph edge [Edge]
    N[Nginx gateway]
  end
  subgraph services [Microservices]
    A[auth-service]
    D[donation-service]
    O[notification-service]
    T[tracking-service]
  end
  subgraph data [Data]
    P[(PostgreSQL)]
  end
  subgraph obs [Observability]
    Pr[Prometheus]
    G[Grafana]
    E[Elasticsearch]
    L[Logstash]
    K[Kibana]
  end
  B --> N
  N --> A
  N --> D
  N --> O
  N --> T
  A --> P
  D --> P
  O --> P
  T --> P
  D --> O
  D --> T
  Pr --> A
  Pr --> D
  Pr --> O
  Pr --> T
  G --> Pr
  L --> E
  K --> E
```

## Service boundaries

- **Authentication** owns users, password hashes, JWT issuance, and admin user listing.
- **Donations** owns listings, pickup lifecycle (`open` → `accepted` → `completed` / `expired`), and file storage for photos.
- **Notifications** owns per-user notification rows; internal HTTP is used from donation flows.
- **Tracking** owns pickup sessions and geo points; internal HTTP creates a session when an NGO accepts a donation.

## Networking (Docker)

All containers attach to the **bridge** network `foodbridge`. Services resolve each other by **DNS name** (Compose service names). Only **Nginx** and observability UIs expose host ports by default.
