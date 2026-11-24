<#
.SYNOPSIS
    Generates deploy/ansible/inventory/hosts.ini from Terraform outputs.
.EXAMPLE
    .\scripts\generate-ansible-inventory.ps1
    .\scripts\generate-ansible-inventory.ps1 -KeyFile "C:\keys\foodbridge.pem"
#>
param (
    [string]$TerraformDir = "infra\terraform",
    [string]$OutputFile = "deploy\ansible\inventory\hosts.ini",
    [string]$SshUser = "ubuntu",
    [string]$KeyFile = "~/.ssh/foodbridge-key.pem"
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir
$tfPath = Join-Path $repoRoot $TerraformDir
$outPath = Join-Path $repoRoot $OutputFile

Write-Host "[*] Extracting Terraform outputs from $tfPath..." -ForegroundColor Cyan

if (-not (Get-Command terraform -ErrorAction SilentlyContinue)) {
    Write-Warning "Terraform command not found on PATH. Please ensure Terraform is installed and initialized."
    exit 1
}

Push-Location $tfPath
try {
    $jsonRaw = terraform output -json
    $outputs = $jsonRaw | ConvertFrom-Json
} finally {
    Pop-Location
}

if (-not $outputs.public_ip -or -not $outputs.public_ip.value) {
    Write-Error "Could not retrieve public_ip from Terraform outputs. Has 'terraform apply' been run?"
    exit 1
}

$publicIp = $outputs.public_ip.value

$content = @"
# =============================================================================
# FoodBridge Platform - Ansible Inventory
# Auto-generated from Terraform outputs
# =============================================================================

[app_servers]
foodbridge_ec2 ansible_host=$publicIp ansible_user=$SshUser ansible_ssh_private_key_file=$KeyFile

[all:vars]
ansible_python_interpreter=/usr/bin/python3
foodbridge_app_dir=/opt/foodbridge
foodbridge_gateway_port=18080
foodbridge_user=$SshUser
"@

$outDir = Split-Path -Parent $outPath
if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}

Set-Content -Path $outPath -Value $content -Encoding UTF8
Write-Host "[✓] Ansible inventory successfully generated at: $outPath" -ForegroundColor Green
Write-Host "    Host IP : $publicIp" -ForegroundColor Green
Write-Host "    User    : $SshUser" -ForegroundColor Green
