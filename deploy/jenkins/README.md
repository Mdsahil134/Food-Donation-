# Jenkins CI for FoodBridge

Self-hosted Jenkins that runs the same checks as [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml): `npm test` on each Node microservice, Docker image builds, and a frontend production build.

## Prerequisites

- Docker Desktop (Windows/macOS) or Docker Engine + Compose (Linux)
- The host Docker daemon available (Jenkins mounts `docker.sock` to build images inside the pipeline)

## Start Jenkins

From this directory:

```powershell
cd deploy/jenkins
docker compose up --build -d
```

Open **http://localhost:8080** (override with `JENKINS_HTTP_PORT` if 8080 is taken).

### First login

Configuration-as-Code skips the setup wizard. Create an admin user once:

1. **Manage Jenkins** → **Security** → enable security and add a local user, **or**
2. Temporarily set `JAVA_OPTS` in `docker-compose.yml` to remove `-Djenkins.install.runSetupWizard=false`, recreate the container, complete the wizard, then revert.

Retrieve the initial admin password (if the wizard is enabled):

```powershell
docker exec foodbridge-jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

### Docker permission errors (Linux)

If `docker build` fails with *permission denied* on the socket, set the host docker group id before `docker compose up`:

```bash
export DOCKER_GID=$(getent group docker | cut -d: -f3)
docker compose up --build -d
```

On Docker Desktop for Windows/macOS, the default `999` in `docker-compose.yml` is usually fine.

## Create the pipeline job

1. **New Item** → name `foodbridge` → **Pipeline** → OK  
2. **Pipeline** → **Definition**: *Pipeline script from SCM*  
3. **SCM**: Git → Repository URL = this repo (local path, GitHub URL, or file URL)  
4. **Script Path**: `deploy/jenkins/Jenkinsfile`
5. Save → **Build Now**

For a local Git repo on the same machine, install the **Git** plugin (included in the image) and point Jenkins at your remote, or use **Pipeline script** and paste the `Jenkinsfile` for a quick test.

### Webhook (optional)

Configure your Git host to POST to `http://<jenkins-host>:8080/github-webhook/` (GitHub) or the generic hook URL after installing the matching plugin.

## Stop Jenkins

```powershell
docker compose down
```

Data persists in the `jenkins_home` volume. Remove it with `docker compose down -v` to reset Jenkins completely.

## Customize

| File | Purpose |
|------|---------|
| `Dockerfile` | Jenkins LTS + Node 20 + Docker CLI + plugins |
| `plugins.txt` | Bundled plugins (workflow, git, docker, CASC, etc.) |
| `casc/jenkins.yaml` | Baseline Jenkins settings |
| `Jenkinsfile` | Pipeline stages (edit here for CI behavior) |

To push images to a registry, add `withCredentials` and `docker push` steps in `Jenkinsfile`, similar to enabling `push: true` in GitHub Actions.
