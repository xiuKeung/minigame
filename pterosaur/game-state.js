// Pure game rules, shared by the renderer and deterministic simulation tests.
export const LEVEL_COUNT = 20;
export const MAX_LEVEL_LENGTH = 748;
export const MAX_LIVES = 8;
export const DOCK_Y = 1.72;
// Enlarge the existing body collision radius by exactly 1.2, without scaling the model.
export const BIRD_RADIUS = .34 * 1.2;
const names = ['初入风谷','青石航道','林间回廊','回声峡谷','金色山口','浮石阵列','穿云山脊','风铃隘口','疾风走廊','高塔边界','赤岩前哨','暮色峡湾','流沙天堑','旋风要塞','裂谷深处','雷鸣长廊','云顶关隘','极限航线','终焉风暴','天空之巅'];
export function levelConfig(number=1) {
  const level=Math.max(1,Math.min(LEVEL_COUNT,Math.trunc(number)||1)), t=(level-1)/19;
  const length=520+(level-1)*12, count=18+level-1;
  return {level,name:names[level-1],length,count,spacing:(length-72)/(count-1),
    speed:4.6+1.9*t,gap:4.6-1.7*t,movingSpeed:.7+.7*t,movingAmplitude:1.3+1.5*t, difficulty:t};
}
export function createLevel(number=1) {
  const config=levelConfig(number), hazards=[], pickups=[], sections=[];
  const {level,count,spacing,gap,difficulty}=config;
  for(let i=0;i<count;i++) {
    const x=36+i*spacing, type=i%3;
    const center=6.5+Math.sin(i*1.8+level*.37)*(1+ .3*difficulty);
    if(type===0) {
      const h=4.4+(i%4)*.45+difficulty*.6;
      hazards.push({id:`pillar-${i}`,type:'pillar',x,y:1.9+h/2,w:1.05+.3*difficulty,h,phase:0});
    }
    if(type===1) hazards.push({id:`moving-${i}`,type:'moving',x,y:6.7,w:1.4,h:1.4,phase:i*.8+level*.4,frequency:config.movingSpeed,amplitude:config.movingAmplitude});
    if(type===2) {
      const lowerTop=center-gap/2, upperBottom=center+gap/2;
      hazards.push({id:`gate-low-${i}`,type:'gate',x,y:(1.9+lowerTop)/2,w:1.0,h:lowerTop-1.9,phase:0});
      hazards.push({id:`gate-high-${i}`,type:'gate',x,y:(upperBottom+13)/2,w:1.0,h:13-upperBottom,phase:0});
    }
    sections.push({x,type,safeY:type===2?center:type===0?9.7:11.1});
    pickups.push({id:i,x:x-6,y:type===2?center:type===0?9.7:5,collected:false});
  }
  return {config,hazards,pickups,sections};
}
export function createGame(number=1) {
  return {status:'ready',x:4,y:DOCK_Y,vx:0,vy:0,carX:4,hp:100,lives:MAX_LIVES,score:0,time:0,distance:4,
    docked:true,invincible:0,stun:0,respawn:0,event:'ready',eventId:0,...createLevel(number)};
}
export function nextLevel(g) {
  return g.status==='won'&&g.config.level<LEVEL_COUNT ? createGame(g.config.level+1) : null;
}
// A vertical-only stick: positive means climb. Small movements around the center are ignored.
export function joystickAxis(offset,travel=40) {
  const raw=Math.max(-1,Math.min(1,-offset/travel));
  return Math.abs(raw)<.13?0:Math.sign(raw)*(Math.abs(raw)-.13)/.87;
}
export function verticalInput(input) {
  return input.up?1:input.down?-1:Math.max(-1,Math.min(1,Number(input.axis)||0));
}
function announce(g,event) {g.event=event;g.eventId++;}
export function startGame(g) {if(g.status==='ready'){g.status='playing';takeOff(g);}}
export function takeOff(g) {
  if(g.status!=='playing'||!g.docked||g.respawn>0)return;
  g.docked=false;g.y=DOCK_Y+.42;g.vy=4.2;g.invincible=Math.max(g.invincible,1.3);announce(g,'takeoff');
}
export function pauseGame(g) {if(g.status==='playing')g.status='paused';}
export function resumeGame(g) {if(g.status==='paused')g.status='playing';}
export function loseLife(g) {
  if(g.status!=='playing'||g.respawn>0)return;
  g.lives--;g.hp=0;g.vx=g.vy=0;
  if(g.lives<=0){g.status='lost';announce(g,'lost');return;}
  g.respawn=1.6;announce(g,'life-lost');
}
export function damage(g,amount=34) {
  if(g.status!=='playing'||g.docked||g.invincible>0||g.respawn>0)return false;
  g.hp=Math.max(0,g.hp-amount);g.invincible=1.65;g.stun=.3;g.vx=0;g.vy=-2.6;
  if(g.hp===0)loseLife(g);else announce(g,'hit');
  return true;
}
export function hazardY(h,time) {return h.y+(h.type==='moving'?Math.sin(time*(h.frequency??1.3)+h.phase)*(h.amplitude??2.8):0);}
export function overlaps(g,h) {
  const cx=Math.max(h.x-h.w/2,Math.min(g.x,h.x+h.w/2));
  const cy=Math.max(hazardY(h,g.time)-h.h/2,Math.min(g.y,hazardY(h,g.time)+h.h/2));
  return (g.x-cx)**2+(g.y-cy)**2<BIRD_RADIUS**2;
}
export function tick(g,input,delta) {
  if(g.status!=='playing'||!Number.isFinite(delta)||delta<=0)return;
  // Bounded steps prevent tunnelling even when a device delivers a long frame.
  const steps=Math.max(1,Math.ceil(Math.min(delta,.25)/(1/60))), dt=Math.min(delta,.25)/steps;
  for(let i=0;i<steps&&g.status==='playing';i++)step(g,input,dt);
}
function step(g,input,dt) {
  g.time+=dt;g.invincible=Math.max(0,g.invincible-dt);g.stun=Math.max(0,g.stun-dt);
  if(g.respawn>0){
    g.respawn=Math.max(0,g.respawn-dt);
    if(g.respawn===0){g.x=g.carX;g.y=DOCK_Y;g.hp=100;g.docked=true;g.stun=0;g.invincible=2;announce(g,'respawn');}
    return;
  }
  const axis=verticalInput(input);
  if(g.docked){
    g.x=g.carX;g.y=DOCK_Y;g.vx=g.vy=0;g.hp=Math.min(100,g.hp+20*dt);
    if(axis>.15||input.launch)takeOff(g);
    return;
  }
  const previousY=g.y;
  if(g.stun===0){
    const desiredX=axis<-.15&&g.y<4.5?1.2:g.config.speed;
    const desiredY=axis>=0?axis*5.2:axis*(g.y<3?1.7:4.6);
    const smoothing=1-Math.exp(-dt*5);
    g.vx+=(desiredX-g.vx)*smoothing;g.vy+=(desiredY-g.vy)*smoothing;
  }
  g.x=Math.max(0,g.x+g.vx*dt);g.y=Math.min(12.1,g.y+g.vy*dt);
  if(g.y===12.1)g.vy=Math.min(g.vy,0);
  // Truck only follows the bird; waiting on its roof cannot finish the level.
  const carTarget=g.x-.5, carStep=Math.max(-7*dt,Math.min(7*dt,(carTarget-g.carX)*3*dt));
  g.carX=Math.max(0,g.carX+carStep);
  if(g.vy<=0&&g.y<=DOCK_Y+.13&&previousY>=DOCK_Y-.1&&Math.abs(g.x-g.carX)<1.3&&Math.abs(g.vy)<3.4&&g.stun===0){
    g.docked=true;g.y=DOCK_Y;g.vx=g.vy=0;announce(g,'landed');return;
  }
  if(g.y<.35){loseLife(g);return;}
  for(const h of g.hazards){if(Math.abs(h.x-g.x)<2&&overlaps(g,h)){if(damage(g))break;}}
  if(g.respawn>0||g.status!=='playing')return;
  for(const p of g.pickups){if(!p.collected&&(p.x-g.x)**2+(p.y-g.y)**2<.8**2){p.collected=true;g.score+=10;announce(g,'pickup');}}
  g.distance=Math.max(g.distance,g.x);
  if(g.x>=g.config.length){g.status='won';announce(g,'won');}
}
