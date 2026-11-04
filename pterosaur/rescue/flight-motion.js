// Visual motion only: the gameplay position and collision shape never rotate.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const follow=(value,target,rate,dt)=>value+(target-value)*(1-Math.exp(-rate*dt));
export function createFlightMotion(){return {yaw:0,pitch:0,bank:0,wing:0,bob:0,phase:0,facing:1,speed:0,previous:null};}
export function updateFlightMotion(m,s){
 const previous=m.previous;
 const dt=previous?clamp(s.time-previous.time,0,.1):0;
 m.previous={x:s.bird.x,y:s.bird.y,time:s.time,docked:s.docked};
 if(s.docked||s.respawn>0){Object.assign(m,{yaw:0,pitch:0,bank:0,wing:0,bob:0,phase:0,facing:1,speed:0,landing:null});return m;}
 if(!dt)return m;
 if(s.docking){
  const t=Math.min(1,s.docking.elapsed/.9);
  if(!m.landing)m.landing={yaw:m.yaw,pitch:m.pitch,bank:m.bank,wing:m.wing};
  const eased=t*t*(3-2*t);
  for(const key of ['yaw','pitch','bank'])m[key]=m.landing[key]*(1-eased);
  m.wing=m.landing.wing*(1-eased);m.bob=0;return m;
 }
 m.landing=null;
 // Ignore the launch/respawn offset; derive intent from actual flight, including recall.
 const vx=previous&&!previous.docked?clamp((s.bird.x-previous.x)/dt,-7,7):0;
 const vy=previous&&!previous.docked?clamp((s.bird.y-previous.y)/dt,-6,6):0;
 if(Math.abs(vx)>.25)m.facing=Math.sign(vx);
 const turnTarget=m.facing<0?Math.PI:0;
 const yawBefore=m.yaw;
 m.yaw=follow(m.yaw,turnTarget,5,dt);
 const turning=(m.yaw-yawBefore)/dt;
 m.speed=follow(m.speed,Math.hypot(vx,vy),5,dt);
 // Positive bank presents the back facing right and the underside facing left.
 const bankTarget=clamp(Math.abs(vx)/6*.58+turning*.10,-.85,.85);
 m.bank=follow(m.bank,bankTarget,6,dt);
 m.pitch=follow(m.pitch,clamp(vy*.065,-.38,.38)-(s.attack>0?.42:0),6,dt);
 m.phase+=dt*(s.battery==='bird'?9:7.5+Math.min(m.speed,6)*.5);
 m.wing=.48+Math.sin(m.phase)*.36;
 m.bob=Math.sin(m.phase)*.045*(1-Math.min(m.speed/8, .8));
 return m;
}
