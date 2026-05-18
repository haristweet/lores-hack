// ═══════════════════════════════════════════════
//  TUTORIAL
// ═══════════════════════════════════════════════
let tutorialActive=false,tutStep=0,tutT=0;
let _tutStartX=0,_tutStartY=0;
let _tutDashed=false,_tutPrevCallCd=0;
let _tutSecretSet=false,_tutCompleteT=0;

const _TUT_GATE_XS=[11,21,31,41,51];

const _TUT_STEPS=[
  {label:'MOVE',   key:'WASD / ARROW KEYS',        sub:'Walk around the room'},
  {label:'SHOOT',  key:'AIM+CLICK / RIGHT STICK',  sub:'Defeat the enemy!'},
  {label:'DASH',   key:'SPACE or F / R2 + direction', sub:'Dash through the gap!'},
  {label:'PARRY',  key:'DASH into enemy bullet',     sub:'Deflect the shot!'},
  {label:'CALL',   key:'TAB / SELECT',             sub:'Call your CPU allies!'},
  {label:'WEAPON', key:'Shoot the golden wall',    sub:'3 hits to reveal a weapon!'},
];

function genTutorialMap(){
  map=new Uint8Array(MAPW*MAPH);map.fill(1);
  fog=new Uint8Array(MAPW*MAPH);fog.fill(1); // fully revealed

  // 6 rooms, each 9 tiles wide × 10 tall, at rows y=5..14
  const roomRanges=[[2,10],[12,20],[22,30],[32,40],[42,50],[52,60]];
  for(const [x0,x1] of roomRanges)
    for(let y=5;y<=14;y++)
      for(let x=x0;x<=x1;x++)
        map[y*MAPW+x]=0;

  // DASH room (room 2: x=22-30): pillars, leave y=9-10 open
  for(let x=24;x<=27;x++){
    for(let y=5;y<=8;y++) map[y*MAPW+x]=1;
    for(let y=11;y<=14;y++) map[y*MAPW+x]=1;
  }

  // Secret wall tile in room 5 (x=56, y=9-10) — re-wall after carve
  map[9*MAPW+56]=1;map[10*MAPW+56]=1;

  // Floor variation
  for(let i=0;i<map.length;i++)
    if(map[i]===0&&Math.random()<0.05)map[i]=2;

  rooms_=[];exits=[];cores=[];pods=[];screwObj=null;
  coresNeeded=1;coresCollected=0;exitOpen=false; // coresNeeded=1 prevents auto-exit-open
}

function startTutorial(){
  tutorialActive=true;tutStep=0;tutT=0;
  _tutDashed=false;_tutPrevCallCd=0;
  _tutSecretSet=false;_tutCompleteT=0;
  _hasDashParried=false;

  stage=1;totalKills=0;gameWon=false;gameOverState=false;
  monsterHouse=false;monsterHouseCleared=false;mhSpawnPending=0;
  bullets=[];ebullets=[];enemies=[];particles=[];pickups=[];
  messages=[];gatekeepers=[];poisonPuddles=[];npcs=[];
  bulletTime=null;paused=false;
  driverActive=false;overdriveActive=false;vertidriveActive=false;laserActive=false;
  callCooldown=0;callAggroTimer=0;

  players=[];
  const slot=cfg.slots[0]||'KB+M';
  const ctrl=slot==='GAMEPAD'?new PadController():new KMController();
  const human=makePlayer(0,ctrl,true);
  human.hp=human.maxHp=9999; // immortal in tutorial
  players.push(human);
  const cpu=makePlayer(1,new CPUController('bodyguard'),false);
  cpu.hp=cpu.maxHp=9999;
  players.push(cpu);

  genTutorialMap();

  const sx=6*TILE+8,sy=9*TILE+8;
  human.x=sx;human.y=sy;
  cpu.x=sx-14;cpu.y=sy+10;
  _tutStartX=sx;_tutStartY=sy;

  // Dummy enemy in room 1 — moves naturally (easier to shoot when it approaches)
  const dummy=makeEnemy('grunt',16*TILE+8,9*TILE+8);
  dummy.hp=3;dummy._tutDummy=true;
  enemies.push(dummy);

  // Stationary turret (shooter) in room 3 — very high HP so it can't be killed
  const turret=makeEnemy('shooter',36*TILE+8,9*TILE+8);
  turret.spd=0;turret._tutTurret=true;
  turret.hp=turret.maxHp=999;
  enemies.push(turret);

  // Secret wall pre-hit 22/25 → 3 shots needed
  secretWallPos={tx:56,ty:9};
  secretWallHits=22;
  _tutSecretSet=true;

  camX=sx;camY=sy;
  spawnT=9999;running=true;
  PSG.stop();
  cv.classList.toggle('cur',slot!=='KB+M');
  lobbyEl.style.display='none';
}

function _tutOpenGate(step){
  const gx=_TUT_GATE_XS[step];
  for(let gy=9;gy<=10;gy++){map[gy*MAPW+gx]=0;fog[gy*MAPW+gx]=1;}
}

function _tutAdvance(){
  const hp=humanPlayer();
  if(tutStep<5){
    _tutOpenGate(tutStep);
    flash(_TUT_STEPS[tutStep].label+': CLEAR!','#0f0');
    if(hp)spark(hp.x,hp.y,'#0f0',12,90);
  }
  tutStep++;tutT=0;
  _tutPrevCallCd=callCooldown; // sync so new TAB press is needed for step 4
  if(tutStep>=6){
    localStorage.setItem('tut_done','1');
    flash('TUTORIAL COMPLETE!','#ff0');
    if(hp)spark(hp.x,hp.y,'#ff0',24,130);
    _tutCompleteT=4;
  }
}

function updateTutorial(dt){
  spawnT=9999; // prevent regular enemy spawns
  // Safety net: prevent game-over interrupting tutorial
  if(!running||gameOverState){running=true;gameOverState=false;_goT=0;}

  if(tutStep>=6){
    _tutCompleteT-=dt;
    if(_tutCompleteT<=0)endTutorial();
    return;
  }
  tutT+=dt;
  const hp=humanPlayer();if(!hp)return;

  switch(tutStep){
    case 0: // MOVE
      if(Math.hypot(hp.x-_tutStartX,hp.y-_tutStartY)>28)_tutAdvance();
      break;
    case 1: // SHOOT — dummy killed
      if(!enemies.some(e=>e._tutDummy))_tutAdvance();
      break;
    case 2: // DASH
      if(hp.dashT>0&&!_tutDashed){_tutDashed=true;_tutAdvance();}
      break;
    case 3: // PARRY
      if(_hasDashParried)_tutAdvance();
      break;
    case 4: // CALL THEM
      if(_tutPrevCallCd<=0&&callCooldown>0)_tutAdvance();
      _tutPrevCallCd=callCooldown;
      break;
    case 5: // SECRET WALL — cleared when secretWallPos becomes null
      if(_tutSecretSet&&!secretWallPos)_tutAdvance();
      break;
  }
}

function endTutorial(){
  tutorialActive=false;
  running=false;gameOverState=false;gameWon=false;bulletTime=null;
  driverActive=false;overdriveActive=false;vertidriveActive=false;laserActive=false;
  secretWallPos=null;secretWallHits=0;
  lobbyEl.style.display='flex';
  renderLobby();PSG.title();
}

function drawTutorialOverlay(){
  // Complete screen
  if(tutStep>=6){
    ctx.save();
    ctx.fillStyle='rgba(0,0,0,0.6)';
    ctx.fillRect(0,H/2-18,W,36);
    const m='TUTORIAL COMPLETE!';
    pixText(m,Math.floor((W-m.length*4)/2),H/2-8,'#ff0');
    const m2='RETURNING TO LOBBY...';
    pixText(m2,Math.floor((W-m2.length*4)/2),H/2+4,'#0ff');
    ctx.restore();
    return;
  }

  const step=_TUT_STEPS[tutStep];

  // ── Top instruction bar ──
  ctx.save();
  ctx.fillStyle='rgba(0,0,20,0.85)';
  ctx.fillRect(0,0,W,22);

  // Progress dots (6 steps)
  const dotTotalW=6*9-2;
  const dotX0=Math.floor((W-dotTotalW)/2);
  for(let i=0;i<6;i++){
    ctx.fillStyle=i<tutStep?'#0f0':i===tutStep?'#ff0':'#224';
    ctx.fillRect(dotX0+i*9,3,7,4);
  }
  pixText(step.label,Math.floor((W-step.label.length*4)/2),10,'#ff0');
  pixText(step.key,Math.floor((W-step.key.length*4)/2),17,'#8bc');
  ctx.restore();

  // ── Bottom skip hint ──
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,0.55)';
  ctx.fillRect(W-38,H-10,38,10);
  pixText('ESC:SKIP',W-35,H-8,'#345');
  ctx.restore();

  // ── Arrow → pointing to next gate (when off-screen right) ──
  if(tutStep<5){
    const hp=humanPlayer();
    if(hp){
      const gatePixX=_TUT_GATE_XS[tutStep]*TILE+8;
      const screenX=gatePixX-(camX-W/2);
      if(screenX>W-16){
        const blink=(performance.now()/400|0)%2===0;
        if(blink){
          ctx.save();ctx.fillStyle='#ff0';
          ctx.beginPath();
          ctx.moveTo(W-10,H/2-5);
          ctx.lineTo(W-4,H/2);
          ctx.lineTo(W-10,H/2+5);
          ctx.fill();
          ctx.restore();
        }
      }
    }
  }

  // ── Golden highlight box around secret wall ──
  if(tutStep===5){
    const wallPixX=56*TILE+8,wallPixY=9*TILE+8;
    const sx=wallPixX-(camX-W/2),sy_=wallPixY-(camY-H/2);
    const blink=(performance.now()/300|0)%2===0;
    if(blink&&sx>0&&sx<W&&sy_>0&&sy_<H){
      ctx.save();
      ctx.strokeStyle='#ffd700';ctx.lineWidth=1;
      ctx.strokeRect(sx-8,sy_-8,16,16);
      ctx.restore();
    }
  }
}
