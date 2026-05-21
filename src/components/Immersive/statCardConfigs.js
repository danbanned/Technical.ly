/**
 * statCardConfigs
 *
 * Definitions for the four compass-anchored stat cards.
 * Each entry knows:
 *   - icon, label, compass position, color token
 *   - which key on focusedCityStats it reads
 *   - how to format the headline value
 *   - optional secondary metric / progress bar / trend indicator
 *
 * The West (mismatch) card runs custom logic instead of a single value.
 */

export const STAT_CARD_CONFIGS = {
  north: {
    id: 'research',
    icon: '🏛️',
    label: 'Research Spending',
    position: 'north',
    colorToken: '--primary-innovation',
    dataKey: 'researchSpending',
    formatValue: (val) => {
      if (!Number.isFinite(val)) return '—';
      if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
      if (val >= 1e6) return `$${(val / 1e6).toFixed(0)}M`;
      return `$${val.toLocaleString()}`;
    },
    secondaryMetric: { label: 'Universities', dataKey: 'universityCount' },
    progressBar: { max: 5e9, dataKey: 'researchSpending' },
  },

  east: {
    id: 'deals',
    icon: '💰',
    label: 'Deal Flow',
    position: 'east',
    colorToken: '--secondary-capital',
    dataKey: 'dealFlow',
    formatValue: (val) => {
      if (!Number.isFinite(val)) return '—';
      if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
      if (val >= 1e6) return `$${(val / 1e6).toFixed(0)}M`;
      return `$${val.toLocaleString()}`;
    },
    secondaryMetric: { label: 'Deals This Year', dataKey: 'dealCount' },
    progressBar: { max: 5e9, dataKey: 'dealFlow' },
    trendIndicator: {
      dataKey: 'dealFlowYoY',
      format: (val) =>
        Number.isFinite(val)
          ? `${val > 0 ? '↑' : '↓'} ${Math.abs(val)}% from last year`
          : '',
      positiveIsGood: true,
    },
  },

  south: {
    id: 'mobility',
    icon: '📈',
    label: 'Economic Mobility',
    position: 'south',
    colorToken: '--mobility-warm',
    dataKey: 'mobilityScore',
    formatValue: (val) => (Number.isFinite(val) ? `${val}/100` : '—'),
    secondaryMetric: { label: 'Rating', dataKey: 'mobilityRating' },
    progressBar: { max: 100, dataKey: 'mobilityScore' },
  },

  west: {
    id: 'mismatch',
    icon: '⚠️',
    label: 'Mismatch Alert',
    position: 'west',
    colorToken: '--mismatch-alert',
    isMismatch: true,
    renderContent: (stats) => {
      const research = Number(stats.researchSpending) || 0;
      const deals = Number(stats.dealFlow) || 0;
      const mobility = Number(stats.mobilityScore) || 0;
      const ratio = research / Math.max(deals, 1);

      if (ratio > 20) {
        return {
          headline: 'Research Heavy',
          detail: `${ratio.toFixed(0)}:1 R&D-to-Deal ratio`,
          severity: 'high',
        };
      }
      if (mobility < 50 && deals > 500e6) {
        return {
          headline: 'Investment ≠ Opportunity',
          detail: `High deals, low mobility (${mobility}/100)`,
          severity: 'high',
        };
      }
      if (ratio > 10) {
        return {
          headline: 'Slight Imbalance',
          detail: `${ratio.toFixed(0)}:1 R&D-to-Deal ratio`,
          severity: 'medium',
        };
      }
      return {
        headline: 'Balanced',
        detail: 'Research and investment are aligned',
        severity: 'low',
      };
    },
  },
};

export const COMPASS_POSITIONS = ['north', 'east', 'south', 'west'];
