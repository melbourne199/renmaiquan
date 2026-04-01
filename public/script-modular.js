/**
 * script-modular.js - 模块化主入口（测试版）
 * 整合新拆分的模块
 * 如有问题：删除此文件，网站自动恢复原script.js
 */

console.log('🔧 模块化脚本加载中...');

// 临时使用内联模块（后续可改为外部导入）
// ============================================================
// 地球核心 - 内联版本
// ============================================================
import * as THREE from './three.module.js';
import { OrbitControls } from './OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from './CSS2DRenderer.js';

let scene, camera, renderer, controls, earth, clouds, atmosphere, labelRenderer;
let cityData = [];
let cityMarkers = [];
let cityLabels = [];
let animationComplete = false;
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();

// ============================================================
// 初始化
// ============================================================
async function init() {
  console.log('🚀 初始化地球...');
  
  // 初始化Three.js
  initScene();
  
  // 创建地球组件
  createEarth();
  createAtmosphere();
  createClouds();
  createStars();
  
  // 加载城市数据
  await loadCityData();
  
  // 创建城市标注
  createCityMarkers();
  
  // Intro动画
  startIntroEffect();
  
  // 事件监听
  setupEventListeners();
  
  // 开始动画
  animate();
  
  console.log('✅ 初始化完成!');
}

// ============================================================
// Three.js 初始化
// ============================================================
function initScene() {
  scene = new THREE.Scene();
  
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 20;
  
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.body.appendChild(renderer.domElement);
  
  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  document.body.appendChild(labelRenderer.domElement);
  
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxDistance = 50;
  controls.minDistance = 5;
  
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 3, 5);
  scene.add(directionalLight);
}

// ============================================================
// 地球组件
// ============================================================
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
}

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
}

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
}

function createStars() {
  const starsGeo = new THREE.BufferGeometry();
  const starsMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1, transparent: true, opacity: 0.8 });
  const starsVertices = [];
  for (let i = 0; i < 10000; i++) {
    starsVertices.push(
      THREE.MathUtils.randFloatSpread(500),
      THREE.MathUtils.randFloatSpread(500),
      THREE.MathUtils.randFloatSpread(500)
    );
  }
  starsGeo.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
  scene.add(new THREE.Points(starsGeo, starsMaterial));
}

// ============================================================
// 城市数据
// ============================================================
async function loadCityData() {
  try {
    const response = await fetch('./data/city-data.json?t=' + Date.now());
    cityData = await response.json();
    console.log('cityData loaded:', cityData.length);
  } catch (e) {
    console.error('Failed to load cityData:', e);
  }
}

// ============================================================
// 城市标注
// ============================================================
function createCityMarkers() {
  if (!cityData || cityData.length === 0) return;
  
  cityData.forEach(city => {
    const pos = latLonToVector3(city.lat, city.lon, 5.1);
    
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x00ff88 })
    );
    dot.position.copy(pos);
    scene.add(dot);
    cityMarkers.push(dot);
  });
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

// ============================================================
// 事件监听
// ============================================================
function setupEventListeners() {
  window.addEventListener('resize', onWindowResize);
  window.addEventListener('click', onMouseClick);
  document.getElementById('menuBtn')?.addEventListener('click', toggleMenu);
  document.querySelectorAll('.menu-nav a').forEach(a => a.addEventListener('click', toggleMenu));
  document.getElementById('searchBtn')?.addEventListener('click', performSearch);
  document.getElementById('searchInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer?.setSize(window.innerWidth, window.innerHeight);
}

function onMouseClick(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  // 后续添加点击检测
}

// ============================================================
// UI功能
// ============================================================
function toggleMenu() {
  const menu = document.getElementById('menuOverlay');
  const menuBtn = document.getElementById('menuBtn');
  if (menu && menuBtn) {
    const isOpen = menu.classList.toggle('open');
    menuBtn.textContent = isOpen ? '✕' : '☰';
  }
}

function performSearch() {
  const input = document.getElementById('searchInput');
  const query = input?.value.trim();
  if (!query) return;
  console.log('搜索:', query);
  // 搜索逻辑
}

// ============================================================
// Intro动画（简化版）
// ============================================================
let introState = 'idle';
function startIntroEffect() {
  introState = 'done'; // 简化，暂时跳过
}

// ============================================================
// 动画循环
// ============================================================
function animate() {
  requestAnimationFrame(animate);
  controls?.update();
  if (earth) earth.rotation.y += 0.0005;
  if (clouds) clouds.rotation.y += 0.0003;
  renderer.render(scene, camera);
  labelRenderer?.render(scene, camera);
}

// ============================================================
// 启动
// ============================================================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

console.log('🔧 模块化脚本已加载完成!');
