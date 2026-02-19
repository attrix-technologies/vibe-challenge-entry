const KM_TO_MI = 1 / 1.60934;
const L_TO_GAL = 1 / 3.78541;
const KG_TO_LB = 2.20462;

export const convertDistance = (km, isMetric) => isMetric ? km : km * KM_TO_MI;
export const convertVolume = (liters, isMetric) => isMetric ? liters : liters * L_TO_GAL;
export const convertWeight = (kg, isMetric) => isMetric ? kg : kg * KG_TO_LB;
export const convertEconomy = (lPer100km, isMetric) => isMetric ? lPer100km : 235.215 / lPer100km;

export const distanceUnit = (isMetric) => isMetric ? 'km' : 'mi';
export const volumeUnit = (isMetric) => isMetric ? 'L' : 'gal';
export const weightUnit = (isMetric) => isMetric ? 'kg' : 'lb';
export const economyUnit = (isMetric) => isMetric ? 'L/100km' : 'MPG';

export const fmt = (value, language, decimals = 0) => {
  if (value == null || value === '—') return '—';
  return new Intl.NumberFormat(language, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
};
