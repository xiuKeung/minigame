import * as THREE from '../vendor/three.module.js';
import {buildModel} from '../model.js';
import {buildTank} from '../tank/model.js';
import {LEVELS} from './levels.js';

const $=id=>document.getElementById(id);
let levelIndex=0,level=LEVELS[levelIndex];
const levelSelect=$('level-select');
const scene=new THREE.Scene();
scene.background=new THREE.Color(level.palette.sky);
scene.fog=new THREE.Fog(level.palette.sky,22,48);
const host=$('scene');
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.shadowMap.enabled=true;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;host.append(renderer.domElement);
const camera=new THREE.OrthographicCamera(-10,10,8,-8,.1,80);camera.position.set(0,2,28);camera.lookAt(0,2,0);
scene.add(new THREE.HemisphereLight(0xfffdf4,0x7a9081,2.6));
const sun=new THREE.DirectionalLight(0xffe2a5,2.3);sun.position.set(-8,16,14);sun.castShadow=true;scene.add(sun);
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.7,...extra});
const mats={gold:mat('#efb63b',{emissive:'#875c00',emissiveIntensity:.2}),orange:mat('#f18e45',{emissive:'#8d3600',emissiveIntensity:.3}),red:mat('#d66f5d',{emissive:'#6f1f18',emissiveIntensity:.3}),slowBullet:mat('#7189df',{emissive:'#263e96',emissiveIntensity:.7}),dark:mat('#39473c'),mint:mat('#78b49a',{emissive:'#2f8166',emissiveIntensity:.3}),blue:mat('#6c9fd1',{emissive:'#244f80',emissiveIntensity:.3}),violet:mat('#9a88c9',{emissive:'#473776',emissiveIntensity:.3})};
function mesh(geo,material,parent=scene){const o=new THREE.Mesh(geo,material);o.castShadow=o.receiveShadow=true;parent.add(o);return o}
function topDownRig(template,scale,heading=Math.PI/2){const rig=new THREE.Group(),visual=template.clone(true);visual.rotation.x=Math.PI/2;rig.rotation.z=heading;rig.scale.setScalar(scale);rig.add(visual);return rig}
function sideViewRig(template,scale){const rig=new THREE.Group(),visual=template.clone(true);visual.position.y=-1.3;rig.scale.setScalar(scale);rig.add(visual);return rig}

const tankRig=buildTank(),player=new THREE.Group();
tankRig.tank.rotation.x=Math.PI/2;player.rotation.z=Math.PI/2;player.add(tankRig.tank);tankRig.tank.scale.setScalar(.32);player.position.set(0,-3,0);scene.add(player);
const shieldVisual=new THREE.Group(),shieldFrameMaterial=new THREE.MeshBasicMaterial({color:'#48d7c1',transparent:true,opacity:.96,depthWrite:false}),shieldGlowMaterial=new THREE.MeshBasicMaterial({color:'#9bffdf',transparent:true,opacity:.86,depthWrite:false});for(const [x,y,w,h,material] of [[-.74,0,.24,.07,shieldFrameMaterial],[.74,0,.24,.07,shieldFrameMaterial],[0,-.74,.07,.24,shieldFrameMaterial],[0,.74,.07,.24,shieldFrameMaterial],[0,-.96,.36,.045,shieldGlowMaterial],[0,.96,.36,.045,shieldGlowMaterial]]){const part=new THREE.Mesh(new THREE.BoxGeometry(w,h,.03),material);part.position.set(x,y,.1);shieldVisual.add(part)}shieldVisual.visible=false;player.add(shieldVisual);
const slowMarkerMaterial=new THREE.MeshBasicMaterial({color:'#657fd4',transparent:true,opacity:.72,depthWrite:false});
const tankFlashMaterials=Object.values(tankRig.materials).map(material=>({material,color:material.emissive.clone(),intensity:material.emissiveIntensity}));
const enemyRig=buildModel();enemyRig.poseCreature({stand:0,wing:.42});
const combinedTemplate=enemyRig.model,carrierTemplate=enemyRig.chassis.clone(true);
const enemies=[],droppedCars=[],shots=[],enemyShots=[],sparks=[],powerups=[];
const enemyLayer=new THREE.Group();scene.add(enemyLayer);
const bulletGeo=new THREE.SphereGeometry(.14,10,8),enemyBulletGeo=new THREE.SphereGeometry(.18,10,8);
const POWERUPS={double:{name:'双炮',duration:9,material:mats.gold},spread:{name:'散射',duration:8,material:mats.blue},rapid:{name:'速射',duration:8,material:mats.orange},shield:{name:'护盾',duration:7,material:mats.mint},slow:{name:'减速时间',duration:7,material:mats.violet}};
const powerTimers=Object.fromEntries(Object.keys(POWERUPS).map(key=>[key,0]));
let state='ready',time=0,last=performance.now(),playerX=0,move=0,fireClock=0,waveIndex=0,score=0,lives=level.player.lives,deployClock=0,enemyFireClock=0,waveDefeats=0,deployTurn=0,invulnerable=0,playerHitTimer=0,shieldImpactTimer=0,shakeTimer=0,lifeFlashTimer=0;
function say(){}
function burst(pos,color='#efb63b',count=12){for(let i=0;i<count;i++){const s=mesh(new THREE.SphereGeometry(.055,6,5),new THREE.MeshBasicMaterial({color,transparent:true}));s.position.copy(pos);s.userData={v:new THREE.Vector3((Math.random()-.5)*7,(Math.random()-.5)*7,Math.random()-.5),life:.45};sparks.push(s)}}
function laneLimit(padding=.75){return Math.max(2,camera.right-padding)}
function formationSlots(count,lane,formation){
  const columns=formation==='line'?count:Math.min(3,Math.ceil(count/2));const gap=Math.min(2.05,(lane*2)/(columns+1));const slots=[];
  for(let i=0;i<count;i++){
    const row=Math.floor(i/columns),inRow=Math.min(columns,count-row*columns),col=i-row*columns;
    let x=(col-(inRow-1)/2)*gap,y=6.35+row*.92;
    if(formation==='stagger'&&row%2)x+=gap*.38;
    if(formation==='wedge')y+=Math.abs(col-(inRow-1)/2)*.42;
    slots.push({x,y,row});
  }
  return slots;
}
function formationOffset(wave){
  if(wave.driftPattern==='still')return 0;
  const speed=wave.driftPattern==='sweep'?.72:wave.driftPattern==='pulse'?1.7:1.15;
  const strength=wave.driftPattern==='pulse'?.68:1;
  return Math.sin(time*speed)*wave.drift*strength;
}
function pickDeploymentTarget(wave){
  const targets=enemies.filter(e=>e.parent&&e.userData.phase==='combined');
  if(!targets.length)return null;
  if(wave.deployPattern==='alternate'){
    targets.sort((a,b)=>a.userData.homeX-b.userData.homeX);
    const target=targets[deployTurn%2?targets.length-1:0];deployTurn++;return target;
  }
  return targets.sort((a,b)=>b.userData.row-a.userData.row)[0];
}
function spawnWave(index){
  enemyLayer.clear();enemies.length=0;droppedCars.splice(0).forEach(o=>o.removeFromParent());
  const wave=level.waves[index],lane=laneLimit(1),slots=formationSlots(wave.count,lane,wave.formation);
  slots.forEach(slot=>{const combined=topDownRig(combinedTemplate,.24),slowMarker=new THREE.Mesh(new THREE.RingGeometry(.76,.84,20),slowMarkerMaterial);slowMarker.position.z=.12;slowMarker.visible=false;combined.add(slowMarker);combined.position.set(slot.x,slot.y,0);combined.userData={homeX:slot.x,homeY:slot.y,row:slot.row,health:wave.health,phase:'combined',phaseTime:0,slowMarker};enemyLayer.add(combined);enemies.push(combined)});
  waveIndex=index;waveDefeats=0;deployTurn=0;deployClock=wave.firstDeployAfter;enemyFireClock=wave.firstProjectileAfter;say(`${wave.label} · 留意投放、俯冲与炮火`);sync();
}
function makeShot(xOffset=0,xVelocity=0){const b=mesh(bulletGeo,mats.gold);b.position.set(playerX+xOffset,player.position.y+.82,.3);b.userData={vx:xVelocity,vy:17};shots.push(b)}
function shoot(){
  if(state!=='playing')return;
  const barrels=powerTimers.double>0?[-.28,.28]:[0];const spread=powerTimers.spread>0?[-2,0,2]:[0];
  barrels.forEach(barrel=>spread.forEach(vx=>makeShot(barrel,vx)));
}
function enemyShoot(x,y){const b=mesh(enemyBulletGeo,mats.red);b.position.set(x,y,.1);b.userData={v:-8};enemyShots.push(b)}
function powerPart(geometry,material){const part=new THREE.Mesh(geometry,material);part.castShadow=part.receiveShadow=true;return part}
function powerLabel(text,color){const canvas=document.createElement('canvas'),context=canvas.getContext('2d');canvas.width=320;canvas.height=132;context.fillStyle=color;context.fillRect(0,0,canvas.width,canvas.height);context.strokeStyle='#fff8d8';context.lineWidth=8;context.strokeRect(5,5,310,122);context.fillStyle='#000000';context.font='800 74px sans-serif';context.textAlign='center';context.textBaseline='middle';context.fillText(text,160,69);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,depthWrite:false}));sprite.scale.set(1.16,.48,1);return sprite}
function powerModule(type){
  const module=new THREE.Group(),material=POWERUPS[type].material,glow=new THREE.MeshBasicMaterial({color:material.color,transparent:true,opacity:.76});
  const halo=powerPart(new THREE.TorusGeometry(.45,.04,8,20),glow);halo.position.z=-.04;module.add(halo);
  const tile=powerPart(new THREE.BoxGeometry(.94,.43,.1),material);module.add(tile);
  const label=powerLabel(POWERUPS[type].name,`#${material.color.getHexString()}`);label.position.z=.08;module.add(label);
  return module;
}
function spawnPowerup(pos,drop){
  const orb=powerModule(drop.type),lane=laneLimit(1.25);let x=pos.x;
  if(drop.landing==='safe')x=THREE.MathUtils.clamp(playerX+(waveDefeats%2?.9:-.9),-lane,lane);
  if(drop.landing==='gap')x=THREE.MathUtils.clamp((waveDefeats%2?.55:-.55),-lane,lane);
  orb.scale.setScalar(1.2);orb.position.set(x,pos.y,.05);orb.userData={type:drop.type,v:2.0,phase:Math.random()*Math.PI*2};scene.add(orb);powerups.push(orb);
}
function activatePower(type){if(type==='double')powerTimers.spread=0;if(type==='spread')powerTimers.double=0;powerTimers[type]=POWERUPS[type].duration;score+=40;burst(player.position,POWERUPS[type].material.color,16);sync()}
function damage(text='坦克受击！'){
  if(invulnerable>0)return;
  if(powerTimers.shield>0){invulnerable=.18;shieldImpactTimer=.48;burst(player.position,'#49d6c0',20);return}
  lives--;invulnerable=.62;playerHitTimer=.42;shakeTimer=.16;lifeFlashTimer=.42;burst(player.position,'#e36a4e',24);say(lives?text:'战斗结束',2);
  if(lives<=0)end('坦克已损坏','再试一次：利用强化挡住压力，并通过横移躲开投放战车和俯冲翼龙。','重新开始');sync();
}
function updateFeedback(dt){
  invulnerable=Math.max(0,invulnerable-dt);playerHitTimer=Math.max(0,playerHitTimer-dt);shieldImpactTimer=Math.max(0,shieldImpactTimer-dt);shakeTimer=Math.max(0,shakeTimer-dt);lifeFlashTimer=Math.max(0,lifeFlashTimer-dt);
  const flash=playerHitTimer>0?(.38+.62*Math.abs(Math.sin(time*36))):0;
  tankFlashMaterials.forEach(({material,color,intensity})=>{material.emissive.copy(color).lerp(new THREE.Color('#e54532'),flash);material.emissiveIntensity=intensity+flash*.9});
  const shieldFlash=shieldImpactTimer>0?shieldImpactTimer/.48:0;shieldVisual.visible=shieldFlash>0;shieldVisual.scale.setScalar(1+(1-shieldFlash)*.5);shieldFrameMaterial.opacity=.4+shieldFlash*.56;shieldGlowMaterial.opacity=.3+shieldFlash*.56;
  const shake=shakeTimer>0?(shakeTimer/.16)*.13:0;camera.position.set((Math.random()-.5)*shake,2+(Math.random()-.5)*shake,28);camera.lookAt(0,2,0);
}
function end(title,copy,label){state=title==='关卡完成'?'won':'lost';$('overlay').hidden=false;$('overlay').querySelector('.eyebrow').textContent=state==='won'?'关卡包 · 完成':'关卡包 · 失败';$('overlay').querySelector('h2').textContent=title;$('overlay').querySelector('p:not(.eyebrow)').textContent=copy;$('start').textContent=label}
function advance(){if(waveIndex<level.waves.length-1)spawnWave(waveIndex+1);else{const hasNext=levelIndex<LEVELS.length-1;end('关卡完成',hasNext?`关卡 ${String(levelIndex+1).padStart(2,'0')} 完成，下一关会带来新的编队压力。`:'你已完成 20 个关卡。可重新挑战铁翼终局。',hasNext?'下一关':'再玩一次')}}
function showLevelIntro(){const overlay=$('overlay');overlay.hidden=false;overlay.querySelector('.eyebrow').textContent=`${level.chapter} · ${String(levelIndex+1).padStart(2,'0')} / ${String(LEVELS.length).padStart(2,'0')}`;overlay.querySelector('h2').textContent=`${level.name} · 编队接近`;overlay.querySelector('p:not(.eyebrow)').textContent='部分波次会在指定击破节点投放强化模块。接住后可短时获得双炮、散射、速射、护盾或减速时间。';$('start').textContent='开始'}
function loadLevel(index){levelIndex=THREE.MathUtils.clamp(index,0,LEVELS.length-1);level=LEVELS[levelIndex];levelSelect.value=String(levelIndex);scene.background.set(level.palette.sky);scene.fog.color.set(level.palette.fog)}
function clearPowerups(){powerups.splice(0).forEach(o=>o.removeFromParent());Object.keys(powerTimers).forEach(key=>powerTimers[key]=0)}
function reset(){
  enemyLayer.clear();enemies.length=0;[...shots,...enemyShots,...sparks].forEach(o=>o.removeFromParent());shots.length=enemyShots.length=sparks.length=0;droppedCars.splice(0).forEach(o=>o.removeFromParent());clearPowerups();
  time=0;playerX=0;move=0;fireClock=0;waveIndex=0;score=0;lives=level.player.lives;deployClock=0;enemyFireClock=0;waveDefeats=0;deployTurn=0;invulnerable=playerHitTimer=shieldImpactTimer=shakeTimer=lifeFlashTimer=0;camera.position.set(0,2,28);state='playing';$('overlay').hidden=true;spawnWave(0);say('坦克自动开火 · 左右躲避投放与炮火',3);
}
function sync(){
  $('score').textContent=String(score).padStart(6,'0');$('lives').innerHTML=Array.from({length:level.player.lives},(_,i)=>`<span class="life${i<lives?' is-active':i===lives&&lifeFlashTimer>0?' is-damaged':''}"></span>`).join('');$('lives').setAttribute('aria-label',`${lives} / ${level.player.lives} 格装甲`);
  $('wave-label').textContent=`波次 ${waveIndex+1} / ${level.waves.length}`;$('objective').textContent=`残余合体 ${enemies.filter(e=>e.parent).length}`;
  const active=Object.entries(powerTimers).filter(([,remaining])=>remaining>0).map(([key,remaining])=>key==='slow'?`减速 x0.55 ${Math.ceil(remaining)}s`:`${POWERUPS[key].name} ${Math.ceil(remaining)}s`);$('power-state').textContent=active.length?active.join(' · '):'强化待机';
}
function resize(){const w=host.clientWidth,h=host.clientHeight,aspect=w/h,viewH=18;renderer.setSize(w,h,false);camera.left=-viewH*aspect/2;camera.right=viewH*aspect/2;camera.top=viewH/2;camera.bottom=-viewH/2;camera.updateProjectionMatrix()}
new ResizeObserver(resize).observe(host);resize();
function hit(a,b,r){return a.position.distanceTo(b.position)<r}
function hitPowerup(orb){return Math.abs(orb.position.x-playerX)<1.08&&Math.abs(orb.position.y-player.position.y)<1.08}
function deploy(enemy,wave){
  const d=enemy.userData;if(d.phase!=='combined')return;d.phase='turn';d.phaseTime=0;
  const car=sideViewRig(carrierTemplate,.24);car.position.copy(enemy.position);car.position.y-=.7;car.userData={v:4.3,health:1};scene.add(car);droppedCars.push(car);
  const chassis=enemy.getObjectByName('Four-wheel carrier');if(chassis)chassis.visible=false;say('战车已投放！翼龙正在掉头。',2);
}
function update(dt){
  if(state!=='playing')return;time+=dt;
  Object.keys(powerTimers).forEach(key=>powerTimers[key]=Math.max(0,powerTimers[key]-dt));const slowActive=powerTimers.slow>0;updateFeedback(dt);slowMarkerMaterial.opacity=slowActive?.52+Math.sin(time*5)*.16:.72;
  const enemyDt=dt*(powerTimers.slow>0?.55:1),lane=laneLimit();playerX=THREE.MathUtils.clamp(playerX+move*level.player.speed*dt,-lane,lane);player.position.x=playerX;
  fireClock-=dt;if(fireClock<=0){shoot();fireClock=level.player.fireRate*(powerTimers.rapid>0?.5:1)}
  const wave=level.waves[waveIndex],formationShift=formationOffset(wave);deployClock-=enemyDt;enemyFireClock-=enemyDt;
  if(deployClock<=0){const target=pickDeploymentTarget(wave);if(target)deploy(target,wave);deployClock=wave.deployEvery;}
  if(enemyFireClock<=0){const source=enemies.filter(e=>e.parent&&e.userData.phase==='combined').sort((a,b)=>b.userData.row-a.userData.row)[0];if(source)enemyShoot(source.position.x,source.position.y);enemyFireClock=wave.projectileEvery;}
  enemies.forEach((e,i)=>{
    if(!e.parent)return;const d=e.userData;
    if(d.phase==='combined'){e.position.x=THREE.MathUtils.clamp(d.homeX+formationShift,-lane,lane);e.position.y=d.homeY+Math.sin(time*2+i)*.09;e.rotation.z=Math.PI/2+Math.sin(time*4+i)*.025;}
    else if(d.phase==='turn'){d.phaseTime+=enemyDt;e.rotation.z=THREE.MathUtils.lerp(Math.PI/2,-Math.PI/2,Math.min(1,d.phaseTime/.55));if(d.phaseTime>=.55){d.phase='dive';d.target=playerX;}}
    else{e.position.x=THREE.MathUtils.clamp(THREE.MathUtils.lerp(e.position.x,d.target,enemyDt*1.35),-lane,lane);e.position.y-=wave.diveSpeed*enemyDt;e.rotation.z=-Math.PI/2+Math.sin(time*8+i)*.08;if(e.position.y<player.position.y+.55){const connects=Math.abs(e.position.x-playerX)<1.15;e.removeFromParent();if(connects){damage('翼龙俯冲命中坦克！');burst(e.position,'#d66f5d',20)}else burst(e.position,'#a9bbaa',8);}}
    const wings=e.getObjectByName('Left small triangular wing');if(wings)wings.rotation.x=Math.sin(time*11+i)*.35;d.slowMarker.visible=slowActive;d.slowMarker.scale.setScalar(1+Math.sin(time*5+i)*.08);
  });
  for(let i=droppedCars.length-1;i>=0;i--){const car=droppedCars[i];car.position.y-=car.userData.v*enemyDt;if(car.position.y<player.position.y-.25){const connects=Math.abs(car.position.x-playerX)<1.1;car.removeFromParent();droppedCars.splice(i,1);if(connects)damage('投放战车撞击坦克！');else burst(car.position,'#a9bbaa',8);}}
  powerups.forEach((orb,i)=>{orb.position.y-=orb.userData.v*dt;orb.position.y+=Math.sin(time*3+orb.userData.phase)*.035;if(hitPowerup(orb)){activatePower(orb.userData.type);burst(orb.position,'#fff8d8',10);orb.removeFromParent();powerups.splice(i,1)}else if(orb.position.y<-6){orb.removeFromParent();powerups.splice(i,1)}});
  shots.forEach((b,i)=>{
    b.position.x+=b.userData.vx*dt;b.position.y+=b.userData.vy*dt;b.rotation.y+=dt*9;
    if(b.position.y>12||Math.abs(b.position.x)>lane+1){b.removeFromParent();shots.splice(i,1);return}
    for(const car of droppedCars){if(car.parent&&hit(b,car,.9)){car.removeFromParent();droppedCars.splice(droppedCars.indexOf(car),1);score+=80;burst(car.position);b.removeFromParent();shots.splice(i,1);return}}
    for(const e of enemies){if(e.parent&&hit(b,e,.92)){e.userData.health--;burst(b.position);b.removeFromParent();shots.splice(i,1);if(e.userData.health<=0){e.removeFromParent();score+=wave.score;waveDefeats++;const drop=wave.powerDrops.find(item=>item.afterDefeat===waveDefeats);if(drop)spawnPowerup(e.position,drop);burst(e.position,'#f1c448',18)}break}}
  });
  enemyShots.forEach((b,i)=>{b.material=slowActive?mats.slowBullet:mats.red;b.scale.setScalar(slowActive?1.18:1);b.position.y+=b.userData.v*enemyDt;if(b.position.y<-7){b.removeFromParent();enemyShots.splice(i,1);return}if(Math.abs(b.position.x-playerX)<1.15&&b.position.y<-4){b.removeFromParent();enemyShots.splice(i,1);damage();}});
  sparks.forEach((s,i)=>{s.position.addScaledVector(s.userData.v,dt);s.userData.life-=dt;s.material.opacity=Math.max(0,s.userData.life*2);if(s.userData.life<=0){s.removeFromParent();sparks.splice(i,1)}});
  if(enemies.length&&enemies.every(e=>!e.parent)&&!droppedCars.length)advance();sync();
}
function startGame(){if(state==='won'&&levelIndex<LEVELS.length-1)loadLevel(levelIndex+1);if(state==='ready'||state==='won'||state==='lost')reset()}
$('start').onclick=startGame;$('start').addEventListener('touchend',e=>{e.preventDefault();startGame()},{passive:false});
const helpModal=$('help-modal');$('help').addEventListener('click',()=>helpModal.hidden=false);$('help-close').addEventListener('click',()=>helpModal.hidden=true);helpModal.addEventListener('click',event=>{if(event.target===helpModal)helpModal.hidden=true});
window.addEventListener('keydown',e=>{if(['ArrowLeft','KeyA'].includes(e.code)){move=-1;e.preventDefault()}if(['ArrowRight','KeyD'].includes(e.code)){move=1;e.preventDefault()}});
window.addEventListener('keyup',e=>{if(['ArrowLeft','KeyA','ArrowRight','KeyD'].includes(e.code))move=0});
for(const b of document.querySelectorAll('[data-move]')){const dir=Number(b.dataset.move),startMove=e=>{e.preventDefault();move=dir;b.classList.add('is-pressed')},stopMove=()=>{move=0;b.classList.remove('is-pressed')};b.addEventListener('pointerdown',e=>{startMove(e);try{b.setPointerCapture(e.pointerId)}catch{}});b.addEventListener('touchstart',startMove,{passive:false});for(const ev of ['pointerup','pointercancel','lostpointercapture','touchend','touchcancel'])b.addEventListener(ev,stopMove)}
host.addEventListener('contextmenu',event=>event.preventDefault());host.addEventListener('selectstart',event=>event.preventDefault());host.addEventListener('touchstart',event=>event.preventDefault(),{passive:false});
function loop(now){const dt=Math.min(.05,(now-last)/1000);last=now;update(dt);renderer.render(scene,camera);requestAnimationFrame(loop)}
levelSelect.replaceChildren(...LEVELS.map((item,index)=>{const option=document.createElement('option');option.value=String(index);option.textContent=`关卡 ${String(index+1).padStart(2,'0')} · ${item.name}`;return option;}));
levelSelect.addEventListener('change',()=>{loadLevel(Number(levelSelect.value));if(state==='playing')reset();else{state='ready';showLevelIntro();sync()}});
loadLevel(0);showLevelIntro();requestAnimationFrame(loop);sync();
