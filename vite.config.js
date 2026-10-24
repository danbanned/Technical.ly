import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import cesium from 'vite-plugin-cesium';

// OFF until the team decides what language is allowed. When on, it drops registry
// entries whose status is "retired" before the JSON reaches the bundle (the file
// on disk is unchanged).
const DROP_RETIRED_REGISTRY_ENTRIES = false;

function dropRetiredRegistryEntries() {
  return {
    name: 'drop-retired-registry-entries',
    enforce: 'pre',
    transform(code, id) {
      if (!DROP_RETIRED_REGISTRY_ENTRIES) return null;
      if (!id.replace(/\?.*$/, '').endsWith('/src/data/source_of_truth.json')) return null;
      const registry = JSON.parse(code);
      for (const section of Object.values(registry)) {
        if (!section || typeof section !== 'object' || Array.isArray(section)) continue;
        for (const [key, entry] of Object.entries(section)) {
          if (entry && typeof entry === 'object' && entry.status === 'retired') delete section[key];
        }
      }
      return { code: JSON.stringify(registry), map: null };
    },
  };
}

// vite-plugin-cesium adds Cesium.js and its widget CSS to index.html, so every
// route downloads Cesium. Strip them; src/map/loadCesium.js loads both on /3d only.
function loadCesiumOnDemand() {
  return {
    name: 'load-cesium-on-demand',
    transformIndexHtml: {
      order: 'post',
      handler: (html) => html
        .replace(/\s*<script[^>]*src="\/cesium\/Cesium\.js"[^>]*><\/script>/, '')
        .replace(/\s*<link[^>]*href="\/cesium\/Widgets\/widgets\.css"[^>]*>/, ''),
    },
  };
}

export default defineConfig({
  plugins: [dropRetiredRegistryEntries(), react(), cesium(), loadCesiumOnDemand()],
  server: {
    port: 5173,
    host: true,
  },
});
