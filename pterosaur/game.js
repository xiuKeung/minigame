import * as THREE from './vendor/three.module.js';
import { buildModel } from './model.js';
import { createGame, startGame, takeOff, pauseGame, resumeGame, tick, hazardY, MAX_LEVEL_LENGTH, LEVEL_COUNT, levelConfig, joystickAxis, nextLevel } from './game-state.js?v=3';

const $ = id => document.getElementById(id);
let game = createGame(), renderer, lastStatus = '', lastEvent = -1, messageUntil = 0;
const keys = new Set();
let stickPointer=null, stickValue=0;
const keyMap = { ArrowUp:'up', KeyW:'up', ArrowDown:'down', KeyS:'down' };
const scene = new THREE.Scene();
scene.background = new THREE.Color('#173944');
scene.fog = new THREE.Fog('#173944', 42, 100);
const camera = new THREE.OrthographicCamera(-15,15,9,-9,.1,160);
scene.add(new THREE.HemisphereLight(0xd9f5ed,0x3b4545,2.7));
const sun = new THREE.DirectionalLight(0xffe2a3,3.4);sun.position.set(-8,20,12);scene.add(sun);
const rim = new THREE.DirectionalLight(0x83cbd8,2);rim.position.set(6,8,-12);scene.add(rim);
const mat = (color,extra={}) => new THREE.MeshStandardMaterial({color,roughness:.75,...extra});
const roadMat=mat('#254650'), stoneMat=mat('#48636b'), edgeMat=mat('#e17e58'), energyMat=mat('#ffe082',{emissive:'#a16a16',emissiveIntensity:.6});
function mesh(geometry,material,parent,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);parent.add(m);return m;}
function box(w,h,d,material,parent,x,y,z=0){return mesh(new THREE.BoxGeometry(w,h,d),material,parent,x,y,z);}
box(MAX_LEVEL_LENGTH+80,.25,6,roadMat,scene,MAX_LEVEL_LENGTH/2,-.16,0);
box(MAX_LEVEL_LENGTH+80,.5,16,mat('#1c373c'),scene,MAX_LEVEL_LENGTH/2,-.6,0);
const stripeMat=mat('#557a7c');
for(let x=-12;x<MAX_LEVEL_LENGTH+25;x+=5)box(1.5,.025,.06,stripeMat,scene,x,.005,2.1);
// Repeated scenery is instanced so the level stays inexpensive on mobile.
const mountains = new THREE.InstancedMesh(new THREE.ConeGeometry(1,1,5),mat('#294d56'),65);
const dummy=new THREE.Object3D();
for(let i=0;i<65;i++){dummy.position.set(i*14-30,2,-17-(i%3)*7);dummy.scale.set(5+i%4,8+i%6*2,5);dummy.rotation.y=i;dummy.updateMatrix();mountains.setMatrixAt(i,dummy.matrix);}
scene.add(mountains);
const rig=buildModel();
const bird=new THREE.Group(), truck=new THREE.Group();
bird.add(rig.creature);truck.add(rig.chassis);scene.add(bird,truck);
rig.creature.scale.setScalar(.58);rig.chassis.scale.setScalar(.58);
const wheels=rig.chassis.children.filter(child=>child.name==='Wheel with tread and spoked rim');
const healing=mesh(new THREE.TorusGeometry(1.3,.035,6,40),new THREE.MeshBasicMaterial({color:0x72efbf,transparent:true,opacity:.7}),truck,0,1.55,0);
healing.rotation.x=Math.PI/2;
const shield=mesh(new THREE.SphereGeometry(.57,16,10),new THREE.MeshBasicMaterial({color:0xabe7ff,wireframe:true,transparent:true,opacity:.12}),bird);
let hazards=[], pickups=[];
function rebuildLevel(){
  for(const group of [...hazards,...pickups]){group.traverse(child=>{if(child.geometry)child.geometry.dispose();});scene.remove(group);}
  hazards=game.hazards.map(h=>{
  const group=new THREE.Group();scene.add(group);
  if(h.type==='moving'){
    mesh(new THREE.OctahedronGeometry(.82),edgeMat,group);
    mesh(new THREE.TorusGeometry(1,.035,6,32),edgeMat,group);
  }else{
    box(h.w,h.h,1.6,stoneMat,group,0,0);
    box(h.w+.06,.12,1.66,edgeMat,group,0,h.h/2-.06);
    box(h.w+.06,.12,1.66,edgeMat,group,0,-h.h/2+.06);
    box(.08,h.h,1.65,edgeMat,group,-h.w/2+.04,0);
  }
  group.position.x=h.x;return group;
});
pickups=game.pickups.map(p=>{
  const group=new THREE.Group();scene.add(group);group.position.set(p.x,p.y,0);
  mesh(new THREE.OctahedronGeometry(.36),energyMat,group);
  mesh(new THREE.TorusGeometry(.63,.025,6,24),energyMat,group);
  return group;
});
  finish.position.x=game.config.length;
  $('level-select').value=String(game.config.level);
  $('chapter-label').textContent=`CHAPTER ${String(game.config.level).padStart(2,'0')} / ${game.config.name}`;
  $('level-details').textContent=`第 ${game.config.level} / 20 关 · ${game.config.count} 组障碍 · ${['轻松起步','进阶飞行','高空挑战','极限考验'][Math.floor((game.config.level-1)/5)]}`;
  $('difficulty-fill').style.width=`${game.config.level*5}%`;
  const colors=['#173944','#223d47','#353844','#3b303e'];
  const sky=colors[Math.floor((game.config.level-1)/5)];scene.background.set(sky);scene.fog.color.set(sky);
}
const finish=new THREE.Group();scene.add(finish);finish.position.x=MAX_LEVEL_LENGTH;
const finishMat=mat('#78d7b2');
box(.18,13,.3,finishMat,finish,0,6.5,-2.2);box(.18,13,.3,finishMat,finish,0,6.5,2.2);
box(.25,.25,4.7,finishMat,finish,0,13,0);
for(let i=0;i<8;i++)box(.3,.4,.55,i%2?roadMat:energyMat,finish,0,12.65,-1.92+i*.55);

function resize(){
  const host=$('game-canvas'),w=host.clientWidth,h=host.clientHeight;
  renderer.setSize(w,h,false);
  const aspect=w/h, worldWidth=Math.max(22,18*aspect),worldHeight=worldWidth/aspect;
  camera.left=-worldWidth/2;camera.right=worldWidth/2;camera.top=worldHeight/2;camera.bottom=-worldHeight/2;camera.updateProjectionMatrix();
}
function showMessage(text){$('game-message').textContent=text;messageUntil=game.time+3.5;}
const messages={takeoff:'起飞！按住 ↑ 爬升，↓ 返回战车',hit:'撞到障碍！短暂保护中，下降到车顶可回血',landed:'接应成功 · 正在回血，按 ↑ 或空格再次起飞', 'life-lost':'翼龙失去一条命 · 战车正在接应',respawn:'已回到战车 · 满血待命，按 ↑ 再次起飞',pickup:'能量 +10'};
function syncUI(){
  $('hp-text').textContent=Math.ceil(game.hp);
  $('hp-fill').style.width=`${game.hp}%`;
  $('hp-fill').style.background=game.hp<35?'#f29177':'#68d8b0';
  $('lives-text').textContent=`♥ ${game.lives}`;
  $('score-text').textContent=String(game.score).padStart(3,'0');
  const progress=Math.min(100,Math.floor((game.distance-4)/(game.config.length-4)*100));
  $('progress-fill').style.width=`${progress}%`;$('progress-text').textContent=`${progress}%`;
  $('flight-state').textContent=game.respawn>0?'RESCUE / 接应中':game.docked?(game.hp<100?'REPAIR / 车顶回血':'DOCKED / 整装待发'):'FLYING / 空中探索';
  $('launch-button').disabled=game.status!=='playing'||!game.docked||game.respawn>0;
  if(game.eventId!==lastEvent){lastEvent=game.eventId;if(messages[game.event])showMessage(messages[game.event]);}
  $('game-message').classList.toggle('show',game.status==='playing'&&game.time<messageUntil);
  if(lastStatus===game.status)return;
  lastStatus=game.status;
  const overlay=$('game-overlay'),primary=$('primary-action');
  overlay.hidden=game.status==='playing';
  $('pause-button').disabled=!['playing','paused'].includes(game.status);
  $('pause-button').textContent=game.status==='paused'?'▶':'Ⅱ';
  $('pause-button').setAttribute('aria-label',game.status==='paused'?'继续游戏':'暂停游戏');
  $('intro-rules').hidden=game.status!=='ready';
  $('restart-action').hidden=!['paused','won'].includes(game.status);
  $('restart-action').textContent='重玩本关';
  $('level-select').disabled=game.status==='playing';
  $('joystick').setAttribute('aria-disabled',String(game.status!=='playing'));
  if(game.status==='ready'){
    $('overlay-kicker').textContent=`第 ${game.config.level} / 20 关 · ${game.config.name}`;
    $('overlay-title').textContent='准备好起飞了吗？';
    $('overlay-description').textContent='上下拖动摇杆控制飞行高度，松手保持高度。受伤后下拉摇杆，落回战车回血。';
    primary.textContent='起飞出发 →';$('overlay-note').textContent='自动前进 · ↑ / ↓ 或 W / S 控制高度 · 空格起飞 · 每关 8 条命';
  }
  if(game.status==='paused'){
    $('overlay-kicker').textContent='休息一下，搭档会等你';$('overlay-title').textContent='航线已暂停';
    $('overlay-description').textContent=`剩余 ${game.lives} 条命 · 已收集 ${game.score} 能量 · 航线 ${progress}%`;
    primary.textContent='继续飞行 →';$('overlay-note').textContent='按 Esc 或点击继续，回到刚才的位置。';
  }else if(game.status==='won'||game.status==='lost'){
    const won=game.status==='won';$('overlay-kicker').textContent=won?`第 ${game.config.level} / 20 关 · 完成`:'下次继续，一起出发';
    $('overlay-title').textContent=won?(game.config.level===LEVEL_COUNT?'天空之巅，挑战完成！':'搭档，这一关通过了！'):'这次冒险结束了';
    $('overlay-description').textContent=`航线 ${progress}% · 能量 ${game.score} · 剩余 ${game.lives} 条命`;
    primary.textContent=won&&game.config.level<LEVEL_COUNT?'下一关 →':'重玩本关 ↗';$('overlay-note').textContent=won?(game.config.level<LEVEL_COUNT?'下一关障碍更密集。新关卡将恢复 8 条命，能量重新计分。':'已到达第 20 关终点！可以重玩本关，或从上方选择其他关卡。'):'提前观察障碍，受伤后按住 ↓，落回车顶恢复再出发。';
  }
  if(!overlay.hidden&&game.status!=='ready')primary.focus({preventScroll:true});
}
function updateStick(value){
  stickValue=value;$('stick-thumb').style.transform=`translateY(${-value*40}px)`;
  $('joystick').setAttribute('aria-valuenow',String(Math.round(value*100)));
  $('joystick').setAttribute('aria-valuetext',value>.05?'上升':value<-.05?'下降':'保持高度');
}
function clearInput(){keys.clear();stickPointer=null;updateStick(0);$('joystick').classList.remove('held');}
function loadGame(newGame,play=false){clearInput();game=newGame;lastEvent=-1;lastStatus='';messageUntil=0;rebuildLevel();if(play)startGame(game);syncUI();}
function restart(){loadGame(createGame(game.config.level),true);}
function togglePause(){clearInput();if(game.status==='playing')pauseGame(game);else if(game.status==='paused')resumeGame(game);syncUI();}
for(let n=1;n<=LEVEL_COUNT;n++){
  const option=document.createElement('option');option.value=n;option.textContent=`${String(n).padStart(2,'0')} · ${levelConfig(n).name}`;$('level-select').appendChild(option);
}
$('level-select').addEventListener('change',e=>loadGame(createGame(Number(e.target.value))));
$('primary-action').addEventListener('click',()=>{
  clearInput();
  if(game.status==='ready')startGame(game);
  else if(game.status==='paused')resumeGame(game);
  else {const next=nextLevel(game);if(next)loadGame(next);else restart();}
  syncUI();
});
$('restart-action').addEventListener('click',restart);
$('pause-button').addEventListener('click',togglePause);
$('launch-button').addEventListener('click',()=>takeOff(game));
window.addEventListener('keydown',e=>{
  if(e.code==='Escape'||e.code==='KeyP'){e.preventDefault();if(!e.repeat)togglePause();return;}
  if(game.status!=='playing')return;
  if(keyMap[e.code]){e.preventDefault();keys.add(e.code);}
  if(e.code==='Space'){e.preventDefault();if(!e.repeat)takeOff(game);}
});
window.addEventListener('keyup',e=>keys.delete(e.code));
const stick=$('joystick');
function moveStick(e){
  if(e.pointerId!==stickPointer)return;
  const rect=stick.getBoundingClientRect();updateStick(joystickAxis(e.clientY-(rect.top+rect.height/2)));
}
stick.addEventListener('pointerdown',e=>{
  if(game.status!=='playing'||stickPointer!==null)return;
  e.preventDefault();stickPointer=e.pointerId;stick.setPointerCapture(e.pointerId);stick.classList.add('held');moveStick(e);
});
stick.addEventListener('pointermove',e=>{if(e.pointerId===stickPointer){e.preventDefault();moveStick(e);}});
function releaseStick(e){if(e.pointerId===stickPointer){stickPointer=null;updateStick(0);stick.classList.remove('held');}}
for(const event of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(event,releaseStick);
function suspend(){clearInput();pauseGame(game);syncUI();}
window.addEventListener('blur',suspend);
document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();});
let previous=performance.now();
function frame(now){
  const delta=Math.min((now-previous)/1000,.1);previous=now;
  const input={axis:stickValue};for(const code of keys)input[keyMap[code]]=true;
  tick(game,input,delta);
  rig.poseCreature({stand:0,wing:game.docked?0:Math.sin(game.time*9)*.52,headPitch:0});
  rig.creature.position.set(0,0,0);rig.creature.rotation.z=game.docked?0:THREE.MathUtils.clamp(game.vy*.045,-.2,.2);
  bird.position.set(game.x,game.y,0);bird.visible=game.respawn===0&&game.status!=='lost';
  shield.visible=game.invincible>0&&!game.docked;
  truck.position.x=game.carX;
  wheels.forEach(wheel=>wheel.rotation.z=-game.carX/(.8*.58));
  healing.visible=game.docked&&game.hp<100&&game.respawn===0;healing.scale.setScalar(1+Math.sin(game.time*5)*.1);
  hazards.forEach((group,i)=>{const h=game.hazards[i];group.visible=Math.abs(h.x-game.x)<55;group.position.y=hazardY(h,game.time);if(h.type==='moving')group.children[0].rotation.z=game.time;});
  pickups.forEach((group,i)=>{group.visible=!game.pickups[i].collected&&Math.abs(group.position.x-game.x)<55;group.rotation.y=game.time*1.8;});
  // A slightly elevated side view keeps both the model's wing joints and the road readable.
  const focusX=game.x+(camera.right-camera.left)*.18;
  camera.position.set(focusX,12.8,30);camera.lookAt(focusX,6.2,0);
  syncUI();renderer.render(scene,camera);
}
try{
  renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  $('game-canvas').appendChild(renderer.domElement);rebuildLevel();resize();new ResizeObserver(resize).observe($('game-canvas'));
  $('game-message').textContent='场景已就绪';renderer.setAnimationLoop(frame);
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();suspend();$('overlay-title').textContent='画面暂时中断';$('overlay-description').textContent='请刷新页面重新加载 3D 场景。';$('primary-action').disabled=true;});
}catch(error){
  console.error(error);$('overlay-title').textContent='暂时无法启动 3D 场景';$('overlay-description').textContent='请使用支持 WebGL 的浏览器，并开启硬件加速后重试。';$('primary-action').disabled=true;
}
