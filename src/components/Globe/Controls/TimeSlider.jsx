import { useEffect, useRef } from 'react';
import { useMapStore } from '../../../store/useMapStore';

/**
 * Year filter. Drag the thumb or press play to animate through time.
 */
export default function TimeSlider() {
  const year = useMapStore((s) => s.currentYear);
  const range = useMapStore((s) => s.yearRange);
  const setYear = useMapStore((s) => s.setYear);
  const playingRef = useRef(null);

  useEffect(() => () => clearInterval(playingRef.current), []);

  const togglePlay = () => {
    if (playingRef.current) {
      clearInterval(playingRef.current);
      playingRef.current = null;
      return;
    }
    playingRef.current = setInterval(() => {
      const cur = useMapStore.getState().currentYear;
      const [min, max] = useMapStore.getState().yearRange;
      const next = cur >= max ? min : cur + 1;
      setYear(next);
    }, 1000);
  };

  return (
    <div className="time-slider-wrap">
      <button
        className="play-btn"
        onClick={togglePlay}
        aria-label="Play timeline animation"
      >
        {playingRef.current ? '⏸' : '▶'}
      </button>
      <span className="time-slider-year" aria-live="polite">{year}</span>
      <input
        type="range"
        className="time-slider"
        min={range[0]}
        max={range[1]}
        step={1}
        value={year}
        onChange={(e) => setYear(e.target.value)}
        aria-label="Year selector"
      />
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--dim-text)' }}>
        {range[0]} – {range[1]}
      </span>
    </div>
  );
}
