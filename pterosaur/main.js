import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { buildModel } from './model.js?v=2';
import { buildTank } from './tank/model.js?v=1';
import { AnimationPlayer, sampleAnimation, CHAPTERS, DURATION } from './animation.js?v=3';
import { addArchiveLighting, addArchiveStage, createModelFraming, DEFAULT_MODEL_HEADING } from './viewer-framing.js?v=2';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const host = $('#canvas-host');
const loading = $('#loading');
let toastTimer;
function toast(message) {
  $('#toast').textContent = message; $('#toast').classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 2500);
}

// Reference viewer works independently of WebGL availability.
const photos = $$('.photo');
const dialog = $('#photo-dialog');
let currentPhoto = 0;
let photoCategory = 'all';
function filteredPhotos() { return photos.filter(p => photoCategory === 'all' || p.dataset.category === photoCategory); }
function nextPhoto(direction) {
  const filtered = filteredPhotos();
  const index = filtered.indexOf(photos[currentPhoto]);
  showPhoto(photos.indexOf(filtered[(index + direction + filtered.length) % filtered.length]));
}
$$('[data-filter]').forEach(button => button.addEventListener('click', () => {
  photoCategory = button.dataset.filter;
  photos.forEach(p => { p.hidden = photoCategory !== 'all' && p.dataset.category !== photoCategory; });
  $$('[data-filter]').forEach(b => { const selected = b === button; b.classList.toggle('selected', selected); b.setAttribute('aria-pressed', selected); });
}));
function showPhoto(index) {
  currentPhoto = (index + photos.length) % photos.length;
  const source = photos[currentPhoto].querySelector('img');
  $('#large-photo').src = source.dataset.full || source.src; $('#large-photo').alt = source.alt;
  $('#photo-caption').textContent = `${String(currentPhoto + 1).padStart(2, '0')} / ${photos.length} · ${photos[currentPhoto].querySelector('span').textContent.replace(/\d|↗/g, '').trim()}`;
  if (!dialog.open) dialog.showModal();
}
photos.forEach((p, i) => p.addEventListener('click', () => showPhoto(i)));
$('#close-photo').addEventListener('click', () => dialog.close());
$('#prev-photo').addEventListener('click', () => nextPhoto(-1));
$('#next-photo').addEventListener('click', () => nextPhoto(1));
dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } });
dialog.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') {e.preventDefault();nextPhoto(-1);} if (e.key === 'ArrowRight') {e.preventDefault();nextPhoto(1);} });

function startGallery() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#eeefe9');
  scene.fog = new THREE.Fog('#eeefe9', 32, 70);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); loading.textContent = '3D 显示暂时中断，请刷新页面重试。'; loading.classList.remove('hidden'); });
  renderer.domElement.addEventListener('webglcontextrestored', () => location.reload());
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 100);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = .065;
  controls.enablePan = false;
  controls.maxPolarAngle = Math.PI * .5 - .018; controls.autoRotateSpeed = .7;
  controls.target.set(-.25, 1.4, 0);
  const { model, chassis, creature, poseCreature, materials, meshCount } = buildModel(); scene.add(model);
  const framing = createModelFraming({ camera, controls, model });
  addArchiveLighting(scene);
  const { platform, ring } = addArchiveStage(scene, framing.frame);
  const player = new AnimationPlayer();
  let cinematic = false;
  const wheels = chassis.children.filter(part => part.name === 'Wheel with tread and spoked rim');
  const creatureBounds = new THREE.Box3();
  const restingClearance = creatureBounds.setFromObject(creature).min.y;

  let mode = 'combined', separated = false, targetLift = 0, targetWing = 0, cameraMotion = null;
  let pose = 'standing', targetStand = 0, targetHead = 0;
  let view = 'perspective', autoRotate = false, wireframe = false;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  function fitDistance() { return Math.max(1, .98 / camera.aspect); }
  function moveCamera(nextView, instant = false) {
    view = nextView;
    const { position: end, target } = framing.pose(view);
    if (instant || reduceMotion.matches) { camera.position.copy(end); controls.target.copy(target); controls.update(); cameraMotion = null; }
    else cameraMotion = { from: camera.position.clone(), to: end, fromTarget: controls.target.clone(), toTarget: target, time: performance.now() };
    $$('[data-view]').forEach(b => { const yes = b.dataset.view === view; b.classList.toggle('selected', yes); b.setAttribute('aria-pressed', yes); });
  }
  function setAuto(value) { autoRotate = value; controls.autoRotate = value; $('#rotate').setAttribute('aria-checked', value); }
  function setSeparated(value) {
    separated = value; targetLift = value ? 1.75 : 0;
    $('#separate').setAttribute('aria-pressed', value);
    $('#separate span').textContent = value ? '还原组合结构' : '分层查看结构';
  }
  function setMode(value) {
    mode = value; chassis.visible = value !== 'creature'; creature.visible = value !== 'chassis';
    const independent = value === 'creature' || value === 'split';
    targetStand = independent && pose === 'standing' ? 1 : 0;
    setSeparated(false); $('#separate').disabled = value !== 'combined';
    $('#pose-controls').hidden = !independent;
    $('#wings').disabled = value === 'chassis'; $('#head-pitch').disabled = value === 'chassis';
    const descriptions = {combined:'翼龙伏在车顶，四点接口连接两部分。',split:'分离后的战车与翼龙，保持相同的模型比例。',creature:'独立查看长喙、肩部球节、腰部双接头和脚爪。',chassis:'大斜板属于车身；四凸点接口与后部格栅已露出。'};
    $('#mode-detail').textContent = descriptions[value];
    updateDownload();
    $$('[data-mode]').forEach(b => { const yes = b.dataset.mode === value; b.classList.toggle('selected', yes); b.setAttribute('aria-pressed', yes); });
    moveCamera(view);
  }
  function updateDownload() {
    const files = {combined:'mechanical-pterosaur',split:pose === 'standing' ? 'detached-pair' : 'detached-resting',creature:pose === 'standing' ? 'pterosaur-standing' : 'pterosaur-resting',chassis:'carrier'};
    $('.download').href = `./assets/${files[mode]}.glb`;
    $('.download').title = '下载当前展示形态的基础模型（不包含滑杆临时调整）';
  }
  $$('[data-pose]').forEach(button => button.addEventListener('click', () => {
    pose = button.dataset.pose; targetStand = pose === 'standing' ? 1 : 0;
    $$('[data-pose]').forEach(b => { const yes = b === button; b.classList.toggle('selected', yes); b.setAttribute('aria-pressed', yes); });
    updateDownload(); moveCamera(view);
  }));
  function setWireframe(value) {
    wireframe = value; Object.values(materials).forEach(m => { m.wireframe = value; });
    $('#wireframe').setAttribute('aria-checked', value);
  }
  function reset() {
    if (cinematic) exitAnimation();
    setAuto(false); setWireframe(false); setMode('combined');
    $('#wings').value = '0'; $('#wing-value').value = '0%'; targetWing = 0;
    $('#head-pitch').value = '0'; $('#head-value').value = '0°'; targetHead = 0;
    pose = 'standing'; $$('[data-pose]').forEach(b => { const yes = b.dataset.pose === pose; b.classList.toggle('selected',yes); b.setAttribute('aria-pressed',yes); });
    moveCamera('perspective'); toast('已恢复照片姿态与默认视角');
  }
  $$('[data-view]').forEach(b => b.addEventListener('click', () => { setAuto(false); moveCamera(b.dataset.view); }));
  $$('[data-mode]').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
  $('#rotate').addEventListener('click', () => setAuto(!autoRotate));
  $('#wireframe').addEventListener('click', () => setWireframe(!wireframe));
  $('#separate').addEventListener('click', () => { setSeparated(!separated); moveCamera(view); });
  $('#wings').addEventListener('input', e => { targetWing = Number(e.target.value) / 100; $('#wing-value').value = `${e.target.value}%`; });
  $('#head-pitch').addEventListener('input', e => { targetHead = THREE.MathUtils.degToRad(Number(e.target.value)); $('#head-value').value = `${e.target.value}°`; });
  $('#reset').addEventListener('click', reset);
  const manualControls = $$('[data-mode], [data-pose], #rotate, #wireframe, #wings, #head-pitch, #separate, .views button');
  function updatePlayback() {
    $('#animation-seek').value = player.time;
    $('#animation-seek').setAttribute('aria-valuetext', `${player.time.toFixed(1)} 秒，共 20 秒`);
    $('#animation-clock').value = `${player.time.toFixed(1).padStart(4,'0')} / 20.0`;
    $('#animation-play').textContent = player.playing ? 'Ⅱ 暂停' : '▶ 播放';
    $('#animation-play').setAttribute('aria-label', player.playing ? '暂停动画' : '播放动画');
    $('#animation-reverse').setAttribute('aria-pressed', player.direction === -1);
    const status = player.playing ? (player.direction === -1 ? '正在倒放' : '正在播放') : player.time === DURATION ? '播放完成' : '已暂停';
    if ($('#playback-status').textContent !== status) $('#playback-status').textContent = status;
    const chapter = sampleAnimation(player.time).chapter;
    $('#chapter-number').textContent = `${String(chapter+1).padStart(2,'0')} / 07`;
    $('#chapter-title').textContent = CHAPTERS[chapter].title;
    $('#chapter-detail').textContent = CHAPTERS[chapter].detail;
  }
  function applyAnimation() {
    const s = sampleAnimation(player.time);
    model.position.set(s.drive,0,-1.2);
    chassis.position.set(0,0,0); chassis.visible = true; creature.visible = true;
    poseCreature({stand:s.stand,wing:s.wing,headPitch:s.headPitch});
    // Keep clear of the deck while moving sideways; then place both feet on the floor.
    const bottom = creatureBounds.setFromObject(creature).min.y;
    creature.position.y += (1-s.stand)*(restingClearance+s.lift)-bottom;
    creature.position.z = s.side;
    wheels.forEach(wheel => { wheel.rotation.z = s.wheelAngle; });
    const angle = .72 + (reduceMotion.matches ? 0 : s.orbit);
    const distance = 20.5 * fitDistance();
    controls.target.set(-.2,1.8,.7);
    camera.position.set(Math.sin(angle)*distance,1.8+9*fitDistance(),Math.cos(angle)*distance+.7);
    camera.lookAt(controls.target);
    updatePlayback();
  }
  function startAnimation() {
    setMode('combined'); setAuto(false); setWireframe(false); cameraMotion = null;
    cinematic = true; controls.enabled = false;
    player.direction = 1; player.seek(0); player.play();
    platform.scale.set(1.3,1,1.3); ring.scale.setScalar(1.3);
    $('#viewer').classList.add('cinematic');
    $('#playback').hidden = false; $('#cinema-caption').hidden = false;
    manualControls.forEach(control => { control.disabled = true; });
    $('#mode-detail').textContent = '正在展示变身动画。退出动画后可继续手动查看。';
    applyAnimation();
    $('#viewer').scrollIntoView({behavior:reduceMotion.matches ? 'instant' : 'smooth',block:'start'});
  }
  function exitAnimation() {
    cinematic = false; player.playing = false; controls.enabled = true;
    model.position.set(0,0,0); wheels.forEach(wheel => {wheel.rotation.z=0;});
    platform.scale.set(1,1,1); ring.scale.setScalar(1);
    $('#viewer').classList.remove('cinematic');
    $('#playback').hidden = true; $('#cinema-caption').hidden = true;
    manualControls.forEach(control => { control.disabled = false; });
    currentLift=currentWing=currentStand=currentHead=currentGround=splitOffset=0;
    targetWing=targetHead=0; $('#wings').value='0'; $('#wing-value').value='0%';
    $('#head-pitch').value='0'; $('#head-value').value='0°';
    setMode('combined'); poseCreature(); chassis.position.set(0,0,0);
    moveCamera('perspective',true);
  }
  $('#start-animation').addEventListener('click',startAnimation);
  $('#exit-animation').addEventListener('click',exitAnimation);
  $('#animation-play').addEventListener('click',()=>{if(player.playing)player.playing=false;else player.play();updatePlayback();});
  $('#animation-restart').addEventListener('click',()=>{player.direction=1;player.seek(0);player.play();applyAnimation();});
  $('#animation-reverse').addEventListener('click',()=>{player.direction*=-1;player.play();updatePlayback();});
  $('#animation-seek').addEventListener('input',event=>{player.seek(Number(event.target.value));applyAnimation();renderer.render(scene,camera);});
  $('#animation-speed').addEventListener('change',event=>{player.speed=Number(event.target.value);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&cinematic){player.playing=false;updatePlayback();}});
  $('#fullscreen').addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if ($('#viewer').requestFullscreen) await $('#viewer').requestFullscreen();
      else toast('当前浏览器不支持全屏，可横屏查看模型');
    } catch { toast('无法进入全屏，请使用浏览器的全屏功能'); }
  });
  controls.addEventListener('start', () => { cameraMotion = null; setAuto(false); $$('[data-view]').forEach(b => { b.classList.remove('selected'); b.setAttribute('aria-pressed', false); }); });

  const observer = new ResizeObserver(() => {
    const width = host.clientWidth, height = host.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height);
    framing.refresh();
    if(cinematic) applyAnimation(); else moveCamera(view, true);
  }); observer.observe(host);
  camera.aspect = host.clientWidth / host.clientHeight; camera.updateProjectionMatrix();
  renderer.setSize(host.clientWidth, host.clientHeight); moveCamera('perspective', true);
  let lastTime = performance.now(), currentWing = 0, currentStand = 0, currentHead = 0, currentLift = 0, currentGround = 0, splitOffset = 0, visible = true;
  const visibilityObserver = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if(!visible&&cinematic){player.playing=false;updatePlayback();} }, { rootMargin: '80px' }); visibilityObserver.observe(host);
  function frame(time) {
    requestAnimationFrame(frame);
    const dt = Math.min((time - lastTime) / 1000, .25); lastTime = time;
    if (document.hidden || !visible) return;
    if(cinematic) {player.advance(dt);applyAnimation();renderer.render(scene,camera);return;}
    const smooth = reduceMotion.matches ? 1 : 1 - Math.exp(-dt * 9);
    currentLift = THREE.MathUtils.lerp(currentLift, targetLift, smooth);
    currentWing = THREE.MathUtils.lerp(currentWing, targetWing, smooth);
    currentStand = THREE.MathUtils.lerp(currentStand, targetStand, smooth);
    currentHead = THREE.MathUtils.lerp(currentHead, targetHead, smooth);
    splitOffset = THREE.MathUtils.lerp(splitOffset, mode === 'split' ? 1 : 0, smooth);
    currentGround = THREE.MathUtils.lerp(currentGround, mode === 'creature' || mode === 'split' ? 1 : 0, smooth);
    poseCreature({stand:currentStand,wing:currentWing,headPitch:currentHead,lift:currentLift,grounded:currentGround});
    chassis.position.z = -1.72 * splitOffset;
    creature.position.z = 2.45 * splitOffset;
    creature.position.x += .28 * splitOffset;
    if (cameraMotion) {
      const t = Math.min((time - cameraMotion.time) / 700, 1), easing = 1 - Math.pow(1 - t, 3);
      camera.position.lerpVectors(cameraMotion.from, cameraMotion.to, easing); controls.target.lerpVectors(cameraMotion.fromTarget, cameraMotion.toTarget, easing);
      if (t === 1) cameraMotion = null;
    }
    controls.update(dt); renderer.render(scene, camera);
  }
  renderer.render(scene, camera); loading.classList.add('hidden'); requestAnimationFrame(frame);
  // Read-only diagnostics for checking the interactive state during local QA.
  window.galleryState = () => ({ mode, pose, separated, autoRotate, wireframe, cinematic, animationTime:player.time, playing:player.playing, direction:player.direction, wing: targetWing, standing:currentStand, meshCount, canvasWidth: renderer.domElement.width, canvasHeight: renderer.domElement.height, meshes: renderer.info.render.calls, camera: camera.position.toArray() });
}

function startTankShowcase() {
  const root = $('#tank-model');
  const tankHost = $('#tank-canvas-host');
  if (!root || !tankHost) return;
  const viewer = $('#tank-viewer');
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#eeefe9'); scene.fog = new THREE.Fog('#eeefe9', 32, 70);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; tankHost.append(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 100);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = .065; controls.enablePan = false; controls.enableZoom = true; controls.zoomSpeed = 1.15; controls.maxPolarAngle = Math.PI * .5 - .018; controls.autoRotateSpeed = .7;
  const { tank, turret, cannons, materials, meshCount } = buildTank(); tank.rotation.y = DEFAULT_MODEL_HEADING; scene.add(tank);
  const framing = createModelFraming({ camera, controls, model: tank });
  addArchiveLighting(scene);
  addArchiveStage(scene, framing.frame);
  let view = 'perspective', autoRotate = false, wireframe = false, autoAim = false, cameraMotion = null, last = performance.now();
  function moveCamera(name, instant = false) {
    view = name; root.querySelectorAll('[data-tank-view]').forEach(button => { const selected = button.dataset.tankView === name; button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', selected); });
    const pose = framing.pose(name);
    if (instant) { camera.position.copy(pose.position); controls.target.copy(pose.target); controls.update(); cameraMotion = null; }
    else cameraMotion = pose;
  }
  function setAutoRotate(value) { autoRotate = value; controls.autoRotate = value; root.querySelector('#tank-rotate').setAttribute('aria-checked', String(value)); }
  function setWireframe(value) { wireframe = value; Object.values(materials).forEach(material => { material.wireframe = value; }); root.querySelector('#tank-wireframe').setAttribute('aria-checked', String(value)); }
  function setAutoAim(value) { autoAim = value; root.querySelector('#tank-auto-aim').setAttribute('aria-pressed', String(value)); }
  function reset() {
    tank.rotation.y = DEFAULT_MODEL_HEADING; turret.rotation.y = 0; cannons.rotation.z = 0;
    root.querySelector('#tank-turret').value = '0'; root.querySelector('#tank-barrel').value = '0';
    setAutoRotate(false); setWireframe(false); setAutoAim(false); moveCamera('perspective');
  }
  root.querySelectorAll('[data-tank-view]').forEach(button => button.addEventListener('click', () => { setAutoRotate(false); moveCamera(button.dataset.tankView); }));
  root.querySelector('#tank-rotate').addEventListener('click', () => setAutoRotate(!autoRotate));
  root.querySelector('#tank-wireframe').addEventListener('click', () => setWireframe(!wireframe));
  root.querySelector('#tank-turret').addEventListener('input', event => { setAutoAim(false); turret.rotation.y = THREE.MathUtils.degToRad(Number(event.target.value)); });
  root.querySelector('#tank-barrel').addEventListener('input', event => { setAutoAim(false); cannons.rotation.z = THREE.MathUtils.degToRad(Number(event.target.value)); });
  root.querySelector('#tank-auto-aim').addEventListener('click', () => setAutoAim(!autoAim));
  root.querySelector('#tank-reset').addEventListener('click', reset);
  root.querySelector('#tank-fullscreen').addEventListener('click', () => viewer.requestFullscreen?.());
  root.querySelector('#tank-mesh-count').textContent = `${meshCount} 个几何部件`;
  function resize() { const {width,height} = tankHost.getBoundingClientRect(); if (!width || !height) return; camera.aspect = width / height; camera.updateProjectionMatrix(); framing.refresh(); renderer.setSize(width, height, false); }
  new ResizeObserver(resize).observe(tankHost); resize(); moveCamera(view, true);
  controls.addEventListener('start', () => { cameraMotion = null; setAutoRotate(false); root.querySelectorAll('[data-tank-view]').forEach(button => { button.classList.remove('selected'); button.setAttribute('aria-pressed', 'false'); }); });
  function frame(now) {
    requestAnimationFrame(frame); const dt = Math.min(.05, (now-last)/1000); last = now;
    if (autoAim) { turret.rotation.y = Math.sin(now*.00065)*.62; cannons.rotation.z = .42 + Math.sin(now*.00105)*.12; }
    if (cameraMotion) {
      camera.position.lerp(cameraMotion.position, .09); controls.target.lerp(cameraMotion.target, .09);
      if (camera.position.distanceTo(cameraMotion.position) < .02 && controls.target.distanceTo(cameraMotion.target) < .02) { camera.position.copy(cameraMotion.position); controls.target.copy(cameraMotion.target); cameraMotion = null; }
    }
    controls.update(); renderer.render(scene,camera);
  }
  requestAnimationFrame(frame);
}

try { startGallery(); startTankShowcase(); }
catch (error) {
  console.error('3D gallery could not start:', error);
  loading.innerHTML = '<span>当前设备暂时无法显示 3D。请使用支持 WebGL 的浏览器，或下载模型查看。</span>';
  loading.style.padding = '35px'; loading.style.textAlign = 'center';
  $$('.panel button, .panel input, .view-tools button, .views button').forEach(control => { control.disabled = true; });
}
