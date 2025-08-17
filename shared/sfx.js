// Minimal WebAudio SFX (bleep, blip, hit, explode, powerup)
const ctx = new (window.AudioContext||window.webkitAudioContext)();

function tone({type="sine", f=440, t=0.08, vol=0.2, slide=0, attack=0.005}) {
  const o=ctx.createOscillator(), g=ctx.createGain();
  o.type=type; o.frequency.value=f;
  g.gain.value=0; o.connect(g); g.connect(ctx.destination);
  const now=ctx.currentTime;
  g.gain.linearRampToValueAtTime(vol, now+attack);
  g.gain.exponentialRampToValueAtTime(0.0001, now+t);
  if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(1,f+slide), now+t);
  o.start(); o.stop(now+t);
}

export const SFX = {
  click:()=>tone({type:"square", f:700, t:0.06, vol:0.12, slide:-200}),
  hit:()=>tone({type:"triangle", f:220, t:0.12, vol:0.22, slide:-120}),
  score:()=>tone({type:"square", f:880, t:0.09, vol:0.18, slide:-100}),
  power:()=>tone({type:"sawtooth", f:500, t:0.2, vol:0.15, slide:300}),
  boom:()=>{
    tone({type:"sawtooth", f:120, t:0.25, vol:0.3, slide:-100});
    setTimeout(()=>tone({type:"triangle", f:60, t:0.25, vol:0.25, slide:-40}),70);
  }
};

export const resumeAudio = ()=>ctx.resume?.();
