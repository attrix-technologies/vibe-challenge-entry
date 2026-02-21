import React, { useRef, useState, useEffect, useCallback } from 'react';
import { LanguageProvider, Tabs, Header } from '@geotab/zenith';

import ProductivityTab from './ProductivityTab.jsx';
import SafetyTab from './SafetyTab.jsx';
import ComplianceTab from './ComplianceTab.jsx';
import SustainabilityTab from './SustainabilityTab.jsx';
import WrappedOverlay from './WrappedOverlay.jsx';

import GeotabContext from '../contexts/Geotab';
import Logger from '../utils/logger';

import '@geotab/zenith/dist/index.css'
import 'maplibre-gl/dist/maplibre-gl.css';

// ── Demo mode: anonymize names on localhost ─────────────────────────
const IS_LOCAL_DEV = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const DEMO_FIRST = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery', 'Cameron', 'Dakota',
  'Emerson', 'Finley', 'Harper', 'Jesse', 'Kennedy', 'Logan', 'Mackenzie', 'Noel', 'Parker', 'Reese'];
const DEMO_LAST = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez',
  'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris'];

const App = ({ geotabApi, geotabState, appName, language }) => {
  const logger = Logger(appName);
  const focusKeyRef = useRef(0);
  focusKeyRef.current += 1;

  const [selectedTab, setSelectedTab] = useState('productivity');
  const [devices, setDevices] = useState(null);  // Map<id, name> | null while loading
  const [drivers, setDrivers] = useState(null);  // Map<id, {name, timeZoneId}> | null while loading
  const [isMetric, setIsMetric] = useState(true);
  const lastDeviceFilterRef = useRef(null);

  // ── Wrapped ────────────────────────────
  const isMonday = useRef(new Date().getDay() === 1).current;
  const wrappedRef = useRef({});
  const [wrappedReady, setWrappedReady] = useState(false);
  const [wrappedSeen, setWrappedSeen] = useState(false);
  const [showWrapped, setShowWrapped] = useState(false);
  const WRAPPED_KEYS = ['productivity', 'safety', 'compliance', 'sustainability'];
  const reportWrapped = useCallback((key, data) => {
    wrappedRef.current[key] = data;
    if (isMonday && !wrappedReady && WRAPPED_KEYS.every(k => k in wrappedRef.current)) {
      setWrappedReady(true);
    }
  }, [wrappedReady]);

  // ── Fetch devices + drivers for current group filter ───────────────
  useEffect(() => {
    const filterKey = JSON.stringify(geotabState.getGroupFilter());
    if (devices && drivers && filterKey === lastDeviceFilterRef.current) return;
    lastDeviceFilterRef.current = filterKey;

    setDevices(null);
    setDrivers(null);
    const groupFilter = geotabState.getGroupFilter();
    const groups = groupFilter.length > 0 ? groupFilter : [{ id: 'GroupCompanyId' }];

    geotabApi.multiCall([
      ['Get', {
        typeName: 'Device',
        search: { groups },
        propertySelector: { fields: ['id', 'name', 'vehicleIdentificationNumber', 'serialNumber'], isIncluded: true }
      }],
      ['Get', {
        typeName: 'User',
        search: { isDriver: true, fromDate: new Date().toISOString(), companyGroups: groups },
        propertySelector: { fields: ['id', 'firstName', 'lastName', 'name', 'timeZoneId'], isIncluded: true }
      }]
    ], (results) => {
      const deviceMap = new Map();
      (results[0] || []).forEach(d => deviceMap.set(d.id, {
        name: d.name || d.id,
        vin: d.vehicleIdentificationNumber || null,
        serialNumber: d.serialNumber || null
      }));
      logger.log(`Loaded ${deviceMap.size} devices for group filter`);

      const driverMap = new Map();
      (results[1] || []).forEach(u => {
        const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim();
        driverMap.set(u.id, {
          name: fullName || u.name || u.id,
          timeZoneId: u.timeZoneId || 'UTC'
        });
      });
      logger.log(`Loaded ${driverMap.size} drivers for group filter`);

      // Anonymize names in local dev (demo recording)
      if (IS_LOCAL_DEV) {
        let v = 1;
        deviceMap.forEach(info => { info.name = `Vehicle ${v++}`; });
        let d = 0;
        driverMap.forEach(info => {
          info.name = `${DEMO_FIRST[d % DEMO_FIRST.length]} ${DEMO_LAST[Math.floor(d / DEMO_FIRST.length) % DEMO_LAST.length]}`;
          d++;
        });
        logger.log('Demo mode: anonymized device and driver names');
      }

      setDevices(deviceMap);
      setDrivers(driverMap);
    }, (error) => {
      logger.error('Error fetching devices/drivers: ' + error);
      setDevices(new Map());
      setDrivers(new Map());
    });
  }, [focusKeyRef.current]);

  // ── Fetch current user's isMetric preference (one-time) ──────────
  useEffect(() => {
    geotabApi.getSession(session => {
      geotabApi.call('Get', {
        typeName: 'User',
        search: { name: session.userName },
        propertySelector: { fields: ['isMetric'], isIncluded: true }
      }, users => {
        setIsMetric(users[0]?.isMetric ?? true);
        logger.log(`User isMetric: ${users[0]?.isMetric}`);
      }, () => setIsMetric(true));
    });
  }, []);

  const context = { geotabApi, geotabState, logger, focusKey: focusKeyRef.current, devices, drivers, isMetric, language, reportWrapped };
  const t = (key) => geotabState.translate(key);

  const tabs = [
    { id: 'productivity', name: t('Productivity') },
    { id: 'safety', name: t('Safety') },
    { id: 'compliance', name: t('Compliance') },
    { id: 'sustainability', name: t('Sustainability') }
  ];

  return (
    <LanguageProvider language={language}>
      <GeotabContext.Provider value={[context]}>
        <div style={{ height: '100%' }}>
          <Header>
            <Header.Title pageName={t('Last Week in Fleet')} />
          </Header>

          <div style={{ margin: '0 1.5rem' }}>
            <Tabs tabs={tabs} activeTabId={selectedTab} onTabChange={setSelectedTab} />
          </div>

          <div className="tab-content">
            <div style={{ display: selectedTab === 'productivity' ? 'block' : 'none' }}>
              <ProductivityTab />
            </div>
            <div style={{ display: selectedTab === 'safety' ? 'block' : 'none' }}>
              <SafetyTab />
            </div>
            <div style={{ display: selectedTab === 'compliance' ? 'block' : 'none' }}>
              <ComplianceTab />
            </div>
            <div style={{ display: selectedTab === 'sustainability' ? 'block' : 'none' }}>
              <SustainabilityTab />
            </div>
          </div>

          {wrappedReady && !wrappedSeen && (
            <div className="wrapped-ribbon" onClick={() => setShowWrapped(true)}>
              <div className="wrapped-ribbon-stripe" />
            </div>
          )}

          {showWrapped && (
            <WrappedOverlay
              stats={wrappedRef.current}
              language={language}
              isMetric={isMetric}
              onClose={() => { setShowWrapped(false); setWrappedSeen(true); }}
            />
          )}
        </div>
      </GeotabContext.Provider>
    </LanguageProvider>
  );
};

export default App;
