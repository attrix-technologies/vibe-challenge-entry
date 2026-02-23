import React, { useRef, useState, useEffect } from 'react';
import { LanguageProvider } from '@geotab/zenith';

import FuelTransactionsPage from './FuelTransactionsPage.jsx';
import GeotabContext from '../contexts/Geotab';
import Logger from '../utils/logger';

import '@geotab/zenith/dist/index.css';

const App = ({ geotabApi, geotabState, appName, language }) => {
  const logger = Logger(appName);
  const focusKeyRef = useRef(0);
  focusKeyRef.current += 1;

  const [devices, setDevices] = useState(null);
  const [drivers, setDrivers] = useState(null);
  const [isMetric, setIsMetric] = useState(true);
  const lastDeviceFilterRef = useRef(null);

  // Fetch devices + drivers for current group filter
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
        propertySelector: { fields: ['id', 'name'], isIncluded: true }
      }],
      ['Get', {
        typeName: 'User',
        search: { isDriver: true, companyGroups: groups },
        propertySelector: { fields: ['id', 'firstName', 'lastName', 'name'], isIncluded: true }
      }]
    ], (results) => {
      const deviceMap = new Map();
      (results[0] || []).forEach(d => deviceMap.set(d.id, d.name || d.id));
      logger.log(`Loaded ${deviceMap.size} devices`);

      const driverMap = new Map();
      (results[1] || []).forEach(u => {
        const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim();
        driverMap.set(u.id, fullName || u.name || u.id);
      });
      logger.log(`Loaded ${driverMap.size} drivers`);

      setDevices(deviceMap);
      setDrivers(driverMap);
    }, (error) => {
      logger.error('Error fetching devices/drivers: ' + error);
      setDevices(new Map());
      setDrivers(new Map());
    });
  }, [focusKeyRef.current]);

  // Fetch current user's isMetric preference (one-time)
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

  const context = { geotabApi, geotabState, logger, focusKey: focusKeyRef.current, devices, drivers, isMetric, language };

  return (
    <LanguageProvider language={language}>
      <GeotabContext.Provider value={[context]}>
        <div style={{ height: '100%' }}>
          <FuelTransactionsPage />
        </div>
      </GeotabContext.Provider>
    </LanguageProvider>
  );
};

export default App;
