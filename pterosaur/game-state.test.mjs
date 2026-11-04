import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,startGame,tick,damage,loseLife,takeOff,pauseGame,resumeGame,DOCK_Y,hazardY,levelConfig,LEVEL_COUNT,BIRD_RADIUS,overlaps,joystickAxis,nextLevel} from './game-state.js';
const run=(g,seconds,input={})=>{for(let i=0;i<Math.ceil(seconds*60);i++)tick(g,input,1/60);};
function emptyFlight(){const g=createGame();startGame(g);g.hazards=[];g.pickups=[];g.y=8;g.vy=0;g.invincible=0;return g;}
test('ready waits for start; eight lives are distinct from HP and collision protection',()=>{
 const g=createGame();run(g,2,{up:true});assert.equal(g.status,'ready');assert.equal(g.x,4);
 startGame(g);assert.equal(g.lives,8);assert.equal(g.docked,false);g.invincible=0;
 assert.equal(damage(g),true);assert.equal(g.hp,66);assert.equal(g.lives,8);
 assert.equal(damage(g),false);assert.equal(g.hp,66);
 g.invincible=0;damage(g);g.invincible=0;damage(g);assert.equal(g.hp,0);assert.equal(g.lives,7);
 damage(g);loseLife(g);assert.equal(g.lives,7);run(g,1.7);
 assert.equal(g.hp,100);assert.equal(g.docked,true);assert.equal(g.lives,7);assert.equal(g.y,DOCK_Y);
});
test('holding down lands on the moving truck, heals and waits without progressing',()=>{
 const g=emptyFlight();run(g,2);g.hp=40;run(g,4,{down:true});
 assert.equal(g.docked,true);assert.equal(g.lives,8);assert.ok(g.hp>40);
 const distance=g.distance,x=g.x;run(g,6);assert.equal(g.hp,100);assert.equal(g.distance,distance);assert.equal(g.x,x);
 assert.equal(damage(g),false);takeOff(g);assert.equal(g.docked,false);assert.ok(g.vy>0);
});
test('eight failures exhaust the eight lives; respawn cannot double-charge',()=>{
 const g=emptyFlight();
 for(let i=7;i>=0;i--){loseLife(g);assert.equal(g.lives,i);if(i){run(g,1.7);takeOff(g);}}
 assert.equal(g.status,'lost');const saved=JSON.stringify(g);run(g,3,{up:true});assert.equal(JSON.stringify(g),saved);
 assert.equal(createGame().lives,8);
});
test('pause freezes movement, collision timers and healing',()=>{
 const g=emptyFlight();damage(g);pauseGame(g);const saved=JSON.stringify(g);run(g,3,{up:true});assert.equal(JSON.stringify(g),saved);
 resumeGame(g);tick(g,{},1/60);assert.ok(g.time>0);
});
test('obstacles collide, moving hazards change altitude, energy is collected once',()=>{
 const g=emptyFlight();g.vx=0;g.hazards=[{id:'test',type:'pillar',x:g.x,y:8,w:1,h:2}];tick(g,{},1/60);assert.equal(g.hp,66);
 const h={type:'moving',y:6,phase:0};assert.notEqual(hazardY(h,0),hazardY(h,1));
 g.hazards=[];g.pickups=[{id:0,x:g.x,y:g.y,collected:false}];tick(g,{},1/60);assert.equal(g.score,10);tick(g,{},1/60);assert.equal(g.score,10);
});
test('falling costs a life, a finish awards victory, new game resets the route',()=>{
 const g=emptyFlight();g.y=.2;g.carX=0;tick(g,{},1/60);assert.equal(g.lives,7);
 const winner=emptyFlight();winner.x=winner.config.length-.01;winner.vx=8;tick(winner,{right:true},1/60);assert.equal(winner.status,'won');
 const fresh=createGame();assert.equal(fresh.score,0);assert.ok(fresh.pickups.every(p=>!p.collected));assert.equal(fresh.distance,4);
});
test('all twenty levels are navigable with vertical controls and enlarged collision radius',()=>{
 for(let number=1;number<=LEVEL_COUNT;number++) {
  const g=createGame(number);startGame(g);
  for(let frame=0;frame<60*200&&g.status==='playing';frame++){
   const section=g.sections.find(s=>s.x>g.x-1.6)??g.sections.at(-1);
   const projected=g.y+g.vy*.18,target=section.safeY;
   tick(g,{axis:Math.max(-1,Math.min(1,(target-projected)*3))},1/60);
  }
  assert.equal(g.status,'won',`level ${number} completion`);
  assert.equal(g.hp,100,`level ${number} collision-free route`);
  assert.equal(g.lives,8,`level ${number} lives`);
 }
});

test('a low-altitude hit leaves time for the truck to rescue the bird',()=>{
 const g=emptyFlight();g.y=3;run(g,2);damage(g);run(g,3,{down:true});
 assert.equal(g.lives,8);assert.equal(g.docked,true);assert.ok(g.hp>66);
});

test('difficulty increases each level, layouts differ, and every gate leaves clearance',()=>{
 const layouts=new Set();
 for(let n=1;n<=20;n++){
  const g=createGame(n),c=g.config;layouts.add(JSON.stringify(g.hazards));
  assert.ok(c.gap>2*BIRD_RADIUS+1.5);assert.ok(g.hazards.every(h=>h.h>0&&h.x<c.length));
  if(n>1){const p=levelConfig(n-1);assert.ok(c.speed>p.speed&&c.count>p.count&&c.length>p.length&&c.spacing<p.spacing&&c.gap<p.gap&&c.movingSpeed>p.movingSpeed&&c.movingAmplitude>p.movingAmplitude);}
 }
 assert.equal(layouts.size,20);
 assert.equal(levelConfig(0).level,1);assert.equal(levelConfig(21).level,20);
});
test('joystick has a dead zone, proportional up/down travel, and no horizontal input',()=>{
 assert.equal(joystickAxis(0),0);assert.equal(joystickAxis(4),0);assert.equal(joystickAxis(-40),1);assert.equal(joystickAxis(400),-1);
 assert.ok(joystickAxis(-20)>0&&joystickAxis(-20)<1);
 const a=emptyFlight(),b=emptyFlight();run(a,1,{left:true,right:true});run(b,1,{});assert.equal(a.x,b.x);
 const c=emptyFlight();run(c,1,{axis:.5});assert.ok(c.y>b.y&&c.y<11);
});
test('collision radius is exactly 1.2 times its former size',()=>{
 assert.equal(BIRD_RADIUS,.34*1.2);
 const h={x:0,y:0,w:1,h:1,type:'pillar'},g={x:.5+.38,y:0,time:0};
 assert.equal(overlaps(g,h),true);g.x=.5+.42;assert.equal(overlaps(g,h),false);
});
test('next level resets life, score and pickups; level 20 has no further level',()=>{
 const g=createGame(1);assert.equal(nextLevel(g),null);g.status='won';g.lives=2;g.score=50;
 const next=nextLevel(g);assert.equal(next.config.level,2);assert.equal(next.status,'ready');assert.equal(next.lives,8);assert.equal(next.score,0);
 const last=createGame(20);last.status='won';assert.equal(nextLevel(last),null);
});
test('truck landing works at the fastest level',()=>{
 const g=createGame(20);startGame(g);g.hazards=[];g.pickups=[];g.y=8;g.vy=0;run(g,2);g.hp=40;run(g,5,{axis:-1});
 assert.equal(g.docked,true);assert.equal(g.lives,8);
});
