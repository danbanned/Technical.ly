// Native <details>, so it opens and closes from the keyboard with no extra code.
export default function CollapsibleCard({ title, tag, description, defaultOpen = false, children }) {
  return (
    <details className="bv-details" open={defaultOpen}>
      <summary>
        <span className="bv-summary-title">{title}</span>
        {tag ? <span className="bv-tag">{tag}</span> : <span />}
        {description && <span className="bv-summary-desc">{description}</span>}
        <span className="bv-summary-more">
          <span className="bv-more-label">Show more</span>
          <span className="bv-less-label">Show less</span>
        </span>
      </summary>
      <div className="bv-details-body">{children}</div>
    </details>
  );
}
