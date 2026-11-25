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
  paleBlue:new THREE.MeshStandardMaterial({color:0x9db4bd,roughness:.38,metalness:.08}),
  cream:new THREE.MeshStandardMaterial({color:0xd9d1ad,roughness:.58}),
  olive:new THREE.MeshStandardMaterial({color:0x596948,roughness:.58}),
  purple:new THREE.MeshStandardMaterial({color:0x63407d,roughness:.45}),
  amber:new THREE.MeshStandardMaterial({color:0xf4942d,roughness:.32,transparent:true,opacity:.78}),
  glass:new THREE.MeshStandardMaterial({color:0xb8c6d4,roughness:.15,metalness:.02,transparent:true,opacity:.57,side:THREE.DoubleSide,depthWrite:false}),
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
 // +X points toward the arrowhead. The first four photographs fix the left,
 // rear, right and front faces; the fifth and sixth reveal the open base.
 for(const side of [-1,1]){
  const foot=new THREE.Shape();foot.moveTo(-.9,.18);foot.lineTo(.93,.18);foot.lineTo(1.08,.29);
  foot.lineTo(1.08,.83);foot.lineTo(.84,.83);foot.lineTo(.78,.69);foot.lineTo(.78,.47);
  foot.lineTo(-.9,.47);foot.closePath();
  for(const [x,y] of [[-.74,.325],[-.29,.325],[.17,.325],[.61,.325],[.94,.68]]){
   const hole=new THREE.Path();hole.absarc(x,y,.088,0,Math.PI*2,true);foot.holes.push(hole);
  }
  const geometry=new THREE.ExtrudeGeometry(foot,{depth:.24,bevelEnabled:false});
  geometry.translate(0,0,side*.71-.12);
  add(model,geometry,'steel',[0,0,0],'L-shaped perforated side foot');
  cyl(model,.075,.255,[-.74,.325,side*.71],'blue','z','Rear foot axle pin');
 }
 // Sparse lateral crossbars and two inner rails leave the open underside visible.
 for(const x of [-.72,.24])box(model,[.2,.19,1.3],[x,.34,0],'steel','Base lateral crossbar');
 for(const z of [-.24,.24])box(model,[1.24,.15,.17],[-.2,.38,z],'steel','Inner sliding rail');
 for(const z of [-.33,0,.33]){
  cyl(model,.098,.205,[.25,.34,z],'graphite','x','Front crossbar opening');
 }
 const hinge=new THREE.Group();hinge.position.set(-.72,.45,0);model.add(hinge);
 cyl(model,.17,.66,[-.72,.45,0],'blue','z','Fold hinge pin');
 // A single central, holed Technic upright is visible from the rear and front.
 const uprightShape=new THREE.Shape();uprightShape.moveTo(-.18,0);uprightShape.lineTo(.18,0);
 uprightShape.lineTo(.18,1.93);uprightShape.absarc(0,1.93,.18,0,Math.PI,false);
 uprightShape.lineTo(-.18,0);
 for(const y of [.21,.52,.83,1.14,1.45,1.76,1.94]){
  const hole=new THREE.Path();hole.absarc(0,y,.104,0,Math.PI*2,true);uprightShape.holes.push(hole);
 }
 const uprightGeometry=new THREE.ExtrudeGeometry(uprightShape,{depth:.27,bevelEnabled:false});
 uprightGeometry.rotateY(Math.PI/2);uprightGeometry.translate(-.135,0,0);
 add(hinge,uprightGeometry,'steel',[0,0,0],'Single perforated folding upright');
 const launcher=new THREE.Group();launcher.position.set(.22,1.58,0);hinge.add(launcher);
 cyl(launcher,.16,.47,[.06,0,0],'steel','y','Launcher pivot socket');
 cyl(launcher,.135,.78,[.45,-.21,0],'black','x','Lower tension barrel');
 cyl(launcher,.068,2.22,[1.14,.12,0],'black','x','Arrow shaft');
 for(const x of [.18,.79]){
  cyl(launcher,.17,.31,[x,.12,0],'steel','x','Arrow guide collar');
  box(launcher,[.18,.24,.25],[x,-.075,0],'steel','Arrow guide support');
 }
 const tip=add(launcher,new THREE.ConeGeometry(.115,.42,4),'black',[2.46,.12,0],'Arrow point');tip.rotation.z=-Math.PI/2;
 const result=finish(model,'弩','单根带孔立梁连接前伸箭杆；左右 L 形支脚形成开放底座，可切换前折的变形姿态。');
 result.rig={hinge,launcher};return result;
}

export function buildModernTank(){
 meshes.length=0;const model=new THREE.Group();
 // +X is the nose: the clear sloping cabins and the cannon opening face forward.
 // The underside photo shows two separate perforated beams, not a solid chassis.
 for(const side of [-1,1]){
  const trackShape=new THREE.Shape();trackShape.moveTo(-1.55,.13);trackShape.lineTo(1.55,.13);
  trackShape.absarc(1.55,.34,.21,-Math.PI/2,Math.PI/2,false);
  trackShape.lineTo(-1.55,.55);trackShape.absarc(-1.55,.34,.21,Math.PI/2,Math.PI*1.5,false);
  for(const x of [-1.55,-1.04,-.52,0,.52,1.04,1.55]){
   const hole=new THREE.Path();hole.absarc(x,.34,.105,0,Math.PI*2,true);trackShape.holes.push(hole);
  }
  const trackGeometry=new THREE.ExtrudeGeometry(trackShape,{depth:.2,bevelEnabled:false});
  trackGeometry.translate(0,0,side*.76-.1);trackGeometry.normalizeNormals();
  add(model,trackGeometry,'black',[0,0,0],'Perforated Technic track beam');
  for(const x of [-1.04,-.52,0,.52,1.04]){
   const ring=add(model,new THREE.TorusGeometry(.11,.025,8,18),'paleBlue',[x,.34,side*.87],'Track axle ring');
   if(Math.abs(x)>1)box(model,[.055,.21,.018],[x,.34,side*.887],'paleBlue','Track end axle pin');
  }
  // The black corner tubes are parallel to the cannon, visible end-on in both end views.
  for(const x of [-1.54,1.54]){
   cyl(model,.17,.58,[x,.91,side*.72],'black','x','Longitudinal corner tube');
   cyl(model,.105,.018,[x+(x>0?.3:-.3),.91,side*.72],'graphite','x','Corner tube opening');
  }
  for(const x of [-1.28,1.27]){
   cyl(model,.22,.34,[x,1.03,side*.68],'paleBlue','y','Open blue corner socket');
   cyl(model,.125,.014,[x,1.207,side*.68],'graphite','y','Corner socket recess');
  }
 }
 // The side silhouette is low and layered: dark lower rail, tan stripe and pale-blue rear tiles.
 box(model,[3.2,.12,1.22],[0,.61,0],'black','Open central spine');
 for(const side of [-1,1]){
  box(model,[3.02,.13,.17],[0,.73,side*.55],'olive','Olive hull edge');
  box(model,[1.45,.2,.14],[.3,.84,side*.57],'cream','Tan side stripe');
  box(model,[.63,.24,.54],[-.88,.92,side*.36],'paleBlue','Rear roof tile one');
  box(model,[.48,.24,.54],[-.31,.92,side*.36],'paleBlue','Rear roof tile two');
  box(model,[.92,.19,.43],[.69,.83,side*.35],'black','Clear cabin sill');
  const canopyProfile=new THREE.Shape();
  canopyProfile.moveTo(.18,.92);canopyProfile.lineTo(1.18,.92);
  canopyProfile.lineTo(.68,1.23);canopyProfile.lineTo(.18,1.23);canopyProfile.closePath();
  const canopyGeometry=new THREE.ExtrudeGeometry(canopyProfile,{depth:.39,bevelEnabled:false});
  canopyGeometry.translate(0,0,side*.36-.195);
  add(model,canopyGeometry,'glass',[0,0,0],'Sloped clear side canopy');
  box(model,[.045,.31,.025],[.17,1.075,side*.56],'steel','Cabin rear frame');
  box(model,[.65,.045,.025],[.51,.91,side*.56],'steel','Cabin lower frame');
 }
 box(model,[.62,.12,.14],[.5,1.28,-.2],'amber','Narrow orange canopy connector');
 box(model,[.85,.18,.42],[-.62,1.15,0],'purple','Purple cannon support');
 box(model,[.48,.3,.52],[1.29,.94,0],'cream','Cream nose block');
 box(model,[.42,.22,.44],[1.47,.75,0],'blue','Blue nose brick');
 for(const x of [-.75,.48])cyl(model,.19,1.1,[x,1.48,0],'paleBlue','x','Segmented light-blue cannon');
 cyl(model,.235,.1,[-.14,1.48,0],'steel','x','Cannon segment seam');
 cyl(model,.235,.27,[-.27,1.48,0],'paleBlue','y','Top cannon connector');
 cyl(model,.115,.015,[-.27,1.625,0],'graphite','y','Top connector recess');
 cyl(model,.125,.018,[1.05,1.48,0],'black','x','Cannon bore');
 const muzzleRing=add(model,new THREE.TorusGeometry(.16,.027,8,20),'steel',[1.065,1.48,0],'Cannon muzzle rim');
 muzzleRing.rotation.y=Math.PI/2;
 cyl(model,.23,.35,[-1.22,1.37,0],'black','y','Rear vertical socket');
 cyl(model,.13,.015,[-1.22,1.552,0],'graphite','y','Rear socket recess');
 for(const x of [-.65,0,.65]){
  cyl(model,.14,.08,[x,.59,0],'paleBlue','y','Underside axle connector');
  cyl(model,.07,.012,[x,.545,0],'black','y','Underside connector hole');
 }
 return finish(model,'新型坦克','带孔双侧履带梁、透明斜面座舱、四角圆筒与分段浅蓝灰主炮。');
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
