import { useCallback, useRef } from 'react';
import { useMapStore } from '../store/useMapStore';

const HOVER_DELAY = 1500;        // desktop hover dwell
const LONG_PRESS_DELAY = 600;    // mobile long-press

/**
 * useHoverImmerse
 *
 * Returns event handlers for an article card that promote the page
 * into Immersive mode after sustained hover, on direct click, or
 * on a mobile long-press.
 *
 * Pass in the article's city payload ({ name, lat, lon, articleId })
 * — that's the destination the camera flies to.
 */
export function useHoverImmerse(cityData, immersionAPI) {
  const hoverTimer = useRef(null);
  const touchTimer = useRef(null);

  const start = useCallback(() => {
    if (!cityData) return;
    if (useMapStore.getState().isTransitioning) return;
    cancel();
    hoverTimer.current = setTimeout(() => {
      immersionAPI?.transitionTo?.('immersive', cityData);
    }, HOVER_DELAY);
  }, [cityData, immersionAPI]);

  const cancel = useCallback(() => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  }, []);

  const click = useCallback(
    (e) => {
      if (!cityData) return;
      e?.preventDefault?.();
      cancel();
      if (useMapStore.getState().isTransitioning) return;
      immersionAPI?.transitionTo?.('immersive', cityData);
    },
    [cityData, immersionAPI, cancel]
  );

  const touchStart = useCallback(() => {
    if (!cityData) return;
    if (touchTimer.current) clearTimeout(touchTimer.current);
    touchTimer.current = setTimeout(() => {
      immersionAPI?.transitionTo?.('immersive', cityData);
    }, LONG_PRESS_DELAY);
  }, [cityData, immersionAPI]);

  const touchEnd = useCallback(() => {
    if (touchTimer.current) {
      clearTimeout(touchTimer.current);
      touchTimer.current = null;
    }
  }, []);

  return {
    onMouseEnter: start,
    onMouseLeave: cancel,
    onClick: click,
    onTouchStart: touchStart,
    onTouchEnd: touchEnd,
    onTouchCancel: touchEnd,
  };
}
