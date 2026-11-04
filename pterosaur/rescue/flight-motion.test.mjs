import test from 'node:test';
import assert from 'node:assert/strict';
import {createFlightMotion,updateFlightMotion} from './flight-motion.js';
function flight(){const s={time:0,bird:{x:10,y:6},docked:false,respawn:0,attack:0,battery:'shelf'};const m=createFlightMotion();updateFlightMotion(m,s);return {s,m};}
function fly(s,m,vx,vy,frames=120){for(let n=0;n<frames;n++){s.time+=1/60;s.bird.x+=vx/60;s.bird.y+=vy/60;updateFlightMotion(m,s);}}
test('left and right flight smoothly turn the beak and reveal opposite body surfaces',()=>{
 const {s,m}=flight();fly(s,m,6,0);assert.ok(m.yaw<.01);assert.ok(m.bank>.5);
 const before=m.yaw;fly(s,m,-6,0,1);assert.ok(m.yaw>before&&m.yaw<.4);
 fly(s,m,-6,0);assert.ok(Math.abs(m.yaw-Math.PI)<.01);assert.ok(m.bank>.5);
 // Back normal has opposite world-Z components when facing left vs right.
 assert.ok(Math.sin(m.bank)*Math.cos(m.yaw)<0);
 fly(s,m,6,0);assert.ok(m.yaw<.01);assert.ok(Math.sin(m.bank)*Math.cos(m.yaw)>0);
});
test('climbing, diving and banking settle; pausing freezes all visual motion',()=>{
 const {s,m}=flight();fly(s,m,6,5);assert.ok(m.pitch>.25);fly(s,m,0,-5);assert.ok(m.pitch<-.25);
 fly(s,m,0,0);assert.ok(Math.abs(m.pitch)<.01&&Math.abs(m.bank)<.01);
 const before={...m};updateFlightMotion(m,s);assert.deepEqual(m,before);
 s.attack=.6;fly(s,m,0,0,30);assert.ok(m.pitch<-.3);
});
test('docking resets flight orientation without changing gameplay coordinates',()=>{
 const {s,m}=flight();fly(s,m,-6,3);s.docked=true;const before=structuredClone(s);updateFlightMotion(m,s);
 assert.deepEqual(s,before);for(const key of ['yaw','pitch','bank','wing','bob'])assert.equal(m[key],0);
});
test('landing aligns heading and folds wings continuously before docking',()=>{
 const {s,m}=flight();fly(s,m,-6,0);const yaw=m.yaw;
 s.docking={elapsed:0};s.time+=1/60;updateFlightMotion(m,s);
 s.docking.elapsed=.45;s.time+=1/60;updateFlightMotion(m,s);assert.ok(m.yaw>0&&m.yaw<yaw);
 s.docking.elapsed=.9;s.time+=1/60;updateFlightMotion(m,s);
 for(const key of ['yaw','pitch','bank','wing','bob'])assert.equal(m[key],0);
});
