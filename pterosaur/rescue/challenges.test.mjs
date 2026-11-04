import test from 'node:test';
import assert from 'node:assert/strict';
import {createRescue,start,switchRole,interact,tick,dock,skill,hurt,pause,resume,stars,scannerPose,liftOffset} from './state.js';
const run=(s,t,input={})=>{for(let i=0;i<t*60;i++)tick(s,input,1/60);};
test('cooperative gate requires power and a vehicle on its plate, then stays open',()=>{
 const s=createRescue(12);start(s);switchRole(s);s.turretOff=true;s.bird={...s.world.gateSwitch,hp:100};
 interact(s);assert.equal(s.gateOpen,false);s.powered=true;interact(s);assert.equal(s.gateOpen,false);
 s.truck.x=s.world.gatePlate;tick(s,{},1/60);interact(s);assert.equal(s.gateOpen,true);
 s.truck.x=s.world.gatePlate-4;tick(s,{},1/60);assert.equal(s.gateOpen,true);
 const blocked=createRescue(12);start(blocked);blocked.powered=true;blocked.turretOff=true;blocked.truck.x=blocked.world.gate-3;run(blocked,1,{x:1});assert.ok(blocked.truck.x<=blocked.world.gate-2.3);
});
test('scanner warns, damages only while active, allows low flight, and stops after power',()=>{
 const s=createRescue(4);start(s);switchRole(s);s.turretOff=true;
 s.time=.5;s.bird={...scannerPose(s),hp:100};tick(s,{},1/60);assert.equal(s.bird.hp,100);
 s.time=2;s.bird={...scannerPose(s),hp:100};tick(s,{},1/60);assert.equal(s.bird.hp,80);
 s.invincible=0;s.bird.y=3;tick(s,{},1/60);assert.equal(s.bird.hp,80);
 s.powered=true;s.invincible=0;s.bird={...scannerPose(s),hp:80};tick(s,{},1/60);assert.equal(s.bird.hp,80);
});
test('moving shelf keeps the energy cell aligned and reachable throughout a cycle',()=>{
 const s=createRescue(5);start(s);switchRole(s);s.turretOff=true;
 for(let n=0;n<16;n++){run(s,.5);assert.ok(Math.abs(s.batteryPos.y-(s.world.cells[0].y+liftOffset(s)))<1e-8);assert.ok(s.batteryPos.y<=11.5);}
 s.bird={...s.batteryPos,hp:100};interact(s);assert.equal(s.battery,'bird');
});
test('optional pickups reward once, survive respawn, reset on replay, and award three stars',()=>{
 const s=createRescue();start(s);switchRole(s);s.energy=10;
 s.bird={...s.world.bricks[0],hp:100};tick(s,{},1/60);assert.equal(s.bricks.filter(Boolean).length,1);assert.ok(s.energy>25);
 const count=s.fx.filter(e=>e.type==='collect').length;run(s,.3);assert.equal(s.fx.filter(e=>e.type==='collect').length,count);
 for(const p of s.world.bricks){s.bird={...p,hp:100};tick(s,{},1/60);}
 s.bird={...s.world.rescue,hp:100};interact(s);assert.equal(s.rescued,true);s.status='won';assert.equal(stars(s),3);
 s.status='playing';s.invincible=0;hurt(s,'bird',100);run(s,2);assert.ok(s.bricks.every(Boolean)&&s.rescued);s.status='won';assert.equal(stars(s),2);
 assert.equal(stars(createRescue()),0);assert.deepEqual(createRescue().bricks,[false,false,false]);
});
test('docking approaches and folds over time, blocks input, pauses, then transfers cargo',()=>{
 const s=createRescue();start(s);switchRole(s);s.battery='bird';s.bird.x+=2;dock(s);
 assert.ok(s.docking);assert.equal(s.docked,false);const x=s.truck.x;run(s,.3,{x:1});assert.equal(s.truck.x,x);assert.ok(s.bird.y>1.8);
 switchRole(s);skill(s);assert.equal(s.active,'truck');assert.equal(s.dash,0);
 pause(s);const before=JSON.stringify(s);run(s,1);assert.equal(JSON.stringify(s),before);resume(s);run(s,.7);
 assert.equal(s.docked,true);assert.equal(s.docking,null);assert.equal(s.bird.y,1.8);assert.equal(s.battery,'truck');
});
test('recall from directly overhead finishes without stalling at the docking boundary',()=>{
 const s=createRescue();start(s);switchRole(s);s.bird.y=9;dock(s);run(s,5);assert.equal(s.docked,true);
 switchRole(s);dock(s);hurt(s,'bird',100);assert.equal(s.docking,null);run(s,2);assert.equal(s.docked,true);
});
