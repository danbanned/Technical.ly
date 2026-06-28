import { DATA_SOURCES } from '../data/config';

/**
 * DataStamp — small data-freshness chip shown in the corner of every card.
 *
 * Props:
 *   sourceId  — key into DATA_SOURCES (default: 'syntheticSeed')
 *   style     — optional extra inline styles
 */
export default function DataStamp({ sourceId = 'syntheticSeed', style }) {
  const src = DATA_SOURCES[sourceId] ?? DATA_SOURCES.syntheticSeed;

  // Format: "Jan 2024" for real data, "Sample data" for synthetic
  const dateLabel = src.synthetic
    ? null
    : new Date(src.lastUpdated).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  return (
    <div className={`phila-data-stamp${src.synthetic ? ' is-synthetic' : ''}`} style={style} title={src.note}>
      {src.synthetic ? (
        <>⚠ Sample data — not for production use</>
      ) : (
        <>{src.label} · {dateLabel}</>
      )}
    </div>
  );
}
