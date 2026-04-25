// ═══════════════════════════════════════════════
//  CONTROLLERS
// ═══════════════════════════════════════════════
class KMController{
  constructor(){this.type='KB+M';this.label='KB+M';}
  move(p){
    if((keys.ShiftLeft||keys.ShiftRight)&&p){
      // Shift+mouse: move toward cursor
      const dx=mouse.x+camX-W/2-p.x,dy=mouse.y+camY-H/2-p.y;
      const d=Math.hypot(dx,dy);
      if(d<14)return{x:0,y:0};
      return{x:dx/d,y:dy/d};
    }
    return{x:(keys.KeyD?1:0)-(keys.KeyA?1:0),y:(keys.KeyS?1:0)-(keys.KeyW?1:0)};
  }
  aim(p){return Math.atan2(mouse.y+camY-H/2-p.y,mouse.x+camX-W/2-p.x);}
  fire(){return mouse.down;}
  charge(){return!!(mouse.right||keys.KeyE);}
  dash(){return!!(keys.Space||keys.KeyF);}
}
class PadController{
  constructor(){this.type='PAD';this.label='GAMEPAD';this._a=0;}
  _gp(){
    const gps=navigator.getGamepads?navigator.getGamepads():[];
    for(let i=0;i<gps.length;i++)if(gps[i]&&gps[i].axes.length>=2)return gps[i];
    return null;
  }
  move(){const g=this._gp();if(!g)return{x:0,y:0};const x=g.axes[0]||0,y=g.axes[1]||0;if(Math.hypot(x,y)<.18)return{x:0,y:0};return{x,y};}
  aim(p){const g=this._gp();if(!g)return this._a;const x=g.axes[2]||0,y=g.axes[3]||0;if(Math.hypot(x,y)>.3)this._a=Math.atan2(y,x);return this._a;}
  fire(){const g=this._gp();if(!g)return false;if(Math.hypot(g.axes[2]||0,g.axes[3]||0)>.6)return true;if(g.buttons[7]?.value>.5)return true;return!!g.buttons[0]?.pressed;}
  charge(){const g=this._gp();if(!g)return false;return!!(g.buttons[6]?.value>.5);}
  dash(){const g=this._gp();if(!g)return false;return!!(g.buttons[4]?.pressed||g.buttons[1]?.pressed);}
}

// ── CPU helper fns (use live arrays) ─────────
function randPers(noMoody=false){const l=noMoody?PERS_LIST.filter(x=>x!=='moody'):PERS_LIST;return l[Math.floor(Math.random()*l.length)];}
function nearEnemy(x,y){let b=null,d=Infinity;for(const e of enemies){const dd=(e.x-x)**2+(e.y-y)**2;if(dd<d){d=dd;b=e;}}return b;}
function farEnemy(x,y){let b=null,d=-1;for(const e of enemies){const dd=(e.x-x)**2+(e.y-y)**2;if(dd>d){d=dd;b=e;}}return b;}
function highHPEnemy(){let b=null,v=-1;for(const e of enemies){if(e.hp>v){v=e.hp;b=e;}}return b;}
function lowHPEnemy(){let b=null,v=Infinity;for(const e of enemies){if(e.hp<v){v=e.hp;b=e;}}return b;}
function nearItem(x,y){let b=null,d=Infinity;for(const c of cores){const dd=(c.x-x)**2+(c.y-y)**2;if(dd<d){d=dd;b=c;}}for(const p of pickups){const dd=(p.x-x)**2+(p.y-y)**2;if(dd<d){d=dd;b=p;}}return b;}
function humanPlayer(){return players.find(p=>p.isHuman&&p.alive)||players.find(p=>p.alive);}

class CPUController{
  constructor(pers){
    this.type='CPU';this.label='CPU';
    this.personality=pers||randPers();
    this._sub=randPers(true);
    this._rouletteDisplay=null;
    this._target=null;this._rT=0;this._strT=Math.random()*10;
    this._mx=0;this._my=0;this._aim=0;this._fire=false;this._dash=false;
  }
  get effPers(){return this.personality==='moody'?this._sub:this.personality;}
  get ability(){return PERS_ABILITY[this.effPers]||'?';}
  rerollMoody(){
    if(this.personality!=='moody')return;
    this._sub=randPers(true);
  }
  pre(p,dt){
    this._strT+=dt;
    // ── Rush to player when called ──
    if(p.rushing){
      const hp=humanPlayer();
      if(hp){
        const dx=hp.x-p.x,dy=hp.y-p.y,d=Math.hypot(dx,dy);
        if(d<30){p.rushing=false;}
        else{this._mx=dx/d;this._my=dy/d;this._fire=false;this._dash=d>60&&p.dashCd<=0&&Math.random()<.04;}
      }else{p.rushing=false;}
      return;
    }
    if(p._hit){p._hit=false;this._rT=0;this._target=null;}
    const ps=this.effPers,hp=humanPlayer();
    if(ps==='prospector'){this._preScav(p,dt,hp);return;}
    this._rT-=dt;
    if(this._rT<=0||!this._target||this._target.hp<=0){
      this._rT=0.3+Math.random()*.2;
      this._target=this._pickTarget(p,ps,hp);
    }
    if(!this._target){this._wander(p,hp);this._seekNearbyItem(p,70*70);this._fire=false;return;}
    const dx=this._target.x-p.x,dy=this._target.y-p.y,d=Math.hypot(dx,dy)||1;
    this._aim=Math.atan2(dy,dx);
    this._move(p,ps,hp,d,this._wantDist(ps));
    const los=hasLoS(p.x,p.y,this._target.x,this._target.y);
    this._fire=d<this._fireRange(ps)&&los;
    this._dash=this._wantDash(p,ps,d);
    this._seekNearbyItem(p,28*28);
  }
  _seekNearbyItem(p,r2){
    let best=null,bestD=r2;
    for(const c of cores){const dd=(c.x-p.x)**2+(c.y-p.y)**2;if(dd<Math.min(bestD,50*50)){best=c;bestD=dd;}}
    for(const pk of pickups){
      const dd=(pk.x-p.x)**2+(pk.y-p.y)**2;if(dd>=bestD)continue;
      if(pk.type==='core'||(pk.type==='health'&&p.hp<p.maxHp*.75)||(pk.type==='revive'&&!p.hasRevive)){best=pk;bestD=dd;}
    }
    if(best){const d=Math.sqrt(bestD)||1,idx=best.x-p.x,idy=best.y-p.y;this._mx=idx/d;this._my=idy/d;}
  }
  _pickTarget(p,ps,hp){
    if(!enemies.length)return null;
    if(ps==='bodyguard')return hp?nearEnemy(hp.x,hp.y):nearEnemy(p.x,p.y);
    return nearEnemy(p.x,p.y);
  }
  _wantDist(ps){return{berserker:15,sniper:120,bodyguard:40}[ps]??55;}
  _fireRange(ps){return{sniper:160,berserker:80}[ps]??110;}
  _move(p,ps,hp,d,wd){
    let mx=0,my=0,a=this._aim;
    if(d>wd+10){mx=Math.cos(a);my=Math.sin(a);}
    else if(d<wd-10){mx=-Math.cos(a);my=-Math.sin(a);}
    const sa=a+Math.PI/2,sv=Math.sin(this._strT*2.3);
    mx+=Math.cos(sa)*sv*.4;my+=Math.sin(sa)*sv*.4;
    if(ps==='bodyguard'&&hp){const hdx=hp.x-p.x,hdy=hp.y-p.y,hd=Math.hypot(hdx,hdy);if(hd>55){mx=(mx+hdx/hd)/2;my=(my+hdy/hd)/2;}}
    const ml=Math.hypot(mx,my);if(ml>1){mx/=ml;my/=ml;}
    this._mx=mx;this._my=my;
  }
  _wantDash(p,ps,d){
    if(p.dashCd>0)return false;
    if(ps==='berserker'&&d>40&&Math.random()<.03)return true;
    return false;
  }
  _wander(p,hp){
    if(hp){const dx=hp.x-p.x,dy=hp.y-p.y,d=Math.hypot(dx,dy);if(d>45){this._mx=dx/d;this._my=dy/d;return;}}
    this._mx*=.9;this._my*=.9;
  }
  _preScav(p,dt,hp){
    if(p._hit){p._hit=false;this._retaliateT=2.5+Math.random();}
    if((this._retaliateT||0)>0){
      this._retaliateT-=dt;
      const t=nearEnemy(p.x,p.y);
      if(t){const dx=t.x-p.x,dy=t.y-p.y,d=Math.hypot(dx,dy)||1;this._aim=Math.atan2(dy,dx);this._mx=d>20?dx/d:0;this._my=d>20?dy/d:0;this._fire=d<110;}
      else{this._wander(p,hp);this._fire=false;}
      this._dash=false;return;
    }
    const item=nearItem(p.x,p.y);
    if(item){
      const dx=item.x-p.x,dy=item.y-p.y,d=Math.hypot(dx,dy)||1;
      this._aim=Math.atan2(dy,dx);
      this._mx=d>20?dx/d:0;this._my=d>20?dy/d:0;
      const ne=nearEnemy(p.x,p.y);
      if(ne){const ed=Math.hypot(ne.x-p.x,ne.y-p.y);if(ed<50){this._aim=Math.atan2(ne.y-p.y,ne.x-p.x);this._fire=true;}else this._fire=false;}
    }else{
      const t=nearEnemy(p.x,p.y);this._target=t;
      if(t){const dx=t.x-p.x,dy=t.y-p.y,d=Math.hypot(dx,dy)||1;this._aim=Math.atan2(dy,dx);if(d>65){this._mx=Math.cos(this._aim);this._my=Math.sin(this._aim);}else if(d<45){this._mx=-Math.cos(this._aim);this._my=-Math.sin(this._aim);}else{this._mx=0;this._my=0;}this._fire=d<110;}
      else{this._wander(p,hp);this._fire=false;}
    }
    this._dash=false;
  }
  move(){return{x:this._mx,y:this._my};}
  aim(){return this._aim;}
  fire(){return this._fire;}
  dash(){return this._dash;}
  charge(){return false;}
  reload(){return false;}
}

// ═══════════════════════════════════════════════
