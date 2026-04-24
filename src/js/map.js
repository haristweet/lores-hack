//  WALL PALETTES (10 tiers, every 10 depths)
// ═══════════════════════════════════════════════
const WALL_PALETTES=[
  {base:'#3a3055',top:'#5a4a80',bot:'#1a1430',side:'#241c40',acc:'#7a64a8',f1:'#2a253a',f2:'#221d30',fd:'#3a3450'}, // 1-10  violet
  {base:'#1a2a4a',top:'#2a4a7a',bot:'#0a1428',side:'#141c38',acc:'#4a74c8',f1:'#161e30',f2:'#101825',fd:'#1e2e48'}, // 11-20 blue
  {base:'#0f3030',top:'#1a5050',bot:'#061a1a',side:'#0c2828',acc:'#2a9898',f1:'#0c2028',f2:'#081820',fd:'#103838'}, // 21-30 teal
  {base:'#3a2010',top:'#6a3c18',bot:'#1a0c06',side:'#2a1610',acc:'#a06030',f1:'#281808',f2:'#1e1206',fd:'#3a2818'}, // 31-40 brown
  {base:'#3a1a06',top:'#703010',bot:'#1a0800',side:'#2c1008',acc:'#d05820',f1:'#200c04',f2:'#280e04',fd:'#401804'}, // 41-50 volcanic
  {base:'#3a0808',top:'#6a1010',bot:'#1a0404',side:'#280808',acc:'#e02020',f1:'#200404',f2:'#180404',fd:'#2a0606'}, // 51-60 deep red
  {base:'#1a0a14',top:'#300a20',bot:'#0a0408',side:'#140810',acc:'#ff2060',f1:'#100408',f2:'#0c0306',fd:'#1c0812'}, // 61-70 hellfire
  {base:'#200a30',top:'#400a60',bot:'#100418',side:'#180828',acc:'#9030e0',f1:'#140818',f2:'#100610',fd:'#280a38'}, // 71-80 void purple
  {base:'#0a1e0a',top:'#103818',bot:'#040e04',side:'#081408',acc:'#30d030',f1:'#060e06',f2:'#040c04',fd:'#0c1e0c'}, // 81-90 bio
  {base:'#080808',top:'#181818',bot:'#020202',side:'#0c0c0c',acc:'#e0e0ff',f1:'#0a0a0a',f2:'#060606',fd:'#101010'}, // 91-99 void
];
function wallPal(){return WALL_PALETTES[Math.min(9,Math.floor((stage-1)/10))];}

// ═══════════════════════════════════════════════
//  WORLD
// ═══════════════════════════════════════════════
let map,fog,rooms_=[];
let cores=[],exits=[],pods=[],screwObj=null;
let exitOpen=false,coresNeeded=0,coresCollected=0;
let secretWallPos=null,secretWallHits=0,driverActive=false;

// ── Flow field for enemy navigation ──────────
const flowField=new Float32Array(MAPW*MAPH*2); // [dx,dy] per tile
const _ffParent=new Int32Array(MAPW*MAPH);
const _ffQueue=new Int32Array(MAPW*MAPH);
let _ffTx=-1,_ffTy=-1;
function buildFlowField(px,py){
  const tx=px/TILE|0,ty=py/TILE|0;
  if(tx===_ffTx&&ty===_ffTy)return; // same tile — no recompute needed
  _ffTx=tx;_ffTy=ty;
  _ffParent.fill(-1);
  // BFS from player tile outward
  let head=0,tail=0;
  const start=ty*MAPW+tx;
  _ffParent[start]=start;
  _ffQueue[tail++]=start;
  while(head<tail){
    const idx=_ffQueue[head++];
    const cx=idx%MAPW,cy=(idx/MAPW)|0;
    const nb=[cx-1+cy*MAPW,cx+1+cy*MAPW,cx+(cy-1)*MAPW,cx+(cy+1)*MAPW];
    const nx=[cx-1,cx+1,cx,cx],ny=[cy,cy,cy-1,cy+1];
    for(let k=0;k<4;k++){
      if(nx[k]<0||ny[k]<0||nx[k]>=MAPW||ny[k]>=MAPH)continue;
      const ni=nb[k];if(_ffParent[ni]!==-1)continue;
      if(map[ni]===1||map[ni]===4)continue; // wall
      _ffParent[ni]=idx;_ffQueue[tail++]=ni;
    }
  }
  // Build direction: each tile points one step toward player
  for(let i=0;i<MAPW*MAPH;i++){
    const p=_ffParent[i];
    if(p===-1||p===i){flowField[i*2]=0;flowField[i*2+1]=0;continue;}
    flowField[i*2]=(p%MAPW)-(i%MAPW);
    flowField[i*2+1]=((p/MAPW)|0)-((i/MAPW)|0);
  }
}

function genMap(){
  map=new Uint8Array(MAPW*MAPH); map.fill(1);

  // ── Monster House: open arena ──────────────
  if(monsterHouse){
    map.fill(0);
    // outer border walls
    for(let x=0;x<MAPW;x++){map[x]=1;map[(MAPH-1)*MAPW+x]=1;}
    for(let y=0;y<MAPH;y++){map[y*MAPW]=1;map[y*MAPW+MAPW-1]=1;}
    // random 2×2 pillars (avoid center 6×6)
    const mcx=MAPW>>1,mcy=MAPH>>1;
    for(let i=0;i<14+rndi(0,8);i++){
      const px=rndi(3,MAPW-5),py=rndi(3,MAPH-5);
      if(Math.abs(px-mcx)<5&&Math.abs(py-mcy)<5)continue;
      map[py*MAPW+px]=1;map[py*MAPW+px+1]=1;
      map[(py+1)*MAPW+px]=1;map[(py+1)*MAPW+px+1]=1;
    }
    // floor variation
    for(let i=0;i<map.length;i++){if(map[i]===0&&Math.random()<.06)map[i]=2;}
    rooms_=[{x:1,y:1,w:MAPW-2,h:MAPH-2,cx:mcx,cy:mcy}];
    const wcx=mcx*TILE+8,wcy=mcy*TILE+8;
    for(let i=0;i<players.length;i++){const a=(i/Math.max(1,players.length))*Math.PI*2;players[i].x=wcx+Math.cos(a)*10;players[i].y=wcy+Math.sin(a)*10;}
    exits=[{x:wcx,y:wcy}];
    // no cores — exit opens on enemy clear
    coresNeeded=0;coresCollected=0;exitOpen=false;cores=[];pods=[];screwObj=null;
    fog=new Uint8Array(MAPW*MAPH);fog.fill(1); // fully revealed
    return;
  }

  const rs=[];
  for(let i=0;i<24;i++){
    const w=rndi(6,12),h=rndi(5,10),x=rndi(1,MAPW-w-1),y=rndi(1,MAPH-h-1);
    rs.push({x,y,w,h,cx:x+(w>>1),cy:y+(h>>1)});
    for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)map[yy*MAPW+xx]=0;
  }
  for(let i=1;i<rs.length;i++){
    let x=rs[i-1].cx,y=rs[i-1].cy;const b=rs[i];
    while(x!==b.cx){map[y*MAPW+x]=0;x+=(b.cx>x?1:-1);}
    while(y!==b.cy){map[y*MAPW+x]=0;y+=(b.cy>y?1:-1);}
  }
  for(let i=0;i<map.length;i++){if(map[i]===0){const r=Math.random();if(r<.05)map[i]=3;else if(r<.20)map[i]=2;}}
  rooms_=rs;
  // place players
  const r0=rs[0];const cx=r0.cx*TILE+8,cy=r0.cy*TILE+8;
  for(let i=0;i<players.length;i++){const a=(i/Math.max(1,players.length))*Math.PI*2;players[i].x=cx+Math.cos(a)*10;players[i].y=cy+Math.sin(a)*10;}
  // exit: farthest room
  let best=rs[0],bd=-1;
  for(const r of rs){const dx=r.cx*TILE-cx,dy=r.cy*TILE-cy,d=dx*dx+dy*dy;if(d>bd){bd=d;best=r;}}
  exits=[{x:best.cx*TILE+8,y:best.cy*TILE+8}];
  // cores (max 8)
  const nc=Math.min(8,Math.max(1,3+Math.ceil(stage/10)));
  coresNeeded=nc; coresCollected=0; exitOpen=false; cores=[];
  let placed=0,guard=0;
  while(placed<nc&&guard++<800){const r=rs[rndi(1,rs.length)];const tx=r.x+rndi(0,r.w),ty=r.y+rndi(0,r.h);const t=map[ty*MAPW+tx];if(t===0||t===2||t===3){cores.push({x:tx*TILE+8,y:ty*TILE+8,t:0});placed++;}}
  // cold sleep pods: every 10 floors, one pod
  pods=[];
  if(stage%10===0){
    let pg=0;while(pg++<200){const r=rs[rndi(1,rs.length)];const tx=r.x+rndi(0,r.w),ty=r.y+rndi(0,r.h);const t=map[ty*MAPW+tx];if(t===0||t===2||t===3){pods.push({x:tx*TILE+8,y:ty*TILE+8,t:0,used:false});break;}}
  }
  // DEPTH 100: screw
  screwObj=null;
  if(stage===MAX_DEPTH){screwObj={x:best.cx*TILE+8,y:best.cy*TILE+8-12,t:0};}
  // Secret wall (20% chance, not on boss/MH floors)
  secretWallPos=null;secretWallHits=0;_ffTx=-1;_ffTy=-1; // force flow field rebuild
  const isBossFloor=stage%10===0||stage===99;
  if(!isBossFloor&&!monsterHouse&&Math.random()<.20){
    for(let t=0;t<400;t++){
      const tx=rndi(2,MAPW-2),ty=rndi(2,MAPH-2);
      if(map[ty*MAPW+tx]!==1)continue;
      // needs at least one floor neighbor
      let hasFloor=false;
      for(let dy=-1;dy<=1&&!hasFloor;dy++)for(let dx=-1;dx<=1;dx++){const n=map[(ty+dy)*MAPW+(tx+dx)];if(n===0||n===2)hasFloor=true;}
      if(!hasFloor)continue;
      map[ty*MAPW+tx]=4;secretWallPos={tx,ty};break;
    }
  }
  // Fog of war — reveal spawn area
  fog=new Uint8Array(MAPW*MAPH);
  revealFog(r0.cx*TILE+8,r0.cy*TILE+8);
}

function revealFog(wx,wy){
  const tx=(wx/TILE)|0,ty=(wy/TILE)|0,R=7;
  for(let dy=-R;dy<=R;dy++)for(let dx=-R;dx<=R;dx++){
    if(dx*dx+dy*dy>R*R)continue;
    const x=tx+dx,y=ty+dy;
    if(x>=0&&x<MAPW&&y>=0&&y<MAPH)fog[y*MAPW+x]=1;
  }
}

// Offscreen canvas for minimap (putImageData ignores globalAlpha — use drawImage instead)
const _mmCv=document.createElement('canvas');
_mmCv.width=MAPW;_mmCv.height=MAPH;
const _mmCtx=_mmCv.getContext('2d');

function allyHasAbility(ab){
  return players.some(p=>!p.isHuman&&p.alive&&!p.controller._rouletteDisplay&&p.controller.ability===ab);
}

function drawMinimap(){
  if(!map||!fog)return;
  const MW=MAPW,MH=MAPH;
  const mx=W-MW-4,my=20;
  const hasMap=allyHasAbility('MAP');
  const hasItem=allyHasAbility('ITEM');
  const hasExit=allyHasAbility('EXIT');
  const hasEnemy=allyHasAbility('ENEMY');

  // Terrain — Sniper reveals full map
  const id=_mmCtx.createImageData(MW,MH);const d=id.data;
  for(let y=0;y<MAPH;y++)for(let x=0;x<MAPW;x++){
    if(!fog[y*MAPW+x]&&!hasMap)continue;
    const t=map[y*MAPW+x],i=(y*MW+x)*4;
    if(t===1){d[i]=80;d[i+1]=60;d[i+2]=120;d[i+3]=255;}
    else     {d[i]=55;d[i+1]=48;d[i+2]=80;d[i+3]=255;}
  }
  _mmCtx.putImageData(id,0,0);

  // EXIT — Bodyguard always shows exit
  if(exits[0]){
    const ex=(exits[0].x/TILE)|0,ey=(exits[0].y/TILE)|0;
    if(fog[ey*MAPW+ex]||hasExit){
      _mmCtx.fillStyle=exitOpen?'#ff0':'#665500';
      _mmCtx.fillRect(ex-1,ey-1,3,3);
    }
  }

  // CORES — Prospector always shows cores
  _mmCtx.fillStyle='#0ff';
  for(const c of cores){
    const cx_=(c.x/TILE)|0,cy_=(c.y/TILE)|0;
    if(fog[cy_*MAPW+cx_]||hasItem)_mmCtx.fillRect(cx_,cy_,2,2);
  }

  // ENEMIES — Berserker shows all enemy positions
  if(hasEnemy){
    _mmCtx.fillStyle='#f44';
    for(const e of enemies){
      const ex=(e.x/TILE)|0,ey=(e.y/TILE)|0;
      _mmCtx.fillRect(ex,ey,2,2);
    }
  }

  // Players
  for(const p of players){
    if(!p.alive)continue;
    const px=(p.x/TILE)|0,py=(p.y/TILE)|0;
    _mmCtx.fillStyle=p.pal.body;
    _mmCtx.fillRect(px-1,py-1,3,3);
  }

  ctx.globalAlpha=0.45;
  ctx.fillStyle='#000';
  ctx.fillRect(mx-1,my-1,MW+2,MH+2);
  ctx.globalAlpha=0.60;
  ctx.drawImage(_mmCv,mx,my);
  ctx.globalAlpha=1;
}

// Draw edge arrows for off-screen CPU allies
function drawOffscreenIndicators(){
  const PAD=10,CX=W/2,CY=H/2;
  for(const p of players){
    if(!p.alive||p.isHuman)continue;
    const sx=p.x-camX+CX,sy=p.y-camY+CY;
    if(sx>=PAD&&sx<=W-PAD&&sy>=PAD&&sy<=H-PAD)continue; // on-screen, skip
    const ang=Math.atan2(sy-CY,sx-CX);
    const c=Math.cos(ang),s=Math.sin(ang);
    // Intersect ray with screen rect to find edge point
    let ex,ey;
    const xr=(c>0?CX-PAD:-(CX-PAD)),yr=(s>0?CY-PAD:-(CY-PAD));
    if(s!==0&&Math.abs(xr*s/c)>=Math.abs(yr)){ex=CX+yr*c/s;ey=CY+yr;}
    else{ex=CX+xr;ey=CY+xr*s/c;}
    ex=Math.max(PAD,Math.min(W-PAD,ex));
    ey=Math.max(PAD,Math.min(H-PAD,ey));
    // Arrow triangle pointing toward the CPU
    ctx.save();
    ctx.translate(ex,ey);ctx.rotate(ang);
    ctx.globalAlpha=0.88;
    ctx.fillStyle=p.pal.body;
    ctx.beginPath();ctx.moveTo(7,0);ctx.lineTo(-4,-3.5);ctx.lineTo(-4,3.5);ctx.closePath();ctx.fill();
    // Tiny player color dot at arrow base
    ctx.fillStyle=p.pal.dark||p.pal.body;
    ctx.fillRect(-5,-1,3,2);
    ctx.globalAlpha=1;ctx.restore();
  }
}

function tileAt(x,y){const tx=(x/TILE)|0,ty=(y/TILE)|0;if(tx<0||ty<0||tx>=MAPW||ty>=MAPH)return 1;return map[ty*MAPW+tx];}
function solid(x,y){const t=tileAt(x,y);return t===1||t===4;}
function hitsWall(x,y,r){for(let a=0;a<8;a++){const t=a*Math.PI/4;if(solid(x+Math.cos(t)*r,y+Math.sin(t)*r))return true;}return solid(x,y);}
function hasLoS(x0,y0,x1,y1){const dx=x1-x0,dy=y1-y0,n=Math.ceil(Math.hypot(dx,dy)/4);for(let i=1;i<n;i++){const t=i/n;if(solid(x0+dx*t,y0+dy*t))return false;}return true;}
