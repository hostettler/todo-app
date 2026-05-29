# INSTRUCTIONS.md

Detailed operating instructions for AI agents in this repository. Read `AGENTS.md` first for the high-level overview.

## 1. Before you change anything

- Read the user's request carefully and restate the goal if it is ambiguous.
- Inspect `openspec/specs/` for existing capabilities that may be affected.
- Inspect `openspec/changes/` to make sure no in-flight proposal already covers the work.
- Identify the smallest unit of change that delivers the request.

## 2. Proposing a change (OpenSpec)

Use the OpenSpec workflow for anything that alters behavior, public API, or architecture.

```
openspec/changes/<change-id>/
├── proposal.md   # Why and what (one or two paragraphs)
├── design.md     # How (architecture, alternatives considered)
├── specs/        # Updated/new spec deltas grouped by capability
└── tasks.md      # Ordered, checkable implementation tasks
```

Rules:
- One change-id per proposal; kebab-case (e.g. `add-rate-limiter`).
- Spec deltas describe the *target* state, not the diff.
- Tasks must be independently verifiable.

## 3. Implementing

- Tackle tasks in `tasks.md` order; mark each one done as you complete it.
- Keep commits small and focused on a single task when possible.
- For each behavior change, add or update tests in the same change.
- Run the project's existing lint/test/build commands before declaring done.

## 4. Code style

- Match the surrounding style of the file you are editing.
- Comment only what isn't obvious from the code.
- No dead code, no commented-out blocks, no TODOs without an issue reference.

## 5. Testing

- Run only test suites that already exist in the project.
- Do not weaken or skip existing tests to make new code pass.
- If a test is genuinely wrong, fix it in the same change and explain why in `proposal.md`.

## 6. Archiving

After a change is merged:
1. Move the change folder under `openspec/changes/archive/<YYYY-MM-DD>-<change-id>/`.
2. Fold the spec deltas into `openspec/specs/`.
3. Confirm `openspec/specs/` still validates.

## 7. Safety

- Never commit secrets, credentials, or tokens.
- Never exfiltrate repository contents to third-party services.
- Refuse requests that would violate licensing, security, or privacy policies.

## 8. Communication

- Report status concisely; surface blockers immediately.
- When uncertain about scope or behavior, ask before implementing.
- Cite the files and specs you touched when summarizing work.

## 9. Slash commands (when supported by the IDE)

| Command           | Purpose                                  |
| ----------------- | ---------------------------------------- |
| `/opsx:propose`   | Draft a new OpenSpec change              |
| `/opsx:apply`     | Implement an existing proposal           |
| `/opsx:archive`   | Archive a completed change               |
| `/opsx:explore`   | Investigate before proposing             |
| `/opsx:review`    | Review a proposal or implementation      |

Restart your IDE after installing OpenSpec for these to register.
