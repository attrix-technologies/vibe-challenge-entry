import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { SummaryTileBar, SummaryTile, SummaryTileSize, ProgressBar } from '@geotab/zenith';
import { Overview } from '@geotab/zenith/dist/overview/overview';
import GeotabContext from '../contexts/Geotab';
import maplibregl from 'maplibre-gl';
import polyline from '@mapbox/polyline';

const CONCURRENCY = 5;
const THIRTY_MIN_MS = 30 * 60 * 1000;
const WEEK_HOURS = 7 * 24; // 168 hours in a full week
const DEFAULT_CENTER = [-73.17375896, 45.57401727]; // [lng, lat]
const MIN_ZOOM = 3;

// Parse .NET TimeSpan format "[d.]hh:mm:ss[.fff]" into hours
const parseTimeSpanToHours = (ts) => {
  if (!ts || typeof ts !== 'string') return 0;
  let days = 0;
  let rest = ts;

  // Check for "d." prefix  (e.g. "1.03:01:48.031")
  const dotIdx = rest.indexOf('.');
  const colonIdx = rest.indexOf(':');
  if (dotIdx !== -1 && (colonIdx === -1 || dotIdx < colonIdx)) {
    days = parseInt(rest.substring(0, dotIdx), 10) || 0;
    rest = rest.substring(dotIdx + 1);
  }

  // Split "hh:mm:ss.fff"
  const parts = rest.split(':');
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  const seconds = parseFloat(parts[2]) || 0;

  return days * 24 + hours + minutes / 60 + seconds / 3600;
};

const ProductivityTab = () => {
  const [context] = useContext(GeotabContext);
  const { geotabApi, logger, focusKey, geotabState } = context;

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [kpis, setKpis] = useState({
    totalDistance: 0,
    totalDrivingTime: 0,
    drivingTimePercent: 0,
    totalIdlingTime: 0,
    idlingTimePercent: 0
  });
  const [deviceDistances, setDeviceDistances] = useState([]);

  const mapContainer = useRef(null);
  const map = useRef(null);
  const deviceColors = useRef(new Map());
  const matchedCount = useRef(0);
  const lastGroupFilter = useRef(null);
  const hasData = useRef(false);
  const abortRef = useRef(null);

  // ── Date helpers ──────────────────────────────────────────────────────
  const getLastWeekRange = () => {
    const now = new Date();
    const currentDay = now.getDay();
    const lastSunday = new Date(now);
    lastSunday.setDate(now.getDate() - currentDay - 7);
    lastSunday.setHours(0, 0, 0, 0);
    const lastSaturday = new Date(lastSunday);
    lastSaturday.setDate(lastSunday.getDate() + 6);
    lastSaturday.setHours(23, 59, 59, 999);
    return { fromDate: lastSunday.toISOString(), toDate: lastSaturday.toISOString() };
  };

  // ── Colour per device ────────────────────────────────────────────────
  const getDeviceColor = (deviceId) => {
    if (!deviceColors.current.has(deviceId)) {
      const hue = Math.floor(Math.random() * 360);
      deviceColors.current.set(deviceId, `hsl(${hue}, 70%, 50%)`);
    }
    return deviceColors.current.get(deviceId);
  };

  // ── Stable layer id per trip ─────────────────────────────────────────
  const layerId = (trip) => `trip-${trip.id}`;

  // ── Draw a trip on the map (straight line or matched polyline) ───────
  const drawTrip = useCallback((trip, coordinates) => {
    if (!map.current) return;
    const id = layerId(trip);
    const color = getDeviceColor(trip.device.id);
    const source = map.current.getSource(id);

    const geojson = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates }
    };

    if (source) {
      source.setData(geojson);
    } else {
      map.current.addSource(id, { type: 'geojson', data: geojson });
      map.current.addLayer({
        id,
        type: 'line',
        source: id,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': color, 'line-width': 3, 'line-opacity': 0.7 }
      });
    }
  }, []);

  // ── Remove all trip layers from the map ──────────────────────────────
  const clearMapLayers = () => {
    if (!map.current) return;
    const style = map.current.getStyle();
    if (!style || !style.layers) return;
    style.layers.forEach(layer => {
      if (layer.id.startsWith('trip-')) {
        map.current.removeLayer(layer.id);
        map.current.removeSource(layer.id);
      }
    });
  };

  // ── Build GPX payload from an array of {lat, lon, time} waypoints ───
  const buildGPX = (waypoints) => {
    const trkpts = waypoints
      .map(wp => `      <trkpt lat="${wp.lat}" lon="${wp.lon}"><time>${wp.time}</time></trkpt>`)
      .join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="LastWeekInFleet">
  <trk>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;
  };

  // ── Fetch interpolated LogRecords for 30-min increments (multicall) ──
  // On rate-limit or any error, resolves with [] so map matching still
  // proceeds with just the start/stop points.
  const fetchIntermediatePoints = (trip) => {
    return new Promise((resolve) => {
      const startMs = new Date(trip.start).getTime();
      const stopMs = new Date(trip.stop).getTime();
      const durationMs = stopMs - startMs;

      if (durationMs <= THIRTY_MIN_MS) {
        resolve([]);
        return;
      }

      const calls = [];
      for (let ts = startMs + THIRTY_MIN_MS; ts < stopMs; ts += THIRTY_MIN_MS) {
        const iso = new Date(ts).toISOString();
        calls.push(['Get', {
          typeName: 'LogRecord',
          search: {
            deviceSearch: { id: trip.device.id },
            fromDate: iso,
            toDate: iso
          }
        }]);
      }

      if (calls.length === 0) {
        resolve([]);
        return;
      }

      try {
        geotabApi.multiCall(calls, (results) => {
          const points = [];
          results.forEach((records, i) => {
            if (records && records.length > 0) {
              const rec = records[0];
              points.push({
                lat: rec.latitude,
                lon: rec.longitude,
                time: rec.dateTime || calls[i][1].search.fromDate
              });
            }
          });
          resolve(points);
        }, (err) => {
          logger.warn(`Intermediate points failed for trip ${trip.id} (rate limit?): ${err}`);
          resolve([]);
        });
      } catch (err) {
        logger.warn(`Intermediate points threw for trip ${trip.id}: ${err}`);
        resolve([]);
      }
    });
  };

  // ── Map-match a single trip ──────────────────────────────────────────
  const mapMatchTrip = async (trip) => {
    try {
      // Get intermediate waypoints for long trips (gracefully degrades on rate limit)
      const intermediatePoints = await fetchIntermediatePoints(trip);

      // Build full waypoint list: start + intermediates + stop
      const waypoints = [
        { lat: trip.startPoint.y, lon: trip.startPoint.x, time: trip.start },
        ...intermediatePoints,
        { lat: trip.stopPoint.y, lon: trip.stopPoint.x, time: trip.stop }
      ];

      const gpxPayload = buildGPX(waypoints);

      const response = await fetch('https://nav.attrix.ai/match?instructions=false&profile=car', {
        method: 'POST',
        headers: { 'Content-Type': 'application/xml' },
        body: gpxPayload
      });

      if (!response.ok) {
        logger.warn(`Map match failed for trip ${trip.id}: ${response.status}`);
        return null;
      }

      const data = await response.json();
      if (data.paths && data.paths.length > 0 && data.paths[0].points) {
        const decoded = polyline.decode(data.paths[0].points, 5);
        return decoded.map(c => [c[1], c[0]]); // [lng, lat]
      }
    } catch (err) {
      logger.error(`Map match error for trip ${trip.id}: ${err.message}`);
    }
    return null;
  };

  // ── Pool: 5-slot concurrency ─────────────────────────────────────────
  const processTripsWithPool = async (trips, totalTrips, signal) => {
    let idx = 0;
    matchedCount.current = 0;

    const worker = async () => {
      while (idx < trips.length) {
        if (signal.aborted) return;
        const i = idx++;
        const trip = trips[i];

        const coords = await mapMatchTrip(trip);
        if (signal.aborted) return;
        matchedCount.current++;

        setProgress(30 + Math.round((matchedCount.current / totalTrips) * 60));
        setStatus(`${geotabState.translate('Map matching:')} ${matchedCount.current} / ${totalTrips}`);

        if (coords && map.current) {
          drawTrip(trip, coords);
        }
      }
    };

    const workers = [];
    for (let s = 0; s < CONCURRENCY; s++) {
      workers.push(worker());
    }
    await Promise.all(workers);
  };

  // ── Resolve company address to map center coordinates ────────────────
  const getMapCenter = () => {
    return new Promise((resolve) => {
      geotabApi.call('Get', { typeName: 'SystemSettings' }, (settings) => {
        try {
          const address = settings && settings[0] && settings[0].companyAddress;
          if (!address) {
            resolve(DEFAULT_CENTER);
            return;
          }

          geotabApi.call('GetCoordinates', {
            addresses: [address]
          }, (coords) => {
            if (coords && coords.length > 0 && coords[0] && coords[0].x !== 0 && coords[0].y !== 0) {
              resolve([coords[0].x, coords[0].y]); // [lng, lat]
            } else {
              resolve(DEFAULT_CENTER);
            }
          }, () => resolve(DEFAULT_CENTER));
        } catch (e) {
          resolve(DEFAULT_CENTER);
        }
      }, () => resolve(DEFAULT_CENTER));
    });
  };

  // ── Serialize group filter for comparison ─────────────────────────────
  const getGroupFilterKey = () => {
    try {
      const filter = geotabState.getGroupFilter();
      return JSON.stringify(filter);
    } catch (e) {
      return '';
    }
  };

  // ── Main data loader ─────────────────────────────────────────────────
  useEffect(() => {
    // Only reload if group filter changed or we have no data yet
    const currentFilter = getGroupFilterKey();
    if (hasData.current && currentFilter === lastGroupFilter.current) {
      return;
    }
    lastGroupFilter.current = currentFilter;

    // Abort any in-flight map matching from a previous run
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    const loadData = async () => {
      try {
        // If reloading due to filter change, clear old map layers
        if (hasData.current) {
          clearMapLayers();
          deviceColors.current.clear();
        }

        setLoading(true);
        setStatus(geotabState.translate('Getting trips from last week...'));
        setProgress(5);

        // Resolve map center from company address before anything else
        const mapCenter = await getMapCenter();
        setProgress(10);

        // ── Init map ──────────────────────────────────────────────
        if (!map.current && mapContainer.current) {
          map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: 'https://nav.attrix.ai/styles/light.json',
            center: mapCenter,
            zoom: 10,
            minZoom: MIN_ZOOM
          });
          map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

          // Wait for style to load before adding sources/layers
          await new Promise(resolve => {
            if (map.current.isStyleLoaded()) resolve();
            else map.current.on('load', resolve);
          });
        }

        const { fromDate, toDate } = getLastWeekRange();
        logger.log(`Loading trips from ${fromDate} to ${toDate}`);

        geotabApi.call('Get', {
          typeName: 'Trip',
          search: { fromDate, toDate, includeOverlappedTrips: true }
        }, async (trips) => {
          logger.log(`Loaded ${trips.length} trips`);
          setProgress(20);

          if (trips.length === 0) {
            setStatus(geotabState.translate('No trips found for last week'));
            setLoading(false);
            hasData.current = true;
            return;
          }

          // Sort by device then time
          trips.sort((a, b) => {
            if (a.device.id !== b.device.id) return a.device.id.localeCompare(b.device.id);
            return new Date(a.start) - new Date(b.start);
          });

          setStatus(geotabState.translate('Linking trips...'));
          setProgress(25);

          // Link predecessor trips to map startPoints
          const processedTrips = [];
          let curDevice = null;
          let prevTrip = null;

          for (const trip of trips) {
            if (trip.device.id !== curDevice) {
              curDevice = trip.device.id;
              prevTrip = null;
            }
            if (prevTrip && prevTrip.nextTripStart === trip.start) {
              trip.startPoint = prevTrip.stopPoint;
            }
            processedTrips.push(trip);
            prevTrip = trip;
          }

          // Matchable trips: have both endpoints, distance > 5, not same location
          const tripsToMatch = processedTrips.filter(trip => {
            if (!trip.startPoint || !trip.stopPoint || trip.distance <= 5) return false;
            const dx = trip.stopPoint.x - trip.startPoint.x;
            const dy = trip.stopPoint.y - trip.startPoint.y;
            return Math.sqrt(dx * dx + dy * dy) * 111000 > 10;
          });

          tripsToMatch.sort((a, b) => b.distance - a.distance);
          logger.log(`${tripsToMatch.length} trips ready for map matching`);

          // ── Draw all trips as straight lines immediately ──────────
          setStatus(geotabState.translate('Drawing straight-line routes...'));
          const bounds = new maplibregl.LngLatBounds();

          tripsToMatch.forEach(trip => {
            const coords = [
              [trip.startPoint.x, trip.startPoint.y],
              [trip.stopPoint.x, trip.stopPoint.y]
            ];
            drawTrip(trip, coords);
            bounds.extend(coords[0]);
            bounds.extend(coords[1]);
          });

          if (!bounds.isEmpty()) {
            map.current.fitBounds(bounds, { padding: 40 });
          }

          setProgress(30);

          // ── KPIs (compute right away, don't wait for matching) ────
          let totalDistance = 0;
          let totalDrivingHours = 0;
          let totalIdlingHours = 0;
          const deviceIds = new Set();

          processedTrips.forEach(trip => {
            totalDistance += trip.distance || 0;
            totalDrivingHours += parseTimeSpanToHours(trip.drivingDuration);
            totalIdlingHours += parseTimeSpanToHours(trip.idlingDuration);
            deviceIds.add(trip.device.id);
          });

          const totalVehicleHours = deviceIds.size * WEEK_HOURS;

          setKpis({
            totalDistance: totalDistance.toFixed(1),
            totalDrivingTime: totalDrivingHours.toFixed(1),
            drivingTimePercent: totalVehicleHours > 0 ? ((totalDrivingHours / totalVehicleHours) * 100).toFixed(1) : '0.0',
            totalIdlingTime: totalIdlingHours.toFixed(1),
            idlingTimePercent: totalVehicleHours > 0 ? ((totalIdlingHours / totalVehicleHours) * 100).toFixed(1) : '0.0'
          });

          // ── Distance per device + resolve names ─────────────────
          const distByDevice = new Map();
          processedTrips.forEach(trip => {
            const did = trip.device.id;
            distByDevice.set(did, (distByDevice.get(did) || 0) + (trip.distance || 0));
          });

          // Fetch device details to get names
          const deviceIdArray = [...deviceIds];
          const fetchDeviceNames = () => new Promise((resolve) => {
            const calls = deviceIdArray.map(id => ['Get', {
              typeName: 'Device',
              search: { id }
            }]);
            geotabApi.multiCall(calls, (results) => {
              const nameMap = new Map();
              results.forEach((devices) => {
                if (devices && devices.length > 0) {
                  nameMap.set(devices[0].id, devices[0].name || devices[0].id);
                }
              });
              resolve(nameMap);
            }, () => resolve(new Map()));
          });

          const deviceNameMap = await fetchDeviceNames();

          const sorted = [...distByDevice.entries()]
            .map(([id, dist]) => ({
              id,
              name: deviceNameMap.get(id) || id,
              distance: dist,
              color: getDeviceColor(id)
            }))
            .sort((a, b) => b.distance - a.distance);

          setDeviceDistances(sorted);

          // Mark data as loaded so re-focus won't restart everything
          hasData.current = true;

          // ── Progressive map matching with 5 concurrent slots ──────
          setStatus(`${geotabState.translate('Map matching:')} 0 / ${tripsToMatch.length}`);
          await processTripsWithPool(tripsToMatch, tripsToMatch.length, controller.signal);

          if (!controller.signal.aborted) {
            setProgress(100);
            setStatus(geotabState.translate('Complete'));
            setLoading(false);
          }

        }, (error) => {
          logger.error('Error loading trips: ' + error);
          setStatus(`Error: ${error}`);
          setLoading(false);
        });

      } catch (error) {
        logger.error('Error in loadData: ' + error.message);
        setStatus(`Error: ${error.message}`);
        setLoading(false);
      }
    };

    loadData();
  }, [focusKey]);

  // Clean up map only on unmount
  useEffect(() => {
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  return (
    <div className="productivity-layout">
      <SummaryTileBar>
        <SummaryTile id="distance" title={geotabState.translate('Total Distance')} size={SummaryTileSize.Small}>
          <Overview title={kpis.totalDistance} description={geotabState.translate('km')} />
        </SummaryTile>
        <SummaryTile id="driving-time" title={geotabState.translate('Driving Time')} size={SummaryTileSize.Small}>
          <Overview title={kpis.totalDrivingTime} description={geotabState.translate('hrs')} label={{
            percentage: kpis.drivingTimePercent
          }} />
        </SummaryTile>
        <SummaryTile id="idling-time" title={geotabState.translate('Idling Time')} size={SummaryTileSize.Small}>
          <Overview title={kpis.totalIdlingTime} description={geotabState.translate('hrs')} label={{
            percentage: kpis.idlingTimePercent
          }} />
        </SummaryTile>
      </SummaryTileBar>

      <div className="map-and-chart">
        <div className="map-section">
          <div className="map-wrapper">
            <div ref={mapContainer} className="map-container" />
          </div>
          {loading && (
            <div style={{ marginTop: '16px' }}>
              <ProgressBar min={0} max={100} now={progress} size="medium" />
              <div className="status-message">{status}</div>
            </div>
          )}
        </div>

        {deviceDistances.length > 0 && (
          <div className="distance-chart">
            <div className="distance-chart-title">{geotabState.translate('Distance by Vehicle')} ({geotabState.translate('km')})</div>
            <div className="distance-chart-list">
              {(() => {
                const maxDist = deviceDistances[0].distance;
                const TRUNCATE_THRESHOLD = 25;
                let items = deviceDistances;
                let truncated = false;

                if (deviceDistances.length > TRUNCATE_THRESHOLD) {
                  const top = deviceDistances.slice(0, 10);
                  const bottom = deviceDistances.slice(-10);
                  items = [...top, null, ...bottom];
                  truncated = true;
                }

                return items.map((item, i) => {
                  if (item === null) {
                    return (
                      <div key="separator" className="distance-chart-separator">
                        <span>⋮</span>
                        <span className="separator-label">
                          {deviceDistances.length - 20} {geotabState.translate('more')}
                        </span>
                      </div>
                    );
                  }
                  const pct = maxDist > 0 ? (item.distance / maxDist) * 100 : 0;
                  return (
                    <div key={item.id} className="distance-bar-row">
                      <div className="distance-bar-name" title={item.name}>{item.name}</div>
                      <div className="distance-bar-track">
                        <div
                          className="distance-bar-fill"
                          style={{ width: `${pct}%`, backgroundColor: item.color }}
                        />
                      </div>
                      <div className="distance-bar-value">{item.distance.toFixed(0)}</div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductivityTab;
