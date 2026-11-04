// A seekable, deterministic choreography: pose depends on time, never on frame history.
export const DURATION = 20;
export const CHAPTERS = [
  {time:0, title:'战车驶入', detail:'四轮滚动，进入展示区域'},
  {time:3, title:'接口解锁', detail:'翼龙抬起，露出车顶连接点'},
  {time:4.5, title:'脱离战车', detail:'保持伏卧，移动到战车侧方'},
  {time:6, title:'展开站立', detail:'腰部与脚部展开，双脚落地'},
  {time:8.5, title:'翼龙展翼', detail:'抬起双翼，微微昂首'},
  {time:10.5, title:'环绕展示', detail:'跟随镜头，观察完整机械结构'},
  {time:14, title:'收拢合体', detail:'收翼、折叠、归位，重新连接战车'},
];
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smooth = x => x * x * (3 - 2 * x);
function track(time, keys) {
  for (let i=1;i<keys.length;i++) {
    if(time<=keys[i][0]) {
      const [a,from]=keys[i-1], [b,to]=keys[i];
      return from+(to-from)*smooth(clamp((time-a)/(b-a),0,1));
    }
  }
  return keys.at(-1)[1];
}
export function sampleAnimation(seconds) {
  const time=clamp(seconds,0,DURATION);
  const drive=track(time,[[0,-2.5],[3,0],[20,0]]);
  return {
    time, drive, wheelAngle:-drive/.80,
    lift:track(time,[[0,0],[3,0],[4.5,1.1],[18.8,1.1],[20,0]]),
    side:track(time,[[0,0],[4.5,0],[6,4.25],[18,4.25],[18.8,0],[20,0]]),
    stand:track(time,[[0,0],[6,0],[8.5,1],[15.5,1],[18,0],[20,0]]),
    wing:track(time,[[0,0],[8.5,0],[10.5,1],[14,1],[15.5,0],[20,0]]),
    headPitch:track(time,[[0,0],[8.5,0],[10.5,.16],[14,.16],[15.5,0],[20,0]]),
    orbit:track(time,[[0,0],[10.5,0],[14,Math.PI*.78],[20,0]]),
    chapter:CHAPTERS.findLastIndex(chapter=>time>=chapter.time),
  };
}
export class AnimationPlayer {
  time=0; playing=false; direction=1; speed=1; loop=false;
  seek(time) { this.time=clamp(time,0,DURATION); this.playing=false; }
  play() {
    if(this.direction===1&&this.time>=DURATION) this.time=0;
    if(this.direction===-1&&this.time<=0) this.time=DURATION;
    this.playing=true;
  }
  advance(delta) {
    if(!this.playing) return;
    const next=this.time+Math.max(0,delta)*this.direction*this.speed;
    if(next>=DURATION||next<=0) {
      this.time=this.loop ? ((next%DURATION)+DURATION)%DURATION : clamp(next,0,DURATION);
      if(!this.loop) this.playing=false;
    } else this.time=next;
  }
}
