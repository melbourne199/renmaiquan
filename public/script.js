import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

let scene, camera, renderer, controls, earth, clouds, atmosphere, labelRenderer;
let cityMarkers = [];
let cityLabels = [];
let beijingStar = null;
let markerGroup;
let animationComplete = false;
let initStarted = false;
let targetRotation = -1.85; // 地球目标旋转角度，默认中国

const tooltip = document.getElementById('cityTooltip');
const cityCard = document.getElementById('cityCard');
const searchInput = document.getElementById('citySearch');
const searchBtn = document.getElementById('searchBtn');
const loadingEl = document.getElementById('loading');

// 城市数据 - 全国省会及主要城市
const cityData = [
  // 华北
  { name: '北京', lat: 39.9042, lon: 116.4074, provided: 126, help: 18, isBeijing: true },
  { name: '天津', lat: 39.1256, lon: 117.1909, provided: 45, help: 7, offset: { x: -0.3, y: 0.1 } },
  { name: '石家庄', lat: 38.0428, lon: 114.5149, provided: 38, help: 6 },
  { name: '保定', lat: 38.8738, lon: 115.4646, provided: 25, help: 4 },
  { name: '唐山', lat: 39.6243, lon: 118.1944, provided: 28, help: 3, offset: { x: -0.2, y: 0.1 } },
  { name: '太原', lat: 37.8706, lon: 112.5489, provided: 35, help: 5 },
  { name: '大同', lat: 40.0769, lon: 113.2991, provided: 18, help: 2 },
  { name: '呼和浩特', lat: 40.8414, lon: 111.7519, provided: 30, help: 4 },

  // 东北
  { name: '沈阳', lat: 41.8057, lon: 123.4328, provided: 40, help: 6 },
  { name: '大连', lat: 38.9140, lon: 121.6147, provided: 45, help: 7 },
  { name: '鞍山', lat: 41.1086, lon: 122.9946, provided: 22, help: 3 },
  { name: '长春', lat: 43.8171, lon: 125.3235, provided: 32, help: 4 },
  { name: '吉林', lat: 43.8380, lon: 126.5600, provided: 20, help: 3 },
  { name: '哈尔滨', lat: 45.8038, lon: 126.5340, provided: 34, help: 5 },
  { name: '大庆', lat: 46.5907, lon: 125.1030, provided: 18, help: 2 },

  // 华东
  { name: '上海', lat: 31.2304, lon: 121.4737, provided: 148, help: 22 },
  { name: '南京', lat: 32.0603, lon: 118.7969, provided: 58, help: 8 },
  { name: '苏州', lat: 31.2989, lon: 120.5853, provided: 65, help: 9 },
  { name: '杭州', lat: 30.2741, lon: 120.1551, provided: 96, help: 13 },
  { name: '宁波', lat: 29.8683, lon: 121.5440, provided: 52, help: 7 },
  { name: '温州', lat: 28.0006, lon: 120.6994, provided: 38, help: 5 },
  { name: '合肥', lat: 31.8206, lon: 117.2272, provided: 42, help: 6 },
  { name: '芜湖', lat: 31.3529, lon: 118.3760, provided: 28, help: 4 },
  { name: '福州', lat: 26.0745, lon: 119.2965, provided: 35, help: 5 },
  { name: '厦门', lat: 24.4798, lon: 118.0894, provided: 48, help: 7 },
  { name: '泉州', lat: 24.8740, lon: 118.6758, provided: 32, help: 4 },
  { name: '南昌', lat: 28.6829, lon: 115.8579, provided: 30, help: 4 },
  { name: '赣州', lat: 25.8292, lon: 114.9355, provided: 22, help: 3 },
  { name: '济南', lat: 36.6512, lon: 117.1205, provided: 38, help: 5 },
  { name: '青岛', lat: 36.0671, lon: 120.3826, provided: 55, help: 8 },
  { name: '烟台', lat: 37.4639, lon: 121.4480, provided: 32, help: 4 },

  // 华中
  { name: '郑州', lat: 34.7466, lon: 113.6253, provided: 42, help: 8 },
  { name: '洛阳', lat: 34.6197, lon: 112.4540, provided: 28, help: 4 },
  { name: '开封', lat: 34.7972, lon: 114.3414, provided: 20, help: 3 },
  { name: '武汉', lat: 30.5928, lon: 114.3055, provided: 73, help: 11 },
  { name: '宜昌', lat: 30.6918, lon: 111.2868, provided: 25, help: 4 },
  { name: '襄阳', lat: 32.0091, lon: 112.1226, provided: 22, help: 3 },
  { name: '长沙', lat: 28.2282, lon: 112.9388, provided: 48, help: 9 },
  { name: '株洲', lat: 27.8273, lon: 113.1340, provided: 25, help: 4 },
  { name: '湘潭', lat: 27.8291, lon: 112.9442, provided: 20, help: 3 },

  // 华南
  { name: '广州', lat: 23.1291, lon: 113.2644, provided: 102, help: 14 },
  { name: '深圳', lat: 22.5431, lon: 114.0579, provided: 165, help: 27 },
  { name: '东莞', lat: 23.0469, lon: 113.7633, provided: 58, help: 8 },
  { name: '佛山', lat: 23.0218, lon: 113.1220, provided: 45, help: 6 },
  { name: '南宁', lat: 22.8170, lon: 108.3665, provided: 32, help: 5 },
  { name: '桂林', lat: 25.2736, lon: 110.2900, provided: 25, help: 4 },
  { name: '柳州', lat: 24.3263, lon: 109.3896, provided: 22, help: 3 },
  { name: '海口', lat: 20.0444, lon: 110.1999, provided: 28, help: 4 },
  { name: '三亚', lat: 18.2528, lon: 109.5119, provided: 35, help: 5 },

  // 西南
  { name: '重庆', lat: 29.5630, lon: 106.5516, provided: 66, help: 10 },
  { name: '成都', lat: 30.5728, lon: 104.0668, provided: 84, help: 16 },
  { name: '绵阳', lat: 31.4675, lon: 104.6796, provided: 28, help: 4 },
  { name: '贵阳', lat: 26.6470, lon: 106.6302, provided: 30, help: 5 },
  { name: '遵义', lat: 27.7255, lon: 106.9272, provided: 22, help: 3 },
  { name: '昆明', lat: 25.0406, lon: 102.7129, provided: 32, help: 5 },
  { name: '大理', lat: 25.6065, lon: 100.2676, provided: 18, help: 3 },
  { name: '拉萨', lat: 29.6500, lon: 91.1000, provided: 12, help: 2 },

  // 西北
  { name: '西安', lat: 34.3416, lon: 108.9398, provided: 61, help: 9 },
  { name: '咸阳', lat: 34.3296, lon: 108.7091, provided: 25, help: 4 },
  { name: '宝鸡', lat: 34.3619, lon: 107.2374, provided: 20, help: 3 },
  { name: '兰州', lat: 36.0611, lon: 103.8343, provided: 28, help: 4 },
  { name: '天水', lat: 34.5808, lon: 105.7244, provided: 15, help: 2 },
  { name: '西宁', lat: 36.6171, lon: 101.7782, provided: 18, help: 3 },
  { name: '银川', lat: 38.4680, lon: 106.2731, provided: 20, help: 3 },
  { name: '乌鲁木齐', lat: 43.8256, lon: 87.6168, provided: 22, help: 3 },
  { name: '喀什', lat: 39.4677, lon: 75.9894, provided: 15, help: 2 },

  // 港澳台
  { name: '香港', lat: 22.3193, lon: 114.1694, provided: 95, help: 18, isHK: true },
  { name: '澳门', lat: 22.1987, lon: 113.5439, provided: 35, help: 6, isMacau: true },
  { name: '台北', lat: 25.0330, lon: 121.5654, provided: 78, help: 15, isTaiwan: true },
  { name: '高雄', lat: 22.6273, lon: 120.2844, provided: 42, help: 6 },
  { name: '台中', lat: 24.1477, lon: 120.6736, provided: 38, help: 5 },

  // 南海岛礁
  { name: '永兴岛', lat: 16.8331, lon: 112.3333, provided: 3, help: 1, isIsland: true, isChinaIsland: true, offset: { x: 0.1, y: 0 } },
  { name: '南沙群岛', lat: 9.7497, lon: 115.1761, provided: 1, help: 0, isIsland: true, isChinaIsland: true, offset: { x: 0.1, y: 0 } },
  { name: '钓鱼岛', lat: 25.7469, lon: 124.4833, provided: 1, help: 0, isIsland: true, isChinaIsland: true, offset: { x: 0.1, y: 0 } },
  { name: '仁爱礁', lat: 9.7447, lon: 115.5397, provided: 1, help: 0, isIsland: true, isChinaIsland: true, offset: { x: 0.15, y: 0 } },
  { name: '美济礁', lat: 9.9089, lon: 115.5350, provided: 1, help: 0, isIsland: true, isChinaIsland: true, offset: { x: 0.1, y: 0.08 } },
  { name: '渚碧礁', lat: 10.9281, lon: 114.0569, provided: 1, help: 0, isIsland: true, isChinaIsland: true, offset: { x: 0.1, y: 0.15 } },

  // 藏南地区
  { name: '达旺', lat: 27.5, lon: 92.0, provided: 1, help: 0, isIsland: true, isChinaIsland: true },
  // 阿克赛钦地区
  { name: '班公湖', lat: 35.5, lon: 78.5, provided: 1, help: 0, isIsland: true, isChinaIsland: true }
];

const RADIUS = 5.02;
const CHINA_ROTATION_Y = -1.85;

function latLonToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

// 创建星空背景
function createStars() {
  const starGeo = new THREE.BufferGeometry();
  const starPos = [];
  const starColors = [];
  for (let i = 0; i < 7000; i++) {
    starPos.push(
      (Math.random() - 0.5) * 1400,
      (Math.random() - 0.5) * 900,
      (Math.random() - 0.5) * 1400
    );
    const c = 0.75 + Math.random() * 0.25;
    starColors.push(c, c, 1);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  starGeo.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.9,
    transparent: true,
    opacity: 0.85,
    vertexColors: true
  });
  const points = new THREE.Points(starGeo, mat);
  scene.add(points);
}

// 创建大气层光晕
function createAtmosphere() {
  const atmoShader = {
    vertex: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragment: `
      varying vec3 vNormal;
      void main() {
        float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
        gl_FragColor = vec4(0.25, 0.55, 1.0, 1.0) * intensity;
      }
    `
  };
  const atmoMat = new THREE.ShaderMaterial({
    vertexShader: atmoShader.vertex,
    fragmentShader: atmoShader.fragment,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true
  });
  atmosphere = new THREE.Mesh(new THREE.SphereGeometry(5.6, 64, 64), atmoMat);
  atmosphere.rotation.y = CHINA_ROTATION_Y;
  scene.add(atmosphere);
}

// 创建城市标记
function createCityMarkers() {
  markerGroup = new THREE.Group();
  markerGroup.rotation.y = CHINA_ROTATION_Y;

  cityData.forEach((city) => {
    const pos = latLonToVector3(city.lat, city.lon, RADIUS + 0.06);

    if (city.isBeijing) {
      // 北京：红色五角星
      const starShape = new THREE.Shape();
      const outerRadius = 0.12;
      const innerRadius = 0.05;
      for (let i = 0; i < 5; i++) {
        const outerAngle = (i * 72 - 90) * Math.PI / 180;
        const innerAngle = ((i * 72) + 36 - 90) * Math.PI / 180;
        if (i === 0) {
          starShape.moveTo(Math.cos(outerAngle) * outerRadius, Math.sin(outerAngle) * outerRadius);
        } else {
          starShape.lineTo(Math.cos(outerAngle) * outerRadius, Math.sin(outerAngle) * outerRadius);
        }
        starShape.lineTo(Math.cos(innerAngle) * innerRadius, Math.sin(innerAngle) * innerRadius);
      }
      starShape.closePath();

      const starGeo = new THREE.ShapeGeometry(starShape);
      const starMat = new THREE.MeshBasicMaterial({
        color: 0xff3333,
        side: THREE.DoubleSide
      });
      const star = new THREE.Mesh(starGeo, starMat);
      star.position.copy(pos);
      star.lookAt(0, 0, 0);
      star.userData.city = city;
      star.userData.isBeijing = true;
      markerGroup.add(star);
      beijingStar = star;

      // 北京光晕
      const glowGeo = new THREE.SphereGeometry(0.18, 16, 16);
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0xff3333,
        transparent: true,
        opacity: 0.3
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.copy(pos);
      glow.userData.city = city;
      glow.userData.isGlow = true;
      markerGroup.add(glow);

    } else if (city.isIsland) {
      // 南海岛礁：中国岛礁显示红旗
      if (city.isChinaIsland) {
        // 钓鱼岛等中国岛礁显示红旗+名字
        const flagPos = pos.clone();
        if (city.offset) {
          flagPos.x += city.offset.x;
          flagPos.y += city.offset.y;
        } else {
          flagPos.x += 0.08;
          flagPos.y += 0.02;
        }
        const flagDiv = document.createElement('div');
        flagDiv.className = 'island-flag';
        flagDiv.innerHTML = `<img src="/images/flag.webp" class="flag-img" />${city.name}`;
        const flagLabel = new CSS2DObject(flagDiv);
        flagLabel.position.copy(flagPos);
        flagLabel.userData.city = city;
        flagLabel.userData.isFlag = true;
        markerGroup.add(flagLabel);
        return;
      } else {
        // 其他岛礁显示小灰点
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.012, 6, 6),
          new THREE.MeshBasicMaterial({ color: 0x888899 })
        );
        dot.position.copy(pos);
        dot.userData.city = city;
        markerGroup.add(dot);
      }
    } else if (city.isTaiwan || city.isHK || city.isMacau) {
      // 港澳台：略大蓝点
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.022, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0x00aaff })
      );
      dot.position.copy(pos);
      dot.userData.city = city;
      dot.userData.isGlow = true;
      markerGroup.add(dot);

      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0x00aaff, transparent: true, opacity: 0.25 })
      );
      glow.position.copy(pos);
      glow.userData.city = city;
      glow.userData.isGlow = true;
      markerGroup.add(glow);

    } else {
      // 普通城市：小蓝点（像句号大小）
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.015, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x5ac8fa })
      );
      dot.position.copy(pos);
      dot.userData.city = city;
      markerGroup.add(dot);

      // 城市光晕
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.025, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x5ac8fa, transparent: true, opacity: 0.25 })
      );
      glow.position.copy(pos);
      glow.userData.city = city;
      glow.userData.isGlow = true;
      markerGroup.add(glow);
    }

    // 城市标签贴近圆点
    let labelPos = pos.clone();
    labelPos.x += city.offset ? city.offset.x : 0.02;
    labelPos.y += city.offset ? city.offset.y : 0.01;

    // 线条从城市点位延伸到标签位置（亮蓝色，2px）
    const lineGeo = new THREE.BufferGeometry().setFromPoints([pos, labelPos]);
    const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({
      color: 0x00aaff,
      transparent: true,
      opacity: 0.8,
      linewidth: 2
    }));
    line.userData.city = city;
    markerGroup.add(line);

    const div = document.createElement('div');
    div.className = 'city-label';
    div.textContent = city.name;
    div.onclick = (e) => {
      e.stopPropagation();
      showCityCard(city);
    };
    const label = new CSS2DObject(div);
    label.position.copy(labelPos);
    label.userData.city = city;
    label.userData.line = line;
    markerGroup.add(label);

    cityLabels.push(label);
  });

  // 防碰撞：只调整label，不动marker
  fixLabelCollision();

  scene.add(markerGroup);
}

// 标签防碰撞：找最近空位，不随机
function fixLabelCollision() {
  const THRESHOLD = 25; // 像素距离阈值
  const labels = cityLabels.filter(l => l.userData.city && !l.userData.isFlag && !l.userData.city.isBeijing && !l.userData.city.offset);

  function isTooClose(pos, others) {
    const sp = worldToScreen(pos);
    for (const other of others) {
      if (other === pos) continue;
      const so = worldToScreen(other);
      const dx = sp.x - so.x;
      const dy = sp.y - so.y;
      if (Math.sqrt(dx * dx + dy * dy) < THRESHOLD) return true;
    }
    return false;
  }

  // 8个方向：右、下、左、上、右下、左下、右上、左上
  const directions = [
    { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 },
    { x: 0.7, y: 0.7 }, { x: -0.7, y: 0.7 }, { x: 0.7, y: -0.7 }, { x: -0.7, y: -0.7 }
  ];

  for (const label of labels) {
    const city = label.userData.city;
    const markerPos = latLonToVector3(city.lat, city.lon, RADIUS + 0.06);
    const allPositions = [markerPos, ...labels.map(l => l.position)];

    // 从最近的地方开始找空位
    for (let dist = 5; dist < 50; dist += 5) {
      let found = false;

      for (const dir of directions) {
        const testPos = label.position.clone();
        testPos.x += dir.x * dist * 0.01;
        testPos.y += dir.y * dist * 0.01;

        if (!isTooClose(testPos, allPositions)) {
          // 找到空位了
          const line = markerGroup.children.find(c => c instanceof THREE.Line && c.userData.city && c.userData.city.name === city.name);
          if (line) {
            line.geometry.setFromPoints([markerPos, testPos.clone()]);
          }
          label.position.copy(testPos);
          found = true;
          break;
        }
      }

      if (found) break;
    }
  }
}

function worldToScreen(pos) {
  const vector = pos.clone().project(camera);
  return {
    x: (vector.x * 0.5 + 0.5) * window.innerWidth,
    y: (-(vector.y * 0.5) + 0.5) * window.innerHeight
  };
}

// 显示城市数据卡片
function showCityCard(city) {
  document.getElementById('cardCityName').textContent = city.name;
  document.getElementById('cardProvided').textContent = city.provided + ' 个';
  document.getElementById('cardHelp').textContent = city.help + ' 个';
  document.getElementById('cardActive').textContent = '+' + Math.floor(Math.random() * 30 + 5);
  cityCard.classList.remove('hidden');
}

// 关闭城市卡片
function closeCityCard() {
  cityCard.classList.add('hidden');
}

// 初始化
function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(0, 10, 40);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  document.getElementById('canvas-container').appendChild(renderer.domElement);

  // CSS2D渲染器
  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.domElement.style.position = 'fixed';
  labelRenderer.domElement.style.top = '0';
  labelRenderer.domElement.style.left = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';
  labelRenderer.domElement.style.zIndex = '8';
  document.body.appendChild(labelRenderer.domElement);

  const loader = new THREE.TextureLoader();

  // 地球
  const earthGeo = new THREE.SphereGeometry(5, 64, 64);
  const earthMat = new THREE.MeshPhongMaterial({
    map: loader.load('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg'),
    bumpMap: loader.load('https://unpkg.com/three-globe/example/img/earth-topology.png'),
    bumpScale: 0.22,
    specularMap: loader.load('https://unpkg.com/three-globe/example/img/earth-waterbodies.png'),
    specular: new THREE.Color(0x222222),
    shininess: 6,
    emissive: 0x0a1929,
    emissiveIntensity: 0.15
  });
  earth = new THREE.Mesh(earthGeo, earthMat);
  earth.rotation.y = CHINA_ROTATION_Y;
  scene.add(earth);

  // 大气层
  createAtmosphere();

  // 云层
  const cloudMat = new THREE.MeshPhongMaterial({
    map: loader.load('https://unpkg.com/three-globe/example/img/earth-clouds.png'),
    transparent: true,
    opacity: 0.38,
    blending: THREE.AdditiveBlending
  });
  clouds = new THREE.Mesh(new THREE.SphereGeometry(5.08, 64, 64), cloudMat);
  clouds.rotation.y = CHINA_ROTATION_Y;
  scene.add(clouds);

  // 光源
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(7, 4, 8);
  scene.add(sun);

  // 补光（让背光面也有微光）
  const fillLight = new THREE.DirectionalLight(0x4a90d9, 0.4);
  fillLight.position.set(-7, -2, -8);
  scene.add(fillLight);

  // 半球光（天空色+地面色）
  const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x1a3a5c, 0.6);
  scene.add(hemiLight);

  scene.add(new THREE.AmbientLight(0x1a2a4a, 0.8));

  // 星空
  createStars();

  // 城市标记
  createCityMarkers();

  // 轨道控制
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 8;
  controls.maxDistance = 20;
  controls.enablePan = false;
  controls.target.set(0, 0, 0);

  // 射线检测
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  // 鼠标移动不做tooltip显示，只有点击才显示卡片
  // window.addEventListener('pointermove', ...); // 已禁用

  // 城市点击
  window.addEventListener('click', (event) => {
    // 忽略功能卡片和搜索区域的点击
    if (event.target.closest('.cards-container') ||
        event.target.closest('.search-section') ||
        event.target.closest('.navbar') ||
        event.target.closest('.city-card') ||
        event.target.closest('.stats-panel')) {
      return;
    }

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const clickableObjects = [];
    scene.traverse((obj) => {
      if (obj.userData && obj.userData.city && !obj.userData.isGlow) {
        clickableObjects.push(obj);
      }
    });

    const intersects = raycaster.intersectObjects(clickableObjects, true);
    if (intersects.length > 0) {
      // 点击位置
      const clickPoint = intersects[0].point;

      // 找距离点击位置最近的marker
      let closestCity = intersects[0].object.userData.city;
      let closestDist = clickPoint.distanceTo(intersects[0].object.position);

      for (const obj of clickableObjects) {
        const dist = clickPoint.distanceTo(obj.position);
        if (dist < closestDist) {
          closestDist = dist;
          closestCity = obj.userData.city;
        }
      }

      showCityCard(closestCity);
    } else {
      closeCityCard();
    }
  });

  // 搜索功能
  searchBtn.addEventListener('click', () => {
    const keyword = searchInput.value.trim();
    if (!keyword) return;

    const target = cityData.find(c => c.name.includes(keyword));
    if (target) {
      showCityCard(target);
    }
  });

  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      searchBtn.click();
    }
  });

  // 聚焦中国动画
  focusChinaAnimation();
  loadingEl.style.display = 'none';
  animate();
}

// 显示tooltip
function showTooltip(city, x, y) {
  tooltip.innerHTML = `
    <div class="name">${city.name}</div>
    <div class="meta">人脉提供：${city.provided} 个<br>需要帮助：${city.help} 个</div>
  `;
  tooltip.style.left = `${x + 16}px`;
  tooltip.style.top = `${y + 16}px`;
  tooltip.classList.remove('hidden');
}

// 隐藏tooltip
function hideTooltip() {
  tooltip.classList.add('hidden');
}

// 聚焦中国飞入动画
function focusChinaAnimation() {
  // 目标：中国中部（东经105度，北纬35度）
  const chinaLon = 105;
  const lonDiff = (chinaLon - 116.4) * Math.PI / 180;
  targetRotation = CHINA_ROTATION_Y - lonDiff;

  // 初始锁定地球位置
  earth.rotation.y = targetRotation;
  clouds.rotation.y = targetRotation;
  atmosphere.rotation.y = targetRotation;
  if (markerGroup) markerGroup.rotation.y = targetRotation;

  // 相机从远处飞入对准地球
  const startPos = { x: 0, y: 3, z: 15 };
  const endPos = { x: 0, y: 0, z: 12 };
  camera.position.set(startPos.x, startPos.y, startPos.z);
  controls.target.set(0, 0, 0);
  const duration = 3000;
  const start = performance.now();

  // 动画期间不旋转地球
  animationComplete = false;

  // 初始就锁定地球位置
  earth.rotation.y = targetRotation;
  clouds.rotation.y = targetRotation;
  atmosphere.rotation.y = targetRotation;
  if (markerGroup) markerGroup.rotation.y = targetRotation;

  function step(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    camera.position.set(
      0 + (endPos.x - 0) * eased,
      10 + (endPos.y - 10) * eased,
      40 + (endPos.z - 40) * eased
    );
    controls.update();

    // 持续锁定地球位置
    earth.rotation.y = targetRotation;
    clouds.rotation.y = targetRotation;
    atmosphere.rotation.y = targetRotation;
    if (markerGroup) markerGroup.rotation.y = targetRotation;

    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      // 动画完成后解锁
      animationComplete = true;
    }
  }

  requestAnimationFrame(step);
}

// 动画循环
function animate() {
  requestAnimationFrame(animate);

  const time = Date.now() * 0.001;

  // 地球自转（动画完成后才开始，且初始位置正对中国）
  if (animationComplete) {
    earth.rotation.y += 0.00015;
    clouds.rotation.y += 0.00022;
    atmosphere.rotation.y += 0.00015;
    if (markerGroup) {
      markerGroup.rotation.y = earth.rotation.y;
    }
  } else {
    // 动画期间保持静止，正对中国
    earth.rotation.y = targetRotation;
    clouds.rotation.y = targetRotation;
    atmosphere.rotation.y = targetRotation;
    if (markerGroup) markerGroup.rotation.y = targetRotation;
  }

  // 城市标签跟随地球，不修改位置
  cityLabels.forEach((label) => {
    if (!label.userData.city) return;
    label.element.style.opacity = '1';
    label.element.style.pointerEvents = 'auto';
    if (label.userData.line) {
      label.userData.line.material.opacity = 0.8;
    }
  });

  // 北京星心跳动画：每1秒放大1.2倍再缩回，透明度1到0.8再到1
  if (beijingStar) {
    const heartbeat = (time % 1) * Math.PI * 2; // 0-2π每1秒
    const scale = 1 + Math.sin(heartbeat) * 0.2; // 1到1.2到1
    const opacity = 1 - Math.sin(heartbeat) * 0.2; // 1到0.8到1
    beijingStar.scale.set(scale, scale, 1);
    beijingStar.material.opacity = opacity;
  }

  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

// 窗口调整
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
});

// 导航
function navigateTo(page) {
  const pages = {
    groups: '/index.html?tab=groups',
    energy: '/index.html?tab=energy',
    helps: '/index.html?tab=helps',
    industry: '/index.html?tab=industry',
    publish: '/publish.html',
    demand: '/publish.html?type=demand',
    wish: '/publish.html?type=wish',
    search: '/index.html?search=1'
  };
  if (pages[page]) {
    window.location.href = pages[page];
  }
}

// 查看详情
function viewCityDetail() {
  const cityName = document.getElementById('cardCityName').textContent;
  window.location.href = `/index.html?city=${encodeURIComponent(cityName)}`;
}

// 添加单个城市标记（发布后调用）
function addCityMarker(city) {
  // 添加到城市数据
  cityData.push(city);

  const pos = latLonToVector3(city.lat, city.lon, RADIUS + 0.06);

  // 创建marker
  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(0.025, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x5ac8fa })
  );
  dot.position.copy(pos);
  dot.userData.city = city;
  markerGroup.add(dot);

  // 创建光晕
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x5ac8fa, transparent: true, opacity: 0.25 })
  );
  glow.position.copy(pos);
  glow.userData.city = city;
  glow.userData.isGlow = true;
  markerGroup.add(glow);

  // 标签位置（贴近圆点）
  let labelPos = pos.clone();
  labelPos.x += 0.02;
  labelPos.y += 0.01;

  // 创建连线
  const lineGeo = new THREE.BufferGeometry().setFromPoints([pos, labelPos.clone()]);
  const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({
    color: 0x00aaff,
    transparent: true,
    opacity: 0
  }));
  line.userData.city = city;
  markerGroup.add(line);

  // 创建标签
  const div = document.createElement('div');
  div.className = 'city-label';
  div.textContent = city.name;
  div.onclick = (e) => {
    e.stopPropagation();
    showCityCard(city);
  };
  const label = new CSS2DObject(div);
  label.position.copy(labelPos);
  label.userData.city = city;
  label.userData.line = line;
  markerGroup.add(label);

  cityLabels.push(label);

  // 触发碰撞检测
  fixLabelCollisionForOne(label);
}

// 对所有标签进行碰撞检测：迭代处理直到无碰撞
function fixLabelCollisionForOne(newLabel) {
  const THRESHOLD = 35; // 大像素阈值确保不重叠
  const PUSH_STEP = 0.25; // 大步长推开

  // 收集所有城市标签（不含国旗、固定偏移）
  function getAllCityLabels() {
    return cityLabels.filter(l =>
      l.userData.city &&
      !l.userData.isFlag &&
      !l.userData.city.isBeijing &&
      !l.userData.city.offset
    );
  }

  function distInScreen(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function updateLabel(label, newPos) {
    const c = label.userData.city;
    if (!c) return;
    const mp = latLonToVector3(c.lat, c.lon, RADIUS + 0.06);
    const ln = markerGroup.children.find(x => x instanceof THREE.Line && x.userData.city && x.userData.city.name === c.name);
    if (ln) {
      ln.geometry.setFromPoints([mp, newPos.clone()]);
      ln.material.opacity = 0.8;
    }
    label.position.copy(newPos);
  }

  // 多次迭代，确保所有碰撞都被解决
  for (let iter = 0; iter < 50; iter++) {
    const labels = getAllCityLabels();
    let hasCollision = false;

    for (const label of labels) {
      const city = label.userData.city;
      const markerPos = latLonToVector3(city.lat, city.lon, RADIUS + 0.06);
      const labelScreen = worldToScreen(label.position);

      // 检查是否压在任何marker上（排除自己的）
      for (const c of cityData) {
        if (c.isBeijing || c.offset || c.name === city.name) continue;
        const mp = latLonToVector3(c.lat, c.lon, RADIUS + 0.06);
        const mpScreen = worldToScreen(mp);
        if (distInScreen(labelScreen, mpScreen) < THRESHOLD) {
          const newPos = label.position.clone();
          newPos.x += PUSH_STEP;
          updateLabel(label, newPos);
          hasCollision = true;
          break;
        }
      }
      if (hasCollision) continue;

      // 检查是否压在其他标签上（排除自己）
      for (const other of labels) {
        if (other === label) continue;
        const otherScreen = worldToScreen(other.position);
        if (distInScreen(labelScreen, otherScreen) < THRESHOLD) {
          const newPos = label.position.clone();
          newPos.x += PUSH_STEP;
          updateLabel(label, newPos);
          hasCollision = true;
          break;
        }
      }
    }

    if (!hasCollision) break;
  }
}

// 初始化
init();
