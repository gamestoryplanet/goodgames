// Survival Shooter (라스트워 느낌) - 단순 웹 버전
(() => {
  const cv = document.getElementById('cv');
  const ctx = cv.getContext('2d');
  const ui = {
    lvl: document.getElementById('lvl'),
    time: document.getElementById('time'),
    hp: document.getElementById('hp'),
    kills: document.getElementById('kills'),
    autofire: document.getElementById('autofire'),
    start: document.getElementById('btnStart'),
    pause: document.getElementById('btnPause'),
    restart: document.getElementById('btnRestart'),
    stick: document.getElementById('stick'),
  };

  // --- Game State ---
  const W = cv.width, H = cv.height;
  let level = 1;
  let hp = 100;
  let kills = 0;
  let timeLeft = 45;
  let paused = true;
  let lastTs = 0;

  const player = { x: W/2, y: H/2, r: 14, speed: 3.0, vx: 0, vy: 0 };
  const bullets = [];
  const enemies = [];
  let spawnAcc = 0;
  let fireAcc = 0;

  // 10단계 레벨 설정 (난이도는 점진적)
  const LV = [
    {spawn: 1.0, enemySpeed: 1.2, dmg: 8},
    {spawn: 0.9, enemySpeed: 1.3, dmg: 8},
    {spawn: 0.8, enemySpeed: 1.4, dmg: 9},
    {spawn: 0.75, enemySpeed: 1.5, dmg: 9},
    {spawn: 0.7, enemySpeed: 1.6, dmg:10},
    {spawn: 0.65, enemySpeed: 1.7, dmg:10},
    {spawn: 0.6, enemySpeed: 1.8, dmg:11},
    {spawn: 0.55, enemySpeed: 2.0, dmg:12},
    {spawn: 0.5, enemySpeed: 2.2, dmg:13},
    {spawn: 0.45, enemySpeed: 2.5, dmg:15},
  ];

  // --- Helpers ---
  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
  function len(x,y){ return Math.hypot(x,y); }
  function unit(x,y){ const l = Math.hypot(x,y)||1; return [x/l,y/l]; }
  function rand(a,b){ return Math.random()*(b-a)+a; }

  function resetGame(newLevel=1){
    level = newLevel; hp = 100; kills = 0; timeLeft = 45;
    player.x = W/2; player.y = H/2; player.vx = player.vy = 0;
    bullets.length = 0; enemies.length = 0; spawnAcc = fireAcc = 0;
    lastTs = 0; paused = true; draw(0);
    syncUI();
  }

  function syncUI(){
    ui.lvl.textContent = level;
    ui.time.textContent = Math.ceil(timeLeft);
    ui.hp.textContent = Math.max(0, Math.floor(hp));
    ui.kills.textContent = kills;
  }

  // --- Input: keyboard & mouse ---
  const keys = {};
  window.addEventListener('keydown', e=>{ keys[e.key] = true; if(e.key===' ') e.preventDefault(); });
  window.addEventListener('keyup', e=>{ keys[e.key] = false; });
  const mouse = { x: W/2, y: H/2, down:false };
  cv.addEventListener('mousemove', e=>{
    const rect = cv.getBoundingClientRect();
    mouse.x = e.clientX - rect.left; mouse.y = e.clientY - rect.top;
  });
  cv.addEventListener('mousedown', ()=>{ mouse.down = true; });
  window.addEventListener('mouseup', ()=>{ mouse.down = false; });

  // --- Mobile joystick (left-bottom) ---
  const stick = ui.stick;
  const knob = stick.querySelector('.knob');
  let stickActive = false, stickVec = [0,0];
  function setKnob(dx,dy){
    const d = Math.min(38, Math.hypot(dx,dy));
    const [ux,uy] = unit(dx,dy);
    knob.style.transform = `translate(${ux*d}px, ${uy*d}px)`;
    stickVec = [ux*(d/38), uy*(d/38)];
  }
  function resetKnob(){ knob.style.transform = 'translate(0,0)'; stickVec=[0,0]; }
  function onTouch(e){
    const t = e.touches[0];
    const rect = stick.getBoundingClientRect();
    const cx = rect.left + rect.width/2, cy = rect.top + rect.height/2;
    setKnob(t.clientX-cx, t.clientY-cy);
  }
  stick.addEventListener('touchstart', e=>{ stickActive=true; onTouch(e); e.preventDefault(); }, {passive:false});
  stick.addEventListener('touchmove', e=>{ if(stickActive) onTouch(e); e.preventDefault(); }, {passive:false});
  stick.addEventListener('touchend', ()=>{ stickActive=false; resetKnob(); });

  // --- Shooting ---
  function shootAt(tx,ty){
    const [ux,uy] = unit(tx-player.x, ty-player.y);
    bullets.push({ x: player.x+ux*player.r, y: player.y+uy*player.r, vx: ux*6.0, vy: uy*6.0, r:3 });
  }

  function nearestEnemy(){
    let best=null, bd=1e9;
    for(const e of enemies){
      const d = Math.hypot(e.x-player.x, e.y-player.y);
      if(d<bd){ bd=d; best=e; }
    }
    return best;
  }

  // --- Spawning ---
  function spawnEnemy(){
    // spawn around edges
    const edge = Math.floor(rand(0,4));
    let x,y;
    if(edge===0){ x = -10; y = rand(0,H); }
    else if(edge===1){ x = W+10; y = rand(0,H); }
    else if(edge===2){ x = rand(0,W); y = -10; }
    else { x = rand(0,W); y = H+10; }
    enemies.push({ x, y, r:12, speed: LV[level-1].enemySpeed, hp: 1 });
  }

  // --- Game Loop ---
  function update(dt){
    // time
    timeLeft -= dt; if(timeLeft<0){ nextLevel(); return; }

    // input -> velocity
    let mx = 0, my = 0;
    if(keys['ArrowLeft']||keys['a']||keys['A']) mx -= 1;
    if(keys['ArrowRight']||keys['d']||keys['D']) mx += 1;
    if(keys['ArrowUp']||keys['w']||keys['W']) my -= 1;
    if(keys['ArrowDown']||keys['s']||keys['S']) my += 1;
    if(stickVec[0]||stickVec[1]){ mx = stickVec[0]; my = stickVec[1]; }
    [mx,my] = unit(mx,my);
    player.vx = mx * player.speed; player.vy = my * player.speed;
    player.x = clamp(player.x + player.vx, player.r, W-player.r);
    player.y = clamp(player.y + player.vy, player.r, H-player.r);

    // spawn enemies
    spawnAcc += dt;
    const target = LV[level-1].spawn;
    if(spawnAcc >= target){
      spawnAcc = 0;
      spawnEnemy();
    }

    // bullets
    for(let i=bullets.length-1;i>=0;i--){
      const b = bullets[i];
      b.x += b.vx; b.y += b.vy;
      if(b.x< -20 || b.x>W+20 || b.y<-20 || b.y>H+20) bullets.splice(i,1);
    }

    // enemies move
    for(let i=enemies.length-1;i>=0;i--){
      const e = enemies[i];
      const [ux,uy] = unit(player.x-e.x, player.y-e.y);
      e.x += ux*e.speed; e.y += uy*e.speed;

      // collide with player
      if(Math.hypot(e.x-player.x, e.y-player.y) < e.r+player.r){
        hp -= LV[level-1].dmg * 0.5; // damage over time
        if(hp<=0){ gameOver(); return; }
      }
    }

    // bullet-enemy collision
    for(let i=enemies.length-1;i>=0;i--){
      const e = enemies[i];
      for(let j=bullets.length-1;j>=0;j--){
        const b = bullets[j];
        if(Math.hypot(e.x-b.x, e.y-b.y) < e.r+b.r){
          bullets.splice(j,1);
          enemies.splice(i,1);
          kills++; break;
        }
      }
    }

    // shooting control: click or auto-fire
    fireAcc += dt;
    const interval = 0.28; // seconds
    if(mouse.down && fireAcc>=0.08){
      shootAt(mouse.x, mouse.y);
      fireAcc = 0;
    } else if(ui.autofire.checked && fireAcc >= interval){
      const t = nearestEnemy();
      if(t) shootAt(t.x, t.y);
      fireAcc = 0;
    }

    syncUI();
  }

  function draw(){
    ctx.clearRect(0,0,W,H);
    // grid background
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.05)';
    for(let x=0;x<=W;x+=50){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for(let y=0;y<=H;y+=50){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
    ctx.restore();

    // player
    ctx.beginPath(); ctx.fillStyle = '#69d2ff';
    ctx.arc(player.x, player.y, player.r, 0, Math.PI*2); ctx.fill();
    // direction cue
    ctx.beginPath(); ctx.strokeStyle = '#b9e7ff';
    ctx.arc(player.x, player.y, player.r+6, 0, Math.PI*2); ctx.stroke();

    // bullets
    ctx.fillStyle = '#ffd166';
    for(const b of bullets){ ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.fill(); }

    // enemies
    ctx.fillStyle = '#ff6b6b';
    for(const e of enemies){ ctx.beginPath(); ctx.arc(e.x,e.y,e.r,0,Math.PI*2); ctx.fill(); }
  }

  function loop(ts){
    if(!lastTs) lastTs = ts;
    const dt = Math.min(0.05, (ts-lastTs)/1000);
    lastTs = ts;
    if(!paused){
      update(dt);
      draw();
    }
    requestAnimationFrame(loop);
  }

  function nextLevel(){
    level++; if(level>10){ win(); return; }
    paused = true;
    alert(`레벨 ${level-1} 클리어! 다음 레벨로 갑니다.`);
    timeLeft = 45; enemies.length=0; bullets.length=0; spawnAcc=0; fireAcc=0;
    syncUI(); paused=false;
  }
  function gameOver(){
    paused = true;
    alert(`게임 오버! 레벨 ${level}, 처치 ${kills}`);
    resetGame(level); // 같은 레벨로 재도전
  }
  function win(){
    paused = true;
    alert(`축하합니다! 10단계 모두 생존했습니다! 처치 ${kills}`);
    resetGame(1);
  }

  // UI buttons
  ui.start.addEventListener('click', ()=>{ paused=false; });
  ui.pause.addEventListener('click', ()=>{ paused=true; });
  ui.restart.addEventListener('click', ()=>{ resetGame(level); paused=false; });

  // Start
  resetGame(1);
  requestAnimationFrame(loop);
})();