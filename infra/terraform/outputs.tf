output "instance_id" {
  description = "The ID of the EC2 instance running FoodBridge."
  value       = aws_instance.app_server.id
}

output "public_ip" {
  description = "The public IPv4 address of the FoodBridge EC2 instance."
  value       = aws_instance.app_server.public_ip
}

output "private_ip" {
  description = "The private IPv4 address of the FoodBridge EC2 instance."
  value       = aws_instance.app_server.private_ip
}

output "public_dns" {
  description = "The public DNS name assigned to the FoodBridge EC2 instance."
  value       = aws_instance.app_server.public_dns
}

output "security_group_id" {
  description = "The ID of the FoodBridge security group."
  value       = aws_security_group.app_sg.id
}

output "ssh_connection_string" {
  description = "Convenience SSH command to connect to the instance."
  value       = "ssh -i <path-to-${var.key_name}.pem> ubuntu@${aws_instance.app_server.public_ip}"
}

output "app_url" {
  description = "Direct URL to access the FoodBridge web platform."
  value       = "http://${aws_instance.app_server.public_ip}:${var.gateway_port}"
}

output "ansible_inventory_entry" {
  description = "Formatted entry ready for Ansible inventory (hosts.ini)."
  value       = "foodbridge_server ansible_host=${aws_instance.app_server.public_ip} ansible_user=ubuntu ansible_ssh_private_key_file=~/.ssh/${var.key_name}.pem"
}
