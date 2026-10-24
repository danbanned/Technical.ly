import registry from './source_of_truth.json';

// Read-only view of source_of_truth.json for the UI. Statuses are passed through
// exactly as written in the registry; nothing here derives or fills a value.

export const REGISTRY_VERSION = registry.registryVersion;
export const REGISTRY_UPDATED = registry.updated;
export const STATUS_VALUES = Object.keys(registry.statusValues);

const metrics = Object.entries(registry.metrics).map(([id, m]) => ({ id, ...m }));

// Retired metrics are removed by team decision and never appear in the UI.
const shownMetrics = metrics.filter((m) => m.status !== 'retired');

// One entry per registry source, with the metrics that cite it.
export const SOURCES = Object.entries(registry.sources).map(([id, s]) => ({
  id,
  ...s,
  metrics: shownMetrics.filter((m) => m.sourceId === id),
}));

export const METRICS = shownMetrics;
