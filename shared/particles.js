import {rand, rint} from "./utils.js";
export function burst(list, x,y, color="#7cf1d1", n=16){
  for(let i=0;i<n;i++){
    const a = rand(0,Math.PI*2), sp = rand(2,6);
    list.push({x,y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, life: rand(300,800), age:0, color});
  }
}
export function updateAndDraw(ctx, list, dt){
  for(let i=list.length-1;i>=0;i--){
    const p=list[i]; p.age+=dt; if(p.age>p.life){list.splice(i,1); continue;}
    p.vy += 0.008*dt; p.x += p.vx; p.y += p.vy;
    const t = 1 - p.age/p.life;
    ctx.globalAlpha = Math.max(0, t);
    ctx.fillStyle = p.color; ctx.fillRect(p.x-2, p.y-2, 4, 4);
    ctx.globalAlpha = 1;
  }
}

