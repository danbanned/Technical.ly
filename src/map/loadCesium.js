// Loads Cesium's widget CSS, and in production the prebuilt Cesium.js, only when
// the 3D page needs them (see loadCesiumOnDemand in vite.config.js). In dev,
// Cesium is an ES module and vite-plugin-cesium defines CESIUM_BASE_URL.
const BASE = '/cesium/';
let loading = null;

function addOnce(tag, attrs) {
  return new Promise((resolve, reject) => {
    const el = document.createElement(tag);
    Object.assign(el, attrs);
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Could not load ${attrs.src ?? attrs.href}`));
    document.head.appendChild(el);
  });
}

export function loadCesium() {
  if (!loading) {
    const css = addOnce('link', { rel: 'stylesheet', href: `${BASE}Widgets/widgets.css` });
    if (import.meta.env.PROD) {
      window.CESIUM_BASE_URL = BASE;
      loading = Promise.all([css, addOnce('script', { src: `${BASE}Cesium.js` })]);
    } else {
      loading = css;
    }
    loading = loading.catch((err) => {
      loading = null;
      throw err;
    });
  }
  return loading;
}
