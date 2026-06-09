import * as Cesium from 'cesium';
import { SCENE } from '../data/config.js';

export function flyToPhiladelphia(viewer) {
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(
      SCENE.CAMERA.lon,
      SCENE.CAMERA.lat,
      SCENE.CAMERA.height
    ),
    orientation: {
      heading: 0,
      pitch: Cesium.Math.toRadians(SCENE.CAMERA.pitch),
      roll: 0,
    },
    duration: 2,
  });
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
