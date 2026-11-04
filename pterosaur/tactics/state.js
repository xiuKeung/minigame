export const LEVEL_ONE={cols:6,rows:6,bird:[0,4],tank:[0,1],birdExit:[5,4],tankExit:[5,1],threat:[[3,2],[3,3]],rocks:[[2,1],[2,2],[2,4]]};
const key=p=>p.join(',');
export function createLevelOne(){return {bird:[...LEVEL_ONE.bird],tank:[...LEVEL_ONE.tank],acted:{bird:false,tank:false},stability:8,turn:1,status:'playing',message:'让两位搭档穿过遗迹入口。'};}
export function reachable(state,unit){const from=state[unit],range=unit==='bird'?3:2,blocked=new Set(LEVEL_ONE.rocks.map(key));const cells=[];for(let x=0;x<LEVEL_ONE.cols;x++)for(let y=0;y<LEVEL_ONE.rows;y++){const p=[x,y],distance=Math.abs(x-from[0])+Math.abs(y-from[1]);if(distance>0&&distance<=range&&!blocked.has(key(p)))cells.push(p);}return cells;}
export function move(state,unit,to){if(state.status!=='playing'||state.acted[unit]||!reachable(state,unit).some(p=>key(p)===key(to)))return state;return {...state,[unit]:[...to],acted:{...state.acted,[unit]:true},message:`${unit==='bird'?'机械翼龙':'双炮战车'}已行动。`};}
export function endTurn(state){if(state.status!=='playing')return state;let stability=state.stability;for(const p of LEVEL_ONE.threat){if(key(state.bird)===key(p)||key(state.tank)===key(p))stability--;}
 if(stability<=0)return {...state,stability:0,status:'failed',message:'遗迹核心失稳，重新规划路线。'};
 const won=key(state.bird)===key(LEVEL_ONE.birdExit)&&key(state.tank)===key(LEVEL_ONE.tankExit);
 return {...state,stability,turn:state.turn+1,status:won?'won':'playing',acted:{bird:false,tank:false},message:won?'入口已安全通过！第一关完成。':'敌方炮台已按预告攻击，轮到你行动。'};}
