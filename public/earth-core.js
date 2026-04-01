/**
 * earth-core.js - 地球渲染核心模块
 * 负责Three.js场景、相机、渲染器、地球、大气、云层、星空
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// 全局变量
let scene, camera, renderer, controls;
let earth, clouds, atmosphere;
let labelRenderer;

// 初始化地球场景
function initScene() {
  // 场景
  scene = new THREE.Scene();
  
  // 相机
  camera = new THREE.PerspectiveCamera(
    45, 
    window.innerWidth / window.innerHeight, 
    0.1, 
    1000
  );
  camera.position.z = 20;
  
  // 渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.body.appendChild(renderer.domElement);
  
  // CSS2D渲染器（用于城市标签）
  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  document.body.appendChild(labelRenderer.domElement);
  
  // 控制器
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxDistance = 50;
  controls.minDistance = 5;
  
  // 光照
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 3, 5);
  scene.add(directionalLight);
  
  return { scene, camera, renderer, controls };
}

// 创建地球
function createEarth() {
  const textureLoader = new THREE.TextureLoader();
  
  const earthGeo = new THREE.SphereGeometry(5, 64, 64);
  const earthMat = new THREE.MeshPhongMaterial({
    map: textureLoader.load('./img/earth.jpg'),
    bumpMap: textureLoader.load('./img/earth_bump.jpg'),
    bumpScale: 0.05,
    specular: new THREE.Color(0x333333),
    shininess: 5
  });
  
  earth = new THREE.Mesh(earthGeo, earthMat);
  scene.add(earth);
  
  return earth;
}

// 创建大气层
function createAtmosphere() {
  const atmosphereGeo = new THREE.SphereGeometry(5.5, 64, 64);
  const atmosphereMat = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      void main() {
        float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
        gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
      }
    `,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true
  });
  
  atmosphere = new THREE.Mesh(atmosphereGeo, atmosphereMat);
  scene.add(atmosphere);
  
  return atmosphere;
}

// 创建云层
function createClouds() {
  const cloudGeo = new THREE.SphereGeometry(5.2, 64, 64);
  const cloudMat = new THREE.MeshPhongMaterial({
    map: new THREE.TextureLoader().load('./img/cloud.png'),
    transparent: true,
    opacity: 0.3,
    depthWrite: false
  });
  
  clouds = new THREE.Mesh(cloudGeo, cloudMat);
  scene.add(clouds);
  
  return clouds;
}

// 创建星空背景
function createStars() {
  const starsGeo = new THREE.BufferGeometry();
  const starsMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.1,
    transparent: true,
    opacity: 0.8
  });
  
  const starsVertices = [];
  for (let i = 0; i < 10000; i++) {
    const x = THREE.MathUtils.randFloatSpread(500);
    const y = THREE.MathUtils.randFloatSpread(500);
    const z = THREE.MathUtils.randFloatSpread(500);
    starsVertices.push(x, y, z);
  }
  
  starsGeo.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
  const stars = new THREE.Points(starsGeo, starsMaterial);
  scene.add(stars);
  
  return stars;
}

// 地理坐标转3D坐标
function latLonToVector3(lat, lon, radius = 5) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// 窗口大小变化处理
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
}

// 导出
export {
  initScene,
  createEarth,
  createAtmosphere,
  createClouds,
  createStars,
  latLonToVector3,
  onWindowResize,
  getScene: () => scene,
  getCamera: () => camera,
  getRenderer: () => renderer,
  getControls: () => controls,
  getEarth: () => earth,
  getClouds: () => clouds,
  getAtmosphere: () => atmosphere
};
