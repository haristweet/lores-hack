// ═══════════════════════════════════════════════
//  GAME LIFECYCLE
// ═══════════════════════════════════════════════
function startGame(){
  // Build players
  players=[];
  const total=1+cfg.cpus; // always 1 human + N CPU
  for(let i=0;i<total;i++){
    let ctrl,isHuman=i===0;
    if(isHuman){
      const slot=cfg.slots[0]||'KB+M';
      ctrl=slot==='GAMEPAD'?new PadController():new KMController();
    }else ctrl=new CPUController(randPers());
    players.push(makePlayer(i,ctrl,isHuman));
  }
  // Roulette animation for Moody CPUs, instant reveal for others
  for(const p of players){
    if(p.isHuman)continue;
    if(p.controller.personality==='moody'){
      p.controller._rouletteDisplay='????';
      const labels=PERS_LIST.filter(x=>x!=='moody').map(x=>PERS_LABEL[x]);
      let tick=0,delay=60;
      const totalTicks=18+Math.floor(Math.random()*8);
      (function spin(){
        p.controller._rouletteDisplay=labels[tick%labels.length];
        tick++;
        if(tick<totalTicks){
          delay=Math.min(260,delay*1.18|0);
          setTimeout(spin,delay);
        }else{
          p.controller._rouletteDisplay=null;
          flash(p.pal.name+': MOODY→'+p.controller.ability,p.pal.body);
        }
      })();
    }else{
      flash(p.pal.name+': '+PERS_LABEL[p.controller.personality],p.pal.body);
    }
  }

  stage=1;totalKills=0;gameWon=false;
  monsterHouse=false;monsterHouseCleared=false;mhSpawnPending=0;
  bullets=[];ebullets=[];enemies=[];particles=[];pickups=[];messages=[];
  bulletTime=null;btOv.style.display='none';
  paused=false;pauseEl.style.display='none';
  running=true;PSG.play(1);
  cv.classList.toggle('cur',!players.some(p=>p.isHuman&&p.controller.type==='KB+M'));
  genMap();spawnT=.5;
  let cx=0,cy=0,n=0;for(const p of players){cx+=p.x;cy+=p.y;n++;}camX=cx/n;camY=cy/n;
  lobbyEl.style.display='none';overEl.style.display='none';winEl.style.display='none';
}

document.getElementById('resumeBtn').addEventListener('click',()=>setPause(false));
document.getElementById('saveQuitBtn').addEventListener('click',()=>{
  saveGame();setPause(false);running=false;PSG.stop();
  lobbyEl.style.display='flex';renderLobby();
});
document.getElementById('quitBtn').addEventListener('click',()=>{
  setPause(false);running=false;PSG.stop();
  lobbyEl.style.display='flex';renderLobby();
});
document.getElementById('retryBtn').addEventListener('click',()=>{overEl.style.display='none';lobbyEl.style.display='flex';renderLobby();});
document.getElementById('winBtn').addEventListener('click',()=>{winEl.style.display='none';lobbyEl.style.display='flex';renderLobby();});

// ═══════════════════════════════════════════════
//  INTRODUCTION SCREEN
// ═══════════════════════════════════════════════
const INTRO_PAGES=4;

function startIntro(){
  introActive=true;introPage=0;introT=0;
  lobbyEl.style.display='none';
}

function endIntro(){
  introActive=false;
  lobbyEl.style.display='flex';
  renderLobby();
}

// Draw a player-style sprite at screen coords (sx,sy), centered, scaled sc×
