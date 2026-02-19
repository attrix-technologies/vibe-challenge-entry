import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import { SummaryTileBar, SummaryTile, SummaryTileSize, ProgressBar, Table } from '@geotab/zenith';
import { Overview } from '@geotab/zenith/dist/overview/overview';
import GeotabContext from '../contexts/Geotab';

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
  const { geotabApi, logger, focusKey, geotabState, devices } = context;
  const t = (key) => geotabState.translate(key);

  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');
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
      setStatusMessage(t('Loading sustainability data...'));

      try {
        // 1. Extract VINs from devices
        const vinToDeviceIds = new Map(); // VIN → [deviceId, ...]
        devices.forEach((info, id) => {
          if (info.vin) {
            const vin = info.vin.toUpperCase();
            if (!vinToDeviceIds.has(vin)) vinToDeviceIds.set(vin, []);
            vinToDeviceIds.get(vin).push(id);
          }
        });

        const allVins = [...vinToDeviceIds.keys()];
        logger.log(`Sustainability: ${devices.size} devices, ${allVins.length} with VINs`);

        const setEmpty = () => {
          setDieselLiters(0); setGasolineLiters(0);
          setDieselIdlingLiters(0); setGasolineIdlingLiters(0);
          setDieselCO2(0); setGasolineCO2(0);
          setDieselIdlingCO2(0); setGasolineIdlingCO2(0);
          setDieselEconomy(null); setGasolineEconomy(null);
          setFuelByVehicle([]);
          setLoading(false);
        };

        if (allVins.length === 0) {
          if (!isStale()) setEmpty();
          return;
        }

        // 2. Decode VINs in batches of 50
        const fuelByDeviceId = new Map(); // deviceId → { fuelPrimary, fuelSecondary, fuelType }
        for (let i = 0; i < allVins.length; i += VIN_BATCH_SIZE) {
          const batch = allVins.slice(i, i + VIN_BATCH_SIZE);
          const batchNum = Math.floor(i / VIN_BATCH_SIZE) + 1;
          const totalBatches = Math.ceil(allVins.length / VIN_BATCH_SIZE);
          if (!isStale()) setStatusMessage(`${t('Decoding vehicle VINs:')} ${batchNum}/${totalBatches}`);

          try {
            const vinResults = await decodeVinBatch(batch);
            logger.log(`VIN batch ${batchNum}/${totalBatches} decoded: ${vinResults.size} results`);
            vinResults.forEach((fuel, vin) => {
              const deviceIds = vinToDeviceIds.get(vin) || [];
              const fuelType = classifyFuel(fuel.fuelPrimary, fuel.fuelSecondary);
              deviceIds.forEach(did => {
                fuelByDeviceId.set(did, { ...fuel, fuelType });
              });
            });
          } catch (err) {
            logger.error(`VIN decode batch ${batchNum} failed: ${err.message}`);
          }
        }

        if (isStale()) return;
        const withFuelType = [...fuelByDeviceId.values()].filter(f => f.fuelType).length;
        logger.log(`VIN decode complete: ${fuelByDeviceId.size} decoded, ${withFuelType} with known fuel type`);

        // 3. Get FuelUsed + Trips for devices with known fuel type
        const { fromDate, toDate } = getLastWeekRange();
        const fuelDeviceIds = [...fuelByDeviceId.entries()]
          .filter(([, f]) => f.fuelType)
          .map(([id]) => id);

        if (fuelDeviceIds.length === 0) {
          setEmpty();
          return;
        }

        setStatusMessage(t('Fetching fuel data...'));

        // Fetch trips (for distance/fuel economy) in parallel with FuelUsed
        const distanceByDevice = new Map(); // deviceId → distance in meters
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

        // Fetch FuelUsed in batches
        const fuelResults = new Map(); // deviceId → { totalFuel, idlingFuel }
        const fuelPromise = (async () => {
          for (let i = 0; i < fuelDeviceIds.length; i += FUEL_CALL_BATCH) {
            const batch = fuelDeviceIds.slice(i, i + FUEL_CALL_BATCH);
            const calls = batch.map(id => ['Get', {
              typeName: 'FuelUsed',
              search: { deviceSearch: { id }, fromDate, toDate }
            }]);

            await new Promise((resolve) => {
              geotabApi.multiCall(calls, (results) => {
                results.forEach((deviceFuelRecords, idx) => {
                  const did = batch[idx];
                  let totalFuel = 0, idlingFuel = 0;
                  (deviceFuelRecords || []).forEach(r => {
                    totalFuel += r.totalFuelUsed || 0;
                    idlingFuel += r.totalIdlingFuelUsedL || 0;
                  });
                  if (totalFuel > 0 || idlingFuel > 0) {
                    fuelResults.set(did, { totalFuel, idlingFuel });
                  }
                });
                resolve();
              }, (err) => {
                logger.error(`FuelUsed batch failed: ${err}`);
                resolve();
              });
            });
          }
        })();

        await Promise.all([tripPromise, fuelPromise]);

        if (isStale()) return;
        logger.log(`FuelUsed: ${fuelResults.size} devices with fuel data`);

        // 4. Aggregate by fuel type
        let dTotal = 0, dIdle = 0, gTotal = 0, gIdle = 0;
        let dDistKm = 0, gDistKm = 0;
        const vehicleRows = [];

        fuelResults.forEach((fuel, did) => {
          const fuelInfo = fuelByDeviceId.get(did);
          const fuelType = fuelInfo?.fuelType;
          if (!fuelType) return;

          const ghg = GHG_FACTORS[fuelType] || 0;
          const co2 = fuel.totalFuel * ghg;
          const idlingCo2 = fuel.idlingFuel * ghg;
          const distKm = distanceByDevice.get(did) || 0;
          const economy = distKm > 0 ? (fuel.totalFuel / distKm) * 100 : null;

          vehicleRows.push({
            id: did,
            name: devices.get(did)?.name || did,
            fuelType,
            totalLiters: Math.round(fuel.totalFuel * 10) / 10,
            idlingLiters: Math.round(fuel.idlingFuel * 10) / 10,
            distKm: Math.round(distKm),
            economy: economy !== null ? Math.round(economy * 10) / 10 : null,
            co2kg: Math.round(co2 * 10) / 10,
            idlingCo2kg: Math.round(idlingCo2 * 10) / 10
          });

          if (fuelType === 'Diesel') {
            dTotal += fuel.totalFuel;
            dIdle += fuel.idlingFuel;
            dDistKm += distKm;
          } else {
            gTotal += fuel.totalFuel;
            gIdle += fuel.idlingFuel;
            gDistKm += distKm;
          }
        });

        vehicleRows.sort((a, b) => b.totalLiters - a.totalLiters);

        setDieselLiters(Math.round(dTotal));
        setGasolineLiters(Math.round(gTotal));
        setDieselIdlingLiters(Math.round(dIdle));
        setGasolineIdlingLiters(Math.round(gIdle));
        setDieselCO2(Math.round(dTotal * GHG_FACTORS.Diesel));
        setGasolineCO2(Math.round(gTotal * GHG_FACTORS.Gasoline));
        setDieselIdlingCO2(Math.round(dIdle * GHG_FACTORS.Diesel));
        setGasolineIdlingCO2(Math.round(gIdle * GHG_FACTORS.Gasoline));
        setDieselEconomy(dDistKm > 0 ? Math.round((dTotal / dDistKm) * 1000) / 10 : null);
        setGasolineEconomy(gDistKm > 0 ? Math.round((gTotal / gDistKm) * 1000) / 10 : null);
        setFuelByVehicle(vehicleRows);
        setLoading(false);
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

  const columns = useMemo(() => [
    { id: 'name', title: t('Vehicle'), sortable: true, meta: { defaultWidth: 160 } },
    { id: 'fuelTypeLabel', title: t('Fuel Type'), sortable: true, meta: { defaultWidth: 130 } },
    { id: 'distKm', title: t('Distance (km)'), sortable: true, meta: { defaultWidth: 120 } },
    { id: 'totalLiters', title: t('Fuel Used (L)'), sortable: true, meta: { defaultWidth: 120 } },
    { id: 'idlingLiters', title: t('Idling Fuel (L)'), sortable: true, meta: { defaultWidth: 130 } },
    { id: 'economy', title: t('L/100km'), sortable: true, meta: { defaultWidth: 100 } },
    { id: 'co2kg', title: t('CO\u2082 (kg)'), sortable: true, meta: { defaultWidth: 100 } },
    { id: 'idlingCo2kg', title: t('Idling CO\u2082 (kg)'), sortable: true, meta: { defaultWidth: 130 } }
  ], [loading]);

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
        <div style={{ marginTop: '16px' }}>
          <ProgressBar min={0} max={100} now={50} size="medium" />
          <div className="status-message">{statusMessage}</div>
        </div>
      ) : (
        <>
          <SummaryTileBar>
            <div style={hasDiesel ? undefined : DISABLED_TILE_STYLE}>
              <SummaryTile id="diesel-fuel" title={t('Diesel Fuel')} size={SummaryTileSize.Small}>
                <Overview title={String(dieselLiters)} description={t('L')} />
              </SummaryTile>
            </div>
            <div style={hasGasoline ? undefined : DISABLED_TILE_STYLE}>
              <SummaryTile id="gasoline-fuel" title={t('Gasoline Fuel')} size={SummaryTileSize.Small}>
                <Overview title={String(gasolineLiters)} description={t('L')} />
              </SummaryTile>
            </div>
            <div style={hasDiesel ? undefined : DISABLED_TILE_STYLE}>
              <SummaryTile id="diesel-co2" title={t('Diesel CO\u2082')} size={SummaryTileSize.Small}>
                <Overview title={String(dieselCO2)} description={t('kg')} />
              </SummaryTile>
            </div>
            <div style={hasGasoline ? undefined : DISABLED_TILE_STYLE}>
              <SummaryTile id="gasoline-co2" title={t('Gasoline CO\u2082')} size={SummaryTileSize.Small}>
                <Overview title={String(gasolineCO2)} description={t('kg')} />
              </SummaryTile>
            </div>
            <div style={hasDiesel && dieselEconomy !== null ? undefined : DISABLED_TILE_STYLE}>
              <SummaryTile id="diesel-economy" title={t('Diesel Avg')} size={SummaryTileSize.Small}>
                <Overview title={dieselEconomy !== null ? String(dieselEconomy) : '—'} description={t('L/100km')} />
              </SummaryTile>
            </div>
            <div style={hasGasoline && gasolineEconomy !== null ? undefined : DISABLED_TILE_STYLE}>
              <SummaryTile id="gasoline-economy" title={t('Gasoline Avg')} size={SummaryTileSize.Small}>
                <Overview title={gasolineEconomy !== null ? String(gasolineEconomy) : '—'} description={t('L/100km')} />
              </SummaryTile>
            </div>
          </SummaryTileBar>

          <div className="compliance-sections">
            {fuelByVehicle.length === 0 ? (
              <p className="status-message">{t('No fuel data available for last week')}</p>
            ) : (
              <Table
                description={t('Fuel Usage by Vehicle')}
                columns={columns}
                entities={entities}
                height="calc(100vh - 260px)"
                sortable={{
                  pageName: 'sustainabilityFuel',
                  value: sortSettings,
                  onChange: setSortSettings
                }}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default SustainabilityTab;
