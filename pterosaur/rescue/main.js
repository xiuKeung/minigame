import * as THREE from '../vendor/three.module.js';
import {buildModel} from '../model.js';
import {LEVEL_COUNT,levelConfig,nextLevel,createRescue,start,pause,resume,switchRole,dock,interact,skill,tick,actionLabel,objective,stars,liftOffset,scannerPose} from './state.js?v=14';
import {createFlightMotion,updateFlightMotion} from './flight-motion.js?v=13';
import {createFeedback,createSound} from './feedback.js?v=15';
let flightMotion=createFlightMotion();
const $=id=>document.getElementById(id);
let state=createRescue(),renderer,lastStatus='',lastEvent=-1,messageEnd=0,stickPointer=null,axis={x:0,y:0};
const keys=new Set(),scene=new THREE.Scene();scene.background=new THREE.Color('#dceefa');scene.fog=new THREE.Fog('#dceefa',55,130);
const camera=new THREE.OrthographicCamera(-20,20,10,-10,.1,180);let cameraX=15;
scene.add(new THREE.HemisphereLight(0xffffff,0x91a6bd,2.6));
const sun=new THREE.DirectionalLight(0xfff6e5,2.6);sun.position.set(-10,22,18);scene.add(sun);
const fill=new THREE.DirectionalLight(0xb0caff,1.8);fill.position.set(9,13,-14);scene.add(fill);
const effects=createFeedback(scene),sound=createSound(),reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
window.addEventListener('pointerdown',()=>sound.unlock(),{capture:true});window.addEventListener('keydown',()=>sound.unlock(),{capture:true});
const material=(color,extras={})=>new THREE.MeshStandardMaterial({color,roughness:.75,...extras});
const mats={flash:material('#fff5d1',{emissive:'#ffffff',emissiveIntensity:1}),ground:material('#d8e1ed'),edge:material('#b3c4dc'),rock:material('#a4b9cf'),road:material('#7d9bb9'),steel:material('#7894b7'),dark:material('#425b80'),yellow:material('#f7c961'),blue:material('#5fcfe0',{emissive:'#25776e',emissiveIntensity:.3}),green:material('#6bd2b0',{emissive:'#428057',emissiveIntensity:.3}),red:material('#f48e8c',{emissive:'#a7482b',emissiveIntensity:.2})};
function mesh(g,m,parent=scene,x=0,y=0,z=0){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);parent.add(o);return o;}
function box(w,h,d,m,parent=scene,x=0,y=0,z=0){return mesh(new THREE.BoxGeometry(w,h,d),m,parent,x,y,z);}
function cylinder(r,h,m,parent=scene,x=0,y=0,z=0){return mesh(new THREE.CylinderGeometry(r,r,h,16),m,parent,x,y,z);}
let environment,env={},brokenAt=null;
function label(text,x,y,z=-1,color='#45698c'){
 const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');
 ctx.fillStyle='rgba(247,251,255,.92)';ctx.beginPath();ctx.roundRect(2,2,508,90,12);ctx.fill();
 ctx.fillStyle=color;ctx.font='500 29px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,48,475);
 const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
 const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));sprite.position.set(x,y,z);sprite.scale.set(7,1.31,1);environment.add(sprite);return sprite;
}
function buildEnvironment(){
 if(environment){environment.traverse(o=>{o.geometry?.dispose();if(o.isSprite){o.material.map?.dispose();o.material.dispose();}});scene.remove(environment);}
 environment=new THREE.Group();environment.name='Interactable level terrain';scene.add(environment);
 const W=state.world;
// Broken road, with a visible ravine and a raised mechanical bridge.
for(const [x,width] of [[(W.bridgeStart-3)/2,W.bridgeStart+3],[(W.bridgeEnd+W.end+8)/2,W.end+8-W.bridgeEnd]]){
 box(width,.35,6,mats.ground,environment,x,-.2);box(width,3,7,mats.rock,environment,x,-1.9);
 box(width,.07,3.4,mats.road,environment,x,.01);
 for(let p=x-width/2+2;p<x+width/2;p+=4)box(1.2,.02,.08,mats.edge,environment,p,.065,1.65);
}
box(W.bridgeEnd-W.bridgeStart,.1,7,mats.blue,environment,(W.bridgeStart+W.bridgeEnd)/2,-4);
for(const x of [W.bridgeStart-1,W.bridgeEnd+1]){box(.7,6,7,mats.dark,environment,x,-2);box(.9,.2,7,mats.edge,environment,x,.05);}
const bridge=new THREE.Group();environment.add(bridge);bridge.position.set((W.bridgeStart+W.bridgeEnd)/2,-3,0);
for(let i=0;i<W.bridgeEnd-W.bridgeStart;i++){const x=i-(W.bridgeEnd-W.bridgeStart-1)/2;box(.92,.25,5.4,mats.steel,bridge,x,0);box(.07,.03,5.2,mats.edge,bridge,x,.15);}
const plate=box(3.2,.14,5,mats.yellow,environment,W.plate,.11,-.5);
for(const z of [-2.8,1.8])box(3.3,.1,.12,mats.dark,environment,W.plate,.21,z);
label('压力板 · 推入重箱',W.plate,4.6,-3);
const crate=new THREE.Group();environment.add(crate);
box(1.9,1.8,1.9,mats.edge,crate,0,.95);for(const z of [-.98,.98]){
 box(1.85,.15,.08,mats.dark,crate,0,1,z);box(.15,1.7,.08,mats.dark,crate,0,.95,z);
}cylinder(.18,.1,mats.yellow,crate,0,1.92);
const tether=mesh(new THREE.CylinderGeometry(.035,.035,1,6),mats.yellow,environment);
// High platforms and two independently useful controls.
function platform(x,y,width,parent=environment){box(width,.35,3,mats.steel,parent,x,y,-.7);for(const dx of [-width/2+.3,width/2-.3])box(.35,y,2,mats.dark,parent,x+dx,y/2,-1.2);box(width,.08,.15,mats.edge,parent,x,y+.2,1);}
platform(W.bridgeSwitch.x,W.bridgeSwitch.y-1.5,4);const liftPlatforms=W.cells.map(c=>{const g=new THREE.Group();environment.add(g);
 if(state.config.lift){
  for(const dx of [-2.2,2.2])box(.22,c.y+1,1,mats.dark,environment,c.x+dx,(c.y+1)/2,-1.2);
  box(5,.35,3,mats.steel,g,c.x,c.y-1.4,-.7);box(5,.08,.15,mats.blue,g,c.x,c.y-1.2,1);
 }else platform(c.x,c.y-1.4,5,g);
 return g;
});platform(W.terminal.x,W.terminal.y-1.2,4);
function control(x,y){const g=new THREE.Group();g.position.set(x,y,0);environment.add(g);box(.8,1.2,.6,mats.dark,g);const screen=box(.65,.8,.08,mats.blue,g,0,.08,.34);return screen;}
const bridgeControl=control(W.bridgeSwitch.x,W.bridgeSwitch.y),terminal=control(W.terminal.x,W.terminal.y);
label('桥梁开关',W.bridgeSwitch.x,W.bridgeSwitch.y+2);const batteryLabel=label('能源电池',W.battery.x,W.battery.y+2);label('防御终端',W.terminal.x,W.terminal.y+2);
const cell=new THREE.Group();environment.add(cell);box(.8,1.05,.7,mats.yellow,cell);box(.55,.65,.73,mats.blue,cell);box(.5,.14,.45,mats.dark,cell,0,.6);
const station=new THREE.Group();station.position.set(W.station,0,-2.4);environment.add(station);
box(4,.4,3,mats.dark,station,0,.2);box(2,3,1.2,mats.steel,station,0,1.8);box(1.45,1.5,.15,mats.dark,station,0,2.1,.7);
const stationLight=box(.3,1.1,.2,mats.red,station,.45,2.1,.82);
for(let i=0;i<3;i++)box(.3,.2,.2,mats.yellow,station,-.4,1.7+i*.3,.8);
label('供电站',W.station,5.7,-2);
const turret=new THREE.Group();turret.position.set(W.turret.x,W.turret.y,0);environment.add(turret);
cylinder(.8,W.turret.y-1,mats.dark,environment,W.turret.x,(W.turret.y-1)/2,-.3);box(1.8,.4,2,mats.steel,environment,W.turret.x,W.turret.y-.8,0);
const turretHead=new THREE.Group();turret.add(turretHead);box(1.6,1,1.1,mats.dark,turretHead);box(1.3,.22,.5,mats.red,turretHead,-1,.1,0);
const turretCore=mesh(new THREE.IcosahedronGeometry(.48,0),mats.red,turretHead,0,.1,.65);
const turretHalo=mesh(new THREE.TorusGeometry(.75,.03,6,28),mats.red,turret,0,.1,.7);
label('防御炮台',W.turret.x,W.turret.y+2.6);
const wall=new THREE.Group();environment.add(wall);wall.position.x=W.wall;
const chunks=[];
for(let row=0;row<8;row++)for(let col=0;col<3;col++){
 const chunk=box(1.1,1.45,1.85,col===1&&row%2===0?mats.edge:mats.rock,wall,0,row*1.5+.7,(col-1)*1.95);
 chunk.userData.origin=chunk.position.clone();chunks.push(chunk);
}
label('裂墙 · 合体冲刺',W.wall,12.8);
const exit=new THREE.Group();exit.position.x=W.exit;environment.add(exit);
for(const z of [-2.6,2.6]){box(.6,5,.6,mats.steel,exit,0,2.5,z);box(.16,4,.65,mats.green,exit,-.33,2.5,z);}
box(.6,.6,5.8,mats.steel,exit,0,5.2,0);label('出口',W.exit,7);

 // Small optional objectives stay visually distinct from required energy cells.
 const collectibleMeshes=W.bricks.map(p=>{const g=new THREE.Group();environment.add(g);g.position.set(p.x,p.y,0);box(.7,.35,.5,mats.yellow,g);for(const x of [-.19,.19])cylinder(.12,.13,mats.yellow,g,x,.24);return g;});
 const rescueDrone=new THREE.Group();environment.add(rescueDrone);rescueDrone.position.set(W.rescue.x,W.rescue.y,0);
 mesh(new THREE.IcosahedronGeometry(.45,0),mats.green,rescueDrone);box(.65,.16,.15,mats.dark,rescueDrone,0,.02,.42);for(const x of [-.75,.75]){cylinder(.32,.06,mats.edge,rescueDrone,x,.1);box(.5,.08,.12,mats.dark,rescueDrone,x/2,.05);}
 label('可选救援',W.rescue.x,W.rescue.y+1.3);
 let scanner,scanLamp,gate,gatePlate,gateScreen;
 if(state.config.scanner){
  const scan=new THREE.Group();environment.add(scan);scan.position.x=W.scanner.x;
  for(const z of [-1.8,1.8])box(.18,10,.18,mats.steel,scan,0,5,z);
  scanner=box(2.6,.14,3.8,mats.red,scan,0,7);scanLamp=mesh(new THREE.IcosahedronGeometry(.3),mats.yellow,scan,0,11);
  label('扫描区 · 低空绕行',W.scanner.x,12.2);
 }
 if(state.config.coopGate){
  gatePlate=box(3.2,.15,4,mats.blue,environment,W.gatePlate,.15);label('战车压板',W.gatePlate,3.8,-3);
  gateScreen=control(W.gateSwitch.x,W.gateSwitch.y);label('协作终端',W.gateSwitch.x,W.gateSwitch.y+1.7);
  gate=new THREE.Group();environment.add(gate);gate.position.x=W.gate;
  for(const z of [-2.5,2.5])box(.3,6,.3,mats.dark,environment,W.gate,3,z);
  for(let y=1;y<=5;y++)box(.35,.6,5,mats.blue,gate,0,y,0);
 }
 env={liftPlatforms,collectibleMeshes,rescueDrone,scanner,scanLamp,gate,gatePlate,gateScreen,bridge,plate,crate,tether,bridgeControl,terminal,cell,stationLight,turretHead,turretCore,turretHalo,chunks,batteryLabel};
 const sky=['#dceefa','#e5eafd','#d9f0f3','#f1eafa'][Math.floor((state.config.level-1)/5)];scene.background.set(sky);scene.fog.color.set(sky);
 $('chapter-name').textContent=`${String(state.config.level).padStart(2,'0')} / ${state.config.name}`;
 for(const [id,x] of [['map-bridge',W.bridgeEnd],['map-power',W.station],['map-exit',W.exit]])$(id).style.left=`${x/W.end*100}%`;
}
buildEnvironment();
const rig=buildModel(),truck=new THREE.Group(),bird=new THREE.Group();scene.add(truck,bird);truck.add(rig.chassis);bird.add(rig.creature);rig.chassis.scale.setScalar(.58);rig.creature.scale.setScalar(.58);
const wheels=rig.chassis.children.filter(c=>c.name==='Wheel with tread and spoked rim');
const shield=mesh(new THREE.SphereGeometry(3,24,12),new THREE.MeshBasicMaterial({color:'#8cddd2',transparent:true,opacity:.14,wireframe:true}),truck,0,1.4);
const ring=mesh(new THREE.TorusGeometry(2.1,.075,6,40),new THREE.MeshBasicMaterial({color:'#368cff'}));ring.rotation.x=-Math.PI/2;
const birdRing=mesh(new THREE.TorusGeometry(1.2,.06,6,32),new THREE.MeshBasicMaterial({color:'#9a68ed'}));
const hitRing=mesh(new THREE.TorusGeometry(1.6,.1,6,32),new THREE.MeshBasicMaterial({color:'#f8c475',transparent:true,opacity:.6}));
const bullets=Array.from({length:12},()=>mesh(new THREE.SphereGeometry(.16,8,6),mats.red));
const activeArrow=mesh(new THREE.ConeGeometry(.34,.65,3),new THREE.MeshBasicMaterial({color:'#368cff',depthTest:false}));activeArrow.rotation.z=Math.PI;activeArrow.renderOrder=9;
let prev=performance.now();
function resize(){const host=$('canvas'),w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);const aspect=w/h,width=Math.max(19,17*aspect);camera.left=-width/2;camera.right=width/2;camera.top=width/aspect/2;camera.bottom=-width/aspect/2;camera.updateProjectionMatrix();}
function draw(dt){
 const {bridge,plate,crate,tether,bridgeControl,terminal,cell,stationLight,turretHead,turretCore,turretHalo,chunks,batteryLabel}=env;const W=state.world;
 const motion=updateFlightMotion(flightMotion,state);
 rig.poseCreature({wing:motion.wing,headPitch:-motion.pitch*.25});rig.creature.position.set(0,motion.bob,0);rig.creature.rotation.z=0;
 bird.rotation.set(motion.bank,motion.yaw,motion.pitch,'YZX');
 // Unequal wing deflection gives a readable banking silhouette.
 rig.wings.forEach(w=>{w.rotation.x+=motion.bank*.16;});
 truck.position.set(state.truck.x,0,0);bird.position.set(state.bird.x,state.bird.y,0);bird.visible=state.respawn===0;
 const visual=effects.update(state,sound,reducedMotion.matches);$('damage-flash').style.opacity=String(visual.flash*.45);
 env.liftPlatforms.forEach(p=>p.position.y=liftOffset(state));
 env.collectibleMeshes.forEach((p,i)=>{p.visible=!state.bricks[i];p.rotation.y=state.time;p.position.y=W.bricks[i].y+Math.sin(state.time*2+i)*.12;});
 env.rescueDrone.visible=!state.rescued;env.rescueDrone.position.y=W.rescue.y+Math.sin(state.time*3)*.10;
 if(env.scanner){const scan=scannerPose(state);env.scanner.position.y=scan.y;env.scanner.visible=!state.powered;env.scanner.material=scan.active?mats.red:mats.edge;env.scanner.scale.y=scan.active?1:.25;env.scanLamp.material=state.powered?mats.green:scan.active?mats.red:scan.warning&&Math.sin(state.time*18)>0?mats.yellow:mats.edge;}
 if(env.gate){env.gate.position.y=THREE.MathUtils.lerp(env.gate.position.y,state.gateOpen?6:0,1-Math.exp(-dt*5));env.gatePlate.material=state.gateHeld?mats.green:mats.blue;env.gateScreen.material=state.gateOpen?mats.green:mats.blue;}
 wheels.forEach(w=>w.rotation.z=-state.truck.x/.464);shield.visible=state.shield;
 ring.position.set(state.truck.x,.13,0);ring.visible=state.active==='truck';birdRing.position.set(state.bird.x,state.bird.y,-.5);birdRing.visible=state.active==='bird';
 hitRing.visible=state.attack>.25;hitRing.position.copy(bird.position);hitRing.scale.setScalar(1+( .65-state.attack)*2);
 crate.position.set(state.crate,0,state.crateParked?-2.1:0);
 plate.material=state.plateHeld?mats.green:mats.yellow;
 bridge.position.y=THREE.MathUtils.lerp(bridge.position.y,state.bridgeOpen?-.04:-3,1-Math.exp(-dt*5));
 bridgeControl.material=state.bridgeEnabled?mats.green:mats.blue;terminal.material=state.turretOff?mats.green:mats.blue;stationLight.material=state.powered?mats.green:mats.red;
 cell.visible=state.battery!=='installed';cell.position.set(state.batteryPos.x,state.batteryPos.y,0);
 if(state.battery==='socket')cell.position.set(W.station,2.1,-1.45);
 cell.rotation.y=state.battery==='shelf'?state.time:0;
 batteryLabel.visible=state.battery==='shelf';batteryLabel.position.set(state.batteryPos.x,state.batteryPos.y+2,-1);
 activeArrow.material.color.set(state.active==='bird'?'#9a68ed':'#368cff');activeArrow.position.set(state[state.active].x,(state.active==='bird'?state.bird.y:1.8)+1.65+Math.sin(state.time*3)*.12,1.5);activeArrow.visible=state.respawn===0;
 tether.visible=state.towing;if(tether.visible){const a=new THREE.Vector3(state.truck.x,1,0),b=new THREE.Vector3(state.crate,1,0);tether.position.copy(a).add(b).multiplyScalar(.5);tether.scale.y=a.distanceTo(b);tether.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.sub(a).normalize());}
 const recentHit=state.fx.some(e=>e.type==='hit'&&state.time-e.time<.16);turretCore.material=recentHit?mats.flash:state.turretOff?mats.dark:mats.red;turretHalo.visible=!state.turretOff&&state.turretHp>0;turretHead.visible=state.turretHp>0;
 const target=state.active==='bird'?state.bird:{x:state.truck.x,y:1.4};turretHead.rotation.z=Math.atan2(W.turret.y-target.y,W.turret.x-target.x);
 turretHalo.rotation.z=state.time;
 bullets.forEach((b,i)=>{const shot=state.shots[i];b.visible=!!shot;if(shot)b.position.set(shot.x,shot.y,0);});
 if(state.wallBroken&&brokenAt===null)brokenAt=state.time;if(!state.wallBroken)brokenAt=null;
 chunks.forEach((c,i)=>{c.position.copy(c.userData.origin);c.rotation.set(0,0,0);c.visible=true;if(brokenAt!==null){const t=Math.min(2,state.time-brokenAt);c.position.x+=t*(2+i%3);c.position.y-=t*t*3;c.position.z+=t*((i%3)-1)*3;c.rotation.z=t*(i%2?1:-1);c.visible=t<2;}});
 const focus=state.active==='bird'?state.bird.x:state.truck.x;
 cameraX=THREE.MathUtils.lerp(cameraX,THREE.MathUtils.clamp(focus+3,10,state.world.exit-2),1-Math.exp(-dt*4));camera.position.set(cameraX+visual.shake,13.2+visual.shake,32);camera.lookAt(cameraX+visual.shake,5.7,0);
 renderer.render(scene,camera);
}
let completed=new Set();try{completed=new Set(JSON.parse(localStorage.getItem('rescue-completed-v2')||'[]'));}catch{}
let bestStars={};try{bestStars=JSON.parse(localStorage.getItem('rescue-stars-v1')||'{}')||{};}catch{}
function renderLevels(){
 $('level-grid').replaceChildren();
 for(let n=1;n<=LEVEL_COUNT;n++){
  const c=levelConfig(n),button=document.createElement('button');button.className=`level-tile${n===state.config.level?' current':''}${completed.has(n)?' done':''}`;
  button.innerHTML=`<b>${String(n).padStart(2,'0')}</b><span>${c.name}</span><small>${'★'.repeat(bestStars[n]||0)}${'☆'.repeat(3-(bestStars[n]||0))}</small>`;
  button.setAttribute('aria-label',`第 ${n} 关 ${c.name}`);button.addEventListener('click',()=>{$('levels').close();loadLevel(n);});$('level-grid').appendChild(button);
 }
}
function sync(){
 const role=state.active==='bird'?'机械翼龙':state.docked?'合体战车':'探索战车';
 $('role-name').textContent=role;$('role-name').style.background=state.active==='bird'?'#9068c8':'#387aca';
 $('hp').textContent=Math.ceil(state[state.active].hp);$('energy').textContent=Math.floor(state.energy);$('lives').textContent=state.lives;
 $('hp-fill').style.width=`${state[state.active].hp}%`;$('energy-fill').style.width=`${state.energy}%`;
 for(const name of ['truck','bird']){const button=$(`pilot-${name}`),selected=state.active===name;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));button.querySelector('i').textContent=selected?'操作中':state.docked?'已合体':state.docking&&name==='bird'?'落座中':state.recalling&&name==='bird'?'返航中':'待命';button.disabled=state.status!=='playing'||state.respawn>0||!!state.docking;}
 $('exploration').textContent=`积木 ${state.bricks.filter(Boolean).length}/3 · 救援 ${state.rescued?'1':'0'}/1`;
 $('stick-caption').textContent=state.active==='bird'?'四向飞行':'左右驾驶';
 $('objective').textContent=objective(state);$('cells-progress').textContent=`能源 ${state.cellsDelivered}/${state.config.requiredCells}`;
 $('truck-marker').style.left=`${state.truck.x/state.world.end*100}%`;$('bird-marker').style.left=`${state.bird.x/state.world.end*100}%`;
 const label=actionLabel(state);$('context-prompt').textContent=state.status==='playing'&&label?label:'';
 $('interact-label').textContent=label||'附近互动';$('switch-label').textContent=state.docked?'翼龙出动':state.active==='bird'?'切换战车':'切换翼龙';
 $('skill-label').textContent=state.active==='bird'?'俯冲打击':state.docked?'合体冲刺':state.shield?'收起护盾':'展开护盾';$('dock-label').textContent=state.docking?'收翼落座':state.docked?'分离':state.recalling?'取消召回':Math.abs(state.bird.x-state.truck.x)>3.3||state.bird.y>4.1?'召回合体':'车顶合体';
 for(const id of ['switch','interact','skill','dock'])$(id).disabled=state.status!=='playing'||state.respawn>0||!!state.docking;
 $('joystick').setAttribute('aria-disabled',String(state.status!=='playing'||!!state.docking));
 if(state.eventId!==lastEvent){lastEvent=state.eventId;if(state.event!=='ready'){$('message').textContent=state.event;messageEnd=state.time+4;}}
 $('message').classList.toggle('show',state.time<messageEnd&&state.status==='playing');
 if(lastStatus===state.status)return;lastStatus=state.status;
 $('overlay').hidden=state.status==='playing';$('pause-button').disabled=['ready','won','lost'].includes(state.status);$('pause-button').setAttribute('aria-label',state.status==='paused'?'继续游戏':'暂停游戏');
 $('result-stars').hidden=state.status!=='won';
 $('intro-icons').hidden=state.status!=='ready';$('restart').hidden=!['paused','won'].includes(state.status);
 $('overlay-kicker').textContent=`第 ${String(state.config.level).padStart(2,'0')} / 20 关`;
 if(state.status==='ready'){$('overlay-title').textContent=state.config.name;$('overlay-copy').textContent=`找回 ${state.config.requiredCells} 枚能源，恢复电站供电，和搭档一起抵达出口。${state.config.scanner?'留意闪烁预警，扫描区可低空绕行。':''}${state.config.coopGate?'战车压板与翼龙终端配合开门。':''}${state.config.terminalNeedsPower?'防御终端需要先供电。':''}`;$('primary').textContent='开始救援 →';$('overlay-note').textContent='点击头像切换搭档 · 头顶箭头指示当前角色';}
 if(state.status==='paused'){$('overlay-title').textContent='休息一下';$('overlay-copy').textContent=objective(state);$('primary').textContent='继续救援 →';$('overlay-note').textContent='点击右上角问号查看玩法说明。';}
 if(state.status==='won'){
  const rating=stars(state);bestStars[state.config.level]=Math.max(bestStars[state.config.level]||0,rating);$('result-stars').textContent='★'.repeat(rating)+'☆'.repeat(3-rating);
  try{localStorage.setItem('rescue-stars-v1',JSON.stringify(bestStars));}catch{}
  completed.add(state.config.level);try{localStorage.setItem('rescue-completed-v2',JSON.stringify([...completed]));}catch{}
  $('overlay-title').textContent=state.config.level===20?'天空归航！':'一起回来了。';$('overlay-copy').textContent=`${state.config.name}完成！耗时 ${Math.floor(state.time/60)} 分 ${Math.floor(state.time%60)} 秒，剩余 ${state.lives} 条生命。积木 ${state.bricks.filter(Boolean).length}/3，${state.rescued?'已完成额外救援':'额外救援未完成'}。`;
  $('primary').textContent=state.config.level<20?'下一关 →':'再玩一次 ↗';$('overlay-note').textContent='★ 完成通关 · ★ 找齐积木 · ★ 救援成功且不损失生命';
 }
 if(state.status==='lost'){$('overlay-title').textContent='重新整备';$('overlay-copy').textContent='生命已用完。用护盾保护搭档，或先关闭防御终端。';$('primary').textContent='重玩本关 →';$('overlay-note').textContent='合体可以修复双方装甲。';}
 if(['paused','won','lost'].includes(state.status))$('primary').focus({preventScroll:true});
}
function resetInput(){keys.clear();stickPointer=null;axis={x:0,y:0};$('thumb').style.transform='translate(0,0)';$('joystick').classList.remove('held');$('joystick').setAttribute('aria-valuenow','0');$('joystick').setAttribute('aria-valuetext','静止');}
function loadLevel(n,play=false){resetInput();state=createRescue(n);flightMotion=createFlightMotion();effects.reset();lastStatus='';lastEvent=-1;messageEnd=0;cameraX=13;brokenAt=null;buildEnvironment();if(play)start(state);sync();}
function restart(){loadLevel(state.config.level,true);}
function togglePause(){resetInput();if(state.status==='playing')pause(state);else if(state.status==='paused')resume(state);sync();}
$('primary').addEventListener('click',()=>{resetInput();if(state.status==='ready')start(state);else if(state.status==='paused')resume(state);else if(nextLevel(state))loadLevel(state.config.level+1);else restart();sync();});
$('restart').addEventListener('click',restart);$('pause-button').addEventListener('click',togglePause);
$('switch').addEventListener('click',()=>{resetInput();switchRole(state);sync();});$('interact').addEventListener('click',()=>interact(state));$('skill').addEventListener('click',()=>skill(state));$('dock').addEventListener('click',()=>{dock(state);resetInput();});
for(const name of ['truck','bird'])$(`pilot-${name}`).addEventListener('click',()=>{resetInput();if(state.active!==name)switchRole(state);sync();});
function openSheet(id){resetInput();pause(state);sync();if(id==='levels')renderLevels();$(id).showModal();}
function syncSound(){$('sound-button').setAttribute('aria-pressed',String(sound.enabled));$('sound-button').setAttribute('aria-label',sound.enabled?'关闭音效':'开启音效');}
$('sound-button').addEventListener('click',()=>{sound.toggle();syncSound();});syncSound();
$('help-button').addEventListener('click',()=>openSheet('help'));$('levels-button').addEventListener('click',()=>openSheet('levels'));
for(const button of document.querySelectorAll('[data-close]'))button.addEventListener('click',()=>$(button.dataset.close).close());
$('fullscreen-button').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('fullscreen-button').title='当前浏览器不支持全屏';}});
const movement=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyW','KeyA','KeyS','KeyD'];
window.addEventListener('keydown',e=>{
 if(document.querySelector('dialog[open]'))return;
 if(e.code==='Escape'||e.code==='KeyP'){e.preventDefault();if(!e.repeat)togglePause();return;}
 if(state.status!=='playing')return;
 if(movement.includes(e.code)){e.preventDefault();keys.add(e.code);return;}
 if(['Tab','KeyQ','KeyE','Space'].includes(e.code)){e.preventDefault();if(e.repeat)return;
  if(e.code==='Tab'){resetInput();switchRole(state);}if(e.code==='KeyQ')dock(state);if(e.code==='KeyE')interact(state);if(e.code==='Space')skill(state);sync();
 }
});window.addEventListener('keyup',e=>keys.delete(e.code));
const joystick=$('joystick');
function moveStick(e){if(e.pointerId!==stickPointer)return;const r=joystick.getBoundingClientRect(),travel=25,dx=(e.clientX-r.left-r.width/2)/travel,dy=-(e.clientY-r.top-r.height/2)/travel,len=Math.hypot(dx,dy),factor=len>1?1/len:1;axis=len<.16?{x:0,y:0}:{x:dx*factor,y:dy*factor};$('thumb').style.transform=`translate(${axis.x*travel}px,${-axis.y*travel}px)`;joystick.setAttribute('aria-valuenow',String(Math.round(axis.x*100)));joystick.setAttribute('aria-valuetext',`水平 ${Math.round(axis.x*100)}，垂直 ${Math.round(axis.y*100)}`);}
joystick.addEventListener('pointerdown',e=>{if(state.status!=='playing'||state.docking||stickPointer!==null)return;e.preventDefault();stickPointer=e.pointerId;joystick.setPointerCapture(e.pointerId);joystick.classList.add('held');moveStick(e);});joystick.addEventListener('pointermove',e=>{if(e.pointerId===stickPointer){e.preventDefault();moveStick(e);}});
for(const event of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(event,e=>{if(e.pointerId===stickPointer)resetInput();});
function suspend(){resetInput();pause(state);sync();}window.addEventListener('blur',suspend);document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();});
try{
 renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;$('canvas').appendChild(renderer.domElement);resize();new ResizeObserver(resize).observe($('canvas'));
 renderer.setAnimationLoop(now=>{const dt=Math.min(.1,(now-prev)/1000);prev=now;const held=(...names)=>names.some(n=>keys.has(n));const input={x:held('ArrowLeft','KeyA')?-1:held('ArrowRight','KeyD')?1:axis.x,y:held('ArrowUp','KeyW')?1:held('ArrowDown','KeyS')?-1:axis.y};tick(state,input,dt);draw(dt);sync();});
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();suspend();$('overlay-title').textContent='画面暂时中断';$('overlay-copy').textContent='请刷新页面重新加载。';$('primary').disabled=true;});
}catch(error){console.error(error);$('overlay-title').textContent='暂时无法启动场景';$('overlay-copy').textContent='请使用支持 WebGL 的浏览器，并开启硬件加速。';$('primary').disabled=true;}
