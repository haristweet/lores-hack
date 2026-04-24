
// ═══════════════════════════════════════════════
//  SAVE / LOAD  (localStorage)
// ═══════════════════════════════════════════════
const SAVE_KEY='lores-hack-v1';

function hasSave(){return!!localStorage.getItem(SAVE_KEY);}

function getSaveLabel(){
  try{
    const d=JSON.parse(localStorage.getItem(SAVE_KEY));
    const hp=d.players.find(p=>p.isHuman);
    return'↩ DEPTH '+d.stage+' / LV'+( hp?hp.level:1)+' / KILLS '+d.totalKills;
  }catch(e){return'';}
}

function saveGame(){
  const data={
    v:1,stage,totalKills,
    cfg:{cpus:cfg.cpus,slots:[...cfg.slots]},
    players:players.map(p=>({
      idx:p.idx,hp:p.hp,maxHp:p.maxHp,
      level:p.level,xp:p.xp,
      weapon:{...p.weapon},
      isHuman:p.isHuman,alive:p.alive,hasRevive:p.hasRevive,
      ctrlType:p.isHuman?(cfg.slots[0]||'KB+M'):'CPU',
      personality:p.isHuman?null:p.controller.personality,
      accXp:p.accXp,kills:p.kills
    }))
  };
  localStorage.setItem(SAVE_KEY,JSON.stringify(data));
}

function clearSave(){localStorage.removeItem(SAVE_KEY);}

function loadGame(){
  const raw=localStorage.getItem(SAVE_KEY);
  if(!raw)return false;
  let data;
  try{data=JSON.parse(raw);}catch(e){clearSave();return false;}
  if(data.v!==1){clearSave();return false;}

  // Restore cfg
  cfg.cpus=data.cfg.cpus;cfg.slots=data.cfg.slots;
  renderLobby();

  // Rebuild players from saved snapshot
  players=[];
  for(const pd of data.players){
    const ctrl=pd.isHuman
      ?(pd.ctrlType==='GAMEPAD'?new PadController():new KMController())
      :new CPUController(pd.personality);
    const p=makePlayer(pd.idx,ctrl,pd.isHuman);
    p.hp=pd.hp;p.maxHp=pd.maxHp;
    p.level=pd.level;p.xp=pd.xp;
    p.hasRevive=pd.hasRevive||false;
    p.weapon={...pd.weapon};
    p.alive=pd.alive;p.accXp=pd.accXp;p.kills=pd.kills;
    players.push(p);
  }

  stage=data.stage;totalKills=data.totalKills;gameWon=false;
  monsterHouse=false;monsterHouseCleared=false;mhSpawnPending=0;
  bullets=[];ebullets=[];enemies=[];particles=[];pickups=[];messages=[];
  bulletTime=null;btOv.style.display='none';
  running=true;PSG.play(stage);
  cv.classList.toggle('cur',!players.some(p=>p.isHuman&&p.controller.type==='KB+M'));
  genMap();spawnT=.5;
  let cx=0,cy=0,n=0;for(const p of players){if(!p.alive)continue;cx+=p.x;cy+=p.y;n++;}
  if(n){camX=cx/n;camY=cy/n;}
  // Restore zombies for dead CPU players
  for(const p of players){
    if(!p.alive&&!p.isHuman){
      const zm=makeZombie(p);
      // Spawn near map center, away from living players
      for(let t=0;t<200;t++){
        const tx=rndi(3,MAPW-3),ty=rndi(3,MAPH-3);
        if(map[ty*MAPW+tx]!==0&&map[ty*MAPW+tx]!==2)continue;
        let minD=Infinity;
        for(const lp of players){if(!lp.alive)continue;const d=Math.hypot(lp.x-(tx*TILE+8),lp.y-(ty*TILE+8));if(d<minD)minD=d;}
        if(minD>80){zm.x=tx*TILE+8;zm.y=ty*TILE+8;break;}
      }
      enemies.push(zm);
    }
  }
  lobbyEl.style.display='none';gameOverState=false;
  flash('DEPTH '+stage+' — RESUMED','#0f8');
  return true;
}

