# Last Week in Fleet

A MyGeotab add-in that provides weekly fleet summary with maps, metrics, and insights.

## Features

### Productivity Tab (Implemented)
- **Interactive Map**: Visualizes all trip routes from last week (Sunday 00:00 to Saturday 23:59)
- **Map Matching**: Uses the Attrix routing service to map-match GPS coordinates to actual road networks
- **Color-Coded Routes**: Each vehicle gets a unique color for easy identification
- **Smart Batching**: Processes map matching requests in batches of 25 to optimize performance
- **Key Performance Indicators**:
  - Total Distance (km)
  - Total Driving Time (hours)
  - Driving Time Percentage
  - Total Idling Time (hours)
  - Idling Time Percentage

### Safety Tab (Placeholder)
Future features:
- Speeding events
- Harsh braking incidents
- Aggressive acceleration events
- Driver safety scores
- Collision risk analysis

### Compliance Tab (Placeholder)
Future features:
- HOS (Hours of Service) violations
- Driver duty status logs
- Vehicle inspection reports
- Regulatory compliance scores
- DVIR completion rates

### Sustainability Tab (Placeholder)
Future features:
- Total fuel consumption
- CO2 emissions
- Fuel efficiency trends
- Electric vehicle usage statistics
- Carbon footprint reduction recommendations

## Development

### Install Dependencies
```bash
npm install
```

### Run in Development Mode
```bash
npm run dev
```

This will start a webpack dev server on `http://localhost:3001`

### Build for Production
```bash
npm run build
```

This creates a `dist/` folder and automatically generates a `lastWeekInFleet.zip` file ready for upload to MyGeotab.

## Technical Details

### Technologies Used
- **React 18**: UI framework
- **Geotab Zenith**: Component library for consistent MyGeotab styling
- **MapLibre GL**: Open-source mapping library
- **Polyline**: Decoding of encoded polylines from routing service
- **Webpack**: Module bundler

### Trip Processing Logic

1. **Fetch Trips**: Gets all trips from last week with `includeOverlappedTrips: true`
2. **Sort by Device and Time**: Organizes trips chronologically per vehicle
3. **Connect Trips**: Links each trip to its predecessor to map start points from previous trip's stop points
4. **Filter**: Only processes trips where:
   - Start and stop points exist
   - Distance > 5 km
   - Start and stop are at different locations
5. **Map Match**: Sends GPX payloads to `https://nav.attrix.ai/match` in batches of 25
6. **Decode & Display**: Decodes polylines and renders on MapLibre map with device-specific colors
7. **Calculate KPIs**: Aggregates distance, driving time, and idling time metrics

### API Usage

The add-in uses the following Geotab API calls:

- `Get` with `typeName: 'Trip'`:
  - Fetches trips with date range and overlap settings
  - Accesses trip properties: `device`, `start`, `stop`, `startPoint`, `stopPoint`, `distance`, `drivingDuration`, `idlingDuration`, `nextTripStart`

### External Services

- **Attrix Routing API**: `https://nav.attrix.ai/match?instructions=false&profile=car`
  - Accepts GPX format (XML)
  - Returns map-matched routes as encoded polylines
  - Free tier available for reasonable usage

## Installation in MyGeotab

1. Build the add-in: `npm run build`
2. Upload `lastWeekInFleet.zip` to MyGeotab
3. Access from the add-ins menu: "Last Week in Fleet"

## License

ISC
