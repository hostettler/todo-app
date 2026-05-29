## Why

The repository currently has no automated build, test, or deployment pipeline. Every push relies on contributors running `mvnw verify` and `npm run test:coverage` manually, and there is no defined path from `main` to the production AKS cluster described in the README. We need a reliable CI/CD pipeline so that (a) the 80 % coverage gate and security checks are enforced on every PR, and (b) merges to `main` produce signed container images that are automatically rolled out to Azure Kubernetes Service.

## What Changes

- Add a **CI workflow** (`.github/workflows/ci.yml`) that runs on every pull request and push to `main`:
  - Backend: `./mvnw verify` (compile + unit + integration tests + JaCoCo coverage gate ≥ 80 %).
  - Frontend: `npm ci`, `npm run lint`, `npm run test:coverage` (Vitest coverage gate ≥ 80 %), `npm run build`.
  - Dependency vulnerability scan (Trivy filesystem) and CodeQL static analysis for Java + JavaScript/TypeScript.
- Add a **container build & publish workflow** (`.github/workflows/release.yml`) triggered on push to `main` and on version tags:
  - Build multi-stage Dockerfiles for `backend/` and `frontend/`.
  - Push images to **Azure Container Registry (ACR)** tagged with `sha-<git-sha>` and (for tags) `vX.Y.Z` + `latest`.
  - Scan images with Trivy and fail on HIGH/CRITICAL.
  - Generate SBOM (CycloneDX) and attach to the workflow run; sign images with cosign (keyless OIDC).
- Add a **deploy workflow** (`.github/workflows/deploy.yml`) that runs after a successful release build:
  - Authenticate to Azure using **OIDC federated credentials** (no long-lived secrets).
  - Apply Kubernetes manifests (or Helm chart in `deploy/`) to the private AKS cluster, updating the backend and frontend `Deployment` image tags to the freshly built SHA.
  - Verify the rollout with `kubectl rollout status` and run a smoke test against the Cloudflare-Tunnel-fronted public URL.
  - Support a `staging` environment (auto-deploy on `main`) and a `production` environment (deploy on version tag, gated by GitHub Environment approval).
- Add **Dockerfiles** for `backend/` (JVM Quarkus, distroless base) and `frontend/` (nginx serving the built Vite assets).
- Add **Kubernetes deployment manifests** under `deploy/k8s/` (Deployment, Service, ConfigMap, Secret stubs, HPA) and wire them to the existing nginx-ingress + Cloudflare Tunnel topology described in the README.
- Document the pipeline, required Azure resources, and required GitHub repository secrets/variables in `deploy/README.md` and update the root `README.md`.

## Capabilities

### New Capabilities
- `ci-pipeline`: Continuous integration on pull requests and `main` — build, lint, test, coverage gate, SAST, dependency scan.
- `release-pipeline`: Container image build, scan, sign, SBOM, and publish to Azure Container Registry.
- `azure-deployment`: Automated deployment to Azure Kubernetes Service via OIDC, with staging/production environments and rollout verification.

### Modified Capabilities
<!-- None. Existing specs (test-coverage, api-security, etc.) describe product behavior that the new pipelines enforce but do not modify. -->

## Impact

- **New files**: `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `.github/workflows/deploy.yml`, `backend/Dockerfile`, `backend/.dockerignore`, `frontend/Dockerfile`, `frontend/nginx.conf`, `frontend/.dockerignore`, `deploy/k8s/*.yaml`, `deploy/README.md`.
- **Modified files**: root `README.md` (CI badges, deployment section), `.gitignore` (ignore build/scan artefacts if needed).
- **External dependencies**: Azure subscription with an ACR instance, an AKS cluster, a Microsoft Entra ID app registration with OIDC federated credentials trusted by this GitHub repository; GitHub Environments `staging` and `production` configured with required reviewers for production.
- **Secrets/variables (repo or environment scoped)**: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `ACR_LOGIN_SERVER`, `AKS_CLUSTER_NAME`, `AKS_RESOURCE_GROUP`. No static cloud passwords or service-principal secrets are introduced.
- **Runtime impact**: None on local development. Production deployments become reproducible and auditable; rollbacks become a one-command `kubectl rollout undo` or re-deploy of a previous image tag.
- **Risk**: Misconfigured OIDC trust or RBAC could block deploys; mitigated by validating the workflow in `staging` first and requiring environment approval for `production`.
