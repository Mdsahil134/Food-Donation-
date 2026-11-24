# FoodBridge — Food Waste Donation Platform

FoodBridge is a **production-style demo** of a food rescue network: donors list surplus meals, NGOs accept nearby pickups, and everyone gets **notifications**, **expiry automation**, and **pickup tracking**. The codebase is split into **containerized microservices** behind **Nginx**, with **PostgreSQL**, **Prometheus + Grafana**, **Elasticsearch + Logstash + Kibana**, **Terraform (IaC)**, **Ansible (Configuration & Deployment)**, **GitHub Actions CI/CD**, optional **Jenkins** (self-hosted), and **Kubernetes** manifests.

---

## 1. Architecture & Service Summary

| Service | Port (internal) | Responsibility |
|---|---|---|
| **auth-service** | 4001 | JWT auth, RBAC, email flows (register, verify, reset) |
| **donation-service** | 4002 | Donations CRUD, images, expiry job, admin stats |
| **notification-service** | 4003 | In-app notifications + optional SMTP email |
| **tracking-service** | 4004 | Pickup sessions, route points, distance API |
| **frontend** | 80 | React (Vite) + Tailwind static assets |
| **nginx** | 80 (mapped **18080** on host by default) | Reverse proxy / API gateway |
| **postgres** | 5432 | Relational storage (4 logical databases) |
| **prometheus** | 9090 | Metrics collection and scraping |
| **grafana** | 3001 | Monitoring dashboards |
| **elasticsearch** | 9200 | Log indexing and analytics |
| **kibana** | 5601 | Log visualization |

Public entry point: **http://localhost:18080** after starting containers.

---

## 2. Infrastructure as Code & Automated Deployment

FoodBridge includes an enterprise-grade automated deployment workflow combining **Terraform** and **Ansible**:

```text
Terraform (AWS EC2 & Security Groups)
               │
               ▼ (Outputs: Public IP & Metadata)
Dynamic Inventory Generator (scripts/generate-ansible-inventory.py)
               │
               ▼ (Generates deploy/ansible/inventory/hosts.ini)
Ansible Master Playbook (deploy/ansible/playbooks/site.yml)
               │
               ▼ (Configures OS, Swap, UFW, Docker Engine, and runs Docker Compose)
Running FoodBridge Microservices Platform
```

### Quick Commands for Cloud Deployment:

1. **Provision Infrastructure with Terraform**:
   ```bash
   cd infra/terraform
   cp terraform.tfvars.example terraform.tfvars
   # Configure key_name and allowed_ssh_cidr in terraform.tfvars
   terraform init
   terraform plan
   terraform apply
   ```

2. **Generate Ansible Inventory**:
   ```bash
   python scripts/generate-ansible-inventory.py
   ```

3. **Deploy the Entire Stack with Ansible**:
   ```bash
   cd deploy/ansible
   ansible-playbook playbooks/site.yml
   ```

* Complete Terraform Guide: [docs/TERRAFORM_GUIDE.md](docs/TERRAFORM_GUIDE.md)
* Complete Ansible Guide: [docs/ANSIBLE_GUIDE.md](docs/ANSIBLE_GUIDE.md)
* End-to-End DevOps Architecture: [docs/DEVOPS_ARCHITECTURE.md](docs/DEVOPS_ARCHITECTURE.md)

---

## 3. Local Development (Docker Compose)

From the `deploy/docker` directory:

```powershell
cd deploy/docker
docker compose up --build -d
```

Wait for Postgres healthchecks, then open **http://localhost:18080**.

### Default URLs

| Tool | URL | Credentials |
|---|---|---|
| App (via gateway) | http://localhost:18080 | N/A |
| Prometheus | http://localhost:9090 | N/A |
| Grafana | http://localhost:3001 | admin / admin |
| Kibana | http://localhost:5601 | N/A |
| Logstash GELF | UDP `localhost:12201` | N/A |

---

## 4. Repository Layout

```text
Food_donation/
├── .github/
│   └── workflows/
│       ├── ci.yml                 GitHub Actions CI: Tests & Docker build check
│       └── deploy.yml             GitHub Actions CD: Automated deployment over SSH
├── apps/
│   └── frontend/                  React/Vite user interface
├── deploy/
│   ├── ansible/                   Ansible playbooks, roles, inventory, and configuration
│   ├── docker/                    Docker Compose stack and PostgreSQL initialization
│   ├── jenkins/                   Optional self-hosted Jenkins CI pipeline
│   └── kubernetes/                Kubernetes sample manifests
├── docs/
│   ├── ANSIBLE_GUIDE.md           Comprehensive Ansible guide (Units V & VI)
│   ├── API.md                     HTTP API documentation & OpenAPI routes
│   ├── architecture.md            System and networking architecture
│   ├── DEPLOYMENT.md              Comprehensive deployment guide
│   ├── DEVOPS_ARCHITECTURE.md     Terraform + Ansible + AWS integration guide
│   ├── STRUCTURE.md               Project structure guide
│   └── TERRAFORM_GUIDE.md         Comprehensive Terraform guide (Unit IV)
├── infra/
│   ├── gateway/                   Nginx reverse proxy configuration
│   ├── observability/             Prometheus, Grafana, and Logstash configurations
│   └── terraform/                 Terraform IaC configurations for AWS EC2 & Security Groups
├── scripts/
│   ├── generate-ansible-inventory.py   Terraform-to-Ansible inventory converter (Python)
│   └── generate-ansible-inventory.ps1  Terraform-to-Ansible inventory converter (PowerShell)
├── services/                      Node.js backend microservices
│   ├── auth-service/              JWT authentication and user management
│   ├── donation-service/          Donation lifecycle and image uploads
│   ├── notification-service/      In-app notifications and email
│   └── tracking-service/          Pickup sessions and route tracking
└── README.md
```

---

## 5. Security Notes

1. **Least-Privilege Security Groups**: Internal microservice ports (`4001`-`4004`), PostgreSQL (`5432`), and Elasticsearch (`9200`) are blocked from public internet access.
2. **Restricted Admin Ports**: SSH (Port 22) and monitoring (Ports 3001 & 9090) should be restricted to trusted administrator `/32` IP addresses.
3. **Secrets Management**: Replace all placeholder secrets (`JWT_SECRET`, `INTERNAL_API_KEY`, database passwords) using Ansible Vault or environment variables before production use.

---

## 6. License

MIT (adjust as needed for your course or organization).
