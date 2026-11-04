import * as THREE from './vendor/three.module.js';

// Shared framing rules for every archive model. Values are expressed relative
// to the model's bounding-sphere radius rather than as scene-specific units.
export const VIEW_DIRECTIONS = {
  perspective: [1, .66, 1.1],
  side: [0, .28, 1],
  front: [1, .28, 0],
  top: [0, 1, .001],
};

// Archive models use +X as their forward direction. Keeping the neutral model
// heading here prevents individual viewers from introducing hidden offsets.
export const DEFAULT_MODEL_HEADING = 0;

const CLOSE_FACTOR = 1.65;
const FAR_FACTOR = 6.4;
const FIT_PADDING = 1.14;

function effectiveFov(camera) {
  const vertical = THREE.MathUtils.degToRad(camera.fov);
  const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * camera.aspect);
  return Math.min(vertical, horizontal);
}

export function createModelFraming({ camera, controls, model }) {
  let frame;

  function refresh() {
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const sphere = bounds.getBoundingSphere(new THREE.Sphere());
    frame = {
      bounds,
      center: sphere.center,
      radius: Math.max(sphere.radius, .01),
      floorY: bounds.min.y,
      platformRadius: Math.max(3.9, Math.max(bounds.getSize(new THREE.Vector3()).x, bounds.getSize(new THREE.Vector3()).z) * .72),
    };
    controls.minDistance = frame.radius * CLOSE_FACTOR;
    controls.maxDistance = frame.radius * FAR_FACTOR;
    return frame;
  }

  function pose(view, target = frame.center, padding = FIT_PADDING) {
    const direction = new THREE.Vector3(...VIEW_DIRECTIONS[view]).normalize();
    const distance = frame.radius / Math.sin(effectiveFov(camera) / 2) * padding;
    return { position: target.clone().addScaledVector(direction, distance), target: target.clone() };
  }

  refresh();
  return { refresh, pose, get frame() { return frame; } };
}

export function addArchiveLighting(scene) {
  scene.add(new THREE.HemisphereLight(0xfffdf4, 0xa3ab9a, 1.65));
  const key = new THREE.DirectionalLight(0xfff8e6, 2.3); key.position.set(3, 12, 6); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = -9; key.shadow.camera.right = 9; key.shadow.camera.top = 9; key.shadow.camera.bottom = -9;
  key.shadow.normalBias = .035; key.shadow.bias = -.00015; key.shadow.radius = 4; scene.add(key);
  const fill = new THREE.DirectionalLight(0xeaf1ff, 1.1); fill.position.set(-6, 7, -8); scene.add(fill);
  const edge = new THREE.DirectionalLight(0xffffff, .6); edge.position.set(8, 4, -4); scene.add(edge);
}

export function addArchiveStage(scene, frame) {
  const platformHeight = .17;
  const platform = new THREE.Mesh(new THREE.CylinderGeometry(frame.platformRadius, frame.platformRadius + .06, platformHeight, 96), new THREE.MeshStandardMaterial({ color: 0xe0e3d8, roughness: .88 }));
  platform.position.y = frame.floorY - platformHeight / 2; platform.receiveShadow = true; scene.add(platform);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0xeeefe9, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = frame.floorY - platformHeight - .005; floor.receiveShadow = true; scene.add(floor);
  const grid = new THREE.GridHelper(100, 100, 0xd1d6c6, 0xdde1d2); grid.position.y = floor.position.y + .005; grid.material.transparent = true; grid.material.opacity = .40; scene.add(grid);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(frame.platformRadius - .3, .008, 3, 128), new THREE.MeshBasicMaterial({ color: 0xc4ccb7 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = frame.floorY + .005; scene.add(ring);
  return { platform, ring };
}
