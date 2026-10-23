import { useShellStore } from '../store/useShellStore';

// Dark is the default. The label names the mode the button switches to; the
// choice is saved in this browser. The 3D map keeps its own appearance.
export default function ThemeToggle({ verbose = false }) {
  const theme = useShellStore((s) => s.theme);
  const setTheme = useShellStore((s) => s.setTheme);
  const next = theme === 'light' ? 'dark' : 'light';
  const label = `${next === 'light' ? 'Light' : 'Dark'} mode`;

  return (
    <button type="button" className="bv-btn" onClick={() => setTheme(next)}>
      {verbose ? `Switch to ${next} mode` : label}
    </button>
  );
}
