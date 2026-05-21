import EditorialLayout from './components/Layout/EditorialLayout';

/**
 * App shell — the Living Article layout.
 *
 * The globe is rendered as the page background and an editorial shell
 * (header + scrollable article feed + region rail) floats on top of it.
 * The Immersion Controller, mounted inside EditorialLayout, manages the
 * Ambient → Reactive → Immersive state machine. The same layout is
 * responsive down to mobile via CSS — no separate mobile component
 * needed for the editorial experience.
 */
export default function App() {
  return <EditorialLayout />;
}
