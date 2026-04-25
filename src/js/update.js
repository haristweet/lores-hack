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
  if(db&&!p.edge.dash&&p.dashCd<=0&&(mx||my)){p.dashT=.18;p.dashCd=1.2;p.iframe=Math.max(p.iframe,.18);smoke(p.x,p.y);}
  p.edge.dash=db;
  if(p.dashT>0)spd*=3.2;
  // Charge button (need early peek to apply speed penalty)
  const chB=p.controller.charge(p);
  if(chB&&p.dashT<=0)spd*=0.35;
  p.vx=mx*spd;p.vy=my*spd;
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
    p.fireCd=w.fireCd*(driverActive?1.15:1);p.muzzle=.08;
    shake=Math.max(shake,.8);
    p.vx-=Math.cos(p.aim)*7;p.vy-=Math.sin(p.aim)*7;
  }
  p.iframe=Math.max(0,p.iframe-dt);
  p.muzzle=Math.max(0,p.muzzle-dt);
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
    if(d>0&&d<mn){const push=(mn-d)*.5;a.x+=dx/d*push;a.y+=dy/d*push;b.x-=dx/d*push;b.y-=dy/d*push;}
  }

  // ── Enemy spawn ──
  spawnT-=eff;
  const maxE=Math.min(40,Math.floor(8+stage*.32));
  const spawnInterval=Math.max(.3,1.4-stage*.011);
  if(!monsterHouse&&spawnT<=0&&enemies.length<maxE){
    spawnT=spawnInterval;
    const r=Math.random();
    spawnEnemy(r<.45?'grunt':r<.75?'runner':r<.92?'shooter':'brute');
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
          // Destroy secret wall, drop driver
          map[secretWallPos.ty*MAPW+secretWallPos.tx]=0;
          driverActive=true;
          spark(bTx*TILE+8,bTy*TILE+8,'#ffd700',24,140);
          flash('DRIVER FOUND!','#ffd700');flash('3-WAY SHOT ACTIVE!','#ffd700');
          SE.driver();secretWallPos=null;
        }else{
          spark(b.x,b.y,'#ff8',2,50);
        }
      }else{spark(b.x,b.y,'#ff8',4,80);}
      bullets.splice(i,1);continue;
    }
    let hit=false;
    for(let j=enemies.length-1;j>=0;j--){
      const e=enemies[j];const dx=e.x-b.x,dy=e.y-b.y;
      if(dx*dx+dy*dy<(e.r+(b.r||1.5))**2){
        e.hp-=b.dmg;e.hit=.1;e.vx+=b.vx*.05;e.vy+=b.vy*.05;
        blood(b.x,b.y);
        if(e.hp<=0){
          e._dead=true;enemies.splice(j,1);
          totalKills++;if(b.owner)b.owner.kills++;
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
    if(e.type==='shooter'){
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
          e.vx*=.1;e.vy*=.1;
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
        if(d>20){e.vx=Math.cos(e.ang)*s;e.vy=Math.sin(e.ang)*s;}
        else{e.vx*=.7;e.vy*=.7;}
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
      for(const p of players){if(!p.alive)continue;const ox=p.x-e.x,oy=p.y-e.y,dd=Math.hypot(ox,oy),mn=e.r+p.r;if(dd>0&&dd<mn){const push=mn-dd;p.x+=ox/dd*push;p.y+=oy/dd*push;}}
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
    }
    moveObj(e,eff);
    // separation: enemy-enemy
    for(const o of enemies){if(o===e)continue;const ox=e.x-o.x,oy=e.y-o.y,dd=Math.hypot(ox,oy),mn=e.r+o.r;if(dd>0&&dd<mn){const push=(mn-dd)*.5;e.x+=ox/dd*push;e.y+=oy/dd*push;}}
    // separation: enemy-player (both directions)
    for(const p of players){if(!p.alive)continue;const ox=e.x-p.x,oy=e.y-p.y,dd=Math.hypot(ox,oy),mn=e.r+p.r;if(dd>0&&dd<mn){const push=(mn-dd)*.5;e.x+=ox/dd*push;e.y+=oy/dd*push;p.x-=ox/dd*push;p.y-=oy/dd*push;}}
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
  if(!exitOpen&&coresCollected>=coresNeeded){exitOpen=true;flash('EXIT ONLINE','#ff0');}

  // ── Cold sleep pods ──
  for(const pod of pods){
    if(pod.used)continue;
    pod.t+=eff;
    for(const pl of players){if(!pl.alive)continue;const dx=pl.x-pod.x,dy=pl.y-pod.y;
      if(dx*dx+dy*dy<64){
        const dead=players.find(p=>!p.alive&&!p.isHuman);
        if(dead){
          pod.used=true;
          dead.alive=true;dead.hp=dead.maxHp*.5;dead.iframe=1;
          dead.x=pod.x+rnd(-10,10);dead.y=pod.y+rnd(-10,10);
          const newPers=randPers();
          dead.controller=new CPUController(newPers);
          spark(pod.x,pod.y,'#0ff',16,80);
          flash('COLD SLEEP: '+dead.pal.name+' REVIVED','#0ff');
          flash(dead.pal.name+': '+PERS_LABEL[newPers],dead.pal.body);
        }
        break;
      }
    }
  }

  // ── Exit / Screw ──
  if(exitOpen&&exits[0]){
    const ex=exits[0];
    for(const pl of players){if(!pl.alive)continue;const dx=pl.x-ex.x,dy=pl.y-ex.y;
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
function gameOver(){
  PSG.stop();clearSave();
  gameOverState=true;
  gameOverMsg='DEPTH '+stage+' / KILLS '+totalKills;
}
function gameCleared(){
  PSG.stop();clearSave();running=false;gameWon=true;
  winMsg='DEPTH '+stage+' / KILLS '+totalKills+' / ALLIES '+players.filter(p=>p.alive&&!p.isHuman).length+' SURVIVED';
}

