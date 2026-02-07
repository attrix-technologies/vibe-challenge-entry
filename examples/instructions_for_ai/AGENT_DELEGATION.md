# Agent Delegation Guide (Current)

This repository no longer maintains the legacy `examples/python/` task folders.

## Use this instead

For Python workflows, route agents to guide-based paths:

1. [`guides/ANTIGRAVITY_QUICKSTART.md`](../../guides/ANTIGRAVITY_QUICKSTART.md) for dashboard-first development.
2. [`guides/API_REFERENCE_FOR_AI.md`](../../guides/API_REFERENCE_FOR_AI.md) for API patterns and troubleshooting.
3. [`VIBE_CODING_CONTEXT.md`](../../VIBE_CODING_CONTEXT.md) for low-token session bootstrap.

For Add-In implementation, use:

- [`skills/geotab/SKILL.md`](../../skills/geotab/SKILL.md)
- [`skills/geotab/references/ADDINS.md`](../../skills/geotab/references/ADDINS.md)

## Delegation prompt template

```text
Use the geotab skill.

Goal: [describe what to build].

Start with VIBE_CODING_CONTEXT.md for API setup.
If the task is a MyGeotab Add-In, load skills/geotab/references/ADDINS.md.
If the task is a Python dashboard, follow guides/ANTIGRAVITY_QUICKSTART.md and use guides/API_REFERENCE_FOR_AI.md for call patterns.

Return:
1) working code,
2) setup steps,
3) test steps,
4) known limitations.
```
