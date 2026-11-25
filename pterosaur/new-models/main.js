import * as THREE from '../vendor/three.module.js';
import {OrbitControls} from '../vendor/OrbitControls.js';
import {addArchiveLighting,addArchiveStage,createModelFraming,DEFAULT_MODEL_HEADING} from '../viewer-framing.js?v=3';
import {buildCrossbow,buildModernTank,buildGuardianOne,buildGuardianTwo} from './model.js?v=6';

const registry={crossbow:{build:buildCrossbow,file:'crossbow'},modern:{build:buildModernTank,file:'modern-tank'},guardian1:{build:buildGuardianOne,file:'guardian-tank-1'},guardian2:{build:buildGuardianTwo,file:'guardian-tank-2'}};
const $=selector=>document.querySelector(selector);
async function toggleFullscreen(element){
 try{if(document.fullscreenElement)await document.exitFullscreen();else if(element.requestFullscreen)await element.requestFullscreen();}catch{ /* Browser may deny fullscreen outside a user gesture. */ }
}
export function startNewModelsShowcase(){
 const root=$('#new-models');if(!root)return;
 const host=$('#new-models-canvas-host'),scene=new THREE.Scene();scene.background=new THREE.Color('#eeefe9');scene.fog=new THREE.Fog('#eeefe9',32,70);
 const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;host.append(renderer.domElement);
 const camera=new THREE.PerspectiveCamera(36,1,.1,100),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.065;controls.enablePan=false;controls.maxPolarAngle=Math.PI*.5-.018;controls.autoRotateSpeed=.7;
 addArchiveLighting(scene);let current,framing,stage,view='perspective',auto=false,wire=false,cameraMotion=null,last=performance.now();
 let selectedKey='crossbow',folded=false,foldAmount=0,shotTime=0,scanning=false;
 const crossbowPose=$('#crossbow-pose'),crossbowFire=$('#crossbow-fire');
 const modernTurret=$('#modern-turret'),modernBarrel=$('#modern-barrel'),guardianBarrel=$('#guardian-barrel'),modernScan=$('#modern-scan');
 function stopScan(){scanning=false;modernScan.setAttribute('aria-pressed','false');}
 function setAngle(input,output,value){input.value=String(value);output.value=`${Math.round(value)}°`;}
 function select(key){
  if(current)scene.remove(current.model);const entry=registry[key],result=entry.build();current=result;selectedKey=key;folded=false;foldAmount=0;shotTime=0;stopScan();current.model.rotation.y=DEFAULT_MODEL_HEADING;scene.add(current.model);
  if(stage)Object.values(stage).forEach(part=>scene.remove(part));framing=createModelFraming({camera,controls,model:current.model});stage=addArchiveStage(scene,framing.frame);
  current.materials&&Object.values(current.materials).forEach(mat=>mat.wireframe=wire);
  $('#new-model-name').textContent=current.model.name;$('#new-model-description').textContent=current.description;const download=$('#new-model-download');download.href=`./assets/${entry.file}.glb`;download.download=`${entry.file}.glb`;$('#new-model-mesh-count').textContent=`${current.meshCount} 个几何部件`;
  $('#crossbow-controls').hidden=key!=='crossbow';$('#modern-controls').hidden=key!=='modern';$('#guardian-controls').hidden=!key.startsWith('guardian');
  crossbowPose.setAttribute('aria-pressed','false');crossbowPose.textContent='变形';crossbowFire.disabled=false;
  setAngle(modernTurret,$('#modern-turret-value'),0);setAngle(modernBarrel,$('#modern-barrel-value'),0);
  if(key.startsWith('guardian'))setAngle(guardianBarrel,$('#guardian-barrel-value'),current.rig.defaultElevation);
  root.querySelectorAll('[data-new-model]').forEach(button=>{const on=button.dataset.newModel===key;button.classList.toggle('selected',on);button.setAttribute('aria-pressed',String(on));});moveCamera('perspective',true);
 }
 function moveCamera(next,instant=false){view=next;root.querySelectorAll('[data-new-view]').forEach(button=>{const on=button.dataset.newView===next;button.classList.toggle('selected',on);button.setAttribute('aria-pressed',String(on));});if(!framing)return;const pose=framing.pose(next);if(instant){camera.position.copy(pose.position);controls.target.copy(pose.target);controls.update();cameraMotion=null;}else cameraMotion=pose;}
 function keepModelInFrame(){
  const direction=camera.position.clone().sub(controls.target).normalize();
  framing.refresh();const required=framing.pose(view).position.distanceTo(framing.frame.center);
  const distance=Math.max(required,camera.position.distanceTo(controls.target));
  controls.target.copy(framing.frame.center);camera.position.copy(controls.target).addScaledVector(direction,distance);cameraMotion=null;controls.update();
 }
 function setAuto(value){auto=value;controls.autoRotate=value;$('#new-models-rotate').setAttribute('aria-checked',String(value));}
 function setWire(value){wire=value;if(current)Object.values(current.materials).forEach(mat=>mat.wireframe=value);$('#new-models-wireframe').setAttribute('aria-checked',String(value));}
 root.querySelectorAll('[data-new-model]').forEach(button=>button.addEventListener('click',()=>select(button.dataset.newModel)));
 crossbowPose.addEventListener('click',()=>{
  if(selectedKey!=='crossbow')return;folded=!folded;crossbowPose.setAttribute('aria-pressed',String(folded));crossbowPose.textContent=folded?'恢复展开':'变形';
 });
 crossbowFire.addEventListener('click',()=>{if(selectedKey!=='crossbow'||shotTime)return;shotTime=.001;crossbowFire.disabled=true;});
 modernTurret.addEventListener('input',()=>{if(selectedKey!=='modern')return;stopScan();current.rig.turret.rotation.y=THREE.MathUtils.degToRad(Number(modernTurret.value));setAngle(modernTurret,$('#modern-turret-value'),modernTurret.value);});
 modernBarrel.addEventListener('input',()=>{if(selectedKey!=='modern')return;stopScan();current.rig.barrel.rotation.z=THREE.MathUtils.degToRad(Number(modernBarrel.value));setAngle(modernBarrel,$('#modern-barrel-value'),modernBarrel.value);keepModelInFrame();});
 modernScan.addEventListener('click',()=>{if(selectedKey!=='modern')return;scanning=!scanning;modernScan.setAttribute('aria-pressed',String(scanning));});
 guardianBarrel.addEventListener('input',()=>{if(!selectedKey.startsWith('guardian'))return;current.rig.barrel.rotation.z=THREE.MathUtils.degToRad(Number(guardianBarrel.value));setAngle(guardianBarrel,$('#guardian-barrel-value'),guardianBarrel.value);keepModelInFrame();});
 root.querySelectorAll('[data-new-view]').forEach(button=>button.addEventListener('click',()=>{setAuto(false);moveCamera(button.dataset.newView);}));
 $('#new-models-rotate').addEventListener('click',()=>setAuto(!auto));$('#new-models-wireframe').addEventListener('click',()=>setWire(!wire));
 $('#new-models-reset').addEventListener('click',()=>{current.model.rotation.y=DEFAULT_MODEL_HEADING;setAuto(false);setWire(false);moveCamera('perspective');});
 $('#new-models-fullscreen').addEventListener('click',()=>toggleFullscreen($('#new-models-viewer')));
 controls.addEventListener('start',()=>{cameraMotion=null;setAuto(false);});
 const resize=()=>{const {width,height}=host.getBoundingClientRect();if(!width||!height)return;camera.aspect=width/height;camera.updateProjectionMatrix();framing?.refresh();renderer.setSize(width,height,false);};new ResizeObserver(resize).observe(host);
 let visible=true;if('IntersectionObserver'in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;},{rootMargin:'120px'}).observe(root);
 function frame(now){
  requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000);last=now;if(document.hidden||!visible)return;
  if(selectedKey==='crossbow'){
   const target=folded?1:0,previous=foldAmount;foldAmount=THREE.MathUtils.damp(foldAmount,target,8,dt);
   if(Math.abs(foldAmount-target)<.001)foldAmount=target;
   current.rig.hinge.rotation.z=-1.05*foldAmount;current.rig.launcher.rotation.z=1.05*foldAmount;
   if(previous!==foldAmount&&foldAmount===target)framing.refresh();
   if(shotTime){shotTime+=dt;const progress=Math.min(1,shotTime/.52);current.rig.projectile.position.x=progress<.7?3.6*(progress/.7):0;current.rig.projectile.visible=progress<.7||progress>=1;if(progress>=1){shotTime=0;crossbowFire.disabled=false;}}
  }
  if(selectedKey==='modern'&&scanning){
   const yaw=Math.sin(now*.00065)*.62,elevation=.42+Math.sin(now*.00105)*.12;
   current.rig.turret.rotation.y=yaw;current.rig.barrel.rotation.z=elevation;
   setAngle(modernTurret,$('#modern-turret-value'),THREE.MathUtils.radToDeg(yaw));setAngle(modernBarrel,$('#modern-barrel-value'),THREE.MathUtils.radToDeg(elevation));
  }
  if(cameraMotion){camera.position.lerp(cameraMotion.position,.09);controls.target.lerp(cameraMotion.target,.09);if(camera.position.distanceTo(cameraMotion.position)<.02){camera.position.copy(cameraMotion.position);controls.target.copy(cameraMotion.target);cameraMotion=null;}}
  controls.update();renderer.render(scene,camera);
 }
 select('crossbow');resize();requestAnimationFrame(frame);
}
