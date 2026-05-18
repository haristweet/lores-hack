// ═══════════════════════════════════════════════
//  RENDER
// ═══════════════════════════════════════════════
function draw(){
  ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
  if(!map)return;
  ctx.save();
  const sx=(Math.random()-.5)*shake,sy=(Math.random()-.5)*shake;
  ctx.translate(Math.round(-camX+W/2+sx),Math.round(-camY+H/2+sy));

  const xr=((camX-W/2)/TILE)|0,yr=((camY-H/2)/TILE)|0;
  const x0=Math.max(0,xr-1),y0=Math.max(0,yr-1);
  const x1=Math.min(MAPW-1,xr+(W/TILE|0)+3),y1=Math.min(MAPH-1,yr+(H/TILE|0)+3);

  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
    const t=map[y*MAPW+x],px=x*TILE,py=y*TILE;
    const wp=wallPal();
    if(t===1||t===4){
      ctx.fillStyle=wp.base;ctx.fillRect(px,py,TILE,TILE);
      ctx.fillStyle=wp.top;ctx.fillRect(px,py,TILE,3);
      ctx.fillStyle=wp.bot;ctx.fillRect(px,py+TILE-3,TILE,3);
      ctx.fillStyle=wp.side;ctx.fillRect(px+TILE-2,py+3,2,TILE-6);
      if(((x*7+y*13)&3)===0){ctx.fillStyle=wp.acc;ctx.fillRect(px+3,py+5,2,2);}
      // Secret wall: subtle gold glint that pulses
      if(t===4){const g=(Math.sin(time*3+x*.7+y*.5)+1)*.5;if(g>.7){ctx.fillStyle='#b8860b';ctx.fillRect(px+5,py+6,2,2);}}
    }else{
      ctx.fillStyle=((x+y)&1)?wp.f1:wp.f2;ctx.fillRect(px,py,TILE,TILE);
      if(t===2){ctx.fillStyle=wp.fd;ctx.fillRect(px+2,py+2,4,4);ctx.fillRect(px+10,py+9,3,3);}
      else if(t===3){ctx.fillStyle=wp.bot;ctx.fillRect(px+4,py+7,8,1);ctx.fillRect(px+6,py+8,4,1);}
      ctx.fillStyle=wp.f2;ctx.fillRect(px,py,1,1);
    }
  }

  // EXIT
  const ex=exits[0];
  if(ex){
    const pu=(Math.sin(time*6)+1)*.5;
    ctx.fillStyle=exitOpen?`rgb(${50+200*pu|0},${200+50*pu|0},80)`:'#552';ctx.fillRect(ex.x-7,ex.y-7,14,14);
    ctx.fillStyle=exitOpen?'#ff0':'#332';ctx.fillRect(ex.x-5,ex.y-5,10,10);
    ctx.fillStyle='#000';ctx.fillRect(ex.x-1,ex.y-3,2,6);ctx.fillRect(ex.x-2,ex.y-2,1,1);ctx.fillRect(ex.x+1,ex.y-2,1,1);
  }

  // SCREW (DEPTH 100)
  if(screwObj){
    const pulse=(Math.sin(time*8)+1)*.5;
    ctx.fillStyle='#ff0';ctx.globalAlpha=.6+pulse*.4;
    ctx.fillRect(screwObj.x-4,screwObj.y-4,8,8);
    ctx.fillStyle='#fff';ctx.fillRect(screwObj.x-2,screwObj.y-2,4,4);
    ctx.fillStyle='#000';ctx.fillRect(screwObj.x-1,screwObj.y,2,1);ctx.fillRect(screwObj.x,screwObj.y-1,1,2);
    ctx.globalAlpha=1;
    pixText('SCREW',(screwObj.x-10)|0,(screwObj.y-12)|0,'#ff0');
  }

  // NPCs (disabled)
  // for(const npc of npcs){
  //   ctx.fillStyle=npc.pal.body;ctx.fillRect(npc.x-2,npc.y-3,4,6);
  //   ctx.fillStyle=npc.pal.head;ctx.fillRect(npc.x-2,npc.y-5,4,3);
  //   ctx.fillStyle='#000';ctx.fillRect(npc.x-1,npc.y-4,1,1);ctx.fillRect(npc.x,npc.y-4,1,1);
  //   ctx.fillStyle=npc.pal.dark;ctx.fillRect(npc.x-2,npc.y+3,1,2);ctx.fillRect(npc.x+1,npc.y+3,1,2);
  //   if(npc.msg){
  //     const bw=npc.msg.length*4+6,bh=11;
  //     const bx=(npc.x-bw/2)|0,by=npc.y-22;
  //     ctx.fillStyle='#111';ctx.fillRect(bx,by,bw,bh);
  //     ctx.strokeStyle='#888';ctx.lineWidth=1;ctx.strokeRect(bx+.5,by+.5,bw-1,bh-1);
  //     pixText(npc.msg,bx+3,by+3,'#ddd');
  //   }
  // }

// POISON PUDDLES
  for(const pd of poisonPuddles){
    const a=Math.min(.55,pd.t/6*.55);
    ctx.fillStyle='#3a0';ctx.globalAlpha=a;
    ctx.fillRect(pd.x-8,pd.y-5,16,10);
    ctx.fillStyle='#6f2';ctx.globalAlpha=a*.7;
    ctx.fillRect(pd.x-5,pd.y-7,10,14);
    ctx.globalAlpha=1;
  }

  // GATEKEEPERS
  for(const gk of gatekeepers){
    const pulse=(Math.sin(performance.now()*.003)+1)*.5;
    const flashing=gk.hit>0;
    ctx.fillStyle=flashing?'#fff':'#600';ctx.fillRect(gk.x-6,gk.y-6,12,12);
    ctx.fillStyle=flashing?'#fff':'#f44';ctx.globalAlpha=flashing?1:.5+pulse*.5;
    ctx.fillRect(gk.x-4,gk.y-4,8,8);
    ctx.globalAlpha=1;
    ctx.fillStyle=flashing?'#fff':'#f88';
    ctx.fillRect(gk.x-1,gk.y-6,2,12);ctx.fillRect(gk.x-6,gk.y-1,12,2);
  }

  // COLD SLEEP POD
  for(const pod of pods){
    if(pod.used)continue;pod.t=(pod.t||0);
    const f=(Math.sin(pod.t*3)+1)*.5;
    ctx.fillStyle='#0af';ctx.globalAlpha=.5+f*.5;
    ctx.fillRect(pod.x-5,pod.y-7,10,14);
    ctx.fillStyle='#8ff';ctx.fillRect(pod.x-3,pod.y-5,6,10);
    ctx.fillStyle='#fff';ctx.fillRect(pod.x-1,pod.y-3,2,6);ctx.fillRect(pod.x-3,pod.y-1,6,2);
    ctx.globalAlpha=1;
    pixText('POD',(pod.x-6)|0,(pod.y-14)|0,'#0af');
  }

  // World cores
  for(const c of cores){
    const f=(Math.sin(c.t*4+(c.x+c.y)*.1)+1)*.5;
    ctx.fillStyle='#066';ctx.fillRect(c.x-3,c.y-3+f,6,6);
    ctx.fillStyle='#0ff';ctx.fillRect(c.x-2,c.y-2+f,4,4);
    ctx.fillStyle='#fff';ctx.fillRect(c.x-1,c.y-1+f,1,1);
  }

  // Dropped pickups
  for(const p of pickups){
    const yo=Math.sin(p.t*5+p.x)*1;
    if(p.type==='core'){ctx.fillStyle='#0ff';ctx.fillRect(p.x-2,p.y-2+yo,4,4);ctx.fillStyle='#fff';ctx.fillRect(p.x-1,p.y-1+yo,1,1);}
    else if(p.type==='health'){ctx.fillStyle='#0f4';ctx.fillRect(p.x-2,p.y-1+yo,4,2);ctx.fillRect(p.x-1,p.y-2+yo,2,4);}
    else if(p.type==='revive'){
      const pulse=Math.abs(Math.sin(time*4));
      ctx.fillStyle='#ff0';ctx.globalAlpha=0.5+pulse*0.5;
      // star shape
      ctx.fillRect(p.x-3,p.y-1+yo,6,2);ctx.fillRect(p.x-1,p.y-3+yo,2,6);
      ctx.fillRect(p.x-2,p.y-2+yo,1,1);ctx.fillRect(p.x+1,p.y-2+yo,1,1);
      ctx.fillRect(p.x-2,p.y+1+yo,1,1);ctx.fillRect(p.x+1,p.y+1+yo,1,1);
      ctx.globalAlpha=1;ctx.fillStyle='#fff';ctx.fillRect(p.x-1,p.y-1+yo,2,2);
    }
  }

  // Smoke
  for(const p of particles){if(!p.sm)continue;ctx.fillStyle=p.c;ctx.globalAlpha=Math.max(0,p.life/.8)*.6;ctx.fillRect(p.x|0,p.y|0,2,2);}
  ctx.globalAlpha=1;

  // Player bullets
  for(const b of bullets){
    const trC=b.pierce>0?'#0cf':b.owner?b.owner.pal.trail:'#fb4';
    const trW=b.charge?Math.max(2,Math.ceil((b.r||1.5)*.6)):1;
    for(let i=0;i<b.trail.length;i++){ctx.globalAlpha=(i+1)/b.trail.length*.7;ctx.fillStyle=trC;ctx.fillRect(b.trail[i].x|0,b.trail[i].y|0,trW,trW);}
    ctx.globalAlpha=1;
    if(b.charge){
      const sz=Math.max(2,Math.ceil(b.r||1.5)),bx2=(b.x|0)-sz,by2=(b.y|0)-sz,bs=sz*2;
      const pw=b.power||0;
      ctx.globalAlpha=0.35;ctx.fillStyle='#ff0';ctx.fillRect(bx2-1,by2-1,bs+2,bs+2);
      ctx.globalAlpha=1;ctx.fillStyle=pw<0.5?'#ff8':'#f80';ctx.fillRect(bx2,by2,bs,bs);
      ctx.fillStyle='#fff';ctx.fillRect((b.x|0)-1,(b.y|0)-1,2,2);
    } else if(b.pierce>0){
      ctx.fillStyle='#0ff';ctx.fillRect((b.x|0)-1,(b.y|0)-1,2,2);
      ctx.fillStyle='#fff';ctx.fillRect(b.x|0,b.y|0,1,1);
    } else {
      ctx.fillStyle='#ffe';ctx.fillRect((b.x|0)-1,(b.y|0)-1,2,2);
    }
  }
  // Enemy bullets
  for(const b of ebullets){
    if(b._isGK){
      // Thrown gatekeeper — large cyan projectile
      ctx.fillStyle='#08a';ctx.fillRect((b.x|0)-3,(b.y|0)-3,7,7);
      ctx.fillStyle='#0cf';ctx.fillRect((b.x|0)-2,(b.y|0)-2,5,5);
      ctx.fillStyle='#fff';ctx.fillRect((b.x|0)-1,(b.y|0)-1,1,1);
    }else if(b.wallpass){ctx.fillStyle='#fff';ctx.fillRect((b.x|0)-2,(b.y|0)-2,4,4);ctx.fillStyle='#f0f';ctx.fillRect((b.x|0)-1,(b.y|0)-1,2,2);}
    else{ctx.fillStyle='#f44';ctx.fillRect((b.x|0)-1,(b.y|0)-1,2,2);ctx.fillStyle='#fa6';ctx.fillRect(b.x|0,b.y|0,1,1);}
  }

  for(const e of enemies)drawEnemy(e);
  for(const p of players)if(p.alive)drawPlayer(p);
  // Shield orbs
  for(const p of players){
    if(!p.alive||!p.shields||!p.shields.length)continue;
    const n=p.shields.length;
    for(let si=0;si<n;si++){
      const sang=p.shieldAngle+si*(Math.PI*2/n);
      const sx=(p.x+Math.cos(sang)*10)|0,sy=(p.y+Math.sin(sang)*10)|0;
      const ratio=p.shields[si].hp/p.shields[si].maxHp;
      // glow
      ctx.globalAlpha=0.25+ratio*.2;ctx.fillStyle='#0cf';ctx.fillRect(sx-3,sy-3,7,7);
      // core
      ctx.globalAlpha=1;
      ctx.fillStyle=ratio>0.66?'#0ff':ratio>0.33?'#0bb':'#088';
      ctx.fillRect(sx-1,sy-1,3,3);
      ctx.fillStyle='#fff';ctx.fillRect(sx,sy,1,1);
    }
    ctx.globalAlpha=1;
  }

  // Sparks
  for(const p of particles){if(p.sm)continue;ctx.fillStyle=p.c;ctx.globalAlpha=Math.max(0,p.life/.5);ctx.fillRect(p.x|0,p.y|0,2,2);}
  ctx.globalAlpha=1;

  // Crosshair (KB+M player)
  const kmp=players.find(p=>p.alive&&p.controller?.type==='KB+M');
  if(kmp){const x=Math.round(mouse.x+camX-W/2),y=Math.round(mouse.y+camY-H/2);ctx.fillStyle='#fff';ctx.fillRect(x-3,y,2,1);ctx.fillRect(x+2,y,2,1);ctx.fillRect(x,y-3,1,2);ctx.fillRect(x,y+2,1,2);ctx.fillStyle='#f44';ctx.fillRect(x,y,1,1);}

  ctx.restore();

  drawOffscreenIndicators();
  drawMinimap();
  drawHUD();

  // Bullet time colour grading
  if(bulletTime){
    const g=ctx.createRadialGradient(W/2,H/2,10,W/2,H/2,140);
    g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(200,0,0,.35)');
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  }

  // Pod revival selection UI
  if(podSelectState){
    const ps=podSelectState;
    const sx=(ps.pod.x-camX+W/2)|0,sy=(ps.pod.y-camY+H/2)|0;
    const sel=ps.candidates[ps.cursor];
    const name=sel.pal.name;
    const bw=Math.max(52,name.length*4+24),bh=22;
    const bx=(sx-bw/2)|0,by=sy-38;
    ctx.fillStyle='#001a1a';ctx.fillRect(bx,by,bw,bh);
    ctx.strokeStyle='#0ff';ctx.lineWidth=1;ctx.strokeRect(bx+.5,by+.5,bw-1,bh-1);
    pixText('REVIVE?',bx+((bw-7*4)/2)|0,by+2,'#0ff');
    if(ps.candidates.length>1){
      pixText('◄',(bx+3)|0,by+11,'#0af');
      pixText('►',(bx+bw-7)|0,by+11,'#0af');
    }
    pixText(name,(bx+(bw-name.length*4)/2)|0,by+11,sel.pal.body);
  }

  // Pause dim
  if(paused){ctx.fillStyle='rgba(0,0,0,.45)';ctx.fillRect(0,0,W,H);}

  // Scanlines
  ctx.fillStyle='#000';ctx.globalAlpha=.18;
  for(let y=0;y<H;y+=2)ctx.fillRect(0,y,W,1);
  ctx.globalAlpha=1;
}

function drawPlayer(p){
  const x=Math.round(p.x),y=Math.round(p.y),a=p.aim||0;
  ctx.fillStyle='#000';ctx.globalAlpha=.4;ctx.fillRect(x-3,y+2,6,2);ctx.globalAlpha=1;
  let bc=p.pal.body;
  if(p.iframe>0&&((time*30)|0)%2===0)bc='#fff';
  if(p._dcpFlash>0){ctx.fillStyle='#fff';ctx.globalAlpha=0.85;ctx.fillRect(x-4,y-6,8,10);ctx.globalAlpha=1;bc='#fff';}
  const pers=p.controller?.personality;
  // Body — bodyguard is 1px wider
  const bw=pers==='bodyguard'?5:4;
  ctx.fillStyle=bc;ctx.fillRect(x-Math.floor(bw/2),y-3,bw,6);
  // Head — berserker is 1px wider
  const hw=pers==='berserker'?5:4;
  ctx.fillStyle=p.pal.head;ctx.fillRect(x-Math.floor(hw/2),y-5,hw,3);
  ctx.fillStyle='#000';ctx.fillRect(x-1,y-4,1,1);ctx.fillRect(x,y-4,1,1);
  // Berserker: angry brow pixel
  if(pers==='berserker'){ctx.fillStyle='#000';ctx.fillRect(x-2,y-5,1,1);ctx.fillRect(x+1,y-5,1,1);}
  const moving=(p.vx*p.vx+p.vy*p.vy)>2,bob=moving?((time*16+p.idx*3)|0)%2:0;
  ctx.fillStyle=p.pal.dark;ctx.fillRect(x-Math.floor(bw/2),y+3,1,2-bob);ctx.fillRect(x+Math.floor(bw/2)-1,y+3,1,1+bob);
  const gx=x+Math.cos(a)*3,gy=y+Math.sin(a)*3;
  // Gun length — sniper longer, berserker shorter
  const gLen=pers==='sniper'?8:pers==='berserker'?3:5;
  ctx.fillStyle='#aaa';
  for(let i=0;i<gLen;i++){ctx.fillRect(Math.round(gx+Math.cos(a)*i),Math.round(gy+Math.sin(a)*i),1,1);}
  // Bodyguard: small shield marker on off-hand side
  if(pers==='bodyguard'){
    const sa=a+Math.PI/2;
    ctx.fillStyle='#89b';ctx.globalAlpha=0.9;
    ctx.fillRect(Math.round(x+Math.cos(sa)*3),Math.round(y+Math.sin(sa)*3)-1,1,3);
    ctx.fillRect(Math.round(x+Math.cos(sa)*3)-1,Math.round(y+Math.sin(sa)*3),3,1);
    ctx.globalAlpha=1;
  }
  if(p.muzzle>0){const mx=gx+Math.cos(a)*5,my=gy+Math.sin(a)*5;ctx.fillStyle='#ffb';ctx.fillRect(Math.round(mx)-1,Math.round(my)-1,3,3);ctx.fillStyle='#fff';ctx.fillRect(Math.round(mx),Math.round(my),1,1);}
  // Charge aura
  if(p.chargeT>0.05){
    const pw=Math.min(1,p.chargeT/1.5);
    const rad=Math.round(3+pw*8);
    const cc=pw<0.4?'#ff8':pw<0.8?'#f80':'#f44';
    ctx.fillStyle=cc;ctx.globalAlpha=0.35+pw*0.55;
    ctx.fillRect(x-rad-1,y-1,2,2);ctx.fillRect(x+rad,y-1,2,2);
    ctx.fillRect(x-1,y-rad-1,2,2);ctx.fillRect(x-1,y+rad,2,2);
    if(rad>=5){const d=Math.round(rad*.7);
      ctx.fillRect(x-d-1,y-d-1,2,2);ctx.fillRect(x+d,y-d-1,2,2);
      ctx.fillRect(x-d-1,y+d,2,2);ctx.fillRect(x+d,y+d,2,2);}
    ctx.globalAlpha=1;
  }
  // Parry ring
  if(p.parryT>0){
    const pa=p.parryT/.18;
    ctx.globalAlpha=pa*.9;
    ctx.strokeStyle='#fff';ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(x,y,18,0,Math.PI*2);ctx.stroke();
    ctx.globalAlpha=pa*.25;
    ctx.fillStyle='#adf';
    ctx.beginPath();ctx.arc(x,y,18,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;
  }
  // Name tag (MP only)
  if(players.length>1)pixText(p.pal.name,x-4,y-12,p.pal.body);
}

function drawEnemy(e){
  const x=Math.round(e.x),y=Math.round(e.y);
  // ── Boss ────────────────────────────────────
  if(e.type==='boss'){
    const tier=e._tier||'green';
    const pulse=Math.abs(Math.sin(time*5));
    let _bc,_hc,_belt,_eye='#f00';
    if(tier==='green') {_bc='#622';_hc='#411';_belt='#833';}
    else if(tier==='yellow'){_bc='#886';_hc='#553';_belt='#aa8';_eye='#ff8';}
    else if(tier==='red')  {_bc='#c22';_hc='#811';_belt='#f44';_eye='#f66';}
    else                   {_bc='#528';_hc='#314';_belt='#83b';_eye='#f0f';}
    const bc=e.hit>0?'#fff':_bc,hc=e.hit>0?'#fff':_hc;
    // Shadow
    ctx.fillStyle='#000';ctx.globalAlpha=.45;ctx.fillRect(x-10,y+8,20,4);ctx.globalAlpha=1;
    // Fists
    ctx.fillStyle=bc;ctx.fillRect(x-13,y-4,5,5);ctx.fillRect(x+8,y-4,5,5);
    // Body
    ctx.fillStyle=bc;ctx.fillRect(x-6,y-6,12,14);
    // Belt stripe
    ctx.fillStyle=e.hit>0?'#fff':_belt;ctx.fillRect(x-6,y+1,12,2);
    // Head
    ctx.fillStyle=hc;ctx.fillRect(x-5,y-11,10,6);
    // Eyes glow
    ctx.fillStyle=_eye;ctx.globalAlpha=.6+pulse*.4;
    ctx.fillRect(x-4,y-9,3,2);ctx.fillRect(x+1,y-9,3,2);
    ctx.globalAlpha=1;
    // Legs animate
    const lb=((time*7)|0)%2;
    ctx.fillStyle=e.hit>0?'#fff':'#400';
    ctx.fillRect(x-5,y+8,4,4-lb);ctx.fillRect(x+1,y+8,4,3+lb);
    // Final boss: appendages + orbiting gem
    if(tier==='final'){
      ctx.fillStyle=bc;
      ctx.fillRect(x-15,y-2,6,4);ctx.fillRect(x+9,y-2,6,4); // arms
      ctx.fillRect(x-2,y-15,4,6);ctx.fillRect(x-2,y+9,4,6); // spikes
      const ox2=Math.round(Math.cos(time*2.5)*13),oy2=Math.round(Math.sin(time*2.5)*13);
      ctx.fillStyle='#f0f';ctx.globalAlpha=.5+pulse*.5;
      ctx.fillRect(x+ox2-1,y+oy2-1,3,3);ctx.globalAlpha=1;
    }
    // Holding GK indicator
    if(e._gkPhase==='holding'){
      ctx.fillStyle='#0cf';ctx.fillRect(x-2,y-22,5,8);
      ctx.fillStyle='#08a';ctx.fillRect(x-2,y-26,5,5);
      ctx.fillStyle='#fff';ctx.fillRect(x-1,y-25,1,1);ctx.fillRect(x+1,y-25,1,1);
    }
    // Name + HP bar
    const bLabel=tier==='final'?'FINAL':tier==='red'?'RED':tier==='yellow'?'GOLD':'BOSS';
    const bLabelCol=tier==='final'?'#f0f':tier==='red'?'#f44':tier==='yellow'?'#ff8':'#f44';
    ctx.globalAlpha=.9;pixText(bLabel,x-Math.floor(bLabel.length*2),y-18,bLabelCol);ctx.globalAlpha=1;
    const bpw=tier==='final'?36:28;ctx.fillStyle='#400';ctx.fillRect(x-(bpw>>1),y-21,bpw,2);
    ctx.fillStyle=e.hit>0?'#ff0':bLabelCol;ctx.fillRect(x-(bpw>>1),y-21,(bpw*e.hp/e._maxHp)|0,2);
    return;
  }
  ctx.fillStyle='#000';ctx.globalAlpha=.4;ctx.fillRect(x-e.r,y+e.r-1,e.r*2,2);ctx.globalAlpha=1;
  let body,head;
  if(e.type==='grunt')    {body='#494';head='#7a7';}
  else if(e.type==='runner')  {body='#963';head='#c85';}
  else if(e.type==='brute')   {body='#722';head='#a44';}
  else if(e.type==='shooter') {body='#549';head='#86c';}
  else if(e.type==='poison')  {body='#362';head='#594';}
  else if(e.type==='zombie')  {body=e.pal.body;head='#9a8';}
  else if(e.type==='splatter'){body='#639';head='#96c';}
  else if(e.type==='dasher')  {body=e.dashing?'#f60':'#a50';head=e.dashing?'#ff4':'#c80';}
  else if(e.type==='ghost')   {body='#8af';head='#adf';}
  else if(e.type==='bomber')  {body='#622';head='#944';}
  if(e.type==='ghost')ctx.globalAlpha=0.5+Math.sin(time*4+e.x*.05)*0.18;
  if(e.hit>0){body='#fff';head='#fff';}
  if(e.type==='brute'){ctx.fillStyle=body;ctx.fillRect(x-4,y-4,8,7);ctx.fillStyle=head;ctx.fillRect(x-3,y-6,6,3);ctx.fillStyle='#f00';ctx.fillRect(x-2,y-5,1,1);ctx.fillRect(x+1,y-5,1,1);}
  else if(e.type==='shooter'){
    ctx.fillStyle=body;ctx.fillRect(x-2,y-3,4,6);ctx.fillStyle=head;ctx.fillRect(x-2,y-5,4,3);
    ctx.fillStyle='#ff0';ctx.fillRect(x-1,y-4,1,1);ctx.fillRect(x,y-4,1,1);
    ctx.fillStyle='#aaa';for(let i=0;i<3;i++)ctx.fillRect(Math.round(x+Math.cos(e.ang)*(3+i)),Math.round(y+Math.sin(e.ang)*(3+i)),1,1);
  } else if(e.type==='zombie'){
    ctx.fillStyle=body;ctx.fillRect(x-2,y-3,4,6);
    ctx.fillStyle=e.pal.dark;ctx.fillRect(x-2,y+2,1,1);ctx.fillRect(x+1,y+1,1,2);
    ctx.fillStyle=head;ctx.fillRect(x-2,y-5,4,3);
    ctx.fillStyle='#f00';ctx.fillRect(x-1,y-4,1,1);ctx.fillRect(x,y-4,1,1);
    if(((time*4+e.x)|0)%3===0){ctx.fillStyle='#800';ctx.fillRect(x-1,y-2,1,1);}
    ctx.fillStyle=e.pal.dark;ctx.fillRect(x-2,y+3,1,2);ctx.fillRect(x+1,y+3,1,2);
    ctx.fillStyle='#666';for(let i=0;i<4;i++)ctx.fillRect(Math.round(x+Math.cos(e.ang)*(3+i)),Math.round(y+Math.sin(e.ang)*(3+i)),1,1);
    ctx.globalAlpha=.7;pixText(e.fromName,x-4,y-13,'#a44');ctx.globalAlpha=1;
  } else if(e.type==='runner'){
    // Tall thin sprinter — small head high, lean body, fast pumping legs
    ctx.fillStyle=head;ctx.fillRect(x-1,y-7,2,2);           // tiny head up high
    ctx.fillStyle=body;ctx.fillRect(x-1,y-5,2,6);           // thin body
    ctx.fillStyle='#f80';ctx.fillRect(x-1,y-6,1,1);         // eye
    const rl=((e.anim*18)|0)%2;
    ctx.fillStyle=body;ctx.fillRect(x-2,y+1,1,2+rl);ctx.fillRect(x+1,y+1,1,3-rl); // fast legs
    ctx.fillStyle=body;ctx.fillRect(x-3,y-3,1,2);ctx.fillRect(x+2,y-4,1,2);        // swinging arms
  } else if(e.type==='ghost'){
    // Teardrop / floating blob — bobs up and down, semi-transparent (alpha set above)
    const bob=Math.round(Math.sin(time*2.8+e.x*.07));
    ctx.fillStyle=body;
    ctx.fillRect(x-1,y-9+bob,2,3);   // narrow top
    ctx.fillRect(x-2,y-7+bob,4,3);   // upper dome
    ctx.fillRect(x-3,y-4+bob,6,5);   // wide mid blob
    ctx.fillRect(x-2,y+1+bob,2,2);ctx.fillRect(x,y+1+bob,2,2); // bottom frills
    ctx.fillStyle=e.hit>0?'#f00':head;ctx.fillRect(x-2,y-3+bob,1,1);ctx.fillRect(x,y-3+bob,1,1); // eyes
  } else if(e.type==='bomber'){
    // Fat barrel body with fuse on top
    ctx.fillStyle='#fa8';ctx.fillRect(x,y-10,1,2);           // fuse spark
    ctx.fillStyle='#aaa';ctx.fillRect(x,y-8,1,3);            // fuse wire
    ctx.fillStyle=head;ctx.fillRect(x-2,y-5,3,2);            // small head
    ctx.fillStyle=body;ctx.fillRect(x-3,y-3,6,7);            // fat barrel
    ctx.fillStyle='#844';ctx.fillRect(x-3,y,6,1);            // band stripe
    // X mark danger
    if(e.hit===0){
      ctx.fillStyle='#f22';
      ctx.fillRect(x-2,y-2,1,1);ctx.fillRect(x+1,y-2,1,1);
      ctx.fillRect(x-1,y-1,1,1);ctx.fillRect(x,y-1,1,1);
      ctx.fillRect(x-2,y+2,1,1);ctx.fillRect(x+1,y+2,1,1);
    }
  } else if(e.type==='splatter'){
    // Wide amorphous blob with animated drips
    const dr=((e.anim*4)|0)%3;
    ctx.fillStyle=body;
    ctx.fillRect(x-3,y-4,6,4);       // upper blob
    ctx.fillRect(x-4,y,8,4);         // wide lower mass
    ctx.fillRect(x-2,y-5,4,2);       // bumpy top
    ctx.fillStyle=e.hit>0?'#fff':head;
    ctx.fillRect(x-2,y-3,1,1);ctx.fillRect(x,y-3,1,1); // eyes
    ctx.fillStyle=body;
    ctx.fillRect(x-3,y+4,1,1+dr);ctx.fillRect(x-1,y+4,1,1+((dr+1)%3));ctx.fillRect(x+1,y+4,1,1+((dr+2)%3)); // drips
  } else if(e.type==='dasher'){
    // Low crouching predator — head pushed forward
    ctx.fillStyle=head;ctx.fillRect(x+2,y-3,3,2);            // head forward-right
    ctx.fillStyle=body;ctx.fillRect(x-3,y-1,7,3);            // wide flat body
    ctx.fillStyle=e.hit>0?'#fff':'#ff4';ctx.fillRect(x+3,y-3,1,1); // forward eye
    if(e.dashing){
      ctx.fillStyle=body;ctx.globalAlpha=.45;
      ctx.fillRect(x-6,y,3,2);ctx.fillRect(x-5,y+1,2,1);    // motion trail
      ctx.globalAlpha=1;
    } else {
      const dl=((e.anim*10)|0)%2;
      ctx.fillStyle=body;ctx.fillRect(x-3,y+2,2,1+dl);ctx.fillRect(x,y+2,2,2-dl); // crouched legs
    }
  } else if(e.type==='poison'){
    // Mushroom — wide spotted cap + thin stem
    ctx.fillStyle=head;
    ctx.fillRect(x-2,y-7,4,2);       // cap top-dome
    ctx.fillRect(x-3,y-5,6,3);       // wide cap brim
    ctx.fillStyle=e.hit>0?'#fff':'#2a5'; // spots
    ctx.fillRect(x-2,y-6,1,1);ctx.fillRect(x,y-5,1,1);ctx.fillRect(x+1,y-6,1,1);
    ctx.fillStyle='#9c9';ctx.fillRect(x-3,y-2,6,1); // cap underside
    ctx.fillStyle=body;ctx.fillRect(x-1,y-1,2,4);   // thin stem
  } else {
    // GRUNT default
    ctx.fillStyle=body;ctx.fillRect(x-2,y-2,4,5);ctx.fillStyle=head;ctx.fillRect(x-2,y-4,4,3);
    ctx.fillStyle='#f00';ctx.fillRect(x-1,y-3,1,1);ctx.fillRect(x,y-3,1,1);
    const reach=Math.sin(e.anim*8);ctx.fillStyle=body;ctx.fillRect(x-3,y-1+reach,1,2);ctx.fillRect(x+2,y-1-reach,1,2);
  }
  ctx.globalAlpha=1; // reset ghost alpha
  // Bomber countdown
  if(e.type==='bomber'&&e.fuseT!==undefined){
    const cnt=''+Math.ceil(e.fuseT);
    const fast=e.fuseT<2;
    ctx.globalAlpha=fast?0.7+Math.sin(performance.now()/120)*0.3:0.9;
    pixText(cnt,x-Math.floor(cnt.length*2),y-12,fast?'#f44':'#fa8');
    ctx.globalAlpha=1;
  }
}

// ── HUD ──────────────────────────────────────
function drawHUD(){
  // Depth progress bar (top)
  ctx.fillStyle='#111';ctx.fillRect(0,0,W,4);
  ctx.fillStyle=stage===MAX_DEPTH?'#ff0':'#0af';
  ctx.fillRect(0,0,(W*stage/MAX_DEPTH)|0,4);
  ctx.fillStyle='#0ff';ctx.fillRect((W*stage/MAX_DEPTH)|0,1,1,2);
  // Monster house banner
  if(monsterHouse&&!monsterHouseCleared){
    const rem=enemies.length;
    const pulse=Math.abs(Math.sin(time*4))*.3;
    ctx.fillStyle='#f00';ctx.globalAlpha=0.12+pulse;ctx.fillRect(0,4,W,10);ctx.globalAlpha=1;
    const mhStr='!! MONSTER HOUSE !!  REMAIN: '+rem;
    pixText(mhStr,(W-mhStr.length*4)>>1,6,'#f44');
  }
  // Boss HP bar (when boss alive)
  const _boss=running?enemies.find(e=>e.type==='boss'):null;
  if(_boss){
    const bw=100;const bx2=(W-bw)>>1;
    ctx.fillStyle='#300';ctx.fillRect(bx2,5,bw,4);
    ctx.fillStyle=_boss.hit>0?'#ff0':'#f44';ctx.fillRect(bx2,5,(bw*_boss.hp/_boss._maxHp)|0,4);
    pixText('★BOSS',bx2-22,5,'#f44');
    const pct=Math.round(100*_boss.hp/_boss._maxHp);
    pixText(pct+'%',bx2+bw+2,5,'#f88');
  }

  // Bottom bar
  ctx.fillStyle='#000c';ctx.fillRect(0,H-22,W,22);

  const n=Math.max(4,players.length),sw=Math.floor(W/n);
  for(let i=0;i<players.length;i++){
    const p=players[i],sx=i*sw+2;
    const nc=p.alive?p.pal.body:'#555';
    // Row 1: name + personality label side by side
    const persLabel=p.isHuman?'':( p.controller._rouletteDisplay || PERS_LABEL[p.controller.personality] || '');
    pixText(p.pal.name,sx,H-22+2,nc);
    if(persLabel)pixText(persLabel,sx+p.pal.name.length*4+2,H-22+2,p.alive?p.pal.body:'#555');
    if(!p.alive){pixText('ZOMBIE',sx,H-22+10,'#f44');continue;}
    // HP bar
    const hw=sw-6;ctx.fillStyle='#400';ctx.fillRect(sx,H-22+8,hw,3);
    ctx.fillStyle=p.hp<p.maxHp*.3?'#f44':'#4c4';ctx.fillRect(sx,H-22+8,(hw*p.hp/p.maxHp)|0,3);
    // Row 2: LV + ability badge
    pixText('LV'+p.level,sx,H-22+13,'#cfc');
    if(!p.isHuman&&!p.controller._rouletteDisplay){
      const abilBadge=p.controller.ability;
      pixText(abilBadge,sx+('LV'+p.level).length*4+2,H-22+13,'#ff0');
    }
    // Dash cd dot
    ctx.fillStyle=p.dashCd<=0?'#0ff':'#334';ctx.fillRect(sx+sw-8,H-22+2,2,2);
    // Revive star
    if(p.hasRevive){ctx.fillStyle='#ff0';ctx.fillRect(sx+sw-8,H-22+6,2,2);pixText('★',sx+sw-14,H-22+5,'#ff0');}
    if(p.isHuman){
      let bx=sx;
      if(driverActive){pixText('DRV',bx,H-22+6,'#ffd700');bx+=16;}
      if(overdriveActive){pixText('OVD',bx,H-22+6,'#f80');bx+=16;}
      if(vertidriveActive){pixText('VTD',bx,H-22+6,'#f0f');bx+=16;}
      if(callCooldown>0){pixText('CALL:'+Math.ceil(callCooldown)+'s',bx,H-22+6,'#446');}
    }
  }

  // Stage / cores (top-right, below progress bar)
  const stageStr=stage+'/'+MAX_DEPTH,coreStr=coresCollected+'/'+coresNeeded;
  pixText('D'+stageStr,W-4-(stageStr.length+1)*4,6,'#0ff');
  pixText(exitOpen?'EXIT!':coreStr,W-4-coreStr.length*4,14,exitOpen?'#ff0':'#8cf');
  // Timer (bottom-right)
  if(!attractDemo&&(runTimerActive||runTimer>0)){const ts=_fmtTime(runTimer);pixText(ts,W-4-ts.length*4,H-8,'#568');}

  // Messages
  const maxMsg=Math.min(messages.length,5);
  for(let i=0;i<maxMsg;i++){
    const m=messages[i],a=m.t<1.5?1:Math.max(0,(2.2-m.t)/.7);
    ctx.globalAlpha=a;
    pixText(m.msg,(W-m.msg.length*4)>>1,20+i*7,m.c);
  }
  ctx.globalAlpha=1;

  if(exitOpen&&stage!==MAX_DEPTH)pixText('REACH EXIT >>',W/2-(13*4)/2,H-28,'#ff0');
  if(stage===MAX_DEPTH&&exitOpen)pixText('FIND THE SCREW!',W/2-(15*4)/2,H-28,'#ff0');

  // Controls hint (first 7 seconds of a floor)
  if(time<7){
    const fa=time<5?1:Math.max(0,(7-time)/2);
    ctx.globalAlpha=fa*.7;
    const hints=['WASD=MOVE  CLICK=FIRE  SPACE=DASH  Q=PARRY','TAB=CALL CPU  HOW TO PLAY: LOBBY'];
    hints.forEach((h,i)=>pixText(h,(W-h.length*4)>>1,H-45+i*8,'#89a'));
    ctx.globalAlpha=1;
  }

  // ── Debug overlay ─────────────────────────
  if(!debug||!running)return;
  const dl=[
    '[DEBUG MODE]  F1:off',
    'STAGE: '+stage+'/'+MAX_DEPTH+(stage===MAX_DEPTH?' ← FINAL':''),
    'ENEMIES: '+enemies.length,
    'CORES: '+coresCollected+'/'+coresNeeded+(exitOpen?' OPEN':''),
    'SCREW: '+(screwObj?'x'+((screwObj.x/TILE)|0)+' y'+((screwObj.y/TILE)|0):'none (not D100)'),
    'EXIT:  x'+((exits[0]?exits[0].x/TILE|0:'?'))+' y'+((exits[0]?exits[0].y/TILE|0:'?')),
    'P1:    x'+((players[0]?players[0].x/TILE|0:'?'))+' y'+((players[0]?players[0].y/TILE|0:'?')),
    '─────────────────',
    '] NEXT FLOOR',
    '[ JUMP TO D100',
    '\\ REVEAL ALL',
    '= GIVE ALL CORES',
    '; KILL ENEMIES',
    'M GOD MODE',
    'B SPAWN BOSS',
    'C CYCLE COFFEE BREAK',
    'E ENDING PREVIEW',
    'R RESET RECORD',
    monkeyMode?'K AUTO PLAY [ON]':'K AUTO PLAY',
  ];
  const pw=dl.reduce((m,s)=>Math.max(m,s.length),0)*4+6;
  const ph=dl.length*7+6;
  ctx.globalAlpha=0.82;ctx.fillStyle='#000';ctx.fillRect(2,22,pw,ph);
  ctx.globalAlpha=1;ctx.fillStyle='#111';ctx.fillRect(2,22,pw,1);
  for(let i=0;i<dl.length;i++){
    const c=dl[i].startsWith('[')?'#f80':dl[i].startsWith('─')?'#333':'#8fc';
    pixText(dl[i],5,25+i*7,c);
  }
}

// ── Pixel font ───────────────────────────────
const FONT={
  '0':'111;101;101;101;111','1':'010;110;010;010;111','2':'111;001;111;100;111',
  '3':'111;001;111;001;111','4':'101;101;111;001;001','5':'111;100;111;001;111',
  '6':'111;100;111;101;111','7':'111;001;010;010;010','8':'111;101;111;101;111',
  '9':'111;101;111;001;111','A':'010;101;111;101;101','B':'110;101;110;101;110',
  'C':'111;100;100;100;111','D':'110;101;101;101;110','E':'111;100;110;100;111',
  'F':'111;100;110;100;100','G':'111;100;101;101;111','H':'101;101;111;101;101',
  'I':'111;010;010;010;111','J':'001;001;001;101;111','K':'101;110;100;110;101',
  'L':'100;100;100;100;111','M':'101;111;111;101;101','N':'101;111;111;111;101',
  'O':'111;101;101;101;111','P':'111;101;111;100;100','Q':'111;101;101;111;011',
  'R':'110;101;110;101;101','S':'111;100;111;001;111','T':'111;010;010;010;010',
  'U':'101;101;101;101;111','V':'101;101;101;101;010','W':'101;101;111;111;101',
  'X':'101;101;010;101;101','Y':'101;101;010;010;010','Z':'111;001;010;100;111',
  ' ':'000;000;000;000;000','/':'001;001;010;100;100','!':'010;010;010;000;010',
  '+':'000;010;111;010;000','-':'000;000;111;000;000','.':'000;000;000;000;010',
  ':':'000;010;000;010;000','>':'100;010;001;010;100','?':'111;001;010;000;010',
};
function pixText(str,x,y,c='#fff'){
  ctx.fillStyle=c;str=(''+str).toUpperCase();
  for(let i=0;i<str.length;i++){
    const ch=FONT[str[i]]||FONT[' '],rows=ch.split(';');
    for(let r=0;r<5;r++)for(let cc=0;cc<3;cc++)if(rows[r][cc]==='1')ctx.fillRect(x+i*4+cc,y+r,1,1);
  }
}
