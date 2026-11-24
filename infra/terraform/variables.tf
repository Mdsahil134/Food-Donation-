variable "aws_region" {
  description = "The AWS Region where resources will be provisioned or managed."
  type        = string
  default     = "ap-south-1"
}

variable "aws_profile" {
  description = "The AWS CLI profile to use for authentication (leave empty to use default credentials or environment variables)."
  type        = string
  default     = ""
}

variable "project_name" {
  description = "Name of the project used for naming and tagging resources."
  type        = string
  default     = "foodbridge"
}

variable "environment" {
  description = "Deployment environment (e.g., production, staging, development)."
  type        = string
  default     = "production"
}

variable "instance_type" {
  description = "EC2 instance type. Recommended minimum: t3.medium (4GB RAM) for PostgreSQL, Node microservices, and monitoring."
  type        = string
  default     = "t3.medium"
}

variable "ami_id" {
  description = "Custom AMI ID. If empty, the latest official Ubuntu 22.04 LTS AMI in the region will be looked up automatically."
  type        = string
  default     = ""
}

variable "key_name" {
  description = "Name of the existing AWS EC2 Key Pair used for SSH access."
  type        = string
}

variable "allowed_ssh_cidr" {
  description = "List of trusted CIDR blocks allowed to connect via SSH (Port 22). Must be restricted to trusted IP/32."
  type        = list(string)
  default     = []
}

variable "allowed_monitoring_cidr" {
  description = "List of trusted CIDR blocks allowed to access Grafana (Port 3001) and Prometheus (Port 9090)."
  type        = list(string)
  default     = []
}

variable "gateway_port" {
  description = "Host port exposed by the FoodBridge Nginx reverse proxy gateway."
  type        = number
  default     = 18080
}

variable "root_volume_size" {
  description = "Size of the root EBS volume in GiB (minimum 30 recommended for Docker images and volumes)."
  type        = number
  default     = 30
}

variable "root_volume_type" {
  description = "Type of the root EBS volume (gp3 recommended for performance and cost efficiency)."
  type        = string
  default     = "gp3"
}

variable "vpc_id" {
  description = "VPC ID where the instance and security group will be created. If left empty, the region's default VPC is used."
  type        = string
  default     = ""
}

variable "subnet_id" {
  description = "Subnet ID where the EC2 instance will be placed. If left empty, the first available subnet in the VPC is used."
  type        = string
  default     = ""
}

variable "enable_detailed_monitoring" {
  description = "Enable CloudWatch detailed monitoring (1-minute metrics) for the EC2 instance."
  type        = bool
  default     = false
}

variable "additional_tags" {
  description = "Additional tags to apply to all resources."
  type        = map(string)
  default     = {}
}
