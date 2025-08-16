// Tank Battle - 간단 탑뷰 탱크 슈팅 (10레벨)
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

  const W = cv.width, H = cv.height;
  let level=1, timeLeft=45, hp=120, kills=0;
  let paused=true, lastTs=0;

  const player = { x:W/2, y:H/2, r:16, ang:0, speed:90, rot:2.6 };
  const bullets = [];
  const enemyBullets = [];
  const enemies = [];
  let spawnAcc=0, fireAcc=0, enemyFireAcc=0;

  const LV=[
    {spawn:1.3, enemySpeed:60, enemyFire:2.6, enemyHP:20, dmg:12},
    {spawn:1.2, enemySpeed:62, enemyFire:2.5, enemyHP:22, dmg:12},
    {spawn:1.1, enemySpeed:65, enemyFire:2.4, enemyHP:24, dmg:13},
    {spawn:1.05,enemySpeed:68, enemyFire:2.3, enemyHP:26, dmg:13},
    {spawn:1.0, enemySpeed:72, enemyFire:2.2, enemyHP:28, dmg:14},
    {spawn:0.95,enemySpeed:76, enemyFire:2.1, enemyHP:30, dmg:14},
    {spawn:0.9, enemySpeed:80, enemyFire:2.0, enemyHP:32, dmg:15},
    {spawn:0.85,enemySpeed:84, enemyFire:1.9, enemyHP:34, dmg:16},
    {spawn:0.8, enemySpeed:88, enemyFire:1.8, enemyHP:36, dmg:17},
    {spawn:0.75,enemySpeed:92, enemyFire:1.7, enemyHP:40, dmg:18},
  ];

  // helpers
  function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }
  function unit(x,y){ const l=Math.hypot(x,y)||1; return [x/l,y/l]; }
  function rand(a,b){ return Math.random()*(b-a)+a; }
  function angleTo(ax,ay,bx,by){ return Math.atan2(by-ay,bx-ax); }

  function reset(newLevel=1){
    level=newLevel; timeLeft=45; hp=120; kills=0;
    player.x=W/2; player.y=H/2; player.ang=0;
    bullets.length=0; enemyBullets.length=0; enemies.length=0;
    spawnAcc=fireAcc=enemyFireAcc=0; paused=true; lastTs=0;
    syncUI(); draw(0);
  }

  function syncUI(){
    ui.lvl.textContent=level;
    ui.time.textContent=Math.ceil(timeLeft);
    ui.hp.textContent=Math.max(0,Math.floor(hp));
    ui.kills.textContent=kills;
  }

  // input: keyboard + mouse aim
  const keys={}; window.addEventListener('keydown',e=>{keys[e.key]=true;});
  window.addEventListener('keyup',e=>{keys[e.key]=false;});
  const mouse={x:W/2,y:H/2,down:false};
  cv.addEventListener('mousemove',e=>{
    const r=cv.getBoundingClientRect();
    mouse.x=e.clientX-r.left; mouse.y=e.clientY-r.top;
  });
  cv.addEventListener('mousedown',()=>{mouse.down=true;});
  window.addEventListener('mouseup',()=>{mouse.down=false;});

  // mobile stick
  const stick = ui.stick, knob = stick.querySelector('.knob');
  let stickActive=false, stickVec=[0,0];
  function setKnob(dx,dy){ const d=Math.min(38,Math.hypot(dx,dy)); const [ux,uy]=unit(dx,dy);
    knob.style.transform=`translate(${ux*d}px,${uy*d}px)`; stickVec=[ux*(d/38),uy*(d/38)]; }
  function resetKnob(){ knob.style.transform='translate(0,0)'; stickVec=[0,0]; }
  function onTouch(e){
    const t=e.touches[0]; const r=stick.getBoundingClientRect();
    const cx=r.left+r.width/2, cy=r.top+r.height/2; setKnob(t.clientX-cx,t.clientY-cy);
  }
  stick.addEventListener('touchstart',e=>{stickActive=true; onTouch(e); e.preventDefault();},{passive:false});
  stick.addEventListener('touchmove',e=>{if(stickActive) onTouch(e); e.preventDefault();},{passive:false});
  stick.addEventListener('touchend',()=>{stickActive=false; resetKnob();});

  function shoot(x,y,ang,speed=300,from='player'){
    bullets.push({x,y,ang,speed,from,life:2.2});
  }
  function enemyShoot(e){
    const ang=angleTo(e.x,e.y,player.x,player.y);
    enemyBullets.push({x:e.x, y:e.y, ang, speed:240, life:3.0});
  }

  function spawnEnemy(){
    const edge=Math.floor(rand(0,4));
    let x,y; if(edge===0){x=-20;y=rand(0,H);} else if(edge===1){x=W+20;y=rand(0,H);}
    else if(edge===2){x=rand(0,W);y=-20;} else {x=rand(0,W);y=H+20;}
    enemies.push({x,y,ang:rand(0,Math.PI*2), r:16, hp:LV[level-1].enemyHP});
  }

  function update(dt){
    timeLeft-=dt; if(timeLeft<=0){ nextLevel(); return; }

    // move player
    let rot=0, thrust=0;
    if(keys['a']||keys['A']||stickVec[0]<-0.3) rot-=1;
    if(keys['d']||keys['D']||stickVec[0]>0.3) rot+=1;
    if(keys['w']||keys['W']||stickVec[1]<-0.3) thrust+=1;
    if(keys['s']||keys['S']||stickVec[1]>0.3) thrust-=1;
    player.ang += rot * player.rot * dt;
    const vx = Math.cos(player.ang) * player.speed * thrust;
    const vy = Math.sin(player.ang) * player.speed * thrust;
    player.x = clamp(player.x + vx*dt, player.r, W-player.r);
    player.y = clamp(player.y + vy*dt, player.r, H-player.r);

    // spawn enemies
    spawnAcc += dt;
    if(spawnAcc >= LV[level-1].spawn){ spawnAcc=0; spawnEnemy(); }

    // enemies move & fire
    for(const e of enemies){
      const a = angleTo(e.x,e.y,player.x,player.y);
      e.ang = a;
      const sp = LV[level-1].enemySpeed;
      e.x += Math.cos(a)*sp*dt;
      e.y += Math.sin(a)*sp*dt;
      // touch damage
      if(Math.hypot(e.x-player.x, e.y-player.y) < e.r+player.r){
        hp -= LV[level-1].dmg*dt;
        if(hp<=0){ gameOver(); return; }
      }
    }
    // enemy shooting
    enemyFireAcc += dt;
    if(enemyFireAcc >= LV[level-1].enemyFire){
      enemyFireAcc = 0;
      const pick = enemies[Math.floor(Math.random()*enemies.length)];
      if(pick) enemyShoot(pick);
    }

    // bullets update
    for(let i=bullets.length-1;i>=0;i--){
      const b=bullets[i]; b.life-=dt;
      b.x += Math.cos(b.ang)*b.speed*dt;
      b.y += Math.sin(b.ang)*b.speed*dt;
      if(b.life<=0 || b.x<-20||b.x>W+20||b.y<-20||b.y>H+20){ bullets.splice(i,1); continue; }
      // hit enemies
      for(let j=enemies.length-1;j>=0;j--){
        const e=enemies[j];
        if(Math.hypot(e.x-b.x,e.y-b.y) < e.r+4){
          enemies[j].hp -= 20;
          bullets.splice(i,1);
          if(enemies[j].hp<=0){ enemies.splice(j,1); kills++; }
          break;
        }
      }
    }

    // enemy bullets
    for(let i=enemyBullets.length-1;i>=0;i--){
      const b=enemyBullets[i]; b.life-=dt;
      b.x += Math.cos(b.ang)*b.speed*dt;
      b.y += Math.sin(b.ang)*b.speed*dt;
      if(b.life<=0 || b.x<-20||b.x>W+20||b.y<-20||b.y>H+20){ enemyBullets.splice(i,1); continue; }
      if(Math.hypot(player.x-b.x, player.y-b.y) < player.r+4){
        hp -= LV[level-1].dmg*1.3;
        enemyBullets.splice(i,1);
        if(hp<=0){ gameOver(); return; }
      }
    }

    // player fire
    fireAcc += dt;
    const canAuto = ui.autofire.checked && fireAcc >= 0.5;
    const canClick = mouse.down && fireAcc >= 0.15;
    if(canAuto || canClick){
      const ang = angleTo(player.x,player.y, mouse.x,mouse.y);
      shoot(player.x + Math.cos(ang)*player.r, player.y + Math.sin(ang)*player.r, ang, 360);
      fireAcc = 0;
    }

    syncUI();
  }

  function draw(){
    ctx.clearRect(0,0,W,H);
    // grid
    ctx.save(); ctx.strokeStyle='rgba(255,255,255,.05)';
    for(let x=0;x<=W;x+=50){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for(let y=0;y<=H;y+=50){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
    ctx.restore();

    // player tank
    drawTank(player.x,player.y,player.ang,'#8ad1ff');

    // enemies
    for(const e of enemies){ drawTank(e.x,e.y,e.ang,'#ff8888'); }

    // bullets
    ctx.fillStyle='#ffd166';
    for(const b of bullets){ ctx.beginPath(); ctx.arc(b.x,b.y,4,0,Math.PI*2); ctx.fill(); }
    ctx.fillStyle='#ff6b6b';
    for(const b of enemyBullets){ ctx.beginPath(); ctx.arc(b.x,b.y,4,0,Math.PI*2); ctx.fill(); }
  }

  function drawTank(x,y,ang,body='#9cf'){
    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(ang);
    // body
    ctx.fillStyle=body;
    roundedRect(-18,-12,36,24,6);
    ctx.fill();
    // turret
    ctx.fillStyle='rgba(0,0,0,.2)';
    ctx.beginPath(); ctx.arc(0,0,8,0,Math.PI*2); ctx.fill();
    // barrel
    ctx.strokeStyle='#e9f1ff'; ctx.lineWidth=4;
    ctx.beginPath(); ctx.moveTo(6,0); ctx.lineTo(22,0); ctx.stroke();
    ctx.restore();
  }
  function roundedRect(x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r);
    ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r);
    ctx.arcTo(x,y,x+w,y,r);
    ctx.closePath();
  }

  function loop(ts){
    if(!lastTs) lastTs=ts;
    const dt=Math.min(0.05,(ts-lastTs)/1000);
    lastTs=ts;
    if(!paused){ update(dt); draw(); }
    requestAnimationFrame(loop);
  }

  function nextLevel(){
    level++; if(level>10){ win(); return; }
    paused=true;
    alert(`레벨 ${level-1} 클리어! 다음 레벨로 갑니다.`);
    timeLeft=45; enemies.length=0; bullets.length=0; enemyBullets.length=0;
    spawnAcc=fireAcc=enemyFireAcc=0; syncUI(); paused=false;
  }
  function gameOver(){
    paused=true;
    alert(`게임 오버! 레벨 ${level}, 처치 ${kills}`);
    reset(level);
  }
  function win(){
    paused=true;
    alert(`축하합니다! 10단계 모두 완료! 처치 ${kills}`);
    reset(1);
  }

  ui.start.addEventListener('click',()=>{paused=false;});
  ui.pause.addEventListener('click',()=>{paused=true;});
  ui.restart.addEventListener('click',()=>{reset(level); paused=false;});

  reset(1);
  requestAnimationFrame(loop);
})();