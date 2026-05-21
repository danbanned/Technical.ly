import { useEffect, useState } from 'react';
import { useMapStore } from '../../store/useMapStore';

const MESSAGES = {
  ambient: 'Map returned to overview',
  reactive: (city) => (city ? `Map drifting toward ${city}` : 'Map following article feed'),
  immersive: (city) => (city ? `Map zoomed in on ${city}` : 'Map zoomed in'),
};

/**
 * ImmersionAnnouncer
 *
 * Off-screen aria-live region that narrates immersion transitions to
 * screen readers. The globe canvas is aria-hidden, so this is the
 * only channel an assistive tech user has for "the map just moved."
 */
export default function ImmersionAnnouncer() {
  const immersionMode = useMapStore((s) => s.immersionMode);
  const focusedCity = useMapStore((s) => s.focusedCity);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const builder = MESSAGES[immersionMode];
    const next = typeof builder === 'function' ? builder(focusedCity?.name) : builder;
    setMessage(next || '');
  }, [immersionMode, focusedCity]);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: 'absolute',
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    >
      {message}
    </div>
  );
}
