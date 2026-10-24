import { useEffect, useState } from 'react';

// Current Philadelphia weather from Open-Meteo, fetched in the browser. Open-Meteo
// is not in the source registry. Any failure leaves status 'error', which the
// Dashboard shows as "Weather unavailable"; no values are filled in.
const URL =
  'https://api.open-meteo.com/v1/forecast?latitude=39.9526&longitude=-75.1652' +
  '&current=temperature_2m,weather_code,wind_speed_10m' +
  '&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FNew_York';

// WMO weather interpretation codes, as listed in the Open-Meteo docs.
function describe(code) {
  if (code === 0) return 'Clear';
  if (code === 1) return 'Mainly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 51 && code <= 57) return 'Drizzle';
  if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Rain showers';
  if (code === 85 || code === 86) return 'Snow showers';
  if (code >= 95 && code <= 99) return 'Thunderstorm';
  return null;
}

export function useWeather() {
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    let cancelled = false; // set on unmount; a timeout abort still counts as a failure
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    fetch(URL, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => {
        if (cancelled) return;
        const c = d?.current;
        if (!c || typeof c.temperature_2m !== 'number') throw new Error('No current weather in response');
        setState({
          status: 'ok',
          tempF: c.temperature_2m,
          conditions: describe(c.weather_code),
          windMph: typeof c.wind_speed_10m === 'number' ? c.wind_speed_10m : null,
          time: c.time,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn('[useWeather] Weather unavailable:', err.message);
        setState({ status: 'error' });
      })
      .finally(() => clearTimeout(timer));
    return () => {
      cancelled = true;
      clearTimeout(timer);
      ctrl.abort();
    };
  }, []);

  return state;
}
