import * as THREE from '../vendor/three.module.js';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { buildTank } from './model.js';

const host = document.querySelector('#canvas-host');
const loading = document.querySelector('#loading');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
host.append(renderer.domElement);

const scene = new THREE.Scene(); scene.background = new THREE.Color('#eef1ec'); scene.fog = new THREE.Fog('#eef1ec', 14, 28);
const camera = new THREE.PerspectiveCamera(36, 1, .1, 100);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = .06; controls.minDistance = 6; controls.maxDistance = 15;
controls.target.set(0, 1.25, 0); controls.maxPolarAngle = Math.PI * .49;
const { tank, turret, cannons, barrelParts, meshCount } = buildTank();
tank.rotation.y = -.42; scene.add(tank);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ color: 0x415143, opacity: .16 }));
ground.rotation.x = -Math.PI / 2; ground.position.y = .22; ground.receiveShadow = true; scene.add(ground);
scene.add(new THREE.HemisphereLight(0xfffdf5, 0x68766b, 2.4));
const key = new THREE.DirectionalLight(0xfff2c8, 3.2); key.position.set(5, 9, 6); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); scene.add(key);
const fill = new THREE.DirectionalLight(0xc9dcff, 1.15); fill.position.set(-6, 4, -6); scene.add(fill);

const views = {
  perspective: { position: [7.2, 5.4, 8.0], target: [0, 1.25, 0] },
  front: { position: [9.8, 3.2, 0], target: [0, 1.2, 0] },
  side: { position: [0, 3.0, 10.5], target: [0, 1.2, 0] },
  top: { position: [0, 12.5, .1], target: [0, 1.1, 0] },
};
let targetView = views.perspective;
function selectView(name) {
  targetView = views[name];
  document.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('selected', button.dataset.view === name));
}
selectView('perspective');

let spin = false; let wire = false; let aim = 0; let autoAim = false; let last = performance.now();
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => selectView(button.dataset.view)));
document.querySelector('#spin').addEventListener('click', event => {
  spin = !spin; event.currentTarget.classList.toggle('active', spin); event.currentTarget.setAttribute('aria-pressed', String(spin));
});
document.querySelector('#wire').addEventListener('click', event => {
  wire = !wire; tank.traverse(node => { if (node.isMesh) node.material.wireframe = wire; });
  event.currentTarget.classList.toggle('active', wire); event.currentTarget.setAttribute('aria-pressed', String(wire));
});
document.querySelector('#turret').addEventListener('input', event => { turret.rotation.y = THREE.MathUtils.degToRad(Number(event.target.value)); });
document.querySelector('#barrel').addEventListener('input', event => { aim = THREE.MathUtils.degToRad(Number(event.target.value)); cannons.rotation.z = aim; });
document.querySelector('#auto-aim').addEventListener('click', event => {
  autoAim = !autoAim; event.currentTarget.classList.toggle('active', autoAim); event.currentTarget.setAttribute('aria-pressed', String(autoAim));
});
document.querySelector('#fullscreen').addEventListener('click', () => document.querySelector('.viewer').requestFullscreen?.());
document.querySelector('#mesh-count').textContent = `${meshCount} 个几何部件`;

function resize() {
  const { width, height } = host.getBoundingClientRect();
  camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false);
}
new ResizeObserver(resize).observe(host); resize();
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (spin) tank.rotation.y += dt * .45;
  if (autoAim) { turret.rotation.y = Math.sin(now * .00065) * .62; cannons.rotation.z = .42 + Math.sin(now * .00105) * .12; }
  camera.position.lerp(new THREE.Vector3(...targetView.position), .07);
  controls.target.lerp(new THREE.Vector3(...targetView.target), .07);
  controls.update(); renderer.render(scene, camera); requestAnimationFrame(frame);
}
loading.classList.add('hidden'); requestAnimationFrame(frame);
