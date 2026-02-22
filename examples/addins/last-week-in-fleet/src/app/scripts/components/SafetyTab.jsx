import React, { useState, useEffect, useContext, useRef } from 'react';
import { SummaryTileBar, SummaryTile, SummaryTileSize } from '@geotab/zenith';
import { Overview, OverviewOptionsArrow, OverviewOptionsType } from '@geotab/zenith/dist/overview/overview';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { ScatterplotLayer } from '@deck.gl/layers';
import maplibregl from 'maplibre-gl';
import GeotabContext from '../contexts/Geotab';
import { fmt } from '../utils/units';

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
const TRUNCATE_THRESHOLD = 20;
const DEFAULT_CENTER = [-73.17375896, 45.57401727];
const MIN_ZOOM = 3;
const DENSITY_GRID = 0.005;

const SafetyTab = () => {
  const [context] = useContext(GeotabContext);
  const { geotabApi, logger, focusKey, geotabState, devices, language, reportWrapped } = context;
  const t = (key) => geotabState.translate(key);

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
  const [mapProgress, setMapProgress] = useState(0);
  const [hoveredDeviceId, setHoveredDeviceId] = useState(null);
  const hasFitBounds = useRef(false);
  const mapBoundsRef = useRef(null);
  const locationAbortRef = useRef(false);

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

  // ── Fetch LogRecords in batches (progressive — updates map after each batch) ──
  const fetchEventLocationsProgressive = async (allEvents) => {
    if (allEvents.length === 0) return;
    locationAbortRef.current = false;

    const logCalls = allEvents.map(e => ['Get', {
      typeName: 'LogRecord',
      search: {
        deviceSearch: { id: e.deviceId },
        fromDate: e.activeFrom,
        toDate: e.activeFrom
      }
    }]);

    const accumulated = []; // raw {position, type} without radius/color yet

    for (let i = 0; i < logCalls.length; i += BATCH_SIZE) {
      if (locationAbortRef.current) break;
      const batch = logCalls.slice(i, Math.min(i + BATCH_SIZE, logCalls.length));
      try {
        const batchResults = await new Promise((resolve, reject) => {
          geotabApi.multiCall(batch, resolve, reject);
        });
        if (locationAbortRef.current) break;
        batchResults.forEach((records, j) => {
          const event = allEvents[i + j];
          if (records && records.length > 0) {
            const rec = records[0];
            if (rec.latitude !== 0 || rec.longitude !== 0) {
              accumulated.push({ position: [rec.longitude, rec.latitude], type: event.type, deviceId: event.deviceId });
            }
          }
        });
      } catch (err) {
        logger.warn(`LogRecord batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${err}`);
      }
      const done = Math.min(i + BATCH_SIZE, allEvents.length);
      setMapStatus(`${t('Locating events:')} ${done} / ${allEvents.length}`);
      setMapProgress(Math.round((done / allEvents.length) * 100));

      // Recalculate density on all accumulated points and push to state
      if (accumulated.length > 0) {
        const grid = new Map();
        accumulated.forEach(p => {
          const key = `${Math.round(p.position[0] / DENSITY_GRID)},${Math.round(p.position[1] / DENSITY_GRID)}`;
          grid.set(key, (grid.get(key) || 0) + 1);
        });
        const maxDensity = Math.max(1, ...grid.values());
        const styled = accumulated.map(p => {
          const key = `${Math.round(p.position[0] / DENSITY_GRID)},${Math.round(p.position[1] / DENSITY_GRID)}`;
          return {
            position: p.position,
            type: p.type,
            deviceId: p.deviceId,
            radius: 4 + (grid.get(key) / maxDensity) * 12,
            color: [...EVENT_COLORS[p.type].rgb, 180]
          };
        });
        setEventPoints(styled);
      }
    }
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
      if (!deckOverlay.current) return;
      if (eventPoints.length === 0) {
        deckOverlay.current.setProps({ layers: [] });
        return;
      }
      deckOverlay.current.setProps({
        layers: [
          new ScatterplotLayer({
            id: 'safety-events',
            data: eventPoints,
            getPosition: d => d.position,
            getFillColor: d => {
              if (!hoveredDeviceId) return d.color;
              return d.deviceId === hoveredDeviceId ? [...d.color.slice(0, 3), 220] : [...d.color.slice(0, 3), 25];
            },
            getRadius: d => d.radius,
            radiusUnits: 'pixels',
            radiusMinPixels: 3,
            radiusMaxPixels: 18,
            opacity: 0.8,
            antialiasing: true,
            updateTriggers: { getFillColor: hoveredDeviceId },
            transitions: { getFillColor: 150 }
          })
        ]
      });
      if (!hasFitBounds.current) {
        const bounds = new maplibregl.LngLatBounds();
        eventPoints.forEach(p => bounds.extend(p.position));
        if (!bounds.isEmpty()) {
          mapBoundsRef.current = bounds;
          map.current.fitBounds(bounds, { padding: 40 });
          hasFitBounds.current = true;
        }
      }
    };
    initMap();
  }, [loading, eventPoints, hoveredDeviceId]);

  // Re-fit bounds when map container resizes (e.g. chart appears beside it)
  useEffect(() => {
    const container = mapContainer.current;
    if (!container) return;
    let debounce;
    const observer = new ResizeObserver(() => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        if (map.current) {
          map.current.resize();
          if (mapBoundsRef.current) {
            map.current.fitBounds(mapBoundsRef.current, { padding: 40 });
          }
        }
      }, 150);
    });
    observer.observe(container);
    return () => {
      clearTimeout(debounce);
      observer.disconnect();
      if (map.current) { map.current.remove(); map.current = null; }
    };
  }, []);

  // ── Main data loader ───────────────────────────────────────────────
  useEffect(() => {
    if (!devices) {
      hasData.current = false;
      lastGroupFilter.current = null;
      if (deckOverlay.current) deckOverlay.current.setProps({ layers: [] });
      mapBoundsRef.current = null;
      return;
    }

    const currentFilter = getGroupFilterKey();
    if (hasData.current && currentFilter === lastGroupFilter.current) return;
    lastGroupFilter.current = currentFilter;

    setLoading(true);
    setEventPoints([]);
    setDeviceEventData([]);
    setMapStatus('');
    setMapProgress(0);
    hasFitBounds.current = false;
    mapBoundsRef.current = null;
    if (deckOverlay.current) deckOverlay.current.setProps({ layers: [] });
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

      const groupFilter = geotabState.getGroupFilter();
      const deviceGroups = groupFilter.length > 0 ? groupFilter : [{ id: 'GroupCompanyId' }];
      const thisWeekCalls = rulesToFetch.map(ruleId => ['Get', {
        typeName: 'ExceptionEvent',
        search: { fromDate: thisWeek.fromDate, toDate: thisWeek.toDate, ruleSearch: { id: ruleId }, deviceSearch: { groups: deviceGroups } }
      }]);
      const prevWeekCalls = rulesToFetch.map(ruleId => ['Get', {
        typeName: 'ExceptionEvent',
        search: { fromDate: prevWeek.fromDate, toDate: prevWeek.toDate, ruleSearch: { id: ruleId }, deviceSearch: { groups: deviceGroups } }
      }]);

      const allCalls = [...thisWeekCalls, ...prevWeekCalls];
      const n = rulesToFetch.length;

      geotabApi.multiCall(allCalls, async (results) => {
        const thisWeekResults = results.slice(0, n);
        const prevWeekResults = results.slice(n);

        const sumByGroup = (weekResults) => {
          const countByRule = new Map();
          weekResults.forEach((events, i) => {
            const scoped = events ? events.filter(e => devices.has(e.device?.id)) : [];
            countByRule.set(rulesToFetch[i], scoped.length);
          });
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

        reportWrapped('safety', {
          totalEvents: Object.values(thisTotals).reduce((a, b) => a + b, 0),
          ...thisTotals
        });

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
            if (!devices.has(did)) return; // skip events outside group scope
            allEvents.push({ activeFrom: event.activeFrom, deviceId: did, type: group });
            if (!deviceMap.has(did)) {
              deviceMap.set(did, { speeding: 0, acceleration: 0, cornering: 0, braking: 0, tailgating: 0, collisions: 0 });
            }
            deviceMap.get(did)[group]++;
          });
        });

        // Build chart data using shared device names
        const sorted = [...deviceMap.entries()]
          .map(([id, eventCounts]) => ({
            id,
            name: devices.get(id)?.name || id,
            counts: eventCounts,
            total: Object.values(eventCounts).reduce((a, b) => a + b, 0)
          }))
          .sort((a, b) => b.total - a.total);
        setDeviceEventData(sorted);

        // ── Fetch event locations for map (progressive) ─────────
        if (allEvents.length === 0) return;
        logger.log(`Fetching locations for ${allEvents.length} exception events`);
        setMapStatus(`${t('Locating events:')} 0 / ${allEvents.length}`);
        await fetchEventLocationsProgressive(allEvents);
        setMapStatus('');
        setMapProgress(0);
      }, (error) => {
        logger.error('Error loading safety events: ' + error);
        setLoading(false);
      });
    }, (error) => {
      logger.error('Error loading rules: ' + error);
      setLoading(false);
    });
  }, [focusKey, devices]);

  // ── Helpers for rendering ──────────────────────────────────────────
  const colorDot = (hex) => (
    <svg width="14" height="14" viewBox="0 0 14 14" style={{ flexShrink: 0 }}>
      <circle cx="7" cy="7" r="6" fill={hex} />
    </svg>
  );

  const labelForType = (type) => {
    const cfg = TILE_CONFIG.find(t => t.key === type);
    return cfg ? t(cfg.label) : type;
  };

  const renderDeviceChart = () => {
    if (deviceEventData.length === 0) return null;
    const maxTotal = deviceEventData[0].total;

    let items = deviceEventData;
    if (deviceEventData.length > TRUNCATE_THRESHOLD) {
      items = [...deviceEventData.slice(0, TRUNCATE_THRESHOLD), null];
    }

    return (
      <div className="distance-chart">
        <div className="distance-chart-title">{t('Events by Vehicle')}</div>
        <div className="distance-chart-list">
          {items.map((item, i) => {
            if (item === null) {
              return (
                <div key="separator" className="distance-chart-separator">
                  <span>&#8942;</span>
                  <span className="separator-label">
                    {deviceEventData.length - TRUNCATE_THRESHOLD} {t('more')}
                  </span>
                </div>
              );
            }
            return (
              <div key={item.id} className="distance-bar-row"
                style={hoveredDeviceId && hoveredDeviceId !== item.id ? { opacity: 0.1 } : undefined}
                onMouseEnter={() => setHoveredDeviceId(item.id)}
                onMouseLeave={() => setHoveredDeviceId(null)}
              >
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
                        data-tooltip={`${labelForType(type)}: ${fmt(count, language)}`}
                      />
                    );
                  })}
                </div>
                <div className="distance-bar-value">{fmt(item.total, language)}</div>
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
        <div className="slim-progress">
          <div className="slim-progress-fill indeterminate" />
          <div className="slim-progress-text">{t('Loading safety events...')}</div>
        </div>
      ) : (
        <SummaryTileBar>
          {TILE_CONFIG.map(({ key, label }) => {
            const isDisabled = disabledGroups.has(key);
            return (
              <SummaryTile
                key={key}
                id={key}
                title={t(label)}
                size={SummaryTileSize.Small}
                className={isDisabled ? 'tile-disabled' : undefined}
              >
                {isDisabled ? (
                  <span className="tile-no-rules">{t('No rules')}</span>
                ) : (
                  <Overview
                    icon={colorDot(EVENT_COLORS[key].hex)}
                    title={fmt(counts[key] || 0, language)}
                    description={t('events')}
                    label={getLabel(counts[key] || 0, prevCounts[key] || 0)}
                  />
                )}
              </SummaryTile>
            );
          })}
        </SummaryTileBar>
      )}

      {mapStatus && !loading && (
        <div className="slim-progress">
          <div className="slim-progress-fill" style={{ width: `${mapProgress}%` }} />
          <div className="slim-progress-text">{mapStatus}</div>
          <button className="slim-progress-abort" onClick={() => {
            locationAbortRef.current = true;
            setMapStatus('');
            setMapProgress(0);
          }}>&#215;</button>
        </div>
      )}

      <div className="map-and-chart" style={{ display: loading ? 'none' : undefined }}>
        <div className="map-section">
          <div className="map-wrapper">
            <div ref={mapContainer} className="map-container" />
          </div>
        </div>
        {renderDeviceChart()}
      </div>
    </div>
  );
};

export default SafetyTab;
