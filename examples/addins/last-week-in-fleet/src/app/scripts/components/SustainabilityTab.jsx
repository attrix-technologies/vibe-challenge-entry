import React, { useContext } from 'react';
import GeotabContext from '../contexts/Geotab';

const SustainabilityTab = () => {
  const [{ geotabState }] = useContext(GeotabContext);
  const t = (key) => geotabState.translate(key);

  return (
    <div>
      <h2>{t('Sustainability')}</h2>
      <p>{t('Environmental impact and sustainability metrics will appear here.')}</p>
      <p style={{ color: '#6c757d', marginTop: '16px' }}>
        {t('This tab will show:')}
      </p>
      <ul style={{ color: '#6c757d' }}>
        <li>{t('Total fuel consumption')}</li>
        <li>{t('CO2 emissions')}</li>
        <li>{t('Fuel efficiency trends')}</li>
        <li>{t('Electric vehicle usage statistics')}</li>
        <li>{t('Carbon footprint reduction recommendations')}</li>
      </ul>
    </div>
  );
};

export default SustainabilityTab;
