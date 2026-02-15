import React, { useState, useEffect, useContext } from 'react';
import GeotabContext from '../contexts/Geotab';
import Sparkline from './Sparkline.jsx';
import { Header } from '@geotab/zenith';

const WEEKS = 4;
const MS_PER_DAY = 86400000;

// Default color palette for rules that don't have a color
const PALETTE = [
  '#2C6ECB', '#E05A33', '#8B5CF6', '#059669',
  '#D97706', '#DC2626', '#7C3AED', '#0891B2',
];

const RulesOverviewPage = () => {
  const [context] = useContext(GeotabContext);
  const { geotabApi, logger, geotabState, focusKey } = context;

  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const now = new Date();
    const fromDate = new Date(now.getTime() - WEEKS * 7 * MS_PER_DAY);

    // Compute week boundaries (start of each week bucket)
    const weekStarts = [];
    for (let i = 0; i < WEEKS; i++) {
      weekStarts.push(new Date(fromDate.getTime() + i * 7 * MS_PER_DAY));
    }

    geotabApi.multiCall([
      ['Get', { typeName: 'Rule' }],
      ['Get', {
        typeName: 'ExceptionEvent',
        search: {
          fromDate: fromDate.toISOString(),
          toDate: now.toISOString(),
          deviceSearch: {
            groups: geotabState.getGroupFilter()
          }
        },
      }],
    ], (results) => {
      const [allRules, exceptions] = results;

      // Filter to enabled rules:
      // Include if baseType exists (stock rules) or state is absent or state === 'ExceptionRuleStateActiveId'
      const enabledRules = allRules.filter(rule => {
        if (rule.baseType) return true;
        if (!rule.state) return true;
        return rule.state === 'ExceptionRuleStateActiveId';
      });

      // Build rule map
      const ruleMap = {};
      enabledRules.forEach((rule, idx) => {
        ruleMap[rule.id] = {
          id: rule.id,
          name: rule.name || 'Unnamed Rule',
          color: PALETTE[idx % PALETTE.length],
          weekCounts: new Array(WEEKS).fill(0),
          total: 0,
        };
      });

      // Bucket exceptions by rule + week
      exceptions.forEach(exc => {
        const ruleId = exc.rule ? exc.rule.id : null;
        if (!ruleId || !ruleMap[ruleId]) return;

        const excDate = new Date(exc.activeFrom || exc.startDateTime);
        const elapsed = excDate.getTime() - fromDate.getTime();
        let weekIndex = Math.floor(elapsed / (7 * MS_PER_DAY));
        if (weekIndex < 0) weekIndex = 0;
        if (weekIndex >= WEEKS) weekIndex = WEEKS - 1;

        ruleMap[ruleId].weekCounts[weekIndex]++;
        ruleMap[ruleId].total++;
      });

      // Sort by total descending
      const sorted = Object.values(ruleMap).sort((a, b) => b.total - a.total);

      logger.log(`Loaded ${sorted.length} enabled rules with ${exceptions.length} exceptions`);
      setRules(sorted);
      setLoading(false);
    }, (err) => {
      logger.error(err);
      setError(typeof err === 'string' ? err : 'Failed to load rules data');
      setLoading(false);
    });
  }, [focusKey, geotabState.getGroupFilter()]);

  if (loading) {
    return (
      <div>
        <Header>
          <Header.Title pageName="Rules Overview"></Header.Title>
        </Header>
        <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
          Loading rules and exceptions...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Header>
          <Header.Title pageName="Rules Overview"></Header.Title>
        </Header>
        <div style={{ padding: '2rem', textAlign: 'center', color: '#dc2626' }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header>
        <Header.Title pageName="Rules Overview"></Header.Title>
      </Header>
      <div style={{ padding: '1rem' }}>
        <table className="rules-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '0.5rem 1rem' }}>Rule</th>
              <th style={{ textAlign: 'center', padding: '0.5rem 1rem' }}>Trend (4 weeks)</th>
              <th style={{ textAlign: 'right', padding: '0.5rem 1rem' }}>Exceptions</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id}>
                <td style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      backgroundColor: rule.color,
                      flexShrink: 0,
                    }}
                  />
                  {rule.name}
                </td>
                <td style={{ textAlign: 'center', padding: '0.5rem 1rem' }}>
                  <Sparkline
                    data={rule.weekCounts}
                    width={80}
                    height={24}
                    color={rule.color}
                  />
                </td>
                <td style={{ textAlign: 'right', padding: '0.5rem 1rem', fontVariantNumeric: 'tabular-nums' }}>
                  {rule.total.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rules.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
            No enabled rules found.
          </div>
        )}
      </div>
    </div>
  );
};

export default RulesOverviewPage;
