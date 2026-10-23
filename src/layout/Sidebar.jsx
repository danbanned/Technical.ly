import { NavLink } from 'react-router-dom';
import NavIcon from '../ui/NavIcon';
import { useShellStore } from '../store/useShellStore';

// Order follows the BlockView design. Area Context (/area) is reached from the
// Location and Map overview pages. NavLink sets aria-current="page" on the active item.
const NAV = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/map', label: 'Map overview / 2D', icon: 'map2d' },
  { to: '/3d', label: '3D Map', icon: 'map3d' },
  { to: '/location', label: 'Location', icon: 'location' },
  { to: '/resources', label: 'Resources & Sources', icon: 'resources' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

export default function Sidebar() {
  const collapsed = useShellStore((s) => s.sidebarCollapsed);
  const toggle = useShellStore((s) => s.toggleSidebar);

  return (
    <nav className="bv-sidebar" aria-labelledby="bv-nav-label">
      <div className="bv-sidebar-top">
        <span id="bv-nav-label" className="bv-eyebrow">Navigation</span>
        <button
          type="button"
          className="bv-btn bv-sidebar-toggle"
          aria-expanded={!collapsed}
          aria-controls="bv-nav-list"
          onClick={toggle}
        >
          <NavIcon name={collapsed ? 'expand' : 'collapse'} />
          <span className="bv-sr-only">{collapsed ? 'Expand sidebar' : 'Collapse sidebar'}</span>
        </button>
      </div>
      <ul id="bv-nav-list">
        {NAV.map(({ to, label, icon, end }) => (
          <li key={to}>
            <NavLink to={to} end={end} title={collapsed ? label : undefined}>
              <NavIcon name={icon} />
              <span className="bv-nav-label">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
