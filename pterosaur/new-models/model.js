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
function beamBetween(parent,start,end,thickness=.16,material='graphite',name='Technic beam'){
 const a=new THREE.Vector3(...start),b=new THREE.Vector3(...end),direction=b.clone().sub(a),length=direction.length();
 const part=add(parent,new THREE.BoxGeometry(length,thickness,thickness),material,a.clone().add(b).multiplyScalar(.5).toArray(),name);
 part.quaternion.setFromUnitVectors(new THREE.Vector3(1,0,0),direction.normalize());return part;
}
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
 // U-shaped floor stand seen in the front, side and top photographs.
 for(const side of [-1,1]){
  box(model,[1.75,.22,.24],[.28,.28,side*.72],'graphite','U-frame side rail');
  cyl(model,.17,.25,[1.08,.28,side*.72],'graphite','z','Rounded front foot');
  cyl(model,.17,.25,[-.55,.28,side*.72],'graphite','z','Rounded rear foot');
 }
 box(model,[.34,.24,1.68],[-.55,.29,0],'graphite','U-frame cross member');
 for(const z of [-.45,.45]){
  box(model,[.24,2.15,.24],[-.52,1.38,z],'graphite','Twin elevation upright');
  for(const y of [.62,1.18,1.74,2.28])cyl(model,.09,.27,[-.52,y,z],'steel','z','Upright pin hole');
 }
 box(model,[.28,.22,1.1],[-.52,2.44,0],'graphite','Upper yoke');
 beamBetween(model,[.4,.42,-.22],[-.28,1.55,-.22],.18,'graphite','Left elevation brace');
 beamBetween(model,[.4,.42,.22],[-.28,1.55,.22],.18,'graphite','Right elevation brace');
 // The real upper assembly is a narrow arrow cradle, not a horizontal bow wing.
 for(const z of [-.2,.2]){
  cyl(model,.12,1.02,[.03,1.68,z],'black','x','Launcher tension rail');
  cyl(model,.18,.28,[.5,1.68,z],'steel','x','Front rail collar');
  cyl(model,.18,.28,[-.43,1.68,z],'steel','x','Rear rail collar');
 }
 box(model,[.36,.54,.58],[-.55,1.68,0],'graphite','Launcher pivot block');
 cyl(model,.075,2.75,[.92,1.76,0],'graphite','x','Long arrow shaft');
 const tip=add(model,new THREE.ConeGeometry(.15,.5,4),'black',[2.5,1.76,0],'Arrow point');tip.rotation.z=-Math.PI/2;
 return finish(model,'弩','U 形支架托住双立柱升降架，斜撑连接上方长箭发射组件。');
}

export function buildModernTank(){
 meshes.length=0;const model=new THREE.Group();
 // Two thin Technic side frames replace the incorrect solid tracked block.
 for(const side of [-1,1]){
  box(model,[3.35,.2,.18],[0,.27,side*.72],'black','Lower side frame');
  for(const x of [-.82,0,.82])cyl(model,.16,.2,[x,.29,side*.73],'steel','z','Side frame roller');
  for(const x of [-1.48,1.48])cyl(model,.25,.38,[x,.72,side*.8],'black','z','Corner tube');
 }
 box(model,[3.2,.24,1.28],[0,.55,0],'graphite','Low tank deck');
 box(model,[.95,.27,1.12],[-.95,.77,0],'steel','Rear armour tiles');
 box(model,[.7,.3,1.02],[.08,.78,0],'black','Central cockpit base');
 for(const side of [-1,1])box(model,[.72,.32,.34],[.25,.91,side*.39],side<0?'orange':'blue','Transparent side canopy');
 for(const side of [-1,1]){
  cyl(model,.19,.28,[.92,.92,side*.56],'steel','z','Forward round module');
  cyl(model,.19,.28,[-1.06,.92,side*.56],'steel','z','Rear round module');
 }
 // One long centre cannon is visible in the top and end photographs.
 cyl(model,.18,2.55,[.05,1.2,0],'steel','x','Central long cannon');
 cyl(model,.25,.38,[1.22,1.2,0],'steel','x','Cannon muzzle sleeve');
 cyl(model,.22,.48,[-1.23,1.2,0],'black','x','Cannon rear sleeve');
 return finish(model,'新型坦克','双侧细梁底盘承载透明座舱、四个角部圆筒与中央长炮。');
}

export function buildGuardianOne(){
 meshes.length=0;const model=new THREE.Group();trackedBase(model,{length:2.3,width:1.28,wheelCount:3,redHubs:true});
 box(model,[1.75,.35,1.05],[0,.77,0],'black','Guardian one hull');
 const mount=new THREE.Group();mount.position.set(-.1,.98,0);model.add(mount);cyl(mount,.22,.72,[0,.12,0],'graphite','z','Cannon pivot');
 const cannon=new THREE.Group();cannon.position.set(.08,.12,0);cannon.rotation.z=.62;mount.add(cannon);
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
