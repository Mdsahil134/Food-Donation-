# Ansible Guide - Configuration Management & Automation (Units V & VI)

This guide covers the core concepts and real-world execution of **Ansible** for configuring servers and deploying the **FoodBridge Food Donation Platform**.

---

## 1. What is Ansible and Why Is It Used?

**Ansible** is an open-source, agentless configuration management, application deployment, and orchestration tool developed by Red Hat.

### Key Characteristics:
* **Agentless**: Requires no background daemon or agent installed on target servers. It connects entirely over standard **SSH** (Secure Shell) and executes Python modules on the target host.
* **Declarative & Idempotent**: You specify what state the machine should be in (e.g., "Docker should be installed and running"). If Docker is already installed and running, running the playbook again makes **0 changes** and exits safely.
* **Human-Readable YAML**: Playbooks are written in simple YAML syntax that serves as living documentation for your operations.

### Why Ansible is Used in FoodBridge:
1. **Automated Server Provisioning**: Sets up Linux packages, kernel parameters (`vm.max_map_count` for Elasticsearch), swap space, and firewall rules in minutes.
2. **Container Engine Setup**: Automatically adds official Docker APT repositories, installs the Docker Engine and Docker Compose plugin, and manages user group permissions.
3. **Continuous Deployment**: Transfers environment files, runs `docker compose up --build -d`, and runs automated health checks against microservices and databases.

---

## 2. Ansible Core Concepts Explained

```mermaid
flowchart TD
    subgraph Control Node [Control Node: Local Machine / CI Runner]
        CFG[ansible.cfg]
        INV[Inventory: hosts.ini]
        PB[Playbooks: site.yml]
        ROLES[Roles: common, docker, nginx, application]
    end

    subgraph Managed Node [Managed Node: AWS EC2 Ubuntu Host]
        SSH[OpenSSH Server]
        MOD[Python Execution Runtime]
        SYS[Operating System & Docker Containers]
    end

    Control Node -->|SSH Port 22| Managed Node
```

### 1. Control Node vs. Managed Node
* **Control Node**: The computer where Ansible is installed and run (e.g., your admin laptop, WSL, or a GitHub Actions runner).
* **Managed Node**: The target servers being configured (in our case, the AWS EC2 instance running Ubuntu 22.04 LTS).

### 2. Inventory (`hosts.ini`)
The inventory defines the IP addresses, hostnames, groups, and SSH connection parameters for all managed nodes:
```ini
[app_servers]
foodbridge_ec2 ansible_host=13.234.56.78 ansible_user=ubuntu ansible_ssh_private_key_file=~/.ssh/foodbridge.pem
```

### 3. Playbooks
YAML documents containing one or more plays. A play maps a group of hosts from the inventory to tasks or roles to execute.

### 4. Tasks
The smallest unit of action in Ansible. Each task invokes an Ansible module (e.g., `apt`, `service`, `copy`, `command`, `uri`).

### 5. Roles
A standardized directory structure for breaking down large playbooks into reusable components:
* `tasks/main.yml`: List of tasks executed by the role.
* `handlers/main.yml`: Tasks triggered only when a task reports a change (via `notify`).
* `defaults/main.yml`: Default variables with lowest precedence (easy to override).
* `templates/`: Jinja2 templates (e.g., Nginx config files).

### 6. Handlers
Special tasks that only run when notified by another task that actually made a change. For example, reloading Nginx only if the configuration template changed:
```yaml
notify: reload nginx
```

### 7. Facts
System properties (IP address, OS distribution, kernel version, CPU count) gathered automatically from the managed host at the start of every play using the `setup` module.

### 8. Ad-hoc Commands
One-line commands to run quick operations without writing a playbook:
```bash
ansible app_servers -m ping
ansible app_servers -m command -a "docker ps"
ansible app_servers -m setup -a "filter=ansible_distribution*"
```

---

## 3. FoodBridge Role Breakdown

Our Ansible configuration in `deploy/ansible/` is organized into 4 modular roles:

| Role | Responsibilities |
|---|---|
| `common` | Installs essential utilities (`curl`, `git`, `htop`, `ufw`, `jq`), creates a **2GB swapfile** to prevent Elasticsearch OOM crashes on `t3.medium`, and sets `vm.max_map_count = 262144`. |
| `docker` | Adds official Docker CE repository, installs `docker-ce` and `docker-compose-plugin`, configures container log rotation (`daemon.json`), and adds `ubuntu` to the `docker` group. |
| `nginx` | Optional host-level Nginx reverse proxy configuration. |
| `application` | Syncs application source code, templates `.env`, starts containers with `docker compose up --build -d`, and polls the `/health` endpoint until all microservices report OK. |

---

## 4. Execution Step-by-Step

### Step 1: Update the Inventory
Run the automated script to pull the latest public IP from Terraform:
```bash
python scripts/generate-ansible-inventory.py
```
Or edit `deploy/ansible/inventory/hosts.ini` directly:
```ini
[app_servers]
foodbridge_ec2 ansible_host=YOUR_PUBLIC_IP ansible_user=ubuntu ansible_ssh_private_key_file=~/.ssh/foodbridge-key.pem
```

### Step 2: Test SSH Connectivity (Ping Module)
```bash
cd deploy/ansible
ansible all -m ping
```
*Expected Output*:
```json
foodbridge_ec2 | SUCCESS => {
    "ansible_facts": {
        "discovered_interpreter_python": "/usr/bin/python3"
    },
    "changed": false,
    "ping": "pong"
}
```

### Step 3: Verify Playbook Syntax
```bash
ansible-playbook playbooks/site.yml --syntax-check
```

### Step 4: Dry-Run (Check Mode)
Preview changes without modifying the server:
```bash
ansible-playbook playbooks/site.yml --check
```

### Step 5: Execute the Master Playbook
```bash
ansible-playbook playbooks/site.yml
```

### Step 6: Verify Deployment Status
You will see the final status summary from the application task:
```text
TASK [application : Print deployment success summary] **************************
ok: [foodbridge_ec2] => {
    "msg": [
        "==========================================================",
        "FoodBridge Platform successfully deployed!",
        "Gateway URL : http://13.234.56.78:18080",
        "Gateway Status : OK",
        "PostgreSQL     : Healthy",
        "Auth API Docs  : http://13.234.56.78:18080/api/auth/docs",
        "=========================================================="
    ]
}
```

---

## 5. Security Best Practices & Ansible Vault

To prevent storing plaintext secrets (`POSTGRES_PASSWORD`, `JWT_SECRET`, `INTERNAL_API_KEY`) in Git repositories, encrypt them using **Ansible Vault**:

### 1. Create an Encrypted Variables File
```bash
ansible-vault create vars/vault.yml
```
Add your sensitive production secrets:
```yaml
vault_postgres_password: "MySuperSecureDbPassword123!"
vault_jwt_secret: "prod-jwt-secret-very-long-and-random"
vault_internal_api_key: "internal-secret-service-key"
```

### 2. Run Playbooks with Vault Password
```bash
ansible-playbook playbooks/site.yml --ask-vault-pass
```
Or provide a secure vault password file (e.g., `~/.vault_pass.txt`):
```bash
ansible-playbook playbooks/site.yml --vault-password-file ~/.vault_pass.txt
```
