# Annotated Example: Cold Chain Historical View

**A temperature monitoring Add-In with charts, PDF export, and Excel export — broken down line by line.**

This Add-In lets fleet managers select vehicles, pick a date range, and see historical temperature data plotted against setpoints. It's a real-world example of what you can build with the Geotab API and a handful of CDN libraries.

> **Try it:** The full [configuration.json](cold-chain-configuration.json) is ready to paste into MyGeotab.
> Go to Administration → System Settings → Add-Ins → New Add-In → Configuration tab.

---

## What It Does

A fleet manager running refrigerated trucks needs to prove the cargo stayed cold. This Add-In answers: **"What were the temperatures in my trucks yesterday?"**

- Select one or more vehicles
- Choose a time range (defaults to yesterday)
- See temperature charts (actual vs. setpoint)
- Export to PDF (with charts and data tables) or Excel (one sheet per vehicle)

---

## Architecture at a Glance

```
┌─────────────────────────────────────────┐
│           MyGeotab Platform              │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │     Cold Chain Historical View     │  │
│  │                                    │  │
│  │  [Vehicle Selector] [Date Range]   │  │
│  │  [Plot] [Export PDF] [Export Excel] │  │
│  │                                    │  │
│  │  ┌──────────────────────────────┐  │  │
│  │  │  Chart.js Temperature Graph  │  │  │
│  │  │  (one per selected vehicle)  │  │  │
│  │  └──────────────────────────────┘  │  │
│  └────────────────────────────────────┘  │
│                                          │
│  api.multiCall() ←→ Geotab API          │
└─────────────────────────────────────────┘
```

**Everything runs client-side.** No backend, no database — just the MyGeotab API, a few CDN libraries, and the browser.

---

## The Configuration Wrapper

```json
{
  "name": "Cold Chain Historical View",
  "supportEmail": "https://github.com/fhoffa/geotab-vibe-guide",
  "version": "2.1",
  "items": [{
    "url": "coldchain.html",
    "path": "ActivityLink",
    "menuName": {
      "en": "Cold Chain Historical View"
    }
  }],
  "files": {
    "coldchain.html": "<!DOCTYPE html>..."
  }
}
```

**Key takeaways:**

| Field | What It Means |
|-------|--------------|
| `"url": "coldchain.html"` | References a filename defined in `files` — this makes it an **embedded** Add-In (no external hosting) |
| `"path": "ActivityLink"` | Appears in MyGeotab's main left-hand navigation menu |
| `"files"` | Contains the entire HTML/JS app as a single string — MyGeotab serves it directly |
| `"version": "2.1"` | Useful for tracking changes; MyGeotab doesn't enforce versioning but it's good practice |

**Embedded vs. External:** This Add-In uses the embedded approach — everything lives inside the JSON. This means zero hosting, but the trade-off is that the entire app must fit in one HTML string. For larger apps, consider [external hosting](../GEOTAB_ADDINS.md#two-ways-to-deploy).

---

## CDN Libraries

```html
<script src='https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js'></script>
<script src='https://cdn.jsdelivr.net/npm/moment@2.29.4/moment.min.js'></script>
<script src='https://cdn.jsdelivr.net/npm/chartjs-adapter-moment@1.0.1/dist/chartjs-adapter-moment.min.js'></script>
<script src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'></script>
<script src='https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.23/jspdf.plugin.autotable.min.js'></script>
<script src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'></script>
```

| Library | Purpose | Why It's Here |
|---------|---------|---------------|
| **Chart.js 3.9.1** | Line charts | Plots temperature over time |
| **Moment.js 2.29.4** | Date formatting | Formats timestamps for chart axes |
| **chartjs-adapter-moment** | Bridge | Lets Chart.js use Moment for its time scale |
| **jsPDF 2.5.1** | PDF generation | Creates downloadable PDF reports |
| **jspdf-autotable** | PDF tables | Adds formatted data tables to the PDF |
| **SheetJS (xlsx) 0.18.5** | Excel export | Creates `.xlsx` files client-side |

**Pattern: Pin your versions.** Every library uses a specific version number (`@3.9.1`, not `@latest`). This prevents your Add-In from breaking when libraries release updates. Always do this.

---

## The Add-In Lifecycle

```javascript
geotab.addin['cold-chain-monitor'] = function() {
    // State shared across lifecycle methods
    var chartInstances = [];
    var reportData = [];
    var diagActualId = null;
    var diagSetId = null;

    return {
        initialize: function(api, state, callback) {
            // Called once when Add-In loads
            // Set up the UI, fetch initial data
            callback();  // MUST call this or MyGeotab hangs
        },
        focus: function(api, state) {
            // Called every time user navigates TO this page
        },
        blur: function(api, state) {
            // Called every time user navigates AWAY
        }
    };
};
```

**Critical rules:**
1. **Always call `callback()`** in `initialize` — MyGeotab waits for it
2. **Use `var`, not `const`/`let`** — MyGeotab's environment requires ES5
3. **The outer function is a factory** — it returns the lifecycle object and closes over shared state

The shared variables (`chartInstances`, `reportData`, `diagActualId`, `diagSetId`) persist across all three lifecycle methods because they're in the closure scope.

---

## Step 1: Initialization — Setting Defaults and Fetching Data

### Date Range Defaults

```javascript
var now = new Date();
var yest = new Date();
yest.setDate(now.getDate() - 1);
yest.setHours(0, 0, 0, 0);       // Yesterday 00:00:00
var yestEnd = new Date();
yestEnd.setDate(now.getDate() - 1);
yestEnd.setHours(23, 59, 59, 999); // Yesterday 23:59:59

document.getElementById('fromDate').value = formatDT(yest);
document.getElementById('toDate').value = formatDT(yestEnd);
```

**Why yesterday?** Cold chain compliance is usually reviewed after the fact. Setting the default to "all of yesterday" means the user gets useful data with zero clicks.

### Fetching Devices and Diagnostics in One Call

```javascript
api.multiCall([
    ['Get', { typeName: 'Device' }],
    ['Get', { typeName: 'Diagnostic', search: { name: '%Temperature%' } }]
], function(res) {
    var devs = res[0], diags = res[1];
    // ...
});
```

**Pattern: `api.multiCall` for batching.** Instead of two separate API calls, this sends both in a single HTTP request. The Geotab API processes them together and returns results in the same order. This is faster and reduces network overhead.

**The `%` wildcard** in `{ name: '%Temperature%' }` is a SQL-style LIKE search — it finds all diagnostics with "Temperature" anywhere in the name.

### Diagnostic Discovery

```javascript
for (var i = 0; i < diags.length; i++) {
    var n = diags[i].name.toLowerCase();
    if (n.indexOf('set') > -1 && n.indexOf('zone 1') > -1)
        diagSetId = diags[i].id;
    if ((n.indexOf('cargo') > -1 || n.indexOf('air') > -1) && n.indexOf('zone 1') > -1)
        diagActualId = diags[i].id;
}
```

**Why not hardcode diagnostic IDs?** Because they vary across databases. Different telematics devices (Geotab GO devices, third-party integrations) report temperature under different diagnostic names. This code searches for patterns:

- **Setpoint**: Contains "set" AND "zone 1" (e.g., "Reefer Set Temperature Zone 1")
- **Actual temperature**: Contains "cargo" or "air" AND "zone 1" (e.g., "Reefer Cargo Temperature Zone 1")

This is a pragmatic approach — it works for most reefer configurations without requiring manual setup.

### Populating the Vehicle Dropdown

```javascript
var sel = document.getElementById('devSelect');
devs.sort(function(a, b) { return a.name.localeCompare(b.name); });
devs.forEach(function(d) {
    var o = document.createElement('option');
    o.value = d.id;
    o.innerHTML = d.name;
    sel.appendChild(o);
});
```

Alphabetical sorting makes it easy to find vehicles in large fleets. The `<select multiple>` lets users Ctrl+Click to select several vehicles at once.

---

## Step 2: Loading Temperature Data

When the user clicks "Plot Selection":

```javascript
var fr = new Date(document.getElementById('fromDate').value).toISOString();
var to = new Date(document.getElementById('toDate').value).toISOString();

var calls = [];
if (diagActualId)
    calls.push(['Get', { typeName: 'StatusData', search: {
        deviceSearch: { id: id },
        diagnosticSearch: { id: diagActualId },
        fromDate: fr, toDate: to
    }}]);
if (diagSetId)
    calls.push(['Get', { typeName: 'StatusData', search: {
        deviceSearch: { id: id },
        diagnosticSearch: { id: diagSetId },
        fromDate: fr, toDate: to
    }}]);

api.multiCall(calls, function(res) { /* ... */ });
```

**Pattern: `StatusData` with filters.** `StatusData` is the Geotab type for sensor readings. The search narrows results by:
- `deviceSearch` — which vehicle
- `diagnosticSearch` — which sensor (actual temp vs. setpoint)
- `fromDate` / `toDate` — time range

This runs **once per selected vehicle**, each as its own `multiCall`. The calls happen in a `forEach` loop, so they fire in parallel.

---

## Step 3: Charting with Chart.js

```javascript
var c = new Chart(ctx, {
    type: 'line',
    data: {
        datasets: [{
            label: 'Cargo Temperature',
            data: act.map(function(p) {
                return { x: moment(p.dateTime).toDate(), y: p.data };
            }),
            borderColor: '#ff4757',           // Red line
            backgroundColor: 'rgba(255,71,87,0.1)',  // Light red fill
            fill: true,
            borderWidth: 2
        }, {
            label: 'Setpoint',
            data: set.map(function(p) {
                return { x: moment(p.dateTime).toDate(), y: p.data };
            }),
            borderColor: '#2f3542',           // Dark line
            borderDash: [5, 5],               // Dashed
            borderWidth: 2
        }]
    },
    options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: { type: 'time', time: { unit: 'hour', displayFormats: { hour: 'HH:mm' } } }
        }
    }
});
```

**Design choices explained:**

| Choice | Why |
|--------|-----|
| Red filled area for actual temp | Immediately visible; fill shows "weight" of temperature over time |
| Dashed black line for setpoint | Visually distinct from actuals; reads as a "target" or "limit" |
| `animation: false` | Performance — rendering multiple charts simultaneously with animation causes jank |
| `maintainAspectRatio: false` | Charts fill their container width, important for responsive layouts |
| Time axis with `HH:mm` format | Cold chain data is usually within a single day; hours:minutes is the right granularity |

**Pattern: One chart per vehicle.** Each selected vehicle gets its own `<canvas>` dynamically created and appended to `#chartArea`. This scales naturally — select 1 vehicle, get 1 chart; select 5, get 5.

---

## Step 4: PDF Export

```javascript
var doc = new jspdf.jsPDF('p', 'mm', 'a4');
doc.setFontSize(18);
doc.text('Cold Chain Historical Report', 14, 15);

chartInstances.forEach(function(ci, i) {
    if (i > 0) doc.addPage();
    var can = document.getElementById(ci.canvasId);
    var img = can.toDataURL('image/png', 1.0);
    doc.setFontSize(14);
    doc.text('Vehicle: ' + ci.name, 14, 25);
    doc.addImage(img, 'PNG', 10, 30, 190, 90);

    // Data table below the chart
    var rows = [];
    var data = reportData.find(function(r) { return r.name === ci.name; });
    data.actuals.forEach(function(r) {
        rows.push([moment(r.dateTime).format('YYYY-MM-DD HH:mm'), r.data.toFixed(1)]);
    });
    doc.autoTable({
        head: [['Time (24h)', 'Cargo Temp (°C)']],
        body: rows.slice(0, 100),
        startY: 125,
        theme: 'striped',
        headStyles: { fillColor: [44, 62, 80] }
    });
});
doc.save('ColdChain_Historical_Report.pdf');
```

**How this works:**
1. Creates an A4 PDF document
2. For each vehicle: adds a new page, captures the chart canvas as a PNG image, embeds it
3. Builds a data table below the chart image using `autoTable`
4. Saves to the user's download folder

**Note:** `rows.slice(0, 100)` caps the table at 100 rows to avoid multi-page table overflow. For complete data, the Excel export has no such limit.

---

## Step 5: Excel Export

```javascript
var wb = XLSX.utils.book_new();
reportData.forEach(function(d) {
    var data = [];
    d.actuals.forEach(function(r) {
        data.push({
            'Timestamp': moment(r.dateTime).format('YYYY-MM-DD HH:mm'),
            'Cargo Temperature (°C)': r.data.toFixed(1)
        });
    });
    var ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, d.name.substring(0, 31));
});
XLSX.writeFile(wb, 'Fleet_ColdChain_Data.xlsx');
```

**Pattern:** SheetJS (`xlsx` library) creates real `.xlsx` files entirely in the browser. Each vehicle becomes a separate worksheet tab. The `substring(0, 31)` trims the sheet name — Excel has a 31-character limit on tab names.

---

## Patterns You Can Reuse

### 1. Diagnostic Discovery
Search for diagnostics by name pattern instead of hardcoding IDs. This makes your Add-In portable across databases.

```javascript
api.call('Get', {
    typeName: 'Diagnostic',
    search: { name: '%YourSensorKeyword%' }
}, function(diags) { /* filter client-side */ });
```

### 2. multiCall Batching
Always batch independent API calls into a single `multiCall`. It reduces latency and is kinder to the API.

```javascript
api.multiCall([
    ['Get', { typeName: 'Device' }],
    ['Get', { typeName: 'User' }]
], function(results) {
    var devices = results[0];
    var users = results[1];
});
```

### 3. StatusData for Sensor Readings
Any telematics sensor (temperature, fuel level, tire pressure, battery voltage) stores data as `StatusData`. The search pattern is always the same:

```javascript
['Get', { typeName: 'StatusData', search: {
    deviceSearch: { id: vehicleId },
    diagnosticSearch: { id: sensorDiagnosticId },
    fromDate: startISO,
    toDate: endISO
}}]
```

### 4. Client-Side Exports
Both jsPDF and SheetJS work entirely in the browser — no server needed. This is ideal for Add-Ins since you can't run backend code.

### 5. Dynamic Chart Creation
Create chart containers dynamically for variable-length results. Store references to clean up later if needed.

---

## Things to Watch Out For

| Issue | Impact | How to Fix |
|-------|--------|-----------|
| No error callbacks on `api.multiCall` | Failures are silent — user sees "Loading..." forever | Add error callbacks: `api.multiCall(calls, onSuccess, onError)` |
| Hardcoded to Zone 1 | Multi-zone reefer trucks only show the first zone | Search for all zones and let the user pick, or chart all zones |
| No loading indicators per vehicle | User doesn't know which vehicles are still loading | Add a spinner or progress counter |
| PDF table capped at 100 rows | Long date ranges lose data in PDF | Paginate the table or note the limitation in the UI |
| Temperature assumed to be °C | Could be wrong depending on the database locale settings | Check user preferences or add a unit toggle |
| All devices fetched (no group filter) | Slow on large fleets with thousands of vehicles | Filter by group: `{ typeName: 'Device', search: { groups: [{ id: groupId }] } }` |

---

## Make It Your Own

Copy-paste these prompts into Claude or another AI assistant to extend this Add-In:

**Add alert thresholds:**
```
Take this Cold Chain Add-In and add configurable temperature thresholds.
When the cargo temperature exceeds the threshold, highlight that section
of the chart in red. Add input fields for min and max acceptable temperature.
Use the geotab-addins skill for correct patterns.
```

**Add multi-zone support:**
```
Modify this Cold Chain Add-In to support multiple reefer zones (Zone 1, Zone 2, Zone 3).
Search for all temperature diagnostics, group them by zone, and show each zone
as a separate line on the chart. Use different colors per zone.
Use the geotab-addins skill for correct patterns.
```

**Add a map view:**
```
Extend this Cold Chain Add-In with a Leaflet map that shows the vehicle's route
for the selected time period, with markers colored by temperature
(green = in range, red = out of range). Use LogRecord data for GPS positions
and correlate with the StatusData timestamps.
Use the geotab-addins skill for correct patterns.
```

---

## Full Configuration

The complete `configuration.json` ready to paste into MyGeotab is available at:
[cold-chain-configuration.json](cold-chain-configuration.json)
