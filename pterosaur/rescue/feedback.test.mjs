import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {createFeedback} from './feedback.js';
test('feedback consumes each event once, expires particles, and clears on level change',()=>{
 const scene=new THREE.Scene(),fx=createFeedback(scene),sounds=[],sound={play:type=>sounds.push(type)};
 const s={time:1,fx:[{id:1,type:'damage',x:3,y:2,time:1}]};
 assert.equal(fx.update(s,sound).flash,1);fx.update(s,sound);assert.deepEqual(sounds,['damage']);
 assert.equal(fx.update(s,sound,true).shake,0);
 s.time=2;assert.equal(fx.update(s,sound).flash,0);
 assert.ok(scene.children.find(o=>o.isPoints).geometry.attributes.position.array.every(v=>v===1e5));
 fx.reset();s.time=0;s.fx=[{id:1,type:'dock',x:0,y:0,time:0}];fx.update(s,sound);assert.deepEqual(sounds,['damage','dock']);
});
