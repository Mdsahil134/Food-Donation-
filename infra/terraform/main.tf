# -----------------------------------------------------------------------------
# Data Sources for VPC, Subnet, and Ubuntu AMI
# -----------------------------------------------------------------------------

# Fetch the specified VPC or fallback to the Default VPC
data "aws_vpc" "selected" {
  default = var.vpc_id == "" ? true : null
  id      = var.vpc_id != "" ? var.vpc_id : null
}

# Fetch subnets within the target VPC
data "aws_subnets" "available" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.selected.id]
  }
}

# Fetch latest official Ubuntu 22.04 LTS AMI if custom ami_id is not provided
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# -----------------------------------------------------------------------------
# Security Group: FoodBridge Application & Gateway
# Least-privilege firewall rules. Internal ports (PostgreSQL 5432,
# Elasticsearch 9200, microservices 4001-4004) are NOT exposed.
# -----------------------------------------------------------------------------
resource "aws_security_group" "app_sg" {
  name_prefix = "${var.project_name}-${var.environment}-sg-"
  description = "Security group for FoodBridge EC2 host (SSH, HTTP/S, and Gateway)"
  vpc_id      = data.aws_vpc.selected.id

  # Inbound SSH: Restricted strictly to trusted CIDR block
  ingress {
    description = "SSH access from trusted administrator IP"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = length(var.allowed_ssh_cidr) > 0 ? var.allowed_ssh_cidr : ["127.0.0.1/32"]
  }

  # Inbound HTTP: Standard web traffic
  ingress {
    description = "HTTP web traffic"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Inbound HTTPS: Secure web traffic
  ingress {
    description = "HTTPS secure web traffic"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Inbound FoodBridge Reverse Proxy Gateway
  ingress {
    description = "FoodBridge reverse proxy gateway host port"
    from_port   = var.gateway_port
    to_port     = var.gateway_port
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Inbound Grafana Dashboard (Restricted to monitoring or admin CIDR)
  ingress {
    description = "Grafana dashboard access"
    from_port   = 3001
    to_port     = 3001
    protocol    = "tcp"
    cidr_blocks = length(var.allowed_monitoring_cidr) > 0 ? var.allowed_monitoring_cidr : (length(var.allowed_ssh_cidr) > 0 ? var.allowed_ssh_cidr : ["127.0.0.1/32"])
  }

  # Inbound Prometheus Metrics Dashboard (Restricted to monitoring or admin CIDR)
  ingress {
    description = "Prometheus dashboard access"
    from_port   = 9090
    to_port     = 9090
    protocol    = "tcp"
    cidr_blocks = length(var.allowed_monitoring_cidr) > 0 ? var.allowed_monitoring_cidr : (length(var.allowed_ssh_cidr) > 0 ? var.allowed_ssh_cidr : ["127.0.0.1/32"])
  }

  # Outbound: Allow all egress traffic for package installation and container image pulls
  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.additional_tags,
    {
      Name = "${var.project_name}-${var.environment}-sg"
    }
  )

  lifecycle {
    create_before_destroy = true
  }
}

# -----------------------------------------------------------------------------
# EC2 Instance: FoodBridge Server
# -----------------------------------------------------------------------------
resource "aws_instance" "app_server" {
  ami                         = var.ami_id != "" ? var.ami_id : data.aws_ami.ubuntu.id
  instance_type               = var.instance_type
  key_name                    = var.key_name
  vpc_security_group_ids      = [aws_security_group.app_sg.id]
  subnet_id                   = var.subnet_id != "" ? var.subnet_id : data.aws_subnets.available.ids[0]
  associate_public_ip_address = true
  monitoring                  = var.enable_detailed_monitoring

  root_block_device {
    volume_size           = var.root_volume_size
    volume_type           = var.root_volume_type
    encrypted             = true
    delete_on_termination = true

    tags = merge(
      var.additional_tags,
      {
        Name = "${var.project_name}-${var.environment}-root-ebs"
      }
    )
  }

  tags = merge(
    var.additional_tags,
    {
      Name = "${var.project_name}-${var.environment}-server"
      Role = "foodbridge-application-server"
    }
  )

  # Prevent accidental instance destruction during terraform updates
  lifecycle {
    ignore_changes = [
      ami, # Avoid recreation if a new Ubuntu patch AMI is released
    ]
  }
}
