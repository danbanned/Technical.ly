import { create } from 'zustand';

/**
 * Global state for the Innovation & Opportunity Mapper.
 * Tracks layer visibility, year filter, current selection, mismatch mode,
 * UI panel state, and the immersion state machine (ambient/reactive/immersive)
 * that drives the "living article" experience.
 */
export const useMapStore = create((set, get) => ({
  // Layer visibility
  universityLayerVisible: true,
  dealFlowLayerVisible: true,
  mobilityLayerVisible: true,
  arcsLayerVisible: false,

  // Time
  currentYear: 2024,
  yearRange: [2014, 2024],

  // Selection
  selectedEntity: null,
  selectedEntities: [],

  // Mismatch
  mismatchModeEnabled: false,
  mismatchThresholds: {
    highResearchLowDeals: 0.7,
    highInvestmentLowMobility: 0.7,
  },
  mismatches: { highResearchLowDeals: [], highInvestmentLowMobility: [] },

  // UI state
  showStatsPanel: false,
  showComparisonPanel: false,
  showGuidedTour: false,
  guidedTourStep: 0,
  mobileSheetOpen: false,
  deiLens: 'none',

  // Non-reactive viewer handle (set imperatively; never put in deps).
  viewer: null,
  setViewer: (viewer) => set({ viewer }),

  // ───────────── Immersion state machine ─────────────
  immersionMode: 'ambient',          // 'ambient' | 'reactive' | 'immersive'
  previousImmersionMode: null,        // for returning from immersive
  focusedCity: null,                  // { name, lat, lon, articleId }
  activeArticleId: null,              // ID of article most visible in viewport
  articles: [],                       // [{ id, city, lat, lon, layers[] }]
  isTransitioning: false,
  transitionQueue: [],

  // Pre-computed metrics for the currently immersed city (the board-game
  // stat cards read from this). Populated by fetchCityStats() against
  // /data/city-stats/{slug}.json.
  focusedCityStats: {
    researchSpending: 0,
    universityCount: 0,
    dealFlow: 0,
    dealCount: 0,
    dealFlowYoY: 0,
    mobilityScore: 0,
    mobilityRating: 'N/A',
  },

  shellOpacity: {
    header: 0.8,
    sidebar: 0.8,
    articleFeed: 1.0,
  },

  setImmersionMode: (mode) =>
    set({ immersionMode: mode }),

  setFocusedCity: (city) => set({ focusedCity: city }),

  setActiveArticle: (articleId) => set({ activeArticleId: articleId }),

  registerArticle: (article) =>
    set((s) => {
      if (s.articles.some((a) => a.id === article.id)) return s;
      return { articles: [...s.articles, article] };
    }),

  setIsTransitioning: (flag) => set({ isTransitioning: flag }),

  enqueueTransition: (mode, city) =>
    set((s) => ({
      transitionQueue: [...s.transitionQueue, { mode, city }],
    })),

  dequeueTransition: () => {
    const q = get().transitionQueue;
    if (q.length === 0) return null;
    const [head, ...rest] = q;
    set({ transitionQueue: rest });
    return head;
  },

  setShellOpacity: (next) =>
    set((s) => ({ shellOpacity: { ...s.shellOpacity, ...next } })),

  setFocusedCityStats: (stats) => set({ focusedCityStats: stats }),

  fetchCityStats: async (cityName) => {
    if (!cityName) return;
    const slug = cityName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    try {
      const res = await fetch(`/data/city-stats/${slug}.json`);
      if (!res.ok) throw new Error(`No stats for ${cityName}`);
      const stats = await res.json();
      set({ focusedCityStats: stats });
      return stats;
    } catch (err) {
      // Leave whatever was there; board cards will show "—" via the
      // formatters. Logging only — never crash the immersive transition.
      console.warn('[fetchCityStats]', err.message);
      return null;
    }
  },

  // ─────────────────── Other actions ──────────────────
  toggleLayer: (layerName) =>
    set((s) => ({ [layerName]: !s[layerName] })),

  setYear: (year) => set({ currentYear: Number(year) }),

  selectEntity: (entity, opts = {}) =>
    set((s) => {
      if (opts.shift && entity && s.selectedEntity && s.selectedEntity.id !== entity.id) {
        const pair = [s.selectedEntity, entity].slice(-2);
        return {
          selectedEntities: pair,
          showComparisonPanel: true,
          showStatsPanel: true,
        };
      }
      return {
        selectedEntity: entity,
        selectedEntities: entity ? [entity] : [],
        showStatsPanel: !!entity,
        showComparisonPanel: false,
      };
    }),

  toggleMismatchMode: () =>
    set((s) => ({ mismatchModeEnabled: !s.mismatchModeEnabled })),

  setMismatches: (mismatches) => set({ mismatches }),

  setDeiLens: (lens) => set({ deiLens: lens }),

  setMobileSheetOpen: (open) => set({ mobileSheetOpen: open }),

  setGuidedTour: (show, step = 0) =>
    set({ showGuidedTour: show, guidedTourStep: step }),

  resetSelection: () =>
    set({
      selectedEntity: null,
      selectedEntities: [],
      showStatsPanel: false,
      showComparisonPanel: false,
    }),

  // ─────────────── Philadelphia Pilot ─────────────────────────
  philaLayerVisibility: { innovation: true, investment: true, mobility: true, labels: false },
  philaCBSafeMode: false,
  philaOSMBuildings: false,
  philaOSMHeightScale: 2,
  philaGoogleTiles: false,
  philaEnrichedBuildings: false,
  philaEconomicColor: false,
  philaHeightDebug: false,
  philaFilterColor: null,
  philaLegendExpanded: false,
  activeInsight: null,          // pinned tract object | null
  philaBuildingHeightScale: 1,
  philaSelectedTract: null,
  philaSelectedBuilding: null,
  philaCompareTracts: [null, null],
  philaTractsWithCBS: [],
  philaBuildings: [],

  setPhilaLayerVisibility: (key, val) =>
    set((s) => ({ philaLayerVisibility: { ...s.philaLayerVisibility, [key]: val } })),

  setPhilaCBSafeMode: (flag) => set({ philaCBSafeMode: flag }),

  setPhilaOSMBuildings: (flag) => set({ philaOSMBuildings: flag }),

  setPhilaOSMHeightScale: (scale) => set({ philaOSMHeightScale: scale }),

  setPhilaGoogleTiles: (flag) => set({ philaGoogleTiles: flag }),

  setPhilaEnrichedBuildings: (flag) => set({ philaEnrichedBuildings: flag }),

  setPhilaEconomicColor: (flag) => set({ philaEconomicColor: flag }),

  setPhilaHeightDebug: (flag) => set({ philaHeightDebug: flag }),

  setPhilaFilterColor: (key) => set({ philaFilterColor: key }),

  setPhilaLegendExpanded: (flag) => set({ philaLegendExpanded: flag }),

  setActiveInsight: (tract) => set({ activeInsight: tract }),
  clearActiveInsight: () => set({ activeInsight: null, philaSelectedTract: null }),

  setPhilaBuildingHeightScale: (scale) => set({ philaBuildingHeightScale: scale }),

  selectPhilaTract: (tractIdOrNull) =>
    set((s) => {
      if (!tractIdOrNull) return { philaSelectedTract: null };
      const tract = s.philaTractsWithCBS.find((t) => t.id === tractIdOrNull);
      return {
        philaSelectedTract: tract ?? null,
        philaSelectedBuilding: null,
        // Pin as active insight — persists (as docked card) after clicking away
        activeInsight: tract ?? s.activeInsight,
      };
    }),

  selectPhilaBuilding: (idxOrNull) =>
    set((s) => {
      if (idxOrNull === null || idxOrNull === undefined) return { philaSelectedBuilding: null };
      return { philaSelectedBuilding: s.philaBuildings[idxOrNull] ?? null, philaSelectedTract: null };
    }),

  addPhilaToCompare: (tract) =>
    set((s) => {
      const [a, b] = s.philaCompareTracts;
      if (!a) return { philaCompareTracts: [tract, null] };
      if (!b) return { philaCompareTracts: [a, tract] };
      return { philaCompareTracts: [b, tract] };
    }),

  clearPhilaCompare: () => set({ philaCompareTracts: [null, null] }),

  setPhilaTractsWithCBS: (tracts) => set({ philaTractsWithCBS: tracts }),

  setPhilaBuildings: (buildings) => set({ philaBuildings: buildings }),

  // ── Solution Connector ───────────────────────────────────────────
  philaConnectMode: false,
  setPhilaConnectMode: (flag) => set({ philaConnectMode: flag }),
}));
