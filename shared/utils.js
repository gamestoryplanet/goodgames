export const rand = (a=0,b=1)=>a+Math.random()*(b-a);
export const rint = (a,b)=>Math.floor(rand(a,b+1));
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const lerp=(a,b,t)=>a+(b-a)*t;
export const now=()=>performance.now();

export function fitHiDPI(canvas, logicalW=1600, logicalH=900){
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio||1));
  canvas.width = logicalW*dpr; canvas.height = logicalH*dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);
  return {ctx, dpr, w:logicalW, h:logicalH};
}

export const store = {
  get:(k,v=0)=>+localStorage.getItem(k) || v,
  set:(k,v)=>localStorage.setItem(k, v)
};

export const shaker = (()=>{ 
  let t=0, amp=0; 
  return {
    add:(a=8,d=120)=>{ amp=Math.max(amp,a); t=now()+d; },
    apply:(ctx)=>{
      const left = t - now();
      if(left>0){
        const s = amp * (left/120);
        ctx.translate((Math.random()-.5)*s,(Math.random()-.5)*s);
      }
    }
  };
})();
