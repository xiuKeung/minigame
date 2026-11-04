import { writeFile } from 'node:fs/promises';
import { buildModel } from './model.js';
import { GLTFExporter } from './vendor/GLTFExporter.js';

// Node-compatible FileReader for the exporter's texture-free binary output.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(buffer => { this.result = buffer; this.onloadend?.(); }); }
  readAsDataURL(blob) { blob.arrayBuffer().then(buffer => { this.result = `data:${blob.type};base64,${Buffer.from(buffer).toString('base64')}`; this.onloadend?.(); }); }
};
const versions = ['mechanical-pterosaur','pterosaur-standing','pterosaur-resting','carrier','detached-pair','detached-resting'];
for (const name of versions) {
  const {model,chassis,creature,poseCreature} = buildModel();
  const standing = name === 'pterosaur-standing' || name === 'detached-pair';
  poseCreature({stand:standing ? 1 : 0,grounded:name === 'mechanical-pterosaur' || name === 'carrier' ? 0 : 1});
  if (name.startsWith('pterosaur-')) chassis.visible = false;
  if (name === 'carrier') creature.visible = false;
  if (name.startsWith('detached-')) { chassis.position.z=-1.72; creature.position.z=2.45; creature.position.x+=.28; }
  model.updateMatrixWorld(true);
  const binary = await new GLTFExporter().parseAsync(model, {binary:true,onlyVisible:true});
  await writeFile(new URL(`./assets/${name}.glb`,import.meta.url),Buffer.from(binary));
  console.log(`${name}: ${binary.byteLength} bytes`);
}
