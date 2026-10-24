import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AppShell from './layout/AppShell';
import Dashboard from './pages/Dashboard';
import MapPage from './pages/MapPage';
import Map3DPage from './pages/Map3DPage';
import LocationPage from './pages/LocationPage';
import AreaPage from './pages/AreaPage';
import ResourcesPage from './pages/ResourcesPage';
import SettingsPage from './pages/SettingsPage';
import EmptyState from './ui/EmptyState';

function NotFound() {
  return (
    <div className="bv-page">
      <h1 className="bv-page-title">Page not found</h1>
      <EmptyState>This page does not exist.</EmptyState>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="map" element={<MapPage />} />
          <Route path="3d" element={<Map3DPage />} />
          <Route path="location" element={<LocationPage />} />
          <Route path="location/:id" element={<LocationPage />} />
          <Route path="area" element={<AreaPage />} />
          <Route path="resources" element={<ResourcesPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
