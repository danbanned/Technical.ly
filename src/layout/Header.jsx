import ThemeToggle from '../ui/ThemeToggle';

export default function Header() {
  return (
    <header className="bv-header">
      <div className="bv-brand">
        <span className="bv-brand-name">BlockView</span>
        <span className="bv-brand-sub">Philadelphia Explorer</span>
      </div>
      <p className="bv-tagline">Philadelphia. Connected. Places, maps and public data.</p>
      <div className="bv-header-end">
        <ThemeToggle />
      </div>
    </header>
  );
}
