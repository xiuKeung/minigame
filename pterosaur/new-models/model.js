import * as THREE from '../vendor/three.module.js';

const materials={
  graphite:new THREE.MeshStandardMaterial({color:0x2d3438,roughness:.46,metalness:.12}),
  black:new THREE.MeshStandardMaterial({color:0x15191b,roughness:.62,metalness:.08}),
  steel:new THREE.MeshStandardMaterial({color:0x859296,roughness:.36,metalness:.26}),
  blue:new THREE.MeshStandardMaterial({color:0x315c77,roughness:.34,metalness:.16}),
  red:new THREE.MeshStandardMaterial({color:0xa63e36,roughness:.4,metalness:.1}),
  orange:new THREE.MeshStandardMaterial({color:0xee8a36,roughness:.25,metalness:.1,transparent:true,opacity:.73}),
  rubber:new THREE.MeshStandardMaterial({color:0x101315,roughness:.9}),
  lime:new THREE.MeshStandardMaterial({color:0x719257,roughness:.38}),
};
const meshes=[];
function add(parent,geometry,material,position=[0,0,0],name='Brick'){
 const part=new THREE.Mesh(geometry,materials[material]);part.name=name;part.position.set(...position);part.castShadow=part.receiveShadow=true;parent.add(part);meshes.push(part);return part;
}
function box(parent,size,position,material='graphite',name){return add(parent,new THREE.BoxGeometry(...size),material,position,name)}
function cyl(parent,radius,length,position,material='steel',axis='y',name='Round brick'){
 const part=add(parent,new THREE.CylinderGeometry(radius,radius,length,20),material,position,name);if(axis==='x')part.rotation.z=Math.PI/2;if(axis==='z')part.rotation.x=Math.PI/2;return part;
}
function stud(parent,position,material='graphite'){return cyl(parent,.115,.07,position,material,'y','Round stud')}
function wheel(parent,x,z,r=.38){
 cyl(parent,r,.22,[x,.38,z],'rubber','z','Wheel with tread');cyl(parent,r*.5,.235,[x,.38,z],'steel','z','Wheel hub');
}
function trackedBase(parent,{length=3.2,width=1.7,wheelCount=4,redHubs=false}={}){
 box(parent,[length,.22,width],[0,.38,0],'black','Lower chassis');
 for(const side of [-1,1]){
  box(parent,[length+.14,.42,.26],[0,.4,side*(width/2+.03)],'rubber','Track');
  for(let i=0;i<wheelCount;i++){
   const x=-length*.37+i*(length*.74/Math.max(1,wheelCount-1));
   cyl(parent,.25,.3,[x,.4,side*(width/2+.05)],'rubber','z','Track roller');
   cyl(parent,.12,.315,[x,.4,side*(width/2+.055)],redHubs?'red':'steel','z','Track hub');
  }
 }
}
function slope(parent,width,height,length,position,material='graphite',name='Sloped armour'){
 const shape=new THREE.Shape();shape.moveTo(-length/2,0);shape.lineTo(length/2,0);shape.lineTo(length/2,height);shape.lineTo(-length*.22,height);shape.closePath();
 const geo=new THREE.ExtrudeGeometry(shape,{depth:width,bevelEnabled:true,bevelThickness:.02,bevelSize:.02,bevelSegments:1});geo.rotateX(Math.PI/2);geo.translate(0,0,-width/2);return add(parent,geo,material,position,name);
}
function finish(group,name,description){
 group.name=name;group.userData={name,description,materials,meshCount:meshes.length};return {model:group,materials,meshCount:meshes.length,description};
}

export function buildCrossbow(){
 meshes.length=0;const model=new THREE.Group();
 const base=new THREE.Group();model.add(base);trackedBase(base,{length:3.15,width:1.6,wheelCount:3});
 box(base,[2.75,.32,1.34],[-.15,.73,0],'graphite','Crossbow deck');
 for(const x of [-.72,0,.72])stud(base,[x,.93,-.38],'steel');
 const mast=new THREE.Group();mast.position.set(.72,.85,0);base.add(mast);
 box(mast,[.28,2.7,.32],[0,1.25,0],'graphite','Vertical bow mast');
 for(const y of [.35,.95,1.55,2.15])cyl(mast,.12,.18,[0,y,-.18],'steel','z','Mast joint');
 const bow=new THREE.Group();bow.position.set(.04,2.25,0);mast.add(bow);
 box(bow,[2.85,.18,.24],[0,0,0],'graphite','Crossbow limb');
 box(bow,[.32,.42,.4],[0,.04,0],'black','Crossbow centre block');
 cyl(bow,.1,1.35,[0,-.02,0],'steel','x','Arrow shaft');
 const tip=add(bow,new THREE.ConeGeometry(.18,.45,4), 'black',[.9,-.02,0],'Arrow point');tip.rotation.z=-Math.PI/2;
 for(const side of [-1,1])box(bow,[.48,.45,.18],[side*1.18,-.13,0],'graphite','Bow end');
 return finish(model,'弩','带履带底座的竖臂弩，保留高竖杆、横向弓臂和细长箭杆。');
}

export function buildModernTank(){
 meshes.length=0;const model=new THREE.Group();trackedBase(model,{length:4.0,width:1.85,wheelCount:5});
 box(model,[3.7,.38,1.52],[0,.78,0],'graphite','Long armoured hull');
 slope(model,1.5,.45,1.1,[1.25,.95,0],'steel','Forward slope');
 box(model,[1.05,.35,1.26],[-1.18,1.1,0],'blue','Rear equipment deck');
 box(model,[.86,.42,1.08],[.06,1.2,0],'black','Central turret base');
 box(model,[.68,.22,.84],[.12,1.49,0],'orange','Transparent orange core');
 const turret=new THREE.Group();turret.position.set(.1,1.32,0);model.add(turret);
 box(turret,[1.72,.3,.72],[.12,.22,0],'graphite','Low dual cannon turret');
 for(const side of [-1,1]){
  const barrel=new THREE.Group();barrel.position.set(.86,.22,side*.22);turret.add(barrel);
  cyl(barrel,.1,1.38,[.65,0,0],'steel','x','Tank cannon');
  cyl(barrel,.14,.42,[1.32,0,0],'graphite','Cannon sleeve');
 }
 for(const side of [-1,1]){box(model,[.95,.22,.16],[-.5,1.08,side*.79],'steel','Side rail');cyl(model,.13,.18,[1.65,.9,side*.88],'black','z','Front wheel cap');}
 for(const x of [-.68,-.34,0,.34])stud(model,[x,1.01,-.55],'blue');
 return finish(model,'新型坦克','低矮履带车体、透明橙色核心和前伸双炮组成的新型坦克。');
}

export function buildGuardianOne(){
 meshes.length=0;const model=new THREE.Group();trackedBase(model,{length:2.3,width:1.28,wheelCount:3,redHubs:true});
 box(model,[1.75,.35,1.05],[0,.77,0],'black','Guardian one hull');
 const mount=new THREE.Group();mount.position.set(-.1,.98,0);model.add(mount);cyl(mount,.22,.72,[0,.12,0],'graphite','z','Cannon pivot');
 const cannon=new THREE.Group();cannon.position.set(.08,.12,0);cannon.rotation.z=-.62;mount.add(cannon);
 box(cannon,[1.55,.32,.42],[.62,0,0],'graphite','Raised cannon');cyl(cannon,.11,.72,[1.58,0,0],'black','x','Cannon muzzle');
 for(const side of [-1,1])cyl(model,.16,.19,[.72,.95,side*.51],'red','z','Signal hub');
 return finish(model,'守护小坦克 1','红色轮毂的小型履带守卫车，炮管以高仰角固定。');
}

export function buildGuardianTwo(){
 meshes.length=0;const model=new THREE.Group();trackedBase(model,{length:2.25,width:1.26,wheelCount:3,redHubs:true});
 box(model,[1.82,.32,1.04],[0,.76,0],'black','Guardian two hull');
 const wedgeGroup=new THREE.Group();wedgeGroup.position.set(.1,.95,0);model.add(wedgeGroup);
 slope(wedgeGroup,.86,.72,1.3,[.25,0,0],'graphite','Armoured wedge cannon');
 wedgeGroup.rotation.z=-.35;
 box(wedgeGroup,[1.14,.26,.52],[.35,.37,0],'graphite','Wedge top rail');
 cyl(model,.13,.2,[-.72,.93,0],'blue','z','Rear joint');
 for(const side of [-1,1])box(model,[.36,.18,.16],[.65,.93,side*.53],'graphite','Side guard');
 return finish(model,'守护小坦克 2','紧凑的低矮履带车，采用向前上方倾斜的楔形炮体。');
}
