import test from 'node:test';
import assert from 'node:assert/strict';
import {createRescue,start,tick,switchRole,interact,dock,skill,pause,resume,hurt,WORLD,nextLevel,levelConfig,LEVEL_COUNT} from './state.js';
const run=(s,seconds,input={})=>{for(let i=0;i<seconds*60;i++)tick(s,input,1/60);};
function go(s,x,y){for(let i=0;i<3000;i++){const p=s.active==='bird'?s.bird:s.truck;const dx=x-p.x,dy=s.active==='bird'?y-p.y:0;if(Math.abs(dx)<.09&&Math.abs(dy)<.09)return;tick(s,{x:Math.abs(dx)>.05?Math.sign(dx):0,y:Math.abs(dy)>.05?Math.sign(dy):0},1/60);}assert.fail(`cannot reach ${x},${y}, at ${s[s.active].x},${s[s.active].y}`);}
test('complete rescue through crate, bridge, battery, terminal, power and combined dash',()=>{
 const s=createRescue();start(s);go(s,18.7,0);assert.equal(s.crateParked,true);
 switchRole(s);go(s,41,6.5);interact(s);tick(s,{},1/60);assert.equal(s.bridgeOpen,true);
 go(s,49,8);interact(s);assert.equal(s.battery,'bird');
 go(s,s.truck.x,3);interact(s);assert.equal(s.battery,'truck');
 switchRole(s);go(s,54,0);switchRole(s);go(s,64,8);interact(s);assert.equal(s.turretOff,true);
 switchRole(s);go(s,71,0);interact(s);assert.equal(s.powered,true);
 switchRole(s);go(s,71,3);dock(s);run(s,1);assert.equal(s.docked,true);
 go(s,91,0);skill(s);run(s,1,{x:1});assert.equal(s.wallBroken,true);run(s,3,{x:1});assert.equal(s.status,'won');assert.equal(s.lives,8);
});
test('bridge requires switch plus pressure and truck cannot drive into an unpowered gap',()=>{
 const s=createRescue();start(s);run(s,10,{x:1});assert.ok(s.truck.x<=25);assert.equal(s.bridgeOpen,false);
 s.bridgeEnabled=true;tick(s,{},1/60);assert.equal(s.bridgeOpen,true);
 s.crate=10;s.crateParked=false;s.truck.x=7;tick(s,{},1/60);assert.equal(s.bridgeOpen,false);
});
test('carried battery blocks attack and can be dropped, retrieved or installed directly',()=>{
 const s=createRescue();start(s);switchRole(s);go(s,49,8);interact(s);skill(s);assert.equal(s.attack,0);
 go(s,55,6);interact(s);assert.equal(s.battery,'ground');run(s,2);go(s,55,1.8);interact(s);assert.equal(s.battery,'bird');
 go(s,71,2.5);interact(s);assert.equal(s.battery,'socket');assert.equal(s.powered,false);
});
test('combat offers turret destruction and shield interception across role switches',()=>{
 const s=createRescue();start(s);switchRole(s);s.truck.x=77;s.bird={x:80,y:7,hp:100};s.active='truck';skill(s);switchRole(s);assert.equal(s.shield,true);
 s.shots=[{x:77,y:2,vx:0,vy:0,ttl:1}];tick(s,{},1/60);assert.equal(s.truck.hp,100);assert.equal(s.shots.length,0);
 for(let i=0;i<3;i++){skill(s);run(s,.7);}assert.equal(s.turretHp,0);
});
test('remote recall flies back before docking; early dashing is rejected and pause freezes simulation',()=>{
 const s=createRescue();start(s);skill(s);assert.equal(s.dash,0);switchRole(s);go(s,20,8);dock(s);assert.equal(s.docked,false);assert.equal(s.recalling,true);
 pause(s);const before=JSON.stringify(s);run(s,10,{x:1});assert.equal(JSON.stringify(s),before);resume(s);assert.equal(s.status,'playing');run(s,4);assert.equal(s.docked,true);
});
test('repair, checkpoint rescue and eight-life failure preserve puzzle progress',()=>{
 const s=createRescue();start(s);s.truck.hp=50;s.bird.hp=20;run(s,5);assert.equal(s.truck.hp,100);assert.equal(s.bird.hp,100);
 s.powered=true;s.checkpoint=71;s.battery='bird';s.invincible=0;hurt(s,'bird',100);run(s,2);assert.equal(s.truck.x,71);assert.equal(s.battery,'truck');assert.equal(s.lives,7);
 for(let i=0;i<7;i++){s.invincible=0;hurt(s,'truck',100);run(s,2);}assert.equal(s.status,'lost');assert.equal(s.lives,0);
});

test('all 20 rescue levels can be completed with their actual layouts and energy requirements',()=>{
 for(let level=1;level<=20;level++){
  const s=createRescue(level),w=s.world;start(s);
  go(s,w.plate-2.3,0);assert.equal(s.crateParked,true,`crate ${level}`);
  switchRole(s);go(s,w.bridgeSwitch.x,w.bridgeSwitch.y);interact(s);run(s,.1);
  // Clear the defence with the bird before bringing the vehicle through.
  go(s,w.turret.x-2,w.turret.y+3.4);
  for(let shot=0;shot<5&&s.turretHp>0;shot++){skill(s);run(s,.7,{y:shot%2?.3:-.3});}
  assert.equal(s.turretHp,0,`defence ${level}`);
  switchRole(s);go(s,w.station,0);
  for(let cell=0;cell<s.config.requiredCells;cell++){
   switchRole(s);go(s,s.batteryPos.x,s.batteryPos.y);interact(s);assert.equal(s.battery,'bird',`grab ${level}/${cell}`);
   go(s,w.station,2.5);interact(s);assert.equal(s.battery,'socket');switchRole(s);interact(s);
  }
  assert.equal(s.powered,true,`power ${level}`);assert.equal(s.cellsDelivered,s.config.requiredCells);
  if(s.config.coopGate){
   go(s,w.gatePlate,0);run(s,.1);switchRole(s);go(s,w.gateSwitch.x,w.gateSwitch.y);interact(s);assert.equal(s.gateOpen,true,`gate ${level}`);
  }
  dock(s);run(s,5);go(s,w.wall-3,0);skill(s);run(s,1,{x:1});assert.equal(s.wallBroken,true,JSON.stringify({level,active:s.active,docked:s.docked,recalling:s.recalling,event:s.event,truck:s.truck,bird:s.bird}));run(s,3,{x:1});
  assert.equal(s.status,'won',`finish ${level}`);assert.ok(s.lives>0);
 }
});
test('energy powers shields and dash, while armour loss consumes a life',()=>{
 const s=createRescue();start(s);switchRole(s);switchRole(s);skill(s);run(s,1);assert.ok(s.energy<80&&s.shield);
 run(s,4);assert.equal(s.shield,false);const remaining=s.energy;run(s,1);assert.ok(s.energy>remaining);
 s.bird.x=s.truck.x;s.bird.y=3;dock(s);run(s,1);s.powered=true;s.energy=100;skill(s);assert.equal(s.energy,65);
 s.invincible=0;hurt(s,'truck',100);assert.equal(s.lives,7);
});
test('later levels require multiple cells and powering the defence terminal',()=>{
 const s=createRescue(20);start(s);switchRole(s);s.bird={...s.world.terminal,hp:100};interact(s);assert.equal(s.turretOff,false);
 s.powered=true;interact(s);assert.equal(s.turretOff,true);assert.equal(s.config.requiredCells,3);
 const layouts=new Set(Array.from({length:20},(_,i)=>JSON.stringify(createRescue(i+1).world)));assert.equal(layouts.size,20);
});

test('difficulty increases through 20 levels and progression stops at the final level',()=>{
 for(let n=1;n<=LEVEL_COUNT;n++){
  const s=createRescue(n);assert.equal(nextLevel(s),null);s.status='won';
  const next=nextLevel(s);
  if(n===20){assert.equal(next,null);continue;}
  assert.equal(next.config.level,n+1);assert.equal(next.status,'ready');assert.equal(next.lives,8);assert.equal(next.cellsDelivered,0);
  const a=levelConfig(n),b=levelConfig(n+1);
  assert.ok(b.fireInterval<a.fireInterval);assert.ok(b.shotSpeed>a.shotSpeed);
  for(const key of ['damage','turretHp','requiredCells','wind'])assert.ok(b[key]>=a[key],key);
 }
});
