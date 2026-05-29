## Context

The Todo application is a Quarkus (Java 21) backend, a React + Vite + TypeScript frontend, and PostgreSQL, intended to be deployed to a private Azure Kubernetes Service (AKS) cluster fronted by Cloudflare Tunnel and nginx-ingress (see root `README.md` and `openspec/changes/add-todo-app/design.md`). The project enforces ≥ 80 % line and branch coverage at bundle level for both `backend/` and `frontend/` (`openspec/specs/test-coverage/spec.md`). There is currently no CI, no container build, and no deployment automation — every check is manual, and there is no defined release artefact.

Stakeholders:
- Developers (need fast, deterministic PR feedback and the same gates locally and in CI).
- Operators (need reproducible, auditable rollouts to Azure with safe rollback).
- Security (need SAST, dependency scanning, image scanning, signed images, and no long-lived cloud credentials in GitHub).

**Deployment target**:
- Azure subscription: **Steve's personal** (`31d159bc-46b7-43e6-a2e8-91d862090644`, account owner `steve.hostettler@gmail.com`).
- Subscription ID is treated as non-secret but is stored in a GitHub repository **variable** (`vars.AZURE_SUBSCRIPTION_ID`) so the workflow definitions stay environment-agnostic.
- All other Azure resources (resource group, ACR, AKS, managed identity) live in this subscription and are referenced through GitHub variables, never hardcoded into workflow YAML.

Constraints:
- AKS cluster is **private** (no public API server endpoint reachable from GitHub-hosted runners directly). Deployment must work without exposing the API server publicly.
- No long-lived Azure secrets in GitHub — must use OIDC federated credentials.
- The 80 % coverage gate already exists in build scripts; CI must surface failures from the same scripts rather than re-implementing the gate.
- Solo-developer repo on a free-tier plan — workflows must run on GitHub-hosted runners and stay within typical free-minute budgets.

## Goals / Non-Goals

**Goals:**
- Every pull request runs lint, unit + integration tests, and the coverage gate for both modules, plus SAST (CodeQL) and dependency scanning. PRs cannot be merged unless these checks pass.
- Every push to `main` produces signed, scanned container images for backend and frontend in Azure Container Registry, tagged with the commit SHA.
- Every successful `main` build auto-deploys to a `staging` environment in AKS. Version tags (`v*.*.*`) deploy to `production` after manual approval in a GitHub Environment.
- All Azure authentication uses workload-identity / OIDC federation; no client secrets or service-principal passwords are stored in GitHub.
- Rollouts are verified (`kubectl rollout status`) and trivially rollbackable by re-running the deploy workflow with a previous SHA tag.

**Non-Goals:**
- Provisioning Azure infrastructure (RG, AKS, ACR, identities). Assumed pre-existing; documented in `deploy/README.md`. (Could become a follow-up `azure-infra-bootstrap` change using Bicep/Terraform.)
- Multi-region or blue/green deployments. Single-region rolling update is sufficient for v1.
- Replacing the existing coverage tooling. CI only invokes the existing `mvnw verify` / `npm run test:coverage` commands.
- Performance/load tests in CI (the repo is a scalability-test workbench but the perf runs are out-of-band).
- Database schema migration orchestration beyond what Quarkus/Flyway already does at boot.

## Decisions

### D1. GitHub Actions over alternative CI systems
Use **GitHub Actions** because the code already lives on GitHub, OIDC federation with Azure is first-class, and no extra hosting is needed.
- Alternatives considered: Azure DevOps Pipelines (more Azure-native but adds a second control plane and another set of credentials to manage); CircleCI/Jenkins (more ops, no benefit for a solo project).

### D2. Three workflows, not one mega-workflow
Split into `ci.yml`, `release.yml`, and `deploy.yml`.
- `ci.yml`: PRs + push to `main`; pure quality gates; no cloud credentials, safe to run on forks.
- `release.yml`: push to `main` and version tags; builds + pushes images; needs ACR push credentials via OIDC.
- `deploy.yml`: triggered via `workflow_run` after a successful `release.yml`, or manually via `workflow_dispatch`; needs AKS credentials via OIDC and environment approvals.
- Rationale: separating concerns keeps failure domains isolated, lets PR feedback stay fast, and means deploy permissions are only granted to the deploy workflow.

### D3. Job matrix and caching
- Backend uses `actions/setup-java@v4` with `temurin` 21 and built-in Maven cache.
- Frontend uses `actions/setup-node@v4` with `cache: 'npm'`.
- Backend integration tests need PostgreSQL: use a Testcontainers-based approach (already supported by Quarkus dev services) on the runner, since Docker is available on `ubuntu-latest`.

### D4. Container image strategy
- **Backend**: Multi-stage Dockerfile. Stage 1 builds with Maven + JDK 21 (Temurin), Stage 2 runs on `eclipse-temurin:21-jre` (small, well-maintained). Quarkus fast-jar layout (`target/quarkus-app`). Runs as non-root UID 1001, read-only root FS, exposes 8080.
  - Alternative considered: Quarkus native image with GraalVM — smaller and faster startup, but much longer build (~5–10 min) and more complex reflection config. Defer to a follow-up change.
- **Frontend**: Multi-stage Dockerfile. Stage 1: `node:20-alpine` runs `npm ci && npm run build`. Stage 2: `nginxinc/nginx-unprivileged:1.27-alpine` serves `dist/` on port 8080. Custom `nginx.conf` enables gzip/brotli, sets the security headers from the README, and falls back to `index.html` for SPA routing.
- Both Dockerfiles ship `.dockerignore` to keep build context small.

### D5. Registry: Azure Container Registry (ACR)
Use ACR (already implied by the Azure target) with anonymous-pull disabled. AKS pulls via its kubelet identity attached to ACR (`az aks update --attach-acr`). GitHub pushes to ACR via OIDC-authenticated `az acr login --expose-token` followed by `docker push`.
- Alternative considered: GHCR (free, simple) — would require AKS to use an image-pull secret, which is more credential management for no benefit since we're already in Azure.

### D6. Image tagging and immutability
- Each push to `main` → tag `sha-<short-sha>`.
- Each `v*.*.*` git tag → tags `vX.Y.Z` and `latest`.
- Never overwrite a SHA tag; ACR repositories are configured with image-lock policy (documented in `deploy/README.md`).
- Deploy workflow always sets the `Deployment` `image:` to the immutable SHA tag, never `latest`.

### D7. Supply-chain security
- **Trivy** scans filesystem (in CI) and built images (in release); fail on `HIGH,CRITICAL` for OS + library vulns. Allow-list lives in `.trivyignore`.
- **CodeQL** runs in CI for `java` and `javascript-typescript`.
- **SBOM**: generate CycloneDX via `anchore/sbom-action` for each image, upload as workflow artefact, and attach to the GitHub Release on tag builds.
- **Image signing**: `sigstore/cosign-installer` + keyless OIDC signing (`cosign sign --yes <image>@<digest>`). Verification policy documented but not enforced at admission in v1 (would require a Kyverno/Connaisseur deployment — deferred).

### D8. Azure authentication via OIDC federated credentials
A single user-assigned managed identity (or Entra app) is configured with federated credentials trusting `repo:hostettler/todo-app:ref:refs/heads/main`, `repo:hostettler/todo-app:ref:refs/tags/v*`, `repo:hostettler/todo-app:environment:staging`, and `repo:hostettler/todo-app:environment:production`. The CI workflow does **not** receive Azure credentials. Workflows use `azure/login@v2` with `client-id`, `tenant-id`, `subscription-id` (non-secret variables).
- Permissions: `id-token: write` is required on jobs that authenticate to Azure.

### D9. Reaching the private AKS API server
The AKS API server is private. Three options were considered:
1. **GitHub-hosted runner + `az aks command invoke`** (chosen): Azure runs `kubectl`/`helm` inside an AKS-managed pod that has cluster-network access. Requires only `Microsoft.ContainerService/managedClusters/runcommand/action` RBAC, no VNet peering, no self-hosted runners. Slower (~30–60 s overhead per command) but acceptable for low deploy frequency.
2. Self-hosted runner inside the cluster VNet — more infra to maintain.
3. Make the API server public with authorized IP ranges — weakens posture.

### D10. Kubernetes manifest delivery: plain manifests + `envsubst`
Use plain YAML in `deploy/k8s/` with a small `kustomization.yaml` per environment (`overlays/staging`, `overlays/production`). The deploy workflow sets `newTag:` for the backend and frontend images via `kustomize edit set image` before `kubectl apply -k`.
- Alternative considered: Helm chart — overkill for two services; revisit if the topology grows.
- Manifests include: `Namespace`, `Deployment` (resources, probes, securityContext non-root, read-only FS), `Service` (ClusterIP), `Ingress` (nginx-ingress class, hosts from env), `HorizontalPodAutoscaler`, `PodDisruptionBudget`, `ConfigMap` for non-secret config, and references to a pre-existing `Secret` (Auth0, DB) created out-of-band via Azure Key Vault CSI driver.

### D11. Rollout verification and rollback
- After `kubectl apply`, run `kubectl rollout status deployment/<name> --timeout=5m` for both Deployments.
- Run a smoke test: `curl -fsS https://<env-host>/api/health` (Quarkus SmallRye Health) with retry/backoff.
- On failure: workflow runs `kubectl rollout undo deployment/<name>` for each Deployment and fails the job, surfacing the error.
- Manual rollback: re-run `deploy.yml` via `workflow_dispatch` with an older `image_tag` input.

### D12. Environments and branch protection
- GitHub Environments: `staging` (no reviewers, deploys on every `main`), `production` (required reviewer = repo owner, deploys on tag).
- Branch protection on `main`: require `ci.yml` checks + linear history + signed commits (already enforced today via author config).
- Production environment also restricts deployments to refs matching `refs/tags/v*`.

## Risks / Trade-offs

- [GitHub-hosted runner outage or pricing change] → Workflows are written in standard YAML and can be re-targeted to a self-hosted runner with minimal change. Document the runner contract in `deploy/README.md`.
- [`az aks command invoke` adds ~30–60 s per deploy and is rate-limited] → Acceptable for current low frequency. If deploys become frequent, migrate to a self-hosted runner inside the AKS VNet.
- [OIDC trust misconfiguration locks the workflow out] → Validated end-to-end in `staging` first; `deploy/README.md` documents the exact `az` commands and federated-credential subjects.
- [Coverage gate failures are slow to surface because they only fail at `verify`] → Acceptable: matches the local developer experience. The workflow uploads JaCoCo and Vitest reports as artefacts so contributors can inspect failures without re-running locally.
- [Cosign keyless signatures rely on Fulcio/Rekor availability] → If the Sigstore public good infrastructure is down, signing is skipped with a warning, not a hard failure, on non-tag builds. On tag builds the signing step must succeed.
- [Trivy/CodeQL false positives block PRs] → `.trivyignore` and CodeQL alert dismissal provide escape hatches with an audit trail.
- [Frontend image rebuilt with embedded `VITE_*` env vars per environment] → Either bake values at build time per environment (requires building twice) or expose runtime config via a small `/config.json` served by nginx and fetched at startup. **Decision**: runtime `/config.json` populated from a Kubernetes ConfigMap, so a single image can be promoted from staging to production unchanged. Documented in the `frontend-deployment` requirements.

## Migration Plan

1. **Pre-requisite Azure setup (one-time, manual, documented in `deploy/README.md`)**: create ACR, AKS (private), Entra app with federated credentials for this repo, attach ACR to AKS, create `staging` and `production` namespaces, install nginx-ingress and Cloudflare Tunnel, create Key Vault and bind via CSI driver, seed Auth0 and DB secrets.
2. Land the Dockerfiles, `deploy/k8s/`, and `deploy/README.md` in a PR. Manually `docker build` and `kubectl apply` once to verify the manifests work end-to-end.
3. Land `ci.yml` and ensure all PR checks pass on this PR itself (the workflow runs on its own PR).
4. Configure required repo variables (`AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `ACR_LOGIN_SERVER`, `AKS_CLUSTER_NAME`, `AKS_RESOURCE_GROUP`) and environments (`staging`, `production`).
5. Land `release.yml`; verify it pushes a SHA-tagged image to ACR.
6. Land `deploy.yml`; verify a `staging` rollout via `az aks command invoke`.
7. Cut a `v0.1.0` tag and verify the gated `production` deploy works.
8. Enable branch protection on `main` requiring the CI checks.

**Rollback**: If the workflows misbehave, disable them in repo Settings → Actions; manual deploys via `kubectl` continue to work. Workflow files themselves can be reverted with a normal PR.

## Open Questions

- Which Quarkus health endpoint should the smoke test hit? Assumed `/q/health/ready`; confirm during implementation.
- Do we want PR preview environments (one ephemeral namespace per PR)? Out of scope for this change; can be a follow-up `add-pr-preview-envs`.
- Should we add Dependabot / Renovate now? Strongly recommended but tracked as a separate change to keep this PR focused.
