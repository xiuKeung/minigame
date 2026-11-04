import * as THREE from './vendor/three.module.js';

// Reconstructed from 18 photographs, including the detached creature and carrier.
// X points toward the beak, Y is up, Z spans the two sides.
export function buildModel() {
  const model = new THREE.Group();
  model.name = 'Mechanical pterosaur on four-wheel carrier';
  const chassis = new THREE.Group(); chassis.name = 'Four-wheel carrier'; model.add(chassis);
  const creature = new THREE.Group(); creature.name = 'Mechanical pterosaur'; model.add(creature);
  const mats = {
    yellow: new THREE.MeshStandardMaterial({ color: 0xf5b800, roughness: .29, metalness: .03 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xe6a100, roughness: .34 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x222629, roughness: .38 }),
    tire: new THREE.MeshStandardMaterial({ color: 0x181a1b, roughness: .85 }),
    gray: new THREE.MeshStandardMaterial({ color: 0x62696b, roughness: .42, metalness: .12 }),
    silver: new THREE.MeshStandardMaterial({ color: 0xaeb4b2, roughness: .35, metalness: .25 }),
    red: new THREE.MeshStandardMaterial({ color: 0xc81421, roughness: .16, metalness: .15, emissive: 0x660000, emissiveIntensity: .18 }),
    smoke: new THREE.MeshStandardMaterial({ color: 0x494231, roughness: .19, metalness: .14 }),
  };
  let count = 0;
  function mesh(parent, geometry, material, x = 0, y = 0, z = 0, name = 'Brick') {
    const m = new THREE.Mesh(geometry, mats[material]);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
    m.name = name; parent.add(m); count++; return m;
  }
  function box(p, w, h, d, x, y, z, mat = 'yellow', name) {
    return mesh(p, new THREE.BoxGeometry(w, h, d), mat, x, y, z, name);
  }
  function cyl(p, r, h, x, y, z, mat = 'gray', axis = 'y', name) {
    const m = mesh(p, new THREE.CylinderGeometry(r, r, h, 32), mat, x, y, z, name);
    if (axis === 'z') m.rotation.x = Math.PI / 2;
    if (axis === 'x') m.rotation.z = Math.PI / 2;
    return m;
  }
  function ball(p, r, x, y, z) { return mesh(p, new THREE.SphereGeometry(r, 20, 12), 'gray', x, y, z, 'Ball joint'); }
  // A closed, faceted prism, for the characteristic triangular LEGO-style panels.
  function prism(p, points, depth, x, y, z, mat = 'yellow', plane = 'xz', name = 'Wedge panel') {
    const shape = new THREE.Shape(); shape.moveTo(...points[0]);
    points.slice(1).forEach(pt => shape.lineTo(...pt)); shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: .014, bevelSize: .014, bevelSegments: 1, steps: 1 });
    if (plane === 'xz') { g.rotateX(Math.PI / 2); g.translate(0, depth / 2, 0); }
    else g.translate(0, 0, -depth / 2);
    return mesh(p, g, mat, x, y, z, name);
  }
  function stud(p, x, y, z, mat = 'yellow') { return cyl(p, .145, .09, x, y, z, mat, 'y', 'Round stud'); }
  function tube(p, outer, inner, depth, x, y, z, mat = 'gray', axis = 'y', name = 'Hollow connector') {
    const shape = new THREE.Shape(); shape.absarc(0, 0, outer, 0, Math.PI * 2, false);
    const hole = new THREE.Path(); hole.absarc(0, 0, inner, 0, Math.PI * 2, true); shape.holes.push(hole);
    const geometry = new THREE.ExtrudeGeometry(shape, {depth, bevelEnabled:false, curveSegments:20});
    geometry.translate(0, 0, -depth / 2);
    if (axis === 'y') geometry.rotateX(-Math.PI / 2);
    if (axis === 'x') geometry.rotateY(Math.PI / 2);
    return mesh(p, geometry, mat, x, y, z, name);
  }

  // Carrier: a rectangular black/gray frame, visible light gray studs, and yellow hood.
  box(chassis, 6.5, .28, 2.56, 0, 1.26, 0, 'dark', 'Lower chassis');
  box(chassis, 5.86, .42, 2.22, -.08, 1.05, 0, 'dark', 'Underbody');
  box(chassis, 5.75, .18, 2.42, -.15, 2.14, 0, 'gray', 'Deck supporting plate');
  // The detached photos establish that these large swept panels stay on the car.
  for (const s of [-1, 1]) {
    prism(chassis, [[-1.66,s*.59],[-1.66,s*1.77],[1.27,s*1.18],[1.27,s*.59]], .16, 0, 2.36, 0, 'yellow', 'xz', 'Fixed trapezoid roof panel');
    for (const x of [-1.35,-.75,-.15]) box(chassis,.12,.095,.16,x,2.245,s*(1.7-(x+1.66)*.2),'yellow','Roof panel underside tab');
    box(chassis,1.11,.16,.57,-2.235,2.36,s*.91,'yellow','Rear yellow deck rail');
  }
  box(chassis,1.40,.16,1.16,-.95,2.36,0,'yellow','Central roof tile');
  box(chassis,1.16,.15,1.16,.35,2.365,0,'dark','Four-stud docking plate');
  for (const x of [.06,.64]) for (const z of [-.29,.29]) {
    cyl(chassis,.183,.12,x,2.5,z,'dark','y','Docking stud');
    if(x>.5&&z>.0) tube(chassis,.073,.024,.009,x,2.564,z,'gray','y','Docking stud mould mark');
  }
  for(const x of [1.48,2.02]) box(chassis,.52,.18,2.37,x,2.37,0,'yellow','Front roof cross tile');
  prism(chassis, [[2.31,-1.18],[2.56,0],[2.31,1.18],[2.20,1.18],[2.20,-1.18]], .33,0,2.31,0,'yellow','xz','Pointed front roof lip');
  // Two light-gray grille tiles, with actual gaps between their ribs.
  for(const z of [-.30,.30]) {
    box(chassis,1.10,.08,.56,-2.23,2.315,z,'dark','Recess below grille');
    for(const x of [-2.51,-1.95]) stud(chassis,x,2.365,z,'silver');
    for(const offset of [-.23,0,.23]) box(chassis,1.08,.10,.062,-2.23,2.415,z+offset,'silver','Rear grille rib');
    for(const x of [-2.74,-1.72]) box(chassis,.055,.10,.54,x,2.415,z,'silver','Grille end bar');
  }
  for (const s of [-1, 1]) {
    box(chassis, 6.06, .16, .17, -.06, 1.47, s * 1.28, 'gray', 'Lower side rail');
    box(chassis, 5.64, .18, .19, -.17, 2.02, s * 1.28, 'gray', 'Upper side rail');
    for (const x of [-2.87, -.12, 2.61]) box(chassis, .24, .54, .19, x, 1.74, s * 1.28, 'gray', 'Frame upright');
    box(chassis, 4.95, .38, .16, -.16, 1.73, s * 1.03, 'dark');
    for (const x of [-2.38, -1.77, -1.16]) cyl(chassis, .23, .19, x, 1.72, s * 1.18, 'silver');
    cyl(chassis, .48, .17, 1.26, 1.73, s * 1.12, 'silver');
    box(chassis, 1.7, .28, .47, 1.56, 2.28, s * .92);
    box(chassis, .50, .72, .24, 2.52, 1.9, s * 1.14, 'dark');
    prism(chassis, [[0, 0], [.82, 0], [.59, .29], [0, .35]], .64, 2.49, 1.69, s * .65, 'yellow', 'xy', 'Sloped front bumper');
    box(chassis, .46, .45, .42, -3.22, 1.66, s * 1.08, 'dark', 'Rear rod mounting block');
    tube(chassis,.215,.115,.12,-3.22,1.66,s*1.34,'red','z','Round translucent rear side light');
    tube(chassis,.135,.081,.075,-3.47,1.74,s*.99,'gray','x','Rod collar');
    cyl(chassis, .074, .55, -3.62, 1.74, s * .99, 'gray', 'x');
    cyl(chassis, .11, .63, -4.02, 1.74, s * .99, 'silver', 'x', 'Twin rear rod');
    tube(chassis, .17, .082, .13, -4.39, 1.74, s * .99, 'red', 'x', 'Hollow red end cap');
  }
  box(chassis,.50,.14,2.45,-3.24,1.99,0,'yellow','Rear upper bumper');
  box(chassis,.43,.12,2.39,-3.25,1.37,0,'yellow','Rear lower bumper');
  box(chassis, .32, .38, 2.38, 3.14, 1.46, 0, 'yellow', 'Front yellow fascia');
  box(chassis, .14, .12, 2.60, 3.25, 1.59, 0, 'gray', 'Front bumper rail');
  for (const s of [-1, 1]) prism(chassis, [[0, 0], [.88, 0], [.69, .25], [.12, .36], [0, .33]], 1.03, 2.45, 1.83, s * .53, 'yellow', 'xy', 'Split front hood');
  box(chassis,.12,.23,1.03,3.34,1.86,0,'dark','Black inset front grille');
  prism(chassis, [[0,0],[.97,0],[.93,.15],[.66,.32],[.20,.40],[0,.38]],1.03,2.41,1.85,0,'yellow','xy','Raised centre nose');
  for (const x of [-2.05, 2.08]) {
    cyl(chassis, .115, 3.48, x, .84, 0, 'gray', 'z', 'Wheel axle');
    for (const s of [-1, 1]) {
      const wheel = new THREE.Group(); wheel.name = 'Wheel with tread and spoked rim'; wheel.position.set(x, .85, s * 1.51); chassis.add(wheel);
      cyl(wheel, .80, .53, 0, 0, 0, 'tire', 'z', 'Rubber tire');
      for (const edge of [-1, 1]) {
        const ring = mesh(wheel, new THREE.TorusGeometry(.62, .155, 10, 48), 'tire', 0, 0, edge * .22, 'Rounded tire sidewall');
        ring.rotation.z = .05;
      }
      // Block tread along the circumference, visible in both side and overhead views.
      for (let i = 0; i < 36; i++) for (const row of [-1, 0, 1]) {
        const a = i / 36 * Math.PI * 2 + row * .038;
        const tread = box(wheel, .107, .036, .15, Math.sin(a) * .803, Math.cos(a) * .803, row * .166, 'tire', 'Tread block');
        tread.rotation.z = -a;
      }
      // Bake the static tread blocks together: same shape, one draw call per tire.
      const blocks=wheel.children.filter(m=>m.name==='Tread block');
      const baked=blocks.map(m=>{m.updateMatrix();return m.geometry.toNonIndexed().applyMatrix4(m.matrix);});
      const treadGeometry=new THREE.BufferGeometry();
      for(const attribute of ['position','normal','uv']) {
        const length=baked.reduce((sum,g)=>sum+g.attributes[attribute].array.length,0);
        const data=new Float32Array(length); let offset=0;
        baked.forEach(g=>{data.set(g.attributes[attribute].array,offset);offset+=g.attributes[attribute].array.length;});
        treadGeometry.setAttribute(attribute,new THREE.BufferAttribute(data,baked[0].attributes[attribute].itemSize));
      }
      blocks.forEach(m=>{wheel.remove(m);m.geometry.dispose();}); baked.forEach(g=>g.dispose()); count-=blocks.length;
      mesh(wheel,treadGeometry,'tire',0,0,0,'Baked tread blocks');
      const zz = s * .293;
      cyl(wheel, .545, .047, 0, 0, zz, 'silver', 'z', 'Rim');
      cyl(wheel, .461, .055, 0, 0, zz + s * .014, 'gray', 'z', 'Recessed rim');
      const rim = mesh(wheel, new THREE.TorusGeometry(.48, .028, 8, 40), 'silver', 0, 0, zz + s * .052, 'Rim lip');
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2;
        const spoke = box(wheel, .060, .35, .055, Math.sin(a)*.30, Math.cos(a)*.30, zz + s * .046, 'silver', 'Radial wheel spoke'); spoke.rotation.z = -a;
      }
      cyl(wheel, .158, .10, 0, 0, zz + s * .055, 'silver', 'z', 'Wheel hub');
      cyl(wheel, .065, .106, 0, 0, zz + s * .06, 'gray', 'z');
    }
  }
  // Creature anatomy is independent of the carrier. Local +X points toward the head.
  // Its pivoted spine allows the standing pose from photos 07–11 without scaling parts.
  const torso = new THREE.Group(); torso.name = 'Hollow upper torso'; creature.add(torso);
  box(torso,1.26,.12,1.10,0,.16,0,'yellow','Curved yellow chest tile');
  prism(torso,[[-.63,.08],[-.63,.21],[-.20,.27],[.42,.26],[.63,.19],[.63,.08]],1.10,0,0,0,'yellow','xy','Rounded chest surface');
  for(const z of [-.49,.49]) box(torso,1.24,.27,.12,0,-.015,z,'dark','Torso cavity side wall');
  for(const x of [-.56,.56]) box(torso,.13,.27,.88,x,-.015,0,'dark','Torso cavity end wall');
  tube(torso,.17,.102,.22,0,-.045,0,'dark','y','Torso underside tube');
  // A single ball pivot under the two curved beak tiles, visible in the new side views.
  box(torso,.26,.25,.47,.66,.015,0,'gray','Neck clip base');
  ball(torso,.22,.80,.08,0);
  const head = new THREE.Group(); head.name='Articulated long beak'; head.position.set(.80,.08,0); creature.add(head);
  box(head,.45,.16,.62,.13,.08,0,'dark','Black beak connector');
  for(const sign of [-1,1]) {
    const outline=new THREE.Shape();
    outline.moveTo(-.23,.18); outline.lineTo(2.28,-.13); outline.lineTo(2.29,-.06);
    outline.bezierCurveTo(1.76,.23,.64,.52,-.23,.47); outline.closePath();
    const geo=new THREE.ExtrudeGeometry(outline,{depth:.534,bevelEnabled:true,bevelThickness:.012,bevelSize:.012,bevelSegments:2,curveSegments:18});
    geo.translate(0,0,-.267);
    mesh(head,geo,'yellow',0,0,sign*.278,'Smooth curved beak tile');
    box(head,.42,.13,.35,.49,.065,sign*.25,'dark','Underside beak support');
  }
  // Paired waist cups have an open U contour around the ball, rather than solid cubes.
  function cup(p,x,y,z,axis='x') {
    const g = new THREE.Group(); g.position.set(x,y,z); p.add(g); g.name='Open ball socket';
    if(axis==='z') g.rotation.y=-Math.PI/2;
    prism(g,[[.25,-.23],[-.19,-.23],[-.23,-.13],[-.10,-.13],[.04,-.10],[.10,0],[.04,.10],[-.10,.13],[-.23,.13],[-.19,.23],[.25,.23]],.22,0,0,0,'gray','xz','U shaped ball cup');
    return g;
  }
  const lower = new THREE.Group(); lower.name='Articulated lower torso'; lower.position.set(-.86,0,0); creature.add(lower);
  for(const z of [-.29,.29]) {
    cup(torso,-.63,0,z);
    ball(lower,.17,0,0,z);
    cyl(lower,.087,.24,-.22,0,z,'gray','x','Waist ball stem');
  }
  box(lower,1.15,.26,1.07,-.88,-.025,0,'gray','Lower torso backing');
  box(lower,1.11,.13,.88,-.88,-.22,0,'dark','Lower torso underside');
  for(const x of [-.59,-1.17]) {
    box(lower,.563,.12,1.095,x,.174,0,'yellow','Individual lower torso tile');
    tube(lower,.025,.015,.005,x,.237,0,'gold','y','Tile moulding dimple');
  }
  prism(lower,[[-1.4,-.14],[-.34,-.14],[-.42,-.29],[-.94,-.38],[-1.4,-.28]],.85,0,0,0,'yellow','xy','Curved lower torso underside');
  const legs = new THREE.Group(); legs.name='Knee hinge and paired ankles'; legs.position.set(-1.56,-.02,0); lower.add(legs);
  for(const z of [-.48,0,.48]) cyl(legs,.195,.20,0,0,z,'gray','z','Barrel hinge knuckle');
  cyl(legs,.105,1.22,0,0,0,'dark','z','Knee hinge pin');
  const kneePanel=box(legs,.66,.12,1.00,-.29,.12,0,'dark','Folded black knee panel'); kneePanel.rotation.z=-.28;
  box(legs,.11,.29,1.00,-.59,.02,0,'dark','Raised knee panel rim');
  const feet=[];
  for(const sign of [-1,1]) {
    box(legs,.57,.18,.21,-.42,-.04,sign*.47,'gray','Short ankle link');
    ball(legs,.17,-.73,-.055,sign*.47);
    const foot=new THREE.Group(); foot.name=sign>0?'Right hollow L foot':'Left hollow L foot';
    foot.position.set(-.73,-.055,sign*.47); legs.add(foot); feet.push(foot);
    // Open rectangular foot underside and a circular connection sleeve.
    box(foot,.68,.105,.47,-.22,.10,0,'dark','Foot sole');
    box(foot,.10,.32,.47,-.51,-.045,0,'dark','Foot heel wall');
    for(const z of [-.20,.20]) box(foot,.54,.26,.065,-.20,-.025,z,'dark','Foot cavity wall');
    tube(foot,.112,.065,.19,-.22,-.025,0,'gray','y','Foot underside connector');
    box(foot,.14,.27,.44,.09,-.025,0,'gray','Ankle cup backing');
  }
  // Each wing is one compact square brick with a raised triangular wedge.
  // The rectangular hollow back and circular moulded recess are visible in photos 07/11.
  const wings=[];
  for(const sign of [-1,1]) {
    const wing=new THREE.Group(); wing.name=sign>0?'Right small triangular wing':'Left small triangular wing';
    wing.position.set(.03,.00,sign*.81); creature.add(wing); wings.push(wing);
    const socket=cup(torso,.03,0,sign*.58,'z'); if(sign<0) socket.rotation.y=Math.PI/2;
    ball(wing,.17,0,0,0);
    cyl(wing,.075,.34,0,0,sign*.17,'gray','z','Shoulder ball stem');
    const zz=sign*.83;
    box(wing,1.08,.10,1.06,0,.04,zz,'gold','Square wing plate');
    for(const x of [-.50,.50]) box(wing,.09,.20,1.07,x,-.10,zz,'gray','Wing underside rim');
    for(const z of [zz-.49,zz+.49]) box(wing,.93,.20,.09,0,-.10,z,'gray','Wing underside rim');
    tube(wing,.145,.08,.18,0,-.09,zz,'gray','y','Wing underside sleeve');
    // Recessed circular moulding lies beneath the raised triangle, not a diagonal crossbar.
    tube(wing,.20,.155,.017,-.10,.103,zz,'gold','y','Wing circular mould detail');
    prism(wing,[[.53,zz-sign*.53],[.53,zz+sign*.53],[-.53,zz+sign*.53]],.18,0,.19,0,'yellow','xz','Raised triangular wing face');
  }

  let standingHeight=3.3;
  function poseCreature({stand=0,wing=0,headPitch=0,lift=0,grounded=0}={}) {
    stand=THREE.MathUtils.clamp(stand,0,1); wing=THREE.MathUtils.clamp(wing,0,1);
    const angle=stand*1.50;
    creature.position.set(.38,THREE.MathUtils.lerp(2.91,standingHeight,stand)+lift,0);
    creature.rotation.z=angle;
    lower.rotation.z=-stand*.32;
    legs.rotation.z=stand*.22;
    head.rotation.z=-angle-stand*.12+headPitch;
    feet.forEach(foot=>{foot.rotation.z=-stand*1.40;});
    wings.forEach((w,i)=>{const sign=i?1:-1;w.rotation.x=-sign*wing*.70;w.rotation.y=sign*wing*.20;});
    model.updateMatrixWorld(true);
    if(grounded>0) {
      creature.position.y-=new THREE.Box3().setFromObject(creature).min.y*grounded;
      model.updateMatrixWorld(true);
    }
  }
  // Ground the photographed standing pose using its actual foot geometry.
  poseCreature({stand:1});
  const standingBounds=new THREE.Box3().setFromObject(creature);
  standingHeight-=standingBounds.min.y;
  poseCreature();
  model.userData={
    description:'Geometric reconstruction from 18 user photographs including detached standing and bare carrier views. Hidden internal details and intermediate articulation remain approximate.',
    sourcePhotoCount:18, revision:2,
  };
  return {model,chassis,creature,wings,head,lower,legs,feet,poseCreature,materials:mats,meshCount:count};
}
