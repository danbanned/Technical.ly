import { useMapStore } from '../store/useMapStore';
import LayerToggles from './LayerToggles';
import InspectPanel from './InspectPanel';
import InsightsCard from './InsightsCard';
import CompareMode from './CompareMode';
import TractList from './TractList';
import Legend from './Legend';
import './phila.css';

/**
 * Renders all Philadelphia pilot UI panels when Philadelphia is the focused city.
 * Mounted unconditionally in EditorialLayout; returns null when another city is active.
 */
export default function PhiladelphiaPilot() {
  const focusedCity = useMapStore((s) => s.focusedCity);
  const tract = useMapStore((s) => s.philaSelectedTract);
  const building = useMapStore((s) => s.philaSelectedBuilding);

  if (focusedCity?.name !== 'Philadelphia') return null;

  const hasInspect = tract || building;

  return (
    <div className="phila-overlay" aria-label="Philadelphia pilot controls">
      <LayerToggles />
      {hasInspect ? <InspectPanel /> : <InsightsCard />}
      <CompareMode />
      <TractList />
      <Legend />
    </div>
  );
}
