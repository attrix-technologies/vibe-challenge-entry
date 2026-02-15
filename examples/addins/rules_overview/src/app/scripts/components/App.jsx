import React, { useRef } from 'react';

import RulesOverviewPage from './RulesOverviewPage.jsx';

import GeotabContext from '../contexts/Geotab';
import Logger from '../utils/logger';

import '@geotab/zenith/dist/index.css'


const App = ({ geotabApi, geotabState, appName }) => {
  const logger = Logger(appName);
  // Increment on every render — App only re-renders when focus() calls reactRoot.render()
  const focusKeyRef = useRef(0);
  focusKeyRef.current += 1;

  const context = { geotabApi, geotabState, logger, focusKey: focusKeyRef.current };

  return (
    <>
      <GeotabContext.Provider value={[context]}>
        <RulesOverviewPage />
      </GeotabContext.Provider>
    </>
  );
};

export default App;
