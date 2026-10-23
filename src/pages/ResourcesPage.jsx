import { useState } from 'react';
import ResourceCard from '../ui/ResourceCard';
import ExternalLink from '../ui/ExternalLink';
import { APP_SOURCES, keyStatus, sourceTag } from '../data/appSources';
import { SOURCES, REGISTRY_UPDATED, REGISTRY_VERSION } from '../data/registry';

const matches = (q, ...fields) => fields.join(' ').toLowerCase().includes(q);

export default function ResourcesPage() {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const providers = q ? APP_SOURCES.filter((s) => matches(q, s.name, s.summary, s.description)) : APP_SOURCES;
  const registry = q ? SOURCES.filter((s) => matches(q, s.label, s.publisher, ...s.metrics.map((m) => m.label))) : SOURCES;

  return (
    <div className="bv-page">
      <h1 className="bv-page-title">Resources &amp; Sources</h1>

      <section className="bv-card" aria-labelledby="res-search-heading">
        <h2 id="res-search-heading" className="bv-eyebrow">Search</h2>
        <div className="bv-field">
          <label htmlFor="resource-search">Search resources and sources</label>
          <input id="resource-search" className="bv-input" type="search" placeholder="Provider, dataset or source name"
            value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </section>

      <section className="bv-card" aria-labelledby="used-heading">
        <span className="bv-eyebrow">Resources</span>
        <h2 id="used-heading">Resources We Used</h2>
        {providers.length === 0 && <p className="bv-empty">No resources found for “{query}”.</p>}
        <div className="bv-grid" style={{ marginTop: 10 }}>
          {providers.map((s) => (
            <article key={s.id} className="bv-card bv-source-card" style={{ background: 'var(--bv-surface-2)' }}>
              <span className={`bv-tag${s.id === 'sample_model' ? ' bv-tag-sample' : ''}`}>{sourceTag(s)}</span>
              <h3>{s.name}</h3>
              <p>{s.summary}</p>
              {s.datasetUrl
                ? <ExternalLink href={s.datasetUrl} className="bv-btn">View dataset</ExternalLink>
                : <button type="button" className="bv-btn" disabled title="Bundled with the app; no public dataset">View dataset</button>}
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="details-heading">
        <h2 id="details-heading">Provider details</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          {providers.map((s) => (
            <article key={s.id} className="bv-card bv-row-between" style={{ alignItems: 'flex-start' }}>
              <div style={{ flex: '1 1 420px' }}>
                <h3>{s.name}</h3>
                <p>{s.description}</p>
              </div>
              <div className="bv-row" style={{ flex: '0 1 auto' }}>
                <span className="bv-tag"><span className="bv-sr-only">Key status: </span>{keyStatus(s)}</span>
                {s.docsUrl
                  ? <ExternalLink href={s.docsUrl}>Provider documentation</ExternalLink>
                  : <span className="bv-hint">No provider documentation (bundled sample)</span>}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="registry-heading">
        <h2 id="registry-heading">Source registry</h2>
        <p className="bv-hint">
          From <code>src/data/source_of_truth.json</code> (version {REGISTRY_VERSION}, updated {REGISTRY_UPDATED}). Statuses are
          shown exactly as the registry writes them.
        </p>
        {registry.length === 0 && <p className="bv-empty">No registry sources found for “{query}”.</p>}
        <div className="bv-grid" style={{ marginTop: 10 }}>
          {registry.map((s) => <ResourceCard key={s.id} source={s} />)}
        </div>
      </section>
    </div>
  );
}
