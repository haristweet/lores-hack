
// ═══════════════════════════════════════════════
//  COFFEE BREAK  (boss floor intermission)
// ═══════════════════════════════════════════════
let coffeeBreak=null,_hasDashParried=false;
const CB_DUR=5.5;
const CB_NEXT=7.5; // skit ends at CB_DUR, "next depth" shown until CB_NEXT
let _cbBtnPrev=false,_endGpPrev=false;

function startCoffeeBreak(){
  const skits=['chase','victory','bomber','ghost','brute'];
  if(_hasDashParried)skits.push('dashparry');
  coffeeBreak={t:0,skit:skits[Math.floor(Math.random()*skits.length)]};
  _cbBtnPrev=false;running=false;
  PSG.jingle();
}
function endCoffeeBreak(){const dbg=coffeeBreak?._debug;coffeeBreak=null;if(dbg)PSG.stop();else{running=true;nextStage();}}

// ── Helpers ──────────────────────────────────
const _GY=105; // sprite center y (ground at _GY+8)

function _cbP(sx,sy,aim,pal,extra){
  const hp=players.find(p=>p.isHuman);
  return Object.assign({x:sx,y:sy,aim:aim??0,alive:true,
    pal:pal??P_PAL[0],muzzle:0,dashT:0,iframe:0,chargeT:0,parryT:0,
    level:hp?.level??1,hp:100,maxHp:100,r:3,vx:0,vy:0,idx:0,
    shields:[],shieldAngle:0},extra??{});
}
function _cbE(type,sx,sy,ang,extra){
  const e=makeEnemy(type,sx,sy);
  return Object.assign(e,{ang:ang??0,anim:coffeeBreak.t*3,hit:0,_dead:false},extra??{});
}
function _cbBubble(text,x,y,col){
  const w=text.length*4+4;
  ctx.fillStyle='#111';ctx.fillRect(x-1,y-1,w+2,9);
  pixText(text,x+2,y+1,col??'#fff');
}
function _cbSparks(cx,cy,age,dur,n,col1,col2,spd){
  if(age<0||age>dur)return;
  const r=age*spd,a=Math.max(0,1-age/dur);
  for(let i=0;i<n;i++){const ang=i*Math.PI*2/n;
    ctx.globalAlpha=a;ctx.fillStyle=i%2?col1:col2;
    ctx.fillRect((cx+Math.cos(ang)*r)|0,(cy+Math.sin(ang)*r)|0,2,2);}
  ctx.globalAlpha=1;
}
// Temporarily swap time → coffeeBreak.t so sprite animations play correctly
function _cbF(fn){const sv=time;time=coffeeBreak.t;fn();time=sv;ctx.globalAlpha=1;}

// ── Skit A: CHASE ────────────────────────────
// Grunt chases player → player turns and shoots → grunt splats
function _cbChase(t){
  const gy=_GY;
  const pPal=players.find(p=>p.isHuman)?.pal??P_PAL[0];
  const px=t<2.5?70+t*50:195;
  _cbF(()=>drawPlayer(_cbP(px,gy,t<2.5?0:Math.PI,pPal,
    {muzzle:t>=3&&t<3.4?.15:0,vx:t<2.5?20:0})));
  if(t<4){
    const gx=t<2.5?20+t*62:175;
    _cbF(()=>drawEnemy(_cbE('grunt',gx,gy,t<2.5?0:Math.PI,
      {hit:t>=3&&t<3.5?.12:0,vx:t<2.5?15:0})));
  }
  // Bullet zipping left
  if(t>=3&&t<3.5){ctx.fillStyle='#ffe';ctx.fillRect((195-(t-3)*520)|0,gy-1,3,1);}
  // Splat sparks
  _cbSparks(175,gy,t-3.5,0.7,8,'#f44','#f80',60);
  if(t<2.5)_cbBubble('!!',38,gy-24,'#f44');
  if(t>=3.6&&t<5.5)_cbBubble('GOT HIM',148,gy-24,'#ff0');
}

// ── Skit B: VICTORY ──────────────────────────
// Player + surviving allies walk to center and celebrate
function _cbVictory(t){
  const gy=_GY,cx=W/2;
  const pPal=players.find(p=>p.isHuman)?.pal??P_PAL[0];
  const allies=players.filter(p=>!p.isHuman&&p.alive).slice(0,2);
  const px=t<2?50+t*50:150;
  _cbF(()=>drawPlayer(_cbP(px,gy,t<2?0:-Math.PI/2,pPal,{vx:t<2?20:0})));
  allies.forEach((al,i)=>{
    const ax=t<2?(W-70+i*20)-t*50:cx+(i+1)*18;
    _cbF(()=>drawPlayer(_cbP(ax,gy,t<2?Math.PI:-Math.PI/2,al.pal,{idx:al.idx,vx:t<2?-20:0})));
  });
  // Sparkle ring
  if(t>=2.2)for(let i=0;i<7;i++){
    const a=i*Math.PI*2/7+(t*1.8),r=22+Math.sin(t*5+i)*6;
    ctx.globalAlpha=0.7+Math.sin(t*6+i)*.3;
    ctx.fillStyle=['#ff0','#0ff','#f0f','#f80','#0f8','#adf','#fa8'][i];
    ctx.fillRect((cx+Math.cos(a)*r)|0,(gy-5+Math.sin(a)*r)|0,2,2);
  }
  ctx.globalAlpha=1;
  if(t>=2.5)_cbBubble(allies.length?'WELL DONE!':'SOLO CLEAR',cx-20,gy-30,'#ff0');
}

// ── Skit C: BOMBER ───────────────────────────
// Bomber walks in, notices player, panics and runs off, explodes
function _cbBomber(t){
  const gy=_GY;
  const pPal=players.find(p=>p.isHuman)?.pal??P_PAL[0];
  const px=t<3?75:75-(t-3)*60;
  _cbF(()=>drawPlayer(_cbP(px,gy,0,pPal,{vx:t>3&&t<3.5?-20:0})));
  const bx=t<1.5?W-50-t*90:t<2.5?W-50-135:t<3.2?(W-185)+(t-2.5)*130:W+60;
  const bang=t<2.5?Math.PI:0;
  if(t<3.2)_cbF(()=>drawEnemy(_cbE('bomber',bx,gy,bang,
    {fuseT:t<2?4:Math.max(.1,2-(t-2)*2),vx:t<1.5?-20:t>=2.5?30:0})));
  if(t>=3.2){
    if(t<3.7){ctx.fillStyle='#fff';ctx.globalAlpha=Math.max(0,1-(t-3.2)/0.5);ctx.fillRect(0,0,W,H);}
    ctx.globalAlpha=1;
    _cbSparks(W-28,gy,t-3.2,1.0,16,'#f80','#f44',80);
    _cbSparks(W-28,gy,Math.max(0,t-3.6),0.8,8,'#fff','#fe8',45);
  }
  if(t>=1.5&&t<2.3)_cbBubble('!!',bx-10,gy-24,'#f44');
  if(t>=3.8&&t<5.5)_cbBubble('PHEW...',50,gy-24,'#0f8');
}

// ── Skit D: GHOST ────────────────────────────
// Ghost floats in, player parries, ghost banished
function _cbGhost(t){
  const gy=_GY;
  const pPal=players.find(p=>p.isHuman)?.pal??P_PAL[0];
  _cbF(()=>drawPlayer(_cbP(230,gy,Math.PI,pPal,{parryT:t>=2.5&&t<3.2?.18:0})));
  const gx=t<2.5?40+t*72:220;
  const alpha=t<2.5?1:Math.max(0,1-(t-2.5)/.7);
  if(alpha>0.02){ctx.globalAlpha=alpha;_cbF(()=>drawEnemy(_cbE('ghost',gx,gy,0)));ctx.globalAlpha=1;}
  if(t>=2.5&&t<3){ctx.fillStyle='#adf';ctx.globalAlpha=Math.max(0,(1-(t-2.5)/.5))*.55;ctx.fillRect(0,0,W,H);}
  ctx.globalAlpha=1;
  _cbSparks(gx,gy-4,t-2.5,0.8,10,'#adf','#fff',65);
  if(t<2.3)_cbBubble('...',190,gy-24,'#888');
  if(t>=3.2)_cbBubble('BANISHED!',180,gy-24,'#adf');
}

// ── Skit E: BRUTE ────────────────────────────
// Brute charges, player dodges, brute hits left wall
function _cbBrute(t){
  const gy=_GY;
  const pPal=players.find(p=>p.isHuman)?.pal??P_PAL[0];
  const bx=t<2?W-60-t*110:t<2.8?(W-280)+(t-2)*30:W-280+24;
  _cbF(()=>drawEnemy(_cbE('brute',bx,gy,Math.PI,
    {hit:t>=2&&t<3?.15:0,vx:t<2?-30:t<2.8?15:0})));
  const px=t<1.5?W/2-t*60:t<2.5?W/2-90:t<3?W/2-90+(t-2.5)*160:W/2-10;
  _cbF(()=>drawPlayer(_cbP(px,gy,t<2.5?Math.PI:0,pPal,{vx:t<1.5?-25:t>=2.5&&t<3?35:0})));
  _cbSparks(38,gy,t-2,0.8,8,'#c84','#f80',55);
  if(t>=1.8&&t<2.5)_cbBubble('!!',px+6,gy-24,'#ff0');
  if(t>=3.2)_cbBubble('CLOSE!!',px-5,gy-24,'#0ff');
}

// ── Skit F: DASH PARRY ───────────────────────
// Player dashes in, parries at the last frame, runner blasts away
function _cbDashParry(t){
  const gy=_GY;
  const pPal=players.find(p=>p.isHuman)?.pal??P_PAL[0];
  const IMPACT_X=155;
  const px=t<1.5?30+t*83:IMPACT_X;
  const pDash=t<1.5;
  const pParry=t>=1.5&&t<2.3;
  const pFlash=t>=1.5&&t<1.8;
  // Motion lines during dash
  if(pDash){
    ctx.fillStyle='#adf';ctx.globalAlpha=0.25;
    for(let i=0;i<4;i++)ctx.fillRect((px-10-i*7)|0,gy-2+i,6,1);
    ctx.globalAlpha=1;
  }
  _cbF(()=>drawPlayer(_cbP(px,gy,0,pPal,{
    dashT:pDash?.1:0,parryT:pParry?.18:0,_dcpFlash:pFlash?.1:0,vx:pDash?28:0
  })));
  // Runner charges from right → gets blasted right
  const rImpact=IMPACT_X+12;
  if(t<1.6){
    const rx=t<1.5?W-30-t*88:rImpact;
    _cbF(()=>drawEnemy(_cbE('runner',rx,gy,Math.PI,{hit:t>=1.5?.15:0,vx:t<1.5?-28:0})));
  }else{
    const rx=rImpact+(t-1.6)*260;
    if(rx<W+20)_cbF(()=>drawEnemy(_cbE('runner',rx,gy,0,{hit:.2,anim:coffeeBreak.t*8,vx:40})));
  }
  // White flash on impact
  if(t>=1.5&&t<1.85){
    ctx.fillStyle='#fff';ctx.globalAlpha=Math.max(0,1-(t-1.5)/.35)*.7;
    ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;
  }
  // Impact sparks
  _cbSparks(rImpact,gy,t-1.5,.9,14,'#ff0','#fff',90);
  _cbSparks(rImpact,gy,Math.max(0,t-2.0),.7,8,'#f80','#ff0',50);
  // Bubbles
  if(t<1.2)_cbBubble('!!',W-70,gy-24,'#f44');
  if(t>=2.1&&t<5.5)_cbBubble('DASH PARRY!',105,gy-30,'#ff0');
  if(t>=3.5)_cbBubble('PERFECT!',108,gy-42,'#0ff');
}

// ── Main coffee break draw ────────────────────
function drawCoffeeBreak(){
  const cb=coffeeBreak,t=cb.t;
  ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
  for(let sy=0;sy<H;sy+=4){ctx.fillStyle='rgba(0,0,24,0.14)';ctx.fillRect(0,sy,W,2);}
  const dStr='DEPTH '+(stage-1)+' CLEARED';
  pixBig(dStr,Math.round((W-dStr.length*8)/2),7,'#ff0');
  ctx.globalAlpha=0.6+Math.sin(t*3)*.4;
  pixBig('COFFEE  BREAK',Math.round((W-104)/2),18,'#f80');
  ctx.globalAlpha=1;
  ctx.fillStyle='#333';ctx.fillRect(10,_GY+8,W-20,1);
  if(t<CB_DUR){
    ({chase:_cbChase,victory:_cbVictory,bomber:_cbBomber,ghost:_cbGhost,brute:_cbBrute,dashparry:_cbDashParry}[cb.skit]??_cbChase)(t);
    if(t>1){
      ctx.globalAlpha=0.35+Math.sin(t*4)*.15;
      pixText('ANY KEY TO SKIP',Math.round((W-60)/2),H-9,'#445');
      ctx.globalAlpha=1;
    }
  }else{
    // "next depth" phase (2 sec)
    const nt=t-CB_DUR;
    const a=Math.min(1,nt/.4); // fade in
    const nStr='LET\'S GO  DEPTH '+(stage);
    ctx.globalAlpha=a*(0.85+Math.sin(nt*5)*.15);
    pixBig(nStr,Math.round((W-nStr.length*8)/2),_GY-20,'#0ff');
    ctx.globalAlpha=a;
    pixText('▶▶',Math.round(W/2-8),_GY-6,'#0cf');
    ctx.globalAlpha=1;
  }
  // Gamepad skip (edge-detect)
  if(t>0.5){
    const gps=navigator.getGamepads?navigator.getGamepads():[];
    let any=false;for(const gp of gps){if(!gp)continue;any=gp.buttons.some(b=>b?.pressed);break;}
    if(any&&!_cbBtnPrev){endCoffeeBreak();return;}
    _cbBtnPrev=any;
  }
  if(t>=CB_NEXT)endCoffeeBreak();
}

// ═══════════════════════════════════════════════
//  ENDING INTRO  (D100 clear cinematic)
// ═══════════════════════════════════════════════
function drawEndingIntro(t){
  ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
  for(let sy=0;sy<H;sy+=4){ctx.fillStyle='rgba(0,0,24,0.14)';ctx.fillRect(0,sy,W,2);}
  const pulse=0.85+Math.sin(t*3)*.15;
  // "DEPTH 100" title
  if(t>=0.3){
    ctx.save();ctx.globalAlpha=Math.min(1,(t-.3)/.7)*pulse;
    pixBig('DEPTH 100',Math.round((W-72)/2),30,'#ff0');
    ctx.restore();
  }
  // "YOU FOUND THE SCREW"
  if(t>=0.9){
    ctx.globalAlpha=Math.min(1,(t-.9)/.6);
    pixText('YOU FOUND THE SCREW',Math.round((W-76)/2),50,'#fc8');
    ctx.globalAlpha=1;
  }
  // Screw icon (large, pulsing)
  if(t>=0.5&&t<3.8){
    const a=Math.min(1,(t-.5)/.5),p2=(Math.sin(t*8)+1)*.5;
    ctx.globalAlpha=a*(.6+p2*.4);ctx.fillStyle='#ff0';ctx.fillRect(W/2-5,H/2-5,10,10);
    ctx.globalAlpha=a;ctx.fillStyle='#fff';ctx.fillRect(W/2-3,H/2-3,6,6);
    ctx.fillStyle='#000';ctx.fillRect(W/2-1,H/2+1,3,1);ctx.fillRect(W/2+1,H/2-1,1,3);
    ctx.globalAlpha=a;pixText('SCREW',Math.round(W/2-10),H/2+9,'#ff0');
    ctx.globalAlpha=1;
  }
  // Player + allies escape to the right (t=1.8-4.0)
  if(t>=1.8&&t<4.2){
    const wt=t-1.8;
    const pPal=players.find(p=>p.isHuman)?.pal??P_PAL[0];
    const px=W/2-10+wt*52;
    const sv=time;time=t;
    drawPlayer(_cbP(px,H/2+10,0,pPal,{vx:20}));
    const alive=players.filter(p=>!p.isHuman&&p.alive).slice(0,2);
    alive.forEach((al,i)=>{drawPlayer(_cbP(px-14-i*13,H/2+10,0,al.pal,{idx:al.idx,vx:20}));});
    time=sv;ctx.globalAlpha=1;
  }
  // Fade to white → regular win screen
  if(t>=3.8){
    ctx.fillStyle='#fff';ctx.globalAlpha=Math.min(1,(t-3.8)/.8);
    ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;
  }
  // Skip hint
  ctx.globalAlpha=0.3+Math.sin(t*3)*.1;
  pixText('ANY KEY TO SKIP',Math.round((W-60)/2),H-10,'#445');
  ctx.globalAlpha=1;
  // Gamepad skip
  const gps=navigator.getGamepads?navigator.getGamepads():[];
  let any=false;for(const gp of gps){if(!gp)continue;any=gp.buttons.some(b=>b?.pressed);break;}
  if(any&&!_endGpPrev&&t>0.5)endingT=5;
  _endGpPrev=any;
}
