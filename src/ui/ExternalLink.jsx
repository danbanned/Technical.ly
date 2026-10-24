export default function ExternalLink({ href, children, className = 'bv-link' }) {
  return (
    <a className={className} href={href} target="_blank" rel="noopener noreferrer">
      {children} <span aria-hidden="true">›</span>
      <span className="bv-sr-only">(opens in a new tab)</span>
    </a>
  );
}
