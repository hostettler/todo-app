## 1. Container images

- [x] 1.1 Add `backend/Dockerfile` (multi-stage: Temurin 21 JDK build → `eclipse-temurin:21-jre` runtime, Quarkus fast-jar layout, non-root UID 1001, `USER 1001`, expose 8080)
- [x] 1.2 Add `backend/.dockerignore` (exclude `target/`, `.git`, `*.md`, IDE files)
- [x] 1.3 Add `frontend/Dockerfile` (multi-stage: `node:20-alpine` build → `nginxinc/nginx-unprivileged:1.27-alpine` runtime, copy `dist/` to `/usr/share/nginx/html`, expose 8080)
- [x] 1.4 Add `frontend/nginx.conf` (SPA fallback to `index.html`, gzip, security headers from README, listen 8080, serve `/config.json` from a mounted file)
- [x] 1.5 Add `frontend/.dockerignore` (exclude `node_modules/`, `dist/`, `.git`, `coverage/`)
- [x] 1.6 Refactor frontend bootstrap to fetch `/config.json` at startup instead of reading `VITE_*` env vars at build time (keep `.env.local` for `npm run dev`)
- [ ] 1.7 Locally verify: `docker build` both images, `docker run` both, hit `http://localhost:8080/q/health/ready` (backend) and `http://localhost:8080/` (frontend) successfully

## 2. Kubernetes manifests

- [x] 2.1 Create `deploy/k8s/base/` with: `namespace.yaml`, `backend-deployment.yaml`, `backend-service.yaml`, `frontend-deployment.yaml`, `frontend-service.yaml`, `frontend-config.yaml` (ConfigMap mounted as `/usr/share/nginx/html/config.json`), `ingress.yaml` (nginx-ingress, host placeholder), `hpa-backend.yaml`, `pdb-backend.yaml`, `pdb-frontend.yaml`, `kustomization.yaml`
- [x] 2.2 Set security baseline on every Deployment: `runAsNonRoot: true`, `readOnlyRootFilesystem: true`, `allowPrivilegeEscalation: false`, drop ALL caps, `seccompProfile: RuntimeDefault`, CPU/mem requests + limits, liveness + readiness probes (`/q/health/live`, `/q/health/ready` for backend; `/` for frontend)
- [x] 2.3 Reference application secrets via Azure Key Vault CSI driver (`SecretProviderClass` + `volumeMounts`) — no inline `Secret` YAML with values
- [x] 2.4 Create `deploy/k8s/overlays/staging/` and `deploy/k8s/overlays/production/` kustomize overlays (namespace, host, ConfigMap values, replica counts, image-tag placeholder)
- [ ] 2.5 Validate manifests locally with `kubeconform -strict -summary` against the base and both overlays

## 3. CI workflow (`.github/workflows/ci.yml`)

- [x] 3.1 Trigger on `pull_request` to `main` and `push` to `main`; concurrency group keyed to ref to cancel superseded runs
- [x] 3.2 Set top-level `permissions: contents: read` only; no `id-token: write`
- [x] 3.3 Job `backend`: `actions/checkout@v4` → `actions/setup-java@v4` (`temurin`, 21, `cache: maven`) → `./mvnw -B verify` → upload `target/site/jacoco/**` as `backend-coverage` (always()) → upload `target/surefire-reports`, `target/failsafe-reports` as `backend-test-reports` (on failure)
- [x] 3.4 Job `frontend`: `actions/setup-node@v4` (20, `cache: npm`) → `npm ci` → `npm run lint` → `npm run test:coverage` → `npm run build` → upload `frontend/coverage/**` as `frontend-coverage` (always())
- [x] 3.5 Job `codeql` (matrix language: `java`, `javascript-typescript`) using `github/codeql-action/init` + `analyze`
- [x] 3.6 Job `trivy-fs`: `aquasecurity/trivy-action@master` with `scan-type: fs`, `severity: HIGH,CRITICAL`, `exit-code: 1`, `ignore-unfixed: true`, honour `.trivyignore` at repo root
- [x] 3.7 Add empty `.trivyignore` at repo root with header comment explaining the allow-list policy
- [ ] 3.8 Verify the workflow on its own PR

## 4. Azure pre-requisites (one-time, documented in `deploy/README.md`)

- [ ] 4.1 In subscription `31d159bc-46b7-43e6-a2e8-91d862090644`, create resource group (e.g. `rg-todo-app`)
- [ ] 4.2 Create Azure Container Registry (e.g. `acrtodoapp`), disable anonymous pull, disable admin user, enable image-lock retention
- [ ] 4.3 Create private AKS cluster with workload identity + OIDC issuer enabled, attach ACR (`az aks update --attach-acr`)
- [ ] 4.4 Install nginx-ingress and Cloudflare Tunnel in the cluster (per existing README/topology)
- [ ] 4.5 Install Azure Key Vault CSI driver (`azure-keyvault-secrets-provider` AKS add-on)
- [ ] 4.6 Create two namespaces `todo-staging`, `todo-production`; create Key Vault per env or one Key Vault with env-scoped secrets; bind via workload identity
- [ ] 4.7 Create one Entra app (or user-assigned MI) for GitHub Actions; add federated credentials with subjects: `repo:hostettler/todo-app:ref:refs/heads/main`, `repo:hostettler/todo-app:ref:refs/tags/v*`, `repo:hostettler/todo-app:environment:staging`, `repo:hostettler/todo-app:environment:production`, and `repo:hostettler/todo-app:pull_request` is **NOT** added
- [ ] 4.8 Grant the identity: `AcrPush` on the ACR; `Azure Kubernetes Service RBAC Writer` + permission to call `Microsoft.ContainerService/managedClusters/runcommand/action` on the AKS cluster (scoped to the resource group)
- [ ] 4.9 In GitHub repo settings, create variables: `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID=31d159bc-46b7-43e6-a2e8-91d862090644`, `AZURE_CLIENT_ID`, `ACR_LOGIN_SERVER`, `AKS_CLUSTER_NAME`, `AKS_RESOURCE_GROUP`
- [ ] 4.10 Create GitHub Environments `staging` (no reviewers, allow `main` only) and `production` (required reviewer = repo owner, restrict to refs `refs/tags/v*`); add any env-scoped variables (`APP_HOST`, `KEYVAULT_NAME`)

## 5. Release workflow (`.github/workflows/release.yml`)

- [x] 5.1 Trigger on `push` to `main` and on `push` of tags `v*.*.*`; concurrency group per ref; permissions `contents: write` (for Releases), `id-token: write`, `packages: read`
- [x] 5.2 Job `build-and-push` (matrix component: `backend`, `frontend`):
  - [x] 5.2.1 `azure/login@v2` via OIDC using `vars.AZURE_CLIENT_ID`/`AZURE_TENANT_ID`/`AZURE_SUBSCRIPTION_ID`
  - [x] 5.2.2 `az acr login --name <ACR_LOGIN_SERVER>`
  - [x] 5.2.3 `docker/setup-buildx-action@v3` + `docker/build-push-action@v6`: context `./<component>`, tags `sha-<short-sha>` (+ `vX.Y.Z` and `latest` on tag), cache via GHA cache
  - [x] 5.2.4 Skip push if `docker manifest inspect` for the SHA tag already succeeds (immutability)
  - [x] 5.2.5 Trivy image scan (`severity: HIGH,CRITICAL`, fail on findings outside `.trivyignore`)
  - [x] 5.2.6 Generate SBOM with `anchore/sbom-action` (CycloneDX), upload artefact `<component>-sbom`
  - [x] 5.2.7 Sign image with `sigstore/cosign-installer` + `cosign sign --yes <ACR>/<repo>@<digest>` (keyless OIDC); on `main`, on-failure-warn; on tag, hard-fail
- [x] 5.3 Job `release-notes` (only on tag): create GitHub Release, attach both SBOM artefacts
- [ ] 5.4 Verify by pushing a no-op commit to `main` and observing `sha-...` images in ACR

## 6. Deploy workflow (`.github/workflows/deploy.yml`)

- [x] 6.1 Triggers: `workflow_run` on completion of `release.yml`; `workflow_dispatch` with inputs `environment` (choice: `staging`,`production`) and `image_tag` (string, default empty=use latest from triggering release)
- [x] 6.2 Top-level `permissions: id-token: write, contents: read, deployments: write`
- [x] 6.3 Job `resolve`: compute `image_tag` (`sha-<short-sha>` from triggering run, or input override) and `environment` (`staging` if event ref is `refs/heads/main`; `production` if ref matches `refs/tags/v*`; rejected for any other ref unless `workflow_dispatch`). Emit as outputs.
- [x] 6.4 Job `deploy` with `environment: ${{ needs.resolve.outputs.environment }}`:
  - [x] 6.4.1 Hard-fail if `environment=production` and ref is not a `v*.*.*` tag
  - [x] 6.4.2 `azure/login@v2` via OIDC
  - [x] 6.4.3 Render the overlay: `kustomize edit set image todo-backend=<ACR>/todo-backend:${image_tag} todo-frontend=<ACR>/todo-frontend:${image_tag}`
  - [x] 6.4.4 `az aks command invoke ... --command "kubectl apply -k deploy/k8s/overlays/<env>"` (use `--file deploy/k8s` to upload the manifests context)
  - [x] 6.4.5 `az aks command invoke ... --command "kubectl -n <ns> rollout status deployment/todo-backend deployment/todo-frontend --timeout=5m"`
  - [x] 6.4.6 Smoke test: `curl -fsS --retry 10 --retry-delay 5 https://<APP_HOST>/q/health/ready` and `curl -fsS https://<APP_HOST>/`
  - [x] 6.4.7 On rollout or smoke-test failure: `az aks command invoke ... rollout undo` for both Deployments, capture `kubectl describe` + last pod logs as artefacts, fail the job
  - [x] 6.4.8 Job summary (`$GITHUB_STEP_SUMMARY`) with: environment, ref, SHA, image digests, run URL
- [ ] 6.5 Verify a `staging` deploy from a `main` push; verify a `production` deploy after cutting `v0.1.0` (approval-gated)

## 7. Documentation & enablement

- [x] 7.1 Create `deploy/README.md` documenting: Azure resources, OIDC setup commands, federated-credential subjects, required GitHub variables/environments, manual rollback procedure
- [x] 7.2 Update root `README.md`: add CI status badge, link to `deploy/README.md`, mention `staging` and `production` environments
- [ ] 7.3 Enable branch protection on `main`: require `ci.yml` checks (`backend`, `frontend`, `codeql`, `trivy-fs`), require linear history, require 1 review (or solo-owner override), require signed commits
- [ ] 7.4 Smoke-test the documentation: a clean Azure subscription + the doc should produce a working deploy

## 8. End-to-end validation

- [ ] 8.1 Open a PR that intentionally drops backend coverage below 80 %; confirm CI fails
- [ ] 8.2 Open a PR that introduces a lint error in the frontend; confirm CI fails
- [ ] 8.3 Open a PR from a fork (or simulate by removing secrets); confirm CI still runs and does not leak credentials
- [ ] 8.4 Merge a green PR to `main`; confirm release + auto-staging-deploy succeed and the staging URL serves the new SHA
- [ ] 8.5 Tag `v0.1.0`; confirm production deploy waits for approval, then rolls out, smoke-tests pass, and GitHub Deployments shows the release
- [ ] 8.6 Trigger `workflow_dispatch` of the deploy workflow with a previous SHA tag against staging; confirm the rollback rolls the deployments to that SHA
