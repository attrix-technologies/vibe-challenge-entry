import React, { useContext } from 'react';
import GeotabContext from '../contexts/Geotab';

const ComplianceTab = () => {
  const [{ geotabState }] = useContext(GeotabContext);

  return (
    <div>
      <h2>{geotabState.translate('Compliance')}</h2>
      <p>{geotabState.translate('Compliance metrics and reports will appear here.')}</p>
      <p style={{ color: '#6c757d', marginTop: '16px' }}>
        {geotabState.translate('This tab will show:')}
      </p>
      <ul style={{ color: '#6c757d' }}>
        <li>{geotabState.translate('HOS (Hours of Service) violations')}</li>
        <li>{geotabState.translate('Driver duty status logs')}</li>
        <li>{geotabState.translate('Vehicle inspection reports')}</li>
        <li>{geotabState.translate('Regulatory compliance scores')}</li>
        <li>{geotabState.translate('DVIR (Driver Vehicle Inspection Report) completion rates')}</li>
      </ul>
    </div>
  );
};

export default ComplianceTab;
