import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWeather } from '../hooks/useWeather';
import { APP_SOURCES } from '../data/appSources';
import ExternalLink from '../ui/ExternalLink';

const DASHBOARD_SOURCES = ['osm', 'census_acs', 'open_meteo', 'tract_boundaries']
  .map((id) => APP_SOURCES.find((s) => s.id === id));

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function LiveCard() {
  const now = useNow();
  const weather = useWeather();
  const tile = (label, value) => (
    <div className="bv-tile">
      <span className="bv-tile-label">{label}</span>
      <span className="bv-tile-value">{value}</span>
    </div>
  );
  const unavailable = weather.status === 'error';
  const loading = weather.status === 'loading';

  return (
    <section className="bv-card bv-live-card" aria-labelledby="live-heading">
      <div className="bv-card-head">
        <h2 id="live-heading" className="bv-eyebrow">Philadelphia / Live</h2>
      </div>
      <p className="bv-clock">
        <time dateTime={now.toISOString()}>{now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time>
      </p>
      <p>{now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      {unavailable ? (
        <p className="bv-empty" role="status">Weather unavailable.</p>
      ) : (
        <div className="bv-tiles" aria-busy={loading}>
          {tile('Weather', loading ? '…' : `${Math.round(weather.tempF)}°F`)}
          {tile('Conditions', loading ? '…' : weather.conditions ?? 'No data yet')}
          {tile('Wind', loading ? '…' : weather.windMph === null ? 'No data yet' : `${Math.round(weather.windMph)} mph`)}
        </div>
      )}
      <p className="bv-hint">Local time on this device. Weather: Open-Meteo.</p>
    </section>
  );
}

export default function Dashboard() {
  return (
    <div className="bv-page">
      <h1 className="bv-page-title">Dashboard</h1>

      <div className="bv-split-even">
        <LiveCard />
        <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
          <Link className="bv-btn bv-btn-primary bv-btn-wide" to="/map">Open 2D Map <span aria-hidden="true">›</span></Link>
          <Link className="bv-btn bv-btn-wide" to="/3d">Open 3D Map <span aria-hidden="true">›</span></Link>
          <section className="bv-card" aria-labelledby="mission-heading">
            <h2 id="mission-heading">Mission</h2>
            <p className="bv-placeholder">[mission text — team to supply]</p>
          </section>
        </div>
      </div>

      <section aria-labelledby="behind-heading">
        <div className="bv-row-between">
          <div>
            <span className="bv-eyebrow">Behind the explorer</span>
            <h2 id="behind-heading">Resources used in BlockView</h2>
          </div>
          <Link className="bv-link" to="/resources">View all resources <span aria-hidden="true">›</span></Link>
        </div>
        <div className="bv-grid-2" style={{ marginTop: 12 }}>
          {DASHBOARD_SOURCES.map((s, i) => (
            <article key={s.id} className="bv-card bv-source-card">
              <span className="bv-num">{String(i + 1).padStart(2, '0')}</span>
              <h3>{s.name}</h3>
              <p>{s.summary}</p>
              <ExternalLink href={s.datasetUrl}>View dataset &amp; source</ExternalLink>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
