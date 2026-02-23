import React, { useState, useEffect, useContext, useMemo, useRef, useCallback } from 'react';
import {
  Table, ButtonType, Header, FiltersBar, IconDownload, Layout,
  GET_TODAY_OPTION,
  GET_YESTERDAY_OPTION,
  GET_THIS_WEEK_OPTION,
  GET_LAST_WEEK_OPTION,
  GET_THIS_MONTH_OPTION,
  GET_LAST_MONTH_OPTION
} from '@geotab/zenith';

import GeotabContext from '../contexts/Geotab';
import { formatLocalDateTime } from '../utils/dates';
import { downloadCsv } from '../utils/csv';

const FuelTransactionsPage = () => {
  const [context] = useContext(GeotabContext);
  const { geotabApi, geotabState, logger, focusKey, devices, drivers, isMetric, language } = context;

  const t = (key) => geotabState.translate(key);

  // FiltersBar visibility state
  const [isAllFiltersVisible, setIsAllFiltersVisible] = useState(false);

  // Date range filter — default to "This week"
  const todayOption = GET_TODAY_OPTION();
  const dateRangeDefaultValue = useMemo(() => ({
    label: todayOption.label,
    ...todayOption.getRange()
  }
  ), [todayOption]);
  const [dateRangeValue, setDateRangeValue] = useState(dateRangeDefaultValue);

  const onClearAllFilters = useCallback(() => {
    setDateRangeValue(dateRangeDefaultValue);
  }, [dateRangeDefaultValue]);

  const getDefaultFiltersState = () => ({
    "dateRange": {
      state: dateRangeDefaultValue
    }
  });

  // Data state
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const loadGenRef = useRef(0);

  // Format number for display
  const fmt = useCallback((value, decimals = 2) => {
    if (value == null || value === '') return '—';
    return new Intl.NumberFormat(language, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  }, [language]);

  // Convert volume based on isMetric
  const L_TO_GAL = 1 / 3.78541;
  const convertVolume = useCallback((liters) => {
    if (liters == null) return null;
    return isMetric ? liters : liters * L_TO_GAL;
  }, [isMetric]);

  const volumeUnit = isMetric ? 'L' : 'gal';

  // Load fuel transactions
  const loadTransactions = useCallback(() => {
    if (!devices || !drivers || !dateRangeValue) return;

    const gen = ++loadGenRef.current;
    setLoading(true);
    setError(null);
    setTransactions([]);

    const groupFilter = geotabState.getGroupFilter();
    const groups = groupFilter.length > 0 ? groupFilter : [{ id: 'GroupCompanyId' }];

    const fromISO = dateRangeValue.from.toISOString();
    const toISO = dateRangeValue.to.toISOString();

    geotabApi.call('Get', {
      typeName: 'FuelTransaction',
      search: {
        deviceSearch: { groups },
        fromDate: fromISO,
        toDate: toISO
      }
    }, (result) => {
      if (gen !== loadGenRef.current) return;
      logger.log(`Loaded ${result.length} fuel transactions`);
      setTransactions(result);
      setLoading(false);
    }, (err) => {
      if (gen !== loadGenRef.current) return;
      logger.error('Error loading fuel transactions: ' + err);
      setError(String(err));
      setLoading(false);
    });
  }, [devices, drivers, dateRangeValue, geotabApi, geotabState]);

  // Auto-load when dependencies change
  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Build table columns — render receives the full entity object
  const columns = useMemo(() => [
    {
      id: 'vehicle',
      title: t('Vehicle'),
      meta: { defaultWidth: 180 }
    },
    {
      id: 'driver',
      title: t('Driver'),
      meta: { defaultWidth: 180 }
    },
    {
      id: 'dateTime',
      title: t('Date / Time'),
      meta: { defaultWidth: 200 },
      columnComponent: {
        render: (entity) => formatLocalDateTime(entity.dateTime, language)
      }
    },
    {
      id: 'volume',
      title: `${t('Volume')} (${volumeUnit})`,
      meta: { defaultWidth: 130 },
      columnComponent: {
        render: (entity) => fmt(entity.volume)
      }
    },
    {
      id: 'cost',
      title: t('Cost'),
      meta: { defaultWidth: 110 },
      columnComponent: {
        render: (entity) => fmt(entity.cost)
      }
    },
    {
      id: 'currency',
      title: t('Currency'),
      meta: { defaultWidth: 90 }
    },
    {
      id: 'comments',
      title: t('Comments'),
      meta: { defaultWidth: 200 }
    }
  ], [language, isMetric, volumeUnit]);

  // Build table entities from transactions
  const entities = useMemo(() => {
    if (!devices || !drivers) return [];

    return transactions.map((tx) => {
      const vehicleName = tx.device?.id ? (devices.get(tx.device.id) || tx.device.id) : '—';
      const driverName = tx.driver?.id ? (drivers.get(tx.driver.id) || tx.driver.id) : '—';

      return {
        id: tx.id,
        vehicle: vehicleName,
        driver: driverName,
        dateTime: tx.dateTime || '',
        volume: convertVolume(tx.volume),
        cost: tx.cost,
        currency: tx.currencyCode || '',
        comments: tx.comments || ''
      };
    });
  }, [transactions, devices, drivers, convertVolume]);

  // CSV export
  const handleExport = useCallback(() => {
    if (entities.length === 0) return;

    const headers = [
      t('Vehicle'),
      t('Driver'),
      t('Date / Time'),
      `${t('Volume')} (${volumeUnit})`,
      t('Cost'),
      t('Currency'),
      t('Comments')
    ];

    const rows = entities.map(e => [
      e.vehicle,
      e.driver,
      formatLocalDateTime(e.dateTime, language),
      e.volume != null ? fmt(e.volume) : '',
      e.cost != null ? fmt(e.cost) : '',
      e.currency,
      e.comments
    ]);

    downloadCsv('fuel-transactions.csv', headers, rows);
  }, [entities, language, volumeUnit]);

  const devicesLoading = !devices || !drivers;

  return (
    <>
      <Header onFiltersBarOpen={() => setIsAllFiltersVisible(true)}>
        <Header.Title pageName={t('Fuel Transactions')} />
        <Header.Button
          icon={IconDownload}
          title={t('Export CSV')}
          id="export-csv"
          type={ButtonType.TertiaryBlack}
          onClick={handleExport}
          disabled={entities.length === 0}
        />
        <FiltersBar
          isAllFiltersVisible={isAllFiltersVisible}
          toggleAllFilters={setIsAllFiltersVisible}
          getDefaultFiltersState={getDefaultFiltersState}
          onClearAllFilters={onClearAllFilters}
        >
          <FiltersBar.PeriodPicker
            id="dateRange"
            showInSidePanel
            sidePanelTitle={t('Date range')}
            state={dateRangeValue}
            defaultState={dateRangeDefaultValue}
            onChange={setDateRangeValue}
            props={{
              options: [
                "Today",
                "Yesterday",
                "ThisWeek",
                "LastWeek",
                "ThisMonth",
                "LastMonth",
                'Custom'
              ],
              disableFutureDates: true
            }}
          />
        </FiltersBar>
      </Header>

      <div style={{ padding: '0 1.5rem 1.5rem' }}>
        {/* Loading / error / results */}
        {devicesLoading || loading ? (
          <div className="slim-progress">
            <div className="slim-progress-fill indeterminate" />
            <span className="slim-progress-text">{t('Loading...')}</span>
          </div>
        ) : error ? (
          <div style={{ color: '#dc2626', padding: '16px' }}>{t('Error')}: {error}</div>
        ) : entities.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
            {t('No fuel transactions found for the selected period.')}
          </div>
        ) : (
          <>
            <Layout>
              <Layout.Content>
                <Table columns={columns} entities={entities} />
              </Layout.Content>
            </Layout>
          </>
        )}
      </div>
    </>
  );
};

export default FuelTransactionsPage;
