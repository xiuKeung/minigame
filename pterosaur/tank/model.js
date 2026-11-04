import * as THREE from '../vendor/three.module.js';

// Hand-built from the five supplied photographs. +X is the armoured nose,
// +Y is up, and +Z spans the left and right tracks.
export function buildTank() {
  const tank = new THREE.Group();
  tank.name = 'Yellow twin-cannon brick tank';
  const materials = {
    yellow: new THREE.MeshStandardMaterial({ color: 0xf0a900, roughness: .31, metalness: .04 }),
    yellowDark: new THREE.MeshStandardMaterial({ color: 0xca7800, roughness: .37, metalness: .03 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x191b1c, roughness: .52, metalness: .06 }),
    gray: new THREE.MeshStandardMaterial({ color: 0x9ca1a1, roughness: .42, metalness: .22 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x111213, roughness: .88 }),
    smoke: new THREE.MeshStandardMaterial({ color: 0x5c5546, roughness: .35, metalness: .12 }),
  };
  const meshes = [];
  const add = (parent, geometry, material, position, name) => {
    const mesh = new THREE.Mesh(geometry, materials[material]);
    mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.name = name; parent.add(mesh); meshes.push(mesh); return mesh;
  };
  const box = (p, size, pos, mat = 'yellow', name = 'Brick') => add(p, new THREE.BoxGeometry(...size), mat, pos, name);
  const cylinder = (p, radius, height, pos, mat = 'gray', axis = 'y', name = 'Cylinder') => {
    const m = add(p, new THREE.CylinderGeometry(radius, radius, height, 24), mat, pos, name);
    if (axis === 'x') m.rotation.z = Math.PI / 2;
    if (axis === 'z') m.rotation.x = Math.PI / 2;
    return m;
  };
  const stud = (p, pos, mat = 'yellow') => cylinder(p, .13, .085, pos, mat, 'y', 'Round stud');
  const wedge = (p, points, depth, pos, mat = 'yellow', name = 'Sloped armour') => {
    const shape = new THREE.Shape(); shape.moveTo(...points[0]); points.slice(1).forEach(point => shape.lineTo(...point)); shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: .018, bevelSize: .018, bevelSegments: 1 });
    // The outline is already in the X/Y armour plane; centre its depth on Z.
    geometry.translate(0, 0, -depth / 2);
    return add(p, geometry, mat, pos, name);
  };

  const hull = new THREE.Group(); hull.name = 'Tracked hull'; tank.add(hull);
  // Lower black frame and the large yellow slab seen in both side images.
  box(hull, [5.9, .32, 2.38], [0, .67, 0], 'dark', 'Lower black chassis');
  box(hull, [5.42, .47, 2.02], [-.06, .95, 0], 'yellowDark', 'Lower yellow hull');
  box(hull, [4.7, .36, 1.72], [-.12, 1.25, 0], 'yellow', 'Armoured hull deck');
  box(hull, [1.17, .44, 1.8], [2.56, 1.03, 0], 'dark', 'Front black intake');
  wedge(hull, [[1.75, .02], [2.89, .02], [2.89, .47], [2.53, .67], [1.74, .42]], 1.82, [0, 1.25, 0], 'yellow', 'Raised front glacis');
  box(hull, [.52, .22, 2.1], [2.93, .94, 0], 'yellow', 'Front bumper tile');
  box(hull, [.34, .17, 2.2], [2.96, .69, 0], 'dark', 'Front lower bumper');
  // Rear has a black step and two asymmetric yellow aft plates.
  box(hull, [.65, .42, 1.82], [-2.64, 1.13, 0], 'dark', 'Rear equipment block');
  box(hull, [.84, .16, 2.11], [-2.48, 1.49, 0], 'yellow', 'Rear deck edge');
  for (const side of [-1, 1]) {
    box(hull, [1.1, .34, .28], [-2.0, 1.47, side * .8], 'yellow', 'Rear side armour');
    box(hull, [5.65, .18, .16], [-.02, .88, side * 1.16], 'dark', 'Track guard');
    // Three horizontal ribs are visible in the side grille.
    box(hull, [1.04, .47, .07], [.02, 1.24, side * 1.04], 'dark', 'Side grille recess');
    for (const y of [1.08, 1.24, 1.4]) box(hull, [1.02, .055, .11], [.02, y, side * 1.1], 'gray', 'Side grille rib');
  }

  // The small dark rollers are recessed behind the yellow side skirts.
  for (const side of [-1, 1]) {
    const track = new THREE.Group(); track.name = side > 0 ? 'Right continuous track' : 'Left continuous track'; track.position.z = side * 1.2; hull.add(track);
    const rail = box(track, [5.36, .54, .28], [-.03, .63, 0], 'rubber', 'Continuous rubber track');
    rail.geometry.translate(0, 0, 0);
    for (const x of [-2.18, -1.36, -.54, .28, 1.1, 1.92]) {
      cylinder(track, .26, .32, [x, .64, side * .01], 'rubber', 'z', 'Track roller');
      cylinder(track, .155, .342, [x, .64, side * .012], 'gray', 'z', 'Roller hub');
    }
  }

  const turret = new THREE.Group(); turret.name = 'Twin cannon rotating turret'; turret.position.set(-.10, 1.62, 0); hull.add(turret);
  // The photos show a long squared turret, with a recessed rectangular centre and raised rear deck.
  box(turret, [3.66, .39, 1.78], [-.14, .18, 0], 'yellow', 'Turret lower armour');
  box(turret, [3.0, .28, 1.46], [-.28, .48, 0], 'yellow', 'Turret upper armour');
  box(turret, [1.06, .20, 1.18], [-.31, .67, 0], 'yellow', 'Turret central hatch');
  box(turret, [1.05, .18, .95], [.61, .69, 0], 'dark', 'Open turret well');
  box(turret, [1.15, .16, .52], [-1.75, .68, 0], 'yellowDark', 'Rear turret cap');
  wedge(turret, [[1.32, .03], [1.92, .03], [1.7, .29], [1.18, .40]], 1.66, [0, .42, 0], 'yellow', 'Turret front slope');
  for (const side of [-1, 1]) {
    box(turret, [2.5, .2, .16], [-.28, .47, side * .82], 'yellowDark', 'Turret side rail');
    box(turret, [.92, .37, .22], [-.3, .15, side * .91], 'yellow', 'Turret side block');
  }
  for (const x of [-.7, -.42, -.14, .14]) stud(turret, [x, .84, -.48], 'yellowDark');

  // Keep the neutral 0° position level and above the turret deck.  The source
  // bricks have enough clearance here for the interactive upward elevation.
  const cannons = new THREE.Group(); cannons.name = 'Paired elevation cannon assembly'; cannons.position.set(1.1, .60, 0); turret.add(cannons);
  const barrelParts = [];
  for (const side of [-1, 1]) {
    const pivot = cylinder(cannons, .18, .34, [0, .38, side * .34], 'yellowDark', 'z', 'Cannon elevation pivot');
    const barrel = new THREE.Group(); barrel.name = side > 0 ? 'Right cannon barrel' : 'Left cannon barrel'; barrel.position.set(.12, .38, side * .34); cannons.add(barrel); barrelParts.push(barrel);
    const stem = cylinder(barrel, .105, 1.83, [.84, 0, 0], 'gray', 'x', 'Cannon barrel');
    const sleeve = cylinder(barrel, .16, .58, [1.72, 0, 0], 'gray', 'x', 'Cannon muzzle sleeve');
    const bore = cylinder(barrel, .077, .018, [2.02, 0, 0], 'dark', 'x', 'Hollow cannon muzzle');
  }
  tank.userData = {
    description: 'Geometric reconstruction of the supplied yellow brick tank photographs. The turret and twin cannon elevation are interactive approximations.',
    sourcePhotoCount: 5,
    turret,
    cannons,
    barrelParts,
    materials,
    meshCount: meshes.length,
  };
  return { tank, hull, turret, cannons, barrelParts, materials, meshCount: meshes.length };
}
