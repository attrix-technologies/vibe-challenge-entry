import React, { useRef, useState } from 'react';
import { LanguageProvider, Tabs, Header } from '@geotab/zenith';

import ProductivityTab from './ProductivityTab.jsx';
import SafetyTab from './SafetyTab.jsx';
import ComplianceTab from './ComplianceTab.jsx';
import SustainabilityTab from './SustainabilityTab.jsx';

import GeotabContext from '../contexts/Geotab';
import Logger from '../utils/logger';

import '@geotab/zenith/dist/index.css'
import 'maplibre-gl/dist/maplibre-gl.css';

const App = ({ geotabApi, geotabState, appName, language }) => {
  const logger = Logger(appName);
  const focusKeyRef = useRef(0);
  focusKeyRef.current += 1;

  const [selectedTab, setSelectedTab] = useState('productivity');

  const context = { geotabApi, geotabState, logger, focusKey: focusKeyRef.current };
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

          <Tabs tabs={tabs} activeTabId={selectedTab} onTabChange={setSelectedTab} />

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
        </div>
      </GeotabContext.Provider>
    </LanguageProvider>
  );
};

export default App;
