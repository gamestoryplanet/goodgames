import {store} from "./utils.js";
import {resumeAudio} from "./sfx.js";

export function attachUI(root, {title, instructions}){
  root.classList.add("game-wrap");
  root.innerHTML = `
    <div class="canvas-shell">
      <canvas id="game"></canvas>
      <div class="hud">
        <span class="pill" id="score">Score 0</span>
        <span class="pill" id="best">Best ${store.get(title+"-best",0)}</span>
      </div>
      <div class="btnbar">
        <button class="ui" id="btn-pause">Pause</button>
        <button class="ui" id="btn-restart">Restart</button>
      </div>
      <div class="modal" id="modal">
        <div class="card">
          <div class="badge">Arcade</div>
          <h3 class="title">${title}</h3>
          <p class="subtitle">${instructions}</p>
          <div class="grid-2">
            <button class="ui" id="start-kb">Start <span class="small">(<kbd>Space</kbd>)</span></button>
            <button class="ui" id="start-touch">Start (Touch)</button>
          </div>
          <p class="small" style="margin-top:10px">일시정지 <kbd>P</kbd> / 재시작 <kbd>R</kbd></p>
        </div>
      </div>
    </div>
  `;
  const el = {
    canvas: root.querySelector("#game"),
    score: root.querySelector("#score"),
    best: root.querySelector("#best"),
    modal: root.querySelector("#modal"),
    pause: root.querySelector("#btn-pause"),
    restart: root.querySelector("#btn-restart"),
    startKb: root.querySelector("#start-kb"),
    startTouch: root.querySelector("#start-touch"),
  };
  const hideModal=()=>el.modal.style.display="none";
  el.startKb.onclick = el.startTouch.onclick = ()=>{resumeAudio(); hideModal(); onStart?.()};
  el.pause.onclick = ()=>onTogglePause?.();
  el.restart.onclick = ()=>onRestart?.();
  // Keyboard
  const keys=new Set();
  window.addEventListener("keydown",e=>{
    if(e.code==="Space"){resumeAudio(); hideModal(); onStart?.(); return;}
    if(e.code==="KeyP"){onTogglePause?.(); return;}
    if(e.code==="KeyR"){onRestart?.(); return;}
    keys.add(e.code);
  });
  window.addEventListener("keyup",e=>keys.delete(e.code));
  let onStart, onTogglePause, onRestart;
  return {
    ...el, keys,
    setScore:(v,titleKey)=>{el.score.textContent=`Score ${v}`; if(titleKey){const best=store.get(titleKey+"-best",0); if(v>best){store.set(titleKey+"-best", v); el.best.textContent=`Best ${v}`;}}},
    wireHandlers:(a,b,c)=>{onStart=a; onTogglePause=b; onRestart=c;}
  };
}

