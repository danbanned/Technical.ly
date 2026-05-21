import { useEffect } from 'react';
import { useMapStore } from '../store/useMapStore';

/**
 * useArticleObserver v2
 *
 * Scroll-driven reactivity for the article feed.
 *
 * - Debounced: only acts 300ms AFTER scrolling stops, so the globe
 *   snaps once the reader has settled — not on every frame of a scroll.
 * - Robust top-article pick: keeps a live ratio map of every card so
 *   the most-visible article is chosen even when an IntersectionObserver
 *   callback only reports the cards that changed.
 * - Fast-scroll exit: a hard wheel/touch fling (>500 within 200ms)
 *   while Immersive pulls the reader back to Ambient. A slow scroll
 *   NEVER exits Immersive — the reader chose to be there.
 *
 * @param rootRef       ref to the scrollable feed element
 * @param immersionAPI  { transitionTo, exitImmersive } from the controller
 */
const SCROLL_DEBOUNCE = 300;
const FAST_SCROLL_DELTA = 500; // px-equivalent within the window
const FAST_SCROLL_WINDOW = 200; // ms

export function useArticleObserver(rootRef, immersionAPI) {
  const articles = useMapStore((s) => s.articles);

  useEffect(() => {
    if (articles.length === 0) return;

    const ratios = new Map(); // articleId -> latest intersectionRatio
    let debounceTimer = null;

    const process = () => {
      const state = useMapStore.getState();
      if (state.isTransitioning) return;

      let topId = null;
      let topRatio = 0;
      for (const [id, ratio] of ratios) {
        if (ratio >= 0.5 && ratio > topRatio) {
          topRatio = ratio;
          topId = id;
        }
      }

      if (topId) {
        const article = state.articles.find((a) => a.id === topId);
        if (!article) return;
        if (state.activeArticleId !== topId) state.setActiveArticle(topId);

        const city = {
          name: article.city,
          lat: article.lat,
          lon: article.lon,
          articleId: article.id,
        };

        if (state.immersionMode === 'immersive') {
          // Stay zoomed in — only the panel content tracks the article.
          state.setFocusedCity(city);
        } else {
          // Ambient or Reactive: snap to (the new) city. The controller
          // effect picks up the focusedCity / mode change.
          state.setFocusedCity(city);
          if (state.immersionMode !== 'reactive') {
            state.setImmersionMode('reactive');
          }
        }
      } else {
        // Nothing in view — only Reactive falls back to Ambient.
        // Immersive is never exited by scrolling slowly.
        if (state.immersionMode === 'reactive') {
          state.setActiveArticle(null);
          state.setFocusedCity(null);
          state.setImmersionMode('ambient');
        }
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = e.target.dataset.articleId;
          if (id) {
            ratios.set(id, e.isIntersecting ? e.intersectionRatio : 0);
          }
        }
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(process, SCROLL_DEBOUNCE);
      },
      {
        root: rootRef?.current || null,
        threshold: [0, 0.25, 0.5, 0.75, 1],
        rootMargin: '0px 0px -20% 0px',
      }
    );

    const els = document.querySelectorAll('[data-article-id]');
    els.forEach((el) => observer.observe(el));

    // ─── Fast-scroll exit ────────────────────────────────────────
    // Wheel/touch deltas are used (not window.scrollY) because the
    // feed scrolls internally and is pointer-events:none in Immersive
    // — but wheel/touch events still reach window.
    let wheelAccum = 0;
    let wheelWindowStart = Date.now();
    const onWheel = (e) => {
      if (useMapStore.getState().immersionMode !== 'immersive') return;
      const now = Date.now();
      if (now - wheelWindowStart > FAST_SCROLL_WINDOW) {
        wheelWindowStart = now;
        wheelAccum = 0;
      }
      wheelAccum += Math.abs(e.deltaY);
      if (wheelAccum > FAST_SCROLL_DELTA) {
        wheelAccum = 0;
        immersionAPI?.exitImmersive?.();
      }
    };

    let lastTouchY = null;
    let touchAccum = 0;
    let touchWindowStart = Date.now();
    const onTouchStart = (e) => {
      lastTouchY = e.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (e) => {
      if (useMapStore.getState().immersionMode !== 'immersive') return;
      const now = Date.now();
      if (now - touchWindowStart > FAST_SCROLL_WINDOW) {
        touchWindowStart = now;
        touchAccum = 0;
      }
      const y = e.touches[0]?.clientY ?? null;
      if (lastTouchY != null && y != null) {
        touchAccum += Math.abs(y - lastTouchY);
        if (touchAccum > FAST_SCROLL_DELTA) {
          touchAccum = 0;
          immersionAPI?.exitImmersive?.();
        }
      }
      lastTouchY = y;
    };

    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });

    return () => {
      observer.disconnect();
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, [articles, rootRef, immersionAPI]);
}
