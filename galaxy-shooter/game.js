// Galaxy Shooter - '갤러그 느낌'의 오리지널 탑다운 슈터 (IP 미사용)
(() => {
  const cv = document.getElementById('cv');
  const ctx = cv.getContext('2d');
  const ui = {
    lvl: document.getElementById('lvl'),
    lives: document.getElementById('lives'),
    score: document.getElementById('score'),
    autofire: document.getElementById('autofire'),
    start: document.getElementById('btnStart'),
    pause: document.getElementById('btnPause'),
    restart: document.getElementById('btnRestart'),
    left: document.getElementById('btnLeft'),
    right: document.getElementById('btnRight'),
    fire: document.getElementById('btnFire'),
  };

  const W=cv.width, H=cv.height;
  let level=1, lives=3, score=0, paused=true, lastTs=0, t=0;

  const player={ x:W/2, y:H-60, w:30, h:28, speed:280, cd:0 };
  const pBullets=[], eBullets=[], enemies=[];
  let formationPhase=0, diveAcc=0, fireAcc=0;

  const LV=[
    {rows:3, cols:7, enemySpeed:16, diveEvery:2.2, enemyFire:2.6},
    {rows:3, cols:8, enemySpeed:18, diveEvery:2.0, enemyFire:2.5},
    {rows:4, cols:8, enemySpeed:20, diveEvery:1.9, enemyFire:2.4},
    {rows:4, cols:9, enemySpeed:22, diveEvery:1.8, enemyFire:2.3},
    {rows:5, cols:9, enemySpeed:24, diveEvery:1.7, enemyFire:2.1},
    {rows:5, cols:10,enemySpeed:26, diveEvery:1.6, enemyFire:2.0},
    {rows:5, cols:10,enemySpeed:28, diveEvery:1.5, enemyFire:1.9},
    {rows:6, cols:10,enemySpeed:30, diveEvery:1.4, enemyFire:1.8},
    {rows:6, cols:11,enemySpeed:32, diveEvery:1.35,enemyFire:1.7},
    {rows:6, cols:12,enemySpeed:34, diveEvery:1.3, enemyFire:1.6},
  ];

  function reset(newLevel=1){
    level=newLevel; lives=3; score=0; paused=true; lastTs=0; t=0;
    player.x=W/2; player.cd=0;
    pBullets.length=0; eBullets.length=0; enemies.length=0;
    buildFormation();
    syncUI(); draw(0);
  }
  function buildFormation(){
    enemies.length=0;
    const cfg=LV[level-1];
    const marginX=80, marginY=80;
    const gapX=(W-marginX*2)/(cfg.cols-1);
    const gapY=42;
    for(let r=0;r<cfg.rows;r++){
      for(let c=0;c<cfg.cols;c++){
        const bx=marginX + c*gapX;
        const by=marginY + r*gapY;
        enemies.push({baseX:bx, baseY:by, x:bx, y:by, r:14, alive:true, diving:false, hp:1});
      }
    }
    formationPhase=0; diveAcc=0; fireAcc=0;
  }
  function syncUI(){
    ui.lvl.textContent=level;
    ui.lives.textContent=lives;
    ui.score.textContent=score;
  }

  // input
  const keys={};
  window.addEventListener('keydown',e=>{ keys[e.key]=true; if(e.key===' ') e.preventDefault(); });
  window.addEventListener('keyup',e=>{ keys[e.key]=false; });

  let mobileLeft=false, mobileRight=false, mobileFire=false;
  ui.left.addEventListener('touchstart',e=>{mobileLeft=true; e.preventDefault();},{passive:false});
  ui.left.addEventListener('touchend',()=>{mobileLeft=false;});
  ui.right.addEventListener('touchstart',e=>{mobileRight=true; e.preventDefault();},{passive:false});
  ui.right.addEventListener('touchend',()=>{mobileRight=false;});
  ui.fire.addEventListener('touchstart',e=>{mobileFire=true; e.preventDefault(); setTimeout(()=>mobileFire=false, 150);},{passive:false});
  cv.addEventListener('mousedown',()=>{mobileFire=true;});
  window.addEventListener('mouseup',()=>{mobileFire=false;});

  function shoot(){
    if(player.cd>0) return;
    pBullets.push({x:player.x, y:player.y-18, vy:-460});
    player.cd = 0.18;
  }

  function enemyShoot(e){
    eBullets.push({x:e.x, y:e.y+10, vy:220});
  }

  function update(dt){
    t+=dt;
    // move player
    let mv=0;
    if(keys['ArrowLeft']||keys['a']||keys['A']||mobileLeft) mv-=1;
    if(keys['ArrowRight']||keys['d']||keys['D']||mobileRight) mv+=1;
    player.x = Math.max(20, Math.min(W-20, player.x + mv*player.speed*dt));
    if((keys[' ']||mobileFire||ui.autofire.checked) && player.cd<=0) shoot();
    player.cd = Math.max(0, player.cd-dt);

    const cfg=LV[level-1];

    // formation wiggle
    formationPhase += dt*cfg.enemySpeed;
    const ampX = 28, ampY = 10;
    for(const e of enemies){
      if(!e.diving){
        e.x = e.baseX + Math.sin((formationPhase/60)+e.baseX*0.01)*ampX;
        e.y = e.baseY + Math.cos((formationPhase/90)+e.baseY*0.02)*ampY;
      }else{
        e.y += 120*dt + Math.sin(t*6+e.baseX*0.01)*60*dt;
        e.x += Math.sin(t*3+e.baseY*0.02)*80*dt;
        if(e.y>H+30){ // re-enter from top
          e.diving=false;
          e.x=e.baseX; e.y=e.baseY;
        }
      }
    }

    // enemy dive
    diveAcc += dt;
    if(diveAcc >= cfg.diveEvery && enemies.length){
      diveAcc=0;
      const candidates = enemies.filter(e=>!e.diving);
      const pick = candidates[Math.floor(Math.random()*candidates.length)];
      if(pick) pick.diving=true;
    }

    // enemy fire
    fireAcc += dt;
    if(fireAcc >= cfg.enemyFire && enemies.length){
      fireAcc = 0;
      const shooters = enemies.filter(e=>Math.abs(e.x-player.x)<200);
      const pick = shooters[Math.floor(Math.random()*shooters.length)] || enemies[Math.floor(Math.random()*enemies.length)];
      if(pick) enemyShoot(pick);
    }

    // bullets
    for(let i=pBullets.length-1;i>=0;i--){
      const b=pBullets[i]; b.y += b.vy*dt;
      if(b.y<-20){ pBullets.splice(i,1); continue; }
      for(let j=enemies.length-1;j>=0;j--){
        const e=enemies[j];
        if(Math.hypot(e.x-b.x, e.y-b.y) < e.r+4){
          enemies.splice(j,1); pBullets.splice(i,1);
          score += 20; break;
        }
      }
    }
    for(let i=eBullets.length-1;i>=0;i--){
      const b=eBullets[i]; b.y += b.vy*dt;
      if(b.y>H+20){ eBullets.splice(i,1); continue; }
      if(Math.abs(b.x-player.x) < player.w*0.5 && Math.abs(b.y-player.y) < player.h*0.5){
        eBullets.splice(i,1);
        hitPlayer();
      }
    }

    // collide diving enemy with player
    for(const e of enemies){
      if(Math.abs(e.x-player.x) < (player.w*0.5+e.r) && Math.abs(e.y-player.y) < (player.h*0.5+e.r)){
        hitPlayer();
        e.diving=false;
        e.x=e.baseX; e.y=e.baseY;
      }
    }

    // level clear
    if(enemies.length===0){ nextLevel(); }
    syncUI();
  }

  function hitPlayer(){
    if(lives<=0) return;
    lives--; player.x=W/2; player.cd=0.4;
    if(lives<0){ gameOver(); }
  }

  function draw(){
    ctx.clearRect(0,0,W,H);
    // stars
    ctx.save();
    for(let i=0;i<80;i++){
      const y = (i*8 + (t*60)%H) % H;
      const x = (i*37) % W;
      ctx.fillStyle = i%9===0 ? '#8fd3ff' : 'rgba(255,255,255,.6)';
      ctx.fillRect(x,y,2,2);
    }
    ctx.restore();

    // player ship
    drawShip(player.x, player.y, '#7cd6ff');

    // enemies
    for(const e of enemies){ drawBug(e.x, e.y, e.r, '#ff9bb0'); }

    // bullets
    ctx.fillStyle='#ffd166';
    for(const b of pBullets){ ctx.fillRect(b.x-2,b.y-10,4,10); }
    ctx.fillStyle='#ff6b6b';
    for(const b of eBullets){ ctx.fillRect(b.x-2,b.y,4,10); }
  }

  function drawShip(x,y,color){
    ctx.save(); ctx.translate(x,y);
    ctx.fillStyle=color;
    ctx.beginPath();
    ctx.moveTo(0,-14); ctx.lineTo(12,10); ctx.lineTo(0,6); ctx.lineTo(-12,10); ctx.closePath(); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.25)';
    ctx.fillRect(-2,-6,4,8);
    ctx.restore();
  }
  function drawBug(x,y,r,color){
    ctx.save(); ctx.translate(x,y);
    ctx.fillStyle=color;
    ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(0,0,0,.15)';
    ctx.fillRect(-r*0.8,-r*0.2,r*1.6,r*0.4);
    ctx.restore();
  }

  function loop(ts){
    if(!lastTs) lastTs=ts;
    const dt=Math.min(0.05,(ts-lastTs)/1000); lastTs=ts;
    if(!paused){ update(dt); draw(); }
    requestAnimationFrame(loop);
  }

  function nextLevel(){
    level++; if(level>10){ win(); return; }
    paused=true;
    alert(`웨이브 클리어! 레벨 ${level-1} → ${level}`);
    buildFormation(); paused=false; syncUI();
  }
  function gameOver(){
    paused=true;
    alert(`게임 오버! 점수 ${score}`);
    reset(level);
  }
  function win(){
    paused=true;
    alert(`축하합니다! 10단계 완료! 점수 ${score}`);
    reset(1);
  }

  ui.start.addEventListener('click',()=>{ paused=false; });
  ui.pause.addEventListener('click',()=>{ paused=true; });
  ui.restart.addEventListener('click',()=>{ reset(level); paused=false; });

  reset(1);
  requestAnimationFrame(loop);
})();