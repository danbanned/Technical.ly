import { useMapStore } from '../../store/useMapStore';
import LayerToggles from '../Globe/Controls/LayerToggles';
import MismatchButton from '../Globe/Controls/MismatchButton';

/**
 * The interactive legend / control surface. Sits on the left edge in
 * desktop layouts; folds into the mobile bottom sheet on small screens.
 */
export default function Legend() {
  const deiLens = useMapStore((s) => s.deiLens);
  const setDeiLens = useMapStore((s) => s.setDeiLens);

  return (
    <aside className="sidebar" aria-label="Map legend and controls">
      <h3>Layers</h3>
      <LayerToggles />

      <h3>Diagnostics</h3>
      <MismatchButton />

      <h3>Equity Lens</h3>
      <select
        value={deiLens}
        onChange={(e) => setDeiLens(e.target.value)}
        className="simplify-btn"
        style={{ width: '100%', padding: '10px', fontSize: 13 }}
        aria-label="Equity lens filter"
      >
        <option value="none">No filter</option>
        <option value="minority-led">Minority-led startups only</option>
        <option value="women-led">Women-led startups only</option>
        <option value="rural">Rural regions only</option>
      </select>

      <h3>Scales</h3>
      <div>
        <div className="scale-bar-label"><span>$0</span><span>R&amp;D spend</span><span>$5B+</span></div>
        <div className="scale-bar research" />
        <div className="scale-bar-label"><span>$0</span><span>Deal flow</span><span>$3B+</span></div>
        <div className="scale-bar capital" />
        <div className="scale-bar-label"><span>0</span><span>Dynamism</span><span>100</span></div>
        <div className="scale-bar mobility" />
      </div>

      <h3>Encoding</h3>
      <div style={{ fontSize: 12, color: 'var(--muted-text)', lineHeight: 1.55 }}>
        <strong style={{ color: 'var(--neutral-text)' }}>Height</strong> = magnitude (funding).<br />
        <strong style={{ color: 'var(--neutral-text)' }}>Glow</strong> = activity (deal volume).<br />
        <strong style={{ color: 'var(--neutral-text)' }}>Hue</strong> = category.<br />
        <strong style={{ color: 'var(--neutral-text)' }}>Texture</strong> = health / risk.
      </div>
    </aside>
  );
}
