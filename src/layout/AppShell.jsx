import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import ErrorBoundary from '../ui/ErrorBoundary';
import { useShellStore } from '../store/useShellStore';

export default function AppShell() {
  // The 3D map fills the content area edge to edge; other pages get padding.
  const bleed = useLocation().pathname === '/3d';
  const collapsed = useShellStore((s) => s.sidebarCollapsed);
  return (
    <div className={`bv-shell${collapsed ? ' is-collapsed' : ''}`}>
      <a className="bv-skip" href="#main">Skip to content</a>
      <Header />
      <Sidebar />
      <main id="main" className={`bv-main${bleed ? ' bv-main--bleed' : ''}`} tabIndex={-1}>
        <ErrorBoundary fallback="This page hit an error.">
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
