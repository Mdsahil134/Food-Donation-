#!/usr/bin/env python3
"""
Generate Ansible inventory from Terraform outputs.

Usage:
  python scripts/generate-ansible-inventory.py
  python scripts/generate-ansible-inventory.py --key-file ~/.ssh/my-key.pem
  python scripts/generate-ansible-inventory.py --tf-json terraform-output.json
"""

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path


def get_terraform_outputs(tf_dir: Path, json_file: str = None) -> dict:
    if json_file and os.path.exists(json_file):
        with open(json_file, "r") as f:
            return json.load(f)

    # Execute `terraform output -json` inside the terraform directory
    cmd = ["terraform", "output", "-json"]
    try:
        proc = subprocess.run(
            cmd,
            cwd=str(tf_dir),
            capture_output=True,
            text=True,
            check=True
        )
        return json.loads(proc.stdout)
    except FileNotFoundError:
        print("Error: `terraform` command not found on PATH.", file=sys.stderr)
        print("You can pass pre-generated output with --tf-json <file>", file=sys.stderr)
        sys.exit(1)
    except subprocess.CalledProcessError as e:
        print(f"Error executing `terraform output -json`: {e.stderr}", file=sys.stderr)
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Generate Ansible inventory from Terraform outputs")
    parser.add_argument("--tf-dir", default="infra/terraform", help="Path to terraform directory")
    parser.add_argument("--tf-json", default=None, help="Path to pre-generated terraform output JSON")
    parser.add_argument("--inventory-out", default="deploy/ansible/inventory/hosts.ini", help="Target inventory output file")
    parser.add_argument("--user", default="ubuntu", help="Remote SSH user (default: ubuntu)")
    parser.add_argument("--key-file", default=None, help="SSH private key path (e.g., ~/.ssh/foodbridge.pem)")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent.parent
    tf_dir = repo_root / args.tf_dir
    inventory_path = repo_root / args.inventory_out

    print(f"[*] Reading Terraform outputs from {tf_dir}...")
    outputs = get_terraform_outputs(tf_dir, args.tf_json)

    public_ip = outputs.get("public_ip", {}).get("value")
    if not public_ip:
        print("Error: Could not find 'public_ip' in Terraform outputs.", file=sys.stderr)
        sys.exit(1)

    key_file = args.key_file
    if not key_file:
        key_file = "~/.ssh/foodbridge-key.pem"

    inventory_content = f"""# =============================================================================
# FoodBridge Platform - Ansible Inventory
# Auto-generated from Terraform outputs on {os.environ.get('USER', 'admin')}
# =============================================================================

[app_servers]
foodbridge_ec2 ansible_host={public_ip} ansible_user={args.user} ansible_ssh_private_key_file={key_file}

[all:vars]
ansible_python_interpreter=/usr/bin/python3
foodbridge_app_dir=/opt/foodbridge
foodbridge_gateway_port=18080
foodbridge_user={args.user}
"""

    inventory_path.parent.mkdir(parents=True, exist_ok=True)
    with open(inventory_path, "w") as f:
        f.write(inventory_content)

    print(f"[✓] Successfully wrote Ansible inventory to: {inventory_path}")
    print(f"    Target EC2 Host IP: {public_ip}")
    print(f"    SSH User          : {args.user}")
    print(f"    Key File          : {key_file}")


if __name__ == "__main__":
    main()
