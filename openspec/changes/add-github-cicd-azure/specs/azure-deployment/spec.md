## ADDED Requirements

### Requirement: Two deployment environments — staging and production
The repository SHALL define two GitHub Environments: `staging` and `production`. Both environments MUST exist in the same Azure subscription (Steve's personal subscription, `31d159bc-46b7-43e6-a2e8-91d862090644`) and the same private AKS cluster, in separate Kubernetes namespaces (`todo-staging`, `todo-production`).

#### Scenario: Environments are configured
- **WHEN** the deploy workflow is invoked
- **THEN** it must reference either `environment: staging` or `environment: production`
- **AND** the GitHub UI shows deployments for both environments separately

### Requirement: Auto-deploy to staging on successful main build
The deploy workflow SHALL automatically deploy to `staging` whenever the release workflow for a `main` commit succeeds.

#### Scenario: Successful main release auto-deploys
- **WHEN** the release workflow completes successfully for a commit on `main`
- **THEN** the deploy workflow runs against the `staging` environment using the `sha-<short-sha>` image tag

### Requirement: Production deploy requires tag and manual approval
The deploy workflow SHALL only deploy to `production` when the trigger ref is a tag matching `v*.*.*`, AND only after a required reviewer approves the GitHub Environment deployment.

#### Scenario: Tag build awaits approval
- **WHEN** the release workflow completes for a `v*.*.*` tag
- **THEN** the production deploy job is queued and blocked on the `production` environment's required reviewers
- **AND** no Kubernetes change happens until approval is granted

#### Scenario: Deployment from non-tag ref to production is rejected
- **WHEN** the deploy workflow is invoked for `production` from a ref that is not a `v*.*.*` tag
- **THEN** the workflow fails before authenticating to Azure

### Requirement: OIDC authentication to Azure with least privilege
The deploy workflow SHALL authenticate to Azure via Microsoft Entra OIDC federation using `azure/login@v2`. The federated identity MUST be subject-constrained per environment (`repo:hostettler/todo-app:environment:staging` and `repo:hostettler/todo-app:environment:production`). The identity MUST be granted only the roles required to (a) run `az aks command invoke` against the target cluster and (b) read the ACR for image-pull (which is delegated to AKS's kubelet identity, not the deployer).

#### Scenario: Deploy uses OIDC, not a client secret
- **WHEN** the deploy workflow runs
- **THEN** it requests `id-token: write` and calls `azure/login@v2` with `client-id`, `tenant-id`, `subscription-id` and no client secret

#### Scenario: Subscription ID is non-secret variable
- **WHEN** the deploy workflow authenticates
- **THEN** the subscription ID is read from `vars.AZURE_SUBSCRIPTION_ID` (value `31d159bc-46b7-43e6-a2e8-91d862090644`) — not from a repository secret

### Requirement: Deploy reaches the private AKS API via `az aks command invoke`
The deploy workflow SHALL execute `kubectl`/`kustomize` commands against the private AKS cluster using `az aks command invoke`, which runs commands inside an AKS-managed pod with cluster-network access. The workflow MUST NOT require the AKS API server to be publicly reachable, and MUST NOT require a self-hosted runner.

#### Scenario: Deploy on private cluster
- **WHEN** the target AKS cluster has a private API server endpoint
- **THEN** the deploy workflow succeeds without any VNet peering or public API exposure
- **AND** the `kubectl apply` is executed via `az aks command invoke --command "kubectl apply -k overlays/<env>"`

### Requirement: Image tag pinned to immutable SHA in deployments
The deploy workflow SHALL set each Deployment's container image to the immutable `sha-<short-sha>` tag built by the corresponding release run. The deployed manifest MUST NOT reference `latest`, `vX.Y.Z`, or any mutable tag.

#### Scenario: Deployment uses SHA tag
- **WHEN** a release for commit `abcdef1` is deployed
- **THEN** the rendered `Deployment` manifests reference `<acr>/todo-backend:sha-abcdef1` and `<acr>/todo-frontend:sha-abcdef1`

### Requirement: Rollout verification with automatic rollback
After applying manifests, the deploy workflow SHALL run `kubectl rollout status` for each affected Deployment with a 5-minute timeout, and SHALL run an HTTP smoke test against the environment's public health URL with bounded retries. If either step fails, the workflow SHALL run `kubectl rollout undo` for each affected Deployment and fail the job.

#### Scenario: Successful rollout
- **WHEN** all Deployments become `Available` within 5 minutes and the smoke test returns 200
- **THEN** the deploy job reports success

#### Scenario: Failed rollout triggers automatic rollback
- **WHEN** a Deployment's rollout times out or the smoke test fails
- **THEN** the workflow runs `kubectl rollout undo` on each affected Deployment
- **AND** the workflow fails with the diagnostic logs (last `kubectl describe` and pod logs) captured as artefacts

### Requirement: Manual rollback by re-deploying a previous tag
The deploy workflow SHALL support `workflow_dispatch` with an `image_tag` input (default: latest successful SHA tag for the selected environment) and an `environment` input (`staging` or `production`), enabling manual rollback to any previously released image without rebuilding.

#### Scenario: Manual redeploy of older SHA
- **WHEN** an operator triggers `workflow_dispatch` with `environment=production` and `image_tag=sha-deadbee`
- **THEN** the production deploy is queued (subject to approval) and rolls the deployments to that image

### Requirement: Frontend runtime configuration via ConfigMap
The deployed frontend image SHALL be environment-agnostic; per-environment values (Auth0 domain, audience, API base URL) MUST be served at runtime from `/config.json` populated by a Kubernetes ConfigMap. The same image digest deployed to `staging` MUST be promotable to `production` without rebuild.

#### Scenario: Same digest promoted across environments
- **WHEN** the staging deployment is running `<acr>/todo-frontend@sha256:<digest>` and a production deploy targets the same SHA tag
- **THEN** the resolved digest in production is identical to the staging digest

### Requirement: Kubernetes manifests follow security baseline
Every `Deployment` manifest in `deploy/k8s/` SHALL set: `runAsNonRoot: true`, `readOnlyRootFilesystem: true`, `allowPrivilegeEscalation: false`, `capabilities.drop: ["ALL"]`, `seccompProfile.type: RuntimeDefault`, CPU + memory requests and limits, `livenessProbe`, `readinessProbe`, and a `PodDisruptionBudget` with `minAvailable: 1`.

#### Scenario: Manifest passes baseline checks
- **WHEN** a static check (e.g. `kubectl --dry-run=server apply` or `kubeconform`) is run against the manifests
- **THEN** all the baseline fields above are present and the manifests are accepted

### Requirement: Secrets sourced from Azure Key Vault, never from GitHub
Application secrets (Auth0 client config, database credentials) SHALL be sourced inside the cluster via the Azure Key Vault CSI driver bound to a workload identity. GitHub repository or environment **secrets** SHALL NOT contain any application secret value; they MAY contain only identifiers (e.g. Key Vault name, managed-identity client IDs) — and those SHOULD be GitHub `vars`, not `secrets`, when not sensitive.

#### Scenario: No application secret in GitHub
- **WHEN** the repository's secrets are audited
- **THEN** none of them contain Auth0 client secrets, database passwords, or other application credentials

### Requirement: Deployment is observable and auditable
Each deploy run SHALL record: the commit SHA, the image digests applied, the environment, the GitHub Actions run URL, and the approver (for production). This information MUST be visible in the GitHub Deployments tab and in a workflow-job summary.

#### Scenario: Deployment record visible
- **WHEN** a production deploy completes
- **THEN** the GitHub Deployments page shows the environment, ref, SHA, image digests, and approver
