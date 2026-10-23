export default function EmptyState({ children = 'No data yet.' }) {
  return <p className="bv-empty">{children}</p>;
}
