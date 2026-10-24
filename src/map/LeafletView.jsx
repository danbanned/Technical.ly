import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const CENTER = [39.9526, -75.1636]; // City Hall, same as the 3D opening view
const ZOOM = 13;

// 2D map: OpenStreetMap tiles with attribution, plus a marker for each place
// passed in. Markers are plain circle markers, so no image assets are needed.
const LeafletView = forwardRef(function LeafletView({ places = [], selectedId, onSelect }, ref) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(new Map());

  useEffect(() => {
    const map = L.map(containerRef.current, { center: CENTER, zoom: ZOOM });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;
    const markers = markersRef.current;
    for (const p of places) {
      const m = L.circleMarker([p.lat, p.lon], {
        radius: 7, weight: 2, color: '#0b1016', fillColor: p.color ?? '#22d3ee', fillOpacity: 0.9,
      })
        .bindTooltip(p.name)
        .on('click', () => onSelect?.(p.id))
        .addTo(map);
      // The "Select a building" picker is the keyboard route to every place, so
      // the markers stay out of the tab order.
      m.getElement()?.setAttribute('tabindex', '-1');
      markers.set(p.id, m);
    }
    return () => {
      markers.forEach((m) => m.remove());
      markers.clear();
    };
  }, [places, onSelect]);

  useEffect(() => {
    markersRef.current.forEach((m, id) => m.setStyle({ radius: id === selectedId ? 11 : 7, weight: id === selectedId ? 4 : 2 }));
  }, [selectedId]);

  useImperativeHandle(ref, () => ({
    resetView: () => mapRef.current?.setView(CENTER, ZOOM),
    centerOn: (lat, lon) => mapRef.current?.setView([lat, lon], 16),
  }), []);

  return (
    <div
      ref={containerRef}
      className="bv-map-2d"
      role="region"
      aria-label="2D map of Philadelphia with place markers (OpenStreetMap basemap)"
    />
  );
});

export default LeafletView;
