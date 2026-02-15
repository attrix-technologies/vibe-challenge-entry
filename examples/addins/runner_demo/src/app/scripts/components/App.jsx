import React, { useRef } from 'react';
import { LanguageProvider } from '@geotab/zenith';

import DevicesPage from './DevicesPage.jsx';

import GeotabContext from '../contexts/Geotab';
import Logger from '../utils/logger';

import '@geotab/zenith/dist/index.css'


const App = ({ geotabApi, geotabState, appName, language }) => {
  const logger = Logger(appName);
  // Increment on every render — App only re-renders when focus() calls reactRoot.render()
  const focusKeyRef = useRef(0);
  focusKeyRef.current += 1;

  const context = { geotabApi, geotabState, logger, focusKey: focusKeyRef.current };

  return (
    <LanguageProvider language={language}>
      <GeotabContext.Provider value={[context]}>
        <DevicesPage />
      </GeotabContext.Provider>
    </LanguageProvider>
  );
};

export default App;
