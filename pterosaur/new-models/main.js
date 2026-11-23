import * as THREE from '../vendor/three.module.js';
import {OrbitControls} from '../vendor/OrbitControls.js';
import {addArchiveLighting,addArchiveStage,createModelFraming,DEFAULT_MODEL_HEADING} from '../viewer-framing.js';
import {buildCrossbow,buildModernTank,buildGuardianOne,buildGuardianTwo} from './model.js';

const registry={crossbow:{build:buildCrossbow,file:'crossbow'},modern:{build:buildModernTank,file:'modern-tank'},guardian1:{build:buildGuardianOne,file:'guardian-tank-1'},guardian2:{build:buildGuardianTwo,file:'guardian-tank-2'}};
const $=selector=>document.querySelector(selector);
export function startNewModelsShowcase(){
 const root=$('#new-models');if(!root)return;
 const host=$('#new-models-canvas-host'),scene=new THREE.Scene();scene.background=new THREE.Color('#eeefe9');scene.fog=new THREE.Fog('#eeefe9',32,70);
 const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;host.append(renderer.domElement);
 const camera=new THREE.PerspectiveCamera(36,1,.1,100),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.065;controls.enablePan=false;controls.maxPolarAngle=Math.PI*.5-.018;controls.autoRotateSpeed=.7;
 addArchiveLighting(scene);let current,framing,stage,view='perspective',auto=false,wire=false,cameraMotion=null,last=performance.now();
 function select(key){
  if(current)scene.remove(current.model);const entry=registry[key],result=entry.build();current=result;current.model.rotation.y=DEFAULT_MODEL_HEADING;scene.add(current.model);
  if(stage)Object.values(stage).forEach(part=>scene.remove(part));framing=createModelFraming({camera,controls,model:current.model});stage=addArchiveStage(scene,framing.frame);
  current.materials&&Object.values(current.materials).forEach(mat=>mat.wireframe=wire);
  $('#new-model-name').textContent=current.model.name;$('#new-model-description').textContent=current.description;const download=$('#new-model-download');download.href=`./assets/${entry.file}.glb`;download.download=`${entry.file}.glb`;$('#new-model-mesh-count').textContent=`${current.meshCount} 个几何部件`;
  root.querySelectorAll('[data-new-model]').forEach(button=>{const on=button.dataset.newModel===key;button.classList.toggle('selected',on);button.setAttribute('aria-pressed',String(on));});moveCamera('perspective',true);
 }
 function moveCamera(next,instant=false){view=next;root.querySelectorAll('[data-new-view]').forEach(button=>{const on=button.dataset.newView===next;button.classList.toggle('selected',on);button.setAttribute('aria-pressed',String(on));});if(!framing)return;const pose=framing.pose(next);if(instant){camera.position.copy(pose.position);controls.target.copy(pose.target);controls.update();cameraMotion=null;}else cameraMotion=pose;}
 function setAuto(value){auto=value;controls.autoRotate=value;$('#new-models-rotate').setAttribute('aria-checked',String(value));}
 function setWire(value){wire=value;if(current)Object.values(current.materials).forEach(mat=>mat.wireframe=value);$('#new-models-wireframe').setAttribute('aria-checked',String(value));}
 root.querySelectorAll('[data-new-model]').forEach(button=>button.addEventListener('click',()=>select(button.dataset.newModel)));
 root.querySelectorAll('[data-new-view]').forEach(button=>button.addEventListener('click',()=>{setAuto(false);moveCamera(button.dataset.newView);}));
 $('#new-models-rotate').addEventListener('click',()=>setAuto(!auto));$('#new-models-wireframe').addEventListener('click',()=>setWire(!wire));
 $('#new-models-reset').addEventListener('click',()=>{current.model.rotation.y=DEFAULT_MODEL_HEADING;setAuto(false);setWire(false);moveCamera('perspective');});
 $('#new-models-fullscreen').addEventListener('click',()=>$('#new-models-viewer').requestFullscreen?.());
 controls.addEventListener('start',()=>{cameraMotion=null;setAuto(false);});
 const resize=()=>{const {width,height}=host.getBoundingClientRect();if(!width||!height)return;camera.aspect=width/height;camera.updateProjectionMatrix();framing?.refresh();renderer.setSize(width,height,false);};new ResizeObserver(resize).observe(host);
 function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000);last=now;if(cameraMotion){camera.position.lerp(cameraMotion.position,.09);controls.target.lerp(cameraMotion.target,.09);if(camera.position.distanceTo(cameraMotion.position)<.02){camera.position.copy(cameraMotion.position);controls.target.copy(cameraMotion.target);cameraMotion=null;}}controls.update();renderer.render(scene,camera);}
 select('crossbow');resize();requestAnimationFrame(frame);
}
