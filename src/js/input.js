// ═══════════════════════════════════════════════
//  RAW INPUT
// ═══════════════════════════════════════════════
const keys={};
let paused=false,debug=false,introActive=false,introPage=0,introT=0;
let introEnemyIdx=0; // index within enemy gallery (page 4)
let podSelectState=null,_podPadPrev={};
let padConfigActive=false,padCfgFocus=0,padCfgWaiting=false,_padCfgPrev={};
const pauseEl=document.getElementById('pause');
function setPause(v){
  paused=v;
  cv.classList.toggle('cur',v); // show pointer cursor while paused
  if(!v)PSG.resume();
}
addEventListener('keydown',e=>{
  if(attractDemo){stopAttractDemo();e.preventDefault();return;}
  if(coffeeBreak&&coffeeBreak.t>0.5){endCoffeeBreak();e.preventDefault();return;}
  if(gameWon&&endingT<5){endingT=5;e.preventDefault();return;}
  if(lobbyEl.style.display!=='none')lobbyIdleT=0;
  if(introActive){
    // ── Page 4: enemy gallery — left/right navigate, space advances ──
    if(introPage===4){
      if(e.code==='ArrowRight'||e.code==='KeyD'){
        if(introEnemyIdx<INTRO_ENEMIES.length-1){introEnemyIdx++;introT=0;}
        else endIntro();
        e.preventDefault();return;
      }
      if(e.code==='ArrowLeft'||e.code==='KeyA'){
        if(introEnemyIdx>0){introEnemyIdx--;introT=0;}
        else{introPage=3;introT=0;}
        e.preventDefault();return;
      }
      if(e.code==='Space'||e.code==='Enter'){
        if(introEnemyIdx<INTRO_ENEMIES.length-1){introEnemyIdx++;introT=0;}
        else endIntro();
        e.preventDefault();return;
      }
      if(e.code==='Escape'){endIntro();e.preventDefault();return;}
      return;
    }
    if(e.code==='Space'||e.code==='Enter'){
      introPage++;
      if(introPage===4)introEnemyIdx=0; // reset gallery on entry
      if(introPage>=INTRO_PAGES)introPage=INTRO_PAGES-1;
      introT=0;e.preventDefault();return;
    }
    if(e.code==='Escape'){endIntro();e.preventDefault();return;}
    return;
  }
  if(e.code==='Escape'&&running&&!gameWon){setPause(!paused);e.preventDefault();return;}
  if(e.code==='Tab'&&running&&!paused&&!gameOverState&&!gameWon){callCPU();e.preventDefault();return;}
  if((e.code==='Escape'||e.code==='KeyR')&&gameOverState){gameOverState=false;lobbyEl.style.display='flex';renderLobby();e.preventDefault();return;}
  if((e.code==='Escape'||e.code==='KeyR')&&gameWon){gameWon=false;lobbyEl.style.display='flex';renderLobby();e.preventDefault();return;}
  if(e.code==='F1'){debug=!debug;e.preventDefault();return;}
  if(debug&&running){
    if(e.code==='BracketRight'){nextStage();return;}        // ] next floor
    if(e.code==='BracketLeft'){stage=99;nextStage();return;} // [ jump to D100
    if(e.code==='Backslash'){if(fog)fog.fill(1);return;}   // \ reveal all
    if(e.code==='Equal'){coresCollected=coresNeeded;exitOpen=true;flash('ALL CORES','#ff0');return;} // = give cores
    if(e.code==='Semicolon'){enemies.length=0;flash('ENEMIES CLEARED','#f80');return;} // ; kill enemies
    if(e.code==='KeyM'){for(const p of players){p.hp=p.maxHp=9999;p.iframe=.5;}flash('GOD MODE','#f0f');return;} // M max HP
    if(e.code==='KeyB'){const b=makeBoss();const h=humanPlayer();if(h){b.x=h.x+80;b.y=h.y;}enemies.push(b);flash('★ BOSS SPAWNED','#f44');return;} // B spawn boss
    if(e.code==='KeyC'){const sk=['chase','victory','bomber','ghost','brute'];const cur=coffeeBreak?sk.indexOf(coffeeBreak.skit):-1;const nxt=sk[(cur+1)%sk.length];coffeeBreak={t:0,skit:nxt,_debug:true};_cbBtnPrev=false;flash('CB: '+nxt.toUpperCase(),'#0ff');return;} // C cycle coffee break
    if(e.code==='KeyE'){gameWon=true;endingT=0;running=false;winMsg='DEBUG PREVIEW';flash('ENDING PREVIEW','#ff0');return;} // E ending preview
  }
  keys[e.code]=true;
});
addEventListener('keyup',e=>keys[e.code]=false);

// ── Intro page gamepad polling ────────────────
let _introGpPrev={};
function pollIntroGamepad(){
  const gps=navigator.getGamepads?navigator.getGamepads():[];
  let gp=null;for(let i=0;i<gps.length;i++)if(gps[i]){gp=gps[i];break;}
  if(!gp)return;
  const edge=(k,v)=>{const r=v&&!_introGpPrev[k];_introGpPrev[k]=v;return r;};
  const ax=gp.axes[0]||0;
  const dR=edge('dR',(gp.buttons[15]?.pressed)||ax>0.5);
  const dL=edge('dL',(gp.buttons[14]?.pressed)||ax<-0.5);
  const back=edge('B',gp.buttons[1]?.pressed);
  if(introPage===4){
    if(dR){if(introEnemyIdx<INTRO_ENEMIES.length-1){introEnemyIdx++;introT=0;}else endIntro();}
    if(dL){if(introEnemyIdx>0){introEnemyIdx--;introT=0;}else{introPage=3;introT=0;}}
  }else{
    if(dR){introPage++;if(introPage===4)introEnemyIdx=0;if(introPage>=INTRO_PAGES)introPage=INTRO_PAGES-1;introT=0;}
    if(dL){introPage--;if(introPage<0)introPage=0;introT=0;}
  }
  if(back)endIntro();
}
const mouse={x:W/2,y:H/2,down:false};
function updMouse(e){const r=cv.getBoundingClientRect();mouse.x=(e.clientX-r.left)*(W/r.width);mouse.y=(e.clientY-r.top)*(H/r.height);}
cv.addEventListener('mousemove',e=>{updMouse(e);if(lobbyEl.style.display!=='none')lobbyIdleT=0;});
cv.addEventListener('mousedown',e=>{updMouse(e);if(e.button===0)mouse.down=true;if(e.button===2)mouse.right=true;});
addEventListener('mouseup',e=>{if(e.button===0)mouse.down=false;if(e.button===2)mouse.right=false;});
cv.addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('click',e=>{
  if(attractDemo){stopAttractDemo();return;}
  if(lobbyEl.style.display!=='none')lobbyIdleT=0;
  if(introActive){
    if(introPage===4){
      // BACK TO TITLE button (last enemy)
      if(introEnemyIdx===INTRO_ENEMIES.length-1){
        const bx=W/2-30,by=H-28,bw=60,bh=12;
        if(mouse.x>=bx&&mouse.x<=bx+bw&&mouse.y>=by&&mouse.y<=by+bh){endIntro();return;}
      }
      // click left half = prev, right half = next
      if(mouse.x<W/2){
        if(introEnemyIdx>0){introEnemyIdx--;introT=0;}
      }else{
        if(introEnemyIdx<INTRO_ENEMIES.length-1){introEnemyIdx++;introT=0;}
        else endIntro();
      }
      return;
    }
    introPage++;
    if(introPage===4)introEnemyIdx=0;
    if(introPage>=INTRO_PAGES){introPage=INTRO_PAGES-1;}
    introT=0;
    return;
  }
  if(lobbyEl.style.display!=='none'){lobbyHandleClick();return;}
  if(paused){pauseHandleClick();return;}
  if(gameOverState){goHandleClick();return;}
  if(gameWon){winHandleClick();return;}
});
