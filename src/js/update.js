// ═══════════════════════════════════════════════
//  UPDATE
// ═══════════════════════════════════════════════
function updatePlayer(p,dt){
  if(!p.alive)return;
  if(p.controller.pre)p.controller.pre(p,dt);
  let{x:mx,y:my}=p.controller.move(p);
  const ml=Math.hypot(mx,my);if(ml>1){mx/=ml;my/=ml;}
  let spd=p.spd;
  p.dashCd=Math.max(0,p.dashCd-dt);p.dashT=Math.max(0,p.dashT-dt);
  const db=p.controller.dash(p);
  if(db&&!p.edge.dash&&p.dashCd<=0&&(mx||my)){p.dashT=.18;p.dashCd=overdriveActive?.18:1.2;p.iframe=Math.max(p.iframe,.18);smoke(p.x,p.y);}
  p.edge.dash=db;
  if(p.dashT>0)spd*=3.2;
  // Charge button (need early peek to apply speed penalty)
  const chB=p.controller.charge(p);
  if(chB&&p.dashT<=0)spd*=0.35;
  p.vx=mx*spd;p.vy=my*spd;
  // CPU wall avoidance: try perpendicular when heading into a wall
  if(!p.isHuman&&(mx||my)&&hitsWall(p.x+p.vx*.08,p.y+p.vy*.08,p.r)){
    const a=Math.atan2(p.vy,p.vx);
    const a2=a+Math.PI/2,a3=a-Math.PI/2;
    if(!hitsWall(p.x+Math.cos(a2)*spd*.08,p.y+Math.sin(a2)*spd*.08,p.r)){p.vx=Math.cos(a2)*spd*.7;p.vy=Math.sin(a2)*spd*.7;}
    else if(!hitsWall(p.x+Math.cos(a3)*spd*.08,p.y+Math.sin(a3)*spd*.08,p.r)){p.vx=Math.cos(a3)*spd*.7;p.vy=Math.sin(a3)*spd*.7;}
  }
  moveObj(p,dt);
  p.aim=p.controller.aim(p);
  // Charge accumulation / release
  if(chB&&p.dashT<=0){p.chargeT+=dt;}
  else if(p.chargeT>0&&!chB){fireChargeShot(p,p.chargeT);p.chargeT=0;}
  p.fireCd=Math.max(0,p.fireCd-dt);
  // Normal fire: auto (hold), disabled while charging
  const fb=p.controller.fire(p);
  p.edge.fire=fb;
  if(!chB&&fb&&p.fireCd<=0){
    const w=p.weapon;
    const spread=p.level>=3?w.spread*.6:w.spread;
    const ox=Math.cos(p.aim)*5,oy=Math.sin(p.aim)*5;
    const dmg=(w.dmg+p.level*.4)*.25;
    const angles=driverActive?[p.aim-0.22,p.aim,p.aim+0.22]:[p.aim+rnd(-spread,spread)];
    for(const a of angles)bullets.push({x:p.x+ox,y:p.y+oy,vx:Math.cos(a)*w.spd,vy:Math.sin(a)*w.spd,life:w.range,dmg:dmg*(driverActive?.7:1),owner:p,trail:[]});
    if(vertidriveActive)bullets.push({x:p.x-ox,y:p.y-oy,vx:Math.cos(p.aim+Math.PI)*w.spd,vy:Math.sin(p.aim+Math.PI)*w.spd,life:w.range,dmg:dmg*.8,owner:p,trail:[]});
    p.fireCd=w.fireCd*(driverActive?1.15:1);p.muzzle=.08;
    shake=Math.max(shake,.8);
    p.vx-=Math.cos(p.aim)*7;p.vy-=Math.sin(p.aim)*7;
  }
  p.iframe=Math.max(0,p.iframe-dt);
  p.muzzle=Math.max(0,p.muzzle-dt);
  // Parry
  p.parryCd=Math.max(0,p.parryCd-dt);
  p.parryT=Math.max(0,p.parryT-dt);
  if(p.isHuman&&p.controller.parry){
    const parB=p.controller.parry(p);
    if(parB&&!p.edge.parry&&p.parryCd<=0){
      p.parryT=.18;p.parryCd=1.5;
      spark(p.x,p.y,'#fff',5,35);
    }
    p.edge.parry=parB;
  }
}

function fireChargeShot(p,t){
  const MAX_CHARGE=1.5;
  const power=Math.min(1,t/MAX_CHARGE);
  const w=p.weapon;
  const r=1.5+power*12.5;        // bullet radius 1.5→14
  const dmg=(w.dmg+p.level*.4)*(1+power*10);  // 1x to 11x
  const spd=w.spd*(.65+power*.2);
  const range=w.range*(1.5+power*.8);
  const ox=Math.cos(p.aim)*5,oy=Math.sin(p.aim)*5;
  bullets.push({x:p.x+ox,y:p.y+oy,
    vx:Math.cos(p.aim)*spd,vy:Math.sin(p.aim)*spd,
    life:range,dmg,owner:p,trail:[],r,charge:true,power});
  p.muzzle=.2+power*.25;
  shake=Math.max(shake,2+power*5);
  spark(p.x+Math.cos(p.aim)*10,p.y+Math.sin(p.aim)*10,'#ff0',Math.round(6+power*12),110+power*130);
  spark(p.x+Math.cos(p.aim)*10,p.y+Math.sin(p.aim)*10,p.pal.trail,Math.round(4+power*6),80+power*80);
}

function update(dt){
  time+=dt;
  if(!running)return;
  callCooldown=Math.max(0,callCooldown-dt);
  callAggroTimer=Math.max(0,callAggroTimer-dt);
  // ── Gamepad Select → callCPU ──
  {const gps=navigator.getGamepads?navigator.getGamepads():[];for(const gp of gps){if(!gp)continue;const sel=!!gp.buttons[8]?.pressed;if(sel&&!_prevSel)callCPU();_prevSel=sel;break;}}

  // ── Bullet time ──
  let eff=dt;
  if(bulletTime){
    eff=dt*.07;
    bulletTime.timer-=dt;
    // Invincibility for all alive
    for(const p of players)if(p.alive)p.iframe=Math.max(p.iframe,.15);
    if(bulletTime.timer<=0){
      bulletTime=null;
    }
  }

  // ── Players ──
  for(const p of players){updatePlayer(p,eff);if(p.alive)revealFog(p.x,p.y);}
  // Update flow field when human player moves to a new tile
  {const _hpf=humanPlayer();if(_hpf)buildFlowField(_hpf.x,_hpf.y);}
  // soft player-player separation
  for(let i=0;i<players.length;i++)for(let j=i+1;j<players.length;j++){
    const a=players[i],b=players[j];if(!a.alive||!b.alive)continue;
    const dx=a.x-b.x,dy=a.y-b.y,d=Math.hypot(dx,dy),mn=a.r+b.r;
    if(d>0&&d<mn){const push=(mn-d)*.5;const nax=a.x+dx/d*push,nay=a.y+dy/d*push,nbx=b.x-dx/d*push,nby=b.y-dy/d*push;if(!hitsWall(nax,nay,a.r)){a.x=nax;a.y=nay;}if(!hitsWall(nbx,nby,b.r)){b.x=nbx;b.y=nby;}}
  }

  // ── Enemy spawn ──
  spawnT-=eff;
  const maxE=Math.min(40,Math.floor(8+stage*.32));
  const spawnInterval=Math.max(.3,1.4-stage*.011);
  if(!monsterHouse&&spawnT<=0&&enemies.length<maxE){
    spawnT=spawnInterval;
    const r=Math.random();
    if(stage>=20)spawnEnemy(r<.32?'grunt':r<.58?'runner':r<.76?'shooter':r<.9?'brute':'poison');
    else spawnEnemy(r<.45?'grunt':r<.75?'runner':r<.92?'shooter':'brute');
  }
  // ── Monster House clear check ──
  if(monsterHouse&&!monsterHouseCleared&&mhSpawnPending===0&&time>2&&enemies.length===0){
    monsterHouseCleared=true;exitOpen=true;
    const cx=(MAPW>>1)*TILE+8,cy=(MAPH>>1)*TILE+8;
    pickups.push({type:'revive',x:cx,y:cy,t:0});
    flash('!! CLEARED !!','#ff0');flash('★ REVIVE ITEM DROPPED ★','#fa0');
    shake=Math.max(shake,5);
    spark(cx,cy,'#ff0',24,160);spark(cx,cy,'#fff',12,100);
  }

  // ── Player bullets ──
  for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i];
    b.trail.push({x:b.x,y:b.y});if(b.trail.length>5)b.trail.shift();
    b.x+=b.vx*eff;b.y+=b.vy*eff;b.life-=eff;
    if(b.life<=0||solid(b.x,b.y)){
      // Secret wall hit?
      const bTx=(b.x/TILE)|0,bTy=(b.y/TILE)|0;
      if(secretWallPos&&bTx===secretWallPos.tx&&bTy===secretWallPos.ty){
        secretWallHits++;
        SE.clang();
        spark(b.x,b.y,'#ffd700',6,70);
        if(secretWallHits>=25){
          // Destroy secret wall, drop driver or overdrive (50/50)
          map[secretWallPos.ty*MAPW+secretWallPos.tx]=0;
          const roll=Math.random();
          if(roll<1/3){
            driverActive=true;
            flash('DRIVER FOUND!','#ffd700');flash('3-WAY SHOT ACTIVE!','#ffd700');
          }else if(roll<2/3){
            overdriveActive=true;
            flash('OVERDRIVE FOUND!','#f80');flash('DASH RECHARGE UP!','#f80');
          }else{
            vertidriveActive=true;
            flash('VERTIDRIVE FOUND!','#f0f');flash('BACK SHOT ACTIVE!','#f0f');
          }
          spark(bTx*TILE+8,bTy*TILE+8,'#ffd700',24,140);
          SE.driver();secretWallPos=null;
        }else{
          spark(b.x,b.y,'#ff8',2,50);
        }
      }else{spark(b.x,b.y,'#ff8',4,80);}
      bullets.splice(i,1);continue;
    }
    let hit=false;
    // gatekeeper absorbs bullets
    for(const gk of gatekeepers){if((b.x-gk.x)**2+(b.y-gk.y)**2<6*6){spark(b.x,b.y,'#f44',3,40);bullets.splice(i,1);hit=true;break;}}
    if(hit)continue;
    for(let j=enemies.length-1;j>=0;j--){
      const e=enemies[j];const dx=e.x-b.x,dy=e.y-b.y;
      if(dx*dx+dy*dy<(e.r+(b.r||1.5))**2){
        e.hp-=b.dmg;e.hit=.1;e.vx+=b.vx*.05;e.vy+=b.vy*.05;
        blood(b.x,b.y);
        if(e.hp<=0){
          e._dead=true;enemies.splice(j,1);
          totalKills++;if(b.owner)b.owner.kills++;
          if(e.type==='boss')SE.bossDeath();else SE.kill();
          spark(e.x,e.y,'#c22',12,90);smoke(e.x,e.y);shake=Math.max(shake,2);
          // drops
          const healRate=stage>50?Math.max(.02,.12-(stage-50)*.002):.12;
          if(chance(.08))pickups.push({type:'core',x:e.x,y:e.y,t:0});
          if(chance(healRate))pickups.push({type:'health',x:e.x,y:e.y,t:0});
          // boss drops
          if(e.type==='boss'){
            for(let k=0;k<3;k++)pickups.push({type:'health',x:e.x+rnd(-16,16),y:e.y+rnd(-16,16),t:0});
            flash('★ BOSS SLAIN ★','#ff0');shake=Math.max(shake,5);
            if(driverActive){driverActive=false;flash('DRIVER EXPIRED','#888');}
            if(overdriveActive){flash('OVERDRIVE STILL ACTIVE!','#f80');}
            if(vertidriveActive){flash('VERTIDRIVE STILL ACTIVE!','#f0f');}
            if(!attractDemo)PSG.play(stage); // revert to zone BGM
            // restore any devoured cores (partial refund)
            const refund=Math.min(coresNeeded-coresCollected,2);
            if(refund>0){coresCollected+=refund;flash('CORE RECOVERED +'+refund,'#0ff');}
          }
          // zombie drops bonus
          if(e.type==='zombie'){
            const xpDrop=e.dropXp||0;
            if(xpDrop>0&&b.owner){b.owner.xp+=xpDrop;flash('VENGEANCE +'+xpDrop+'XP','#ff0');}
            if(e.dropCores>0){coresCollected+=e.dropCores;flash('RECLAIMED +'+e.dropCores+' CORE','#0ff');}
          }
          if(b.owner){
            const xpg=e.type==='boss'?50:e.type==='brute'?6:e.type==='zombie'?8:e.type==='shooter'?3:2;
            b.owner.xp+=xpg;b.owner.accXp+=xpg;
            while(b.owner.xp>=b.owner.level*10){
              b.owner.xp-=b.owner.level*10;b.owner.level++;
              b.owner.maxHp+=10;b.owner.hp=Math.min(b.owner.maxHp,b.owner.hp+20);
              b.owner.weapon.dmg+=.5;
              flash(b.owner.pal.name+' LV.'+b.owner.level,b.owner.pal.body);
            }
          }
        }
        hit=true;bullets.splice(i,1);break;
      }
    }
  }

  // ── Enemy bullets ──
  for(let i=ebullets.length-1;i>=0;i--){
    const b=ebullets[i];b.x+=b.vx*eff;b.y+=b.vy*eff;b.life-=eff;
    if(b.life<=0||(solid(b.x,b.y)&&!b.wallpass)){spark(b.x,b.y,'#f8a',4,60);ebullets.splice(i,1);continue;}
    // Parry check (before damage)
    let parried=false;
    for(const p of players){
      if(!p.alive||p.parryT<=0)continue;
      if(Math.hypot(b.x-p.x,b.y-p.y)<18){
        // reflect bullet back as player bullet
        bullets.push({x:b.x,y:b.y,vx:-b.vx*1.1,vy:-b.vy*1.1,life:1.2,dmg:b.dmg*1.5,owner:p,trail:[]});
        ebullets.splice(i,1);
        spark(b.x,b.y,'#fff',10,70);SE.clang();
        flash('PARRY!','#fff');
        parried=true;break;
      }
    }
    if(parried)continue;
    for(const p of players){
      if(!p.alive)continue;
      const dx=p.x-b.x,dy=p.y-b.y;
      if(dx*dx+dy*dy<(p.r+1.5)**2){ebullets.splice(i,1);damagePlayer(p,b.dmg);break;}
    }
  }

  // ── Enemy AI ──
  const _callHp=callAggroTimer>0?humanPlayer():null;
  for(const e of enemies){
    let tgt=null,td=Infinity;
    if(_callHp&&fog[(e.y/TILE|0)*MAPW+(e.x/TILE|0)]>0){tgt=_callHp;}
    else for(const p of players){if(!p.alive)continue;const d=(p.x-e.x)**2+(p.y-e.y)**2;if(d<td){td=d;tgt=p;}}
    if(!tgt){e.vx*=.9;e.vy*=.9;moveObj(e,eff);continue;}
    const dx=tgt.x-e.x,dy=tgt.y-e.y,d=Math.hypot(dx,dy)||1;
    e.ang=Math.atan2(dy,dx);e.atkCd=Math.max(0,e.atkCd-eff);e.hit=Math.max(0,e.hit-eff);e.anim+=eff;
    if(e.type==='poison'){
      e.vx=Math.cos(e.ang)*e.spd;e.vy=Math.sin(e.ang)*e.spd;
      if(d<e.r+tgt.r+1&&e.atkCd<=0){damagePlayer(tgt,e.dmg);e.atkCd=.9;}
      e.pudCd-=eff;
      if(e.pudCd<=0){poisonPuddles.push({x:e.x,y:e.y,t:6,damageCd:0});e.pudCd=0.7;}
    } else if(e.type==='shooter'){
      const s=e.spd,w=70;
      if(d<w-10){e.vx=-Math.cos(e.ang)*s;e.vy=-Math.sin(e.ang)*s;}
      else if(d>w+10){e.vx=Math.cos(e.ang)*s;e.vy=Math.sin(e.ang)*s;}
      else{e.vx*=.8;e.vy*=.8;}
      if(d<105&&e.atkCd<=0&&hasLoS(e.x,e.y,tgt.x,tgt.y)){
        ebullets.push({x:e.x,y:e.y,vx:Math.cos(e.ang+rnd(-.05,.05))*90,vy:Math.sin(e.ang+rnd(-.05,.05))*90,life:1.4,dmg:e.dmg});
        e.atkCd=1.4;spark(e.x,e.y,'#f88',3,40);
      }
    } else if(e.type==='zombie'){
      // ── CHAOS: switch ability periodically ──
      if(e.zombiePers==='moody'){
        e._chaosT=(e._chaosT||0)-eff;
        if(e._chaosT<=0){e._chaosT=2.5+Math.random()*2;e._zombieAbility=randPers(true);flash(e.fromName+'! '+e._zombieAbility.toUpperCase(),'#f44');}
      }
      const za=e._zombieAbility||'berserker';

      // ── CORE-EATER (prospector): target cores, eat them ──
      if(za==='prospector'){
        const core=cores.length?cores.reduce((b,c)=>Math.hypot(c.x-e.x,c.y-e.y)<Math.hypot(b.x-e.x,b.y-e.y)?c:b,cores[0]):null;
        if(core){
          const ca=Math.atan2(core.y-e.y,core.x-e.x);
          e.vx=Math.cos(ca)*e.spd;e.vy=Math.sin(ca)*e.spd;
          if(Math.hypot(core.x-e.x,core.y-e.y)<e.r+8){spark(core.x,core.y,'#f80',6,60);cores.splice(cores.indexOf(core),1);flash('CORE EATEN!','#f44');}
          e.fireCd=Math.max(0,(e.fireCd||0)-eff);
          if(d<110&&e.fireCd<=0&&hasLoS(e.x,e.y,tgt.x,tgt.y)){
            const a=Math.atan2(tgt.y-e.y,tgt.x-e.x)+rnd(-e.weapon.spread,e.weapon.spread);
            ebullets.push({x:e.x,y:e.y,vx:Math.cos(a)*e.weapon.spd,vy:Math.sin(a)*e.weapon.spd,life:e.weapon.range,dmg:e.weapon.dmg});
            e.fireCd=e.weapon.fireCd;spark(e.x,e.y,'#f80',2,30);
          }
          if(d<e.r+tgt.r+2&&e.atkCd<=0){damagePlayer(tgt,e.dmg);e.atkCd=.5;}
        } else {
          e.vx=Math.cos(e.ang)*e.spd;e.vy=Math.sin(e.ang)*e.spd;
          e.fireCd=Math.max(0,(e.fireCd||0)-eff);
          if(d<130&&e.fireCd<=0&&hasLoS(e.x,e.y,tgt.x,tgt.y)){
            const a=e.ang+rnd(-e.weapon.spread,e.weapon.spread);
            ebullets.push({x:e.x,y:e.y,vx:Math.cos(a)*e.weapon.spd,vy:Math.sin(a)*e.weapon.spd,life:e.weapon.range,dmg:e.weapon.dmg});
            e.fireCd=e.weapon.fireCd;spark(e.x,e.y,'#f80',2,30);
          }
          if(d<e.r+tgt.r+1&&e.atkCd<=0){damagePlayer(tgt,e.dmg);e.atkCd=.5;}
        }
      }
      // ── GATEKEEPER (bodyguard): move to exit, block it ──
      else if(za==='bodyguard'){
        const ex=exits[0];
        if(ex&&!e._gateReached){
          const da=Math.atan2(ex.y-e.y,ex.x-e.x);const dd=Math.hypot(ex.x-e.x,ex.y-e.y);
          if(dd>18){e.vx=Math.cos(da)*e.spd;e.vy=Math.sin(da)*e.spd;}
          else{e.vx*=.2;e.vy*=.2;e._gateReached=true;flash(e.fromName+' BLOCKS EXIT!','#f44');}
        } else if(e._gateReached){
          e.vx=0;e.vy=0; // flow field will navigate at full spd when no LoS
          e.fireCd=Math.max(0,(e.fireCd||0)-eff);
          if(d<160&&e.fireCd<=0&&hasLoS(e.x,e.y,tgt.x,tgt.y)){
            const a=Math.atan2(tgt.y-e.y,tgt.x-e.x)+rnd(-.1,.1);
            ebullets.push({x:e.x,y:e.y,vx:Math.cos(a)*e.weapon.spd,vy:Math.sin(a)*e.weapon.spd,life:e.weapon.range,dmg:e.weapon.dmg});
            e.fireCd=e.weapon.fireCd;spark(e.x,e.y,'#f88',3,40);
          }
        }
        if(d<e.r+tgt.r+2&&e.atkCd<=0){damagePlayer(tgt,e.dmg*1.5);e.atkCd=.4;}
      }
      // ── WALL-HACK (sniper): wall-penetrating high-damage shots ──
      else if(za==='sniper'){
        if(d>80){e.vx=Math.cos(e.ang)*e.spd*.5;e.vy=Math.sin(e.ang)*e.spd*.5;}
        else{e.vx*=.8;e.vy*=.8;}
        e.fireCd=Math.max(0,(e.fireCd||0)-eff);
        if(d<240&&e.fireCd<=0){
          const a=Math.atan2(tgt.y-e.y,tgt.x-e.x);
          // wall-piercing: no moveObj collision, wallpass flag
          ebullets.push({x:e.x,y:e.y,vx:Math.cos(a)*180,vy:Math.sin(a)*180,life:2.2,dmg:e.weapon.dmg*2.8,wallpass:true});
          e.fireCd=2.2;spark(e.x,e.y,'#f00',6,80);shake=Math.max(shake,1.5);
        }
        if(d<e.r+tgt.r+1&&e.atkCd<=0){damagePlayer(tgt,e.dmg);e.atkCd=.5;}
      }
      // ── BLOODHOUND (berserker): 1.5x speed constant chase ──
      else {
        const s=e.spd*1.5;
        e.vx=Math.cos(e.ang)*s;e.vy=Math.sin(e.ang)*s;
        e.fireCd=Math.max(0,(e.fireCd||0)-eff);
        if(d<120&&e.fireCd<=0&&hasLoS(e.x,e.y,tgt.x,tgt.y)){
          const a=e.ang+rnd(-e.weapon.spread,e.weapon.spread);
          ebullets.push({x:e.x,y:e.y,vx:Math.cos(a)*e.weapon.spd,vy:Math.sin(a)*e.weapon.spd,life:e.weapon.range,dmg:e.weapon.dmg});
          e.fireCd=e.weapon.fireCd*.7;spark(e.x,e.y,'#f44',2,30);
        }
        if(d<e.r+tgt.r+1&&e.atkCd<=0){damagePlayer(tgt,e.dmg);e.atkCd=.4;e.vx-=Math.cos(e.ang)*40;e.vy-=Math.sin(e.ang)*40;}
      }
    } else if(e.type==='boss'){
      // ── Phase 2 trigger at 50% HP ──
      if(!e._phase2&&e.hp<e._maxHp*.5){
        e._phase2=true;
        flash('★ PHASE 2 ★','#f44');flash('ENRAGED!','#f80');
        shake=Math.max(shake,7);
      }
      const bSpd=e._phase2?e.spd*1.5:e.spd;
      e.vx=Math.cos(e.ang)*bSpd;e.vy=Math.sin(e.ang)*bSpd;
      // Break surrounding wall tiles
      e.breakCd=Math.max(0,(e.breakCd||0)-eff);
      const btx=(e.x/TILE)|0,bty=(e.y/TILE)|0;
      for(let dy2=-1;dy2<=1;dy2++)for(let dx2=-1;dx2<=1;dx2++){
        const nx=btx+dx2,ny=bty+dy2;
        if(nx<1||ny<1||nx>=MAPW-1||ny>=MAPH-1)continue;
        if(map[ny*MAPW+nx]===1){
          map[ny*MAPW+nx]=0;fog[ny*MAPW+nx]=1;
          if(e.breakCd<=0){spark(nx*TILE+8,ny*TILE+8,'#c84',6,65);e.breakCd=.1;shake=Math.max(shake,1.5);}
        }
      }
      // Devour cores — wider range in phase 2
      const coreEatR=e._phase2?e.r+28:e.r+8;
      for(let i=cores.length-1;i>=0;i--){const c=cores[i];if(Math.hypot(c.x-e.x,c.y-e.y)<coreEatR){spark(c.x,c.y,'#f80',4,40);cores.splice(i,1);if(e._phase2)flash('CORE DEVOURED!','#f44');}}
      for(let i=pickups.length-1;i>=0;i--){const pk=pickups[i];if(Math.hypot(pk.x-e.x,pk.y-e.y)<e.r+8){spark(pk.x,pk.y,'#622',3,30);pickups.splice(i,1);}}
      // Phase 2: spread shot burst
      if(e._phase2){
        e._shootCd=Math.max(0,(e._shootCd||0)-eff);
        if(e._shootCd<=0){
          for(let k=-2;k<=2;k++){const a=e.ang+k*.28;ebullets.push({x:e.x,y:e.y,vx:Math.cos(a)*115,vy:Math.sin(a)*115,life:1.6,dmg:e.dmg*.55});}
          e._shootCd=2.2;spark(e.x,e.y,'#f80',8,80);
        }
      }
      // Smash attack
      if(d<e.r+tgt.r+2&&e.atkCd<=0){damagePlayer(tgt,e.dmg);e.atkCd=1.0;shake=Math.max(shake,3);e.vx-=Math.cos(e.ang)*45;e.vy-=Math.sin(e.ang)*45;}
      // Direct position update (no wall check)
      e.x+=e.vx*eff;e.y+=e.vy*eff;
      e.x=Math.max(TILE,Math.min(MAPW*TILE-TILE,e.x));e.y=Math.max(TILE,Math.min(MAPH*TILE-TILE,e.y));
      e.hit=Math.max(0,e.hit-eff);e.anim+=eff;
      // boss pushes players away (boss itself doesn't move)
      for(const p of players){if(!p.alive)continue;const ox=p.x-e.x,oy=p.y-e.y,dd=Math.hypot(ox,oy),mn=e.r+p.r;if(dd>0&&dd<mn){const push=mn-dd;const npx=p.x+ox/dd*push,npy=p.y+oy/dd*push;if(!hitsWall(npx,npy,p.r)){p.x=npx;p.y=npy;}}}
      continue; // skip standard moveObj + enemy separation
    } else {
      e.vx=Math.cos(e.ang)*e.spd;e.vy=Math.sin(e.ang)*e.spd;
      if(hitsWall(e.x+e.vx*.05,e.y+e.vy*.05,e.r)){e.vx=Math.cos(e.ang+Math.PI/2)*e.spd*.6;e.vy=Math.sin(e.ang+Math.PI/2)*e.spd*.6;}
      if(d<e.r+tgt.r+1&&e.atkCd<=0){damagePlayer(tgt,e.dmg);e.atkCd=.7;e.vx-=Math.cos(e.ang)*55;e.vy-=Math.sin(e.ang)*55;}
    }
    // Flow field: redirect movement through corridors when no LoS
    if(!hasLoS(e.x,e.y,tgt.x,tgt.y)){
      const fi=((e.y/TILE|0)*MAPW+(e.x/TILE|0))*2;
      const fdx=flowField[fi],fdy=flowField[fi+1];
      if(fdx||fdy){const spd=Math.hypot(e.vx,e.vy)||e.spd;const fl=Math.hypot(fdx,fdy);e.vx=fdx/fl*spd;e.vy=fdy/fl*spd;}
      else{if(!e._wanderA||Math.random()<.015)e._wanderA=Math.random()*Math.PI*2;const spd=e.spd*.6;e.vx=Math.cos(e._wanderA)*spd;e.vy=Math.sin(e._wanderA)*spd;}
    }
    moveObj(e,eff);
    // separation: enemy-enemy
    for(const o of enemies){if(o===e)continue;const ox=e.x-o.x,oy=e.y-o.y,dd=Math.hypot(ox,oy),mn=e.r+o.r;if(dd>0&&dd<mn){const push=(mn-dd)*.5;e.x+=ox/dd*push;e.y+=oy/dd*push;}}
    // separation: enemy-player (both directions)
    for(const p of players){if(!p.alive)continue;const ox=e.x-p.x,oy=e.y-p.y,dd=Math.hypot(ox,oy),mn=e.r+p.r;if(dd>0&&dd<mn){const push=(mn-dd)*.5;e.x+=ox/dd*push;e.y+=oy/dd*push;const npx=p.x-ox/dd*push,npy=p.y-oy/dd*push;if(!hitsWall(npx,npy,p.r)){p.x=npx;p.y=npy;}}}
  }

  // ── Gatekeepers ──
  for(const gk of gatekeepers){
    gk.cd-=eff;
    if(gk.cd<=0){
      gk.cd=2.5;
      for(let a=0;a<8;a++){const ang=a*Math.PI/4;ebullets.push({x:gk.x,y:gk.y,vx:Math.cos(ang)*80,vy:Math.sin(ang)*80,life:1.8,dmg:8});}
      spark(gk.x,gk.y,'#f44',8,60);
    }
    // contact damage + knockback
    for(const p of players){
      if(!p.alive||p.iframe>0)continue;
      const dx=p.x-gk.x,dy=p.y-gk.y,dist=Math.hypot(dx,dy);
      if(dist<8){
        damagePlayer(p,15);
        p.iframe=.6;
        // push player away
        const nx=dist>0?dx/dist:1,ny=dist>0?dy/dist:0;
        const pushDist=18;
        const px2=p.x+nx*pushDist,py2=p.y+ny*pushDist;
        if(!hitsWall(px2,p.y,p.r))p.x=px2;
        if(!hitsWall(p.x,py2,p.r))p.y=py2;
        spark(p.x,p.y,'#f44',5,55);
      }
    }
  }

  // ── Poison puddles ──
  for(let i=poisonPuddles.length-1;i>=0;i--){
    const pd=poisonPuddles[i];pd.t-=eff;
    if(pd.t<=0){poisonPuddles.splice(i,1);continue;}
    pd.damageCd=(pd.damageCd||0)-eff;
    for(const p of players){
      if(!p.alive)continue;
      if((p.x-pd.x)**2+(p.y-pd.y)**2<10*10){
        if(pd.damageCd<=0){damagePlayer(p,3);pd.damageCd=0.5;}
      }
    }
  }

  // ── NPC state machine ──
  for(let i=npcs.length-1;i>=0;i--){
    const npc=npcs[i];
    if(npc.state==='idle'){
      let near=false;
      for(const p of players){if(p.alive&&Math.hypot(p.x-npc.x,p.y-npc.y)<24){near=true;break;}}
      if(near){
        npc.talkT+=eff;
        npc.msg='...ODD TO FIND ANOTHER FOOL DOWN HERE';
        if(npc.talkT>2.5&&!npc.hasSpokenFollow){
          npc.hasSpokenFollow=true;
          npc.msg='FOLLOW ME.';
          setTimeout(()=>{
            if(npc.state==='idle'){
              npc.state='leading';
              // head in a random walkable direction
              npc.dir=Math.random()*Math.PI*2;
              npc.msg='';
            }
          },1800);
        }
      }else{
        if(!npc.hasSpokenFollow)npc.msg='';
      }
    }else if(npc.state==='leading'){
      npc.leadT+=eff;
      // move forward, bounce off walls
      const spd=28;
      const nx=npc.x+Math.cos(npc.dir)*spd*eff;
      const ny=npc.y+Math.sin(npc.dir)*spd*eff;
      if(!hitsWall(nx,ny,2)){npc.x=nx;npc.y=ny;}
      else{npc.dir+=Math.PI*.5+rnd(-.3,.3);}
      // occasional "THIS WAY!" bubble
      npc.msg=(npc.leadT%4<.6)?'THIS WAY!':'';
      if(npc.leadT>npc.leadDur){
        // FALL INTO CRACK
        SE.npcFall();
        flash('AAAAGGH!!','#fa4');
        // scatter loot
        const lootTypes=['core','core','core','health','health'];
        for(let j=0;j<2+rndi(0,3);j++){
          const ang=Math.random()*Math.PI*2,d=rnd(6,20);
          pickups.push({type:lootTypes[rndi(0,lootTypes.length)],x:npc.x+Math.cos(ang)*d,y:npc.y+Math.sin(ang)*d,t:0});
        }
        // crack particles (dark earth)
        for(let j=0;j<16;j++){
          const ang=Math.random()*Math.PI*2;
          particles.push({x:npc.x,y:npc.y,vx:Math.cos(ang)*rnd(8,28),vy:Math.sin(ang)*rnd(8,28),life:rnd(.5,1.4),c:j%3===0?'#543':'#321'});
        }
        npcs.splice(i,1);
      }
    }
  }

  // ── Pickups ──
  for(let i=pickups.length-1;i>=0;i--){
    const p=pickups[i];p.t+=eff;
    for(const pl of players){if(!pl.alive)continue;const dx=pl.x-p.x,dy=pl.y-p.y;
      if(dx*dx+dy*dy<36){
        if(p.type==='core'){coresCollected++;flash('CORE '+coresCollected+'/'+coresNeeded,'#0ff');}
        else if(p.type==='health'){pl.hp=Math.min(pl.maxHp,pl.hp+25);flash(pl.pal.name+' +25HP',pl.pal.body);}
        else if(p.type==='revive'){pl.hasRevive=true;flash(pl.pal.name+' GOT REVIVE!','#ff0');spark(pl.x,pl.y,'#ff0',12,100);}
        pickups.splice(i,1);break;
      }
    }
  }
  // World cores
  for(let i=cores.length-1;i>=0;i--){
    const c=cores[i];c.t+=eff;
    for(const pl of players){if(!pl.alive)continue;const dx=pl.x-c.x,dy=pl.y-c.y;
      if(dx*dx+dy*dy<64){cores.splice(i,1);coresCollected++;flash('CORE '+coresCollected+'/'+coresNeeded,'#0ff');break;}
    }
  }
  if(!monsterHouse&&!exitOpen&&coresCollected>=coresNeeded){exitOpen=true;flash('EXIT ONLINE','#ff0');}

  // ── Cold sleep pods ──
  // Update active pod selection
  if(podSelectState){
    const ps=podSelectState;
    const adx=ps.activator.x-ps.pod.x,ady=ps.activator.y-ps.pod.y;
    if(!ps.activator.alive||adx*adx+ady*ady>144){podSelectState=null;_podPadPrev={};}
    else{
      ps.moveCd=(ps.moveCd||0)-dt;
      const gps=navigator.getGamepads?navigator.getGamepads():[];
      let gp=null;for(let i=0;i<gps.length;i++)if(gps[i]){gp=gps[i];break;}
      const edge=(k,v)=>{const r=v&&!_podPadPrev[k];_podPadPrev[k]=!!v;return r;};
      const ax=gp?gp.axes[0]||0:0;
      const left=edge('L',keys.ArrowLeft||(gp&&((gp.buttons[14]?.pressed)||ax<-.5)));
      const right=edge('R',keys.ArrowRight||(gp&&((gp.buttons[15]?.pressed)||ax>.5)));
      const confirm=edge('A',(keys.Enter||keys.NumpadEnter)||(gp&&gp.buttons[0]?.pressed));
      const cancel=edge('B',keys.Escape||(gp&&gp.buttons[1]?.pressed));
      if(left||right){ps.cursor=((ps.cursor+(right?1:-1))+ps.candidates.length)%ps.candidates.length;}
      if(confirm){
        const dead=ps.candidates[ps.cursor];
        ps.pod.used=true;
        dead.alive=true;dead.hp=dead.maxHp*.5;dead.iframe=1;
        dead.x=ps.pod.x+rnd(-10,10);dead.y=ps.pod.y+rnd(-10,10);
        const newPers=randPers();
        dead.controller=new CPUController(newPers);
        spark(ps.pod.x,ps.pod.y,'#0ff',16,80);
        flash('COLD SLEEP: '+dead.pal.name+' REVIVED','#0ff');
        flash(dead.pal.name+': '+PERS_LABEL[newPers],dead.pal.body);
        podSelectState=null;_podPadPrev={};
      }
      if(cancel){podSelectState=null;_podPadPrev={};}
    }
  }
  for(const pod of pods){
    if(pod.used)continue;
    pod.t+=eff;
    for(const pl of players){if(!pl.alive)continue;const dx=pl.x-pod.x,dy=pl.y-pod.y;
      if(dx*dx+dy*dy<64){
        const deadCPUs=players.filter(p=>!p.alive&&!p.isHuman);
        if(deadCPUs.length===0)break;
        if(deadCPUs.length===1){
          pod.used=true;
          const dead=deadCPUs[0];
          dead.alive=true;dead.hp=dead.maxHp*.5;dead.iframe=1;
          dead.x=pod.x+rnd(-10,10);dead.y=pod.y+rnd(-10,10);
          const newPers=randPers();
          dead.controller=new CPUController(newPers);
          spark(pod.x,pod.y,'#0ff',16,80);
          flash('COLD SLEEP: '+dead.pal.name+' REVIVED','#0ff');
          flash(dead.pal.name+': '+PERS_LABEL[newPers],dead.pal.body);
        }else if(!podSelectState||podSelectState.pod!==pod){
          podSelectState={pod,candidates:deadCPUs,cursor:0,activator:pl};
        }
        break;
      }
    }
  }

  // ── Exit / Screw ──
  if(exitOpen&&exits[0]){
    const ex=exits[0];
    for(const pl of players){if(!pl.alive||!pl.isHuman)continue;const dx=pl.x-ex.x,dy=pl.y-ex.y;
      if(dx*dx+dy*dy<80){
        if(stage===MAX_DEPTH){/* screw handled below */}
        else{nextStage();return;}
      }
    }
  }
  if(screwObj){
    screwObj.t+=eff;
    for(const pl of players){if(!pl.alive)continue;const dx=pl.x-screwObj.x,dy=pl.y-screwObj.y;
      if(dx*dx+dy*dy<64){gameCleared();return;}
    }
  }

  // ── Particles / messages ──
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];p.x+=p.vx*eff;p.y+=p.vy*eff;p.vx*=.96;p.vy*=.96;if(p.sm)p.vy-=30*eff;p.life-=eff;if(p.life<=0)particles.splice(i,1);
  }
  for(let i=messages.length-1;i>=0;i--){messages[i].t+=dt;if(messages[i].t>2.2)messages.splice(i,1);}
  shake*=Math.pow(.001,dt);

  // ── Camera: follow human player only, with aim look-ahead ──
  const _fp=players.find(p=>p.alive&&p.isHuman)||players.find(p=>p.alive);
  if(_fp){
    const tx=_fp.x+Math.cos(_fp.aim)*14,ty=_fp.y+Math.sin(_fp.aim)*14;
    camX+=(tx-camX)*Math.min(1,dt*6);camY+=(ty-camY)*Math.min(1,dt*6);
  }

  // ── Game over ──
  const _goCheck=attractDemo?!players.some(p=>p.alive):!players.some(p=>p.alive&&p.isHuman);
  if(_goCheck){running=false;gameOver();}
}

function damagePlayer(p,d){
  if(p.iframe>0)return;
  p.hp-=d;p.iframe=.4;shake=Math.max(shake,2);blood(p.x,p.y);
  if(!p.isHuman)p._hit=true;
  if(p.hp<=0){
    // Revive item auto-activates
    if(p.hasRevive){
      p.hp=Math.ceil(p.maxHp*.5);p.hasRevive=false;p.iframe=1.5;
      flash(p.pal.name+' REVIVED!','#ff0');
      spark(p.x,p.y,'#ff0',20,150);spark(p.x,p.y,'#fff',8,80);
      shake=Math.max(shake,3);return;
    }
    p.hp=0;p.alive=false;
    if(!p.isHuman){
      // trigger bullet time
      bulletTime={timer:3.5,victimName:p.pal.name,victimPal:p.pal};
      setTimeout(()=>{if(bulletTime)flash('ZOMBIE RISING','#f44');},500);
    }
    enemies.push(makeZombie(p));
    flash(p.pal.name+' TURNED!','#f44');
    spark(p.x,p.y,'#c22',20,120);
  }
}

function mhEnemyType(){
  const r=Math.random();
  if(stage>=60)return r<.25?'brute':r<.6?'shooter':'runner';
  if(stage>=30)return r<.3?'runner':r<.65?'shooter':'grunt';
  return r<.5?'grunt':r<.8?'runner':'shooter';
}
function spawnMH(){
  // Spawn enemy anywhere in open arena, away from center
  const cx=(MAPW>>1)*TILE+8,cy=(MAPH>>1)*TILE+8;
  for(let t=0;t<200;t++){
    const tx=rndi(2,MAPW-2),ty=rndi(2,MAPH-2);
    if(map[ty*MAPW+tx]!==0&&map[ty*MAPW+tx]!==2)continue;
    const wx=tx*TILE+8,wy=ty*TILE+8;
    if(Math.hypot(wx-cx,wy-cy)<60)continue;
    enemies.push(makeEnemy(mhEnemyType(),wx,wy));return;
  }
}

function nextStage(){
  const wasMH=monsterHouse;
  stage++;
  // Determine monster house for new stage
  const isBoss=stage%10===0||stage===99;
  monsterHouse=!isBoss&&stage>1&&!wasMH&&Math.random()<0.2;
  monsterHouseCleared=false;
  if(monsterHouse)mhSpawnPending=1; // prevent premature clear before spawn timeout fires
  if(!attractDemo)PSG.play(stage);saveGame();
  // Re-roll moody sub-ability each floor
  const msgs=[];
  for(const p of players){
    if(!p.alive||p.isHuman)continue;
    if(p.controller.personality==='moody'){
      p.controller.rerollMoody();
      msgs.push(p.pal.name+' MOODY:'+p.controller.ability);
    }
  }
  bullets=[];ebullets=[];enemies=[];particles=[];pickups=[];messages=[];
  genMap();spawnT=.5;
  for(const p of players){if(!p.alive)continue;p.fireCd=0;p.iframe=1;}
  let cx=0,cy=0,n=0;for(const p of players){if(!p.alive)continue;cx+=p.x;cy+=p.y;n++;}
  if(n){camX=cx/n;camY=cy/n;}
  flash('DEPTH '+stage,stage===MAX_DEPTH?'#ff0':'#0ff');
  if(stage===MAX_DEPTH)flash('THE SCREW AWAITS','#ff0');
  if(secretWallPos)flash('DRIVER HIDDEN THIS FLOOR','#ffd700');
  setTimeout(()=>{for(const m of msgs)flash(m,'#fa0');},600);
  // Monster house: announce immediately, spawn after brief delay
  if(monsterHouse){
    flash('!! MONSTER HOUSE !!','#f44');
    flash('EXTERMINATE ALL','#f88');
    shake=Math.max(shake,4);
    setTimeout(()=>{
      if(!running)return;
      const count=Math.min(40,Math.round(20+stage*.2));
      mhSpawnPending=count;
      for(let i=0;i<count;i++)setTimeout(()=>{mhSpawnPending--;if(running&&!monsterHouseCleared)spawnMH();},200+i*120);
    },400);
  }
  // Spawn boss on multiples of 10 and D99
  if(stage%10===0||stage===99){
    setTimeout(()=>{
      if(!running)return;
      const b=makeBoss();enemies.push(b);
      flash('★ BOSS APPROACHES ★','#f44');
      flash('WALL-BREAKER INCOMING','#f88');
      shake=Math.max(shake,3);
      if(!attractDemo)PSG.boss(stage);
    },1200);
  }
}

function callCPU(){
  if(callCooldown>0||!running||paused)return;
  const hp=humanPlayer();if(!hp)return;
  let called=0;
  for(const p of players){if(!p.alive||p.isHuman)continue;p.rushing=true;called++;}
  if(!called){flash('NO ALLIES','#555');return;}
  callCooldown=60;callAggroTimer=8;
  flash('CALLING ALLIES!','#0ff');
  spark(hp.x,hp.y,'#0ff',16,110);
}
function _saveBest(){
  const prev=+(localStorage.getItem('lores_best')||0);
  if(stage>prev){localStorage.setItem('lores_best',stage);return true;}
  return false;
}
function gameOver(){
  PSG.stop();clearSave();
  gameOverState=true;
  const newRecord=!attractDemo&&_saveBest();
  gameOverMsg='DEPTH:'+stage+'  KILLS:'+totalKills+(newRecord?' *NEW BEST*':'');
}
function gameCleared(){
  PSG.stop();clearSave();running=false;gameWon=true;
  if(!attractDemo)_saveBest();
  winMsg='DEPTH '+stage+' / KILLS '+totalKills+' / ALLIES '+players.filter(p=>p.alive&&!p.isHuman).length+' SURVIVED';
}

