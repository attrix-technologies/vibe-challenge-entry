# Fault Monitoring: Understanding Vehicle Diagnostic Trouble Codes

> **What is it?** Fault monitoring tracks the lifecycle of vehicle fault codes — from when a problem first appears, through its active state, to when it clears (or doesn't). Instead of seeing a raw list of fault events, you get organized **fault cycles** that tell you whether a problem is ongoing, how long the vehicle has been driving with it, and how many miles have accumulated since it started.

> **Who is this for?** Anyone working with vehicle fault data — whether through the Data Connector, the MyGeotab API, or Ace. The concepts here apply regardless of how you access the data. If you're building maintenance dashboards, predictive maintenance tools, or fleet health reports, start here.

> **Access methods:**
> - **Data Connector:** `FaultMonitoring` and `FaultMonitoring_Daily` tables (requires Pro plan or higher)
> - **MyGeotab API:** `FaultData` entity for raw fault events
> - **Ace:** Natural language queries about vehicle faults

> **Demo account data varies.** Fault data availability depends on which demo database you create. We tested two 50-vehicle demos (Feb 2026):
>
> | Data Source | USA Daytime (Passenger, Las Vegas) | European Long Distance (Vans & Trucks, Spain/Portugal) |
> |---|---|---|
> | `FaultMonitoring` (OData) | 0 records | 10 fault cycles |
> | `FaultMonitoring_Daily` (OData) | 0 records | 281 daily records |
> | `FaultData` (API) | 0 records | 6,962 fault events |
> | `ExceptionEvent` (API) | 50,000 records | 28,566 records |
>
> The European fleet's faults were all **GoDevice faults** (GPS antenna unplugged, engine hours stale) — not engine DTCs (OBD-II/J1939). These still demonstrate the full fault cycle lifecycle (persistent cycles, durations, counts), but won't have breakdown risk scores (those apply to engine DTCs only). Real production fleets will have both GoDevice and engine faults.
>
> **If your demo database has no fault data:** Try creating another demo with a different location/vocation/type of fleet. The European Long Distance / Vans & Trucks configuration had fault data; the USA Daytime / Passenger configuration did not. See [DEMO_DATABASE_REFERENCE.md](./DEMO_DATABASE_REFERENCE.md#what-data-each-profile-has-tested-feb-2026) for the full comparison. Exception events (speeding, harsh cornering, etc.) are always available regardless of configuration.
>
> See [Demo Database Test Results](#demo-database-test-results) below for the full breakdown of what each database contains and how OData, API, and Ace compare for fault monitoring.

## Where Do Fault Codes Come From?

Geotab gathers fault codes from two primary sources:

**Diagnostic Trouble Codes (DTCs):** These codes signal potential vehicle problems. Some are legally mandated, others are manufacturer-specific. The two common standards are:
- **OBDII** — Light and medium-duty vehicles. The codes you see when a "check engine" light comes on.
- **J1939** — Heavy-duty vehicles (trucks, buses, construction equipment). Uses SPN/FMI codes instead of OBDII PIDs.

**GoDevice-Specific Faults:** These codes flag issues with the Geotab telematics device itself, or combine vehicle data to generate a fault code based on device logic. These are separate from engine DTCs.

The `DiagnosticType` column tells you which type you're looking at (OBDII, SPN, PID/SID, etc.).

## Fault Cycles Explained

Raw fault data is a stream of individual events — "fault X detected at time Y." That's hard to work with. Fault monitoring organizes these events into **cycles** that answer practical questions:

### What is a Fault Cycle?

A fault cycle groups consecutive fault detections of the same type on the same vehicle. The cycle starts when the fault first appears and ends when enough ignition cycles pass without the fault being detected.

Here's how it works:

1. **Fault detected** → A new cycle opens with a unique ID
2. **Fault persists across ignition cycles** → The cycle stays open, timestamps and odometer values update
3. **Fault stops appearing** → After enough "clean" ignition cycles (no fault detected), the cycle closes
4. **Same fault reappears later** → A new cycle opens with a new ID — it's treated as a separate occurrence

### Fault States Within a Cycle

Each fault in a cycle goes through states that reflect the DTC lifecycle:

| State | What It Means |
|---|---|
| **Pending** | Fault condition detected but not yet confirmed. The vehicle's computer has seen the issue but is waiting to see if it recurs. |
| **Active** | Fault condition is actively present. The vehicle is currently experiencing the problem. |
| **Confirmed** | Fault has been confirmed through multiple detection cycles. The problem is verified and persistent. |

Not every fault goes through all three states — it depends on the DTC standard and the vehicle's diagnostic system.

### Persistent vs. Closed Cycles

The `IsPersistentCycle` field is the most important flag:

- **`True` (Persistent):** The fault cycle is ongoing. The vehicle currently has this fault. The `AnyStatesDateTimeLastSeen` timestamp can still update as new detections occur.
- **`False` (Closed):** Enough clean ignition cycles passed — the fault is no longer active. The cycle has a defined start and end.

### Reading the Timeline

Use these column pairs to understand the full picture:

| Question | Columns to Use |
|---|---|
| When did this fault cycle start and end? | `AnyStatesDateTimeFirstSeen`, `AnyStatesDateTimeLastSeen` |
| Is it still happening? | `IsPersistentCycle` |
| How long was it in each state? | `PendingDuration`, `ActiveDuration`, `ConfirmedDuration` |
| How far did the vehicle drive with this fault? | `PendingDistance`, `ActiveDistance`, `ConfirmedDistance` |
| How many times was the fault detected in each state? | `PendingCount`, `ActiveCount`, `ConfirmedCount` |
| What was the odometer at key moments? | `*OdometerFirstSeen`, `*OdometerLastSeen` for each state |

## Risk of Breakdown — Fault Severity (Beta)

> **Note:** This feature is currently in development and is considered Beta. It may change at any time.

The risk of breakdown model correlates fault lifecycles with towing events across the Geotab fleet. It answers: "Given this fault code, what's the chance the vehicle ends up getting towed?"

### Severity Tiers

| Severity | Chance of Tow | What It Means |
|---|---|---|
| Low | 0–4% | Fault rarely leads to a towing event. Monitor but not urgent. |
| Medium | 4–8.5% | Moderate risk. Schedule maintenance soon. |
| High | 8.5–15% | Significant risk. Prioritize repair. |
| Critical | >15% | High likelihood of breakdown. Immediate attention needed. |

This data is derived from fleet-wide patterns — it's statistical, not diagnostic. A "Critical" fault code doesn't guarantee a breakdown, but it means vehicles with this code historically have a high rate of towing events.

## Prompts to Try

These prompts work with any AI tool. Adjust the data access method to your setup.

### Prompt 1: "What's Broken Right Now?" (Data Connector)

```text
Using the Data Connector, query the FaultMonitoring table and show me:

1. All persistent fault cycles (IsPersistentCycle = true)
2. Group by fault code — which fault codes affect the most vehicles?
3. For each persistent fault, show how long the vehicle has been driving with it
   (use AnyStatesDateTimeFirstSeen to calculate duration)
4. Flag any faults where ActiveDistance or ConfirmedDistance exceeds 1000 km

Give me a priority list: which vehicles need attention first?
```

### Prompt 2: "Fault History Timeline" (Data Connector)

```text
Using FaultMonitoring_Daily from the Data Connector, pull the last 30 days of fault activity.

Show me:
1. How many unique fault codes were active per day across the fleet
2. Which vehicles had the most fault-days (a vehicle with 3 faults on one day = 3 fault-days)
3. Are there any fault codes that appear across multiple vehicles? (fleet-wide issues)
4. Create a timeline showing fault activity trending up or down

Use ?$search=last_30_day for the date filter.
```

### Prompt 3: "Maintenance Priority Report" (Data Connector)

```text
Combine FaultMonitoring with LatestVehicleMetadata from the Data Connector.

For each vehicle with persistent faults:
1. Show vehicle name, VIN, manufacturer, model
2. List all active fault codes with descriptions
3. Show how long each fault has been present (duration) and distance driven
4. Include the vehicle's last known location (GPS) and odometer

Sort by: vehicles with the most persistent faults first, then by longest fault duration.
Format this as a maintenance work order that a fleet manager could hand to a mechanic.
```

### Prompt 4: "Fleet-Wide Fault Trends" (Data Connector)

```text
Using FaultMonitoring from the Data Connector, analyze fleet-wide fault patterns:

1. What are the top 10 most common fault codes across all vehicles (persistent and closed)?
2. For each, show: fault code, description, DiagnosticType (OBDII vs J1939 vs other),
   total number of cycles, how many are currently persistent
3. What percentage of the fleet has at least one persistent fault?
4. Are there any fault codes that tend to recur? (same fault code, multiple closed cycles
   on the same vehicle)

This helps identify systemic issues vs. one-off problems.
```

### Prompt 5: "Fault Codes via the API" (MyGeotab API)

```text
Using the Geotab MyGeotab API, query FaultData to get recent fault codes.

My credentials are in a .env file (GEOTAB_DATABASE, GEOTAB_USERNAME, GEOTAB_PASSWORD, GEOTAB_SERVER).

1. Authenticate and get credentials
2. Query FaultData for the last 7 days using a search with fromDate
3. Show me the most common diagnostic codes
4. Group faults by device to show which vehicles have the most issues
5. For each fault, show the diagnostic name, fault state, and datetime

Use the standard API at https://{server}/apiv1 with JSON-RPC calls.
```

### Prompt 6: "What's Broken Right Now?" (Ace — No Code)

```text
Which vehicles in my fleet have persistent fault codes right now?

For each, show the vehicle name, fault code, description, how many days
it's been active, and the distance driven with the fault.
```

This prompt works directly in Ace (the natural language query tool in MyGeotab). Ace will generate SQL against `FaultMonitoring`, join with `LatestVehicleMetadata` for device names, and filter to `IsPersistentCycle = TRUE`. See [Ace for Fault Monitoring](#ace-for-fault-monitoring) for what this returns on demo databases.

---

## Available Data

### FaultMonitoring Table (Snapshot — No Date Filter)

The main table for fault cycle analysis. Each row is one fault cycle on one vehicle.

**Key columns for getting started:**

| Column | What It Tells You |
|---|---|
| `DeviceId` | Which vehicle |
| `FaultCode` + `FaultCodeDescription` | What the problem is |
| `DiagnosticType` | What standard (OBDII, SPN/J1939, etc.) |
| `AnyStatesDateTimeFirstSeen` | When the cycle started |
| `AnyStatesDateTimeLastSeen` | When last detected (or cycle ended) |
| `IsPersistentCycle` | Is it still happening? |

**Detailed state columns** (Pending, Active, Confirmed — each has DateTime, Odometer, Duration, Distance, Count variants). See the [Data Connector skill reference](../skills/geotab/references/DATA_CONNECTOR.md) for the full schema.

### FaultMonitoring_Daily Table (Time-Series — Use `$search`)

Daily log of every fault cycle. One row per fault-cycle per day, between the cycle's first-seen and last-seen dates. Useful for trending and day-by-day analysis. Same fault identification columns as FaultMonitoring but without the lifecycle/duration columns.

---

## Ace for Fault Monitoring

Geotab Ace can answer fault monitoring questions in natural language. It generates SQL against the same OData tables and returns results — no code needed.

### What Ace Does Well

When asked about persistent faults, Ace generated this SQL:

```sql
SELECT t_meta.DeviceName, t_fault.DeviceId, t_fault.FaultCode,
       t_fault.FaultCodeDescription,
       ROUND(DATETIME_DIFF(CURRENT_DATETIME(...),
             t_fault.ActiveDateTimeFirstSeen, HOUR) / 24, 2) AS ActiveDuration_Days,
       t_fault.ActiveDistance AS ActiveDistance_Km
FROM FaultMonitoring AS t_fault
JOIN LatestVehicleMetadata AS t_meta ON t_fault.DeviceId = t_meta.DeviceId
WHERE t_fault.IsPersistentCycle = TRUE
```

It correctly:
- Joined with `LatestVehicleMetadata` to include device names
- Calculated duration in days from `ActiveDateTimeFirstSeen`
- Filtered to persistent cycles with `IsPersistentCycle = TRUE`
- Selected meaningful columns (fault code, description, duration, distance)

### Ace Results on the European Fleet

Ace returned 4 persistent faults:

| Vehicle | Fault | Active Days | Active Distance |
|---|---|---|---|
| Demo - 13 | GPS antenna unplugged | 48.0 days | 885,800 km |
| Demo - 36 | Engine hours stale | 47.8 days | — |
| Demo - 38 | Engine hours stale | 47.3 days | — |
| Demo - 40 | Engine hours stale | 48.0 days | — |

OData returned 10 cycles (5 GPS antenna + 5 engine hours stale). Ace returned 4 because its `IsTracked = TRUE` filter excluded some vehicles, and the `preview_array` is capped at 10 rows (full results available via `signed_urls`).

### Ace on the Vegas Fleet

Ace correctly returned empty results — no persistent faults exist on that database. It generated valid SQL and confirmed 0 preview rows.

### Timing Comparison

| Channel | Time | Records | Notes |
|---|---|---|---|
| OData `FaultMonitoring` | 1.5s | 10 fault cycles | Full lifecycle columns, ready to use |
| API `FaultData` | 0.9s | 6,962 raw events | Individual fault detections, need aggregation |
| Ace (via `GetAceResults` API) | 101.7s | 4 rows (preview) | Natural language → SQL, auto-joined with device names |

Ace is the slowest option but requires no code and returns human-readable results with device names. Use it for ad-hoc exploration; use OData or the API for dashboards and automation.

---

## OData vs API for Fault Data

The OData Data Connector and the MyGeotab API both provide fault data, but in different forms:

| Aspect | OData (`FaultMonitoring`) | API (`FaultData`) |
|---|---|---|
| **What you get** | Organized fault cycles with lifecycle tracking | Raw individual fault events |
| **Persistent faults** | `IsPersistentCycle` flag | Must infer from event patterns |
| **Duration/distance** | Built-in columns per state | Must calculate from events |
| **Breakdown risk** | `BreakdownRisk` column (when available) | Not available |
| **Speed** | 1.5s for 10 cycles | 0.9s for 6,962 events |
| **Best for** | "What's broken now?" dashboards | Detailed fault event analysis |

The OData `FaultMonitoring` table does the hard work for you — it groups raw events into cycles and tracks the lifecycle. The API gives you the raw events if you need to build custom logic.

### When to Use Each

- **OData:** You want a dashboard that shows current fleet health, persistent faults, and maintenance priorities. The data is pre-organized into cycles.
- **API:** You need to analyze individual fault detection events, build custom aggregation, or work within a MyGeotab Add-In where OData isn't available.
- **Ace:** You want quick answers about faults without writing code. Good for exploration and ad-hoc queries.

---

## Demo Database Test Results

Full results from testing fault monitoring across two demo databases (Feb 2026). Each database had 50 active vehicles.

### Database 1: USA Daytime (No DTCs, 50,000 Exception Events)

This database's vehicles don't generate engine or OBD fault codes. All fault-related tables (OData and API) returned empty.

However, the API returned **50,000 exception events** — driving behavior detections triggered by Geotab's built-in safety rules:

| Exception Rule | Description | Count | % |
|---|---|---|---|
| Posted Speeding | Vehicle exceeded posted road speed limit | 36,384 | 72.8% |
| Harsh Cornering | Accelerometer detected a sharp turn | 9,071 | 18.1% |
| Hard Acceleration | Rapid acceleration from a stop | 4,545 | 9.1% |

These are **not diagnostic fault codes** — they're rule-based exceptions that Geotab evaluates automatically from GPS, accelerometer, and speed data. The database has 12 rules configured (10 stock, 2 custom), but only 3 fired during the test period.

<details>
<summary>All 12 rules on the database</summary>

| Rule | Type | Fired? |
|---|---|---|
| Speeding | Stock | 36,384 events |
| Harsh Cornering | Stock | 9,071 events |
| Hard Acceleration | Stock | 4,545 events |
| Harsh Braking | Stock | No |
| Seat Belt | Stock | No |
| Major Collision | Stock | No |
| Minor Collision | Stock | No |
| Engine Light On | Stock | No |
| Possible Collision (Legacy) | Stock | No |
| Application Exception | Stock | No |
| Engine Fault Exception | Custom | No |
| Max Speed | Custom | No |

</details>

### Database 2: European Long Distance (Real Fault Cycles + Exception Events)

This database has both diagnostic fault data and exception events.

**OData: FaultMonitoring (10 fault cycles)** — 10 persistent fault cycles across 10 vehicles, all GoDevice faults:

| Fault Code | Description | Count | All Persistent? |
|---|---|---|---|
| 466 | Fault - engine hours stale | 5 | Yes |
| — | GPS antenna unplugged | 5 | Yes |

Example fault cycle record:

```json
{
  "DeviceId": "b24",
  "FaultCode": "466",
  "FaultCodeDescription": "Fault - engine hours stale",
  "DiagnosticType": "GoFault",
  "ControllerDescription": "Telematics device",
  "AnyStatesDateTimeFirstSeen": "2025-12-25T03:30:15Z",
  "AnyStatesDateTimeLastSeen": "2026-02-09T20:49:41Z",
  "IsPersistentCycle": true,
  "ActiveDuration": 351889,
  "ActiveCount": 47,
  "BreakdownRisk": null
}
```

This fault has been active for 47 days (since Dec 25, 2025), detected 47 times. No breakdown risk score — that feature applies to engine DTCs, not GoDevice faults.

**OData: FaultMonitoring_Daily (281 records)** — Daily fault activity across 10 vehicles, spanning Jan 11 – Feb 9, 2026. Two fault types appearing consistently:
- "Fault - engine hours stale" — 143 daily records
- "GPS antenna unplugged" — 138 daily records

**API: FaultData (6,962 raw events)** — The raw fault event stream, covering Dec 8, 2025 – Feb 10, 2026:

| Diagnostic | Count | State |
|---|---|---|
| Device has been unplugged | 2,504 | Active |
| Device restarted (power removed) | 2,504 | Active |
| GPS antenna unplugged | 828 | Active |
| GPS antenna short circuit | 553 | Active |
| Unknown diagnostic | 298 | Active |
| Device restarted (firmware update) | 275 | Pending |

All faults originate from `ControllerGoDeviceId` (the telematics device, not the vehicle's engine). 15 vehicles have fault events, with the top 5 generating over 1,000 each.

**API: ExceptionEvent (28,566 events)** — More exception rules firing here than Database 1:

| Exception Rule | Count |
|---|---|
| Harsh Cornering | 12,341 |
| Posted Speeding | 8,202 |
| Hard Acceleration | 6,217 |
| Engine Fault Exception (custom) | 1,386 |
| Harsh Braking | 370 |
| Max Speed (custom) | 50 |

The custom "Engine Fault Exception" rule (1,386 events) and "Harsh Braking" (370 events) both fired here but not on the Vegas fleet.

### Key Takeaways

1. **Fault data availability varies by database.** One demo had zero DTCs while the other had thousands. This depends on whether the vehicles actually generate fault codes.

2. **All three channels work.** OData, API, and Ace all access fault data — when it exists. OData gives you pre-organized cycles, the API gives you raw events, and Ace gives you natural language access with auto-generated SQL.

3. **GoDevice faults ≠ engine faults.** Both databases only had GoDevice faults (unplugged devices, GPS antenna issues, firmware restarts). Real production fleets will also have OBD-II and J1939 engine codes with breakdown risk scores.

4. **Exception events are always available.** Even the database with no DTCs had 50,000 exception events. These are rule-based (speeding, harsh cornering, etc.) and come from the API's `ExceptionEvent` entity — they're a separate data channel from diagnostic fault codes.

5. **Ace generates good fault monitoring SQL.** It correctly joins tables, filters to persistent cycles, and calculates duration — but may exclude some vehicles with its `IsTracked` filter, and the preview is capped at 10 rows.

---

## Going Deeper

- **Data Connector setup and all table schemas:** See [DATA_CONNECTOR.md](./DATA_CONNECTOR.md) for connection instructions and prompts
- **Full column reference:** See the [Data Connector skill reference](../skills/geotab/references/DATA_CONNECTOR.md) for complete schemas with types
- **Official documentation:** [Data Connector Schema and Dictionary](https://support.geotab.com/mygeotab/mygeotab-add-ins/doc/data-conn-schema)
- **Fault Monitoring User Guide:** [Maintenance Fault Monitoring](https://docs.google.com/document/d/1uZjSAqGvok5yBa2M_k7p4dRSp0RBvThOYzvyKhLuy6Q/)
- **Compare data access methods:** [DATA_ACCESS_COMPARISON.md](./DATA_ACCESS_COMPARISON.md) for Data Connector vs API vs Ace
- **Ace API reference:** [ACE_API.md](../skills/geotab/references/ACE_API.md) for the `GetAceResults` API call
- **Demo database profiles:** [DEMO_DATABASE_REFERENCE.md](./DEMO_DATABASE_REFERENCE.md) for what data each demo configuration contains
