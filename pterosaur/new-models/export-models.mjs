import {writeFile} from 'node:fs/promises';
import {GLTFExporter} from '../vendor/GLTFExporter.js';
import {buildCrossbow,buildModernTank,buildGuardianOne,buildGuardianTwo} from './model.js';

globalThis.FileReader=class {
  readAsArrayBuffer(blob){blob.arrayBuffer().then(buffer=>{this.result=buffer;this.onloadend?.();});}
  readAsDataURL(blob){blob.arrayBuffer().then(buffer=>{this.result=`data:${blob.type};base64,${Buffer.from(buffer).toString('base64')}`;this.onloadend?.();});}
};
const assets=[['crossbow',buildCrossbow],['modern-tank',buildModernTank],['guardian-tank-1',buildGuardianOne],['guardian-tank-2',buildGuardianTwo]];
for(const [name,build] of assets){const {model}=build();const glb=await new GLTFExporter().parseAsync(model,{binary:true,onlyVisible:true});await writeFile(new URL(`../assets/${name}.glb`,import.meta.url),Buffer.from(glb));console.log(`Exported assets/${name}.glb`);}
