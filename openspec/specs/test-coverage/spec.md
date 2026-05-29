# test-coverage Specification

## Purpose
TBD - created by archiving change add-todo-app. Update Purpose after archive.
## Requirements
### Requirement: Minimum automated test coverage
Both the backend and the frontend SHALL achieve at least **80% line coverage AND 80% branch coverage** measured by their respective coverage tools, computed across all production code. The build SHALL fail when coverage falls below either threshold.

#### Scenario: Backend below threshold
- **WHEN** the backend Maven build is executed (`./mvnw verify`)
- **AND** measured line coverage OR branch coverage is below 80% over all classes under `com.example.todo` (excluding generated code and DTOs that contain no logic)
- **THEN** the build fails with a coverage-rule violation reported by JaCoCo
- **AND** the failure message identifies the rule (line / branch) and the actual percentage

#### Scenario: Backend at or above threshold
- **WHEN** the backend build is executed
- **AND** both line coverage and branch coverage are at least 80%
- **THEN** the build succeeds
- **AND** a JaCoCo HTML report is produced at `backend/target/site/jacoco/index.html`

#### Scenario: Frontend below threshold
- **WHEN** the frontend coverage build is executed (`npm run test:coverage`)
- **AND** measured line coverage OR branch coverage is below 80% over all source files under `frontend/src` (excluding generated code, type-only files, and `*.test.*`)
- **THEN** the command exits non-zero
- **AND** the output identifies which metric and file(s) caused the failure

#### Scenario: Frontend at or above threshold
- **WHEN** the frontend coverage build is executed
- **AND** both line and branch coverage are at least 80%
- **THEN** the command exits zero
- **AND** an HTML coverage report is produced at `frontend/coverage/index.html`

### Requirement: Coverage thresholds are enforced by the build, not by humans
The coverage thresholds SHALL be configured in checked-in build files (`backend/pom.xml` JaCoCo plugin, `frontend/vitest.config.*`) so that no developer can ship code below the threshold without changing those files in the same commit.

#### Scenario: Removing a coverage check requires a code change
- **WHEN** a developer attempts to lower or remove a coverage threshold
- **THEN** they must modify a tracked configuration file (`pom.xml` or `vitest.config.*`)
- **AND** the change is visible in code review

### Requirement: Exclusions from coverage are explicit and justified
Coverage exclusions (for example generated code, DTO records with no logic, the application main class, framework boilerplate) SHALL be enumerated explicitly in the build configuration, not hidden behind broad wildcard patterns over entire packages.

#### Scenario: Adding an exclusion
- **WHEN** a class or file is excluded from coverage
- **THEN** it is listed individually (or via a narrow glob) in the JaCoCo or Vitest configuration
- **AND** the configuration includes a comment explaining why the file is excluded

