# CLAUDE.md

See AGENTS.md first.

## Claude Code Specific Instructions

Use Claude Code primarily for planning, architecture review, risk analysis, refactor strategy, code review, and documentation review.

Before broad edits:

1. Read AGENTS.md.
2. Query or inspect graphify-out/graph.json if available.
3. Read docs/AI_WORKSPACE_CONTEXT.md if the central Obsidian vault is not mounted.
4. Read only the governing project docs needed for the task. Start from README.md and the AGENTS.md current phase rules.
5. Classify the request as Release 1 stabilization, Release 1 blocker, Release 2 candidate, or explicit user-approved scope expansion.
6. Explain the plan before structural changes.
7. Do not edit files that Codex is actively editing.

## Graphify Refresh (Any OS)

Windows:

```powershell
& "C:\Users\user\Documents\00 AI agent\setup\build_multi_project_graphs.ps1" -Only virtual-firm
```

Linux/macOS or Claude sandbox:

```bash
./scripts/graphify.sh --version
```

If the sandbox cannot run the Windows PowerShell wrapper, use scripts/graphify.sh or run the underlying `graphify` command directly after installing the PyPI package `graphifyy`.

Graph refresh is part of done criteria after meaningful code, schema, docs, or relationship changes.

## Current Durable State

Before planning or review, read `docs\AI_WORKSPACE_CONTEXT.md` and `docs\00_project_control\AI_DEVELOPMENT_WORKSPACE_GRAPHIFY_OBSIDIAN_PROTOCOL_v1.0.md` for the compact current state. Do not rely on older Release 1 wording if the compact bridge records later accepted scopes.