import StatusBadge from './StatusBadge';

// One source from source_of_truth.json. Every field shown comes straight from the registry.
export default function ResourceCard({ source }) {
  return (
    <article className="bv-card bv-source-card">
      <h3>{source.label}</h3>
      {source.candidate && <p><span className="bv-tag">candidate source</span></p>}
      <dl className="bv-rows">
        <div><dt>Publisher</dt><dd>{source.publisher}</dd></div>
        <div><dt>Period</dt><dd>{source.vintage}</dd></div>
        <div><dt>License</dt><dd>{source.license}</dd></div>
      </dl>
      <div>
        <p className="bv-hint">Datasets in the registry</p>
        {source.metrics.length ? (
          <ul className="bv-rows" style={{ listStyle: 'none', padding: 0 }}>
            {source.metrics.map((m) => (
              <li key={m.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '6px 0' }}>
                <span>{m.label}</span>
                <StatusBadge status={m.status} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="bv-empty">No datasets listed for this source.</p>
        )}
      </div>
      {source.url && (
        <a className="bv-link" href={source.url} target="_blank" rel="noopener noreferrer">
          View dataset &amp; source <span aria-hidden="true">›</span>
          <span className="bv-sr-only">(opens in a new tab)</span>
        </a>
      )}
    </article>
  );
}
