# Agent Skills TODO - Fleet Management Skills

This document tracks Agent Skills we want to create that would be valuable for fleet managers and developers working with Geotab.

## Status Legend
- ✅ **Completed** - Skill is implemented and ready to use
- 🚧 **In Progress** - Currently being developed
- 📋 **Planned** - Identified as valuable, not yet started
- 💡 **Idea** - Potential skill, needs evaluation

---

## Core Geotab Skills

### ✅ geotab-addins
Build custom Add-Ins that extend the MyGeotab interface.
- **Location:** `skills/geotab-addins/SKILL.md`
- **Description:** Complete guide to building MyGeotab Add-Ins with external hosting
- **Use Cases:** Custom dashboards, specialized reports, fleet tools

---

### 📋 geotab-api-quickstart
**Priority:** HIGH - Foundation for all other skills

Authenticate with Geotab API and make basic data queries.

**What it should teach:**
- Authentication flow (username, password, database, server)
- Making basic Get calls (Device, Trip, Driver)
- Error handling patterns
- Session management
- Rate limiting awareness

**Use Cases:**
- "Help me connect to Geotab API"
- "Fetch all vehicles from my fleet"
- "Get trip data for the last week"

**Code Examples Needed:**
- Python authentication
- JavaScript/Node.js authentication
- Handling multi-database scenarios
- Retry logic for API failures

**Estimated Effort:** 2-3 hours

---

### 📋 geotab-trip-analysis
**Priority:** HIGH - Very common use case

Analyze trip data for fuel efficiency, routes, and idle time.

**What it should teach:**
- Trip data structure and fields
- Calculating fuel consumption from trips
- Detecting idle time patterns
- Route efficiency metrics (distance vs time)
- Grouping trips by vehicle, driver, or date range

**Use Cases:**
- "Calculate fuel efficiency for my fleet"
- "Find trips with excessive idle time"
- "Identify inefficient routes"

**Code Examples Needed:**
- Python trip analysis with pandas
- Calculating MPG from trip data
- Idle time detection algorithms
- Route clustering

**Estimated Effort:** 3-4 hours

---

### 📋 geotab-safety-scoring
**Priority:** HIGH - Critical for fleet safety

Build driver safety scorecards using exception events.

**What it should teach:**
- ExceptionEvent types (speeding, harsh braking, acceleration, cornering)
- Fetching exception events by driver
- Calculating safety scores (0-100 scale)
- Benchmarking against fleet average
- Trend analysis over time

**Use Cases:**
- "Create a driver safety scorecard"
- "Identify unsafe driving behaviors"
- "Build a safety leaderboard"

**Code Examples Needed:**
- Safety score calculation algorithm
- Weighting different event types
- Percentile ranking
- Time-series analysis

**Estimated Effort:** 3-4 hours

---

### 📋 geotab-ace-integration
**Priority:** MEDIUM - Enables AI-powered features

Integrate Geotab Ace API for natural language fleet queries.

**What it should teach:**
- Ace API authentication
- Sending natural language queries
- Processing structured responses
- Best practices for prompt engineering
- Multi-turn conversations
- Combining Ace insights with raw API data

**Use Cases:**
- "Build a chatbot for fleet queries"
- "Get AI-powered fleet insights"
- "Natural language reporting"

**Code Examples Needed:**
- Python Ace client
- JavaScript Ace integration
- Sample prompts for common queries
- Response parsing

**Estimated Effort:** 3-4 hours

---

### 📋 geotab-predictive-maintenance
**Priority:** MEDIUM - High business value

Monitor engine diagnostics and predict maintenance needs.

**What it should teach:**
- FaultData structure and critical codes
- StatusData for engine diagnostics
- Identifying maintenance patterns
- Predictive algorithms (simple ML or rule-based)
- Alert thresholds
- DVIR integration

**Use Cases:**
- "Predict which vehicles need maintenance"
- "Monitor engine fault codes"
- "Build a maintenance dashboard"

**Code Examples Needed:**
- Fault code monitoring
- Battery health scoring (for EVs)
- Oil life prediction
- Maintenance scheduling logic

**Estimated Effort:** 4-5 hours

---

### 📋 geotab-geofence-management
**Priority:** MEDIUM - Common requirement

Create and manage geofences (zones) programmatically.

**What it should teach:**
- Zone API usage (Add, Get, Set, Remove)
- Polygon creation from coordinates
- Circle vs polygon zones
- Address geocoding for zone creation
- Zone triggers and notifications
- Bulk zone operations

**Use Cases:**
- "Create zones around customer locations"
- "Build a geofence manager UI"
- "Auto-create zones from frequent stops"

**Code Examples Needed:**
- Creating circular zones
- Polygon zone from address
- Finding vehicles in zones
- Zone event monitoring

**Estimated Effort:** 3-4 hours

---

### 💡 geotab-data-visualization
**Priority:** MEDIUM - Enhances all other skills

Patterns for visualizing fleet data with charts and maps.

**What it should teach:**
- Chart.js patterns for fleet metrics
- Leaflet.js for GPS/route visualization
- Heatmaps for vehicle density
- Time-series charts for trends
- Responsive design for dashboards

**Use Cases:**
- "Visualize trip routes on a map"
- "Create fuel efficiency charts"
- "Build an interactive dashboard"

**Code Examples Needed:**
- Trip route mapping
- Multi-vehicle heatmaps
- KPI dashboards
- Real-time updates

**Estimated Effort:** 4-5 hours

---

### 💡 geotab-report-builder
**Priority:** LOW-MEDIUM - Useful but specific

Generate automated reports from fleet data.

**What it should teach:**
- Common report types (safety, fuel, utilization)
- PDF generation from data
- Email delivery automation
- Scheduled reporting
- Custom report templates

**Use Cases:**
- "Generate weekly fleet reports"
- "Email safety reports to managers"
- "Create executive summaries"

**Code Examples Needed:**
- Python PDF generation
- Email sending with attachments
- Report templates
- Scheduling with cron/celery

**Estimated Effort:** 3-4 hours

---

## Advanced/Specialized Skills

### 💡 geotab-ev-analysis
**Priority:** MEDIUM - Growing importance

Analyze electric vehicle data (battery health, charging, range).

**What it should teach:**
- StatusData fields for EVs
- Battery health scoring
- Charging pattern analysis
- Range prediction
- EV vs ICE cost comparison
- Electrification suitability analysis

**Use Cases:**
- "Analyze EV battery health"
- "Find vehicles suitable for EV conversion"
- "Track charging efficiency"

**Estimated Effort:** 4-5 hours

---

### 💡 geotab-mcp-server
**Priority:** MEDIUM - Cutting edge integration

Build Model Context Protocol servers for Geotab.

**What it should teach:**
- MCP specification basics
- Creating Geotab MCP tools
- Multi-account support
- Read and write operations
- Caching strategies with DuckDB
- Security and privacy considerations

**Use Cases:**
- "Build a conversational fleet interface"
- "Create Geotab tools for AI assistants"
- "Enable natural language fleet control"

**Resources:**
- Fork from: https://github.com/fhoffa/geotab-ace-mcp-demo

**Estimated Effort:** 6-8 hours

---

### 💡 geotab-hos-compliance
**Priority:** LOW-MEDIUM - Regulatory requirement

Track Hours of Service compliance for commercial fleets.

**What it should teach:**
- HOS regulations (US/Canada)
- Driver hour calculations from trips
- Violation detection
- DVIR compliance
- Automated logging
- Regulatory reporting

**Use Cases:**
- "Monitor HOS compliance"
- "Alert on HOS violations"
- "Generate DOT reports"

**Estimated Effort:** 5-6 hours
**Note:** Requires regulatory expertise

---

### 💡 geotab-webhooks
**Priority:** LOW - Advanced feature

Set up event-driven integrations with webhooks.

**What it should teach:**
- Webhook configuration (if available)
- Polling alternatives for real-time data
- Event detection patterns
- Integration with external systems
- Zapier/Make integration patterns

**Use Cases:**
- "Trigger actions when vehicles enter zones"
- "Real-time alerts to Slack"
- "Event-driven workflows"

**Estimated Effort:** 3-4 hours

---

### 💡 geotab-voice-interface
**Priority:** LOW - Innovation opportunity

Build voice-controlled fleet queries.

**What it should teach:**
- Speech-to-text integration (Whisper, Google)
- Text-to-speech integration (ElevenLabs, Google TTS)
- Voice command parsing
- Hands-free operation patterns
- Safety considerations for drivers

**Use Cases:**
- "Voice assistant for fleet managers"
- "Hands-free driver tools"
- "Alexa/Google Home integration"

**Estimated Effort:** 4-5 hours

---

### 💡 geotab-ai-insights
**Priority:** LOW-MEDIUM - Future-focused

Use LLMs to generate insights from fleet data.

**What it should teach:**
- Combining Geotab data with GPT/Claude
- Prompt engineering for fleet analysis
- Generating narrative reports
- Anomaly detection with AI
- Recommendation systems

**Use Cases:**
- "Generate executive summaries from fleet data"
- "AI-powered fleet optimization recommendations"
- "Automated incident report writing"

**Estimated Effort:** 4-5 hours

---

## Implementation Priority

### Phase 1: Foundation (Hackathon Weekend)
1. ✅ geotab-addins
2. 📋 geotab-api-quickstart
3. 📋 geotab-trip-analysis
4. 📋 geotab-safety-scoring

**Goal:** Cover 80% of common use cases

### Phase 2: Enhancement (Post-Hackathon)
5. 📋 geotab-ace-integration
6. 📋 geotab-predictive-maintenance
7. 📋 geotab-geofence-management
8. 💡 geotab-data-visualization

**Goal:** Enable advanced integrations

### Phase 3: Innovation (Future)
9. 💡 geotab-mcp-server
10. 💡 geotab-ev-analysis
11. 💡 geotab-ai-insights
12. 💡 geotab-voice-interface

**Goal:** Cutting-edge features

---

## Hackathon Strategy

### Weekend Plan

**Saturday Morning (2-3 hours):**
- [ ] Create `geotab-api-quickstart` skill
- [ ] Test with Claude Code

**Saturday Afternoon (2-3 hours):**
- [ ] Create `geotab-trip-analysis` skill
- [ ] Build a sample project using both skills

**Sunday Morning (2-3 hours):**
- [ ] Create `geotab-safety-scoring` skill
- [ ] Enhance sample project

**Sunday Afternoon:**
- [ ] Polish main hackathon project
- [ ] Prepare demo showing skills + project

### Demo Script

**"I built a fleet analytics dashboard in 4 hours. Here's how:"**

1. Show the 3 skills you created
2. Demo using Claude Code with those skills to build a feature
3. Live code: "Using geotab-trip-analysis skill, calculate fuel efficiency"
4. Show how quickly you can iterate with AI + skills

**Judges will love:**
- Reusable tools (skills) not just one-off projects
- Innovation in developer experience
- Contribution to the ecosystem

---

## Contributing Skills

When you create a skill, update this file:

1. Move skill from 📋 to ✅
2. Add location path
3. Note any lessons learned
4. Update use cases based on testing

### Template for New Skills

```markdown
### ✅ skill-name
**Priority:** HIGH/MEDIUM/LOW

Brief description.

**What it teaches:**
- Key concept 1
- Key concept 2

**Use Cases:**
- "Use case 1"
- "Use case 2"

**Code Examples:**
- Example 1
- Example 2

**Location:** `skills/skill-name/SKILL.md`
**Effort:** X hours
**Lessons Learned:** [Add after implementation]
```

---

## Questions or Ideas?

Open an issue or update this file with new skill ideas!

**Useful for fleet managers:**
- Route optimization
- Fuel cost analysis
- Driver performance coaching
- Maintenance scheduling
- Compliance reporting
- Carbon footprint tracking
- Asset utilization
- Customer delivery tracking

**Which skills would help YOU the most? Add them above!**
