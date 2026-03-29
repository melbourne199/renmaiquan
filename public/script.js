import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

let cityData = []; // Will be loaded dynamically

// Load cityData dynamically (JSON import not supported in all browsers)
async function loadCityData() {
  try {
    const response = await fetch('./data/city-data.json');
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
const addressDB = {
  "110000": { name: "北京市", cities: { "110100": { name: "市辖区", districts: { "110101": "东城区", "110102": "西城区", "110105": "朝阳区", "110106": "丰台区", "110107": "石景山区", "110108": "海淀区", "110109": "门头沟区", "110111": "房山区", "110112": "通州区", "110113": "顺义区", "110114": "昌平区", "110115": "大兴区", "110116": "怀柔区", "110117": "平谷区", "110118": "密云区", "110119": "延庆区" } } } },
  "120000": { name: "天津市", cities: { "120100": { name: "市辖区", districts: { "120101": "和平区", "120102": "河东区", "120103": "河西区", "120104": "南开区", "120105": "河北区", "120106": "红桥区", "120110": "东丽区", "120111": "西青区", "120112": "津南区", "120113": "北辰区", "120114": "武清区", "120115": "宝坻区", "120116": "滨海新区", "120117": "宁河区", "120118": "静海区", "120119": "蓟州区" } } } },
  "130000": { name: "河北省", cities: { "130100": { name: "石家庄市", districts: { "130102": "长安区", "130104": "桥西区", "130105": "新华区", "130107": "井陉矿区", "130108": "裕华区", "130109": "藁城区", "130110": "鹿泉区", "130111": "栾城区", "130121": "井陉县", "130123": "正定县", "130125": "行唐县", "130126": "灵寿县", "130127": "高邑县", "130128": "深泽县", "130129": "赞皇县", "130130": "无极县", "130131": "平山县", "130132": "元氏县", "130133": "赵县", "130181": "辛集市", "130183": "晋州市", "130184": "新乐市" } }, "130200": { name: "唐山市", districts: { "130202": "路南区", "130203": "路北区", "130204": "古冶区", "130205": "开平区", "130207": "丰南区", "130208": "丰润区", "130209": "曹妃甸区", "130224": "滦南县", "130225": "乐亭县", "130227": "迁西县", "130229": "玉田县", "130281": "遵化市", "130283": "迁安市", "130284": "滦州市" } }, "130300": { name: "秦皇岛市", districts: { "130302": "海港区", "130303": "山海关区", "130304": "北戴河区", "130306": "抚宁区", "130321": "青龙满族自治县", "130322": "昌黎县", "130324": "卢龙县" } }, "130400": { name: "邯郸市", districts: { "130402": "邯山区", "130403": "丛台区", "130404": "复兴区", "130406": "峰峰矿区", "130407": "肥乡区", "130408": "永年区", "130423": "临漳县", "130424": "成安县", "130425": "大名县", "130426": "涉县", "130427": "磁县", "130430": "邱县", "130431": "鸡泽县", "130432": "广平县", "130433": "馆陶县", "130434": "魏县", "130435": "曲周县", "130481": "武安市" } }, "130500": { name: "邢台市", districts: { "130502": "襄都区", "130503": "信都区", "130504": "任泽区", "130505": "南和区", "130522": "临城县", "130523": "内丘县", "130524": "柏乡县", "130525": "隆尧县", "130526": "宁晋县", "130527": "巨鹿县", "130528": "新河县", "130529": "广宗县", "130530": "平乡县", "130531": "威县", "130532": "清河县", "130533": "临西县", "130581": "南宫市", "130582": "沙河市" } }, "130600": { name: "保定市", districts: { "130602": "竞秀区", "130605": "莲池区", "130606": "满城区", "130607": "清苑区", "130608": "徐水区", "130609": "涞水县", "130610": "阜平县", "130611": "定兴县", "130612": "唐县", "130613": "高阳县", "130614": "容城县", "130615": "涞源县", "130616": "望都县", "130617": "安新县", "130618": "易县", "130619": "曲阳县", "130620": "蠡县", "130621": "顺平县", "130622": "博野县", "130623": "雄县", "130681": "涿州市", "130682": "定州市", "130683": "安国市", "130684": "高碑店市" } }, "130700": { name: "张家口市", districts: { "130702": "桥东区", "130703": "桥西区", "130705": "宣化区", "130706": "下花园区", "130708": "万全区", "130709": "崇礼区", "130722": "张北县", "130723": "康保县", "130724": "沽源县", "130725": "尚义县", "130726": "蔚县", "130727": "阳原县", "130728": "怀安县", "130730": "怀来县", "130731": "涿鹿县", "130732": "赤城县" } }, "130800": { name: "承德市", districts: { "130802": "双桥区", "130803": "双滦区", "130804": "鹰手营子矿区", "130822": "承德县", "130824": "兴隆县", "130825": "滦平县", "130826": "隆化县", "130827": "丰宁满族自治县", "130828": "宽城满族自治县", "130829": "围场满族蒙古族自治县", "130881": "平泉市" } }, "130900": { name: "沧州市", districts: { "130902": "新华区", "130903": "运河区", "130921": "沧县", "130922": "青县", "130923": "东光县", "130924": "海兴县", "130925": "盐山县", "130926": "肃宁县", "130927": "南皮县", "130928": "吴桥县", "130929": "献县", "130930": "孟村回族自治县", "130981": "泊头市", "130982": "任丘市", "130983": "黄骅市", "130984": "河间市" } }, "131000": { name: "廊坊市", districts: { "131002": "安次区", "131003": "广阳区", "131022": "固安县", "131023": "永清县", "131024": "香河县", "131025": "大城县", "131026": "文安县", "131028": "大厂回族自治县", "131081": "霸州市", "131082": "三河市" } }, "131100": { name: "衡水市", districts: { "131102": "桃城区", "131103": "冀州区", "131121": "枣强县", "131122": "武邑县", "131123": "武强县", "131124": "饶阳县", "131125": "安平县", "131126": "故城县", "131127": "景县", "131128": "阜城县", "131182": "深州市" } } } },
  "140000": { name: "山西省", cities: { "140100": { name: "太原市", districts: { "140105": "小店区", "140106": "迎泽区", "140107": "杏花岭区", "140108": "尖草坪区", "140109": "万柏林区", "140110": "晋源区", "140121": "清徐县", "140122": "阳曲县", "140123": "娄烦县", "140181": "古交市" } }, "140200": { name: "大同市", districts: { "140212": "新荣区", "140213": "平城区", "140214": "云冈区", "140215": "云州区", "140221": "阳高县", "140222": "天镇县", "140223": "广灵县", "140224": "灵丘县", "140225": "浑源县", "140226": "左云县" } }, "140300": { name: "阳泉市", districts: { "140302": "城区", "140303": "矿区", "140311": "郊区", "140321": "平定县", "140322": "盂县" } }, "140400": { name: "长治市", districts: { "140403": "潞州区", "140404": "上党区", "140405": "屯留区", "140406": "潞城区", "140407": "襄垣县", "140408": "平顺县", "140409": "黎城县", "140410": "壶关县", "140411": "长子县", "140412": "武乡县", "140413": "沁县", "140414": "沁源县" } }, "140500": { name: "晋城市", districts: { "140502": "城区", "140521": "沁水县", "140522": "阳城县", "140524": "陵川县", "140525": "泽州县", "140581": "高平市" } }, "140600": { name: "朔州市", districts: { "140602": "朔城区", "140603": "平鲁区", "140621": "山阴县", "140622": "应县", "140623": "右玉县", "140681": "怀仁市" } }, "140700": { name: "晋中市", districts: { "140702": "榆次区", "140703": "太谷区", "140721": "榆社县", "140722": "左权县", "140723": "和顺县", "140724": "昔阳县", "140725": "寿阳县", "140727": "祁县", "140728": "平遥县", "140729": "灵石县", "140781": "介休市" } }, "140800": { name: "运城市", districts: { "140802": "盐湖区", "140821": "临猗县", "140822": "万荣县", "140823": "闻喜县", "140824": "稷山县", "140825": "新绛县", "140826": "绛县", "140827": "垣曲县", "140828": "夏县", "140829": "平陆县", "140830": "芮城县", "140881": "永济市", "140882": "河津市" } }, "140900": { name: "忻州市", districts: { "140902": "忻府区", "140921": "定襄县", "140922": "五台县", "140923": "代县", "140924": "繁峙县", "140925": "宁武县", "140926": "静乐县", "140927": "神池县", "140928": "五寨县", "140929": "岢岚县", "140930": "河曲县", "140931": "保德县", "140932": "偏关县", "140981": "原平市" } }, "141000": { name: "临汾市", districts: { "141002": "尧都区", "141021": "曲沃县", "141022": "翼城县", "141023": "襄汾县", "141024": "洪洞县", "141025": "古县", "141026": "安泽县", "141027": "浮山县", "141028": "吉县", "141029": "乡宁县", "141030": "大宁县", "141031": "隰县", "141032": "永和县", "141033": "蒲县", "141034": "汾西县", "141081": "侯马市", "141082": "霍州市" } }, "141100": { name: "吕梁市", districts: { "141102": "离石区", "141121": "文水县", "141122": "交城县", "141123": "兴县", "141124": "临县", "141125": "柳林县", "141126": "石楼县", "141127": "岚县", "141128": "方山县", "141129": "中阳县", "141130": "交口县", "141181": "孝义市", "141182": "汾阳市" } } } },
  "150000": { name: "内蒙古自治区", cities: { "150100": { name: "呼和浩特市", districts: { "150102": "新城区", "150103": "回民区", "150104": "玉泉区", "150105": "赛罕区", "150121": "土默特左旗", "150122": "托克托县", "150123": "和林格尔县", "150124": "清水河县", "150125": "武川县" } }, "150200": { name: "包头市", districts: { "150202": "东河区", "150203": "昆都仑区", "150204": "青山区", "150205": "石拐区", "150206": "白云鄂博矿区", "150207": "九原区", "150221": "土默特右旗", "150222": "固阳县", "150223": "达尔罕茂明安联合旗" } }, "150300": { name: "乌海市", districts: { "150302": "海勃湾区", "150303": "海南区", "150304": "乌达区" } }, "150400": { name: "赤峰市", districts: { "150402": "红山区", "150403": "元宝山区", "150404": "松山区", "150421": "阿鲁科尔沁旗", "150422": "巴林左旗", "150423": "巴林右旗", "150

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
