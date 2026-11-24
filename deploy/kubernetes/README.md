# Sample Kubernetes resources
#
# Replace image names with your registry paths after `docker build`.
# Create a Secret `foodbridge-secrets` with keys such as:
#   JWT_SECRET, DB_USER, DB_PASSWORD, INTERNAL_API_KEY
#
# Apply:
#   kubectl apply -f namespace.yaml
#   kubectl apply -f auth-deployment.yaml
