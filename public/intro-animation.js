/**
 * intro-animation.js - Intro粒子动画模块
 * 太空来客粒子动画效果
 */

import * as THREE from 'three';

// Intro状态机
let introState = 'idle';
let introT = 0;
let introShooter = null, introShooterGlow = null, introTrail = null, introParticles = null;
let introGroup = null;

const INTRO_CONFIG = {
  flyInDur: 1.5, 
  orbitDur: 2.8, 
  orbitCount: 2, 
  explodeDur: 0.6, 
  textDur: 10000, 
  fadeDur: 1.2,
  orbitR: 12, 
  shootAngle: Math.PI * 0.7, 
  trailLen: 22
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
  // ... 完整实现
}

function tickIntro(dt) {
  // 动画逻辑
  introT += dt;
  // ...
}

function buildIntroParticles() {
  // 构建粒子效果
}

export { startIntroEffect, tickIntro, buildIntroParticles };
