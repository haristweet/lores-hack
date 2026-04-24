
// ═══════════════════════════════════════════════
//  GAME STATE
// ═══════════════════════════════════════════════
let players=[],enemies=[],bullets=[],ebullets=[],particles=[],pickups=[],messages=[];
let stage=1,totalKills=0,running=false,gameWon=false,gameOverState=false,gameOverMsg='',winMsg='',callCooldown=0,callAggroTimer=0,_prevSel=false;
let spawnT=0,camX=0,camY=0,shake=0,time=0;
let monsterHouse=false,monsterHouseCleared=false,mhSpawnPending=0;
let bulletTime=null; // {timer,victimName,victimPal}

// ═══════════════════════════════════════════════
//  ENTITY FACTORIES
// ═══════════════════════════════════════════════
function makePlayer(idx,ctrl,isHuman){
  return{idx,isHuman,x:0,y:0,r:3,vx:0,vy:0,
    hp:100,maxHp:100,spd:48,dashCd:0,dashT:0,
    fireCd:0,
    xp:0,level:1,iframe:0,aim:0,alive:true,
    controller:ctrl,pal:P_PAL[idx],muzzle:0,
    weapon:{fireCd:.12,dmg:1,spread:.07,range:.55,spd:220},
    chargeT:0,hasRevive:false,
    edge:{dash:false,fire:false},
    rushing:false,
    kills:0,accXp:0};
}

function eScale(){return 1+(stage-1)*.06;}
function makeEnemy(type,x,y){
  const sc=eScale();
  const b={type,x,y,vx:0,vy:0,atkCd:0,hit:0,ang:0,anim:Math.random()*10,_dead:false};
  if(type==='grunt') {b.hp=3*sc;b.spd=22+stage*.1;b.r=3;b.dmg=8*sc;}
  else if(type==='runner'){b.hp=2*sc;b.spd=42+stage*.15;b.r=2.5;b.dmg=6*sc;}
  else if(type==='brute') {b.hp=10*sc;b.spd=14+stage*.08;b.r=5;b.dmg=18*sc;}
  else if(type==='shooter'){b.hp=3*sc;b.spd=14+stage*.08;b.r=3;b.dmg=10*sc;b.range=70;}
  return b;
}
function makeZombie(p){
  const mult=1.5+Math.random()*.5;
  const basePers=p.controller?p.controller.effPers:null;
  const zm={type:'zombie',x:p.x,y:p.y,vx:0,vy:0,
    hp:p.maxHp*mult,_maxHp:p.maxHp*mult,
    r:3,atkCd:0,hit:0,ang:0,anim:0,_dead:false,
    spd:32+p.level*2,dmg:14+p.level*3,
    weapon:{fireCd:.35,dmg:Math.max(2,p.weapon.dmg*1.3),spread:.22,range:1.3,spd:145},
    fireCd:0,
    pal:p.pal,level:p.level,fromName:p.pal.name,
    dropXp:p.accXp,
    dropCores:Math.floor(coresCollected*.05),
    zombiePers:basePers,
    _zombieAbility:basePers==='moody'?randPers(true):basePers,
    _chaosT:0,_gateReached:false,
  };
  // Announce zombie ability
  const ZOMBIE_TITLE={prospector:'CORE-EATER',sniper:'WALL-HACK',bodyguard:'GATEKEEPER',berserker:'BLOODHOUND',moody:'CHAOS'};
  flash(p.pal.name+': '+( ZOMBIE_TITLE[basePers]||'ZOMBIE'),'#f44');
  return zm;
}

function makeBoss(){
  const sc=eScale();
  const hp=Math.round(120*(1+stage*.09)*sc);
  let bx,by;
  for(let t=0;t<300;t++){
    const tx=rndi(2,MAPW-2),ty=rndi(2,MAPH-2);
    if(!map||map[ty*MAPW+tx]!==0)continue;
    const wx=tx*TILE+8,wy=ty*TILE+8;
    let minD=Infinity;
    for(const p of players){if(!p.alive)continue;const d=Math.hypot(p.x-wx,p.y-wy);if(d<minD)minD=d;}
    if(minD>180){bx=wx;by=wy;break;}
  }
  if(bx===undefined){bx=MAPW*TILE*.5;by=16;}
  return{type:'boss',x:bx,y:by,vx:0,vy:0,
    hp,_maxHp:hp,r:9,spd:22+stage*.25,
    dmg:Math.round(35*sc),atkCd:0,hit:0,ang:0,anim:0,_dead:false,breakCd:0,
    _phase2:false,_shootCd:0};
}

// ═══════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════
function rnd(a=1,b){if(b===undefined){b=a;a=0;}return a+Math.random()*(b-a);}
function rndi(a,b){return Math.floor(rnd(a,b));}
function chance(p){return Math.random()<p;}
function spark(x,y,c,n=6,sp=40){for(let i=0;i<n;i++){const a=rnd(0,Math.PI*2),s=rnd(sp*.3,sp);particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rnd(.18,.5),c});}}
function blood(x,y){spark(x,y,'#c22',8,60);}
function smoke(x,y){for(let i=0;i<5;i++)particles.push({x,y,vx:rnd(-8,8),vy:rnd(-25,-5),life:rnd(.4,.9),c:'#445',sm:true});}
function flash(msg,c='#ff0'){messages.push({t:0,msg:(''+msg).toUpperCase(),c});}
function moveObj(o,dt){
  const nx=o.x+o.vx*dt; if(!hitsWall(nx,o.y,o.r))o.x=nx;
  const ny=o.y+o.vy*dt; if(!hitsWall(o.x,ny,o.r))o.y=ny;
  // Wall escape: if somehow embedded, push out
  if(solid(o.x,o.y)){
    for(let a=0;a<8;a++){const t=a*Math.PI/4;const ex=o.x+Math.cos(t)*TILE*.6,ey=o.y+Math.sin(t)*TILE*.6;if(!solid(ex,ey)){o.x=ex;o.y=ey;break;}}
  }
}
function spawnEnemy(type){
  for(let t=0;t<200;t++){
    const tx=rndi(2,MAPW-2),ty=rndi(2,MAPH-2),tile=map[ty*MAPW+tx];
    if(tile!==0&&tile!==2&&tile!==3)continue;
    const x=tx*TILE+8,y=ty*TILE+8;
    let minD=Infinity;
    for(const p of players){if(!p.alive)continue;const d=(x-p.x)**2+(y-p.y)**2;if(d<minD)minD=d;}
    if(minD<90*90||minD>260*260)continue;
    enemies.push(makeEnemy(type,x,y)); return;
  }
}

