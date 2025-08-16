// Bubble Pop - 간단 아케이드 (10레벨)
// 클릭/터치로 '목표 색상' 버블만 터뜨리세요. 오입력 시 HP 감소 + 페널티 버블 생성.
(() => {
  const cv = document.getElementById('cv');
  const ctx = cv.getContext('2d');

  const ui = {
    lvl: document.getElementById('lvl'),
    time: document.getElementById('time'),
    hp: document.getElementById('hp'),
    score: document.getElementById('score'),
    slow: document.getElementById('slow'),
    start: document.getElementById('btnStart'),
    pause: document.getElementById('btnPause'),
    restart: document.getElementById('btnRestart'),
    targetName: document.getElementById('targetName'),
    targetChip: document.getElementById('targetChip'),
  };

  // canvas coordinate helper for scaled display
  function getPos(e){
    const rect = cv.getBoundingClientRect();
    const x = (('touches' in e) ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (('touches' in e) ? e.touches[0].clientY : e.clientY) - rect.top;
    const sx = cv.width / rect.width, sy = cv.height / rect.height;
    return { x: x*sx, y: y*sy };
  }

  const W = cv.width, H = cv.height;
  let paused = true, lastTs = 0;
  let level = 1, timeLeft = 40, hp = 100, score = 0;
  const bubbles = [];
  const pops = []; // small pop effects

  const COLORS = [
    {name:'RED',   c:'#ff4d4d'},
    {name:'BLUE',  c:'#4db3ff'},
    {name:'GREEN', c:'#5dd36c'},
    {name:'YELLOW',c:'#ffd166'},
    {name:'PURPLE',c:'#b388ff'},
  ];
  let target = COLORS[1]; // BLUE

  // 레벨 파라미터 (난이도 점진 증가)
  const LV = [
    {spawn: 1.0, speed: 40, targetRate: 0.55},
    {spawn: 0.9, speed: 45, targetRate: 0.52},
    {spawn: 0.85, speed: 50, targetRate: 0.5},
    {spawn: 0.8, speed: 55, targetRate: 0.48},
    {spawn: 0.75, speed: 60, targetRate: 0.46},
    {spawn: 0.7, speed: 66, targetRate: 0.44},
    {spawn: 0.65, speed: 72, targetRate: 0.42},
    {spawn: 0.6, speed: 78, targetRate: 0.40},
    {spawn: 0.55, speed: 85, targetRate: 0.38},
    {spawn: 0.5, speed: 95, targetRate: 0.36},
  ];

  function rand(a,b){ return Math.random()*(b-a)+a; }
  function choice(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

  function reset(newLevel=1){
    level=newLevel; timeLeft=40; hp=100; score=0;
    bubbles.length=0; pops.length=0; lastTs=0; paused=true;
    // 레벨마다 목표 색상 바꾸기
    target = COLORS[(level-1)%COLORS.length];
    syncUI();
    draw(0);
  }

  function syncUI(){
    ui.lvl.textContent = level;
    ui.time.textContent = Math.ceil(timeLeft);
    ui.hp.textContent = Math.max(0, Math.floor(hp));
    ui.score.textContent = score;
    ui.targetName.textContent = target.name;
    ui.targetChip.style.background = target.c;
  }

  function spawnBubble(isPenalty=false){
    const lv = LV[level-1];
    const slowK = ui.slow.checked ? 0.8 : 1.0;
    const r = rand(16, 28);
    const x = rand(r, W-r);
    const y = rand(r, H-r);
    let c, isTarget;
    if(isPenalty){
      c = '#cccccc'; isTarget=false; // penalty color (gray)
    }else if(Math.random() < lv.targetRate){
      c = target.c; isTarget=true;
    }else{
      const pool = COLORS.filter(k=>k.c!==target.c);
      c = choice(pool).c; isTarget=false;
    }
    const ang = rand(0, Math.PI*2);
    const spd = lv.speed * slowK;
    const vx = Math.cos(ang) * spd;
    const vy = Math.sin(ang) * spd;
    bubbles.push({x,y,r,color:c,isTarget,vx,vy});
  }

  function update(dt){
    timeLeft -= dt; if(timeLeft<=0){ nextLevel(); return; }

    // spawn
    const interval = LV[level-1].spawn * (ui.slow.checked ? 1.2 : 1.0);
    spawnAcc += dt;
    while(spawnAcc >= interval){ spawnAcc -= interval; spawnBubble(); }

    // move bubbles
    const damp = 1.0;
    for(const b of bubbles){
      b.x += b.vx*dt; b.y += b.vy*dt;
      // bounce
      if(b.x<b.r){ b.x=b.r; b.vx = Math.abs(b.vx)*damp; }
      if(b.x>W-b.r){ b.x=W-b.r; b.vx = -Math.abs(b.vx)*damp; }
      if(b.y<b.r){ b.y=b.r; b.vy = Math.abs(b.vy)*damp; }
      if(b.y>H-b.r){ b.y=H-b.r; b.vy = -Math.abs(b.vy)*damp; }
    }

    // pop effects
    for(let i=pops.length-1;i>=0;i--){
      const p = pops[i]; p.t += dt; if(p.t>0.2) pops.splice(i,1);
    }

    syncUI();
  }

  function draw(){
    ctx.clearRect(0,0,W,H);
    // background grid
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.05)';
    for(let x=0;x<=W;x+=50){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for(let y=0;y<=H;y+=50){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
    ctx.restore();

    // bubbles
    for(const b of bubbles){
      ctx.beginPath(); ctx.fillStyle = b.color;
      ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 2; ctx.stroke();
    }

    // pop ring
    for(const p of pops){
      const k = p.t/0.2;
      ctx.beginPath(); ctx.strokeStyle = p.color;
      ctx.lineWidth = (1-k)*3;
      ctx.arc(p.x, p.y, p.r + k*12, 0, Math.PI*2); ctx.stroke();
    }
  }

  function loop(ts){
    if(!lastTs) lastTs=ts;
    const dt = Math.min(0.05, (ts-lastTs)/1000);
    lastTs = ts;
    if(!paused){
      update(dt);
      draw();
    }
    requestAnimationFrame(loop);
  }

  // click/touch handler
  function onPointer(e){
    if(paused) return;
    const {x,y} = getPos(e);
    // top-most bubble first (iterate backwards)
    for(let i=bubbles.length-1;i>=0;i--){
      const b = bubbles[i];
      const dx = b.x-x, dy=b.y-y;
      if(dx*dx+dy*dy <= b.r*b.r){
        // hit
        pops.push({x:b.x,y:b.y,r:b.r,color:b.isTarget? '#eaffff':'#ffb3b3', t:0});
        if(b.isTarget){ score += 10; }
        else{
          hp -= 12; if(hp<=0){ gameOver(); return; }
          // penalty bubble spawn
          for(let k=0;k<2;k++) spawnBubble(true);
        }
        bubbles.splice(i,1);
        syncUI();
        break;
      }
    }
    e.preventDefault();
  }
  cv.addEventListener('click', onPointer);
  cv.addEventListener('touchstart', onPointer, {passive:false});

  function nextLevel(){
    level++; if(level>10){ win(); return; }
    paused = true;
    alert(`레벨 ${level-1} 클리어! 다음 레벨로 갑니다.`);
    timeLeft = 40; bubbles.length=0; pops.length=0; spawnAcc=0;
    // 목표 색상 변경
    target = COLORS[(level-1)%COLORS.length];
    syncUI(); paused=false;
  }

  function gameOver(){
    paused = true;
    alert(`게임 오버! 레벨 ${level}, 점수 ${score}`);
    reset(level); // 같은 레벨 재도전
  }

  function win(){
    paused = true;
    alert(`축하합니다! 10단계 모두 완료! 점수 ${score}`);
    reset(1);
  }

  ui.start.addEventListener('click', ()=>{ paused=false; });
  ui.pause.addEventListener('click', ()=>{ paused=true; });
  ui.restart.addEventListener('click', ()=>{ reset(level); paused=false; });

  let spawnAcc = 0;
  reset(1);
  requestAnimationFrame(loop);
})();