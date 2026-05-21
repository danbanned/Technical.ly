import { useMapStore } from '../../../store/useMapStore';

/**
 * Three toggle switches for the core data layers.
 * Each one shows or hides its Cesium CustomDataSource.
 */
export default function LayerToggles() {
  const universities = useMapStore((s) => s.universityLayerVisible);
  const deals = useMapStore((s) => s.dealFlowLayerVisible);
  const mobility = useMapStore((s) => s.mobilityLayerVisible);
  const arcs = useMapStore((s) => s.arcsLayerVisible);
  const toggle = useMapStore((s) => s.toggleLayer);

  const setAll = (val) => {
    if (universities !== val) toggle('universityLayerVisible');
    if (deals !== val) toggle('dealFlowLayerVisible');
    if (mobility !== val) toggle('mobilityLayerVisible');
  };

  const Row = ({ label, swatch, active, onClick, toggleClass }) => (
    <div className="toggle-row">
      <span className="label">
        <span className="swatch" style={{ background: swatch }} aria-hidden />
        {label}
      </span>
      <button
        className={`toggle ${toggleClass || ''}`}
        role="switch"
        aria-checked={active}
        aria-label={`Toggle ${label}`}
        onClick={onClick}
      />
    </div>
  );

  return (
    <div>
      <Row
        label="University R&D"
        swatch="var(--primary-innovation)"
        active={universities}
        onClick={() => toggle('universityLayerVisible')}
      />
      <Row
        label="Deal Flow"
        swatch="var(--secondary-capital)"
        active={deals}
        toggleClass="capital"
        onClick={() => toggle('dealFlowLayerVisible')}
      />
      <Row
        label="Economic Mobility"
        swatch="var(--mobility-warm)"
        active={mobility}
        toggleClass="mobility"
        onClick={() => toggle('mobilityLayerVisible')}
      />
      <Row
        label="Capital Arcs"
        swatch="var(--secondary-capital-deep)"
        active={arcs}
        toggleClass="capital"
        onClick={() => toggle('arcsLayerVisible')}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button className="simplify-btn" onClick={() => setAll(true)}>All on</button>
        <button className="simplify-btn" onClick={() => setAll(false)}>All off</button>
      </div>
    </div>
  );
}
