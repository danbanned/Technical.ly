/**
 * useNarration — wires activeInsight changes to the AI narration pipeline.
 *
 * Call once at app root (PhiladelphiaApp). Subscribes to activeInsight,
 * fires narrateTract on each new tract, cancels in-flight requests when
 * the insight changes, and writes results to Zustand narration state.
 *
 * Components read narration/narrationLoading/narrationError from the store —
 * they never call narrateTract directly.
 */

import { useEffect, useRef } from 'react';
import { useMapStore } from '../store/useMapStore';
import { narrateTract, NarrationUnavailableError } from '../core/narrateInsight';

export function useNarration() {
  const activeInsight      = useMapStore((s) => s.activeInsight);
  const setNarration       = useMapStore((s) => s.setNarration);
  const setNarrationLoading = useMapStore((s) => s.setNarrationLoading);
  const setNarrationError  = useMapStore((s) => s.setNarrationError);
  const abortRef = useRef(null);

  useEffect(() => {
    // Cleared insight — wipe state
    if (!activeInsight) {
      abortRef.current?.abort();
      setNarration(null);
      setNarrationLoading(false);
      setNarrationError(null);
      return;
    }

    // Cancel any in-flight request for a previous tract
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setNarrationLoading(true);
    setNarrationError(null);
    setNarration(null);

    narrateTract(activeInsight, { signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        setNarration(result);
        setNarrationLoading(false);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;

        // NarrationUnavailableError = no backend (expected in local dev without key)
        if (err instanceof NarrationUnavailableError) {
          console.info('[useNarration] No narration backend — showing static insight');
        } else {
          // Likely an assertDocAligned rejection — log for inspection
          console.error('[useNarration] Narration blocked or failed:', err.message);
        }

        setNarrationError(err.message);
        setNarrationLoading(false);
      });

    return () => controller.abort();
  // Re-run only when the tract ID changes — not on every re-render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeInsight?.id]);
}
