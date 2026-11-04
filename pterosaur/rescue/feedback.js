import * as THREE from '../vendor/three.module.js';
const palette={damage:'#ff788b',hit:'#ffe4a0',destroy:'#ffbd65',break:'#9ec3e1',collect:'#c39cff',rescue:'#8fe2cb',power:'#67e6d9',dock:'#8abfff',block:'#a0ecff',attack:'#f9db93',dash:'#b3d8ff',win:'#ffe486',shield:'#83e3cf'};
export function createFeedback(scene){
 const count=96,positions=new Float32Array(count*3),colors=new Float32Array(count*3),particles=[];
 positions.fill(1e5);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
 const points=new THREE.Points(geometry,new THREE.PointsMaterial({size:5,sizeAttenuation:false,transparent:true,opacity:.9,vertexColors:true,depthWrite:false}));points.frustumCulled=false;scene.add(points);
 let seen=0,lastDamage=-99,lastImpact=-99,ringTime=-99;
 const ring=new THREE.Mesh(new THREE.RingGeometry(.55,.68,40),new THREE.MeshBasicMaterial({color:'#9bcaff',transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));scene.add(ring);
 return {
  reset(){seen=0;particles.length=0;lastDamage=lastImpact=ringTime=-99;},
  update(s,sound,reduced=false){
   for(const event of s.fx){if(event.id<=seen)continue;seen=event.id;
    if(s.time-event.time>.3)continue;
    sound.play(event.type);
    if(event.type==='damage')lastDamage=s.time;
    if(['damage','destroy','break'].includes(event.type))lastImpact=s.time;
    if(['dock','power','collect','rescue'].includes(event.type)){ringTime=s.time;ring.position.set(event.x,event.y,.8);ring.material.color.set(palette[event.type]);}
    const n=reduced?4:['break','destroy','win'].includes(event.type)?28:12,color=new THREE.Color(palette[event.type]||'#ffffff');
    for(let i=0;i<n;i++){const angle=(i/n)*Math.PI*2,speed=1.5+(i%5)*.6;particles.push({x:event.x,y:event.y,z:.8,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed+1.1,born:s.time,life:.55+(i%4)*.1,color});}
    if(particles.length>count)particles.splice(0,particles.length-count);
   }
   for(let i=particles.length-1;i>=0;i--)if(s.time-particles[i].born>particles[i].life)particles.splice(i,1);
   positions.fill(1e5);
   particles.forEach((p,i)=>{const age=s.time-p.born;positions.set([p.x+p.vx*age,p.y+p.vy*age-age*age*3,p.z],i*3);colors.set([p.color.r,p.color.g,p.color.b],i*3);});
   geometry.attributes.position.needsUpdate=true;geometry.attributes.color.needsUpdate=true;
   const elapsed=s.time-ringTime;ring.visible=elapsed<.6;ring.scale.setScalar(1+elapsed*3);ring.material.opacity=Math.max(0,.6-elapsed);
   return {flash:Math.max(0,1-(s.time-lastDamage)/.25),shake:reduced?0:Math.max(0,1-(s.time-lastImpact)/.25)*Math.sin(s.time*65)*.12};
  }
 };
}
export function createSound(){
 let context,enabled=true;try{enabled=localStorage.getItem('rescue-sound')!=='off';}catch{}
 function unlock(){if(!enabled)return;try{context??=new (window.AudioContext||window.webkitAudioContext)();if(context.state==='suspended')context.resume().catch(()=>{});}catch{}}
 function tone(frequency,start,duration=.12,type='sine',volume=.045){
  const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,start);oscillator.frequency.exponentialRampToValueAtTime(frequency*.7,start+duration);
  gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(volume,start+.012);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
  oscillator.connect(gain);gain.connect(context.destination);oscillator.start(start);oscillator.stop(start+duration+.02);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
 }
 return {get enabled(){return enabled;},unlock,toggle(){enabled=!enabled;try{localStorage.setItem('rescue-sound',enabled?'on':'off');}catch{}if(enabled)unlock();return enabled;},play(type){
  if(!enabled||!context||context.state!=='running')return;const now=context.currentTime;
  if(['win','power','rescue'].includes(type)){[440,554,660].forEach((f,i)=>tone(f,now+i*.075,.18));return;}
  const freq={attack:180,hit:480,destroy:85,damage:120,break:65,collect:880,dock:620,block:720,dash:200,shield:350}[type]||300;
  tone(freq,now,['break','destroy'].includes(type)?.25:.12,['damage','break','destroy'].includes(type)?'triangle':'sine');
 }};
}
