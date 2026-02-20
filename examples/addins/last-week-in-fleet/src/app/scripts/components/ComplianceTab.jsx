import React, { useState, useEffect, useContext, useRef } from 'react';
import { SummaryTileBar, SummaryTile, SummaryTileSize, Card } from '@geotab/zenith';
import { Overview, OverviewOptionsArrow, OverviewOptionsType } from '@geotab/zenith/dist/overview/overview';
import GeotabContext from '../contexts/Geotab';
import { convertDistance, distanceUnit, fmt } from '../utils/units';

const MALFUNCTION_STATUSES = {
  PowerCompliance: '[P] Power malfunction',
  EngineSyncCompliance: '[E] Engine sync malfunction',
  TimingCompliance: '[T] Timing malfunction',
  PositioningCompliance: '[L] Positioning malfunction',
  DataRecordingCompliance: '[R] Data recording malfunction',
  DataTransferCompliance: '[S] Data transfer malfunction',
  OtherCompliance: '[O] Other malfunction'
};

const ComplianceTab = () => {
  const [context] = useContext(GeotabContext);
  const { geotabApi, logger, focusKey, geotabState, devices, drivers, isMetric, language } = context;
  const t = (key) => geotabState.translate(key);

  const [loading, setLoading] = useState(true);
  const [hosViolations, setHosViolations] = useState([]);
  const [hosCount, setHosCount] = useState(0);
  const [prevHosCount, setPrevHosCount] = useState(0);
  const [unverifiedByDriver, setUnverifiedByDriver] = useState([]);
  const [unverifiedDriverDays, setUnverifiedDriverDays] = useState(0);
  const [pcDistanceKm, setPcDistanceKm] = useState(0);
  const [ymDistanceKm, setYmDistanceKm] = useState(0);
  const [pcByDriver, setPcByDriver] = useState([]);
  const [ymByDriver, setYmByDriver] = useState([]);
  const [eldMalfunctions, setEldMalfunctions] = useState([]);
  const [eldCount, setEldCount] = useState(0);

  const hasData = useRef(false);
  const lastGroupFilter = useRef(null);
  const pcYmLogsRef = useRef([]);

  // ── Date helpers ───────────────────────────────────────────────────
  const getWeekRanges = () => {
    const now = new Date();
    const currentDay = now.getDay();

    const lastSunday = new Date(now);
    lastSunday.setDate(now.getDate() - currentDay - 7);
    lastSunday.setHours(0, 0, 0, 0);
    const lastSaturday = new Date(lastSunday);
    lastSaturday.setDate(lastSunday.getDate() + 6);
    lastSaturday.setHours(23, 59, 59, 999);

    const prevSunday = new Date(lastSunday);
    prevSunday.setDate(lastSunday.getDate() - 7);
    const prevSaturday = new Date(prevSunday);
    prevSaturday.setDate(prevSunday.getDate() + 6);
    prevSaturday.setHours(23, 59, 59, 999);

    return {
      thisWeek: { fromDate: lastSunday.toISOString(), toDate: lastSaturday.toISOString() },
      prevWeek: { fromDate: prevSunday.toISOString(), toDate: prevSaturday.toISOString() }
    };
  };

  const getGroupFilterKey = () => {
    try { return JSON.stringify(geotabState.getGroupFilter()); }
    catch (e) { return ''; }
  };

  // Fewer violations = positive (same as Safety tab)
  const getLabel = (current, previous) => {
    if (previous === 0 && current === 0) return undefined;
    if (previous === 0) return { percentage: 100, arrow: OverviewOptionsArrow.Up, type: OverviewOptionsType.Negative };
    const pctChange = Math.round(((current - previous) / previous) * 100);
    if (pctChange === 0) return undefined;
    return {
      percentage: Math.abs(pctChange),
      arrow: pctChange > 0 ? OverviewOptionsArrow.Up : OverviewOptionsArrow.Down,
      type: pctChange > 0 ? OverviewOptionsType.Negative : OverviewOptionsType.Positive
    };
  };

  // ── Main data loader ───────────────────────────────────────────────
  useEffect(() => {
    if (!devices || !drivers) {
      hasData.current = false;
      lastGroupFilter.current = null;
      return;
    }

    const currentFilter = getGroupFilterKey();
    if (hasData.current && currentFilter === lastGroupFilter.current) return;
    lastGroupFilter.current = currentFilter;
    hasData.current = true;

    setLoading(true);
    const { thisWeek, prevWeek } = getWeekRanges();

    const userSearch = { groups: [{ id: 'GroupCompanyId' }] };
    const malfunctionStatuses = Object.keys(MALFUNCTION_STATUSES);
    const calls = [
      ['Get', { typeName: 'DutyStatusViolation', search: { fromDate: thisWeek.fromDate, toDate: thisWeek.toDate, userSearch } }],
      ['Get', { typeName: 'DutyStatusViolation', search: { fromDate: prevWeek.fromDate, toDate: prevWeek.toDate, userSearch } }],
      ['Get', { typeName: 'DutyStatusLog', search: { fromDate: thisWeek.fromDate, toDate: thisWeek.toDate, statuses: ['D', 'ON', 'OFF', 'SB', 'PC', 'YM'], userSearch } }],
      ['Get', { typeName: 'DutyStatusLog', search: { fromDate: thisWeek.fromDate, toDate: thisWeek.toDate, statuses: malfunctionStatuses, userSearch: { id: 'NoUserId' } } }]
    ];

    geotabApi.multiCall(calls, async (results) => {
      // Filter violations and logs to only drivers in the current group scope
      const thisWeekViolations = (results[0] || []).filter(v => drivers.has(v.driver?.id));
      const prevWeekViolations = (results[1] || []).filter(v => drivers.has(v.driver?.id));
      const allLogs = (results[2] || []).filter(log => drivers.has(log.driver?.id));
      const malfunctionLogs = (results[3] || []).filter(log => devices.has(log.device?.id));

      logger.log(`HOS Violations: ${thisWeekViolations.length} this week (scoped), ${prevWeekViolations.length} prev week (scoped)`);
      logger.log(`Duty status logs: ${allLogs.length} total (scoped)`);

      // ── Process violations ───────────────────────────────────────
      setHosViolations(thisWeekViolations);
      setHosCount(thisWeekViolations.length);
      setPrevHosCount(prevWeekViolations.length);

      // ── Filter unverified logs ────────────────────────────────────
      const unverifiedLogs = allLogs.filter(log => !log.certifyDateTime);
      logger.log(`Duty status logs: unverified ${unverifiedLogs.length} / ${allLogs.length}`);

      // ── Group all logs by driver, sort by dateTime ─────────────
      const logsByDriver = new Map();
      allLogs.forEach(log => {
        const did = log.driver?.id;
        if (!did) return;
        if (!logsByDriver.has(did)) logsByDriver.set(did, []);
        logsByDriver.get(did).push(log);
      });
      logsByDriver.forEach(logs => {
        logs.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
      });

      // ── Enrich PC/YM logs with end data from next log ──────────
      const enrichedPcYm = [];
      let odoPresent = 0, odoMissing = 0;

      logsByDriver.forEach((logs) => {
        for (let i = 0; i < logs.length; i++) {
          if (logs[i].status !== 'PC' && logs[i].status !== 'YM') continue;
          const nextLog = i + 1 < logs.length ? logs[i + 1] : null;
          enrichedPcYm.push({
            status: logs[i].status,
            dateTime: logs[i].dateTime,
            odometer: logs[i].odometer,
            driver: logs[i].driver,
            endDateTime: nextLog?.dateTime || null,
            endOdometer: nextLog?.odometer || null
          });
          if (logs[i].odometer != null && nextLog?.odometer != null) odoPresent++;
          else odoMissing++;
        }
      });

      pcYmLogsRef.current = enrichedPcYm;
      logger.log(`Enriched PC/YM: ${enrichedPcYm.length}, odometer pairs: ${odoPresent} present, ${odoMissing} missing`);
      if (enrichedPcYm.length > 0) {
        logger.log('Sample enriched PC/YM:', JSON.stringify(enrichedPcYm[0]));
      }

      // ── Compute PC and YM distances (total + per driver) ───────
      let pcMeters = 0, ymMeters = 0;
      const pcDriverMap = new Map();
      const ymDriverMap = new Map();

      enrichedPcYm.forEach(log => {
        const did = log.driver?.id;
        if (!did) return;
        const hasDist = log.odometer != null && log.endOdometer != null;
        const dist = hasDist ? Math.max(0, log.endOdometer - log.odometer) : 0;

        if (log.status === 'PC') {
          if (!pcDriverMap.has(did)) pcDriverMap.set(did, { count: 0, meters: 0 });
          pcDriverMap.get(did).count++;
          pcDriverMap.get(did).meters += dist;
          pcMeters += dist;
        } else {
          if (!ymDriverMap.has(did)) ymDriverMap.set(did, { count: 0, meters: 0 });
          ymDriverMap.get(did).count++;
          ymDriverMap.get(did).meters += dist;
          ymMeters += dist;
        }
      });

      setPcDistanceKm(Math.round(pcMeters / 1000));
      setYmDistanceKm(Math.round(ymMeters / 1000));
      logger.log(`Distances — PC: ${Math.round(pcMeters / 1000)} km, YM: ${Math.round(ymMeters / 1000)} km`);

      // ── Process ELD malfunctions (group by device) ─────────────
      logger.log(`ELD malfunction logs: ${malfunctionLogs.length}`);
      setEldCount(malfunctionLogs.length);

      const malfByDevice = new Map();
      malfunctionLogs.forEach(log => {
        const did = log.device?.id;
        if (!did) return;
        if (!malfByDevice.has(did)) malfByDevice.set(did, { count: 0, types: new Map() });
        const entry = malfByDevice.get(did);
        entry.count++;
        const status = log.status || 'Unknown';
        entry.types.set(status, (entry.types.get(status) || 0) + 1);
      });

      const malfSorted = [...malfByDevice.entries()]
        .map(([id, { count, types }]) => ({
          id,
          name: devices.get(id)?.name || id,
          count,
          types: [...types.entries()].sort((a, b) => b[1] - a[1])
        }))
        .sort((a, b) => b.count - a.count);
      setEldMalfunctions(malfSorted);

      // ── Build per-driver PC/YM tables ──────────────────────────
      const buildDriverList = (driverMap) => [...driverMap.entries()]
        .map(([id, { count, meters }]) => ({
          id, name: drivers.get(id)?.name || id, count, km: Math.round(meters / 1000)
        }))
        .sort((a, b) => b.km - a.km);
      setPcByDriver(buildDriverList(pcDriverMap));
      setYmByDriver(buildDriverList(ymDriverMap));

      // ── Map unverified logs to driver-dates (local tz) ───────────
      const driverDates = new Map();
      unverifiedLogs.forEach(log => {
        const driverId = log.driver?.id;
        if (!driverId || !log.dateTime) return;
        const tz = drivers.get(driverId)?.timeZoneId || 'UTC';
        let localDate;
        try {
          localDate = new Date(log.dateTime).toLocaleDateString('en-CA', { timeZone: tz });
        } catch (e) {
          localDate = new Date(log.dateTime).toLocaleDateString('en-CA', { timeZone: 'UTC' });
        }
        if (!driverDates.has(driverId)) driverDates.set(driverId, new Set());
        driverDates.get(driverId).add(localDate);
      });

      let totalDriverDays = 0;
      const unverified = [...driverDates.entries()]
        .map(([id, dates]) => {
          totalDriverDays += dates.size;
          return { id, name: drivers.get(id)?.name || id, days: dates.size };
        })
        .sort((a, b) => b.days - a.days);

      setUnverifiedByDriver(unverified);
      setUnverifiedDriverDays(totalDriverDays);
      logger.log(`Unverified: ${totalDriverDays} driver-days across ${unverified.length} drivers`);

      setLoading(false);
    }, (error) => {
      logger.error('Error loading compliance data: ' + error);
      setLoading(false);
    });
  }, [focusKey, devices, drivers]);

  // ── Group violations by driver ─────────────────────────────────────
  const getViolationsByDriver = () => {
    const map = new Map();
    hosViolations.forEach(v => {
      const driverId = v.driver?.id;
      if (!driverId) return;
      if (!map.has(driverId)) {
        map.set(driverId, { id: driverId, count: 0, reasons: new Map() });
      }
      const entry = map.get(driverId);
      entry.count++;
      const reason = v.reason || v.type || '';
      if (reason) entry.reasons.set(reason, (entry.reasons.get(reason) || 0) + 1);
    });
    return [...map.values()]
      .map(d => ({ ...d, name: drivers?.get(d.id)?.name || d.id, reasons: [...d.reasons.entries()] }))
      .sort((a, b) => b.count - a.count);
  };

  return (
    <div>
      {loading ? (
        <div className="slim-progress">
          <div className="slim-progress-fill indeterminate" />
          <div className="slim-progress-text">{t('Loading compliance data...')}</div>
        </div>
      ) : (
        <>
          <SummaryTileBar>
            <SummaryTile id="hos" title={t('HOS Violations')} size={SummaryTileSize.Small}>
              <Overview
                title={fmt(hosCount, language)}
                description={t('violations')}
                label={getLabel(hosCount, prevHosCount)}
              />
            </SummaryTile>
            <SummaryTile id="unverified" title={t('Unverified Logs')} size={SummaryTileSize.Small}>
              <Overview
                title={fmt(unverifiedDriverDays, language)}
                description={t('driver-days')}
              />
            </SummaryTile>
            <SummaryTile id="eld" title={t('ELD Malfunctions')} size={SummaryTileSize.Small}>
              <Overview title={fmt(eldCount, language)} description={t('malfunctions')} />
            </SummaryTile>
            <SummaryTile id="pc" title={t('PC Distance')} size={SummaryTileSize.Small}>
              <Overview title={fmt(convertDistance(pcDistanceKm, isMetric), language)} description={t(distanceUnit(isMetric))} />
            </SummaryTile>
            <SummaryTile id="ym" title={t('YM Distance')} size={SummaryTileSize.Small}>
              <Overview title={fmt(convertDistance(ymDistanceKm, isMetric), language)} description={t(distanceUnit(isMetric))} />
            </SummaryTile>
          </SummaryTileBar>

          <div className="compliance-sections">
            <Card title={t('HOS Violations')} fullWidth autoHeight>
              <Card.Content>
                <div className="compliance-card-scroll">
                  {getViolationsByDriver().length === 0 ? (
                    <p className="status-message" style={{ margin: 0 }}>{t('No HOS violations found for last week')}</p>
                  ) : (
                    <table className="compliance-table">
                      <thead>
                        <tr>
                          <th>{t('Driver')}</th>
                          <th>{t('Count')}</th>
                          <th>{t('Reason')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getViolationsByDriver().map(d => (
                          <tr key={d.id}>
                            <td>{d.name}</td>
                            <td>{fmt(d.count, language)}</td>
                            <td>
                              <ul className="compliance-reason-list">
                                {d.reasons.map(([reason, cnt]) => (
                                  <li key={reason}>{reason}{cnt > 1 ? ` (${fmt(cnt, language)})` : ''}</li>
                                ))}
                              </ul>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </Card.Content>
            </Card>

            <Card title={t('Unverified Logs')} fullWidth autoHeight>
              <Card.Content>
                <div className="compliance-card-scroll">
                  {unverifiedByDriver.length === 0 ? (
                    <p className="status-message" style={{ margin: 0 }}>{t('No unverified logs found for last week')}</p>
                  ) : (
                    <table className="compliance-table">
                      <thead>
                        <tr>
                          <th>{t('Driver')}</th>
                          <th>{t('Unverified Days')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unverifiedByDriver.map(d => (
                          <tr key={d.id}>
                            <td>{d.name}</td>
                            <td>{fmt(d.days, language)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </Card.Content>
            </Card>

            <Card title={t('ELD Malfunctions')} fullWidth autoHeight>
              <Card.Content>
                <div className="compliance-card-scroll">
                  {eldMalfunctions.length === 0 ? (
                    <p className="status-message" style={{ margin: 0 }}>{t('No ELD malfunctions found for last week')}</p>
                  ) : (
                    <table className="compliance-table">
                      <thead>
                        <tr>
                          <th>{t('Vehicle')}</th>
                          <th>{t('Count')}</th>
                          <th>{t('Type')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {eldMalfunctions.map(m => (
                          <tr key={m.id}>
                            <td>{m.name}</td>
                            <td>{fmt(m.count, language)}</td>
                            <td>
                              <ul className="compliance-reason-list">
                                {m.types.map(([status, cnt]) => (
                                  <li key={status}>
                                    {MALFUNCTION_STATUSES[status] ? t(MALFUNCTION_STATUSES[status]) : status}
                                    {cnt > 1 ? ` (${fmt(cnt, language)})` : ''}
                                  </li>
                                ))}
                              </ul>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </Card.Content>
            </Card>

            <Card title={t('Personal Conveyance (PC)')} fullWidth autoHeight>
              <Card.Content>
                <div className="compliance-card-scroll">
                  {pcByDriver.length === 0 ? (
                    <p className="status-message" style={{ margin: 0 }}>{t('No PC logs found for last week')}</p>
                  ) : (
                    <table className="compliance-table">
                      <thead>
                        <tr>
                          <th>{t('Driver')}</th>
                          <th>{t('Logs')}</th>
                          <th>{`${t('Distance')} (${t(distanceUnit(isMetric))})`}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pcByDriver.map(d => (
                          <tr key={d.id}>
                            <td>{d.name}</td>
                            <td>{fmt(d.count, language)}</td>
                            <td>{fmt(convertDistance(d.km, isMetric), language)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </Card.Content>
            </Card>

            <Card title={t('Yard Moves (YM)')} fullWidth autoHeight>
              <Card.Content>
                <div className="compliance-card-scroll">
                  {ymByDriver.length === 0 ? (
                    <p className="status-message" style={{ margin: 0 }}>{t('No YM logs found for last week')}</p>
                  ) : (
                    <table className="compliance-table">
                      <thead>
                        <tr>
                          <th>{t('Driver')}</th>
                          <th>{t('Logs')}</th>
                          <th>{`${t('Distance')} (${t(distanceUnit(isMetric))})`}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ymByDriver.map(d => (
                          <tr key={d.id}>
                            <td>{d.name}</td>
                            <td>{fmt(d.count, language)}</td>
                            <td>{fmt(convertDistance(d.km, isMetric), language)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </Card.Content>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default ComplianceTab;
