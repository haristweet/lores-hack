// ── Pause overlay (canvas-rendered) ──────────
const pauseBtns={};
function pBtnPri(key,label,x,y,w,h,col){
  pauseBtns[key]={x,y,w,h};
  const hov=(mouse.x>=x&&mouse.x<=x+w&&mouse.y>=y&&mouse.y<=y+h)||_ovlPadFocus===key;
  ctx.fillStyle=hov?col:'#040c14';ctx.fillRect(x,y,w,h);
  ctx.fillStyle=col;
  ctx.fillRect(x,y,w,1);ctx.fillRect(x,y+h-1,w,1);ctx.fillRect(x,y,1,h);ctx.fillRect(x+w-1,y,1,h);
  pixText(label,x+Math.round((w-label.length*4)/2),y+Math.round((h-6)/2),hov?'#000':col);
}
function drawPause(){
  Object.keys(pauseBtns).forEach(k=>delete pauseBtns[k]);
  // dark overlay + scanlines
  ctx.fillStyle='rgba(0,0,0,0.74)';ctx.fillRect(0,0,W,H);
  for(let sy=0;sy<H;sy+=4){ctx.fillStyle='rgba(0,0,24,0.18)';ctx.fillRect(0,sy,W,2);}
  // PAUSED title (slow pulse)
  const t=performance.now()/1000;
  const pulse=0.82+Math.sin(t*2.8)*0.14;
  const pc=Math.round(255*pulse).toString(16).padStart(2,'0');
  pixBig('PAUSED',(W-48)/2,52,`#00${pc}${pc}`);
  // separator
  ctx.fillStyle='rgba(0,200,255,0.28)';ctx.fillRect(W/2-36,67,72,1);
  // buttons (72px wide, centered)
  const bw=72,bx=Math.round((W-bw)/2);
  pBtnPri('resume','RESUME',bx,75,bw,13,'#0ff');
  pBtnPri('squit','SAVE & QUIT',bx,90,bw,13,'#0c9');
  pBtnPri('quit','QUIT NO SAVE',bx,105,bw,13,'#f55');
  // ESC hint
  pixText('ESC = RESUME',(W-48)/2,122,'#334');
}
function pauseHandleClick(){
  for(const[k,b]of Object.entries(pauseBtns)){
    if(mouse.x>=b.x&&mouse.x<b.x+b.w&&mouse.y>=b.y&&mouse.y<b.y+b.h){
      if(k==='resume'){setPause(false);return;}
      if(k==='squit'){saveGame();setPause(false);running=false;PSG.stop();lobbyEl.style.display='flex';renderLobby();PSG.title();return;}
      if(k==='quit'){setPause(false);running=false;PSG.stop();lobbyEl.style.display='flex';renderLobby();PSG.title();return;}
    }
  }
}

function iChar(sx,sy,pal,sc,dead=false,aim=0){
  ctx.save();ctx.translate(sx,sy);ctx.scale(sc,sc);
  ctx.fillStyle='#000';ctx.globalAlpha=.3;ctx.fillRect(-3,2,6,2);ctx.globalAlpha=1;
  ctx.fillStyle=pal.body;ctx.fillRect(-2,-3,4,6);
  ctx.fillStyle=pal.head;ctx.fillRect(-2,-5,4,3);
  if(dead){
    ctx.fillStyle='#f44';ctx.fillRect(-2,-4,1,1);ctx.fillRect(0,-4,1,1);
    ctx.fillStyle='#000';ctx.fillRect(-1,-4,1,1);ctx.fillRect(1,-4,1,1);
  }else{
    ctx.fillStyle='#000';ctx.fillRect(-1,-4,1,1);ctx.fillRect(0,-4,1,1);
  }
  const bob=dead?0:((introT*12)|0)%2;
  ctx.fillStyle=pal.dark;ctx.fillRect(-2,3,1,2-bob);ctx.fillRect(1,3,1,1+bob);
  if(!dead){
    ctx.fillStyle='#aaa';
    for(let i=0;i<5;i++)ctx.fillRect(Math.round(Math.cos(aim)*(3+i)),Math.round(Math.sin(aim)*(3+i)),1,1);
  }
  ctx.restore();
}

// ── Enemy gallery data ────────────────────────
const INTRO_ENEMIES=[
  {type:'grunt',   col:'#7a7',name:'GRUNT',   desc:'Direct melee chaser',          dep:'D1+',  nag:'Comes in swarms. Typical.'},
  {type:'runner',  col:'#c85',name:'RUNNER',  desc:'Fast and fragile',              dep:'D1+',  nag:'Gone before you can aim. Typical.'},
  {type:'shooter', col:'#86c',name:'SHOOTER', desc:'Stays back, fires at range',   dep:'D1+',  nag:'Always finds a sightline. Typical.'},
  {type:'brute',   col:'#a44',name:'BRUTE',   desc:'Slow, very tanky',             dep:'D5+',  nag:'Takes forever to drop. Typical.'},
  {type:'poison',  col:'#6a6',name:'POISON',  desc:'Leaves toxic puddles',         dep:'D5+',  nag:'Floor covered in goo. Typical.'},
  {type:'dasher',  col:'#c80',name:'DASHER',  desc:'Charges when in range',        dep:'D15+', nag:'Charge comes out of nowhere. Typical.'},
  {type:'splatter',col:'#96c',name:'SPLATTER',desc:'Splits into 2 on death',       dep:'D25+', nag:'Dying just makes more. Typical.'},
  {type:'ghost',   col:'#adf',name:'GHOST',   desc:'Bullets pass right through!',  dep:'D30+', nag:"Can't even touch it. Typical."},
  {type:'bomber',  col:'#f66',name:'BOMBER',  desc:'Explodes on a 4-5 sec fuse',   dep:'D35+', nag:'Always in the blast zone. Typical.'},
  {type:'gatekeeper',col:'#f44',name:'GATEKEEPER',desc:'Guards the exit. Kill it to pass.',dep:'D10+',nag:"Won't budge until it's dead. Typical."},
  {type:'boss',tier:'green', col:'#833',name:'BOSS',     desc:'Breaks walls, hunts you down',   dep:'D10+', nag:'Just when you cleared the floor. Typical.'},
  {type:'boss',tier:'yellow',col:'#aa8',name:'GOLD BOSS',desc:'+GK throw, 16-way shot',         dep:'D33+', nag:'Now it brings backup. Typical.'},
  {type:'boss',tier:'red',   col:'#f44',name:'RED BOSS', desc:'+Wall-breaking charge dash',     dep:'D66+', nag:'Nowhere left to run. Typical.'},
  {type:'boss',tier:'final', col:'#a0f',name:'???',      desc:'?????????????',                   dep:'D99',  nag:'????????? Typical.'},
];

// Large animated enemy sprite for gallery (scale applied externally via translate/scale)
function iEnemyLarge(cx,cy,type,sc,t,tier){
  ctx.save();ctx.translate(Math.round(cx),Math.round(cy));ctx.scale(sc,sc);
  // ── Boss ──────────────────────────────────────────────
  if(type==='boss'){
    const isFinal=tier==='final';
    let _bc,_hc,_belt,_eye;
    if(isFinal)            {_bc='#0d0b18';_hc='#0d0b18';_belt='#0d0b18';_eye='#0d0b18';}
    else if(tier==='red')  {_bc='#c22';_hc='#811';_belt='#f44';_eye='#f66';}
    else if(tier==='yellow'){_bc='#886';_hc='#553';_belt='#aa8';_eye='#ff8';}
    else                   {_bc='#622';_hc='#411';_belt='#833';_eye='#f00';}
    const pulse=Math.abs(Math.sin(t*5));
    // Final boss: glow aura
    if(isFinal){ctx.fillStyle='#1a0030';ctx.globalAlpha=.4+pulse*.2;ctx.fillRect(-18,-18,36,36);ctx.globalAlpha=1;}
    // Shadow
    ctx.fillStyle='#000';ctx.globalAlpha=.45;ctx.fillRect(-10,10,20,4);ctx.globalAlpha=1;
    // Extra appendages (red/final)
    if(tier==='red'||isFinal){ctx.fillStyle=_bc;ctx.fillRect(-15,-2,6,4);ctx.fillRect(9,-2,6,4);}
    // Spikes top/bottom (final only)
    if(isFinal){ctx.fillStyle=_bc;ctx.fillRect(-2,-15,4,6);ctx.fillRect(-2,9,4,6);}
    // Fists
    ctx.fillStyle=_bc;ctx.fillRect(-13,-4,5,5);ctx.fillRect(8,-4,5,5);
    // Body + belt
    ctx.fillStyle=_bc;ctx.fillRect(-6,-6,12,14);
    ctx.fillStyle=_belt;ctx.fillRect(-6,1,12,2);
    // Head
    ctx.fillStyle=_hc;ctx.fillRect(-5,-11,10,6);
    // Eyes
    if(!isFinal){ctx.fillStyle=_eye;ctx.globalAlpha=0.6+pulse*.4;ctx.fillRect(-4,-9,3,2);ctx.fillRect(1,-9,3,2);ctx.globalAlpha=1;}
    // Legs
    const lb=((t*7)|0)%2;
    ctx.fillStyle=isFinal?'#0d0b18':'#400';ctx.fillRect(-5,8,4,4-lb);ctx.fillRect(1,8,4,3+lb);
    // Orbiting gem (non-final only)
    if(!isFinal){const ox=Math.round(Math.cos(t*2.5)*13),oy=Math.round(Math.sin(t*2.5)*13);
      ctx.fillStyle=tier==='yellow'?'#ff8':tier==='red'?'#f44':'#f00';ctx.globalAlpha=.5+pulse*.5;
      ctx.fillRect(ox-1,oy-1,3,3);ctx.globalAlpha=1;}
    ctx.globalAlpha=1;ctx.restore();return;
  }
  // ── Gatekeeper ────────────────────────────────────
  if(type==='gatekeeper'){
    const pulse=(Math.sin(t*5)+1)*.5;
    ctx.fillStyle='#000';ctx.globalAlpha=.3;ctx.fillRect(-7,7,14,3);ctx.globalAlpha=1;
    ctx.fillStyle='#600';ctx.fillRect(-6,-6,12,12);
    ctx.fillStyle='#f44';ctx.globalAlpha=.5+pulse*.5;ctx.fillRect(-4,-4,8,8);ctx.globalAlpha=1;
    ctx.fillStyle='#f88';ctx.fillRect(-1,-6,2,12);ctx.fillRect(-6,-1,12,2);
    ctx.globalAlpha=1;ctx.restore();return;
  }
  let body,head;
  if(type==='grunt')    {body='#494';head='#7a7';}
  else if(type==='runner')  {body='#963';head='#c85';}
  else if(type==='brute')   {body='#722';head='#a44';}
  else if(type==='shooter') {body='#549';head='#86c';}
  else if(type==='poison')  {body='#362';head='#594';}
  else if(type==='splatter'){body='#639';head='#96c';}
  else if(type==='dasher')  {body='#a50';head='#c80';}
  else if(type==='ghost')   {body='#8af';head='#adf';}
  else if(type==='bomber')  {body='#622';head='#944';}
  // shadow
  ctx.fillStyle='#000';ctx.globalAlpha=.3;ctx.fillRect(-5,6,10,2);ctx.globalAlpha=1;
  if(type==='brute'){
    const sw=Math.round(Math.sin(t*2));
    ctx.fillStyle=body;ctx.fillRect(-6,-2+sw,2,3);ctx.fillRect(4,-2-sw,2,3); // arms
    ctx.fillStyle=body;ctx.fillRect(-4,-4,8,7);
    ctx.fillStyle=head;ctx.fillRect(-3,-6,6,3);
    ctx.fillStyle='#f00';ctx.fillRect(-2,-5,1,1);ctx.fillRect(1,-5,1,1);
  } else if(type==='shooter'){
    const ang=Math.sin(t*1.4)*.6;
    ctx.fillStyle=body;ctx.fillRect(-2,-3,4,6);ctx.fillStyle=head;ctx.fillRect(-2,-5,4,3);
    ctx.fillStyle='#ff0';ctx.fillRect(-1,-4,1,1);ctx.fillRect(0,-4,1,1);
    ctx.fillStyle='#aaa';
    for(let i=1;i<=3;i++)ctx.fillRect(Math.round(Math.cos(ang)*i*1.5)-1,Math.round(Math.sin(ang)*i*1.5)-2,1,1);
  } else if(type==='runner'){
    const rl=((t*18)|0)%2;
    ctx.fillStyle=head;ctx.fillRect(-1,-7,2,2);
    ctx.fillStyle=body;ctx.fillRect(-1,-5,2,6);
    ctx.fillStyle='#f80';ctx.fillRect(-1,-6,1,1);
    ctx.fillStyle=body;ctx.fillRect(-2,1,1,2+rl);ctx.fillRect(1,1,1,3-rl);
    ctx.fillStyle=body;ctx.fillRect(-3,-3,1,2);ctx.fillRect(2,-4,1,2);
  } else if(type==='ghost'){
    const bob=Math.round(Math.sin(t*2.8));
    ctx.globalAlpha=0.5+Math.sin(t*4)*.18;
    ctx.fillStyle=body;
    ctx.fillRect(-1,-9+bob,2,3);ctx.fillRect(-2,-7+bob,4,3);ctx.fillRect(-3,-4+bob,6,5);
    ctx.fillRect(-2,1+bob,2,2);ctx.fillRect(0,1+bob,2,2);
    ctx.fillStyle=head;ctx.fillRect(-2,-3+bob,1,1);ctx.fillRect(0,-3+bob,1,1);
    ctx.globalAlpha=1;
  } else if(type==='bomber'){
    const spk=((t*8)|0)%2;
    ctx.fillStyle=spk?'#ff0':'#fa8';ctx.fillRect(0,-10,1,2);
    ctx.fillStyle='#aaa';ctx.fillRect(0,-8,1,3);
    ctx.fillStyle=head;ctx.fillRect(-2,-5,3,2);
    ctx.fillStyle=body;ctx.fillRect(-3,-3,6,7);
    ctx.fillStyle='#844';ctx.fillRect(-3,0,6,1);
    ctx.fillStyle='#f22';
    ctx.fillRect(-2,-2,1,1);ctx.fillRect(1,-2,1,1);ctx.fillRect(-1,-1,1,1);ctx.fillRect(0,-1,1,1);
  } else if(type==='splatter'){
    const dr=((t*4)|0)%3;
    ctx.fillStyle=body;
    ctx.fillRect(-2,-5,4,2);ctx.fillRect(-3,-4,6,4);ctx.fillRect(-4,0,8,4);
    ctx.fillStyle=head;ctx.fillRect(-2,-3,1,1);ctx.fillRect(0,-3,1,1);
    ctx.fillStyle=body;
    ctx.fillRect(-3,4,1,1+dr);ctx.fillRect(-1,4,1,1+((dr+1)%3));ctx.fillRect(1,4,1,1+((dr+2)%3));
  } else if(type==='dasher'){
    const dl=((t*10)|0)%2;
    ctx.fillStyle=head;ctx.fillRect(2,-3,3,2);
    ctx.fillStyle=body;ctx.fillRect(-3,-1,7,3);
    ctx.fillStyle='#ff4';ctx.fillRect(3,-3,1,1);
    ctx.fillStyle=body;ctx.fillRect(-3,2,2,1+dl);ctx.fillRect(0,2,2,2-dl);
  } else if(type==='poison'){
    const bob=Math.round(Math.sin(t*1.8)*.7);
    ctx.fillStyle=head;ctx.fillRect(-2,-7+bob,4,2);ctx.fillRect(-3,-5+bob,6,3);
    ctx.fillStyle='#2a5';ctx.fillRect(-2,-6+bob,1,1);ctx.fillRect(0,-5+bob,1,1);ctx.fillRect(1,-6+bob,1,1);
    ctx.fillStyle='#9c9';ctx.fillRect(-3,-2+bob,6,1);
    ctx.fillStyle=body;ctx.fillRect(-1,-1,2,4);
  } else {
    // GRUNT
    const reach=Math.round(Math.sin(t*3));
    ctx.fillStyle=body;ctx.fillRect(-2,-2,4,5);ctx.fillStyle=head;ctx.fillRect(-2,-4,4,3);
    ctx.fillStyle='#f00';ctx.fillRect(-1,-3,1,1);ctx.fillRect(0,-3,1,1);
    ctx.fillStyle=body;ctx.fillRect(-3,-1+reach,1,2);ctx.fillRect(2,-1-reach,1,2);
  }
  ctx.globalAlpha=1;ctx.restore();
}

// Draw a simplified enemy sprite for intro pages
function iEnemy(sx,sy,type,sc){
  ctx.save();ctx.translate(sx,sy);ctx.scale(sc,sc);
  let body,head;
  if(type==='grunt')    {body='#494';head='#7a7';}
  else if(type==='runner')  {body='#963';head='#c85';}
  else if(type==='brute')   {body='#722';head='#a44';}
  else if(type==='shooter') {body='#549';head='#86c';}
  else if(type==='poison')  {body='#362';head='#594';}
  else if(type==='splatter'){body='#639';head='#96c';}
  else if(type==='dasher')  {body='#a50';head='#c80';}
  else if(type==='ghost')   {body='#8af';head='#adf';}
  else if(type==='bomber')  {body='#622';head='#944';}
  // shadow
  ctx.fillStyle='#000';ctx.globalAlpha=.3;ctx.fillRect(-3,4,6,1);ctx.globalAlpha=1;
  if(type==='brute'){
    ctx.fillStyle=body;ctx.fillRect(-4,-4,8,7);
    ctx.fillStyle=head;ctx.fillRect(-3,-6,6,3);
    ctx.fillStyle='#f00';ctx.fillRect(-2,-5,1,1);ctx.fillRect(1,-5,1,1);
  } else if(type==='shooter'){
    ctx.fillStyle=body;ctx.fillRect(-2,-3,4,6);ctx.fillStyle=head;ctx.fillRect(-2,-5,4,3);
    ctx.fillStyle='#ff0';ctx.fillRect(-1,-4,1,1);ctx.fillRect(0,-4,1,1);
    ctx.fillStyle='#aaa';ctx.fillRect(2,-1,1,1);ctx.fillRect(3,-1,1,1);ctx.fillRect(4,-1,1,1);
  } else if(type==='runner'){
    ctx.fillStyle=head;ctx.fillRect(-1,-7,2,2);
    ctx.fillStyle=body;ctx.fillRect(-1,-5,2,6);ctx.fillRect(-2,1,1,3);ctx.fillRect(1,1,1,2);
    ctx.fillStyle='#f80';ctx.fillRect(-1,-6,1,1);
    ctx.fillStyle=body;ctx.fillRect(-3,-3,1,2);ctx.fillRect(2,-4,1,2);
  } else if(type==='ghost'){
    ctx.globalAlpha=0.65;
    ctx.fillStyle=body;
    ctx.fillRect(-1,-9,2,3);ctx.fillRect(-2,-7,4,3);ctx.fillRect(-3,-4,6,5);
    ctx.fillRect(-2,1,2,2);ctx.fillRect(0,1,2,2);
    ctx.fillStyle=head;ctx.fillRect(-2,-3,1,1);ctx.fillRect(0,-3,1,1);
    ctx.globalAlpha=1;
  } else if(type==='bomber'){
    ctx.fillStyle='#fa8';ctx.fillRect(0,-10,1,2);
    ctx.fillStyle='#aaa';ctx.fillRect(0,-8,1,3);
    ctx.fillStyle=head;ctx.fillRect(-2,-5,3,2);
    ctx.fillStyle=body;ctx.fillRect(-3,-3,6,7);
    ctx.fillStyle='#844';ctx.fillRect(-3,0,6,1);
    ctx.fillStyle='#f22';
    ctx.fillRect(-2,-2,1,1);ctx.fillRect(1,-2,1,1);ctx.fillRect(-1,-1,1,1);ctx.fillRect(0,-1,1,1);
  } else if(type==='splatter'){
    ctx.fillStyle=body;
    ctx.fillRect(-2,-5,4,2);ctx.fillRect(-3,-4,6,4);ctx.fillRect(-4,0,8,4);
    ctx.fillStyle=head;ctx.fillRect(-2,-3,1,1);ctx.fillRect(0,-3,1,1);
    ctx.fillStyle=body;ctx.fillRect(-3,4,1,2);ctx.fillRect(-1,4,1,3);ctx.fillRect(1,4,1,2);
  } else if(type==='dasher'){
    ctx.fillStyle=head;ctx.fillRect(2,-3,3,2);
    ctx.fillStyle=body;ctx.fillRect(-3,-1,7,3);
    ctx.fillStyle='#ff4';ctx.fillRect(3,-3,1,1);
    ctx.fillStyle=body;ctx.fillRect(-3,2,2,2);ctx.fillRect(0,2,2,2);
  } else if(type==='poison'){
    ctx.fillStyle=head;ctx.fillRect(-2,-7,4,2);ctx.fillRect(-3,-5,6,3);
    ctx.fillStyle='#2a5';ctx.fillRect(-2,-6,1,1);ctx.fillRect(0,-5,1,1);ctx.fillRect(1,-6,1,1);
    ctx.fillStyle='#9c9';ctx.fillRect(-3,-2,6,1);
    ctx.fillStyle=body;ctx.fillRect(-1,-1,2,4);
  } else {
    // GRUNT
    ctx.fillStyle=body;ctx.fillRect(-2,-2,4,5);
    ctx.fillStyle=head;ctx.fillRect(-2,-4,4,3);
    ctx.fillStyle='#f00';ctx.fillRect(-1,-3,1,1);ctx.fillRect(0,-3,1,1);
    ctx.fillStyle=body;ctx.fillRect(-3,-1,1,2);ctx.fillRect(2,-1,1,2);
  }
  ctx.globalAlpha=1;ctx.restore();
}

// pixText scaled ×2 (for intro titles)
function pixBig(str,x,y,c){
  ctx.save();ctx.translate(x,y);ctx.scale(2,2);pixText(str,0,0,c);ctx.restore();
}
// pixText scaled ×4 (for lobby title)
function pixHuge(str,x,y,c){
  ctx.save();ctx.translate(x,y);ctx.scale(4,4);pixText(str,0,0,c);ctx.restore();
}

// ── Lobby canvas UI ───────────────────────────
let lobbyT=0,lobbyIdleT=0,padStatus='NO GAMEPAD DETECTED';
let lobbyPadFocus='start',_lobbyPadPrev={};
let _ovlPadFocus='',_ovlPadPrev={};
const lobbyBtns={};

// standard chip button (active=selected state)
function lbBtn(key,label,x,y,w,h,active){
  lobbyBtns[key]={x,y,w,h};
  const hov=(mouse.x>=x&&mouse.x<=x+w&&mouse.y>=y&&mouse.y<=y+h)||lobbyPadFocus===key;
  ctx.fillStyle=hov?'#0ff':active?'#0a2535':'#07101a';ctx.fillRect(x,y,w,h);
  ctx.fillStyle=hov?'#5ff':active?'#0ff':'#1c3c5c';
  ctx.fillRect(x,y,w,1);ctx.fillRect(x,y+h-1,w,1);ctx.fillRect(x,y,1,h);ctx.fillRect(x+w-1,y,1,h);
  pixText(label,x+Math.round((w-label.length*4)/2),y+Math.round((h-6)/2),hov?'#000':active?'#0ff':'#5a8');
}
// primary action button (START / CONTINUE)
function lbBtnPri(key,label,x,y,w,h,col){
  lobbyBtns[key]={x,y,w,h};
  const hov=(mouse.x>=x&&mouse.x<=x+w&&mouse.y>=y&&mouse.y<=y+h)||lobbyPadFocus===key;
  ctx.fillStyle=hov?col:'#040c14';ctx.fillRect(x,y,w,h);
  ctx.fillStyle=col;
  ctx.fillRect(x,y,w,1);ctx.fillRect(x,y+h-1,w,1);ctx.fillRect(x,y,1,h);ctx.fillRect(x+w-1,y,1,h);
  pixText(label,x+Math.round((w-label.length*4)/2),y+Math.round((h-6)/2),hov?'#000':col);
}
function _lobbyPadNav(){
  const gps=navigator.getGamepads?navigator.getGamepads():[];
  let gp=null;for(let i=0;i<gps.length;i++)if(gps[i]){gp=gps[i];break;}
  if(!gp){padStatus='NO GAMEPAD DETECTED';return;}
  padStatus=gp.id.slice(0,36);
  const edge=(k,v)=>{const r=v&&!_lobbyPadPrev[k];_lobbyPadPrev[k]=v;return r;};
  const ax=gp.axes[0]||0,ay=gp.axes[1]||0;
  const dL=edge('dL',(gp.buttons[14]?.pressed)||ax<-0.5);
  const dR=edge('dR',(gp.buttons[15]?.pressed)||ax>0.5);
  const dU=edge('dU',(gp.buttons[12]?.pressed)||ay<-0.5);
  const dD=edge('dD',(gp.buttons[13]?.pressed)||ay>0.5);
  const ok=edge('A',gp.buttons[0]?.pressed);
  if(!(dL||dR||dU||dD||ok))return;
  lobbyIdleT=0;
  const hasCont=!!hasSave();
  const grid=[
    ['cpu0','cpu1','cpu2','cpu3'],
    ['kbm','pad'],
    ['start'],
    ...(hasCont?[['cont']]:[]),
    ['how'],
    ...(cfg.slots[0]==='GAMEPAD'?[['padcfg']]:[]),
  ];
  let ri=2,ci=0;
  for(let r=0;r<grid.length;r++){const c=grid[r].indexOf(lobbyPadFocus);if(c>=0){ri=r;ci=c;break;}}
  if(dR)ci=Math.min(ci+1,grid[ri].length-1);
  if(dL)ci=Math.max(ci-1,0);
  if(dD){ri=Math.min(ri+1,grid.length-1);ci=Math.min(ci,grid[ri].length-1);}
  if(dU){ri=Math.max(ri-1,0);ci=Math.min(ci,grid[ri].length-1);}
  lobbyPadFocus=grid[ri][ci];
  // Toggle-style buttons update immediately on focus
  if(lobbyPadFocus.startsWith('cpu'))cfg.cpus=+lobbyPadFocus[3];
  else if(lobbyPadFocus==='kbm')cfg.slots[0]='KB+M';
  else if(lobbyPadFocus==='pad')cfg.slots[0]='GAMEPAD';
  if(ok){
    const k=lobbyPadFocus;
    if(k==='start')startGame();
    else if(k==='cont')loadGame();
    else if(k==='how')startIntro();
    else if(k==='padcfg'){padConfigActive=true;padCfgFocus=0;padCfgWaiting=false;_padCfgPrev={};}
  }
}

function drawPadConfig(){
  ctx.fillStyle='#040010';ctx.fillRect(0,0,W,H);
  for(let sy=0;sy<H;sy+=4){ctx.fillStyle='rgba(0,0,0,0.2)';ctx.fillRect(0,sy,W,2);}
  pixBig('PAD CONFIG',Math.floor((W-72)/2),12,'#0ff');
  ctx.fillStyle='#234';ctx.fillRect(20,26,W-40,1);
  const ACT_LABELS=['FIRE','CHARGE','DASH','PARRY'];
  ACT_LABELS.forEach((act,i)=>{
    const y=34+i*20;
    const sel=padCfgFocus===i;
    if(sel){ctx.fillStyle='#081828';ctx.fillRect(16,y-2,W-32,14);}
    pixText(act,22,y+2,sel?'#0ff':'#7ab');
    const btnIdx=padConfig[PAD_ACT_KEYS[i]];
    const btnName=(padCfgWaiting&&sel)?'...  ':(PAD_BTN_NAMES[btnIdx]||'?');
    const bw=btnName.length*4+8;const bx=W-22-bw;
    ctx.fillStyle=sel?(padCfgWaiting?'#f80':'#0af'):'#1a2a3a';ctx.fillRect(bx,y,bw,9);
    ctx.strokeStyle=sel?(padCfgWaiting?'#fa0':'#0ff'):'#345';ctx.lineWidth=1;ctx.strokeRect(bx+.5,y+.5,bw-1,8);
    pixText(btnName,bx+4,y+2,sel?'#000':'#567');
  });
  ctx.fillStyle='#234';ctx.fillRect(20,118,W-40,1);
  if(padCfgWaiting){
    const pw='PRESS ANY BUTTON';
    ctx.globalAlpha=0.7+Math.sin(performance.now()/300)*0.3;
    pixText(pw,Math.floor((W-pw.length*4)/2),126,'#f80');
    ctx.globalAlpha=1;
    pixText('B : CANCEL',Math.floor((W-40)/2),140,'#456');
  }else{
    pixText('A:SET   B:BACK',Math.floor((W-56)/2),126,'#456');
  }
  // No gamepad warning
  const gps=navigator.getGamepads?navigator.getGamepads():[];
  const hasGp=Array.from(gps).some(g=>g);
  if(!hasGp){
    ctx.fillStyle='#200';ctx.fillRect(0,H-18,W,18);
    pixText('NO GAMEPAD — ESC TO EXIT',Math.floor((W-96)/2),H-11,'#f44');
  }
}
function padCfgNav(){
  const gps=navigator.getGamepads?navigator.getGamepads():[];
  let gp=null;for(let i=0;i<gps.length;i++)if(gps[i]){gp=gps[i];break;}
  if(!gp)return;
  const edge=(k,v)=>{const r=v&&!_padCfgPrev[k];_padCfgPrev[k]=v;return r;};
  // Snapshot all currently-pressed buttons so no release/re-edge fires after assign or cancel
  const snapPrev=()=>{
    _padCfgPrev={};
    for(let j=0;j<gp.buttons.length;j++)_padCfgPrev['b'+j]=!!(gp.buttons[j]?.pressed||(gp.buttons[j]?.value>.5));
    _padCfgPrev.cancel=!!(gp.buttons[1]?.pressed);
    _padCfgPrev.a=!!(gp.buttons[0]?.pressed);
    _padCfgPrev.b=!!(gp.buttons[1]?.pressed);
    _padCfgPrev.u=false;_padCfgPrev.d=false;
  };
  if(padCfgWaiting){
    const ignore=new Set([8,9,12,13,14,15]);
    for(let i=0;i<gp.buttons.length;i++){
      if(ignore.has(i))continue;
      if(edge('b'+i,!!(gp.buttons[i]?.pressed||(gp.buttons[i]?.value>.5)))){
        padConfig[PAD_ACT_KEYS[padCfgFocus]]=i;
        savePadConfig();
        padCfgWaiting=false;snapPrev();break;
      }
    }
    if(edge('cancel',gp.buttons[1]?.pressed)){padCfgWaiting=false;snapPrev();}
    return;
  }
  const up=edge('u',(gp.buttons[12]?.pressed)||(gp.axes[1]||0)<-0.5);
  const dn=edge('d',(gp.buttons[13]?.pressed)||(gp.axes[1]||0)>0.5);
  const ok=edge('a',gp.buttons[0]?.pressed);
  const back=edge('b',gp.buttons[1]?.pressed);
  if(up)padCfgFocus=Math.max(0,padCfgFocus-1);
  if(dn)padCfgFocus=Math.min(PAD_ACT_KEYS.length-1,padCfgFocus+1);
  if(ok){padCfgWaiting=true;snapPrev();}
  if(back){padConfigActive=false;_padCfgPrev={};}
}

function drawLobbyCanvas(dt){
  if(padConfigActive){Object.keys(lobbyBtns).forEach(k=>delete lobbyBtns[k]);drawPadConfig();padCfgNav();return;}
  lobbyT+=dt;
  lobbyIdleT+=dt;
  if(lobbyIdleT>10)startAttractDemo();
  _lobbyPadNav();
  cv.classList.add('cur');
  Object.keys(lobbyBtns).forEach(k=>delete lobbyBtns[k]);

  // — background —
  ctx.fillStyle='#040010';ctx.fillRect(0,0,W,H);
  for(let sy=0;sy<H;sy+=4){ctx.fillStyle='rgba(0,0,0,0.20)';ctx.fillRect(0,sy,W,2);}
  const gr=ctx.createRadialGradient(W/2,50,0,W/2,50,90);
  gr.addColorStop(0,'rgba(0,180,255,0.12)');gr.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=gr;ctx.fillRect(0,0,W,H);

  // — title (flicker) —
  const f=0.86+Math.sin(lobbyT*13.1)*0.08+Math.sin(lobbyT*7.3)*0.05;
  const fch=Math.round(255*Math.min(1,f)).toString(16).padStart(2,'0');
  pixHuge('DEPTH 100',Math.round((W-9*16)/2),30,`#00${fch}${fch}`);
  const sub='THE SCREW AWAITS AT THE BOTTOM';
  pixText(sub,Math.round((W-sub.length*4)/2),64,'#4a7');
  // best depth badge
  const bestD=+(localStorage.getItem('lores_best')||0);
  if(bestD>0){
    const bs='BEST: '+bestD;
    pixText(bs,Math.round((W-bs.length*4)/2),70,'#08f');
  }
  const la=(0.22+Math.sin(lobbyT*2.1)*0.08).toFixed(2);
  ctx.fillStyle=`rgba(0,200,255,${la})`;ctx.fillRect(W/2-58,77,116,1);

  // — CPU ALLIES row (centered: label40 + gap8 + 4×chip14 + 3×gap2 = 110) —
  const rh=11,cw=14;
  const cpuX=Math.round((W-110)/2);
  pixText('CPU ALLIES',cpuX,85,'#7ab');
  for(let i=0;i<4;i++)lbBtn('cpu'+i,String(i),cpuX+48+i*16,82,cw,rh,cfg.cpus===i);

  // — CONTROL row (centered: label28 + gap8 + 24 + gap2 + 32 = 94) —
  const ctX=Math.round((W-94)/2);
  pixText('CONTROL',ctX,98,'#7ab');
  lbBtn('kbm','KB+M',ctX+36,95,24,rh,cfg.slots[0]==='KB+M');
  lbBtn('pad','GAMEPAD',ctX+62,95,32,rh,cfg.slots[0]==='GAMEPAD');

  // — pad status —
  const ps=padStatus.slice(0,36);
  pixText(ps,Math.round((W-ps.length*4)/2),110,'#2a4a3a');

  // — primary buttons —
  const bw=70,bx=Math.round((W-bw)/2);
  let nY=119;
  lbBtnPri('start','START',bx,nY,bw,13,'#0ff'); nY+=15;

  const sv=hasSave();
  if(sv){
    lbBtnPri('cont','CONTINUE',bx,nY,bw,13,'#0c9'); nY+=15;
    const sl=getSaveLabel().replace('\u21a9 ','');
    pixText(sl,Math.round((W-sl.length*4)/2),nY+1,'#3a7'); nY+=9;
  }

  // — HOW TO PLAY / PAD CONFIG —
  const botY=Math.min(nY+4,157);
  lbBtn('how','HOW TO PLAY',Math.round(W/2)-26,botY,52,rh,false);
  if(cfg.slots[0]==='GAMEPAD'){
    lbBtn('padcfg','PAD CONFIG',Math.round(W/2)-26,botY+12,52,rh,false);
  }
}

function lobbyHandleClick(){
  lobbyIdleT=0;
  for(const[k,b]of Object.entries(lobbyBtns)){
    if(mouse.x>=b.x&&mouse.x<b.x+b.w&&mouse.y>=b.y&&mouse.y<b.y+b.h){
      if(k.startsWith('cpu')){cfg.cpus=+k[3];return;}
      if(k==='kbm'){cfg.slots[0]='KB+M';return;}
      if(k==='pad'){cfg.slots[0]='GAMEPAD';return;}
      if(k==='start'){startGame();return;}
      if(k==='cont'){loadGame();return;}
      if(k==='how'){startIntro();return;}
      if(k==='padcfg'){padConfigActive=true;padCfgFocus=0;padCfgWaiting=false;_padCfgPrev={};return;}
    }
  }
}

function drawIntro(){
  ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);

  // header bar
  ctx.fillStyle='#0a0a18';ctx.fillRect(0,0,W,13);
  pixText('HOW TO PLAY',4,4,'#0ff');
  pixText((introPage+1)+' / '+INTRO_PAGES,W-24,4,'#456');
  // ESC hint
  pixText('ESC=BACK',W-34,H-7,'#334');

  // page dot indicators
  for(let i=0;i<INTRO_PAGES;i++){
    ctx.fillStyle=i===introPage?'#0ff':'#234';
    ctx.fillRect(W/2-INTRO_PAGES*5+i*10,H-6,8,3);
  }

  // ── Page 0: MISSION ──────────────────────────
  if(introPage===0){
    pixBig('MISSION',(W-56)/2,18,'#ff0');
    iChar(W/2,68,P_PAL[0],5,false,0);
    pixBig('P1 : YOU',(W-64)/2,84,'#3cf');
    const L0=[
      'DESCEND TO DEPTH 100',
      'COLLECT ALL CORES ON EACH FLOOR',
      'OPEN THE EXIT AND ADVANCE',
      '',
      'AT DEPTH 100  RETRIEVE THE SCREW',
    ];
    L0.forEach((l,i)=>{
      if(!l)return;
      const x=Math.round((W-l.length*4)/2);
      pixText(l,x,108+i*9,i===4?'#ff0':'#9ab');
    });
    pixText('CLICK OR SPACE : NEXT',(W-84)/2,H-18,'#445');

  // ── Page 1: CREW ─────────────────────────────
  }else if(introPage===1){
    pixBig('YOUR CREW',(W-72)/2,18,'#ff0');
    iChar(52, 58,P_PAL[1],4,false,-0.4);
    iChar(W/2,58,P_PAL[2],4,false,0);
    iChar(W-52,58,P_PAL[3],4,false,0.4);
    pixText('P2',44, 74,'#f66');
    pixText('P3',W/2-6,74,'#6c6');
    pixText('P4',W-60,74,'#fc4');
    const L1=[
      'UP TO 3 CPU ALLIES JOIN YOU',
      'EACH ADDS MINIMAP INTEL:',
      '',
      'PROSPECTOR  ITEM RADAR',
      'SNIPER      MAP REVEAL',
      'BODY GUARD  EXIT RADAR',
      'BERSERKER   ENEMY RADAR',
      'MOODY       SHIFTS EACH FLOOR',
    ];
    L1.forEach((l,i)=>{
      if(!l)return;
      const x=Math.round((W-l.length*4)/2);
      const c=i<2?'#ccc':i===7?'#fa8':'#8a9';
      pixText(l,x,82+i*9,c);
    });
    pixText('CLICK OR SPACE : NEXT',(W-84)/2,H-18,'#445');

  // ── Page 2: ZOMBIE MECHANIC ───────────────────
  }else if(introPage===2){
    pixBig('ZOMBIE THREAT',(W-104)/2,18,'#f44');
    // alive
    iChar(54, 58,P_PAL[1],4,false,0);
    pixText('ALIVE',34,75,'#6c6');
    // arrow →
    ctx.fillStyle='#f44';
    for(let i=0;i<10;i++)ctx.fillRect(88+i,57,1,1);
    ctx.fillRect(96,55,3,1);ctx.fillRect(96,59,3,1);ctx.fillRect(98,53,1,1);ctx.fillRect(98,61,1,1);
    // dead
    iChar(W/2, 58,P_PAL[1],4,true,0);
    pixText('DEAD',W/2-8,75,'#666');
    // arrow →
    ctx.fillStyle='#f44';
    for(let i=0;i<10;i++)ctx.fillRect(176+i,57,1,1);
    ctx.fillRect(184,55,3,1);ctx.fillRect(184,59,3,1);ctx.fillRect(186,53,1,1);ctx.fillRect(186,61,1,1);
    // zombie (P2 body + grey head + red eyes)
    ctx.save();ctx.translate(W-54,58);ctx.scale(4,4);
    ctx.fillStyle=P_PAL[1].body;ctx.fillRect(-2,-3,4,6);
    ctx.fillStyle='#9a8';ctx.fillRect(-2,-5,4,3);
    ctx.fillStyle='#f00';ctx.fillRect(-1,-4,1,1);ctx.fillRect(0,-4,1,1);
    ctx.fillStyle=P_PAL[1].dark;ctx.fillRect(-2,3,1,2);ctx.fillRect(1,3,1,2);
    ctx.restore();
    pixText('ZOMBIE',W-74,75,'#f44');

    const L2=[
      'FALLEN ALLIES RISE AS ZOMBIES',
      'EACH ZOMBIE KEEPS THEIR ROLE:',
      '',
      'CORE-EATER   DESTROYS YOUR CORES',
      'WALL-HACK    SHOOTS THROUGH WALLS',
      'GATEKEEPER   BLOCKS THE EXIT',
      'BLOODHOUND   HUNTS YOU DOWN',
      'CHAOS        TOTALLY UNPREDICTABLE',
    ];
    L2.forEach((l,i)=>{
      if(!l)return;
      const x=Math.round((W-l.length*4)/2);
      const c=i<2?'#9ab':i>=3?'#f88':'#9ab';
      pixText(l,x,84+i*9,c);
    });
    pixText('CLICK OR SPACE : NEXT',(W-84)/2,H-18,'#445');

  // ── Page 3: CONTROLS + BACK ───────────────────
  }else if(introPage===3){
    pixBig('CONTROLS',(W-64)/2,18,'#ff0');
    const KB=[
      ['MOVE','WASD'],
      ['AIM', 'MOUSE'],
      ['FIRE','CLICK / HOLD'],
      ['CHARGE','R-CLICK / E'],
      ['DASH','SPACE / F'],
      ['PARRY','Q'],
      ['WALK','SHIFT+MOUSE'],
      ['PAUSE','ESC'],
    ];
    const bn=i=>PAD_BTN_NAMES[i]??'BTN'+i;
    const PAD=[
      ['','L-STICK'],
      ['','R-STICK'],
      ['',bn(padConfig.fire)],
      ['',bn(padConfig.charge)+' (HOLD)'],
      ['',bn(padConfig.dash)],
      ['',bn(padConfig.parry)],
      ['','---'],
      ['','START'],
    ];
    pixText('KB+M',10,32,'#fc4');pixText('GAMEPAD',W/2+4,32,'#fc4');
    ctx.fillStyle='#234';ctx.fillRect(8,38,W-16,1);
    KB.forEach(([k,v],i)=>{
      const y=43+i*10;
      pixText(k,10,y,'#89a');
      pixText(v,50,y,'#cde');
      pixText(PAD[i][1],W/2+4,y,'#cde');
    });
    ctx.fillStyle='#234';ctx.fillRect(8,120,W-16,1);
    pixText('CHARGE: HOLD→RELEASE=BIG SHOT',10,124,'#fa8');
    pixText('MAX 1.5 SEC  SLOW WHILE CHARGING',10,133,'#fa8');
    pixText('CLICK OR SPACE : NEXT',(W-84)/2,H-18,'#445');

  // ── Page 4: POWER-UPS ────────────────────────
  }else if(introPage===4){
    pixBig('POWER-UPS',Math.round((W-72)/2),7,'#ffd700');
    pixText('FIND THE CRACKED WALL — SHOOT IT 25 TIMES',Math.round((W-172)/2),20,'#567');
    ctx.fillStyle='#234';ctx.fillRect(8,28,W-16,1);
    // weapon rows: [col, name, description, note]
    const WPS=[
      ['#ffd700','DRIVER',    '3-WAY SHOT (L/F/R)',       'BOSS→GONE'],
      ['#f80',   'OVERDRIVE', 'FAST DASH RECHARGE',        'PERMANENT'],
      ['#f0f',   'VERTIDRIVE','BACK SHOT ADDED',           'PERMANENT'],
      ['#0ff',   'LASER',     'SHOTS PIERCE 3 ENEMIES',   'BOSS→GONE'],
      ['#4ff',   'BARRIER',   'SHIELD ORB (3 HP, MAX 4)', 'PERMANENT'],
    ];
    WPS.forEach(([col,name,desc,note],i)=>{
      const y=33+i*17;
      // color square
      ctx.fillStyle=col;ctx.fillRect(10,y,5,6);
      // name
      pixText(name,20,y,col);
      // description
      pixText(desc,20,y+8,'#789');
      // note (right-aligned)
      const nc=note.includes('GONE')?'#888':'#4a8';
      pixText(note,W-4-note.length*4,y,nc);
    });
    ctx.fillStyle='#234';ctx.fillRect(8,123,W-16,1);
    pixText('WEAPONS STACK — CLEAR THE WALL EACH FLOOR',Math.round((W-172)/2),127,'#456');
    pixText('CLICK OR SPACE : NEXT',(W-84)/2,H-18,'#445');

  // ── Page 5: ENEMY GALLERY ────────────────────
  }else if(introPage===5){
    const ei=INTRO_ENEMIES[introEnemyIdx];
    // Subtle background color wash
    ctx.fillStyle=ei.col;ctx.globalAlpha=.07;ctx.fillRect(0,14,W,H-14);ctx.globalAlpha=1;
    // Enemy name (big, centered)
    const nw=ei.name.length*8;
    pixBig(ei.name,Math.round((W-nw)/2),18,ei.col);
    // Depth badge (top right of name area)
    pixText(ei.dep,W-ei.dep.length*4-6,22,'#445');
    // Large animated sprite (center) — bosses rendered smaller to avoid overflow
    const isBoss=ei.type==='boss';
    const sc=isBoss?4:6,spriteCy=isBoss?76:82;
    iEnemyLarge(W/2,spriteCy,ei.type,sc,introT,ei.tier);
    // Description (centered below sprite)
    const dw=ei.desc.length*4;
    pixText(ei.desc,Math.round((W-dw)/2),122,'#8ab');
    // Nag line ("Typical." flavor text)
    pixText(ei.nag,Math.round((W-ei.nag.length*4)/2),131,'#567');
    // Left / Right navigation arrows
    const isFirst=introEnemyIdx===0,isLast=introEnemyIdx===INTRO_ENEMIES.length-1;
    ctx.globalAlpha=isFirst?.18:.7;
    pixText('◄',6,79,'#0cf'); // ◄
    ctx.globalAlpha=isLast?.18:.7;
    pixText('►',W-10,79,'#0cf'); // ►
    ctx.globalAlpha=1;
    // Enemy index dots
    const dotN=INTRO_ENEMIES.length,dotW=dotN*8-3;
    for(let i=0;i<dotN;i++){
      ctx.fillStyle=i===introEnemyIdx?ei.col:'#234';
      ctx.fillRect(Math.round((W-dotW)/2)+i*8,H-18,5,3);
    }
    // BACK TO TITLE button (last enemy) or hint
    if(isLast){
      const bx=W/2-30,by=H-28,bw=60,bh=12;
      const hov=mouse.x>=bx&&mouse.x<=bx+bw&&mouse.y>=by&&mouse.y<=by+bh;
      ctx.fillStyle=hov?'#0ff':'#081820';ctx.fillRect(bx,by,bw,bh);
      pixText('BACK TO TITLE',bx+4,by+3,hov?'#000':'#0ff');
    }else{
      pixText('SPACE : NEXT',(W-48)/2,H-28,'#345');
    }
  }
}

// ── Bullet Time overlay (canvas-rendered) ─────────
function drawBulletTime(){
  if(!bulletTime)return;
  // Dramatic vignette
  const g=ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,W*.75);
  g.addColorStop(0,'rgba(0,0,0,0)');
  g.addColorStop(1,'rgba(0,0,0,0.72)');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  for(let sy=0;sy<H;sy+=4){ctx.fillStyle='rgba(0,0,0,0.1)';ctx.fillRect(0,sy,W,2);}
  // Victim name + DIED!
  const col=bulletTime.victimPal.body;
  const name=bulletTime.victimName+' DIED!';
  pixBig(name,Math.floor((W-name.length*8)/2),52,col);
  // Countdown (pixHuge = 4x)
  const c=bulletTime.timer>.3?String(Math.max(0,Math.ceil(bulletTime.timer-.3))):'GO!';
  const pulse=0.8+Math.sin(performance.now()/150)*0.2;
  ctx.save();ctx.globalAlpha=pulse;
  pixHuge(c,Math.floor((W-c.length*16)/2),72,'#fff');
  ctx.restore();
  // Subtitle
  const sub='BRACE FOR ZOMBIE';
  pixText(sub,Math.floor((W-sub.length*4)/2),108,'#f44');
}

// ── Game Over overlay (canvas-rendered) ──────────
const goBtns={};
function goBtnPri(key,label,x,y,w,h,col){
  const hov=(mouse.x>=x&&mouse.x<=x+w&&mouse.y>=y&&mouse.y<=y+h)||_ovlPadFocus===key;
  ctx.fillStyle=hov?col:col+'33';ctx.fillRect(x,y,w,h);
  ctx.strokeStyle=col;ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,w-1,h-1);
  pixText(label,x+Math.floor(w/2)-Math.floor(label.length*2),y+4,hov?'#000':col);
  goBtns[key]={x,y,w,h};
}
function drawGameOver(){
  ctx.fillStyle='rgba(0,0,0,0.82)';ctx.fillRect(0,0,W,H);
  for(let sy=0;sy<H;sy+=4){ctx.fillStyle='rgba(0,0,24,0.18)';ctx.fillRect(0,sy,W,2);}
  const pulse=0.85+Math.sin(performance.now()/400)*0.15;
  ctx.save();ctx.globalAlpha=pulse;
  pixBig('YOU DIED',Math.floor((W-64)/2),20,'#f44');
  ctx.restore();
  // stats
  const depthStr='DEPTH  '+stage;
  const killStr='KILLS  '+totalKills;
  pixText(depthStr,Math.floor((W-depthStr.length*4)/2),40,'#ff8');
  pixText(killStr, Math.floor((W-killStr.length*4)/2),51,'#fa8');
  // best depth
  const best=+(localStorage.getItem('lores_best')||0);
  if(best>0){
    const bestStr='BEST   '+best;
    const isNew=stage>=best;
    const bc=isNew?'#0ff':'#456';
    pixText(bestStr,Math.floor((W-bestStr.length*4)/2),62,bc);
    if(isNew){
      const nb='NEW RECORD!';
      const pa=0.7+Math.sin(performance.now()/200)*0.3;
      ctx.save();ctx.globalAlpha=pa;
      pixText(nb,Math.floor((W-nb.length*4)/2),72,'#0ff');
      ctx.restore();
    }
  }
  ctx.fillStyle='#f44';ctx.fillRect(40,best>0?82:66,W-80,1);
  const bw=60,bx=Math.floor(W/2-bw/2);
  const btnY=best>0?88:72;
  Object.keys(goBtns).forEach(k=>delete goBtns[k]);
  goBtnPri('retry','RETRY',bx,btnY,bw,13,'#f88');
  pixText('ESC : LOBBY',Math.floor((W-44)/2),btnY+22,'#445');
}
function goHandleClick(){
  for(const[k,b] of Object.entries(goBtns)){
    if(mouse.x>=b.x&&mouse.x<b.x+b.w&&mouse.y>=b.y&&mouse.y<b.y+b.h){
      if(k==='retry'){gameOverState=false;lobbyEl.style.display='flex';renderLobby();PSG.title();}
    }
  }
}

// ── Win overlay (canvas-rendered) ──────────
const winBtns2={};
function winBtnPri(key,label,x,y,w,h,col){
  const hov=(mouse.x>=x&&mouse.x<=x+w&&mouse.y>=y&&mouse.y<=y+h)||_ovlPadFocus===key;
  ctx.fillStyle=hov?col:col+'33';ctx.fillRect(x,y,w,h);
  ctx.strokeStyle=col;ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,w-1,h-1);
  pixText(label,x+Math.floor(w/2)-Math.floor(label.length*2),y+4,hov?'#000':col);
  winBtns2[key]={x,y,w,h};
}
function drawWin(){
  if(endingT<5){drawEndingIntro(endingT);return;}
  ctx.fillStyle='rgba(0,0,0,0.82)';ctx.fillRect(0,0,W,H);
  for(let sy=0;sy<H;sy+=4){ctx.fillStyle='rgba(0,0,24,0.18)';ctx.fillRect(0,sy,W,2);}
  const pulse=0.85+Math.sin(performance.now()/400)*0.15;
  ctx.save();ctx.globalAlpha=pulse;
  pixBig('CLEARED!!',Math.floor((W-72)/2),28,'#ff0');
  ctx.restore();
  pixText('THE SCREW IS YOURS',Math.floor((W-72)/2),48,'#fc8');
  if(winMsg)pixText(winMsg,Math.max(4,Math.floor((W-winMsg.length*4)/2)),60,'#fa8');
  ctx.fillStyle='#ff0';ctx.fillRect(40,72,W-80,1);
  const bw=72,bx=Math.floor(W/2-bw/2);
  Object.keys(winBtns2).forEach(k=>delete winBtns2[k]);
  winBtnPri('again','PLAY AGAIN',bx,80,bw,13,'#ff8');
  pixText('ESC : LOBBY',Math.floor((W-44)/2),102,'#445');
}
function winHandleClick(){
  for(const[k,b] of Object.entries(winBtns2)){
    if(mouse.x>=b.x&&mouse.x<b.x+b.w&&mouse.y>=b.y&&mouse.y<b.y+b.h){
      if(k==='again'){gameWon=false;lobbyEl.style.display='flex';renderLobby();PSG.title();}
    }
  }
}

// ── Attract demo overlay ──────────────────────
function drawAttractOverlay(){
  // Top bar: depth label
  ctx.fillStyle='rgba(0,0,0,0.80)';ctx.fillRect(0,0,W,13);
  const dLabel='\u2605 DEMO \u2605  DEPTH '+stage;
  pixText(dLabel,Math.round((W-dLabel.length*4)/2),4,'#ff0');
  // Bottom bar: pulsing exit hint
  ctx.fillStyle='rgba(0,0,0,0.78)';ctx.fillRect(0,H-13,W,13);
  ctx.globalAlpha=0.5+Math.sin(attractDemoT*4)*0.5;
  pixText('PRESS ANY KEY TO EXIT DEMO',Math.round((W-104)/2),H-9,'#0ff');
  ctx.globalAlpha=1;
}

function _ovlPadNav(){
  const gps=navigator.getGamepads?navigator.getGamepads():[];
  let gp=null;for(let i=0;i<gps.length;i++)if(gps[i]){gp=gps[i];break;}
  if(!gp)return;
  const edge=(k,v)=>{const r=v&&!_ovlPadPrev[k];_ovlPadPrev[k]=!!v;return r;};
  const ay=gp.axes[1]||0;
  const dU=edge('U',(gp.buttons[12]?.pressed)||ay<-.5);
  const dD=edge('D',(gp.buttons[13]?.pressed)||ay>.5);
  const ok=edge('A',gp.buttons[0]?.pressed);
  const back=edge('B',gp.buttons[1]?.pressed);
  if(paused){
    const order=['resume','squit','quit'];
    if(!order.includes(_ovlPadFocus))_ovlPadFocus='resume';
    let i=order.indexOf(_ovlPadFocus);
    if(dU)i=Math.max(0,i-1);
    if(dD)i=Math.min(order.length-1,i+1);
    _ovlPadFocus=order[i];
    if(back){setPause(false);_ovlPadFocus='';_ovlPadPrev={};}
    else if(ok){
      if(_ovlPadFocus==='resume'){setPause(false);}
      else if(_ovlPadFocus==='squit'){saveGame();setPause(false);running=false;PSG.stop();lobbyEl.style.display='flex';renderLobby();PSG.title();}
      else if(_ovlPadFocus==='quit'){setPause(false);running=false;PSG.stop();lobbyEl.style.display='flex';renderLobby();PSG.title();}
      _ovlPadFocus='';_ovlPadPrev={};
    }
  }else if(gameOverState){
    _ovlPadFocus='retry';
    if(ok||back){gameOverState=false;lobbyEl.style.display='flex';renderLobby();PSG.title();_ovlPadFocus='';_ovlPadPrev={};}
  }else if(gameWon){
    _ovlPadFocus='again';
    if(ok||back){gameWon=false;lobbyEl.style.display='flex';renderLobby();PSG.title();_ovlPadFocus='';_ovlPadPrev={};}
  }
}

