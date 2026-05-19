// ═══════════════════════════════════════════════
//  SKINS
// ═══════════════════════════════════════════════
const SKINS=[
  {id:0,name:'DEFAULT'},
  {id:1,name:'FLASHY',  need:30},
  {id:2,name:'MECH',    need:50},
  {id:3,name:'BIKINI',  need:70},
  {id:4,name:'SKULL',   need:'clear'},
  {id:5,name:'???',     need:-1},
];
let activeSkin=+(localStorage.getItem('lores_skin')||0);

function skinUnlocked(i){
  const s=SKINS[i];if(!s)return false;
  if(!s.need)return true;
  if(s.need===-1)return false;
  if(s.need==='clear')return!!localStorage.getItem('lores_cleared');
  return+(localStorage.getItem('lores_best')||0)>=s.need;
}
function getActiveSkin(){return skinUnlocked(activeSkin)?activeSkin:0;}
function skinNext(dir){
  let s=activeSkin;
  for(let i=0;i<SKINS.length;i++){
    s=(s+dir+SKINS.length)%SKINS.length;
    if(skinUnlocked(s)){activeSkin=s;localStorage.setItem('lores_skin',s);return;}
  }
}

// ── Dispatch ────────────────────────────────────
function _drawSkin(ctx,p,x,y,bc,moving,t){
  const sk=getActiveSkin();
  if(sk===1)_skinFlashy(ctx,p,x,y,moving);
  else if(sk===2)_skinMech(ctx,p,x,y,moving,t);
  else if(sk===3)_skinBikini(ctx,p,x,y,moving,t);
  else if(sk===4)_skinSkull(ctx,p,x,y,moving,t);
  else _skinDefault(ctx,p,x,y,bc,moving,t);
}

// ── SKIN 0: DEFAULT ─────────────────────────────
function _skinDefault(ctx,p,x,y,bc,moving,t){
  const pers=p.controller?.personality;
  const bw=pers==='bodyguard'?5:4,hw=pers==='berserker'?5:4;
  ctx.fillStyle=bc;ctx.fillRect(x-Math.floor(bw/2),y-3,bw,6);
  ctx.fillStyle=p.pal.head;ctx.fillRect(x-Math.floor(hw/2),y-5,hw,3);
  ctx.fillStyle='#000';ctx.fillRect(x-1,y-4,1,1);ctx.fillRect(x,y-4,1,1);
  if(pers==='berserker'){ctx.fillStyle='#000';ctx.fillRect(x-2,y-5,1,1);ctx.fillRect(x+1,y-5,1,1);}
  const bob=moving?((t*16+p.idx*3)|0)%2:0;
  ctx.fillStyle=p.pal.dark;
  ctx.fillRect(x-Math.floor(bw/2),y+3,1,2-bob);ctx.fillRect(x+Math.floor(bw/2)-1,y+3,1,1+bob);
}

// ── SKIN 1: FLASHY ──────────────────────────────
function _skinFlashy(ctx,p,x,y,moving){
  const now=performance.now();
  const hue=(now/30+p.idx*90)%360;
  const h2=(hue+120)%360,h3=(hue+240)%360;
  // Head (6×4)
  ctx.fillStyle=`hsl(${h2},100%,60%)`;ctx.fillRect(x-3,y-7,6,4);
  ctx.fillStyle='#fff';ctx.fillRect(x-2,y-6,2,2);ctx.fillRect(x+1,y-6,2,2); // star eyes
  ctx.fillStyle='#000';ctx.fillRect(x-1,y-5,1,1);ctx.fillRect(x+2,y-5,1,1);
  // Body (5×7) with stripe
  ctx.fillStyle=`hsl(${hue},100%,55%)`;ctx.fillRect(x-2,y-3,5,7);
  ctx.fillStyle=`hsl(${h3},100%,65%)`;ctx.fillRect(x-2,y,5,2);
  // Chunky legs
  const bob=moving?((now/62|0))%2:0;
  ctx.fillStyle=`hsl(${(hue+60)%360},100%,50%)`;
  ctx.fillRect(x-2,y+4,2,3-bob);ctx.fillRect(x+1,y+4,2,2+bob);
  // Orbiting sparkles
  const sp=now/80;
  ctx.fillStyle='#fff';ctx.globalAlpha=0.9;
  for(let i=0;i<4;i++){
    ctx.fillRect(x+Math.round(Math.cos(sp+i*Math.PI/2)*9),y+Math.round(Math.sin(sp+i*Math.PI/2)*9),1,1);
  }
  ctx.globalAlpha=1;
}

// ── SKIN 2: MECH ────────────────────────────────
function _skinMech(ctx,p,x,y,moving,t){
  // Antenna
  ctx.fillStyle='#ff8';ctx.fillRect(x,y-11,1,4);ctx.fillRect(x-1,y-11,3,1);
  // Box head (6×4)
  ctx.fillStyle='#3a6080';ctx.fillRect(x-3,y-7,6,4);
  // Visor slit
  ctx.fillStyle='#0ff';ctx.globalAlpha=0.9;ctx.fillRect(x-2,y-5,4,1);ctx.globalAlpha=1;
  // Body (5×7)
  ctx.fillStyle='#6a8aa0';ctx.fillRect(x-2,y-3,5,7);
  // Panel lines
  ctx.fillStyle='#2a4060';
  ctx.fillRect(x-2,y+1,5,1);ctx.fillRect(x+1,y-3,1,7);
  // Square legs
  const bob=moving?((t*12+p.idx*2)|0)%2:0;
  ctx.fillStyle='#2a4060';
  ctx.fillRect(x-2,y+4,2,3-bob);ctx.fillRect(x+1,y+4,2,2+bob);
}

// ── SKIN 3: BIKINI ──────────────────────────────
function _skinBikini(ctx,p,x,y,moving,t){
  // Hair
  ctx.fillStyle='#e8a030';
  ctx.fillRect(x-2,y-9,4,2);ctx.fillRect(x-3,y-8,1,2);ctx.fillRect(x+2,y-8,1,2);
  // Head (skin tone)
  ctx.fillStyle='#f4b080';ctx.fillRect(x-2,y-7,4,4);
  // Eyes + lashes
  ctx.fillStyle='#000';
  ctx.fillRect(x-1,y-5,1,1);ctx.fillRect(x+1,y-5,1,1);
  ctx.fillRect(x-2,y-6,1,1);ctx.fillRect(x+2,y-6,1,1);
  // Bikini top
  ctx.fillStyle='#f06080';ctx.fillRect(x-2,y-3,4,2);
  // Waist
  ctx.fillStyle='#f4b080';ctx.fillRect(x-1,y-1,3,2);
  // Bikini bottom (wider hips)
  ctx.fillStyle='#f06080';ctx.fillRect(x-2,y+1,5,2);
  // Legs
  const bob=moving?((t*16+p.idx*3)|0)%2:0;
  ctx.fillStyle='#f4b080';
  ctx.fillRect(x-2,y+3,2,3-bob);ctx.fillRect(x+1,y+3,2,2+bob);
}

// ── SKIN 4: SKULL ───────────────────────────────
function _skinSkull(ctx,p,x,y,moving,t){
  // Skull head (6×5)
  ctx.fillStyle='#dde';ctx.fillRect(x-3,y-8,6,5);
  // Eye sockets
  ctx.fillStyle='#000';ctx.fillRect(x-2,y-7,2,2);ctx.fillRect(x+1,y-7,2,2);
  // Nose hollow
  ctx.fillRect(x,y-5,1,1);
  // Teeth
  ctx.fillStyle='#dde';ctx.fillRect(x-2,y-3,5,2);
  ctx.fillStyle='#000';
  ctx.fillRect(x-1,y-3,1,1);ctx.fillRect(x+1,y-3,1,1);ctx.fillRect(x+3,y-3,1,1);
  // Bone body (4×5)
  ctx.fillStyle='#dde';ctx.fillRect(x-2,y-1,4,5);
  // Rib gaps
  ctx.fillStyle='#000';
  ctx.fillRect(x-1,y,1,1);ctx.fillRect(x+1,y,1,1);
  ctx.fillRect(x-1,y+2,1,1);ctx.fillRect(x+1,y+2,1,1);
  // Bone legs + feet
  const bob=moving?((t*14+p.idx*3)|0)%2:0;
  ctx.fillStyle='#dde';
  ctx.fillRect(x-2,y+4,1,3-bob);ctx.fillRect(x+1,y+4,1,2+bob);
  ctx.fillRect(x-3,y+5-bob,2,1);ctx.fillRect(x+1,y+4+bob,2,1);
}
