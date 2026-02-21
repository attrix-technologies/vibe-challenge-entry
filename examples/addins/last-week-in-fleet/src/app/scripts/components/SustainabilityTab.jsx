import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import { SummaryTileBar, SummaryTile, SummaryTileSize, Table, Banner } from '@geotab/zenith';
import { Overview } from '@geotab/zenith/dist/overview/overview';
import GeotabContext from '../contexts/Geotab';
import { convertDistance, convertVolume, convertWeight, convertEconomy, distanceUnit, volumeUnit, weightUnit, economyUnit, fmt } from '../utils/units';

const GHG_FACTORS = { Diesel: 2.68, Gasoline: 2.31 }; // kg CO2 per liter
const VIN_BATCH_SIZE = 50;
const FUEL_CALL_BATCH = 100;

const classifyFuel = (primary, secondary) => {
  const p = (primary || '').toLowerCase();
  const s = (secondary || '').toLowerCase();
  if (p.includes('diesel') || s.includes('diesel')) return 'Diesel';
  if (p.includes('gasoline') || s.includes('gasoline')) return 'Gasoline';
  return null; // electric-only or unknown
};

const DISABLED_TILE_STYLE = { opacity: 0.4, pointerEvents: 'none' };

const SustainabilityTab = () => {
  const [context] = useContext(GeotabContext);
  const { geotabApi, logger, focusKey, geotabState, devices, isMetric, language, reportWrapped } = context;
  const t = (key) => geotabState.translate(key);

  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [dieselLiters, setDieselLiters] = useState(0);
  const [gasolineLiters, setGasolineLiters] = useState(0);
  const [dieselIdlingLiters, setDieselIdlingLiters] = useState(0);
  const [gasolineIdlingLiters, setGasolineIdlingLiters] = useState(0);
  const [dieselCO2, setDieselCO2] = useState(0);
  const [gasolineCO2, setGasolineCO2] = useState(0);
  const [dieselIdlingCO2, setDieselIdlingCO2] = useState(0);
  const [gasolineIdlingCO2, setGasolineIdlingCO2] = useState(0);
  const [dieselEconomy, setDieselEconomy] = useState(null); // L/100km or null
  const [gasolineEconomy, setGasolineEconomy] = useState(null);
  const [fuelByVehicle, setFuelByVehicle] = useState([]);
  const [excludedCount, setExcludedCount] = useState(0);

  const hasData = useRef(false);
  const lastGroupFilter = useRef(null);
  const loadGeneration = useRef(0);

  const getGroupFilterKey = () => {
    try { return JSON.stringify(geotabState.getGroupFilter()); }
    catch { return ''; }
  };

  const getLastWeekRange = () => {
    const now = new Date();
    const day = now.getDay();
    const lastSunday = new Date(now);
    lastSunday.setDate(now.getDate() - day - 7);
    lastSunday.setHours(0, 0, 0, 0);
    const lastSaturday = new Date(lastSunday);
    lastSaturday.setDate(lastSunday.getDate() + 6);
    lastSaturday.setHours(23, 59, 59, 999);
    return { fromDate: lastSunday.toISOString(), toDate: lastSaturday.toISOString() };
  };

  // ── Decode VINs via NHTSA batch API ──────────────────────────────────
  const decodeVinBatch = async (vins) => {
    const resp = await fetch(
      'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVINValuesBatch/',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `format=json&data=${encodeURIComponent(vins.join(';'))}`
      }
    );
    if (!resp.ok) throw new Error(`NHTSA API error: ${resp.status}`);
    const json = await resp.json();
    const results = json.Results || [];
    logger.log(`NHTSA returned ${results.length} results for ${vins.length} VINs`);
    const map = new Map();
    results.forEach((r, idx) => {
      const vin = (r.VIN || vins[idx] || '').toUpperCase();
      if (vin) {
        map.set(vin, {
          fuelPrimary: r.FuelTypePrimary || null,
          fuelSecondary: r.FuelTypeSecondary || null
        });
      }
    });
    return map;
  };

  // ── Main data loader ─────────────────────────────────────────────────
  useEffect(() => {
    if (!devices) {
      hasData.current = false;
      lastGroupFilter.current = null;
      return;
    }

    const currentFilter = getGroupFilterKey();
    if (hasData.current && currentFilter === lastGroupFilter.current) return;
    lastGroupFilter.current = currentFilter;
    hasData.current = true;

    const gen = ++loadGeneration.current;
    const isStale = () => gen !== loadGeneration.current;

    const load = async () => {
      setLoading(true);
      setProgress(0);
      setStatusMessage(t('Loading sustainability data...'));

      try {
        // 1. Filter to tracked vehicles only (have a GO device serial number)
        const trackedDevices = new Map();
        devices.forEach((info, id) => {
          if (info.serialNumber) trackedDevices.set(id, info);
        });
        logger.log(`Sustainability: ${devices.size} total devices, ${trackedDevices.size} with serial numbers`);

        // 2. Extract VINs from tracked devices
        const vinToDeviceIds = new Map(); // VIN → [deviceId, ...]
        trackedDevices.forEach((info, id) => {
          if (info.vin) {
            const vin = info.vin.toUpperCase();
            if (!vinToDeviceIds.has(vin)) vinToDeviceIds.set(vin, []);
            vinToDeviceIds.get(vin).push(id);
          }
        });

        const allVins = [...vinToDeviceIds.keys()];
        let devicesWithVin = 0;
        vinToDeviceIds.forEach(ids => { devicesWithVin += ids.length; });
        const noVinCount = trackedDevices.size - devicesWithVin;
        logger.log(`Sustainability: ${trackedDevices.size} tracked, ${devicesWithVin} with VINs, ${noVinCount} without`);

        const setEmpty = (excluded = 0) => {
          setDieselLiters(0); setGasolineLiters(0);
          setDieselIdlingLiters(0); setGasolineIdlingLiters(0);
          setDieselCO2(0); setGasolineCO2(0);
          setDieselIdlingCO2(0); setGasolineIdlingCO2(0);
          setDieselEconomy(null); setGasolineEconomy(null);
          setFuelByVehicle([]);
          setExcludedCount(excluded);
          setStatusMessage('');
          setProgress(0);
          setLoading(false);
        };

        if (allVins.length === 0) {
          if (!isStale()) setEmpty(trackedDevices.size);
          return;
        }

        // 2. Start trip fetch in background (single call, usually fast)
        const { fromDate, toDate } = getLastWeekRange();
        const distanceByDevice = new Map(); // deviceId → distance in km
        const tripPromise = new Promise((resolve) => {
          geotabApi.call('Get', {
            typeName: 'Trip',
            search: { fromDate, toDate, includeOverlappedTrips: true }
          }, (trips) => {
            (trips || []).forEach(trip => {
              if (!devices.has(trip.device.id)) return;
              const did = trip.device.id;
              distanceByDevice.set(did, (distanceByDevice.get(did) || 0) + (trip.distance || 0));
            });
            logger.log(`Sustainability trips: ${distanceByDevice.size} devices with distance data`);
            resolve();
          }, (err) => {
            logger.error(`Trip fetch failed: ${err}`);
            resolve();
          });
        });

        // 3. Decode VINs batch-by-batch, fetching fuel for each batch immediately
        let dTotal = 0, dIdle = 0, gTotal = 0, gIdle = 0;
        let dDistKm = 0, gDistKm = 0;
        const vehicleRows = [];
        let tripsReady = false;
        let shownLayout = false;

        const updateState = () => {
          if (isStale()) return;
          vehicleRows.sort((a, b) => b.totalFuel - a.totalFuel);
          setFuelByVehicle([...vehicleRows]);

          setDieselLiters(Math.round(convertVolume(dTotal, isMetric)));
          setGasolineLiters(Math.round(convertVolume(gTotal, isMetric)));
          setDieselIdlingLiters(Math.round(convertVolume(dIdle, isMetric)));
          setGasolineIdlingLiters(Math.round(convertVolume(gIdle, isMetric)));
          setDieselCO2(Math.round(convertWeight(dTotal * GHG_FACTORS.Diesel, isMetric)));
          setGasolineCO2(Math.round(convertWeight(gTotal * GHG_FACTORS.Gasoline, isMetric)));
          setDieselIdlingCO2(Math.round(convertWeight(dIdle * GHG_FACTORS.Diesel, isMetric)));
          setGasolineIdlingCO2(Math.round(convertWeight(gIdle * GHG_FACTORS.Gasoline, isMetric)));
          const dEcon = dDistKm > 0 ? (dTotal / dDistKm) * 100 : null;
          const gEcon = gDistKm > 0 ? (gTotal / gDistKm) * 100 : null;
          setDieselEconomy(dEcon !== null ? Math.round(convertEconomy(dEcon, isMetric) * 10) / 10 : null);
          setGasolineEconomy(gEcon !== null ? Math.round(convertEconomy(gEcon, isMetric) * 10) / 10 : null);
        };

        const processFuelBatch = (deviceIds) => {
          return new Promise((resolve) => {
            if (deviceIds.length === 0) { resolve(); return; }
            const calls = deviceIds.map(id => ['Get', {
              typeName: 'FuelUsed',
              search: { deviceSearch: { id }, fromDate, toDate }
            }]);
            geotabApi.multiCall(calls, (results) => {
              results.forEach((deviceFuelRecords, idx) => {
                const did = deviceIds[idx];
                let totalFuel = 0, idlingFuel = 0;
                (deviceFuelRecords || []).forEach(r => {
                  totalFuel += r.totalFuelUsed || 0;
                  idlingFuel += r.totalIdlingFuelUsedL || 0;
                });
                if (totalFuel > 0 || idlingFuel > 0) {
                  const fuelInfo = fuelByDeviceId.get(did);
                  const fuelType = fuelInfo?.fuelType;
                  if (!fuelType) return;

                  const ghg = GHG_FACTORS[fuelType] || 0;
                  const co2 = totalFuel * ghg;
                  const idlingCo2 = idlingFuel * ghg;
                  const distKm = distanceByDevice.get(did) || 0;
                  const economy = distKm > 0 ? (totalFuel / distKm) * 100 : null;

                  vehicleRows.push({
                    id: did,
                    name: devices.get(did)?.name || did,
                    fuelType,
                    totalFuel: Math.round(convertVolume(totalFuel, isMetric) * 10) / 10,
                    idlingFuel: Math.round(convertVolume(idlingFuel, isMetric) * 10) / 10,
                    dist: Math.round(convertDistance(distKm, isMetric)),
                    economy: economy !== null ? Math.round(convertEconomy(economy, isMetric) * 10) / 10 : null,
                    co2: Math.round(convertWeight(co2, isMetric) * 10) / 10,
                    idlingCo2: Math.round(convertWeight(idlingCo2, isMetric) * 10) / 10
                  });

                  if (fuelType === 'Diesel') {
                    dTotal += totalFuel; dIdle += idlingFuel; dDistKm += distKm;
                  } else {
                    gTotal += totalFuel; gIdle += idlingFuel; gDistKm += distKm;
                  }
                }
              });
              resolve();
            }, (err) => {
              logger.error(`FuelUsed batch failed: ${err}`);
              resolve();
            });
          });
        };

        const fuelByDeviceId = new Map();
        const totalVinBatches = Math.ceil(allVins.length / VIN_BATCH_SIZE);

        for (let i = 0; i < allVins.length; i += VIN_BATCH_SIZE) {
          const batch = allVins.slice(i, i + VIN_BATCH_SIZE);
          const batchNum = Math.floor(i / VIN_BATCH_SIZE) + 1;
          if (!isStale()) {
            setStatusMessage(`${t('Decoding vehicle VINs:')} ${batchNum}/${totalVinBatches}`);
            setProgress(Math.round((batchNum / totalVinBatches) * 100));
          }

          // a. Decode this VIN batch
          const batchDeviceIds = [];
          try {
            const vinResults = await decodeVinBatch(batch);
            logger.log(`VIN batch ${batchNum}/${totalVinBatches} decoded: ${vinResults.size} results`);
            vinResults.forEach((fuel, vin) => {
              const deviceIds = vinToDeviceIds.get(vin) || [];
              const fuelType = classifyFuel(fuel.fuelPrimary, fuel.fuelSecondary);
              deviceIds.forEach(did => {
                fuelByDeviceId.set(did, { ...fuel, fuelType });
                if (fuelType) batchDeviceIds.push(did);
              });
            });
          } catch (err) {
            logger.error(`VIN decode batch ${batchNum} failed: ${err.message}`);
          }

          if (isStale()) return;
          if (batchDeviceIds.length === 0) continue;

          // b. Ensure trips are ready before computing economy (awaits only once)
          if (!tripsReady) {
            await tripPromise;
            tripsReady = true;
          }

          // c. Fetch fuel for this batch's devices, then update UI
          if (!isStale()) setStatusMessage(`${t('Fetching fuel data...')} ${batchNum}/${totalVinBatches}`);
          await processFuelBatch(batchDeviceIds);

          // d. Show layout on first batch with data
          if (!shownLayout) { setLoading(false); shownLayout = true; }
          updateState();
        }

        // Count devices with unknown fuel type (VIN decoded but not diesel/gasoline)
        let unknownFuelCount = 0;
        fuelByDeviceId.forEach(info => { if (!info.fuelType) unknownFuelCount++; });
        const totalExcluded = noVinCount + unknownFuelCount;

        // If no VIN batch produced fuel devices, clear loading
        if (!shownLayout) {
          if (!isStale()) setEmpty(totalExcluded);
          return;
        }

        logger.log(`Sustainability complete: ${vehicleRows.length} vehicles with fuel data, ${totalExcluded} excluded`);
        if (!isStale()) {
          reportWrapped('sustainability', {
            dieselLiters: dTotal,
            gasolineLiters: gTotal,
            dieselCo2Kg: dTotal * GHG_FACTORS.Diesel,
            gasolineCo2Kg: gTotal * GHG_FACTORS.Gasoline
          });
          setExcludedCount(totalExcluded); setStatusMessage(''); setProgress(100);
        }
      } catch (err) {
        logger.error(`Sustainability load error: ${err.message}`);
        if (!isStale()) setLoading(false);
      }
    };

    load();
  }, [focusKey, devices]);

  const hasDiesel = dieselLiters > 0;
  const hasGasoline = gasolineLiters > 0;

  const [sortSettings, setSortSettings] = useState(undefined);

  const dU = distanceUnit(isMetric);
  const vU = volumeUnit(isMetric);
  const wU = weightUnit(isMetric);
  const eU = economyUnit(isMetric);

  const columns = useMemo(() => [
    { id: 'name', title: t('Vehicle'), sortable: true, meta: { defaultWidth: 160 } },
    { id: 'fuelTypeLabel', title: t('Fuel Type'), sortable: true, meta: { defaultWidth: 130 } },
    { id: 'dist', title: `${t('Distance')} (${t(dU)})`, sortable: true, columnComponent: { render: (e) => fmt(e.dist, language) }, meta: { defaultWidth: 120 } },
    { id: 'totalFuel', title: `${t('Fuel Used')} (${t(vU)})`, sortable: true, columnComponent: { render: (e) => fmt(e.totalFuel, language, 1) }, meta: { defaultWidth: 120 } },
    { id: 'idlingFuel', title: `${t('Idling Fuel')} (${t(vU)})`, sortable: true, columnComponent: { render: (e) => fmt(e.idlingFuel, language, 1) }, meta: { defaultWidth: 130 } },
    { id: 'economy', title: t(eU), sortable: true, columnComponent: { render: (e) => fmt(e.economy, language, 1) }, meta: { defaultWidth: 100 } },
    { id: 'co2', title: `CO\u2082 (${t(wU)})`, sortable: true, columnComponent: { render: (e) => fmt(e.co2, language, 1) }, meta: { defaultWidth: 100 } },
    { id: 'idlingCo2', title: `${t('Idling CO\u2082')} (${t(wU)})`, sortable: true, columnComponent: { render: (e) => fmt(e.idlingCo2, language, 1) }, meta: { defaultWidth: 130 } }
  ], [loading, isMetric, language]);

  const entities = useMemo(() => {
    const rows = fuelByVehicle.map(v => ({
      ...v,
      fuelTypeLabel: t(v.fuelType),
      economy: v.economy !== null ? v.economy : '—'
    }));
    if (sortSettings) {
      const { sortColumn, sortDirection } = sortSettings;
      rows.sort((a, b) => {
        let av = a[sortColumn], bv = b[sortColumn];
        if (av === '—') av = -1;
        if (bv === '—') bv = -1;
        if (typeof av === 'string' && typeof bv === 'string') {
          return sortDirection === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
        }
        return sortDirection === 'asc' ? (av || 0) - (bv || 0) : (bv || 0) - (av || 0);
      });
    }
    return rows;
  }, [fuelByVehicle, sortSettings, loading]);

  return (
    <div>
      {loading ? (
        <div className="slim-progress">
          <div className={`slim-progress-fill${progress === 0 ? ' indeterminate' : ''}`} style={progress > 0 ? { width: `${progress}%` } : undefined} />
          <div className="slim-progress-text">{statusMessage}</div>
        </div>
      ) : (
        <>
          <SummaryTileBar>
            <div style={hasDiesel ? undefined : DISABLED_TILE_STYLE}>
              <SummaryTile id="diesel-fuel" title={t('Diesel Fuel')} size={SummaryTileSize.Small}>
                <Overview title={fmt(dieselLiters, language)} description={t(volumeUnit(isMetric))} />
              </SummaryTile>
            </div>
            <div style={hasGasoline ? undefined : DISABLED_TILE_STYLE}>
              <SummaryTile id="gasoline-fuel" title={t('Gasoline Fuel')} size={SummaryTileSize.Small}>
                <Overview title={fmt(gasolineLiters, language)} description={t(volumeUnit(isMetric))} />
              </SummaryTile>
            </div>
            <div style={hasDiesel ? undefined : DISABLED_TILE_STYLE}>
              <SummaryTile id="diesel-co2" title={t('Diesel CO\u2082')} size={SummaryTileSize.Small}>
                <Overview title={fmt(dieselCO2, language)} description={t(weightUnit(isMetric))} />
              </SummaryTile>
            </div>
            <div style={hasGasoline ? undefined : DISABLED_TILE_STYLE}>
              <SummaryTile id="gasoline-co2" title={t('Gasoline CO\u2082')} size={SummaryTileSize.Small}>
                <Overview title={fmt(gasolineCO2, language)} description={t(weightUnit(isMetric))} />
              </SummaryTile>
            </div>
            <div style={hasDiesel && dieselEconomy !== null ? undefined : DISABLED_TILE_STYLE}>
              <SummaryTile id="diesel-economy" title={t('Diesel Avg')} size={SummaryTileSize.Small}>
                <Overview title={dieselEconomy !== null ? fmt(dieselEconomy, language, 1) : '—'} description={t(economyUnit(isMetric))} />
              </SummaryTile>
            </div>
            <div style={hasGasoline && gasolineEconomy !== null ? undefined : DISABLED_TILE_STYLE}>
              <SummaryTile id="gasoline-economy" title={t('Gasoline Avg')} size={SummaryTileSize.Small}>
                <Overview title={gasolineEconomy !== null ? fmt(gasolineEconomy, language, 1) : '—'} description={t(economyUnit(isMetric))} />
              </SummaryTile>
            </div>
          </SummaryTileBar>

          {statusMessage && (
            <div className="slim-progress">
              <div className="slim-progress-fill" style={{ width: `${progress}%` }} />
              <div className="slim-progress-text">{statusMessage}</div>
            </div>
          )}

          <div className="compliance-sections">
            {fuelByVehicle.length === 0 && !statusMessage ? (
              excludedCount > 0 ? (
                <Banner header={t('Notice')} size="XXL">
                  {fmt(excludedCount, language)} {excludedCount === 1 ? t('vehicle excluded — fuel type unknown. VIN data is required to determine fuel type.') : t('vehicles excluded — fuel type unknown. VIN data is required to determine fuel type.')}
                </Banner>
              ) : (
                <p className="status-message">{t('No fuel data available for last week')}</p>
              )
            ) : fuelByVehicle.length > 0 ? (
              <>
                {excludedCount > 0 && (
                  <Banner header={t('Notice')} size="XXL">
                    {fmt(excludedCount, language)} {excludedCount === 1 ? t('vehicle excluded — fuel type unknown') : t('vehicles excluded — fuel type unknown')}
                  </Banner>
                )}
                <Table
                description={t('Fuel Usage by Vehicle')}
                columns={columns}
                entities={entities}
                sortable={{
                  pageName: 'sustainabilityFuel',
                  value: sortSettings,
                  onChange: setSortSettings
                }}
              />
              </>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
};

export default SustainabilityTab;
