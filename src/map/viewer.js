import * as Cesium from 'cesium';
import { SCENE } from '../data/config.js';

export function flyToPhiladelphia(viewer) {
  const { lon, lat, range, heading, pitch } = SCENE.CAMERA;
  viewer.camera.flyToBoundingSphere(
    new Cesium.BoundingSphere(Cesium.Cartesian3.fromDegrees(lon, lat), 0),
    {
      offset: new Cesium.HeadingPitchRange(
        Cesium.Math.toRadians(heading), Cesium.Math.toRadians(pitch), range),
      duration: 2,
    }
  );
}

export function applyDarkScene(viewer) {
  viewer.imageryLayers.removeAll();
  viewer.imageryLayers.addImageryProvider(
    new Cesium.UrlTemplateImageryProvider({
      url: 'https://{s}.basemaps.cartocdn.com/dark_matter/{z}/{x}/{y}{r}.png',
      subdomains: ['a', 'b', 'c', 'd'],
      credit: '© CartoDB / OpenStreetMap contributors',
    })
  );
}

export function applyLightScene(viewer) {
  viewer.imageryLayers.removeAll();
  viewer.imageryLayers.addImageryProvider(
    new Cesium.UrlTemplateImageryProvider({
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      subdomains: ['a', 'b', 'c', 'd'],
      credit: '© CartoDB / OpenStreetMap contributors',
    })
  );
}
