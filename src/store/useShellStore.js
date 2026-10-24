import { create } from 'zustand';

// Shell-only state (the BlockView header, sidebar and pages). Map state stays in
// useMapStore.js. Everything here is remembered in this browser.
const THEME_KEY = 'blockview-theme';
const SIDEBAR_KEY = 'blockview-sidebar-collapsed';
const PANELS_KEY = 'blockview-map-panels';
const DEFAULT_PANELS = { left: true, right: true, legend: true };

// Browser storage can be missing or throw (private windows, blocked site data);
// each read falls back to its default and each write is best-effort.
function read(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Not persisted; the choice still applies for this visit.
  }
}

const readTheme = () => (read(THEME_KEY) === 'light' ? 'light' : 'dark');

function readPanels() {
  try {
    return { ...DEFAULT_PANELS, ...JSON.parse(read(PANELS_KEY) ?? '{}') };
  } catch {
    return DEFAULT_PANELS;
  }
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  write(THEME_KEY, theme);
}

export const useShellStore = create((set, get) => ({
  theme: readTheme(),
  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },

  sidebarCollapsed: read(SIDEBAR_KEY) === 'true',
  toggleSidebar: () => {
    const sidebarCollapsed = !get().sidebarCollapsed;
    write(SIDEBAR_KEY, String(sidebarCollapsed));
    set({ sidebarCollapsed });
  },

  // Which of the 3D map's overlay groups are shown: the left rail (layers and
  // tracts), the right rail (city overview, inspect, insights) and the legend.
  mapPanels: readPanels(),
  toggleMapPanel: (key) => {
    const mapPanels = { ...get().mapPanels, [key]: !get().mapPanels[key] };
    write(PANELS_KEY, JSON.stringify(mapPanels));
    set({ mapPanels });
  },
}));

export function initTheme() {
  applyTheme(readTheme());
}
