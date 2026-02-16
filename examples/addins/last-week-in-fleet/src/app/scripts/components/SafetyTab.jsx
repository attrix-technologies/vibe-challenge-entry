import React, { useContext } from 'react';
import GeotabContext from '../contexts/Geotab';

const SafetyTab = () => {
  const [{ geotabState }] = useContext(GeotabContext);

  return (
    <div>
      <h2>{geotabState.translate('Safety')}</h2>
      <p>{geotabState.translate('Safety metrics and insights will appear here.')}</p>
      <p style={{ color: '#6c757d', marginTop: '16px' }}>
        {geotabState.translate('This tab will show:')}
      </p>
      <ul style={{ color: '#6c757d' }}>
        <li>{geotabState.translate('Speeding events')}</li>
        <li>{geotabState.translate('Harsh braking incidents')}</li>
        <li>{geotabState.translate('Aggressive acceleration events')}</li>
        <li>{geotabState.translate('Driver safety scores')}</li>
        <li>{geotabState.translate('Collision risk analysis')}</li>
      </ul>
    </div>
  );
};

export default SafetyTab;
