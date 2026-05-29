# Deployment — Todo App on Azure Kubernetes Service

Production target: **Steve's personal Azure subscription** (`31d159bc-46b7-43e6-a2e8-91d862090644`).
Workflow files: `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `.github/workflows/deploy.yml`.

The CI workflow runs on every PR (lint, tests, ≥ 80 % coverage gate, CodeQL,
Trivy filesystem scan). The release workflow builds and pushes signed container
images to Azure Container Registry on `main` and on `v*.*.*` tags. The deploy
workflow auto-deploys `main` builds to `staging` and gated tag builds to
`production`. All Azure access uses **OIDC federated credentials** — no
long-lived secrets in GitHub.

---

## Topology

- **Azure Container Registry** — stores `todo-backend` and `todo-frontend` images.
- **Private AKS cluster** — runs both services in `todo-staging` and
  `todo-production` namespaces. The API server has no public endpoint; the
  deploy workflow reaches it through `az aks command invoke`.
- **nginx-ingress** routes `/api` and `/q` to the backend Service and `/` to
  the frontend Service.
- **Cloudflare Tunnel** terminates public TLS and forwards to nginx-ingress.
- **Azure Key Vault** stores application secrets (DB credentials, Auth0 config);
  they are mounted into the backend pod via the **Key Vault CSI driver**
  bound to a workload identity.

---

## One-time Azure setup

Adjust names to taste. The placeholders below match the variables consumed by
the workflows; pick the values you want, then write them into the matching
GitHub repository variables in the [GitHub configuration](#github-configuration)
section.

```bash
# 0. Login and select the subscription
az login
az account set --subscription 31d159bc-46b7-43e6-a2e8-91d862090644

LOCATION=westeurope
RG=rg-todo-app
ACR=acrtodoapp                  # must be globally unique
AKS=aks-todo-app
KV_STAGING=kv-todo-staging      # must be globally unique
KV_PROD=kv-todo-production      # must be globally unique
GH_OWNER=hostettler
GH_REPO=todo-app

# 1. Resource group
az group create -n "$RG" -l "$LOCATION"

# 2. ACR (admin disabled, anonymous pull disabled)
az acr create -g "$RG" -n "$ACR" --sku Standard --admin-enabled false
# Anonymous pull is off by default; this makes it explicit (and is the only
# subcommand that accepts the flag — it is not available on `az acr create`).
az acr update -g "$RG" -n "$ACR" --anonymous-pull-enabled false
az acr config retention update -r "$ACR" --status enabled --days 90 --type UntaggedManifests
# Optional: lock images so SHA tags cannot be overwritten
# az acr repository update --name $ACR --image todo-backend  --write-enabled false  # after first push
# az acr repository update --name $ACR --image todo-frontend --write-enabled false  # after first push

# 3. Private AKS with workload identity + OIDC issuer
az aks create -g "$RG" -n "$AKS" \
  --enable-managed-identity \
  --enable-oidc-issuer \
  --enable-workload-identity \
  --enable-addons azure-keyvault-secrets-provider \
  --enable-private-cluster \
  --network-plugin azure \
  --node-count 2 \
  --generate-ssh-keys
az aks update -g "$RG" -n "$AKS" --attach-acr "$ACR"

# 4. Install nginx-ingress and Cloudflare Tunnel inside the cluster
#    (see the project root README for the topology). One-time, manual.

# 5. Key Vaults (one per environment is recommended)
for KV in "$KV_STAGING" "$KV_PROD"; do
  az keyvault create -g "$RG" -n "$KV" --enable-rbac-authorization true
  # Seed the secrets the SecretProviderClass expects:
  az keyvault secret set --vault-name "$KV" --name db-jdbc-url   --value "jdbc:postgresql://..."
  az keyvault secret set --vault-name "$KV" --name db-username   --value "todoapp"
  az keyvault secret set --vault-name "$KV" --name db-password   --value "REPLACE_ME"
  az keyvault secret set --vault-name "$KV" --name oidc-issuer   --value "https://<your-tenant>.auth0.com/"
  az keyvault secret set --vault-name "$KV" --name oidc-audience --value "https://api.example.com"
done

# 6. Workload identity for the backend pod (one per environment)
TENANT=$(az account show --query tenantId -o tsv)
OIDC=$(az aks show -g "$RG" -n "$AKS" --query oidcIssuerProfile.issuerUrl -o tsv)
for ENV in staging production; do
  NS="todo-${ENV}"
  KV=$([ "$ENV" = staging ] && echo "$KV_STAGING" || echo "$KV_PROD")
  MI_NAME="mi-todo-backend-${ENV}"
  az identity create -g "$RG" -n "$MI_NAME"
  MI_CLIENT=$(az identity show -g "$RG" -n "$MI_NAME" --query clientId -o tsv)
  MI_OBJID=$(az identity show -g "$RG" -n "$MI_NAME" --query principalId -o tsv)
  # KV access
  KV_ID=$(az keyvault show -n "$KV" --query id -o tsv)
  az role assignment create --assignee-object-id "$MI_OBJID" --assignee-principal-type ServicePrincipal \
    --role "Key Vault Secrets User" --scope "$KV_ID"
  # Federate to the K8s ServiceAccount the backend Deployment uses
  az identity federated-credential create -g "$RG" --identity-name "$MI_NAME" \
    --name "todo-backend-${ENV}" \
    --issuer "$OIDC" \
    --subject "system:serviceaccount:${NS}:todo-backend"
  echo "==> Use clientID ${MI_CLIENT} in deploy/k8s/overlays/${ENV}/kustomization.yaml"
done

# 7. GitHub OIDC identity for CI/CD (one app, multiple federated subjects)
GH_MI=mi-github-todoapp
az identity create -g "$RG" -n "$GH_MI"
GH_CLIENT=$(az identity show -g "$RG" -n "$GH_MI" --query clientId -o tsv)
GH_OBJID=$(az identity show -g "$RG" -n "$GH_MI" --query principalId -o tsv)

# AcrPush on the registry
az role assignment create --assignee-object-id "$GH_OBJID" --assignee-principal-type ServicePrincipal \
  --role AcrPush --scope $(az acr show -g "$RG" -n "$ACR" --query id -o tsv)
# Read the cluster + invoke run-command
AKS_ID=$(az aks show -g "$RG" -n "$AKS" --query id -o tsv)
az role assignment create --assignee-object-id "$GH_OBJID" --assignee-principal-type ServicePrincipal \
  --role "Azure Kubernetes Service Cluster User Role" --scope "$AKS_ID"
az role assignment create --assignee-object-id "$GH_OBJID" --assignee-principal-type ServicePrincipal \
  --role "Azure Kubernetes Service RBAC Writer" --scope "$AKS_ID"
# Federated subjects — DO NOT add `pull_request`
for SUB in \
  "repo:${GH_OWNER}/${GH_REPO}:ref:refs/heads/main" \
  "repo:${GH_OWNER}/${GH_REPO}:ref:refs/tags/v*" \
  "repo:${GH_OWNER}/${GH_REPO}:environment:staging" \
  "repo:${GH_OWNER}/${GH_REPO}:environment:production"; do
  NAME="gh-$(echo "$SUB" | tr ':/' '--')"
  az identity federated-credential create -g "$RG" --identity-name "$GH_MI" \
    --name "${NAME:0:64}" \
    --issuer "https://token.actions.githubusercontent.com" \
    --subject "$SUB" \
    --audience api://AzureADTokenExchange
done
echo "==> GitHub vars.AZURE_CLIENT_ID = ${GH_CLIENT}"
echo "==> GitHub vars.AZURE_TENANT_ID = ${TENANT}"
```

---

## GitHub configuration

### Repository variables (`Settings → Secrets and variables → Actions → Variables`)

| Name                    | Example value                              | Notes                       |
| ----------------------- | ------------------------------------------ | --------------------------- |
| `AZURE_SUBSCRIPTION_ID` | `31d159bc-46b7-43e6-a2e8-91d862090644`     | Steve's personal sub        |
| `AZURE_TENANT_ID`       | `<your tenant guid>`                       | from `az account show`      |
| `AZURE_CLIENT_ID`       | `<clientId of mi-github-todoapp>`          | from step 7 above           |
| `ACR_LOGIN_SERVER`      | `acrtodoapp.azurecr.io`                    |                             |
| `AKS_RESOURCE_GROUP`    | `rg-todo-app`                              |                             |
| `AKS_CLUSTER_NAME`      | `aks-todo-app`                             |                             |

### Environments (`Settings → Environments`)

- **`staging`**
  - Deployment branches: `main` only.
  - No required reviewers.
  - Env variable: `APP_HOST=todo-staging.example.com`.
- **`production`**
  - Deployment branches: protected refs only; restrict to tags `v*.*.*`.
  - Required reviewer: repo owner.
  - Env variable: `APP_HOST=todo.example.com`.

No `secrets` are required — application secrets live in Azure Key Vault.

### Branch protection on `main`

Enable in `Settings → Branches → main`:

- Require status checks to pass before merging:
  `Backend (build, test, coverage)`, `Frontend (lint, test, coverage, build)`,
  `CodeQL (java-kotlin)`, `CodeQL (javascript-typescript)`, `Trivy (filesystem)`.
- Require linear history.
- Require signed commits.
- Require at least 1 review (or solo-owner override).

CLI shortcut (requires admin token):

```bash
gh api -X PUT repos/${GH_OWNER}/${GH_REPO}/branches/main/protection \
  -H "Accept: application/vnd.github+json" \
  --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "Backend (build, test, coverage)",
      "Frontend (lint, test, coverage, build)",
      "CodeQL (java-kotlin)",
      "CodeQL (javascript-typescript)",
      "Trivy (filesystem)"
    ]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": { "required_approving_review_count": 1 },
  "restrictions": null,
  "required_linear_history": true,
  "required_signatures": true,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
```

---

## Customising the Kustomize overlays

Edit the `REPLACE_ME_*` placeholders in
`deploy/k8s/overlays/{staging,production}/kustomization.yaml`:

- `REPLACE_ME_ACR.azurecr.io` → your ACR login server.
- `REPLACE_ME_WORKLOAD_IDENTITY_CLIENT_ID` → `clientId` of the per-environment
  `mi-todo-backend-<env>` managed identity.
- `REPLACE_ME_TENANT_ID` → your Entra tenant ID.
- `REPLACE_ME_<env>_CLIENT_ID` (Auth0) → from your Auth0 SPA app.
- Ingress host → the public hostname behind Cloudflare Tunnel.

Validate locally:

```bash
# kustomize build smoke test (no Kubernetes required)
kustomize build deploy/k8s/overlays/staging  > /tmp/staging.yaml
kustomize build deploy/k8s/overlays/production > /tmp/production.yaml

# Optional schema check
brew install kubeconform   # or: go install github.com/yannh/kubeconform/cmd/kubeconform@latest
kubeconform -strict -summary -schema-location default \
  -schema-location 'https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/{{.Group}}/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json' \
  /tmp/staging.yaml /tmp/production.yaml
```

---

## Deployment lifecycle

| Trigger                  | Workflow                | Environment | Approval     |
| ------------------------ | ----------------------- | ----------- | ------------ |
| PR → `main`              | `ci.yml`                | —           | none         |
| Push to `main`           | `release.yml` → `deploy.yml` | `staging`  | none         |
| Tag `v*.*.*`             | `release.yml` (only)    | —           | n/a          |
| `workflow_dispatch` (manual) | `deploy.yml`        | choice      | per environment |

For a production rollout:

1. Cut a tag: `git tag v0.1.0 && git push origin v0.1.0`.
2. `release.yml` builds, scans, signs, and publishes
   `acrtodoapp.azurecr.io/todo-{backend,frontend}:{sha-XXXXXXX,v0.1.0,latest}`.
3. Manually run **Actions → deploy → Run workflow** with
   `environment=production`, `image_tag=v0.1.0`. Approve the gated deployment.

### Manual rollback

Re-run `Actions → deploy → Run workflow` with the previous SHA tag:

```text
environment: production
image_tag:   sha-<previous-good-short-sha>
```

The workflow renders the overlay with the older tag and re-applies it. AKS
performs a rolling update back to the prior image.

You can also `kubectl rollout undo` directly:

```bash
az aks command invoke -g $RG -n $AKS \
  --command "kubectl -n todo-production rollout undo deployment/todo-backend && kubectl -n todo-production rollout undo deployment/todo-frontend"
```

---

## Validating an end-to-end deploy (one-off, manual)

The full smoke test exercises the spec's §8 scenarios:

1. Open a PR that drops backend coverage below 80 % → CI must fail.
2. Open a PR that introduces a frontend lint error → CI must fail.
3. Merge a green PR to `main` → release + auto-staging deploy succeed; the
   staging URL serves the new image SHA.
4. Tag `v0.1.0` → production deploy is queued and waits for approval; on
   approval, it rolls out and smoke tests pass; the GitHub Deployments tab
   shows the release.
5. Manually re-deploy a previous SHA tag to staging → rollback rolls the
   Deployments to that image without rebuilding.
