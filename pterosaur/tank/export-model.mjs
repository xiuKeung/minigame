import { writeFile } from 'node:fs/promises';
import { buildTank } from './model.js';
import { GLTFExporter } from '../vendor/GLTFExporter.js';

// GLTFExporter uses FileReader in browsers; this small adapter keeps its
// texture-free binary path usable while generating the checked-in GLB in Node.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(buffer => { this.result = buffer; this.onloadend?.(); }); }
  readAsDataURL(blob) { blob.arrayBuffer().then(buffer => { this.result = `data:${blob.type};base64,${Buffer.from(buffer).toString('base64')}`; this.onloadend?.(); }); }
};
const { tank } = buildTank();
const glb = await new GLTFExporter().parseAsync(tank, { binary: true, onlyVisible: true });
await writeFile(new URL('../assets/yellow-twin-cannon-tank.glb', import.meta.url), Buffer.from(glb));
console.log('Exported pterosaur/assets/yellow-twin-cannon-tank.glb');
