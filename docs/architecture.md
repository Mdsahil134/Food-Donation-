# FoodBridge Architecture

## 1. Logical View

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

## 2. Infrastructure & DevOps Automation Layer

```mermaid
flowchart TD
  subgraph IaC [Unit IV: Infrastructure as Code]
    TF[Terraform: infra/terraform/]
  end

  subgraph Cloud [AWS Cloud Environment]
    SG[Security Group: Port 22 /32, 80/443, 18080]
    EC2[AWS EC2: Ubuntu 22.04 LTS]
  end

  subgraph Config [Unit V & VI: Configuration Management]
    GEN[generate-ansible-inventory.py]
    ANS[Ansible: deploy/ansible/playbooks/site.yml]
  end

  subgraph App [Runtime Application Stack]
    DC[Docker Compose]
    STACK[Microservices + PostgreSQL + Monitoring]
  end

  TF -->|Provisions / Imports| SG
  TF -->|Provisions / Imports| EC2
  TF -->|Outputs JSON| GEN
  GEN -->|Generates hosts.ini| ANS
  ANS -->|Configures Docker & OS over SSH| EC2
  ANS -->|Deploys and verifies| DC
  DC --> STACK
```

## 3. Service Boundaries

- **Authentication (`auth-service`)**: Owns users, password hashes (bcrypt), JWT issuance, and admin user listing.
- **Donations (`donation-service`)**: Owns listings, pickup lifecycle (`open` → `accepted` → `completed` / `expired`), and file storage for photos.
- **Notifications (`notification-service`)**: Owns per-user notification rows; internal HTTP is used from donation flows.
- **Tracking (`tracking-service`)**: Owns pickup sessions and geo points; internal HTTP creates a session when an NGO accepts a donation.

## 4. Networking (Docker)

All containers attach to the **bridge** network `foodbridge`. Services resolve each other by **DNS name** (Compose service names). Only **Nginx** and observability UIs expose host ports by default.

## 5. Security Perimeter

- Internal microservice ports (`4001`, `4002`, `4003`, `4004`), PostgreSQL (`5432`), and Elasticsearch (`9200`) are **not** exposed to the host or internet.
- Public traffic routes exclusively through the **Nginx reverse proxy gateway** on port `18080` (or `80`/`443`).
- SSH administration on port `22` and monitoring dashboards on ports `3001`/`9090` are restricted strictly to trusted administrator IPs (`/32`).
