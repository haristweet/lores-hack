// ── Pause overlay (canvas-rendered) ──────────
const pauseBtns={};
function pBtnPri(key,label,x,y,w,h,col){
  pauseBtns[key]={x,y,w,h};
  const hov=mouse.x>=x&&mouse.x<=x+w&&mouse.y>=y&&mouse.y<=y+h;
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
      if(k==='squit'){saveGame();setPause(false);running=false;PSG.stop();lobbyEl.style.display='flex';renderLobby();return;}
      if(k==='quit'){setPause(false);running=false;PSG.stop();lobbyEl.style.display='flex';renderLobby();return;}
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

// pixText scaled ×2 (for intro titles)
function pixBig(str,x,y,c){
  ctx.save();ctx.translate(x,y);ctx.scale(2,2);pixText(str,0,0,c);ctx.restore();
}
// pixText scaled ×4 (for lobby title)
function pixHuge(str,x,y,c){
  ctx.save();ctx.translate(x,y);ctx.scale(4,4);pixText(str,0,0,c);ctx.restore();
}

// ── Lobby canvas UI ───────────────────────────
let lobbyT=0,lobbyBgmOpen=false,padStatus='NO GAMEPAD DETECTED';
const lobbyBtns={};

// standard chip button (active=selected state)
function lbBtn(key,label,x,y,w,h,active){
  lobbyBtns[key]={x,y,w,h};
  const hov=mouse.x>=x&&mouse.x<=x+w&&mouse.y>=y&&mouse.y<=y+h;
  ctx.fillStyle=hov?'#0ff':active?'#0a2535':'#07101a';ctx.fillRect(x,y,w,h);
  ctx.fillStyle=hov?'#5ff':active?'#0ff':'#1c3c5c';
  ctx.fillRect(x,y,w,1);ctx.fillRect(x,y+h-1,w,1);ctx.fillRect(x,y,1,h);ctx.fillRect(x+w-1,y,1,h);
  pixText(label,x+Math.round((w-label.length*4)/2),y+Math.round((h-6)/2),hov?'#000':active?'#0ff':'#5a8');
}
// primary action button (START / CONTINUE)
function lbBtnPri(key,label,x,y,w,h,col){
  lobbyBtns[key]={x,y,w,h};
  const hov=mouse.x>=x&&mouse.x<=x+w&&mouse.y>=y&&mouse.y<=y+h;
  ctx.fillStyle=hov?col:'#040c14';ctx.fillRect(x,y,w,h);
  ctx.fillStyle=col;
  ctx.fillRect(x,y,w,1);ctx.fillRect(x,y+h-1,w,1);ctx.fillRect(x,y,1,h);ctx.fillRect(x+w-1,y,1,h);
  pixText(label,x+Math.round((w-label.length*4)/2),y+Math.round((h-6)/2),hov?'#000':col);
}

function drawLobbyCanvas(dt){
  lobbyT+=dt;
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
  const la=(0.22+Math.sin(lobbyT*2.1)*0.08).toFixed(2);
  ctx.fillStyle=`rgba(0,200,255,${la})`;ctx.fillRect(W/2-58,75,116,1);

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

  // — HOW TO PLAY + BGM toggle —
  const botY=Math.min(nY+4,155);
  lbBtn('how','HOW TO PLAY',Math.round(W/2)-55,botY,52,rh,false);
  lbBtn('bgm','BGM '+(lobbyBgmOpen?'[^]':'[v]'),Math.round(W/2)+5,botY,38,rh,lobbyBgmOpen);

  // — BGM zone chips (5×36 + 4×3 = 192, x=64) —
  if(lobbyBgmOpen){
    const bgY=botY+13;
    ['D01-20','D21-40','D41-60','D61-80','D81-100'].forEach((l,i)=>{
      lbBtn('bgm'+i,l,64+i*39,bgY,36,rh,false);
    });
  }
}

function lobbyHandleClick(){
  for(const[k,b]of Object.entries(lobbyBtns)){
    if(mouse.x>=b.x&&mouse.x<b.x+b.w&&mouse.y>=b.y&&mouse.y<b.y+b.h){
      if(k.startsWith('cpu')){cfg.cpus=+k[3];return;}
      if(k==='kbm'){cfg.slots[0]='KB+M';return;}
      if(k==='pad'){cfg.slots[0]='GAMEPAD';return;}
      if(k==='start'){startGame();return;}
      if(k==='cont'){loadGame();return;}
      if(k==='how'){startIntro();return;}
      if(k==='bgm'){lobbyBgmOpen=!lobbyBgmOpen;return;}
      if(k.startsWith('bgm')){downloadBGM([1,21,41,61,81][+k[3]]);return;}
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
      ['WALK','SHIFT+MOUSE'],
      ['PAUSE','ESC'],
    ];
    const PAD=[
      ['','L-STICK'],
      ['','R-STICK'],
      ['','RT TRIGGER'],
      ['','LT (HOLD)'],
      ['','LB'],
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
    ctx.fillStyle='#234';ctx.fillRect(8,113,W-16,1);
    pixText('CHARGE: HOLD→RELEASE=BIG SHOT',10,117,'#fa8');
    pixText('MAX 1.5 SEC  SLOW WHILE CHARGING',10,126,'#fa8');

    // BACK TO TITLE button
    const bx=W/2-22,by=H-28,bw=44,bh=12;
    const hov=mouse.x>=bx&&mouse.x<=bx+bw&&mouse.y>=by&&mouse.y<=by+bh;
    ctx.fillStyle=hov?'#0ff':'#081820';
    ctx.fillRect(bx,by,bw,bh);
    pixText('BACK TO TITLE',bx+4,by+3,hov?'#000':'#0ff');
  }
}

