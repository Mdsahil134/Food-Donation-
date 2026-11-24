# FoodBridge End-to-End DevOps Architecture

This document describes the complete infrastructure automation and deployment lifecycle of the **FoodBridge Food Donation Platform**, integrating **Terraform**, **Ansible**, **Docker Compose**, **AWS EC2**, and **GitHub Actions**.

---

## 1. End-to-End Architecture Overview

```mermaid
flowchart TD
    subgraph Developer / DevOps Engineer
        DEV[Developer Workstation]
        GIT[Git Commit & Push]
    end

    subgraph CI Pipeline [GitHub Actions CI / CD]
        TEST[Run Microservice Tests]
        BUILD[Docker Image Build Test]
        CD[Deploy via SSH / Ansible Dispatch]
    end

    subgraph IaC Layer [Unit IV: Terraform]
        TF_CFG[infra/terraform/*.tf]
        TF_STATE[(terraform.tfstate\nLocal / S3)]
        AWS_API[AWS Cloud APIs]
    end

    subgraph Configuration & Deployment Layer [Unit V & VI: Ansible]
        INV_GEN[generate-ansible-inventory.py]
        HOSTS[deploy/ansible/inventory/hosts.ini]
        SITE_PB[deploy/ansible/playbooks/site.yml]
    end

    subgraph Production Cloud [AWS EC2 Instance: Ubuntu 22.04 LTS]
        OS_INIT[Swap 2GB + Kernel sysctl + UFW]
        DOCKER_ENG[Docker CE Engine + Compose Plugin]
        
        subgraph Containerized Stack [Docker Compose foodbridge network]
            NGINX_GW[Nginx Gateway :18080]
            WEB[React Frontend SPA]
            AUTH[auth-service :4001]
            DONATION[donation-service :4002]
            NOTIF[notification-service :4003]
            TRACK[tracking-service :4004]
            PG[(PostgreSQL 16 :5432)]
            PROM[Prometheus :9090]
            GRAF[Grafana :3001]
            ELK[Elasticsearch + Logstash + Kibana]
        end
    end

    DEV -->|1. Edit Infrastructure Code| TF_CFG
    TF_CFG -->|2. Provision / Manage| AWS_API
    AWS_API -->|3. Output EC2 Public IP| TF_STATE
    TF_STATE -->|4. Parse Outputs| INV_GEN
    INV_GEN -->|5. Write Host IP| HOSTS
    HOSTS -->|6. Execute Playbook| SITE_PB
    SITE_PB -->|7. SSH Configuration| OS_INIT
    OS_INIT --> DOCKER_ENG
    DOCKER_ENG -->|8. docker compose up -d| Containerized Stack

    DEV -->|Push Code| GIT
    GIT --> TEST
    TEST --> BUILD
    BUILD --> CD
    CD -->|Automated Release| Containerized Stack
```

---

## 2. Infrastructure Sizing and Network Topography

### Virtual Machine Sizing
* **Target OS**: Ubuntu 22.04 LTS (Jammy Jellyfish).
* **Instance Type**: `t3.medium` (minimum, 2 vCPU, 4GB RAM) or `t3.large` (recommended, 2 vCPU, 8GB RAM).
* **Storage**: 30 GiB `gp3` SSD with default encryption.
* **Kernel Customization**:
  * `vm.max_map_count = 262144` (mandatory for Elasticsearch mmap).
  * `2GB Swap space` enabled on `/swapfile` to ensure resilient operation during parallel container build and startup.

### Ingress & Egress Security Mapping

```text
  Internet
     │
     ├─────── Port 22 (SSH) ──────────────────> Allowed ONLY from Administrator /32 IP
     │
     ├─────── Port 80 / 443 (HTTP/S) ─────────> Public (Web Visitors)
     │
     ├─────── Port 18080 (Gateway) ───────────> Public (FoodBridge UI & API Gateway)
     │
     ├─────── Port 3001 (Grafana) ────────────> Restricted to Administrator /32 IP
     │
     └─────── Port 9090 (Prometheus) ─────────> Restricted to Administrator /32 IP

  Internal Docker Network (`foodbridge`) - STRICTLY BLOCKED FROM EXTERNAL ACCESS:
     PostgreSQL (5432)
     Elasticsearch (9200)
     auth-service (4001)
     donation-service (4002)
     notification-service (4003)
     tracking-service (4004)
```

---

## 3. The 7-Step Deployment Lifecycle

| Step | Responsible Tool | Action | Verification |
|---|---|---|---|
| **1. IaC Provisioning** | Terraform | `terraform plan` & `terraform apply` | Creates EC2 instance and least-privilege security group. |
| **2. Inventory Linking** | Python / PowerShell | `python scripts/generate-ansible-inventory.py` | Automatically populates `hosts.ini` with EC2 Public IP. |
| **3. SSH Connectivity** | Ansible Ad-hoc | `ansible all -m ping` | Verifies zero-password SSH key connection. |
| **4. OS Hardening** | Ansible `common` role | Configures UFW firewall, swapfile, and kernel `sysctl`. | `swapon --show` and `sysctl vm.max_map_count`. |
| **5. Container Runtime** | Ansible `docker` role | Installs official Docker Engine and Docker Compose v2. | `docker --version` and `docker compose version`. |
| **6. Microservice Run** | Ansible `application` role | Clones repository, templates `.env`, runs `docker compose up --build -d`. | Container status: `docker compose ps`. |
| **7. Health Verification** | Ansible URI module | Queries `http://127.0.0.1:18080/health` and database readiness. | HTTP 200 `{"status":"gateway-ok"}`. |

---

## 4. Disaster Recovery & Zero-Downtime Updates

1. **Persistent Volumes**:
   * All database data is stored in Docker named volume `pgdata`.
   * Donation image uploads are preserved in Docker named volume `donation_uploads`.
   * These volumes are detached from container lifecycle; stopping or rebuilding containers never deletes persistent records.
2. **Safe Code Updates**:
   * Running `ansible-playbook playbooks/deploy-application.yml` pulls code changes and runs `docker compose up --build -d`.
   * Docker will rebuild changed images in the background and swap running containers with negligible service interruption.
3. **Database Backup Procedure**:
   * Scheduled `pg_dump` command via cron:
     ```bash
     docker compose -f /opt/foodbridge/deploy/docker/docker-compose.yml exec -T postgres pg_dump -U foodbridge foodbridge_auth > backup_auth.sql
     ```
