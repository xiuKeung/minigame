import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from './vendor/three.module.js';
import { buildModel } from './model.js';
import { buildTank } from './tank/model.js';
import { VIEW_DIRECTIONS, createModelFraming } from './viewer-framing.js';

function frame(object) {
  const camera = new THREE.PerspectiveCamera(36, 16 / 9, .1, 100);
  const controls = {};
  return { framing: createModelFraming({ camera, controls, model: object }), controls };
}

test('all archive models use the same relative camera framing', () => {
  const carrier = frame(buildModel().model);
  const tank = frame(buildTank().tank);
  for (const item of [carrier, tank]) {
    assert.ok(Math.abs(item.controls.minDistance / item.framing.frame.radius - 1.65) < 1e-9);
    assert.ok(Math.abs(item.controls.maxDistance / item.framing.frame.radius - 6.4) < 1e-9);
    const pose = item.framing.pose('perspective');
    assert.ok(Math.abs(pose.position.distanceTo(pose.target) / item.framing.frame.radius - 3.688) < .01);
  }
});

test('standard view directions and stage anchors are model-independent', () => {
  for (const object of [buildModel().model, buildTank().tank]) {
    const { framing } = frame(object);
    for (const [view, direction] of Object.entries(VIEW_DIRECTIONS)) {
      const pose = framing.pose(view);
      const actual = pose.position.clone().sub(pose.target).normalize();
      assert.ok(actual.dot(new THREE.Vector3(...direction).normalize()) > .999999, view);
    }
    assert.equal(framing.frame.floorY, framing.frame.bounds.min.y);
    assert.ok(framing.frame.platformRadius >= 3.9);
  }
});
