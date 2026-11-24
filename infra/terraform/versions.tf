terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Remote backend configuration template (S3 + DynamoDB locking).
  # Uncomment and configure after running the bootstrap script in docs/TERRAFORM_GUIDE.md.
  # backend "s3" {
  #   bucket         = "foodbridge-terraform-state-<your-account-id>"
  #   key            = "production/terraform.tfstate"
  #   region         = "ap-south-1"
  #   dynamodb_table = "foodbridge-terraform-locks"
  #   encrypt        = true
  # }
}
