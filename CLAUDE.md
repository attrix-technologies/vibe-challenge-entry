# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an educational curriculum and starter kit for teaching developers to build fleet management applications using the Geotab API with "vibe coding" (AI-assisted development). It provides tutorials, code examples, and ready-made prompts for hackathons and developer onboarding.

**Primary languages:** Python (examples), JavaScript (Add-Ins)

## Repository Structure

- `guides/` - Human-readable documentation, tutorials, and prompts
- `examples/python/` - Task-based Python code challenges (01-06 folders, build sequentially)
- `examples/addins/` - Geotab Add-In templates (HTML/JS for MyGeotab)
- `skills/` - Code patterns for AI implementation
- `VIBE_CODING_CONTEXT.md` - Quick reference for AI assistants (~400 tokens)

## Key Entry Points

| Audience | Start Here |
|----------|-----------|
| AI assistants needing API context | `VIBE_CODING_CONTEXT.md` |
| Building Python examples | `examples/instructions_for_ai/AGENT_DELEGATION.md` |
| Understanding Add-Ins | `guides/GEOTAB_ADDINS.md` |
| Human learners | `README.md` → choose a path |

## Development Setup

### Python Examples
```bash
pip install python-dotenv requests mygeotab
```

### Credentials
All scripts load credentials from `.env` in the repository root:
```
GEOTAB_DATABASE=database_name
GEOTAB_USERNAME=email@domain.com
GEOTAB_PASSWORD=password
GEOTAB_SERVER=my.geotab.com
```

**Critical rules:**
- Never hardcode credentials
- Add `.env` to `.gitignore`
- Call `load_dotenv()` before any `os.getenv()`
- No quotes in .env values unless password has spaces
- Test credentials ONCE before loops (failed auth locks account 15-30min)

## Geotab API Pattern

```python
from dotenv import load_dotenv
import os, requests
load_dotenv()

url = f"https://{os.getenv('GEOTAB_SERVER')}/apiv1"
auth = requests.post(url, json={"method": "Authenticate", "params": {
    "database": os.getenv('GEOTAB_DATABASE'),
    "userName": os.getenv('GEOTAB_USERNAME'),
    "password": os.getenv('GEOTAB_PASSWORD')
}})
creds = auth.json()["result"]["credentials"]

# Subsequent calls
resp = requests.post(url, json={"method": "Get", "params": {
    "typeName": "Device", "credentials": creds
}})
```

Common TypeNames: `Device`, `Trip`, `User`, `StatusData`, `LogRecord`, `FuelTransaction`, `Route`, `Zone`, `Group`, `Diagnostic`

API Reference: https://geotab.github.io/sdk/software/api/reference/

## Code Standards

When building Python examples:
- Follow PEP 8
- Add type hints and docstrings
- Keep code beginner-friendly with inline comments
- Test with real Geotab credentials
- Include error handling for network failures, invalid credentials, and empty results
- Each example folder needs: working scripts, `README.md`, `requirements.txt`

## Building Python Examples

Work sequentially through `examples/python/` folders:
1. `01_authentication/` - Start here (foundation)
2. `02_fetch_data/` - Data fetching
3. `03_cli_dashboard/` - CLI dashboards
4. `04_web_dashboard/` - Web dashboards
5. `05_ace_integration/` - Geotab Ace API (mock if unavailable)
6. `06_complete_apps/` - Full applications

Each folder has a `TASK.md` with specific requirements and "vibe prompts."

## Documentation Style

This is educational content. When writing documentation:
- Use narrative, conversational tone
- Target beginners who may be new to coding
- Explain concepts, don't assume knowledge
- Include ready-made prompts users can copy-paste to AI tools
