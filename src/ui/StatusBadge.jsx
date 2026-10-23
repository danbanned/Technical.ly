// Shows a registry status value exactly as written in source_of_truth.json.
export default function StatusBadge({ status }) {
  return <span className="bv-tag bv-code">{status}</span>;
}
