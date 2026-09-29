// TEMP debug — logs the exact URL + status of any failed fetch. Remove after diagnosis.
if (typeof window !== 'undefined' && !window.__fetchDebugInstalled) {
  window.__fetchDebugInstalled = true;
  const origFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const res = await origFetch(...args);
    if (!res.ok) console.error('[TileDebug] fetch failed:', res.status, res.url || String(args[0]));
    return res;
  };
}
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
