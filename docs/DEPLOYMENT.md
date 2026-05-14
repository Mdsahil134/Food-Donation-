# Deployment guide

## Docker Compose (recommended first path)

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/macOS) or Docker Engine + Compose (Linux).
2. From `docker/`, run:

   ```bash
   docker compose up --build -d
   ```

3. Visit `http://localhost:18080` (or the host port you set in `FOODBRIDGE_GATEWAY_PORT`).

### Resource expectations

- **Elasticsearch** is memory hungry; the compose file sets `ES_JAVA_OPTS=-Xms512m -Xmx512m`. Increase host RAM if containers restart.
- If ELK is not required, remove `elasticsearch`, `logstash`, and `kibana` services locally (core app still runs).

### Image registry push (CI)

1. Create a GitHub **Personal Access Token** or use `GITHUB_TOKEN` with `packages:write`.
2. In `.github/workflows/ci.yml`, add `docker/login-action` and set `push: true` with tags such as `ghcr.io/<org>/foodbridge-auth:latest`.
3. Optionally add a Trivy or Grype scan step after build.

## Kubernetes (outline)

Sample manifests live under `kubernetes/`. Typical steps:

1. Build and push images to your registry.
2. Replace image names in `Deployment` manifests.
3. Create `Secret` objects for `JWT_SECRET`, DB credentials, and `INTERNAL_API_KEY`.
4. Apply `ConfigMap` + `Deployment` + `Service` per microservice.
5. Install an **Ingress** controller and route hostnames to `nginx` or directly to services.

For local experiments, [minikube](https://minikube.sigs.k8s.io/) or [kind](https://kind.sigs.k8s.io/) works well.

## Backups

- **PostgreSQL**: schedule `pg_dump` against each logical database (`foodbridge_auth`, `foodbridge_donation`, `foodbridge_notification`, `foodbridge_tracking`).
- **Donation images**: backup the `donation_uploads` Docker volume or object storage if you move files to S3-compatible storage.

## TLS

Terminate TLS at Nginx or a cloud load balancer. Obtain certificates via Let’s Encrypt or your cloud CA, then configure `listen 443 ssl` with certificate paths.
