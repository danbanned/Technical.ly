import { useEffect, useState } from 'react';
import { useMapStore } from '../../store/useMapStore';
import { useBoardAnchoring } from './useBoardAnchoring';
import { STAT_CARD_CONFIGS, COMPASS_POSITIONS } from './statCardConfigs';
import StatCard from './StatCard';
import styles from './BoardGameStats.module.css';

/**
 * BoardGameStats
 *
 * Renders four StatCards anchored to compass-offset coordinates around
 * the city center while immersionMode === 'immersive'. Subscribes to
 * the `immersion:boardLayout` event so the cards animate in only once
 * the camera has finished its dive.
 */
export default function BoardGameStats() {
  const immersionMode = useMapStore((s) => s.immersionMode);
  const focusedCityStats = useMapStore((s) => s.focusedCityStats);
  const viewer = useMapStore((s) => s.viewer);

  const [boardCity, setBoardCity] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  const { positions, isCameraIdle } = useBoardAnchoring(
    viewer,
    boardCity?.lat,
    boardCity?.lon
  );

  useEffect(() => {
    const onBoardLayout = (e) => {
      setBoardCity(e.detail.city);
      setIsVisible(true);
    };
    window.addEventListener('immersion:boardLayout', onBoardLayout);
    return () => window.removeEventListener('immersion:boardLayout', onBoardLayout);
  }, []);

  useEffect(() => {
    if (immersionMode !== 'immersive') {
      setIsVisible(false);
    }
  }, [immersionMode]);

  if (!isVisible || !boardCity) return null;

  return (
    <div
      className={styles.boardContainer}
      data-visible={isVisible ? 'true' : 'false'}
      aria-label={`Data overview for ${boardCity.name}`}
      role="region"
    >
      {COMPASS_POSITIONS.map((pos, idx) => (
        <StatCard
          key={pos}
          config={STAT_CARD_CONFIGS[pos]}
          screenPosition={positions[pos]}
          isIdle={isCameraIdle}
          stats={focusedCityStats}
          animDelayMs={idx * 100}
        />
      ))}
    </div>
  );
}
