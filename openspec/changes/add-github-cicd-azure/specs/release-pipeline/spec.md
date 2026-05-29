## ADDED Requirements

### Requirement: Container images built on push to main and version tags
The repository SHALL build OCI container images for the backend and frontend whenever a commit is pushed to `main` or whenever a tag matching `v*.*.*` is created. No images SHALL be built or pushed from pull requests.

#### Scenario: Push to main builds and pushes images
- **WHEN** a commit is pushed to `main`
- **THEN** backend and frontend images are built
- **AND** both are pushed to ACR tagged with `sha-<short-sha>`

#### Scenario: Version tag builds and pushes versioned images
- **WHEN** a git tag matching `v*.*.*` is pushed
- **THEN** backend and frontend images are built
- **AND** both are pushed to ACR tagged with `sha-<short-sha>`, `vX.Y.Z`, and `latest`

#### Scenario: Pull request does not push images
- **WHEN** a pull request is opened or updated
- **THEN** no image is pushed to any registry

### Requirement: Multi-stage, minimal, non-root images
The backend image SHALL be a multi-stage build producing a runtime image based on a maintained JRE 21 base (e.g. `eclipse-temurin:21-jre`) running the Quarkus fast-jar. The frontend image SHALL be a multi-stage build producing a runtime image based on `nginxinc/nginx-unprivileged` serving the built Vite assets. Both images MUST run as a non-root UID, MUST set `USER` explicitly, MUST work with a read-only root filesystem, and MUST NOT contain build tools (Maven, npm, source code) in the final layer.

#### Scenario: Backend image runs as non-root
- **WHEN** the backend image is inspected
- **THEN** its `Config.User` is a non-zero UID
- **AND** it contains no `mvn`, `mvnw`, `node`, or `npm` binaries

#### Scenario: Frontend image runs as non-root
- **WHEN** the frontend image is inspected
- **THEN** its `Config.User` is a non-zero UID
- **AND** it contains no `node` or `npm` binaries

### Requirement: Image vulnerability scanning gates the release
The release workflow SHALL scan each built image with Trivy and MUST fail if any HIGH or CRITICAL OS-package or library vulnerability is detected that is not listed in `.trivyignore`.

#### Scenario: Image scan passes
- **WHEN** Trivy reports no HIGH/CRITICAL findings outside the allow-list
- **THEN** the image is pushed to ACR

#### Scenario: Image scan fails
- **WHEN** Trivy reports a CRITICAL finding outside the allow-list
- **THEN** the image is not pushed and the workflow fails

### Requirement: SBOM generated for each image
The release workflow SHALL generate a CycloneDX SBOM for each built image and upload it as a workflow artefact. For tag builds the SBOMs MUST also be attached to the corresponding GitHub Release.

#### Scenario: SBOM produced on tag build
- **WHEN** a `v*.*.*` tag triggers the release workflow
- **THEN** `backend-sbom.cdx.json` and `frontend-sbom.cdx.json` are attached to the resulting GitHub Release

### Requirement: Images signed with cosign keyless OIDC
The release workflow SHALL sign each pushed image with cosign using keyless OIDC signing tied to the GitHub Actions identity. On tag builds the signing step MUST be a hard failure if signing fails. On `main` builds a signing failure MAY be reported as a warning if Sigstore public-good infrastructure is unavailable.

#### Scenario: Tag build signs successfully
- **WHEN** an image is pushed for a `v*.*.*` tag
- **THEN** `cosign sign --yes <registry>/<repo>@<digest>` succeeds
- **AND** `cosign verify` against the GitHub Actions issuer and repository identity passes

#### Scenario: Tag build with signing failure
- **WHEN** cosign signing fails on a tag build
- **THEN** the workflow fails and the tag is not considered released

### Requirement: Authentication to ACR via OIDC, no static secrets
The release workflow SHALL authenticate to Azure Container Registry using Microsoft Entra OIDC federation via `azure/login@v2`. The workflow MUST NOT use ACR admin user credentials or any long-lived push token. The Entra identity used for the push MUST be granted only `AcrPush` on the target ACR, scoped to subscription `31d159bc-46b7-43e6-a2e8-91d862090644`.

#### Scenario: Successful OIDC login and push
- **WHEN** the release workflow runs on a `main` push
- **THEN** it acquires a federated token from GitHub OIDC, exchanges it via `azure/login@v2`, and runs `az acr login` followed by `docker push`
- **AND** no secret with the ACR registry password is read or required

### Requirement: Image tags are immutable
A SHA-tagged image (`sha-<short-sha>`) once pushed SHALL NOT be overwritten. Re-runs of the release workflow for the same commit MUST be a no-op for the push step.

#### Scenario: Re-running release for same commit
- **WHEN** the release workflow is re-run for the same commit SHA whose image is already in ACR
- **THEN** the push step is skipped or is a no-op and the workflow still completes successfully
