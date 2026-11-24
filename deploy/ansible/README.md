# FoodBridge Ansible Configuration & Deployment

This directory contains the Ansible automation playbooks and roles for configuring the AWS EC2 host and deploying the FoodBridge Food Donation microservices platform.

## Directory Structure

```text
deploy/ansible/
├── ansible.cfg                    # Ansible runtime settings (pipelining, inventory path, remote user)
├── inventory/
│   ├── hosts.ini                  # Active inventory (generated from Terraform or customized)
│   └── hosts.example.ini          # Example inventory template
├── playbooks/
│   ├── site.yml                   # Master orchestration playbook
│   ├── setup-server.yml           # Base OS packages, swapfile, security
│   ├── install-docker.yml         # Official Docker CE & Compose plugin
│   ├── configure-nginx.yml        # Optional host reverse proxy
│   └── deploy-application.yml     # Application source sync, .env template, docker compose up
└── roles/
    ├── common/                    # Baseline OS setup, swap space, vm.max_map_count for Elasticsearch
    ├── docker/                    # Docker daemon, log rotation, group permissions
    ├── nginx/                     # Host Nginx configuration
    └── application/               # Code deployment, Docker Compose run, health verification
```

## Quick Start

### 1. Generate Inventory from Terraform
Run the integration script from the project root:
```bash
python scripts/generate-ansible-inventory.py
```
Or manually edit `deploy/ansible/inventory/hosts.ini` with your instance's public IP:
```ini
[app_servers]
foodbridge_ec2 ansible_host=<YOUR_EC2_PUBLIC_IP> ansible_user=ubuntu ansible_ssh_private_key_file=~/.ssh/<YOUR_KEY>.pem
```

### 2. Test SSH Connectivity
```bash
cd deploy/ansible
ansible all -m ping
```

### 3. Syntax Check Playbooks
```bash
ansible-playbook playbooks/site.yml --syntax-check
```

### 4. Deploy the Entire Platform
```bash
ansible-playbook playbooks/site.yml
```

### 5. Run Targeted Tasks
You can run individual playbooks if you only need to update specific components:
* Re-deploy application only: `ansible-playbook playbooks/deploy-application.yml`
* Update Docker or base OS: `ansible-playbook playbooks/install-docker.yml`
