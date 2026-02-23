/* eslint-disable */
import { createRoot } from 'react-dom/client';
import App from './components/App.jsx';

/**
 * @returns {{initialize: Function, focus: Function, blur: Function}}
 */
geotab.addin.fuelTransactions = function (api, state, meta) {
  'use strict';
  const appName = 'fuelTransactions';
  const addinId = 'MTBkYzZjYjktYWYzYi00MW';

  // the root container
  var elAddin = document.getElementById(appName);

  let reactRoot;

  return {

    /**
     * initialize() is called only once when the Add-In is first loaded.
     */
    initialize: function (freshApi, freshState, initializeCallback) {
      // Loading translations if available
      if (freshState.translate) {
        freshState.translate(elAddin || '');
      }

      reactRoot = createRoot(elAddin);

      // MUST call initializeCallback when done any setup
      initializeCallback();
    },

    /**
     * focus() is called whenever the Add-In receives focus.
     */
    focus: function (freshApi, freshState) {

      elAddin.className = elAddin.className.replace('hidden', '').trim();
      freshApi.getSession(session => {
        freshState.currentSession = session;
        reactRoot.render(<App geotabApi={freshApi} geotabState={freshState} appName={appName} addinId={addinId} language={freshState.language || 'en'} />);
      });
    },

    /**
     * blur() is called whenever the user navigates away from the Add-In.
     */
    blur: function () {

    }
  };
};
