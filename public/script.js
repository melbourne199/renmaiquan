import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

let cityData = []; // Will be loaded dynamically

// Load cityData dynamically (JSON import not supported in all browsers)
async function loadCityData() {
  try {
    const response = await fetch('./data/city-data.json?t=' + Date.now());
    cityData = await response.json();
    console.log('cityData loaded:', cityData.length);
  } catch (e) {
    console.error('Failed to load cityData:', e);
  }
}

let scene, camera, renderer, controls, earth, clouds, atmosphere, labelRenderer;
let cityMarkers = [];
let cityLabels = [];
let beijingStar = null;
let markerGroup;
let animationComplete = false;
let lastAnimateTime = 0;
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();

// ============================================================
// Intro 状态机：太空来客粒子动画
// ============================================================
let introState = 'idle'; // idle -> flyIn -> orbit -> explode -> text -> fadeout -> done
let introT = 0; // 时间累计
let introShooter = null, introShooterGlow = null, introTrail = null, introParticles = null;
let introGroup = null;
const INTRO_CONFIG = {
  flyInDur: 1.5, orbitDur: 2.8, orbitCount: 2, explodeDur: 0.6, textDur: 10000, fadeDur: 1.2,
  orbitR: 12, shootAngle: Math.PI * 0.7, trailLen: 22
};
const INTRO_TEXT = ['欢迎老弟，你来了', '阅历丰富的老江湖，看吧，变现吧'];

function startIntroEffect() {
  introGroup = new THREE.Group();
  scene.add(introGroup);
  introState = 'flyIn';
  introT = 0;

  introShooter = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xddaaff, transparent: true, opacity: 1 })
  );
  introShooterGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.36, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xaa55ff, transparent: true, opacity: 0.3 })
  );
  introGroup.add(introShooter, introShooterGlow);

  const tGeo = new THREE.BufferGeometry();
  const tPos = new Float32Array(INTRO_CONFIG.trailLen * 3);
  tGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3));
  introTrail = new THREE.Points(tGeo, new THREE.PointsMaterial({ color: 0xcc88ff, size: 0.08, transparent: true, opacity: 0.5 }));
  introGroup.add(introTrail);
}

function tickIntro(dt) {
  if (introState === 'idle' || introState === 'done') return;
  introT += dt;
  const cfg = INTRO_CONFIG;

  if (introState === 'flyIn') {
    const p = Math.min(introT / cfg.flyInDur, 1);
    const ease = 1 - Math.pow(1 - p, 2);
    const sa = cfg.shootAngle;
    const sv = new THREE.Vector3(cfg.orbitR * Math.cos(sa), 25, cfg.orbitR * Math.sin(sa));
    const ev = new THREE.Vector3(cfg.orbitR * Math.cos(sa), 0, cfg.orbitR * Math.sin(sa));
    const pos = sv.clone().lerp(ev, ease);
    introShooter.position.copy(pos);
    introShooterGlow.position.copy(pos);
    updateTrail(pos);
    if (p >= 1) { introState = 'orbit'; introT = 0; }
  }
  else if (introState === 'orbit') {
    const orbitTotal = cfg.orbitDur * cfg.orbitCount;
    const p = Math.min(introT / orbitTotal, 1);
    const speed = (Math.PI * 2) / cfg.orbitDur;
    const angle = cfg.shootAngle + speed * introT;
    const px = cfg.orbitR * Math.cos(angle);
    const py = Math.sin(angle) * 2.5;
    const pz = cfg.orbitR * Math.sin(angle);
    introShooter.position.set(px, py, pz);
    introShooterGlow.position.set(px, py, pz);
    updateTrail(new THREE.Vector3(px, py, pz));
    if (p >= 1) {
      introState = 'explode';
      introT = 0;
      introShooter.visible = false;
      introShooterGlow.visible = false;
      introTrail.visible = false;
      buildIntroParticles();
    }
  }
  else if (introState === 'explode') {
    const p = Math.min(introT / cfg.explodeDur, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    const arr = introParticles.geometry.attributes.position.array;
    for (let i = 0; i < arr.length / 3; i++) {
      const i3 = i * 3;
      arr[i3] += (introTargets[i3] - arr[i3]) * ease * 0.1;
      arr[i3 + 1] += (introTargets[i3 + 1] - arr[i3 + 1]) * ease * 0.1;
      arr[i3 + 2] += (introTargets[i3 + 2] - arr[i3 + 2]) * ease * 0.1;
    }
    introParticles.geometry.attributes.position.needsUpdate = true;
    introParticles.material.opacity = p;
    if (p >= 1) {
      introState = 'text';
      introT = 0;
      introParticles.material.opacity = 1;
    }
  }
  else if (introState === 'text') {
    if (introT >= cfg.textDur / 1000) {
      introState = 'fadeout';
      introT = 0;
    }
  }
  else if (introState === 'fadeout') {
    const p = Math.min(introT / cfg.fadeDur, 1);
    introParticles.material.opacity = 1 - p;
    introGroup.traverse(c => {
      if (c.material && c.material.transparent && c !== introParticles) {
        c.material.opacity = Math.max(0, (c.material.opacity || 1) - p * 2);
      }
    });
    if (p >= 1) {
      introState = 'done';
      scene.remove(introGroup);
      introGroup.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); });
      introGroup = null;
      if (controls) controls.enabled = true;
    }
  }
}

let introTrailHist = [];
function updateTrail(pos) {
  introTrailHist.unshift(pos.clone());
  if (introTrailHist.length > INTRO_CONFIG.trailLen) introTrailHist.pop();
  const arr = introTrail.geometry.attributes.position.array;
  for (let i = 0; i < introTrailHist.length; i++) {
    arr[i * 3] = introTrailHist[i].x; arr[i * 3 + 1] = introTrailHist[i].y; arr[i * 3 + 2] = introTrailHist[i].z;
  }
  introTrail.geometry.attributes.position.needsUpdate = true;
}

let introTargets = null;
function buildIntroParticles() {
  // 用文字点阵生成目标坐标
  const particles = [];
  const fontSize = 0.42;
  const spacing = fontSize * 0.65 * 1.15;
  const rows = 5, cols = 4;

  INTRO_TEXT.forEach((line, li) => {
    const yOff = li === 0 ? 0.55 : -0.55;
    const lineW = (line.length - 1) * spacing;
    for (let ci = 0; ci < line.length; ci++) {
      const cx = ci * spacing - lineW / 2;
      const pW = spacing * 0.5 / cols, pH = fontSize * 0.7 / rows;
      for (let r = 0; r < rows; r++) {
        for (let col = 0; col < cols; col++) {
          particles.push(
            cx + (col - cols / 2 + 0.5) * pW,
            yOff + (rows / 2 - r - 0.5) * pH,
            0
          );
        }
      }
    }
  });

  const N = 500;
  introTargets = new Float32Array(N * 3);
  const pGeo = new THREE.BufferGeometry();
  const pCur = new Float32Array(N * 3);
  const lastP = introShooter.position.clone();
  for (let i = 0; i < N; i++) {
    const i3 = i * 3;
    pCur[i3] = lastP.x; pCur[i3 + 1] = lastP.y; pCur[i3 + 2] = lastP.z;
    if (i * 3 < particles.length) {
      introTargets[i3] = particles[i * 3];
      introTargets[i3 + 1] = particles[i * 3 + 1];
      introTargets[i3 + 2] = particles[i * 3 + 2];
    } else {
      introTargets[i3] = (Math.random() - 0.5) * 5;
      introTargets[i3 + 1] = (Math.random() - 0.5) * 2;
      introTargets[i3 + 2] = (Math.random() - 0.5) * 3;
    }
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pCur, 3));
  introParticles = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xffd700, size: 0.13, transparent: true, opacity: 0 }));
  introGroup.add(introParticles);
}
let initStarted = false;
let targetRotation = 2.28; // 地球目标旋转角度，默认中国

const tooltip = document.getElementById('cityTooltip');
const cityCard = document.getElementById('cityCard');
const searchInput = document.getElementById('citySearch');
const searchBtn = document.getElementById('searchBtn');


// 城市数据 - 全国省会及主要城市

const RADIUS = 5.02;
const CHINA_ROTATION_Y = 2.28; // 从太平洋中心继续向中国推进

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
      return;

    } else if (city.isIsland) {
      // 只显示中国固有领土（含争议）：其他国家的岛直接跳过不渲染
      if (city.controlledBy && city.controlledBy !== 'cn') return;

      // 扇形展开：南海簇内岛屿数量多，半径加大避免挤压
      const clusterCenterLat = 10.5, clusterCenterLon = 114.0;
      const dLon = city.lon - clusterCenterLon;
      const dLat = city.lat - clusterCenterLat;
      const angle = Math.atan2(dLon, dLat);
      // 南海簇岛屿多，半径需足够小让标签靠近坐标点
      const isSouthChinaSea = Math.abs(dLat) < 15 && Math.abs(dLon) < 15;
      const spreadR = isSouthChinaSea ? 0.05 : 0.08;

      const flagPos = pos.clone();
      const normal = flagPos.clone().normalize();
      const tangentX = new THREE.Vector3(0, 1, 0).cross(normal).normalize();
      const tangentZ = normal.clone().cross(tangentX);
      flagPos.addScaledVector(tangentX, Math.cos(angle) * spreadR);
      flagPos.addScaledVector(tangentZ, Math.sin(angle) * spreadR);

      const flagLineGeo = new THREE.BufferGeometry().setFromPoints([pos.clone(), flagPos.clone()]);
      const flagLine = new THREE.Line(flagLineGeo, new THREE.LineBasicMaterial({ color: 0xff6b6b, transparent: true, opacity: 0.9 }));
      flagLine.userData.city = city;
      markerGroup.add(flagLine);

      const flagDiv = document.createElement('div');
      flagDiv.className = 'island-flag';
      flagDiv.innerHTML = `<span class="flag-mark">🇨🇳</span>${city.name}`;
      const flagLabel = new CSS2DObject(flagDiv);
      flagLabel.position.copy(flagPos);
      flagLabel.userData.city = city;
      flagLabel.userData.isFlag = true;
      flagLabel.userData.line = flagLine;
      markerGroup.add(flagLabel);
      cityLabels.push(flagLabel);
      return;
    } else if (city.isTaiwan || city.isHK || city.isMacau) {
      // 港澳台：略大蓝点+标签
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.022, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0x00aaff })
      );
      dot.position.copy(pos);
      dot.userData.city = city;
      dot.userData.isGlow = true;
      markerGroup.add(dot);

      // 发光点缩小到合理比例
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.018, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0x00aaff, transparent: true, opacity: 0.2 })
      );
      glow.position.copy(pos);
      glow.userData.city = city;
      glow.userData.isGlow = true;
      markerGroup.add(glow);

      // 港澳台标签 - 根据labelDir设置合适的偏移量
      let labelPos = pos.clone();
      const hkmDir = {
        'bottom-right': { x: 0.012, y: -0.008 },
        'bottom-left':  { x: -0.012, y: -0.008 },
        'top-right':    { x: 0.012, y: 0.008 },
        'top-left':     { x: -0.012, y: 0.008 },
        'right':        { x: 0.015, y: 0 },
        'left':         { x: -0.015, y: 0 },
      };
      const dirOffset = city.labelDir && hkmDir[city.labelDir] ? hkmDir[city.labelDir] : { x: 0.012, y: -0.006 };
      labelPos.x += dirOffset.x;
      labelPos.y += dirOffset.y;
      const twLineGeo = new THREE.BufferGeometry().setFromPoints([pos, labelPos.clone()]);
      const twLine = new THREE.Line(twLineGeo, new THREE.LineBasicMaterial({ color: 0x00aaff, transparent: true, opacity: 0.8 }));
      twLine.userData.city = city;
      markerGroup.add(twLine);

      const twDiv = document.createElement('div');
      twDiv.className = 'city-label';
      twDiv.textContent = city.name;
      twDiv.onclick = (e) => { e.stopPropagation(); showCityCard(city); };
      const twLabel = new CSS2DObject(twDiv);
      twLabel.position.copy(labelPos);
      twLabel.userData.city = city;
      twLabel.userData.line = twLine;
      markerGroup.add(twLabel);
      cityLabels.push(twLabel);

    } else if (!city.isIsland) {
      // 普通城市：小蓝点（像句号大小）
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.015, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x5ac8fa })
      );
      dot.position.copy(pos);
      dot.userData.city = city;
      markerGroup.add(dot);

      // 城市光晕：缩小基准尺寸，避免放大时压字
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.014, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x5ac8fa, transparent: true, opacity: 0.2 })
      );
      glow.position.copy(pos);
      glow.userData.city = city;
      glow.userData.isGlow = true;
      markerGroup.add(glow);

      // 城市标签贴近圆点，根据labelDir预设方向
      let labelPos = pos.clone();
      if (city.labelDir) {
        const dirOffsets = {
          'top':          { x: 0, y: 0.008 },
          'bottom':       { x: 0, y: -0.008 },
          'left':         { x: -0.012, y: 0.001 },
          'right':        { x: 0.012, y: 0.001 },
          'top-left':     { x: -0.008, y: 0.006 },
          'top-right':    { x: 0.008, y: 0.006 },
          'bottom-left':  { x: -0.008, y: -0.006 },
          'bottom-right': { x: 0.008, y: -0.006 }
        };
        const off = dirOffsets[city.labelDir] || { x: 0.002, y: 0.001 };
        labelPos.x += off.x;
        labelPos.y += off.y;
      } else {
        labelPos.x += city.offset ? city.offset.x : 0.002;
        labelPos.y += city.offset ? city.offset.y : 0.001;
      }

      // 线条从城市点位延伸到标签位置
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
    }
  });

  // 防碰撞：只调整label，不动marker
  fixLabelCollision();

  scene.add(markerGroup);
}

// 标签防碰撞：就近环绕原则，以圆点为圆心搜索8个方向空位
function fixLabelCollision() {
  const cameraDistance = camera.position.length();
  const isOverview = cameraDistance > 26;

  // 估算文字尺寸（中文约14px宽，18px高，加上边距）
  const LABEL_WIDTH = 76;  // 标签宽度（5个汉字约76px，含内边距）
  const LABEL_HEIGHT = 28; // 标签高度（含半透明背景padding）
  const LABEL_MARGIN = 16; // 标签间距（加大避免视觉拥挤）
  const MARKER_TO_LABEL = 22; // 圆点到标签的最小距离

  // 8个方向（以圆点为圆心环绕）
  const DIRECTIONS = [
    { x: 1, y: 0 },   // 右
    { x: -1, y: 0 },  // 左
    { x: 0, y: 1 },   // 上
    { x: 0, y: -1 },  // 下
    { x: 1, y: 1 },   // 右上
    { x: 1, y: -1 },  // 右下
    { x: -1, y: 1 },  // 左上
    { x: -1, y: -1 }, // 左下
  ];

  // 根据城市地理位置调整优先级方向
  function getOrderedDirections(city) {
    const lon = city.lon;
    const lat = city.lat;

    // 如果城市指定了标签方向（大湾区等密集区域），优先使用
    if (city.labelDir) {
      const dirMap = {
        'top':          { x: 0, y: 1 },
        'bottom':       { x: 0, y: -1 },
        'left':         { x: -1, y: 0 },
        'right':        { x: 1, y: 0 },
        'top-left':     { x: -1, y: 1 },
        'top-right':    { x: 1, y: 1 },
        'bottom-left':  { x: -1, y: -1 },
        'bottom-right': { x: 1, y: -1 }
      };
      const preferred = dirMap[city.labelDir];
      if (preferred) {
        // 将指定方向排在最前面
        const sorted = [...DIRECTIONS].sort((a, b) => {
          const aMatch = (a.x === preferred.x && a.y === preferred.y) ? 100 : 0;
          const bMatch = (b.x === preferred.x && b.y === preferred.y) ? 100 : 0;
          // 次优先：与指定方向同侧的方向
          const aSide = a.x * preferred.x + a.y * preferred.y;
          const bSide = b.x * preferred.x + b.y * preferred.y;
          return (bMatch + bSide) - (aMatch + aSide);
        });
        return sorted;
      }
    }
    // 东边城市优先往右，西边优先往左
    // 北边城市优先往上，南边优先往下
    const sorted = [...DIRECTIONS].sort((a, b) => {
      // 计算方位偏好
      const aScore = a.x * (lon >= 113 ? 1 : -1) + a.y * (lat >= 30 ? 1 : -1);
      const bScore = b.x * (lon >= 113 ? 1 : -1) + b.y * (lat >= 30 ? 1 : -1);
      return bScore - aScore; // 得分高的排前面
    });
    return sorted;
  }

  // 获取需要处理的标签
  const labels = cityLabels.filter(l => {
    const city = l.userData.city;
    if (!city || city.isBeijing || city.offset) return false;
    if (isOverview && city.isIsland) return false;
    if (isOverview && !city.isIsland && city.provided < 40 && city.help < 6 && !city.isTaiwan && !city.isHK && !city.isMacau) return false;
    return true;
  });

  // 预计算所有标签和marker的屏幕位置
  const labelScreenInfos = labels.map(l => ({
    label: l,
    city: l.userData.city,
    screenPos: worldToScreen(l.position)
  }));

  const markerScreenInfos = cityData
    .filter(c => !c.isBeijing && !c.offset)
    .map(c => ({
      city: c,
      screenPos: worldToScreen(latLonToVector3(c.lat, c.lon, RADIUS + 0.06))
    }));

  // 检测碰撞（考虑标签尺寸，用矩形碰撞）
  function checkCollision(testSp, excludeLabel, excludeCityName) {
    // 与其他标签碰撞（使用矩形检测）
    for (const info of labelScreenInfos) {
      if (info.label === excludeLabel) continue;
      const lp = info.screenPos;
      // 水平距离和垂直距离
      const hDist = Math.abs(testSp.x - lp.x);
      const vDist = Math.abs(testSp.y - lp.y);
      // 水平方向重叠 + 垂直方向重叠
      if (hDist < LABEL_WIDTH + LABEL_MARGIN && vDist < LABEL_HEIGHT + LABEL_MARGIN) {
        return true;
      }
    }

    // 与marker碰撞（圆形检测）
    for (const info of markerScreenInfos) {
      if (info.city.name === excludeCityName) continue;
      const mp = info.screenPos;
      const dx = testSp.x - mp.x;
      const dy = testSp.y - mp.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MARKER_TO_LABEL) {
        return true;
      }
    }

    return false;
  }

  // 搜索8个方向的最佳空位
  function findBestPosition(markerSp, markerWorldPos, label, city) {
    const orderedDirs = getOrderedDirections(city);
    let bestPos = null;
    let bestDist = Infinity;
    let usedLine = false;

    // 搜索距离圆点由近及远的位置
    for (let ring = 1; ring <= 12; ring++) {
      const baseDist = ring * 0.005; // 搜索半径步进（加大步长）
      let foundInRing = false;

      for (const dir of orderedDirs) {
        const testPos = markerWorldPos.clone();
        // 添加一点随机偏移，让同方向的城市标签不完全重叠
        const jitter = ring > 1 ? (Math.random() - 0.5) * 0.001 : 0;
        testPos.x += dir.x * baseDist + jitter;
        testPos.y += dir.y * baseDist;

        const testSp = worldToScreen(testPos);

        // 到圆点的距离
        const dx = testSp.x - markerSp.x;
        const dy = testSp.y - markerSp.y;
        const distToMarker = Math.sqrt(dx * dx + dy * dy);

        // 必须离圆点有最小距离
        if (distToMarker < MARKER_TO_LABEL) continue;

        // 检查碰撞
        if (!checkCollision(testSp, label, city.name)) {
          if (distToMarker < bestDist) {
            bestDist = distToMarker;
            bestPos = testPos;
            usedLine = ring > 1;
          }
          foundInRing = true;
        }
      }

      // 这一圈找到了更近的位置就停止
      if (foundInRing && ring === 1) break;
      // 找到了就不继续往外找
      if (bestPos) break;
    }

    return { pos: bestPos, usedLine };
  }

  // 处理每个标签
  for (const info of labelScreenInfos) {
    const label = info.label;
    const city = info.city;
    const markerWorldPos = latLonToVector3(city.lat, city.lon, RADIUS + 0.06);
    const markerSp = worldToScreen(markerWorldPos);

    // 找到最佳的标签位置
    const result = findBestPosition(markerSp, markerWorldPos, label, city);

    let finalPos = result.pos || markerWorldPos.clone();
    // 如果找不到合适位置，往经度方向偏移
    if (!result.pos) {
      const dir = city.lon >= 113 ? 1 : -1;
      finalPos.x += dir * 0.03;
      finalPos.y += 0.01;
    }

    // 更新标签位置
    label.position.copy(finalPos);

    // 更新连接线
    const line = markerGroup.children.find(
      c => c instanceof THREE.Line && c.userData.city && c.userData.city.name === city.name
    );

    if (line) {
      const isVisible = label.element.style.opacity !== '0';
      const lineLength = Math.sqrt(
        Math.pow(finalPos.x - markerWorldPos.x, 2) +
        Math.pow(finalPos.y - markerWorldPos.y, 2)
      );

      // 只有被推开了一定距离才显示线，且线不能太长
      if (isVisible && result.usedLine && lineLength < 0.08) {
        line.geometry.setFromPoints([markerWorldPos, finalPos.clone()]);
        line.material.opacity = 0.7;
      } else {
        line.material.opacity = 0;
      }
    }
  }
}

function worldToScreen(pos) {
  const vector = pos.clone().project(camera);
  return {
    x: (vector.x * 0.5 + 0.5) * window.innerWidth,
    y: (-(vector.y * 0.5) + 0.5) * window.innerHeight,
    z: vector.z
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

  const isMobile = window.innerWidth <= 768;
  camera = new THREE.PerspectiveCamera(isMobile ? 12 : 22, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(0, isMobile ? 7.2 : 6.2, isMobile ? 216 : 126);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  document.getElementById('canvas-container').appendChild(renderer.domElement);
  renderer.domElement.style.pointerEvents = 'none';

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
    map: loader.load('textures/earth-blue-marble.jpg'),
    bumpMap: loader.load('textures/earth-topology.png'),
    bumpScale: 0.22,
    specular: new THREE.Color(0x111111),
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
    map: loader.load('textures/earth-clouds.jpg'),
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

  // 轨道控制 - 绑定到 #earth-interaction（覆盖全屏）
  controls = new OrbitControls(camera, document.getElementById('earth-interaction'));
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = window.innerWidth <= 768 ? 18 : 10;
  controls.maxDistance = window.innerWidth <= 768 ? 84 : 56;
  controls.enablePan = false;
  controls.enableZoom = true;
  controls.enableRotate = true;
  controls.target.set(0, 0, 0);

  // UI层阻止地球交互
  const uiOverlay = document.querySelector('.ui-overlay');
  const uiLayer = uiOverlay ? uiOverlay.querySelectorAll('a, button, .nav-item, .publish-btn, .search-section, .cards-container, .city-card, .stats-panel') : [];

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
  startIntroEffect();
  focusChinaAnimation();
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  fixLabelCollision();

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
  targetRotation = CHINA_ROTATION_Y;

  earth.rotation.y = targetRotation;
  clouds.rotation.y = targetRotation;
  atmosphere.rotation.y = targetRotation;
  if (markerGroup) markerGroup.rotation.y = targetRotation;

  const startPos = { x: 0, y: 10, z: 40 };
  const endPos = { x: 0, y: 2, z: 18 };
  camera.position.set(startPos.x, startPos.y, startPos.z);
  controls.target.set(0.15, 0.12, 0);
  const duration = 3000;
  const start = performance.now();

  animationComplete = false;

  function step(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    camera.position.set(
      startPos.x + (endPos.x - startPos.x) * eased,
      startPos.y + (endPos.y - startPos.y) * eased,
      startPos.z + (endPos.z - startPos.z) * eased
    );
    controls.target.set(0.15, 0.12, 0);
    earth.rotation.y = targetRotation;
    clouds.rotation.y = targetRotation;
    atmosphere.rotation.y = targetRotation;
    if (markerGroup) markerGroup.rotation.y = targetRotation;
    controls.update();

    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      animationComplete = true;
      // 动画结束，恢复 controls target 到球心，确保旋转/缩放以球心为轴心
      controls.target.set(0, 0, 0);
      controls.update();
    }
  }

  requestAnimationFrame(step);
}

// 动画循环
function animate() {
  requestAnimationFrame(animate);

  controls.update(); // ensure camera matrix is fresh for worldToScreen
  const time = Date.now() * 0.001;
  const dt = Math.min(time - lastAnimateTime, 0.05);
  lastAnimateTime = time;

  // Intro 粒子动画 tick
  if (introState !== 'idle' && introState !== 'done') tickIntro(dt);

  // 地球自转（动画完成后才开始，且初始位置正对中国）
  if (animationComplete) {
    earth.rotation.y = targetRotation;
    clouds.rotation.y = targetRotation;
    atmosphere.rotation.y = targetRotation;
  } else {
    // 动画期间保持静止，正对中国
    earth.rotation.y = targetRotation;
    clouds.rotation.y = targetRotation;
    atmosphere.rotation.y = targetRotation;
  }
  // 始终让 markerGroup 跟随 earth.rotation.y
  if (markerGroup) markerGroup.rotation.y = earth.rotation.y;

  // 城市标签跟随地球，不修改位置
  const isMobileView = window.innerWidth <= 768;
  const cameraDistance = camera.position.length();
  const isOverview = cameraDistance > (isMobileView ? 24 : 18);
  cityLabels.forEach((label) => {
    if (!label.userData.city) return;
    const city = label.userData.city;
    const projected = worldToScreen(label.position);
    const isFront = projected.z < 1;
    let visible = isFront;

    if (isOverview) {
      if (city.isIsland) {
        visible = isFront; // 所有中国岛礁一级显示，一直可见
      } else {
        visible = isFront && (city.isBeijing || city.isTaiwan || city.isHK || city.isMacau || city.provided >= 60 || city.help >= 10);
      }
    } else if (isMobileView) {
      const isPriority = city.isBeijing || city.isIsland || city.isHK || city.isMacau || city.isTaiwan || city.provided >= 80 || city.help >= 12;
      visible = isFront && isPriority;
    }

    label.element.style.opacity = visible ? '1' : '0';
    label.element.style.pointerEvents = visible ? 'auto' : 'none';
    if (label.userData.line) {
      label.userData.line.material.opacity = visible ? label.userData.line.material.opacity : 0;
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

  // 标签位置（默认不压点，先明显离开圆点）
  let labelPos = pos.clone();
  labelPos.x += 0.028;
  labelPos.y += 0.012;

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

// 对所有标签进行碰撞检测：优先贴近圆点，找最近空位
function fixLabelCollisionForOne(label) {
  const THRESHOLD = 28;
  const LABEL_MIN_DIST = 55;

  function getAllCityLabels() {
    return cityLabels.filter(l =>
      l.userData.city && !l.userData.city.isBeijing && !l.userData.city.offset && !l.userData.city.isIsland
    );
  }

  function getMarkerScreenPos(excludeName) {
    return cityData
      .filter(c => !c.isBeijing && !c.offset && c.name !== excludeName)
      .map(c => worldToScreen(latLonToVector3(c.lat, c.lon, RADIUS + 0.06)));
  }

  function hasCollision(pos, excludeLabel, excludeName) {
    const sp = worldToScreen(pos);
    for (const lbl of getAllCityLabels()) {
      if (lbl === excludeLabel) continue;
      const lp = worldToScreen(lbl.position);
      const dx = sp.x - lp.x, dy = sp.y - lp.y;
      if (Math.sqrt(dx*dx + dy*dy) < THRESHOLD) return true;
    }
    const markerPos = getMarkerScreenPos(excludeName);
    for (const mp of markerPos) {
      const dx = sp.x - mp.x, dy = sp.y - mp.y;
      if (Math.sqrt(dx*dx + dy*dy) < THRESHOLD * 0.8) return true;
    }
    return false;
  }

  const directions = [
    { x: 1, y: 0 }, { x: 1, y: 0.6 }, { x: 1, y: -0.6 }, { x: 0.6, y: 1 },
    { x: 0, y: 1 }, { x: -0.6, y: 1 }, { x: -1, y: 0 }, { x: -1, y: 0.6 },
    { x: -1, y: -0.6 }, { x: 0, y: -1 }, { x: 0.6, y: -1 }
  ];

  const city = label.userData.city;
  if (!city) return;
  const markerPos = latLonToVector3(city.lat, city.lon, RADIUS + 0.06);
  const markerSp = worldToScreen(markerPos);
  const line = markerGroup.children.find(c => c instanceof THREE.Line && c.userData.city && c.userData.city.name === city.name);

  let finalPos = null;
  let usedLine = false;

  for (let step = 0; step < 20; step++) {
    const dist = 0.005 + step * 0.005;
    for (const dir of directions) {
      const testPos = markerPos.clone();
      testPos.x += dir.x * dist;
      testPos.y += dir.y * dist;
      const testSp = worldToScreen(testPos);

      const dx = testSp.x - markerSp.x, dy = testSp.y - markerSp.y;
      if (Math.sqrt(dx*dx + dy*dy) < LABEL_MIN_DIST) continue;

      if (!hasCollision(testPos, label, city.name)) {
        finalPos = testPos;
        usedLine = step > 0;
        break;
      }
    }
    if (finalPos) break;
  }

  // 找不到空位：搜索与所有marker保持最大距离的位置
  if (!finalPos) {
    let bestPos = null;
    let bestMinDist = 0;
    const allLabels = getAllCityLabels();
    const allMarkers = getMarkerScreenPos(city.name);
    for (let step = 0; step < 30; step++) {
      const dist = 0.005 + step * 0.005;
      for (const dir of directions) {
        const testPos = markerPos.clone();
        testPos.x += dir.x * dist;
        testPos.y += dir.y * dist;
        const testSp = worldToScreen(testPos);

        const dx = testSp.x - markerSp.x, dy = testSp.y - markerSp.y;
        if (Math.sqrt(dx*dx + dy*dy) < LABEL_MIN_DIST) continue;

        let minDistToOthers = Infinity;
        for (const lbl of allLabels) {
          if (lbl === label) continue;
          const lp = worldToScreen(lbl.position);
          const dlx = testSp.x - lp.x, dly = testSp.y - lp.y;
          minDistToOthers = Math.min(minDistToOthers, Math.sqrt(dlx*dlx + dly*dly));
        }
        for (const mp of allMarkers) {
          const dmx = testSp.x - mp.x, dmy = testSp.y - mp.y;
          minDistToOthers = Math.min(minDistToOthers, Math.sqrt(dmx*dmx + dmy*dmy));
        }

        if (minDistToOthers > bestMinDist) {
          bestMinDist = minDistToOthers;
          bestPos = testPos;
        }
      }
    }
    finalPos = bestPos || markerPos.clone();
    finalPos.x += 0.02;
    finalPos.y += 0.01;
    usedLine = true;
  }

  label.position.copy(finalPos);
  if (line) {
    if (usedLine) {
      line.geometry.setFromPoints([markerPos, finalPos.clone()]);
      line.material.opacity = 0.8;
    } else {
      line.material.opacity = 0;
    }
  }
}

// ========== 三级地址库 ==========
const addressDB = {};
// 【调试】← → 微调（动画完成后可用）
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') {
    earth.rotation.y -= 0.1;
    clouds.rotation.y -= 0.1;
    atmosphere.rotation.y -= 0.1;
  } else if (e.key === 'ArrowRight') {
    earth.rotation.y += 0.1;
    clouds.rotation.y += 0.1;
    atmosphere.rotation.y += 0.1;
  }
});

// 全局错误处理
window.addEventListener('error', (e) => {
  window.__jsErr = e.message + ' at ' + e.filename + ':' + e.lineno;
});

window.__scriptLoaded = true;

// 加载数据后启动地球
loadCityData().then(() => {
  window.__initStart = true;
  try {
    init();
    window.__initOK = true;
  } catch(e) {
    window.__initErr = e.message;
  }
  
  // 修复：确保所有HTML内联onclick事件正确绑定
  document.getElementById('menuBtn').addEventListener('click', toggleMenu);
  document.querySelectorAll('.menu-nav a').forEach(a => a.addEventListener('click', toggleMenu));
}).catch(e => {
  window.__loadErr = e.message;
});
