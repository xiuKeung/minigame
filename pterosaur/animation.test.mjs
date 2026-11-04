import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AnimationPlayer,sampleAnimation,DURATION} from './animation.js';
import {buildModel} from './model.js';
import {Box3} from './vendor/three.module.js';

test('separation clears the vehicle before standing, and folds before docking',()=>{
  for(let t=0;t<=DURATION;t+=.025){
    const s=sampleAnimation(t);
    if(s.stand>0) assert.ok(s.side>=4.24);
    if(s.side>0&&s.side<4.24) assert.equal(s.stand,0);
    for(const v of Object.values(s)) assert.ok(Number.isFinite(v));
  }
  const end=sampleAnimation(20);
  for(const key of ['drive','lift','side','stand','wing','headPitch','orbit']) assert.equal(end[key],0);
});
test('scrubbing and reverse playback recover exactly the same pose',()=>{
  const p=new AnimationPlayer(); p.seek(9); p.play(); p.advance(.5);
  const forward=sampleAnimation(p.time);
  p.seek(10); p.direction=-1; p.play(); p.advance(.5);
  assert.deepEqual(sampleAnimation(p.time),forward);
  p.seek(5);p.advance(10);assert.equal(p.time,5);
});
test('endpoints, replay, speed and loop are bounded',()=>{
  const p=new AnimationPlayer();p.seek(19);p.speed=2;p.play();p.advance(1);
  assert.equal(p.time,20);assert.equal(p.playing,false);
  p.play();assert.equal(p.time,0);
  p.direction=-1;p.play();assert.equal(p.time,20);
  p.seek(.1);p.loop=true;p.play();p.advance(.1);assert.ok(Math.abs(p.time-19.9)<1e-8);
});
test('standing portion stays on the floor and fixed roof remains with carrier',()=>{
  const rig=buildModel();const roof=rig.chassis.getObjectByName('Fixed trapezoid roof panel');
  const initial=roof.matrixWorld.clone();
  for(const t of [8.5,10.5,12,14,15.5]){
    const s=sampleAnimation(t);rig.poseCreature({stand:s.stand,wing:s.wing,headPitch:s.headPitch});
    assert.ok(Math.abs(new Box3().setFromObject(rig.creature).min.y)<1e-6);
    assert.ok(roof.matrixWorld.equals(initial));
  }
});
