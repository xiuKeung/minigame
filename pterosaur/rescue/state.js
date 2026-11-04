import {levelConfig} from './levels.js?v=14';
export {LEVEL_COUNT,levelConfig} from './levels.js?v=14';
export const WORLD=levelConfig(1).world;
export function createRescue(level=1){
 const config=levelConfig(level);
 return {docking:null,fx:[],fxId:0,bricks:[false,false,false],rescued:false,gateOpen:!config.coopGate,gateHeld:false,damageTaken:0,config,world:config.world,cellsDelivered:0,status:'ready',active:'truck',docked:true,recalling:false,truck:{x:7,y:0,hp:100},bird:{x:7,y:1.8,hp:100},crate:14,crateParked:false,battery:'shelf',batteryPos:{...config.world.battery},bridgeEnabled:false,bridgeOpen:false,plateHeld:false,powered:false,turretHp:config.turretHp,turretOff:false,wallBroken:false,energy:100,shield:false,dash:0,attack:0,invincible:0,lives:8,time:0,shots:[],fireTimer:2,towing:false,event:'ready',eventId:0,checkpoint:7,respawn:0};
}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const near=(a,b,r=2.1)=>Math.hypot(a.x-b.x,a.y-b.y)<r;
export function feedback(s,type,x=s.bird.x,y=s.bird.y){s.fx.push({id:++s.fxId,type,x,y,time:s.time});if(s.fx.length>16)s.fx.shift();}
export function stars(s){return s.status==='won'?1+(s.bricks.every(Boolean)?1:0)+(s.rescued&&s.lives===8?1:0):0;}
export function liftOffset(s){return s.config.lift?Math.sin(s.time*.8)*.8:0;}
export function scannerPose(s){const phase=s.time%4;return {x:s.world.scanner.x,y:7+Math.sin(s.time*1.2)*2,active:phase>=1.2&&phase<3.2,warning:phase<1.2};}
export function announce(s,text){s.event=text;s.eventId++;}
export function start(s){if(s.status==='ready')s.status='playing';}
export function pause(s){if(s.status==='playing')s.status='paused';}
export function resume(s){if(s.status==='paused')s.status='playing';}
export function switchRole(s){
 if(s.status!=='playing'||s.respawn>0||s.docking)return;
 s.recalling=false;
 if(s.docked){s.docked=false;s.active='bird';s.bird.x=s.truck.x;s.bird.y=3.4;announce(s,'翼龙出动 · 可以飞到高处，战车会留在原地。');}
 else{s.active=s.active==='truck'?'bird':'truck';announce(s,s.active==='truck'?'战车接管 · 可以推箱或牵引。':'翼龙接管 · 高处的开关正在等你。');}
}
export function dock(s){
 if(s.status!=='playing'||s.respawn>0||s.docking)return;
 if(s.docked){switchRole(s);return;}
 if(s.recalling){s.recalling=false;announce(s,'召回已取消 · 可以切换翼龙继续探索。');return;}
 if(Math.abs(s.bird.x-s.truck.x)>3.3||s.bird.y>4.1){s.recalling=true;s.active='truck';announce(s,'已呼叫翼龙返航 · 战车可继续行驶，随时切换翼龙接管。');return;}
 s.recalling=false;s.active='truck';s.dash=0;s.docking={elapsed:0,x:s.bird.x,y:s.bird.y};announce(s,'正在对准车顶 · 收翼落座');
}
function finishDock(s){
 s.docking=null;if(s.battery==='bird')s.battery='truck';feedback(s,'dock',s.truck.x,2);
 s.docked=true;s.active='truck';s.shield=false;s.towing=false;announce(s,s.powered?'合体成功 · 能量足够时可冲刺撞开裂墙。':'合体成功 · 正在修复，找到电池给供电站充能。');
}
export function actionLabel(s){
 if(s.active==='bird'&&!s.docked){
  const b=s.bird;
  if(s.battery==='bird'){
   if(near(b,{x:s.world.station,y:2.5},3))return '装入供电插槽';
   if(near(b,{x:s.truck.x,y:2.4},3))return '放到战车货架';
   return '放下电池';
  }
  if((s.battery==='shelf'||s.battery==='ground')&&near(b,s.batteryPos,2.2))return '抓取电池';
  if(s.battery==='truck'&&near(b,{x:s.truck.x,y:2.4},3))return '取出车上电池';
  if(s.config.coopGate&&!s.gateOpen&&near(b,s.world.gateSwitch,2.1))return !s.powered?'闸门需要供电':s.gateHeld?'解锁协作闸门':'战车需停在蓝色压板';
  if(!s.rescued&&near(b,s.world.rescue,1.8))return '救援迷路探测器';
  if(!s.bridgeEnabled&&near(b,s.world.bridgeSwitch,2.3))return '解锁桥梁控制';
  if(!s.turretOff&&s.turretHp>0&&near(b,s.world.terminal,2.3))return s.config.terminalNeedsPower&&!s.powered?'终端需要供电':'关闭防御炮台';
 }else{
  if(Math.abs(s.truck.x-s.world.station)<3&&!s.powered)return (s.battery==='truck'||s.battery==='socket')?'接通供电站':'供电站需要电池';
  if(s.towing)return '松开牵引';
  if(Math.abs(s.truck.x-s.crate)<3.2&&!s.powered)return '牵引重箱';
 }
 return '';
}
export function interact(s){
 if(s.status!=='playing'||s.respawn>0||s.docking)return;
 const label=actionLabel(s);
 if(label==='抓取电池'||label==='取出车上电池'){s.battery='bird';announce(s,'电池已抓住 · 负重飞行较慢，携带时无法攻击。');}
 else if(label==='放到战车货架'){s.battery='truck';announce(s,'电池已装车 · 驾驶战车前往供电站。');}
 else if(label==='装入供电插槽'){s.battery='socket';announce(s,'电池已就位 · 让战车驶到供电站，接通动力。');}
 else if(label==='放下电池'){s.battery='ground';s.batteryPos={x:s.bird.x,y:Math.max(1.6,s.bird.y-1)};announce(s,'电池已放下，可以再次抓取。');}
 else if(label==='解锁桥梁控制'){s.bridgeEnabled=true;announce(s,'桥梁已解锁 · 压住河岸的金色压力板，桥面才会升起。');}
 else if(label==='关闭防御炮台'){s.turretOff=true;s.shots=[];announce(s,'防御已关闭 · 不战斗也能安全通过。');}
 else if(label==='接通供电站'){
  s.cellsDelivered++;feedback(s,'power',s.world.station,2.5);s.energy=100;s.truck.hp=s.bird.hp=100;
  if(s.cellsDelivered>=s.config.requiredCells){s.battery='installed';s.powered=true;s.checkpoint=s.world.station;announce(s,'供电恢复！检查点已保存 · 合体后冲刺突破裂墙。');}
  else{s.battery='shelf';s.batteryPos={...s.world.cells[s.cellsDelivered]};announce(s,`能源已接入 ${s.cellsDelivered}/${s.config.requiredCells} · 继续寻找下一枚电池。`);}
 }
 else if(label==='解锁协作闸门'){s.gateOpen=true;feedback(s,'power',s.world.gate,3);announce(s,'空地协作完成 · 闸门已永久解锁。');}
 else if(label==='救援迷路探测器'){s.rescued=true;feedback(s,'rescue');announce(s,'探测器救援成功！无损失生命通关可多获一星。');}
 else if(label==='牵引重箱'){s.towing=true;s.crateParked=false;announce(s,'牵引已连接 · 前后移动箱子，放到金色压力板上。');}
 else if(label==='松开牵引'){s.towing=false;announce(s,'牵引已松开。');}
 else announce(s,label||'靠近电池、开关或重箱后再互动。');
}
export function skill(s){
 if(s.status!=='playing'||s.respawn>0||s.docking)return;
 if(s.active==='bird'&&!s.docked){
  if(s.battery==='bird'){announce(s,'携带电池时无法攻击，先把它放下。');return;}
  if(s.attack>0)return;
  s.attack=.65;feedback(s,'attack');
  if(!s.turretOff&&s.turretHp>0&&near(s.bird,s.world.turret,5)){
   s.turretHp=Math.max(0,s.turretHp-25);feedback(s,s.turretHp?'hit':'destroy',s.world.turret.x,s.world.turret.y);announce(s,s.turretHp===0?'炮台已拆除 · 通路安全。':`俯冲命中！炮台剩余 ${s.turretHp} 耐久。`);
   if(!s.turretHp)s.shots=[];
  }else announce(s,'俯冲打击 · 靠近炮台的发光核心再攻击。');
 }else if(s.docked){
  if(!s.powered){announce(s,'先修复供电站，才能启用合体冲刺。');return;}
  if(s.energy<35||s.dash>0){announce(s,'等待能量恢复后再冲刺。');return;}
  s.energy-=35;s.dash=.9;feedback(s,'dash',s.truck.x,1.3);s.towing=false;announce(s,'合体冲刺！');
 }else{
  if(!s.shield&&s.energy<10){announce(s,'护盾能量不足，稍等片刻。');return;}
  s.shield=!s.shield;feedback(s,'shield',s.truck.x,1.5);announce(s,s.shield?'护盾展开 · 切换翼龙后仍会保护战车周围。':'护盾收起 · 能量恢复中。');
 }
}
export function hurt(s,role,amount=s.config.damage){
 if(s.invincible>0||s.respawn>0||s.status!=='playing')return;
 s.damageTaken+=amount;feedback(s,'damage',s[role].x,role==='bird'?s.bird.y:1.3);s[role].hp=Math.max(0,s[role].hp-amount);s.invincible=1.2;announce(s,'受到攻击！靠近战车合体修复，或用护盾抵挡。');
 if(s[role].hp===0){s.lives--;s.docking=null;s.recalling=false;s.shield=false;s.dash=0;s.shots=[];s.towing=false;
  if(s.lives<=0){s.status='lost';announce(s,'救援机会已用完。');}
  else{s.respawn=1.5;announce(s,'搭档正在接应 · 即将返回检查点。');}
 }
}
export function objective(s){
 if(!s.bridgeEnabled)return '让翼龙飞到对岸高台，解锁桥梁开关。';
 if(s.truck.x<s.world.bridgeEnd&&!s.powered)return '把重箱推到金色压力板，保持桥面升起，再驾驶战车过桥。';
 if(!s.powered)return s.battery==='shelf'||s.battery==='ground'?`寻找能源 ${s.cellsDelivered+1}/${s.config.requiredCells}：翼龙抓取电池，可装车或送入插槽。`:'把电池送到供电站，让战车靠近后接通动力。';
 if(!s.gateOpen)return s.gateHeld?'战车保持压板，切换翼龙去上方终端解锁闸门。':'把战车停在电站右侧的蓝色压板上，再让翼龙操作高处终端。';
 if(!s.wallBroken)return '让翼龙回到车顶合体，向裂墙发动动力冲刺。';
 return '驾驶合体战车抵达绿色出口。';
}
export function tick(s,input,delta){
 if(s.status!=='playing'||!Number.isFinite(delta)||delta<=0)return;
 const steps=Math.ceil(Math.min(delta,.25)*60),dt=Math.min(delta,.25)/steps;
 for(let i=0;i<steps&&s.status==='playing';i++)step(s,input,dt);
}
function step(s,input,dt){
 s.time+=dt;s.invincible=Math.max(0,s.invincible-dt);s.attack=Math.max(0,s.attack-dt);
 if(s.respawn>0){s.respawn=Math.max(0,s.respawn-dt);if(!s.respawn){s.truck.x=s.checkpoint;s.truck.hp=s.bird.hp=100;s.docked=true;s.active='truck';s.bird.x=s.truck.x;s.bird.y=1.8;s.energy=100;s.invincible=2;if(s.battery==='bird')s.battery='truck';}return;}
 const x=s.docking?0:clamp(input.x||0,-1,1),y=s.docking?0:clamp(input.y||0,-1,1);
 s.energy=clamp(s.energy+dt*(s.shield?-23:s.docked?18:9),0,100);if(!s.energy)s.shield=false;
 if(s.docked){s.truck.hp=Math.min(100,s.truck.hp+12*dt);s.bird.hp=Math.min(100,s.bird.hp+20*dt);}
 if(s.active==='bird'&&!s.docked){
  const speed=s.battery==='bird'?3.5:6;
  s.bird.x=clamp(s.bird.x+x*speed*dt,2,s.wallBroken?s.world.end-1:s.world.wall-1.4);s.bird.y=clamp(s.bird.y+y*speed*dt,1.8,11.5);
 }else{
  const before=s.truck.x;let next=clamp(before+(s.dash>0?16:x*5)*dt,3,s.world.end-1);
  if(!s.bridgeOpen&&next>s.world.bridgeStart-2&&next<s.world.bridgeEnd+2){
   next=before<s.world.bridgeStart?s.world.bridgeStart-2:before>s.world.bridgeEnd?s.world.bridgeEnd+2:before;
  }
  if(!s.gateOpen&&next>s.world.gate-2.3)next=s.world.gate-2.3;
  if(!s.wallBroken&&next>s.world.wall-2.3){
   if(s.dash>0&&s.powered&&s.docked){s.wallBroken=true;feedback(s,'break',s.world.wall,3);announce(s,'裂墙突破！把搭档一起带到出口。');}
   else next=s.world.wall-2.3;
  }
  if(s.towing){s.crate=clamp(s.crate+next-before,8,s.world.bridgeStart-3);if(Math.abs(s.crate-next)>3.3)s.towing=false;}
  else if(!s.crateParked&&Math.abs(next-s.crate)<2.4&&Math.abs(next-s.crate)<Math.abs(before-s.crate)){
   const direction=Math.sign(next-before);s.crate=clamp(next+direction*2.4,8,s.world.bridgeStart-3);next=s.crate-direction*2.4;
  }
  s.truck.x=next;
 }
 s.dash=Math.max(0,s.dash-dt);
 if(!s.towing&&!s.crateParked&&Math.abs(s.crate-s.world.plate)<1.2){s.crate=s.world.plate;s.crateParked=true;announce(s,'重箱已滑入压力板卡槽 · 可以从旁边通行。');}
 s.plateHeld=Math.abs(s.crate-s.world.plate)<1.2||Math.abs(s.truck.x-s.world.plate)<1.4;
 // Once the vehicle is crossing, a mechanical latch holds the bridge until it reaches land.
 s.bridgeOpen=s.bridgeEnabled&&(s.plateHeld||(s.truck.x>s.world.bridgeStart-2&&s.truck.x<s.world.bridgeEnd+2));
 if(s.recalling&&!s.docked){
  const dx=s.truck.x-s.bird.x,dy=2.8-s.bird.y,distance=Math.hypot(dx,dy),travel=Math.min(s.battery==='bird'?4:7,Math.max(1.5,distance*2))*dt;
  if(distance<1){s.recalling=false;dock(s);}
  else{s.bird.x+=dx/distance*Math.min(travel,distance);s.bird.y+=dy/distance*Math.min(travel,distance);}
 }
 if(s.docking){
  s.docking.elapsed+=dt;const t=Math.min(1,s.docking.elapsed/.9),ease=t*t*(3-2*t);
  s.bird.x=s.docking.x+(s.truck.x-s.docking.x)*ease;
  s.bird.y=s.docking.y+(1.8-s.docking.y)*ease+Math.sin(t*Math.PI)*.25;
  if(t===1)finishDock(s);
 }
 if(s.docked){s.bird.x=s.truck.x;s.bird.y=1.8;}
 if(s.battery==='shelf')s.batteryPos={x:s.world.cells[s.cellsDelivered].x,y:s.world.cells[s.cellsDelivered].y+liftOffset(s)};
 if(s.battery==='bird')s.batteryPos={x:s.bird.x,y:s.bird.y-.8};
 if(s.battery==='truck')s.batteryPos={x:s.truck.x-.8,y:2.1};
 if(s.config.wind&&!s.docked&&s.bird.x>s.world.bridgeEnd&&s.bird.x<s.world.station&&s.bird.y>5&&!s.recalling&&!s.docking)s.bird.y=clamp(s.bird.y+Math.sin(s.time*1.8)*s.config.wind*dt,1.8,11.5);
 if(s.battery==='ground')s.batteryPos.y=Math.max(1,s.batteryPos.y-dt*3);
 s.gateHeld=Math.abs(s.truck.x-s.world.gatePlate)<1.6;
 for(let i=0;i<s.bricks.length;i++)if(!s.bricks[i]&&!s.docked&&near(s.bird,s.world.bricks[i],1)){
  s.bricks[i]=true;s.energy=Math.min(100,s.energy+15);feedback(s,'collect',s.world.bricks[i].x,s.world.bricks[i].y);announce(s,`探索积木 ${s.bricks.filter(Boolean).length}/3 · 能量 +15`);
 }
 if(s.config.scanner&&!s.docked&&!s.powered){const scan=scannerPose(s);if(scan.active&&Math.abs(s.bird.x-scan.x)<1.35&&Math.abs(s.bird.y-scan.y)<.7){
  if(!(s.shield&&near(s.bird,{x:s.truck.x,y:1.7},3)))hurt(s,'bird',20);
 }}
 if(!s.turretOff&&s.turretHp>0){
  const target=s.active==='bird'&&!s.docked?s.bird:{x:s.truck.x,y:1.3};
  if(Math.abs(target.x-s.world.turret.x)<18){s.fireTimer-=dt;if(s.fireTimer<=0){s.fireTimer=s.config.fireInterval;const dx=target.x-s.world.turret.x,dy=target.y-s.world.turret.y,len=Math.hypot(dx,dy)||1;s.shots.push({x:s.world.turret.x,y:s.world.turret.y,vx:dx/len*s.config.shotSpeed,vy:dy/len*s.config.shotSpeed,ttl:4});}}
 }
 for(const shot of s.shots){
  shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;shot.ttl-=dt;
  if(s.shield&&near(shot,{x:s.truck.x,y:1.7},3)){feedback(s,'block',shot.x,shot.y);shot.ttl=0;continue;}
  if(near(shot,{x:s.truck.x,y:1.2},1)){shot.ttl=0;hurt(s,'truck');}
  else if(!s.docked&&near(shot,s.bird,.7)){shot.ttl=0;hurt(s,'bird');}
 }
 s.shots=s.shots.filter(p=>p.ttl>0&&p.y>0);
 if(s.truck.x>=s.world.exit&&s.docked&&s.powered&&s.wallBroken){s.status='won';feedback(s,'win',s.truck.x,3);announce(s,'供电站恢复，搭档平安归来！');}
}

export function nextLevel(s){return s.status==='won'&&s.config.level<20?createRescue(s.config.level+1):null;}
