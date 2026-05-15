// ═══════════════════════════════════════════════
//  UPDATE
// ═══════════════════════════════════════════════
function updatePlayer(p,dt){
  if(!p.alive)return;
  if(p.controller.pre)p.controller.pre(p,dt);
  let{x:mx,y:my}=p.controller.move(p);
  const ml=Math.hypot(mx,my);if(ml>1){mx/=ml;my/=ml;}
  let spd=p.spd;
  p.dashCd=Math.max(0,p.dashCd-dt);const _prevDashT=p.dashT;p.dashT=Math.max(0,p.dashT-dt);
  p._dashJustEnded=_prevDashT>0&&p.dashT===0;
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
    const lSpd=laserActive?1.5:1,lRange=laserActive?1.6:1;
    for(const a of angles)bullets.push({x:p.x+ox,y:p.y+oy,vx:Math.cos(a)*w.spd*lSpd,vy:Math.sin(a)*w.spd*lSpd,life:w.range*lRange,dmg:dmg*(driverActive?.7:1)*(laserActive?.8:1),owner:p,trail:[],pierce:laserActive?3:0});
    if(vertidriveActive)bullets.push({x:p.x-ox,y:p.y-oy,vx:Math.cos(p.aim+Math.PI)*w.spd*lSpd,vy:Math.sin(p.aim+Math.PI)*w.spd*lSpd,life:w.range*lRange,dmg:dmg*.8*(laserActive?.8:1),owner:p,trail:[],pierce:laserActive?3:0});
    p.fireCd=w.fireCd*(driverActive?1.15:1);p.muzzle=.08;
    shake=Math.max(shake,.8);
    p.vx-=Math.cos(p.aim)*7;p.vy-=Math.sin(p.aim)*7;
  }
  p.iframe=Math.max(0,p.iframe-dt);
  p.muzzle=Math.max(0,p.muzzle-dt);
  if(p._dcpFlash>0)p._dcpFlash=Math.max(0,p._dcpFlash-dt);
  // Parry
  p.parryCd=Math.max(0,p.parryCd-dt);
  p.parryT=Math.max(0,p.parryT-dt);
  if(p.isHuman&&p.controller.parry){
    const parB=p.controller.parry(p);
    if(parB&&!p.edge.parry&&p.parryCd<=0){
      p.parryT=.18;p.parryCd=1.5;
      spark(p.x,p.y,'#fff',5,35);
      // Dash-cancel parry: 1-frame window after dash ends → massive damage
      if(p._dashJustEnded){
        for(const e of enemies){
          if(Math.hypot(e.x-p.x,e.y-p.y)<35){
            const fa=Math.atan2(e.y-p.y,e.x-p.x);
            e.hp-=200;e.hit=.15;
            if(e.type!=='boss'){
              e._flungVx=Math.cos(fa)*240;e._flungVy=Math.sin(fa)*240;e._flung=0.8;
            }
            spark(e.x,e.y,'#ff0',14,110);
          }
        }
        p._dcpFlash=0.12;
        shake=Math.max(shake,3);
        flash('DASH PARRY!','#ff0');
        SE.dashParry();
        _hasDashParried=true;
      }
    }
    p.edge.parry=parB;
  }
  // CPU auto-parry: activate when a ghost enters close range
  if(!p.isHuman&&p.parryCd<=0){
    const ghostClose=enemies.some(e=>e.type==='ghost'&&Math.hypot(e.x-p.x,e.y-p.y)<25);
    if(ghostClose){p.parryT=.18;p.parryCd=2.0;spark(p.x,p.y,'#adf',5,30);}
  }
  p.shieldAngle=(p.shieldAngle+dt*1.8)%(Math.PI*2);
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
    spawnEnemy(_pickType(stage,Math.random()));
  }
  // ── Monster House clear check ──
  if(monsterHouse&&!monsterHouseCleared&&mhSpawnPending===0&&time>2&&enemies.length===0){
    monsterHouseCleared=true;exitOpen=true;
    const cx=(MAPW>>1)*TILE+8,cy=(MAPH>>1)*TILE+8;
    // Offset reward if it would land on the exit
    let rpx=cx,rpy=cy;
    if(exits[0]&&Math.hypot(exits[0].x-cx,exits[0].y-cy)<TILE*2)rpy=cy-TILE*2.5;
    pickups.push({type:'revive',x:rpx,y:rpy,t:0});
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
          // Prioritise items not yet obtained
          const pool=[];
          if(!driverActive)pool.push('driver');
          if(!overdriveActive)pool.push('overdrive');
          if(!vertidriveActive)pool.push('vertidrive');
          if(!laserActive)pool.push('laser');
          {const _hp=humanPlayer();if(!_hp||_hp.shields.length<4)pool.push('barrier');}
          const _fbHp=humanPlayer();const _fbPool=['driver','overdrive','vertidrive','laser'];if(!_fbHp||_fbHp.shields.length<4)_fbPool.push('barrier');
          const pick=pool.length?pool[rndi(0,pool.length)]:_fbPool[rndi(0,_fbPool.length)];
          if(pick==='driver'){driverActive=true;flash('DRIVER FOUND!','#ffd700');flash('3-WAY SHOT ACTIVE!','#ffd700');}
          else if(pick==='overdrive'){overdriveActive=true;flash('OVERDRIVE FOUND!','#f80');flash('DASH RECHARGE UP!','#f80');}
          else if(pick==='laser'){laserActive=true;flash('LASER FOUND!','#0ff');flash('PIERCE SHOTS ACTIVE!','#0ff');}
          else if(pick==='barrier'){const _hp=humanPlayer();if(_hp){_hp.shields.push({hp:3,maxHp:3});flash('BARRIER FOUND!','#4ff');flash('SHIELD ORB x'+_hp.shields.length,'#4ff');}}
          else{vertidriveActive=true;flash('VERTIDRIVE FOUND!','#f0f');flash('BACK SHOT ACTIVE!','#f0f');}
          spark(bTx*TILE+8,bTy*TILE+8,'#ffd700',24,140);
          SE.driver();secretWallPos=null;
        }else{
          spark(b.x,b.y,'#ff8',2,50);
        }
      }else{spark(b.x,b.y,'#ff8',4,80);}
      bullets.splice(i,1);continue;
    }
    let hit=false;
    // gatekeeper absorbs bullets (parry bullets deal hits)
    for(let gi=gatekeepers.length-1;gi>=0;gi--){
      const gk=gatekeepers[gi];
      if((b.x-gk.x)**2+(b.y-gk.y)**2<6*6){
        if(b.parried){
          gk.parryHits++;
          spark(b.x,b.y,'#fff',6,60);
          gk.hit=0.1;
          if(gk.parryHits>=5){
            spark(gk.x,gk.y,'#f44',16,90);smoke(gk.x,gk.y);
            shake=Math.max(shake,4);
            gatekeepers.splice(gi,1);
          }
        }else{spark(b.x,b.y,'#f44',3,40);}
        bullets.splice(i,1);hit=true;break;
      }
    }
    if(hit)continue;
    for(let j=enemies.length-1;j>=0;j--){
      const e=enemies[j];const dx=e.x-b.x,dy=e.y-b.y;
      if(e.type==='ghost')continue; // immune to all bullets
      if(dx*dx+dy*dy<(e.r+(b.r||1.5))**2){
        e.hp-=b.dmg;e.hit=.1;e.vx+=b.vx*.05;e.vy+=b.vy*.05;
        blood(b.x,b.y);
        if(e.hp<=0){
          e._dead=true;enemies.splice(j,1);
          totalKills++;if(b.owner)b.owner.kills++;
          // splatter: split into 2 mini grunts
          if(e.type==='splatter'&&!e._split){
            for(let k=0;k<2;k++){const a=Math.random()*Math.PI*2;const mini=makeEnemy('grunt',e.x+Math.cos(a)*8,e.y+Math.sin(a)*8);mini.hp=Math.max(1,mini.hp*.4);mini.r=2;mini._split=true;enemies.push(mini);}
          }
          if(e.type==='boss'&&!e._isFake)SE.bossDeath();else SE.kill();
          spark(e.x,e.y,'#c22',12,90);smoke(e.x,e.y);shake=Math.max(shake,2);
          // drops
          const healRate=stage>50?Math.max(.02,.12-(stage-50)*.002):.12;
          if(chance(.08))pickups.push({type:'core',x:e.x,y:e.y,t:0});
          if(chance(healRate))pickups.push({type:'health',x:e.x,y:e.y,t:0});
          // boss drops
          if(e.type==='boss'){
            if(e._isFake){
              // Decoy — no rewards, no game effects
              flash('★ A DECOY! ★','#fa8');shake=Math.max(shake,4);
              spark(e.x,e.y,'#aaa',24,80);
            }else{
              for(let k=0;k<3;k++)pickups.push({type:'health',x:e.x+rnd(-16,16),y:e.y+rnd(-16,16),t:0});
              flash('★ BOSS SLAIN ★','#ff0');shake=Math.max(shake,5);
              if(driverActive){driverActive=false;flash('DRIVER EXPIRED','#888');}
              if(laserActive){laserActive=false;flash('LASER EXPIRED','#888');}
              if(overdriveActive){flash('OVERDRIVE STILL ACTIVE!','#f80');}
              if(vertidriveActive){flash('VERTIDRIVE STILL ACTIVE!','#f0f');}
              if(!attractDemo)PSG.play(stage); // revert to zone BGM
              // restore any devoured cores (partial refund)
              const refund=Math.min(coresNeeded-coresCollected,2);
              if(refund>0){coresCollected+=refund;flash('CORE RECOVERED +'+refund,'#0ff');}
              // open exit if cores already done
              if(coresCollected>=coresNeeded&&!exitOpen){exitOpen=true;flash('EXIT OPEN','#ff0');}
            }
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
        if(b.pierce>0){b.pierce--;spark(b.x,b.y,'#0cf',2,35);}
        else{hit=true;bullets.splice(i,1);break;}
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
        bullets.push({x:b.x,y:b.y,vx:-b.vx*1.1,vy:-b.vy*1.1,life:1.2,dmg:b.dmg*1.5,owner:p,trail:[],parried:true});
        ebullets.splice(i,1);
        spark(b.x,b.y,'#fff',10,70);SE.clang();
        flash('PARRY!','#fff');
        parried=true;break;
      }
    }
    if(parried)continue;
    // Shield orb: block bullet before player takes damage
    let shieldHit=false;
    for(const p of players){
      if(!p.alive||!p.shields.length)continue;
      const n=p.shields.length;
      for(let si=n-1;si>=0;si--){
        const sang=p.shieldAngle+si*(Math.PI*2/n);
        const sx=p.x+Math.cos(sang)*10,sy=p.y+Math.sin(sang)*10;
        if((b.x-sx)**2+(b.y-sy)**2<16){
          p.shields[si].hp--;spark(sx,sy,'#0ff',4,50);SE.clang();
          if(p.shields[si].hp<=0){p.shields.splice(si,1);flash('SHIELD BROKEN!','#f88');spark(sx,sy,'#0ff',10,80);shake=Math.max(shake,2);}
          ebullets.splice(i,1);shieldHit=true;break;
        }
      }
      if(shieldHit)break;
    }
    if(shieldHit)continue;
    for(const p of players){
      if(!p.alive)continue;
      const dx=p.x-b.x,dy=p.y-b.y;
      if(dx*dx+dy*dy<(p.r+(b.r||1.5))**2){ebullets.splice(i,1);damagePlayer(p,b.dmg);break;}
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
    } else if(e.type==='dasher'){
      e.dashCd-=eff;e.dashT=Math.max(0,e.dashT-eff);
      if(e.dashing){
        if(e.dashT<=0||hitsWall(e.x+e.dashVx*eff,e.y+e.dashVy*eff,e.r)){e.dashing=false;e.dashCd=rnd(1.8,2.8);}
        else{e.x+=e.dashVx*eff;e.y+=e.dashVy*eff;}
        if(d<e.r+tgt.r+1&&e.atkCd<=0){damagePlayer(tgt,e.dmg);e.atkCd=.4;}
      }else{
        e.vx=Math.cos(e.ang)*e.spd*.35;e.vy=Math.sin(e.ang)*e.spd*.35;
        if(e.dashCd<=0&&d<150){e.dashing=true;e.dashT=.32;e.dashVx=Math.cos(e.ang)*e.spd*4;e.dashVy=Math.sin(e.ang)*e.spd*4;e.dashCd=rnd(1.8,2.8);spark(e.x,e.y,'#f80',4,50);}
        if(d<e.r+tgt.r+1&&e.atkCd<=0){damagePlayer(tgt,e.dmg*.4);e.atkCd=.5;}
      }
    } else if(e.type==='ghost'){
      e.vx=Math.cos(e.ang)*e.spd;e.vy=Math.sin(e.ang)*e.spd;
      // pass through walls — movement handled after AI block
      if(d<e.r+tgt.r+1&&e.atkCd<=0){damagePlayer(tgt,e.dmg);e.atkCd=.9;}
    } else if(e.type==='bomber'){
      e.vx=Math.cos(e.ang)*e.spd;e.vy=Math.sin(e.ang)*e.spd;
      e.fuseT-=eff;
      if(d<e.r+tgt.r+1&&e.atkCd<=0){damagePlayer(tgt,e.dmg);e.atkCd=.8;}
      if(e.fuseT<=0){e._explode=true;}
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
      const tier=e._tier||'green';
      // ── Phase 2 trigger at 50% HP ──
      if(!e._phase2&&e.hp<e._maxHp*.5){
        e._phase2=true;
        flash('★ PHASE 2 ★','#f44');flash('ENRAGED!','#f80');
        shake=Math.max(shake,7);
      }
      // ── Final boss: split at 50% HP ──
      if(tier==='final'&&!e._splitDone&&e.hp<e._maxHp*.5){
        e._splitDone=true;
        const copy=Object.assign({},e);
        copy._splitDone=true;copy._gkPhase=null;copy._dashState=null;copy._holdT=0;
        e._isFake=Math.random()<.5;copy._isFake=!e._isFake;
        copy.x=e.x+(Math.random()<.5?-36:36);copy.y=e.y+(Math.random()<.5?-28:28);
        copy.vx=0;copy.vy=0;
        enemies.push(copy);
        flash('IT SPLIT!','#f88');flash('WHICH IS REAL??','#fa8');
        shake=Math.max(shake,8);spark(e.x,e.y,'#f8f',24,120);
      }
      const bSpd=e._phase2?e.spd*1.5:e.spd;
      let skipMove=false;

      // ── Attack 3: wall-breaking dash (red/final) ──
      if(tier==='red'||tier==='final'){
        e._dashCd=Math.max(0,(e._dashCd||5)-eff);
        if(!e._dashState&&e._dashCd<=0&&d>40){
          e._dashState='charging';e._chargeT=.35;
          e._dashVx=Math.cos(e.ang);e._dashVy=Math.sin(e.ang);
          e._dashDistLeft=rnd(120,190);
          spark(e.x,e.y,'#f44',8,80);flash('CHARGE!','#f44');
        }
        if(e._dashState==='charging'){e._chargeT-=eff;if(e._chargeT<=0)e._dashState='dashing';skipMove=true;}
        if(e._dashState==='dashing'){
          const mx=e._dashVx*bSpd*5*eff,my=e._dashVy*bSpd*5*eff;
          e.x+=mx;e.y+=my;e._dashDistLeft-=Math.hypot(mx,my);
          const btxD=(e.x/TILE)|0,btyD=(e.y/TILE)|0;
          for(let dy2=-1;dy2<=1;dy2++)for(let dx2=-1;dx2<=1;dx2++){
            const nx=btxD+dx2,ny=btyD+dy2;
            if(nx<1||ny<1||nx>=MAPW-1||ny>=MAPH-1)continue;
            if(map[ny*MAPW+nx]===1){map[ny*MAPW+nx]=0;fog[ny*MAPW+nx]=1;spark(nx*TILE+8,ny*TILE+8,'#c84',4,55);shake=Math.max(shake,1);}
          }
          for(const p of players){if(p.alive&&Math.hypot(p.x-e.x,p.y-e.y)<e.r+p.r+2&&e.atkCd<=0){damagePlayer(p,Math.round(e.dmg*1.3));e.atkCd=.3;shake=Math.max(shake,4);}}
          const hitOuter=e.x<=TILE*1.5||e.x>=(MAPW-1)*TILE||e.y<=TILE*1.5||e.y>=(MAPH-1)*TILE;
          e.x=Math.max(TILE,Math.min((MAPW-1)*TILE,e.x));e.y=Math.max(TILE,Math.min((MAPH-1)*TILE,e.y));
          if(e._dashDistLeft<=0||hitOuter){e._dashState='recovering';e._recoverT=e._phase2?rnd(.5,.9):rnd(.9,1.4);shake=Math.max(shake,4);spark(e.x,e.y,'#c44',12,90);}
          skipMove=true;
        }
        if(e._dashState==='recovering'){e._recoverT-=eff;if(e._recoverT<=0){e._dashState=null;e._dashCd=e._phase2?rnd(3,5):rnd(5,8);}skipMove=true;}
      }

      // ── Attack 1: GK grab & throw (yellow/red/final) ──
      let huntingGK=false;
      if(tier!=='green'&&!e._dashState){
        e._gkCd=Math.max(0,(e._gkCd||8)-eff);
        if(!e._gkPhase&&e._gkCd<=0&&gatekeepers.length>0){
          let ng=null,nd=Infinity;
          for(const gk of gatekeepers){const dg=Math.hypot(gk.x-e.x,gk.y-e.y);if(dg<nd){nd=dg;ng=gk;}}
          if(ng){e._gkPhase='hunting';e._gkTarget=ng;flash('GK LOCKED!','#f80');}
          else e._gkCd=rnd(3,6);
        }
        if(e._gkPhase==='hunting'){
          const gk=e._gkTarget;
          if(!gk||!gatekeepers.includes(gk)){e._gkPhase=null;e._gkTarget=null;e._gkCd=rnd(5,9);}
          else{
            const da=Math.atan2(gk.y-e.y,gk.x-e.x);
            e.vx=Math.cos(da)*bSpd;e.vy=Math.sin(da)*bSpd;huntingGK=true;
            if(Math.hypot(gk.x-e.x,gk.y-e.y)<e.r+12){
              gatekeepers.splice(gatekeepers.indexOf(gk),1);
              e._gkPhase='holding';e._holdT=rnd(.8,1.4);e._gkTarget=null;
              flash('GK GRABBED!','#f80');shake=Math.max(shake,2);
            }
          }
        }
        if(e._gkPhase==='holding'){
          e._holdT-=eff;
          if(e._holdT<=0){
            const ta=Math.atan2(tgt.y-e.y,tgt.x-e.x);
            ebullets.push({x:e.x,y:e.y,vx:Math.cos(ta)*210,vy:Math.sin(ta)*210,life:1.4,dmg:Math.round(32*eScale()),r:7,_isGK:true});
            e._gkPhase=null;e._gkCd=rnd(12,18);
            spark(e.x,e.y,'#f80',10,80);flash('WATCH OUT!','#f44');shake=Math.max(shake,3);
          }
        }
      }

      // ── Attack 2: 16-way ring shot (yellow/red/final) ──
      if(tier!=='green'&&!huntingGK&&e._gkPhase!=='holding'){
        e._ring16Cd=Math.max(0,(e._ring16Cd||7)-eff);
        if(e._ring16Cd<=0){
          for(let k=0;k<16;k++){const a=k*Math.PI*2/16;ebullets.push({x:e.x,y:e.y,vx:Math.cos(a)*95,vy:Math.sin(a)*95,life:1.8,dmg:Math.round(e.dmg*.5)});}
          e._ring16Cd=e._phase2?rnd(4,6):rnd(7,10);
          spark(e.x,e.y,'#ff8',16,80);shake=Math.max(shake,2);
        }
      }

      // ── Standard movement ──
      if(!skipMove&&!huntingGK){e.vx=Math.cos(e.ang)*bSpd;e.vy=Math.sin(e.ang)*bSpd;}
      // Break surrounding wall tiles (all tiers)
      e.breakCd=Math.max(0,(e.breakCd||0)-eff);
      const btx=(e.x/TILE)|0,bty=(e.y/TILE)|0;
      for(let dy2=-1;dy2<=1;dy2++)for(let dx2=-1;dx2<=1;dx2++){
        const nx=btx+dx2,ny=bty+dy2;
        if(nx<1||ny<1||nx>=MAPW-1||ny>=MAPH-1)continue;
        if(map[ny*MAPW+nx]===1){map[ny*MAPW+nx]=0;fog[ny*MAPW+nx]=1;if(e.breakCd<=0){spark(nx*TILE+8,ny*TILE+8,'#c84',6,65);e.breakCd=.1;shake=Math.max(shake,1.5);}}
      }
      // Devour cores
      const coreEatR=e._phase2?e.r+28:e.r+8;
      for(let i=cores.length-1;i>=0;i--){const c=cores[i];if(Math.hypot(c.x-e.x,c.y-e.y)<coreEatR){spark(c.x,c.y,'#f80',4,40);cores.splice(i,1);if(e._phase2)flash('CORE DEVOURED!','#f44');}}
      for(let i=pickups.length-1;i>=0;i--){const pk=pickups[i];if(Math.hypot(pk.x-e.x,pk.y-e.y)<e.r+8){spark(pk.x,pk.y,'#622',3,30);pickups.splice(i,1);}}
      // Green phase 2: 5-way spread shot
      if(tier==='green'&&e._phase2){
        e._shootCd=Math.max(0,(e._shootCd||0)-eff);
        if(e._shootCd<=0){for(let k=-2;k<=2;k++){const a=e.ang+k*.28;ebullets.push({x:e.x,y:e.y,vx:Math.cos(a)*115,vy:Math.sin(a)*115,life:1.6,dmg:e.dmg*.55});}e._shootCd=2.2;spark(e.x,e.y,'#f80',8,80);}
      }
      // Smash attack (not during dash)
      if(e._dashState!=='dashing'&&d<e.r+tgt.r+2&&e.atkCd<=0){damagePlayer(tgt,e.dmg);e.atkCd=1.0;shake=Math.max(shake,3);e.vx-=Math.cos(e.ang)*45;e.vy-=Math.sin(e.ang)*45;}
      // Position update (skip if mid-dash — already moved)
      if(e._dashState!=='dashing'){e.x+=e.vx*eff;e.y+=e.vy*eff;}
      e.x=Math.max(TILE,Math.min((MAPW-1)*TILE,e.x));e.y=Math.max(TILE,Math.min((MAPH-1)*TILE,e.y));
      e.hit=Math.max(0,e.hit-eff);e.anim+=eff;
      // boss pushes players away
      for(const p of players){if(!p.alive)continue;const ox=p.x-e.x,oy=p.y-e.y,dd=Math.hypot(ox,oy),mn=e.r+p.r;if(dd>0&&dd<mn){const push=mn-dd;const npx=p.x+ox/dd*push,npy=p.y+oy/dd*push;if(!hitsWall(npx,npy,p.r)){p.x=npx;p.y=npy;}}}
      continue; // skip standard moveObj + enemy separation
    } else {
      e.vx=Math.cos(e.ang)*e.spd;e.vy=Math.sin(e.ang)*e.spd;
      if(hitsWall(e.x+e.vx*.05,e.y+e.vy*.05,e.r)){e.vx=Math.cos(e.ang+Math.PI/2)*e.spd*.6;e.vy=Math.sin(e.ang+Math.PI/2)*e.spd*.6;}
      if(d<e.r+tgt.r+1&&e.atkCd<=0){damagePlayer(tgt,e.dmg);e.atkCd=.7;e.vx-=Math.cos(e.ang)*55;e.vy-=Math.sin(e.ang)*55;}
    }
    // Flow field: redirect movement through corridors when no LoS (skip wall-passers)
    if(e.type!=='ghost'&&!hasLoS(e.x,e.y,tgt.x,tgt.y)){
      const fi=((e.y/TILE|0)*MAPW+(e.x/TILE|0))*2;
      const fdx=flowField[fi],fdy=flowField[fi+1];
      if(fdx||fdy){const spd=Math.hypot(e.vx,e.vy)||e.spd;const fl=Math.hypot(fdx,fdy);e.vx=fdx/fl*spd;e.vy=fdy/fl*spd;}
      else{if(!e._wanderA||Math.random()<.015)e._wanderA=Math.random()*Math.PI*2;const spd=e.spd*.6;e.vx=Math.cos(e._wanderA)*spd;e.vy=Math.sin(e._wanderA)*spd;}
    }
    if(e.type==='ghost'){e.x+=e.vx*eff;e.y+=e.vy*eff;}
    else if(e.type==='dasher'&&e.dashing){/* already moved */}
    else moveObj(e,eff);
    // separation: enemy-enemy
    for(const o of enemies){if(o===e)continue;const ox=e.x-o.x,oy=e.y-o.y,dd=Math.hypot(ox,oy),mn=e.r+o.r;if(dd>0&&dd<mn){const push=(mn-dd)*.5;e.x+=ox/dd*push;e.y+=oy/dd*push;}}
    // separation: enemy-player (both directions)
    for(const p of players){if(!p.alive)continue;const ox=e.x-p.x,oy=e.y-p.y,dd=Math.hypot(ox,oy),mn=e.r+p.r;if(dd>0&&dd<mn){const push=(mn-dd)*.5;e.x+=ox/dd*push;e.y+=oy/dd*push;const npx=p.x-ox/dd*push,npy=p.y-oy/dd*push;if(!hitsWall(npx,npy,p.r)){p.x=npx;p.y=npy;}}}
  }

  // ── Ghost: parry kill ──
  for(let i=enemies.length-1;i>=0;i--){
    const e=enemies[i];if(e.type!=='ghost')continue;
    for(const p of players){
      if(!p.alive||p.parryT<=0)continue;
      if(Math.hypot(e.x-p.x,e.y-p.y)<22){
        enemies.splice(i,1);totalKills++;
        spark(e.x,e.y,'#adf',12,70);SE.kill();
        flash('BANISHED!','#adf');break;
      }
    }
  }

  // ── Flung enemies (dash-cancel parry knockback + chain collision) ──
  for(const e of enemies){
    if(!e._flung||e._flung<=0)continue;
    e._flung-=dt;
    e._flungVx*=Math.max(0,1-dt*5);e._flungVy*=Math.max(0,1-dt*5);
    const nx=e.x+e._flungVx*dt,ny=e.y+e._flungVy*dt;
    if(hitsWall(nx,ny,e.r)){e._flung=0;e._flungVx=0;e._flungVy=0;}
    else{e.x=nx;e.y=ny;}
    // Chain: bowl into other enemies
    for(const t2 of enemies){
      if(t2===e||t2._flung>0)continue;
      if(Math.hypot(t2.x-e.x,t2.y-e.y)<e.r+t2.r+1){
        const ca=Math.atan2(t2.y-e.y,t2.x-e.x);
        t2.hp-=80;t2.hit=.15;
        t2._flungVx=Math.cos(ca)*130;t2._flungVy=Math.sin(ca)*130;t2._flung=0.5;
        spark(t2.x,t2.y,'#f80',8,80);shake=Math.max(shake,2);
      }
    }
  }

  // ── Bomber: explosion ──
  for(let i=enemies.length-1;i>=0;i--){
    const e=enemies[i];if(!e._explode)continue;
    enemies.splice(i,1);totalKills++;
    const expR=44;
    spark(e.x,e.y,'#f80',24,140);spark(e.x,e.y,'#f44',12,80);smoke(e.x,e.y);shake=Math.max(shake,6);SE.bossDeath();
    // damage players
    for(const p of players){if(p.alive&&Math.hypot(p.x-e.x,p.y-e.y)<expR)damagePlayer(p,Math.round(28*eScale()));}
    // damage other enemies
    for(let j=enemies.length-1;j>=0;j--){
      const e2=enemies[j];if(Math.hypot(e2.x-e.x,e2.y-e.y)<expR){e2.hp-=20*eScale();e2.hit=.2;if(e2.hp<=0){enemies.splice(j,1);totalKills++;spark(e2.x,e2.y,'#f44',6,60);}}
    }
    // destroy wall tiles
    const tr=Math.ceil(expR/TILE),etx=(e.x/TILE)|0,ety=(e.y/TILE)|0;
    for(let ty=ety-tr;ty<=ety+tr;ty++)for(let tx=etx-tr;tx<=etx+tr;tx++){
      if(tx<1||ty<1||tx>=MAPW-1||ty>=MAPH-1)continue;
      if(Math.hypot(tx*TILE+8-e.x,ty*TILE+8-e.y)<expR&&map[ty*MAPW+tx]===1)map[ty*MAPW+tx]=0;
    }
  }

  // ── Gatekeepers ──
  for(const gk of gatekeepers){
    if(gk.hit>0)gk.hit=Math.max(0,gk.hit-eff);
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

  // ── NPC state machine (disabled) ──
  // for(let i=npcs.length-1;i>=0;i--){
  //   const npc=npcs[i];
  //   if(npc.state==='idle'){
  //     let near=false;
  //     for(const p of players){if(p.alive&&Math.hypot(p.x-npc.x,p.y-npc.y)<24){near=true;break;}}
  //     if(near){
  //       npc.talkT+=eff;
  //       npc.msg='...ODD TO FIND ANOTHER FOOL DOWN HERE';
  //       if(npc.talkT>2.5&&!npc.hasSpokenFollow){
  //         npc.hasSpokenFollow=true;
  //         npc.msg='FOLLOW ME.';
  //         setTimeout(()=>{
  //           if(npc.state==='idle'){npc.state='leading';npc.dir=Math.random()*Math.PI*2;npc.msg='';}
  //         },1800);
  //       }
  //     }else{if(!npc.hasSpokenFollow)npc.msg='';}
  //   }else if(npc.state==='leading'){
  //     npc.leadT+=eff;
  //     const spd=28,nx=npc.x+Math.cos(npc.dir)*spd*eff,ny=npc.y+Math.sin(npc.dir)*spd*eff;
  //     if(!hitsWall(nx,ny,2)){npc.x=nx;npc.y=ny;}else{npc.dir+=Math.PI*.5+rnd(-.3,.3);}
  //     npc.msg=(npc.leadT%4<.6)?'THIS WAY!':'';
  //     if(npc.leadT>npc.leadDur){
  //       SE.npcFall();flash('AAAAGGH!!','#fa4');
  //       const lootTypes=['core','core','core','health','health'];
  //       for(let j=0;j<2+rndi(0,3);j++){const ang=Math.random()*Math.PI*2,d=rnd(6,20);pickups.push({type:lootTypes[rndi(0,lootTypes.length)],x:npc.x+Math.cos(ang)*d,y:npc.y+Math.sin(ang)*d,t:0});}
  //       for(let j=0;j<16;j++){const ang=Math.random()*Math.PI*2;particles.push({x:npc.x,y:npc.y,vx:Math.cos(ang)*rnd(8,28),vy:Math.sin(ang)*rnd(8,28),life:rnd(.5,1.4),c:j%3===0?'#543':'#321'});}
  //       npcs.splice(i,1);
  //     }
  //   }
  // }

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
  {const _bossAlive=enemies.some(e=>e.type==='boss');
  if(!monsterHouse&&!exitOpen&&coresCollected>=coresNeeded&&!_bossAlive){exitOpen=true;flash('EXIT OPEN','#ff0');}}

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
    for(const pl of players){if(!pl.alive||!pl.isHuman)continue;const dx=pl.x-pod.x,dy=pl.y-pod.y;
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
        else if(stage%10===0&&!attractDemo){startCoffeeBreak();return;}
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
      if(!attractDemo)saveGame(); // lock in death immediately — quit+continue can't undo it
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
    if(!attractDemo)PSG.mhouse(stage);
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
      const _bMsg={green:'WALL-BREAKER INCOMING',yellow:'GK-THROWER INCOMING',red:'JUGGERNAUT INCOMING',final:'THE FINAL TERROR'}[b._tier]||'BOSS INCOMING';
      flash(_bMsg,'#f88');
      flash('DEFEAT THE BOSS TO OPEN THE EXIT!','#fa0');
      if(exitOpen){exitOpen=false;}
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
  PSG.stop();clearSave();running=false;gameWon=true;endingT=0;
  if(!attractDemo)_saveBest();
  winMsg='DEPTH '+stage+' / KILLS '+totalKills+' / ALLIES '+players.filter(p=>p.alive&&!p.isHuman).length+' SURVIVED';
}

