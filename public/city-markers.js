/**
 * city-markers.js - 城市标注模块
 * 城市标注点、标签、点击交互
 */

import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

let cityMarkers = [];
let cityLabels = [];

function createCityMarkers() {
  // 遍历城市数据创建标注
  cityData.forEach(city => {
    const marker = createCityMarker(city);
    cityMarkers.push(marker);
    scene.add(marker);
  });
}

function createCityMarker(city) {
  const group = new THREE.Group();
  
  // 标注点
  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x00ff88 })
  );
  group.add(dot);
  
  // 脉冲环
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.12, 0.18, 32),
    new THREE.MeshBasicMaterial({ color: 0x00ff88, side: THREE.DoubleSide, transparent: true, opacity: 0.5 })
  );
  ring.rotation.x = -Math.PI / 2;
  group.add(ring);
  
  // 位置
  const pos = latLonToVector3(city.lat, city.lon, 5.1);
  group.position.copy(pos);
  
  return group;
}

function latLonToVector3(lat, lon, radius = 5) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

export { createCityMarkers, cityMarkers, cityLabels };
