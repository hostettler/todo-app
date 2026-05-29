# AGENTS.md

Guidance for AI coding agents (Claude Code, GitHub Copilot, Cursor, Codex, etc.) working in this repository.

## Project

Scalability test workspace. OpenSpec is installed for spec-driven development.

## Workflow

This project uses **OpenSpec** (https://github.com/Fission-AI/OpenSpec) for managing specifications and changes.

- Active specs live in `openspec/specs/`
- Proposed changes live in `openspec/changes/`
- Use the `/opsx:propose`, `/opsx:apply`, and `/opsx:archive` slash commands (available in supported IDEs) to drive the lifecycle.

### Standard loop
1. **Explore** — understand the relevant code and existing specs before proposing changes.
2. **Propose** — create a change in `openspec/changes/<change-id>/` with `proposal.md`, `design.md`, `specs/`, and `tasks.md`.
3. **Apply** — implement tasks one at a time, keeping production code and tests in sync.
4. **Archive** — once merged and validated, move the change into the spec history.

## Conventions

- Make precise, surgical edits. Don't touch unrelated code.
- Update or add tests alongside behavior changes.
- Never commit secrets.
- Prefer existing tooling (linters, formatters, test runners) — do not introduce new ones without explicit need.
- Keep documentation in sync with code changes that affect public behavior.

## Tooling installed

- OpenSpec CLI (`npx @fission-ai/openspec`)
- Agent integrations: GitHub Copilot, Claude Code, Cursor, Codex

## Where to look

| Need                          | Location                          |
| ----------------------------- | --------------------------------- |
| Current specs                 | `openspec/specs/`                 |
| In-flight change proposals    | `openspec/changes/`               |
| Claude commands & skills      | `.claude/commands/`, `.claude/skills/` |
| Copilot prompts & skills      | `.github/prompts/`, `.github/skills/`  |
| Cursor rules                  | `.cursor/`                        |
| Codex config                  | `.codex/`                         |
| Detailed agent instructions   | `INSTRUCTIONS.md`                 |
