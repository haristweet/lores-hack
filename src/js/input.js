// ═══════════════════════════════════════════════
//  RAW INPUT
// ═══════════════════════════════════════════════
const keys={};
let paused=false,debug=false,introActive=false,introPage=0,introT=0;
const pauseEl=document.getElementById('pause');
function setPause(v){
  paused=v;
  cv.classList.toggle('cur',v); // show pointer cursor while paused
  if(!v)PSG.resume();
}
addEventListener('keydown',e=>{
  if(introActive){
    if(e.code==='Space'||e.code==='Enter'){
      introPage++;if(introPage>=INTRO_PAGES)introPage=INTRO_PAGES-1;introT=0;e.preventDefault();return;
    }
    if(e.code==='Escape'){endIntro();e.preventDefault();return;}
    return;
  }
  if(e.code==='Escape'&&running&&!gameWon){setPause(!paused);e.preventDefault();return;}
  if(e.code==='F1'){debug=!debug;e.preventDefault();return;}
  if(debug&&running){
    if(e.code==='BracketRight'){nextStage();return;}        // ] next floor
    if(e.code==='BracketLeft'){stage=99;nextStage();return;} // [ jump to D100
    if(e.code==='Backslash'){if(fog)fog.fill(1);return;}   // \ reveal all
    if(e.code==='Equal'){coresCollected=coresNeeded;exitOpen=true;flash('ALL CORES','#ff0');return;} // = give cores
    if(e.code==='Semicolon'){enemies.length=0;flash('ENEMIES CLEARED','#f80');return;} // ; kill enemies
    if(e.code==='KeyM'){for(const p of players){p.hp=p.maxHp=9999;p.iframe=.5;}flash('GOD MODE','#f0f');return;} // M max HP
    if(e.code==='KeyB'){const b=makeBoss();const h=humanPlayer();if(h){b.x=h.x+80;b.y=h.y;}enemies.push(b);flash('★ BOSS SPAWNED','#f44');return;} // B spawn boss
  }
  keys[e.code]=true;
});
addEventListener('keyup',e=>keys[e.code]=false);
const mouse={x:W/2,y:H/2,down:false};
function updMouse(e){const r=cv.getBoundingClientRect();mouse.x=(e.clientX-r.left)*(W/r.width);mouse.y=(e.clientY-r.top)*(H/r.height);}
cv.addEventListener('mousemove',updMouse);
cv.addEventListener('mousedown',e=>{updMouse(e);if(e.button===0)mouse.down=true;if(e.button===2)mouse.right=true;});
addEventListener('mouseup',e=>{if(e.button===0)mouse.down=false;if(e.button===2)mouse.right=false;});
cv.addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('click',e=>{
  if(introActive){
    // Page 3: BACK TO TITLE button hit test
    if(introPage===3){
      const bx=W/2-22,by=H-28,bw=44,bh=12;
      if(mouse.x>=bx&&mouse.x<=bx+bw&&mouse.y>=by&&mouse.y<=by+bh){endIntro();return;}
    }
    introPage++;
    if(introPage>=INTRO_PAGES){introPage=INTRO_PAGES-1;}
    introT=0;
    return;
  }
  if(lobbyEl.style.display!=='none'){lobbyHandleClick();return;}
  if(paused){pauseHandleClick();return;}
});

