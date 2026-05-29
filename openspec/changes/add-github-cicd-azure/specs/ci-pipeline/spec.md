## ADDED Requirements

### Requirement: CI runs on every pull request and push to main
The repository SHALL execute an automated CI workflow for every pull request targeting `main` and for every push to `main`. The workflow MUST complete (success or failure) within 15 minutes on a clean cache and MUST be a required status check for merging into `main`.

#### Scenario: Pull request triggers CI
- **WHEN** a pull request is opened or updated against `main`
- **THEN** the CI workflow is queued automatically
- **AND** its status (success/failure) is reported back to the pull request as a required check

#### Scenario: Push to main triggers CI
- **WHEN** a commit is pushed directly to `main` (e.g. by a merge)
- **THEN** the CI workflow runs on the resulting commit
- **AND** the workflow result is visible on the commit and on the repository Actions page

### Requirement: Backend build, test and coverage gate
The CI workflow SHALL build the backend, run all backend tests (unit + integration), and enforce the existing JaCoCo coverage gate of ≥ 80 % line and branch coverage. The workflow MUST fail if any test fails or the coverage gate is not met.

#### Scenario: Successful backend verification
- **WHEN** `./mvnw -B verify` succeeds with coverage ≥ 80 %
- **THEN** the backend job reports success
- **AND** the JaCoCo HTML and XML reports are uploaded as a workflow artefact named `backend-coverage`

#### Scenario: Failing backend test
- **WHEN** any backend test fails
- **THEN** the backend job fails
- **AND** the surefire/failsafe reports are uploaded as a workflow artefact named `backend-test-reports`

#### Scenario: Backend coverage below threshold
- **WHEN** backend line OR branch coverage is below 80 %
- **THEN** the backend job fails with a message identifying the failing module(s)

### Requirement: Frontend lint, test, coverage gate and build
The CI workflow SHALL install frontend dependencies with `npm ci`, run `npm run lint`, run `npm run test:coverage` (Vitest), and run `npm run build`. The Vitest coverage gate of ≥ 80 % line and branch coverage MUST be enforced. The workflow MUST fail on lint errors, test failures, coverage below threshold, or build errors.

#### Scenario: Successful frontend verification
- **WHEN** lint, coverage tests, and build all succeed and coverage ≥ 80 %
- **THEN** the frontend job reports success
- **AND** the Vitest coverage report is uploaded as a workflow artefact named `frontend-coverage`

#### Scenario: Lint failure
- **WHEN** `npm run lint` exits non-zero
- **THEN** the frontend job fails before running tests

#### Scenario: Frontend coverage below threshold
- **WHEN** frontend line OR branch coverage is below 80 %
- **THEN** the frontend job fails

### Requirement: Caching of build dependencies
The CI workflow SHALL cache Maven (`~/.m2/repository`) and npm (`~/.npm`) dependencies across runs to keep typical PR runs under 10 minutes after the first warm-up.

#### Scenario: Cache hit on subsequent runs
- **WHEN** the dependency lockfiles (`backend/pom.xml`, `frontend/package-lock.json`) have not changed since the previous successful run
- **THEN** the workflow restores Maven and npm caches and does not re-download those dependencies

### Requirement: Static analysis with CodeQL
The CI workflow SHALL run GitHub CodeQL analysis for `java` and `javascript-typescript` on every pull request and every push to `main`. CodeQL findings MUST appear in the repository's Security tab.

#### Scenario: CodeQL analysis runs on a pull request
- **WHEN** a pull request is opened or updated
- **THEN** CodeQL queries for `java` and `javascript-typescript` are executed
- **AND** any new findings introduced by the PR are surfaced as PR annotations

### Requirement: Dependency vulnerability scanning
The CI workflow SHALL scan repository dependencies for known vulnerabilities (using Trivy in filesystem mode) on every pull request and push to `main`. The job MUST fail when a HIGH or CRITICAL vulnerability that is not in `.trivyignore` is detected.

#### Scenario: Vulnerable dependency introduced
- **WHEN** a PR adds a dependency with a known CRITICAL CVE not present in `.trivyignore`
- **THEN** the scan job fails and the PR cannot be merged

#### Scenario: Allow-listed finding
- **WHEN** a finding's CVE ID is listed in `.trivyignore` with a justification comment
- **THEN** the scan job does not fail on that finding

### Requirement: Branch protection enforces CI
The repository configuration SHALL require the CI workflow's checks to pass before a pull request can be merged into `main`. The `main` branch MUST require at least one approving review (or solo-owner override) and a linear history.

#### Scenario: Attempt to merge with failing CI
- **WHEN** a contributor attempts to merge a PR while CI is failing
- **THEN** the merge button is disabled until CI passes

### Requirement: Workflows do not expose cloud credentials in CI
The CI workflow SHALL NOT request `id-token: write` permission and SHALL NOT call `azure/login` or otherwise authenticate to Azure. CI MUST be safe to run on pull requests from external forks (no secrets needed beyond `GITHUB_TOKEN`).

#### Scenario: External fork PR
- **WHEN** a pull request is opened from a fork
- **THEN** the CI workflow runs successfully without any repository secrets being exposed to the fork's code
