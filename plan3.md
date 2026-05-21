current state of the codebase, including all recent edits. This is the source of truth for generating new code snippets. Do not suggest code that has been deleted in recent edits.

 End-to-end flow now wired:

  1. User hovers a card 1.5s (or clicks) → useHoverImmerse fires transitionTo('immersive', city).
  2. useImmersionController flies the camera to 25 km / -45° pitch, fades the shell to immersive opacity, awaits fetchCityStats(city.name), then dispatches
  immersion:boardLayout.
  3. BoardGameStats listens for that event, becomes visible, and useBoardAnchoring starts converting the city's lat/lon ± compass offsets (±0.05° lat N/S, ±0.08°
  lon E/W) into screen coordinates every postRender frame.
  4. Four StatCards pop into place — Research (N), Deals (E), Mobility (S), Mismatch (W) — reading from focusedCityStats populated from
  /data/city-stats/{slug}.json.
  5. The Mismatch card runs the spec's ratio/severity logic and color-codes accordingly.
  6. Camera-idle (no movement for 300ms) → cards get a .snapped class for sharp text.
  7. Scroll-to-exit: a >200px wheel/touch gesture during immersive returns the user to the previous mode (also Escape, also the header's "Back to feed" button).
  8. Leaving immersive → setIsVisible(false) → cards unmount.

  Files added in this pass:
  - src/components/Immersive/{BoardGameStats.jsx, StatCard.jsx, useBoardAnchoring.js, statCardConfigs.js}
  - src/components/Immersive/{BoardGameStats.module.css, StatCard.module.css}
  - public/data/city-stats/{baltimore, philadelphia, pittsburgh, washington, wilmington}.json
  - Store: focusedCityStats + fetchCityStats action
  - Controller: scroll-to-exit + fetchCityStats call before board dispatch
  - Old src/components/Editorial/BoardGameStats.jsx removed; EditorialLayout now imports from Immersive/.
  



  

Complete Technical Specification & Implementation Guide
SECTION 1: PROJECT OVERVIEW
What We're Building:
A living 3D geospatial web application embedded in Technical.ly articles. The globe runs as the page background, responds to scrolling, and when the user hovers on an article, the camera dives into that city — revealing data as towers, particles, bridges, and a board-game stat layout. The experience transitions through three states: Ambient (passive globe), Reactive (globe responds to scroll), and Immersive (full zoom-in with stat cards).

Core Problem: Innovation data (university R&D), investment data (venture capital), and economic mobility data live in separate silos. No one can see them together geographically. Founders, investors, policymakers, and residents can't spot patterns like "this region has tons of research but no startups" or "venture money pours in but local mobility is flat."

Solution: A single interactive 3D globe that fuses these layers so anyone can see where innovation sparks, where capital flows, and how healthy that activity really is — all embedded directly in the article reading experience.

SECTION 2: TECHNICAL STACK
Layer	Technology	Purpose
3D Engine	CesiumJS ^1.120	Globe, terrain, camera, entities, particles, day/night
3D Hosting	Cesium Ion	Terrain tiles, satellite imagery, access token
React Bindings	resium ^1.17	Declarative Cesium entities in React
UI Framework	React ^18.x	Component architecture
Build Tool	Vite ^5.x	Dev server, HMR, Cesium asset bundling
State Management	Zustand ^4.5	Global state: immersion, layers, time, city stats
Styling	CSS Modules + CSS Custom Properties	Scoped styles, design tokens, shell opacity
Data Pipeline	Python 3.11+, GeoPandas, Nominatim	Geocoding, GeoJSON generation
Data Format	Static GeoJSON/JSON	Preprocessed, served from CDN
Deployment	Netlify/Vercel	Static hosting, SSL, CDN
Version Control	GitHub	Main, develop, sprint branches
AI Assistant	Gemini	Code generation, debugging, data scripts
Full dependency list (package.json):

json
{
  "name": "innovation-opportunity-mapper",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "data:process": "python scripts/process_all.py"
  },
  "dependencies": {
    "cesium": "^1.120.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "resium": "^1.17.0",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.5.0",
    "vite": "^5.4.0",
    "vite-plugin-cesium": "^1.3.0"
  }
}
Environment Variables:

env
VITE_CESIUM_ION_TOKEN=your_token_here
VITE_DATA_URL=/data
SECTION 3: PROJECT STRUCTURE
text
src/
  components/
    Globe/
      GlobeViewer.jsx              # Main Cesium viewer, full-viewport background
      Layers/
        UniversityTowers.jsx       # Extruded cylinders: height=R&D spend, color=field
        DealFlowPoints.jsx         # Pulsing points: size=deal amount, glow=activity
        DealFlowArcs.jsx           # Curved polylines: width=flow volume, animated dashes
        MobilityHeatmap.jsx        # State polygons: extrudedHeight=dynamism, color gradient
      Effects/
        ParticleDust.jsx           # Cesium ParticleSystem around high-activity zones
        DayNightCycle.jsx          # Real-time clock, sun, moon, atmosphere
        TiltShiftEffect.jsx        # PostProcessStage for miniature world feel
    Immersive/
      BoardGameStats.jsx           # Container for four compass-point stat cards
      StatCard.jsx                 # Individual card: icon, value, progress bar, trend
      useBoardAnchoring.js         # SceneTransforms → screen coords for overlay positioning
      statCardConfigs.js           # Configurations: north/east/south/west cards
    UI/
      StatsPanel.jsx               # Side panel with metrics, mismatch alert, simplify toggle
      Legend.jsx                   # Interactive layer toggles, DEI lens filter
      TimeSlider.jsx               # Year range slider with play button
      MismatchButton.jsx           # Toggle mismatch highlighting
      ComparisonPanel.jsx          # Side-by-side region comparison
      GuidedTour.jsx               # Camera fly-to narration sequence
      ArticleCard.jsx              # Article in feed with data badges and hover trigger
      MobileBottomSheet.jsx        # Pull-up layers/legend on mobile
      MobileStatsOverlay.jsx       # Full-screen stats on mobile
    Layout/
      Shell.jsx                    # Header + Sidebar + ArticleFeed container
      Header.jsx                   # Brand, language selector, DEI indicator badges
      Sidebar.jsx                  # Region snapshot, quick stats
      ArticleFeed.jsx              # Scrollable article list
  hooks/
    useImmersionController.js      # State machine: Ambient → Reactive → Immersive
    useArticleObserver.js          # IntersectionObserver for scroll-driven reactivity
    useHoverImmerse.js             # 1.5s hover timer, long-press on mobile
  store/
    useMapStore.js                 # Zustand: immersion, layers, time, city, stats, transitions
  utils/
    cesiumHelpers.js               # Entity creation helpers
    colorScales.js                 # D3 color scales
    mismatchLogic.js               # In-browser mismatch detection
    transitionHelpers.js           # animateCamera, animateShellOpacity
    particleConfigs.js             # Particle system presets for dust/bees/planes/cars
  data/
    sample/
      baltimore_universities.geojson
      baltimore_deals.geojson
  App.jsx
  main.jsx
  index.css                        # CSS custom properties, shell opacity vars
public/
  data/
    universities.geojson
    deal_points.geojson
    arcs.json
    states_dynamism.geojson
    city-stats/
      baltimore.json
      boston.json
      ...
scripts/
  process_herd.py
  process_deals.py
  process_dynamism.py
  process_all.py
SECTION 4: DESIGN SYSTEM
Color Palette (Colorblind-Safe, Immutable):

css
:root {
  --innovation-primary: #00D1FF;   /* Cyan - Research, innovation inputs */
  --capital-primary: #FF8A00;      /* Orange - Deal flow, investment */
  --mismatch-alert: #FF005C;       /* Magenta - Gaps, mismatches, alerts */
  --base-background: #1A1A1B;      /* Deep charcoal - Background */
  --surface-ui: #2A2A2D;           /* Slightly lighter - Cards, panels */
  --text-primary: #E4E4E7;         /* Off-white - Body text */
  --text-secondary: rgba(228,228,231,0.6);  /* Dimmed text */
  --accessibility-focus: #FFD700;  /* Gold - Focus indicators */
}
3D Visual Encoding Rules (Never Violate):

Height (Z-axis) = Magnitude (funding, spending). Taller = more.

Glow/Intensity = Activity (deal count, transaction volume). Brighter = more active.

Color Hue = Category (cyan=research, orange=capital, magenta=alert).

Texture/Pattern = Health/Risk (smooth=stable, jittered=at-risk).

Tower Color Language:

Cyan Towers = University Research Spending

Orange Towers = Venture Capital Deals

Purple Towers = Corporate R&D

Green Towers = Talent/Workforce

Magenta Towers = Mismatch Alert

Typography:

css
--font-family: 'Inter', sans-serif;
--heading-large: 24px Bold;
--heading-medium: 20px Bold;
--heading-small: 16px SemiBold;
--body: 14px Medium;
--body-small: 12px Medium;
--caption: 10px Regular;
Spacing & Touch Targets:

Base unit: 8px

Minimum touch target: 44×44px

Text expansion allowance: 30% extra width for multilingual

All interactive elements have visible #FFD700 focus outlines

SECTION 5: VISUAL DICTIONARY (Living Ecosystem)
Element	Represents	3D Implementation
Colored Towers	Economic data categories	Extruded cylinders, height=value, color=category
Bridge Lines/Streams	Economic connections	Curved polylines (ArcType.RHUMB), width=flow volume, animated dashes
Dust/Particles	Activity density (deals, transactions)	Cesium ParticleSystem, emissionRate ∝ deal volume
Bees/Insects	Innovation buzz (patents, research)	Animated point sprites on spline paths around research towers
Planes	Capital inflow/outflow	Animated models along arcs, direction=flow direction
Cars	Labor mobility	Animated dots on road paths, speed=mobility rate
Trees & Grass	Growth indicators	Billboard collections, density=growth rate, seasonal color
Sun/Moon Cycle	Real-time data freshness	Cesium Clock + enableLighting + atmosphere
Connection Line Visuals:

Thickness = Volume (more money/people = thicker line)

Color = Type (cyan=research collaboration, orange=investment, green=talent)

Direction = Animated dashes or particles flowing along the line

Opacity = Recency (recent flows are more opaque)

SECTION 6: IMMERSION STATE MACHINE
Three States:

State	Globe Behavior	UI Shell Behavior	Trigger
AMBIENT	Continental US view, auto-rotate slowly, all layers visible at low prominence	Full opacity (80%), frosted glass, normal layout	Page load, no article in focus
REACTIVE	Gentle drift toward scrolled article's city, relevant data layers intensify, stat badges appear	Header/sidebar more transparent (60%), active article gets glow border	Article crosses 50% viewport visibility
IMMERSIVE	Camera dives to city at 45° pitch, board-game stat layout appears, full interactivity	Header shrinks to slim bar (48px), sidebar becomes edge tab, feed fades, single article panel floats over city	1.5s hover on article card, or click, or long-press (mobile)
Return to prior state: Scroll away from article, press Escape, or click "Back to Globe."

SECTION 7: KEY BUG FIXES & CONSTRAINTS
Fix: Screen Goes Dark When Zooming In

This is likely the camera going underground. Implement these fixes:

javascript
// In GlobeViewer.jsx, after viewer initialization:

// 1. Clamp camera altitude
viewer.scene.screenSpaceCameraController.minimumZoomDistance = 500; // meters
viewer.scene.screenSpaceCameraController.maximumZoomDistance = 20000000; // 20,000km

// 2. Always flyTo with safe altitude (above tallest tower + buffer)
viewer.camera.flyTo({
  destination: Cesium.Cartesian3.fromDegrees(lon, lat, 25000), // 25km minimum
  orientation: { pitch: Cesium.Math.toRadians(-45) },
  duration: 1.5,
});

// 3. Ensure terrain provider is set
viewer.terrainProvider = Cesium.createWorldTerrain();

// 4. Enable lighting
viewer.scene.globe.enableLighting = true;

// 5. Debug: log camera height to catch underground issues
viewer.camera.changed.addEventListener(() => {
  const height = viewer.camera.positionCartographic.height;
  if (height < 0) {
    console.warn('Camera is underground! Height:', height);
  }
});
Fix: Only Load Relevant Region, Not Full World

javascript
// In GlobeViewer.jsx, constrain to continental US:

const west = -125.0;
const south = 24.0;
const east = -66.0;
const north = 50.0;

viewer.camera.setView({
  destination: Cesium.Rectangle.fromDegrees(west, south, east, north),
});

// Prevent panning outside bounds
viewer.scene.screenSpaceCameraController.constrainedAxis = Cesium.Cartesian3.UNIT_Z;

// Clip imagery to region (prevents loading unnecessary tiles)
viewer.scene.globe.cartographicLimitRectangle = Cesium.Rectangle.fromDegrees(
  west, south, east, north
);
SECTION 8: REAL-TIME DAY/NIGHT CYCLE
javascript
// In DayNightCycle.jsx or GlobeViewer.jsx:

// Sync to real-world time
viewer.clock.shouldAnimate = true;
viewer.clock.multiplier = 1; // Real-time
viewer.clock.currentTime = Cesium.JulianDate.fromDate(new Date());

// Enable dynamic lighting
viewer.scene.globe.enableLighting = true;
viewer.scene.sun.show = true;
viewer.scene.moon.show = true;

// Atmosphere
viewer.scene.skyAtmosphere.show = true;
viewer.scene.skyAtmosphere.brightnessShift = 0.1;
viewer.scene.skyAtmosphere.hueShift = 0.0;

// Make data entities emissive so they glow at night
// For each entity:
entity.cylinder.material = new Cesium.Material({
  fabric: {
    type: 'Color',
    uniforms: {
      color: Cesium.Color.fromCssColorString('#00D1FF').withAlpha(0.9),
    },
  },
});
// Add emissive property via custom shader or use PolylineGlowMaterialProperty for arcs
SECTION 9: PARTICLE SYSTEMS (Dust, Bees, Planes, Cars)
Dust Clouds (Deal Activity):

javascript
// In ParticleDust.jsx — place around cities with high deal flow
const particleSystem = new Cesium.ParticleSystem({
  image: '/data/particles/dust.png', // Small white circle with soft edges
  particleSize: 5,
  emissionRate: dealsPerMonth * 0.1,
  lifetime: 3.0,
  speed: 2.0,
  emitter: new Cesium.CircleEmitter(5000), // 5km radius around city center
  modelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(
    Cesium.Cartesian3.fromDegrees(cityLon, cityLat, 100)
  ),
  startColor: Cesium.Color.fromCssColorString('#FF8A00').withAlpha(0.6),
  endColor: Cesium.Color.fromCssColorString('#FF8A00').withAlpha(0.0),
});
viewer.scene.primitives.add(particleSystem);
Bees (Innovation around research towers):

Small glowing yellow point sprites following spline paths

Higher density = more patents/publications

Use Cesium.SampledPositionProperty for the flight paths

Planes (Capital flow along arcs):

Animated billboards or small 3D models

Move along Cesium.PolylineGeometry paths using Cesium.VelocityOrientationProperty

Direction shows investment flow direction

Cars (Labor mobility):

Small dots on road polylines within cities

Speed = mobility score

Use Cesium.CallbackProperty to animate position along path

SECTION 10: ZUSTAND STORE (Complete)
javascript
// src/store/useMapStore.js

import { create } from 'zustand';

const useMapStore = create((set, get) => ({
  // ─── Immersion State ───────────────────────────
  immersionMode: 'ambient',          // 'ambient' | 'reactive' | 'immersive'
  previousImmersionMode: null,
  isTransitioning: false,
  transitionQueue: [],

  // ─── Focused City ──────────────────────────────
  focusedCity: null,                 // { name, lat, lon, articleId }
  focusedCityStats: {
    researchSpending: 0,
    universityCount: 0,
    dealFlow: 0,
    dealCount: 0,
    dealFlowYoY: 0,
    mobilityScore: 0,
    mobilityRating: 'N/A',
  },

  // ─── Layers ────────────────────────────────────
  universityLayerVisible: true,
  dealFlowLayerVisible: true,
  mobilityLayerVisible: true,
  arcsLayerVisible: false,

  // ─── Time ──────────────────────────────────────
  currentYear: 2024,
  yearRange: [2014, 2024],

  // ─── Selection & Comparison ────────────────────
  selectedEntity: null,
  selectedEntities: [],
  showStatsPanel: false,
  showComparisonPanel: false,

  // ─── Mismatch Mode ─────────────────────────────
  mismatchModeEnabled: false,
  mismatchThresholds: {
    highResearchLowDeals: 0.7,
    highInvestmentLowMobility: 0.7,
  },

  // ─── UI State ──────────────────────────────────
  showGuidedTour: false,
  guidedTourStep: 0,
  shellOpacity: { header: 0.8, sidebar: 0.8, articleFeed: 1.0 },

  // ─── Article Tracking ──────────────────────────
  articles: [],
  activeArticleId: null,

  // ─── Actions ───────────────────────────────────
  setImmersionMode: (mode) => set({ immersionMode: mode }),
  setFocusedCity: (city) => set({ focusedCity: city }),
  setActiveArticle: (id) => set({ activeArticleId: id }),
  registerArticle: (article) => set((state) => ({
    articles: [...state.articles.filter(a => a.id !== article.id), article],
  })),
  toggleLayer: (layerName) => set((state) => {
    const key = `${layerName}Visible`;
    return { [key]: !state[key] };
  }),
  setYear: (year) => set({ currentYear: year }),
  selectEntity: (entity) => set({ selectedEntity: entity, showStatsPanel: true }),
  toggleMismatchMode: () => set((state) => ({
    mismatchModeEnabled: !state.mismatchModeEnabled,
  })),
  resetSelection: () => set({
    selectedEntity: null,
    selectedEntities: [],
    showStatsPanel: false,
    showComparisonPanel: false,
  }),
  fetchCityStats: async (cityName) => {
    const response = await fetch(`/data/city-stats/${cityName.toLowerCase()}.json`);
    const stats = await response.json();
    set({ focusedCityStats: stats });
  },
  enqueueTransition: (mode, city) => set((state) => ({
    transitionQueue: [...state.transitionQueue, { mode, city }],
  })),
  dequeueTransition: () => {
    const queue = get().transitionQueue;
    if (queue.length === 0) return null;
    const [next, ...rest] = queue;
    set({ transitionQueue: rest });
    return next;
  },
  returnFromImmersive: () => {
    const prev = get().previousImmersionMode || 'ambient';
    set({ immersionMode: prev, previousImmersionMode: null });
  },
}));

export default useMapStore;
SECTION 11: IMMERSION CONTROLLER HOOK
javascript
// src/hooks/useImmersionController.js

import { useEffect, useCallback, useRef } from 'react';
import useMapStore from '../store/useMapStore';
import { animateCamera, animateShellOpacity } from '../utils/transitionHelpers';
import * as Cesium from 'cesium';

export function useImmersionController(viewerRef) {
  const {
    immersionMode,
    focusedCity,
    setImmersionMode,
    setIsTransitioning,
    enqueueTransition,
    dequeueTransition,
    previousImmersionMode,
    returnFromImmersive,
  } = useMapStore();

  const transitionInProgress = useRef(false);

  const executeTransition = useCallback(async (targetMode, city) => {
    if (transitionInProgress.current) {
      enqueueTransition(targetMode, city);
      return;
    }

    transitionInProgress.current = true;
    setIsTransitioning(true);

    const viewer = viewerRef.current;
    if (!viewer) {
      transitionInProgress.current = false;
      setIsTransitioning(false);
      return;
    }

    switch (targetMode) {
      case 'ambient':
        await animateCamera(viewer, {
          destination: { lon: -98.5, lat: 39.8, height: 5000000 },
          pitch: -90,
          duration: 2.5,
        });
        await animateShellOpacity({ header: 0.8, sidebar: 0.8, articleFeed: 1.0 }, 800);
        break;

      case 'reactive':
        if (city) {
          await animateCamera(viewer, {
            destination: { lon: city.lon, lat: city.lat, height: 800000 },
            pitch: -60,
            duration: 2.0,
          });
          await animateShellOpacity({ header: 0.6, sidebar: 0.6, articleFeed: 1.0 }, 600);
        }
        break;

      case 'immersive':
        if (city) {
          useMapStore.setState({ previousImmersionMode: immersionMode });
          await animateCamera(viewer, {
            destination: { lon: city.lon, lat: city.lat, height: 25000 },
            pitch: -45,
            duration: 1.5,
          });
          await animateShellOpacity({ header: 0.4, sidebar: 0.0, articleFeed: 0.0 }, 500);
          // Fetch stats and show board layout
          await useMapStore.getState().fetchCityStats(city.name);
          window.dispatchEvent(new CustomEvent('immersion:boardLayout', { detail: { city } }));
        }
        break;
    }

    setImmersionMode(targetMode);
    setIsTransitioning(false);
    transitionInProgress.current = false;

    const next = dequeueTransition();
    if (next) {
      executeTransition(next.mode, next.city);
    }
  }, [viewerRef, immersionMode]);

  useEffect(() => {
    if (focusedCity && immersionMode !== 'ambient') {
      executeTransition(immersionMode, focusedCity);
    }
  }, [immersionMode, focusedCity]);

  const transitionTo = useCallback((mode, city) => {
    executeTransition(mode, city);
  }, [executeTransition]);

  const exitImmersive = useCallback(() => {
    const prev = previousImmersionMode || 'ambient';
    executeTransition(prev, null);
  }, [executeTransition, previousImmersionMode]);

  return { transitionTo, exitImmersive };
}
SECTION 12: ARTICLE OBSERVER HOOK (Scroll Detection)
javascript
// src/hooks/useArticleObserver.js

import { useEffect, useRef } from 'react';
import useMapStore from '../store/useMapStore';

export function useArticleObserver() {
  const {
    articles,
    setActiveArticle,
    setFocusedCity,
    setImmersionMode,
    immersionMode,
    isTransitioning,
  } = useMapStore();

  const observerRef = useRef(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (isTransitioning) return;

        const visible = entries
          .filter(e => e.isIntersecting && e.intersectionRatio >= 0.5)
          .map(e => e.target.dataset.articleId);

        if (visible.length > 0) {
          const topArticleId = visible[0];
          setActiveArticle(topArticleId);

          const article = articles.find(a => a.id === topArticleId);
          if (article && article.city) {
            setFocusedCity({
              name: article.city,
              lat: article.lat,
              lon: article.lon,
              articleId: article.id,
            });

            if (immersionMode === 'ambient') {
              setImmersionMode('reactive');
            }
          }
        } else {
          setActiveArticle(null);
          if (immersionMode === 'reactive') {
            setImmersionMode('ambient');
            setFocusedCity(null);
          }
        }
      },
      {
        threshold: [0.5],
        rootMargin: '0px 0px -20% 0px',
      }
    );

    const articleElements = document.querySelectorAll('[data-article-id]');
    articleElements.forEach(el => observerRef.current.observe(el));

    return () => observerRef.current?.disconnect();
  }, [articles, immersionMode, isTransitioning]);
}
SECTION 13: HOVER IMMERSE HOOK
javascript
// src/hooks/useHoverImmerse.js

import { useRef, useCallback } from 'react';
import useMapStore from '../store/useMapStore';

const HOVER_DELAY = 1500;

export function useHoverImmerse(articleId, cityData) {
  const hoverTimer = useRef(null);
  const { transitionTo, isTransitioning } = useMapStore();

  const startHover = useCallback(() => {
    if (isTransitioning) return;
    hoverTimer.current = setTimeout(() => {
      transitionTo('immersive', cityData);
    }, HOVER_DELAY);
  }, [cityData, transitionTo, isTransitioning]);

  const cancelHover = useCallback(() => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  }, []);

  const handleClick = useCallback(() => {
    cancelHover();
    if (!isTransitioning) {
      transitionTo('immersive', cityData);
    }
  }, [cityData, transitionTo, cancelHover, isTransitioning]);

  const touchTimer = useRef(null);

  const handleTouchStart = useCallback(() => {
    touchTimer.current = setTimeout(() => {
      handleClick();
    }, 600);
  }, [handleClick]);

  const handleTouchEnd = useCallback(() => {
    if (touchTimer.current) {
      clearTimeout(touchTimer.current);
      touchTimer.current = null;
    }
  }, []);

  return {
    onMouseEnter: startHover,
    onMouseLeave: cancelHover,
    onClick: handleClick,
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
  };
}
SECTION 14: TRANSITION HELPERS
javascript
// src/utils/transitionHelpers.js

import * as Cesium from 'cesium';

export function animateShellOpacity(targets, duration = 800) {
  return new Promise((resolve) => {
    const shell = document.documentElement;
    const start = {
      header: parseFloat(getComputedStyle(shell).getPropertyValue('--shell-header-opacity').trim()) || 0.8,
      sidebar: parseFloat(getComputedStyle(shell).getPropertyValue('--shell-sidebar-opacity').trim()) || 0.8,
      articleFeed: parseFloat(getComputedStyle(shell).getPropertyValue('--shell-feed-opacity').trim()) || 1.0,
    };

    const startTime = performance.now();

    function step(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1.0);
      const eased = progress < 0.5
        ? 2 * progress * progress
        : -1 + (4 - 2 * progress) * progress;

      shell.style.setProperty('--shell-header-opacity',
        (start.header + (targets.header - start.header) * eased).toString());
      shell.style.setProperty('--shell-sidebar-opacity',
        (start.sidebar + (targets.sidebar - start.sidebar) * eased).toString());
      shell.style.setProperty('--shell-feed-opacity',
        (start.articleFeed + (targets.articleFeed - start.articleFeed) * eased).toString());

      if (progress < 1.0) {
        requestAnimationFrame(step);
      } else {
        shell.style.setProperty('--shell-header-opacity', targets.header.toString());
        shell.style.setProperty('--shell-sidebar-opacity', targets.sidebar.toString());
        shell.style.setProperty('--shell-feed-opacity', targets.articleFeed.toString());
        resolve();
      }
    }

    requestAnimationFrame(step);
  });
}

export function animateCamera(viewer, options) {
  return new Promise((resolve) => {
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        options.destination.lon,
        options.destination.lat,
        options.destination.height
      ),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(options.pitch),
        roll: 0,
      },
      duration: options.duration || 2.0,
      complete: () => resolve(),
    });
  });
}
SECTION 15: CSS CUSTOM PROPERTIES (index.css)
css
:root {
  --shell-header-opacity: 0.8;
  --shell-sidebar-opacity: 0.8;
  --shell-feed-opacity: 1.0;
  --shell-transition-duration: 400ms;

  --innovation-primary: #00D1FF;
  --capital-primary: #FF8A00;
  --mismatch-alert: #FF005C;
  --base-background: #1A1A1B;
  --surface-ui: #2A2A2D;
  --text-primary: #E4E4E7;
  --text-secondary: rgba(228, 228, 231, 0.6);
  --accessibility-focus: #FFD700;
  --font-family: 'Inter', sans-serif;
}

.app-header {
  background: rgba(26, 26, 27, var(--shell-header-opacity));
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition: background var(--shell-transition-duration) ease;
}

.app-sidebar {
  background: rgba(26, 26, 27, var(--shell-sidebar-opacity));
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition: background var(--shell-transition-duration) ease,
              transform var(--shell-transition-duration) ease;
}

.article-feed {
  opacity: var(--shell-feed-opacity);
  transition: opacity var(--shell-transition-duration) ease;
}

.immersion-immersive .app-sidebar {
  transform: translateX(calc(100% - 48px));
}

.immersion-immersive .app-header {
  max-height: 48px;
  overflow: hidden;
}

.immersion-reactive .article-card[data-active="true"] {
  box-shadow: 0 0 20px rgba(0, 209, 255, 0.3);
  border-color: #00D1FF;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
SECTION 16: DATA PIPELINE (Python)
process_herd.py:

python
import pandas as pd
import json
from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter

def process_herd(input_csv, output_geojson):
    df = pd.read_csv(input_csv)
    geolocator = Nominatim(user_agent="innovation_mapper")
    geocode = RateLimiter(geolocator.geocode, min_delay_seconds=0.1)

    features = []
    for _, row in df.iterrows():
        location = geocode(f"{row['city']}, {row['state']}")
        if location:
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [location.longitude, location.latitude]
                },
                "properties": {
                    "name": row["university_name"],
                    "rd_spending": int(row["rd_spending"]),
                    "research_field": row["research_field"],
                    "year": int(row["year"]),
                    "city": row["city"],
                    "state": row["state"]
                }
            })

    geojson = {"type": "FeatureCollection", "features": features}
    with open(output_geojson, 'w') as f:
        json.dump(geojson, f)

if __name__ == "__main__":
    process_herd("data/raw/herd_2024.csv", "public/data/universities.geojson")
process_deals.py:

python
import pandas as pd
import json
from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter

def process_deals(input_csv, output_points, output_arcs):
    df = pd.read_csv(input_csv)
    geolocator = Nominatim(user_agent="innovation_mapper")
    geocode = RateLimiter(geolocator.geocode, min_delay_seconds=0.1)

    points = []
    arcs = []

    for _, row in df.iterrows():
        startup_loc = geocode(f"{row['startup_city']}, {row['startup_state']}")
        investor_loc = geocode(f"{row['investor_city']}, {row['investor_state']}")

        if startup_loc:
            points.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [startup_loc.longitude, startup_loc.latitude]
                },
                "properties": {
                    "company": row["startup_name"],
                    "amount": float(row["deal_amount"]),
                    "sector": row["sector"],
                    "year": int(row["year"])
                }
            })

        if startup_loc and investor_loc:
            arcs.append({
                "origin": [investor_loc.longitude, investor_loc.latitude],
                "destination": [startup_loc.longitude, startup_loc.latitude],
                "value": float(row["deal_amount"]),
                "year": int(row["year"])
            })

    with open(output_points, 'w') as f:
        json.dump({"type": "FeatureCollection", "features": points}, f)

    with open(output_arcs, 'w') as f:
        json.dump(arcs, f)

if __name__ == "__main__":
    process_deals("data/raw/deals_2024.csv",
                  "public/data/deal_points.geojson",
                  "public/data/arcs.json")
process_dynamism.py:

python
import geopandas as gpd
import pandas as pd
import json

def process_dynamism(shapefile_path, csv_path, output_geojson):
    states = gpd.read_file(shapefile_path)
    dynamism = pd.read_csv(csv_path)

    # Simplify geometry for web performance
    states["geometry"] = states["geometry"].simplify(0.01)

    # Join with dynamism data
    merged = states.merge(dynamism, left_on="NAME", right_on="state")

    # Convert to GeoJSON
    merged.to_file(output_geojson, driver="GeoJSON")

if __name__ == "__main__":
    process_dynamism(
        "data/raw/cb_2023_us_state_5m.shp",
        "data/raw/state_dynamism_2024.csv",
        "public/data/states_dynamism.geojson"
    )
SECTION 17: ACCESSIBILITY REQUIREMENTS
Requirement	Implementation
Cesium canvas is decorative	aria-hidden="true" on the canvas element
All data in semantic HTML	Article cards, stat panels, sidebar use <article>, <nav>, <aside>
Immersion changes announced	<div aria-live="polite"> announces mode transitions
Keyboard navigation	Tab order: Header → Article feed → Sidebar → Time slider
Escape exits immersive	onKeyDown handler returns focus to triggering article card
Focus visible	All interactive elements have outline: 2px solid #FFD700 on focus
Touch targets	Minimum 44×44px on all interactive elements
Reduced motion	prefers-reduced-motion disables camera animations, particles, auto-rotate
Colorblind-safe	No red/green-only indicators. Cyan/orange/magenta palette verified for deuteranopia/protanopia
Screen reader content	All stat values have plain-language aria-label
SECTION 18: PERFORMANCE BUDGET
Metric	Target
Initial page load (with Cesium)	< 5 seconds
Entity count (full US)	< 5,000
Frame rate (with particles)	≥ 30fps on mid-range devices
GeoJSON total size	< 5MB
Memory usage	< 500MB GPU
Mobile (if supported)	Simplified scene, no particles, reduced entity count
Optimizations:

distanceDisplayCondition on all entities

CustomDataSource batching by layer

GeoJSON state polygons simplified to 1:5m resolution

React.memo on StatCard components

will-change: transform on moving overlay elements

Lazy load article cards below the fold

SECTION 19: DEPLOYMENT CONFIGURATION
netlify.toml:

toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/data/*"
  to = "/data/:splat"
  status = 200

[[headers]]
  for = "/data/*"
  [headers.values]
    Access-Control-Allow-Origin = "*"
    Cache-Control = "public, max-age=3600"
Build command:

bash
npm run build    # Vite builds to dist/
SECTION 20: SPRINT ROADMAP
Sprint	Focus	Key Deliverables
Sprint 0	Foundation	GitHub repo, Cesium Ion token, data access confirmed, Baltimore chosen as demo city
Sprint 1–2	One City Prototype	GlobeViewer with Baltimore towers + deal points + layer toggles
Sprint 3–4	State + Time	Mobility heatmap, time slider, region-constrained globe, day/night cycle
Sprint 5–6	Article Integration	Article cards with data attributes, inline badges, sidebar, IntersectionObserver
Sprint 7–8	Reactive Mode	Scroll-driven camera drift, shell opacity transitions, ambient globe background
Sprint 9–10	Immersive Mode	Hover-to-zoom, BoardGameStats, StatCards, useBoardAnchoring
Sprint 11–12	Polish & Deploy	Particles (dust/bees), animated arcs, accessibility audit, Netlify deploy, video walkthrough
SECTION 21: GLOBAL RULES FOR ALL GENERATED CODE
Accessibility first: Every interactive element has min 44×44px touch target, visible #FFD700 focus state, appropriate aria-labels.

Never violate visual encoding rules: Height ALWAYS means magnitude. Glow ALWAYS means activity. Color hue ALWAYS means category.

Use only the approved color palette: No hardcoded random colors. Reference CSS custom properties.

Performance budget: Entities with distanceDisplayCondition. GeoJSON simplified. React.memo on cards.

Mobile-first: All components start from mobile layout and scale up. Test touch-only input.

Comment intent: JSDoc at top of every file explaining WHAT the component does for the user, not HOW.

No mock data in production: Use real GeoJSON pipeline. Sample data only in /data/sample/.




Build is clean. Here's the situation:

  Your .env is correct. VITE_CESIUM_ION_TOKEN is the right variable name, it's in the project root, and vite.config.js has no override. The code reads it fine —
  the problem is timing.

  Why it "isn't found": Vite only reads .env files once, at dev-server startup. Your .env was last saved at 15:31. If npm run dev was already running then, the
  Why it "isn't found": Vite only reads .env files once, at dev-server startup. Your .env was last saved at 15:31. If npm run dev was already running then, the
  live process still has an empty token. Fix:

  Ctrl+C       # stop the dev server
  npm run dev  # start fresh — now it reads .env

  To confirm: after restart, open the browser console. You'll see one of:
  - [GlobeViewer] Cesium Ion token loaded (NNN chars) ✅
  - [GlobeViewer] No Ion token — restart npm run dev after editing .env ❌

  Also made imagery bulletproof: previously a present-but-invalid token would still give you a black globe. Now GlobeViewer.jsx always lays down a token-free
  OpenStreetMap base layer, then adds Cesium World Imagery (aerial) + world terrain on top only if the token works. So:
  - Token works → aerial imagery + 3D terrain.
  - Token missing/invalid/offline → OSM map tiles, still fully visible, never black.

  If after restarting you see the token loaded in the console but still get a dark or low-detail globe, check the Network tab for 401/403 from ion.cesium.com —
  that would mean the token lacks asset access (you'd need to enable "Cesium World Imagery" and "Cesium World Terrain" asset permissions on that token in your Ion
  dashboard). OSM will keep things working regardless.



   - Import: getSeedCity → getCityData
  - LANDMARKS constant removed, replaced with TEMPLATE_MAP that maps seed-data template names (comcastTower, universityTower, financialTower, hospitalComplex,
  transitHub) to their shape/footprint spec
  - zoneFor(gx, gz, radius): now takes radius as a parameter instead of using the hardcoded constant
  - Two new refs: radiusRef (defaults to CITY_RADIUS=600) and cityStatsRef — both set per city in onGenerate
  - onGenerate: calls getCityData(city.name) and sets both refs before generating
  - generateBuildings: uses radiusRef.current for all radius math, passes it to zoneFor, passes cityStatsRef.current to pickStat
  - pickStat: accepts cityStats and weights non-dominant building color selection by each stat's percentile — cities with high ventureCapital.percentile get
  proportionally more orange VC buildings, etc.
  - addLandmarks: fully data-driven now — iterates cityData.landmarks[], looks up shape/footW from TEMPLATE_MAP, uses lm.name, lm.height, lm.color, lm.gridX/gridZ
  from seed data
  - addRoads/addStreetLights: loop bounds use radiusRef.current instead of the constant

  
  ---
  CinematicTour.jsx — 5-phase guided camera sequence that fires on immersion:fakeCityGenerate:
  
  ┌───────────────────┬───────────────────────────────────────────────────────────────────────────────────────────────────────┬──────────┐
  │       Shot        │                                             What it does                                              │ Duration │
  ├───────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────┤
  │ 1 · Wide orbit    │ Sweeps around city at altitude, establishes scale                                                     │ 7.5s     │
  ├───────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────┤
  │ 2 · Landmark dive │ flyTo directly toward the hero tower, nearly-horizontal pitch (-16°) so the billboard fills the frame │ 2.4s     │
  ├───────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────┤
  │ 3 · Tight orbit   │ Circles the landmark at close range — billboard text readable, facades visible                        │ 6.2s     │
  ├───────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────┤
  │ 4 · Crane back    │ flyTo up and wide to reveal the full skyline                                                          │ 2.8s     │
  ├───────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────┤
  │ 5 · Settle        │ Slow final orbit at working altitude — stat cards are legible during this                             │ 9s       │
  └───────────────────┴───────────────────────────────────────────────────────────────────────────────────────────────────────┴──────────┘

  - User input (pan/zoom) is locked during the tour so nothing fights the camera, then re-enabled automatically
  - Cancelled immediately on immersion:boardExit or if a new city triggers while touring
  - Silently no-ops for prefers-reduced-motion users
  - Orbit speed and close-range are calculated from cityData.cityRadius so small cities (Wilmington 400m) and large cities (NY 900m) both frame correctly

  Billboard signs in FakeCityGenerator — each landmark now gets two overlapping elements:
  - wall entity: a physical sign panel rendered as a vertical Cesium wall, carrying a canvas-drawn texture with the building name in white and the economic stat
  label in cyan, with accent bars top/bottom
  - label entity: a floating background-pill text tag above the sign, visible up to 3,500m range (culled at distance so it doesn't clutter the wide view)

✻ Sautéed for 5m 47s

 Clean build. Here's what was added:

  ---
  CinematicTour.jsx — 5-phase guided camera sequence that
  fires on immersion:fakeCityGenerate:

  Shot: 1 · Wide orbit
  What it does: Sweeps around city at altitude, establishes

    scale
  Duration: 7.5s
  ────────────────────────────────────────
  Shot: 2 · Landmark dive
  What it does: flyTo directly toward the hero tower,
    nearly-horizontal pitch (-16°) so the billboard fills
    the frame
  Duration: 2.4s
  ────────────────────────────────────────
  Shot: 3 · Tight orbit
  What it does: Circles the landmark at close range —
    billboard text readable, facades visible
  Duration: 6.2s
  ────────────────────────────────────────
  Shot: 4 · Crane back
  What it does: flyTo up and wide to reveal the full
  skyline
  Duration: 2.8s
  ────────────────────────────────────────
  Shot: 5 · Settle
  What it does: Slow final orbit at working altitude — stat

    cards are legible during this
  Duration: 9s

  - User input (pan/zoom) is locked during the tour so
  nothing fights the camera, then re-enabled automatically
  - Cancelled immediately on immersion:boardExit or if a
  new city triggers while touring
  - Silently no-ops for prefers-reduced-motion users
  - Orbit speed and close-range are calculated from
  cityData.cityRadius so small cities (Wilmington 400m) and
   large cities (NY 900m) both frame correctly

  Billboard signs in FakeCityGenerator — each landmark now
  gets two overlapping elements:
  - wall entity: a physical sign panel rendered as a
  vertical Cesium wall, carrying a canvas-drawn texture
  with the building name in white and the economic stat
  label in cyan, with accent bars top/bottom
  - label entity: a floating background-pill text tag above
   the sign, visible up to 3,500m range (culled at distance
   so it doesn't clutter the wide view)

✻ Sautéed for 5m 47s

※ recap: Building a 3D globe "living article" experience
  for Technical.ly where cities come alive with voxel
  buildings, economic data, and cinematic camera tours.
  Latest work added billboard signs on landmark buildings
  and a 5-phase guided orbit sequence. Next: test in the
  browser with npm run dev.

❯ what data is being pulled in and what data is seeded, im 
   trying to understand this repo a little more and needs  
  to know the source of data so i can configure it alittle 
  ⎿  ⧉ Selected 1 lines from 
     public/data/city-stats/baltimore.json in Visual Studio
      Code
     
⏺ Let me look at the store's fetch logic and the public
  data files to map the full picture.
   
  Read 3 files, listed 1 directory (ctrl+o to expand)

⏺ Here's the complete data map for this repo:

  ---
  Two parallel data systems

  System 1 — Runtime-fetched JSON 
  (/public/data/city-stats/*.json)

  Files: baltimore.json, philadelphia.json,
  pittsburgh.json, washington.json, wilmington.json

  Loaded by: useMapStore.fetchCityStats(cityName) →
  fetch('/data/city-stats/{slug}.json') — this runs every
  time a user enters Immersive mode for a city.

  What reads it: The BoardGameStats stat cards (Research,
  Deals, Mobility, Mismatch panels). These are the overlaid
   UI panels that appear at compass points around the city.

  Shape each file has:
  researchSpending, universityCount, universities[]
  dealFlow, dealCount, dealFlowYoY, topDealSector, deals[]
  mobilityScore, mobilityRating, migrationNet,
  medianIncome, ...
  ecosystemConnections[]    ← drives the arc/bridge lines
  articleTopics{}           ← weights for article category
  display
  
  Currently: All hand-authored. These 5 cities have files.
  The other 6 cities in seedCityData (Boston, SF, NYC,
  Chicago, Austin, Detroit) do not have corresponding JSON
  files yet — if you navigate to them, fetchCityStats will
  get a 404, log a warning, and the stat cards will show
  dashes.

  ---
  System 2 — Bundled JS seed data 
  (src/data/seedCityData.js)

  Imported at build time — not fetched, just a JS module.

  What reads it:
  - FakeCityGenerator — getCityData(city.name) → uses
  cityData.stats{} (percentile weights),
  cityData.landmarks[] (building placement),
  cityData.cityRadius
  - LivingEcosystem — getSeedCity(city.name) → uses
  beeCounts{}, treeCount/treeHealth, carCount/carSpeed,
  planeCounts{}, dustEmission
  - CinematicTour — getCityData(city.name) → picks the hero
   landmark for the close-up shot

  Shape per city:
  cityRadius                ← 3D city generation footprint
  (meters)
  stats{ statKey: { value, percentile } }  ← 25 categories,
   drives building colors
  landmarks[]               ← { template, gridX, gridZ,
  name, height, color, stat }
  universities[]            ← bee orbits in LivingEcosystem
  beeCounts{}               ← per-university bee density
  treeCount, treeHealth
  carCount, carSpeed
  planeCounts{}             ← per-destination plane count
  dustEmission
  ecosystemConnections[]    ← arc lines in LivingEcosystem

  Currently: 11 cities (Baltimore, Boston, SF, Pittsburgh,
  Detroit, Austin, Washington DC, Philadelphia, New York,
  Chicago, Wilmington). All hand-authored with realistic
  but estimated values.

  ---
  System 3 — Article fixtures (src/data/articles.js)
  
  Bundled JS array, hardcoded. The article feed, scroll
  triggers, and city hover targets all come from here. Each
   article has:
  city, lat, lon             ← what the camera flies to
  stats{ research, deals, mobility, mismatch }  ← inline
  display badges
  layers[]                   ← which globe layers intensify
   on scroll
   
  Currently 5 articles (one per city with a JSON file).
  This is where you'd plug in a real CMS.

  ---
  How they connect

  User scrolls article
    → articles.js { city, lat, lon }
        → useImmersionController flies camera
        → fetchCityStats()
            → /public/data/city-stats/{city}.json  ←
  BoardGameStats cards
        → immersion:fakeCityGenerate fires
            → seedCityData.js getCityData()         ← 3D
  city + ecosystem

  ---
  What to configure

  You want to...: Change article content / add cities to
  the      
    feed
  Edit this: src/data/articles.js
  ────────────────────────────────────────
  You want to...: Change stat card numbers (research $,
  deal
    $, mobility score)
  Edit this: public/data/city-stats/{city}.json
  ────────────────────────────────────────
  You want to...: Add a new city's stat card support
  Edit this: Add a new public/data/city-stats/{city}.json
  ────────────────────────────────────────
  You want to...: Change 3D city shape, building colors,
    landmark positions
  Edit this: src/data/seedCityData.js → city's stats{} and
    landmarks[]
  ────────────────────────────────────────
  You want to...: Change ecosystem animations (bees, trees,

    planes, cars)
  Edit this: src/data/seedCityData.js → city's beeCounts,
    treeCount, planeCounts, etc.
  ────────────────────────────────────────
  You want to...: Change which cities orbit which (the arc
    lines)
  Edit this: useImmersionController.js → ECOSYSTEM_MAP

  The two JSON formats are not synced automatically — if
  you update researchSpending in baltimore.json, you'd also
   want to update the universityResearch.value in
  seedCityData.js for consistency. The JSON file drives the
   cards the user reads; the seed data drives what the 3D
  city looks like.