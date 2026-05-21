// ═══════════════════════════════════════════════
//  LOOP
// ═══════════════════════════════════════════════
let last=performance.now();
let _gpStartPrev=false;
function _pollGpStart(){
  const gps=navigator.getGamepads?navigator.getGamepads():[];
  let gp=null;for(let i=0;i<gps.length;i++)if(gps[i]){gp=gps[i];break;}
  if(!gp){_gpStartPrev=false;return;}
  const pressed=!!(gp.buttons[9]?.pressed);
  const edge=pressed&&!_gpStartPrev;
  _gpStartPrev=pressed;
  if(!edge)return;
  if(padConfigActive){padConfigActive=false;return;}
  if(musicPlayMode){stopMusicPlay();return;}
  if(tutorialActive){endTutorial();return;}
  if(introActive){endIntro();return;}
  if(running&&!gameOverState&&!gameWon&&!attractDemo){setPause(!paused);_ovlPadFocus='';_ovlPadPrev={};return;}
  if(gameOverState&&_goT>1.5){gameOverState=false;lobbyEl.style.display='flex';renderLobby();PSG.title();_ovlPadFocus='';_ovlPadPrev={};}
  if(gameWon){gameWon=false;lobbyEl.style.display='flex';renderLobby();PSG.title();_ovlPadFocus='';_ovlPadPrev={};}
}
(function loop(now){
  let dt=Math.min(.05,(now-last)/1000);last=now;
  _pollGpStart();
  if(musicPlayMode){
    drawMusicPlay(dt);
  }else if(introActive){
    introT+=dt;
    pollIntroGamepad();
    drawIntro();
  }else if(lobbyEl.style.display!=='none'){
    drawLobbyCanvas(dt);
  }else if(tutorialActive){
    if(!paused)update(dt);
    draw();
    updateTutorial(dt);
    drawTutorialOverlay();
    if(paused)drawPause();
  }else{
    if(!paused)update(dt);
    draw();
    if(coffeeBreak){coffeeBreak.t+=dt;drawCoffeeBreak();}
    else if(bulletTime)drawBulletTime();
    if(attractDemo){
      attractDemoT+=dt;
      drawAttractOverlay();
      if(attractDemoT>40||gameOverState||gameWon){gameOverState=false;gameWon=false;startAttractDemo();}
    }else if(paused){drawPause();_ovlPadNav();}
    else if(gameOverState){_goT+=dt;drawGameOver();if(_goT>1.5)_ovlPadNav();}
    else if(gameWon){endingT+=dt;drawWin();_ovlPadNav();}
  }
  requestAnimationFrame(loop);
})(last);

