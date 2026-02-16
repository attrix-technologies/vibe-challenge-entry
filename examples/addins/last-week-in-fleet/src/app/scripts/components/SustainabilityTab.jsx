import React, { useContext } from 'react';
import GeotabContext from '../contexts/Geotab';

const SustainabilityTab = () => {
  const [{ geotabState }] = useContext(GeotabContext);

  return (
    <div>
      <h2>{geotabState.translate('Sustainability')}</h2>
      <p>{geotabState.translate('Environmental impact and sustainability metrics will appear here.')}</p>
      <p style={{ color: '#6c757d', marginTop: '16px' }}>
        {geotabState.translate('This tab will show:')}
      </p>
      <ul style={{ color: '#6c757d' }}>
        <li>{geotabState.translate('Total fuel consumption')}</li>
        <li>{geotabState.translate('CO2 emissions')}</li>
        <li>{geotabState.translate('Fuel efficiency trends')}</li>
        <li>{geotabState.translate('Electric vehicle usage statistics')}</li>
        <li>{geotabState.translate('Carbon footprint reduction recommendations')}</li>
      </ul>
    </div>
  );
};

export default SustainabilityTab;
