// Small line icons for the sidebar. Decorative: each link keeps its text label.
const PATHS = {
  dashboard: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z',
  map2d: 'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14',
  map3d: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5',
  location: 'M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  resources: 'M5 4h10l4 4v12H5zM15 4v4h4M8 12h8M8 16h8',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1-1-3-2 .3-1.3-1.3.3-2-3-1-1 2h-2l-1-2-3 1 .3 2L6 7.3 4 7 3 10l2 1v2l-2 1 1 3 2-.3 1.3 1.3-.3 2 3 1 1-2h2l1 2 3-1-.3-2 1.3-1.3 2 .3 1-3-2-1z',
  collapse: 'M15 6l-6 6 6 6',
  expand: 'M9 6l6 6-6 6',
};

export default function NavIcon({ name }) {
  return (
    <svg className="bv-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path d={PATHS[name]} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
