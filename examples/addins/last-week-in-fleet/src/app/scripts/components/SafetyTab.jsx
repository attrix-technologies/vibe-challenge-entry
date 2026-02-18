import React, { useState, useEffect, useContext, useRef } from 'react';
import { SummaryTileBar, SummaryTile, SummaryTileSize, ProgressBar } from '@geotab/zenith';
import { Overview, OverviewOptionsArrow, OverviewOptionsType } from '@geotab/zenith/dist/overview/overview';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { ScatterplotLayer } from '@deck.gl/layers';
import maplibregl from 'maplibre-gl';
import GeotabContext from '../contexts/Geotab';

const RULE_GROUPS = {
  speeding: ['RuleSpeedingId', 'RuleGpsSpeedingWindowId'],
  acceleration: ['RuleJackrabbitStartsId', 'RuleHarshGpsAccelerationId'],
  cornering: ['RuleHarshCorneringId', 'RuleHarshGpsCorneringId'],
  braking: ['RuleHarshBrakingId', 'RuleHarshGpsBrakingId'],
  tailgating: ['RuleFollowingDistanceId'],
  collisions: ['RuleAccidentId', 'RuleEnhancedMajorCollisionId', 'RuleEnhancedMinorCollisionId']
};

const ALL_RULE_IDS = new Set(Object.values(RULE_GROUPS).flat());

const EVENT_COLORS = {
  speeding:     { rgb: [25, 118, 210],  hex: '#1976d2' },
  acceleration: { rgb: [255, 152, 0],   hex: '#5cc799' },
  cornering:    { rgb: [255, 193, 7],   hex: '#ffc107' },
  braking:      { rgb: [156, 39, 176],  hex: '#9c27b0' },
  tailgating:   { rgb: [0, 188, 212],   hex: '#00bcd4' },
  collisions:   { rgb: [220, 53, 69],   hex: '#dc3545' }
};

const TILE_CONFIG = [
  { key: 'speeding', label: 'Speeding' },
  { key: 'acceleration', label: 'Hard Acceleration' },
  { key: 'cornering', label: 'Harsh Cornering' },
  { key: 'braking', label: 'Harsh Braking' },
  { key: 'tailgating', label: 'Tailgating' },
  { key: 'collisions', label: 'Collisions' }
];

const EVENT_ORDER = TILE_CONFIG.map(t => t.key);
const BATCH_SIZE = 250;
const TRUNCATE_THRESHOLD = 25;
const DEFAULT_CENTER = [-73.17375896, 45.57401727];
const MIN_ZOOM = 3;
const DENSITY_GRID = 0.005;

const SafetyTab = () => {
  const [context] = useContext(GeotabContext);
  const { geotabApi, logger, focusKey, geotabState } = context;

  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({});
  const [prevCounts, setPrevCounts] = useState({});
  const [disabledGroups, setDisabledGroups] = useState(new Set());
  const [eventPoints, setEventPoints] = useState([]);
  const [deviceEventData, setDeviceEventData] = useState([]);
  const [mapStatus, setMapStatus] = useState('');

  const lastGroupFilter = useRef(null);
  const hasData = useRef(false);
  const mapContainer = useRef(null);
  const map = useRef(null);
  const deckOverlay = useRef(null);

  // ── Date helpers ───────────────────────────────────────────────────
  const getWeekRanges = () => {
    const now = new Date();
    const currentDay = now.getDay();

    const lastSunday = new Date(now);
    lastSunday.setDate(now.getDate() - currentDay - 7);
    lastSunday.setHours(0, 0, 0, 0);
    const lastSaturday = new Date(lastSunday);
    lastSaturday.setDate(lastSunday.getDate() + 6);
    lastSaturday.setHours(23, 59, 59, 999);

    const prevSunday = new Date(lastSunday);
    prevSunday.setDate(lastSunday.getDate() - 7);
    const prevSaturday = new Date(prevSunday);
    prevSaturday.setDate(prevSunday.getDate() + 6);
    prevSaturday.setHours(23, 59, 59, 999);

    return {
      thisWeek: { fromDate: lastSunday.toISOString(), toDate: lastSaturday.toISOString() },
      prevWeek: { fromDate: prevSunday.toISOString(), toDate: prevSaturday.toISOString() }
    };
  };

  const getGroupFilterKey = () => {
    try { return JSON.stringify(geotabState.getGroupFilter()); }
    catch (e) { return ''; }
  };

  // For safety: fewer events = positive, more = negative
  const getLabel = (current, previous) => {
    if (previous === 0 && current === 0) return undefined;
    if (previous === 0) return { percentage: 100, arrow: OverviewOptionsArrow.Up, type: OverviewOptionsType.Negative };
    const pctChange = Math.round(((current - previous) / previous) * 100);
    if (pctChange === 0) return undefined;
    return {
      percentage: Math.abs(pctChange),
      arrow: pctChange > 0 ? OverviewOptionsArrow.Up : OverviewOptionsArrow.Down,
      type: pctChange > 0 ? OverviewOptionsType.Negative : OverviewOptionsType.Positive
    };
  };

  const getMapCenter = () => {
    return new Promise((resolve) => {
      geotabApi.call('Get', { typeName: 'SystemSettings' }, (settings) => {
        try {
          const address = settings && settings[0] && settings[0].companyAddress;
          if (!address) { resolve(DEFAULT_CENTER); return; }
          geotabApi.call('GetCoordinates', { addresses: [address] }, (coords) => {
            if (coords && coords.length > 0 && coords[0] && coords[0].x !== 0 && coords[0].y !== 0) {
              resolve([coords[0].x, coords[0].y]);
            } else { resolve(DEFAULT_CENTER); }
          }, () => resolve(DEFAULT_CENTER));
        } catch (e) { resolve(DEFAULT_CENTER); }
      }, () => resolve(DEFAULT_CENTER));
    });
  };

  const ruleToGroup = (ruleId, activeRulesByGroup) => {
    for (const [group, ruleIds] of Object.entries(activeRulesByGroup)) {
      if (ruleIds.includes(ruleId)) return group;
    }
    return null;
  };

  // ── Fetch device names ─────────────────────────────────────────────
  const fetchDeviceNames = (deviceIds) => new Promise((resolve) => {
    if (deviceIds.length === 0) { resolve(new Map()); return; }
    const calls = deviceIds.map(id => ['Get', { typeName: 'Device', search: { id } }]);
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

  // ── Fetch LogRecords in batches ────────────────────────────────────
  const fetchEventLocations = async (allEvents) => {
    if (allEvents.length === 0) return [];

    const logCalls = allEvents.map(e => ['Get', {
      typeName: 'LogRecord',
      search: {
        deviceSearch: { id: e.deviceId },
        fromDate: e.activeFrom,
        toDate: e.activeFrom
      }
    }]);

    const points = [];

    for (let i = 0; i < logCalls.length; i += BATCH_SIZE) {
      const batch = logCalls.slice(i, Math.min(i + BATCH_SIZE, logCalls.length));
      try {
        const batchResults = await new Promise((resolve, reject) => {
          geotabApi.multiCall(batch, resolve, reject);
        });
        batchResults.forEach((records, j) => {
          const event = allEvents[i + j];
          if (records && records.length > 0) {
            const rec = records[0];
            if (rec.latitude !== 0 || rec.longitude !== 0) {
              points.push({ position: [rec.longitude, rec.latitude], type: event.type });
            }
          }
        });
      } catch (err) {
        logger.warn(`LogRecord batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${err}`);
      }
      setMapStatus(`${geotabState.translate('Locating events:')} ${Math.min(i + BATCH_SIZE, allEvents.length)} / ${allEvents.length}`);
    }

    // Density-based radius
    const grid = new Map();
    points.forEach(p => {
      const key = `${Math.round(p.position[0] / DENSITY_GRID)},${Math.round(p.position[1] / DENSITY_GRID)}`;
      grid.set(key, (grid.get(key) || 0) + 1);
    });
    const maxDensity = Math.max(1, ...grid.values());
    points.forEach(p => {
      const key = `${Math.round(p.position[0] / DENSITY_GRID)},${Math.round(p.position[1] / DENSITY_GRID)}`;
      p.radius = 4 + (grid.get(key) / maxDensity) * 12;
      p.color = [...EVENT_COLORS[p.type].rgb, 180];
    });

    return points;
  };

  // ── Map init + deck.gl overlay ─────────────────────────────────────
  useEffect(() => {
    if (loading || !mapContainer.current) return;
    const initMap = async () => {
      if (!map.current) {
        const center = await getMapCenter();
        map.current = new maplibregl.Map({
          container: mapContainer.current,
          style: 'https://nav.attrix.ai/styles/light.json',
          center, zoom: 10, minZoom: MIN_ZOOM
        });
        map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
        deckOverlay.current = new MapboxOverlay({ layers: [], interleaved: false });
        map.current.addControl(deckOverlay.current);
      }
      if (eventPoints.length > 0 && deckOverlay.current) {
        deckOverlay.current.setProps({
          layers: [
            new ScatterplotLayer({
              id: 'safety-events',
              data: eventPoints,
              getPosition: d => d.position,
              getFillColor: d => d.color,
              getRadius: d => d.radius,
              radiusUnits: 'pixels',
              radiusMinPixels: 3,
              radiusMaxPixels: 18,
              opacity: 0.8,
              antialiasing: true
            })
          ]
        });
        const bounds = new maplibregl.LngLatBounds();
        eventPoints.forEach(p => bounds.extend(p.position));
        if (!bounds.isEmpty()) map.current.fitBounds(bounds, { padding: 40 });
      }
    };
    initMap();
  }, [loading, eventPoints]);

  useEffect(() => {
    return () => { if (map.current) { map.current.remove(); map.current = null; } };
  }, []);

  // ── Main data loader ───────────────────────────────────────────────
  useEffect(() => {
    const currentFilter = getGroupFilterKey();
    if (hasData.current && currentFilter === lastGroupFilter.current) return;
    lastGroupFilter.current = currentFilter;

    setLoading(true);
    setEventPoints([]);
    setDeviceEventData([]);
    setMapStatus('');
    const { thisWeek, prevWeek } = getWeekRanges();

    geotabApi.call('Get', { typeName: 'Rule' }, (rules) => {
      const enabledRuleIds = new Set();
      rules.forEach(rule => { if (ALL_RULE_IDS.has(rule.id)) enabledRuleIds.add(rule.id); });

      logger.log(`Found ${enabledRuleIds.size} enabled safety rules out of ${ALL_RULE_IDS.size}`);

      const disabled = new Set();
      const activeRulesByGroup = {};
      for (const [group, ruleIds] of Object.entries(RULE_GROUPS)) {
        const active = ruleIds.filter(id => enabledRuleIds.has(id));
        activeRulesByGroup[group] = active;
        if (active.length === 0) disabled.add(group);
      }
      setDisabledGroups(disabled);

      const rulesToFetch = [];
      for (const activeRules of Object.values(activeRulesByGroup)) rulesToFetch.push(...activeRules);

      if (rulesToFetch.length === 0) {
        const zeros = { speeding: 0, acceleration: 0, cornering: 0, braking: 0, tailgating: 0, collisions: 0 };
        setCounts(zeros); setPrevCounts(zeros); setLoading(false); hasData.current = true;
        return;
      }

      const thisWeekCalls = rulesToFetch.map(ruleId => ['Get', {
        typeName: 'ExceptionEvent',
        search: { fromDate: thisWeek.fromDate, toDate: thisWeek.toDate, ruleSearch: { id: ruleId } }
      }]);
      const prevWeekCalls = rulesToFetch.map(ruleId => ['Get', {
        typeName: 'ExceptionEvent',
        search: { fromDate: prevWeek.fromDate, toDate: prevWeek.toDate, ruleSearch: { id: ruleId } }
      }]);

      const allCalls = [...thisWeekCalls, ...prevWeekCalls];
      const n = rulesToFetch.length;

      geotabApi.multiCall(allCalls, async (results) => {
        const thisWeekResults = results.slice(0, n);
        const prevWeekResults = results.slice(n);

        const sumByGroup = (weekResults) => {
          const countByRule = new Map();
          weekResults.forEach((events, i) => countByRule.set(rulesToFetch[i], events ? events.length : 0));
          const totals = {};
          for (const [group, ruleIds] of Object.entries(activeRulesByGroup)) {
            totals[group] = ruleIds.reduce((sum, id) => sum + (countByRule.get(id) || 0), 0);
          }
          return totals;
        };

        const thisTotals = sumByGroup(thisWeekResults);
        const prevTotals = sumByGroup(prevWeekResults);

        setCounts(thisTotals);
        setPrevCounts(prevTotals);
        setLoading(false);
        hasData.current = true;
        logger.log('Safety events loaded', { thisWeek: thisTotals, prevWeek: prevTotals });

        // ── Collect events + aggregate by device ───────────────────
        const allEvents = [];
        const deviceMap = new Map();

        thisWeekResults.forEach((events, i) => {
          if (!events) return;
          const group = ruleToGroup(rulesToFetch[i], activeRulesByGroup);
          if (!group) return;
          events.forEach(event => {
            if (!event.activeFrom || !event.device || !event.device.id) return;
            const did = event.device.id;
            allEvents.push({ activeFrom: event.activeFrom, deviceId: did, type: group });
            if (!deviceMap.has(did)) {
              deviceMap.set(did, { speeding: 0, acceleration: 0, cornering: 0, braking: 0, tailgating: 0, collisions: 0 });
            }
            deviceMap.get(did)[group]++;
          });
        });

        // Fetch device names and build chart data
        const deviceIds = [...deviceMap.keys()];
        const nameMap = await fetchDeviceNames(deviceIds);
        const sorted = [...deviceMap.entries()]
          .map(([id, eventCounts]) => ({
            id,
            name: nameMap.get(id) || id,
            counts: eventCounts,
            total: Object.values(eventCounts).reduce((a, b) => a + b, 0)
          }))
          .sort((a, b) => b.total - a.total);
        setDeviceEventData(sorted);

        // ── Fetch event locations for map ──────────────────────────
        if (allEvents.length === 0) return;
        logger.log(`Fetching locations for ${allEvents.length} exception events`);
        setMapStatus(`${geotabState.translate('Locating events:')} 0 / ${allEvents.length}`);
        const points = await fetchEventLocations(allEvents);
        logger.log(`Mapped ${points.length} events to coordinates`);
        setEventPoints(points);
        setMapStatus('');
      }, (error) => {
        logger.error('Error loading safety events: ' + error);
        setLoading(false);
      });
    }, (error) => {
      logger.error('Error loading rules: ' + error);
      setLoading(false);
    });
  }, [focusKey]);

  // ── Helpers for rendering ──────────────────────────────────────────
  const colorDot = (hex) => (
    <svg width="14" height="14" viewBox="0 0 14 14" style={{ flexShrink: 0 }}>
      <circle cx="7" cy="7" r="6" fill={hex} />
    </svg>
  );

  const labelForType = (type) => {
    const cfg = TILE_CONFIG.find(t => t.key === type);
    return cfg ? geotabState.translate(cfg.label) : type;
  };

  const renderDeviceChart = () => {
    if (deviceEventData.length === 0) return null;
    const maxTotal = deviceEventData[0].total;

    let items = deviceEventData;
    if (deviceEventData.length > TRUNCATE_THRESHOLD) {
      const top = deviceEventData.slice(0, 10);
      const bottom = deviceEventData.slice(-10);
      items = [...top, null, ...bottom];
    }

    return (
      <div className="distance-chart">
        <div className="distance-chart-title">{geotabState.translate('Events by Vehicle')}</div>
        <div className="distance-chart-list">
          {items.map((item, i) => {
            if (item === null) {
              return (
                <div key="separator" className="distance-chart-separator">
                  <span>&#8942;</span>
                  <span className="separator-label">
                    {deviceEventData.length - 20} {geotabState.translate('more')}
                  </span>
                </div>
              );
            }
            return (
              <div key={item.id} className="distance-bar-row">
                <div className="distance-bar-name" title={item.name}>{item.name}</div>
                <div className="stacked-bar-track">
                  {EVENT_ORDER.map(type => {
                    const count = item.counts[type] || 0;
                    if (count === 0) return null;
                    const pct = (count / maxTotal) * 100;
                    return (
                      <div
                        key={type}
                        className="stacked-bar-segment"
                        style={{ width: `${pct}%`, backgroundColor: EVENT_COLORS[type].hex }}
                        data-tooltip={`${labelForType(type)}: ${count}`}
                      />
                    );
                  })}
                </div>
                <div className="distance-bar-value">{item.total}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div>
      {loading ? (
        <div style={{ marginTop: '16px' }}>
          <ProgressBar min={0} max={100} now={50} size="medium" />
          <div className="status-message">{geotabState.translate('Loading safety events...')}</div>
        </div>
      ) : (
        <>
          <SummaryTileBar>
            {TILE_CONFIG.map(({ key, label }) => {
              const isDisabled = disabledGroups.has(key);
              return (
                <SummaryTile
                  key={key}
                  id={key}
                  title={geotabState.translate(label)}
                  size={SummaryTileSize.Small}
                  className={isDisabled ? 'tile-disabled' : undefined}
                >
                  {isDisabled ? (
                    <span className="tile-no-rules">{geotabState.translate('No rules')}</span>
                  ) : (
                    <Overview
                      icon={colorDot(EVENT_COLORS[key].hex)}
                      title={String(counts[key] || 0)}
                      description={geotabState.translate('events')}
                      label={getLabel(counts[key] || 0, prevCounts[key] || 0)}
                    />
                  )}
                </SummaryTile>
              );
            })}
          </SummaryTileBar>

          <div className="map-and-chart" style={{ marginTop: '16px' }}>
            <div className="map-section">
              <div className="map-wrapper">
                <div ref={mapContainer} className="map-container" />
              </div>
              {mapStatus && (
                <div style={{ marginTop: '8px' }}>
                  <div className="status-message">{mapStatus}</div>
                </div>
              )}
            </div>
            {renderDeviceChart()}
          </div>
        </>
      )}
    </div>
  );
};

export default SafetyTab;
