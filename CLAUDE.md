# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an educational curriculum and starter kit for teaching developers to build fleet management applications using the Geotab API with "vibe coding" (AI-assisted development). It provides tutorials, code examples, and ready-made prompts for hackathons and developer onboarding.

**Primary languages:** JavaScript (Add-Ins), API-first workflows

## Repository Structure

- `guides/` - Human-readable documentation, tutorials, and prompts
- `examples/addins/` - Geotab Add-In templates (HTML/JS for MyGeotab)
- `skills/` - Code patterns for AI implementation
- `tests/` - Validation test suites (run before committing)
- `AGENT_SUMMARY.md` - Canonical orientation for AI assistants
- `VIBE_CODING_CONTEXT.md` - Quick reference for AI assistants (~400 tokens)

## Key Entry Points

| Audience | Start Here |
|----------|-----------|
| AI assistants needing repo orientation | `AGENT_SUMMARY.md` |
| AI assistants choosing implementation skill | `skills/README.md` |
| AI assistants needing API context | `VIBE_CODING_CONTEXT.md` |
| Building dashboard workflows | `guides/ANTIGRAVITY_QUICKSTART.md` |
| Understanding Add-Ins | `guides/GEOTAB_ADDINS.md` |
| Human learners | `README.md` → choose a path |

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

## Pre-Commit Tests

Before committing changes, run the relevant test suites:

```bash
# Gem validation — run after any change to resources/GEM_INSTRUCTIONS.txt,
# guides/GOOGLE_GEM_CREATOR_GUIDE.md, or Add-In example configs
bash tests/gem-validation/run.sh
```

All tests must pass before pushing. If a test fails, fix the issue and re-run.

### LLM review checklist

After editing `resources/GEM_INSTRUCTIONS.txt`, also read `tests/gem-review/REVIEW_CHECKLIST.md` and verify each question against the instructions. The checklist covers behavioral, correctness, completeness, and tone — things a regex can't catch.

## Code Standards

When writing code examples or snippets:
- Follow language style guides
- Add clear comments and error handling
- Keep examples beginner-friendly

## Add-in Development Standards

Unless told otherwise, **all new page add-ins must use the external React + Zenith structure** — a complete node.js project with webpack, hot-reload dev server, and production build. Use `examples/addins/runner_demo/` as the structural template. Single HTML files and embedded add-ins are only for quick prototypes when explicitly requested.

### Architecture & Setup
- Use latest React and `@geotab/zenith` versions
- Structure: `src/app/scripts/components/` for React, `src/app/styles/` for CSS, `src/translations/` for i18n
- Every add-in must have a **proper AddInId**: a base64-encoded UUID v4 (22 chars). Generate once and hardcode it. Random text labels like `'my-addin-001'` are **not valid**. See `skills/geotab/references/STORAGE_API.md` for the generation pattern
- Use `npm run dev` for development, `npm run build` for deployment

### Zenith UI Design Principles
- **Use Zenith components first** — `Table`, `Button`, `TextInput`, `Tabs`, `Alert`, `Waiting`, etc. Only use custom HTML/CSS when Zenith has no equivalent
- Use Zenith design tokens (`--zenith-spacing-*`, `--zenith-color-*`) for any custom styling to maintain visual consistency with MyGeotab
- Wrap the component tree with `<LanguageProvider language={language}>` from `@geotab/zenith` and pass `language={freshState.language || 'en'}` from `main.js`
- For Zenith `Table` with formatted display values: use `columnComponent.render` for display formatting while keeping raw numeric values in entity properties so sorting works correctly

### Multilingual Support (Required)
- **All UI text** must go through `geotabState.translate(key)` — never hardcode English strings in JSX
- **Always** populate `src/translations/fr.json` with all key/value pairs (French is the minimum required second language)
- Translation keys can be the English string itself (e.g., `"Loading...": "Chargement..."`)
- Unit labels that are identical across languages (mi, gal, lb, MPG) still need entries in fr.json

### Group Filter Integration
- Respect MyGeotab's global group filter via `geotabState.getGroupFilter()` (returns array of group objects)
- Use a single `Get Device` call with the group filter scope, then build shared device/driver lookup maps via React context — do not re-fetch devices in each tab or component
- When the group filter changes, MyGeotab calls `focus()` again — the add-in must re-render with the new filter scope

### UX, Loading & Progress Indicators
- **Never show a blank screen** — always display a loading indicator before API calls
- Use slim, unobtrusive progress bars (not large spinners) for multi-step data loading
- For operations with known progress (batch processing), show determinate progress with percentage
- For operations with unknown duration, use indeterminate animated progress bars
- Provide abort/cancel buttons for long-running optional operations (e.g., fetching GPS locations for events)
- Keep progress indicators visually consistent across all tabs/views — use shared CSS classes

### Progressive Loading
- When processing large datasets in batches, **show results as they arrive** rather than waiting for all batches to complete
- Use a generation counter pattern (`loadGeneration` ref) to prevent stale async updates when the user triggers a new load before the previous one finishes
- Display partial results immediately — tiles and charts should update incrementally as batches complete

### Unit Conversion & Locale Formatting
- Fetch the user's `isMetric` preference from their Geotab profile on mount
- Convert all displayed measurements: km↔mi, L↔gal, kg↔lb, L/100km↔MPG
- Format all numbers with locale-appropriate separators using `Intl.NumberFormat(language)` — French uses spaces, English uses commas
- Keep raw numeric values in state for calculations and sorting; format only at display time

### API Rate Limits & Error Handling
- Batch API calls using `multiCall` where possible to reduce round-trips
- For large date ranges or many devices, break queries into batches (e.g., 7-day chunks, 100-device groups)
- On rate limit errors (429 or "RateLimit" in error message): wait with exponential backoff and retry
- On non-critical failures: degrade gracefully (show partial data with a warning) rather than failing the entire view
- Never loop authentication calls — test credentials once before entering loops

### Common API Gotchas
- `Trip.distance` is in **kilometers** (not meters)
- Odometer from `StatusData` is in **meters** — divide by 1000 for km
- `FuelTransaction.totalFuelUsed` is in liters; idling fuel uses `totalIdlingFuelUsedL` (inconsistent casing)
- `DutyStatusViolation` ignores group filters — filter results client-side
- Disabled rules throw errors when queried — wrap in try/catch
- `ExceptionEvent` has no GPS coordinates — fetch `LogRecord` for the device's time range to get location
- `DeviceStatusInfo` is unreliable for odometer — use `StatusData` with `DiagnosticOdometerId`