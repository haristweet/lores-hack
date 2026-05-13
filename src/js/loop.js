// ═══════════════════════════════════════════════
//  LOOP
// ═══════════════════════════════════════════════
let last=performance.now();
(function loop(now){
  let dt=Math.min(.05,(now-last)/1000);last=now;
  if(introActive){
    introT+=dt;
    pollIntroGamepad();
    drawIntro();
  }else if(lobbyEl.style.display!=='none'){
    drawLobbyCanvas(dt);
  }else{
    if(!paused)update(dt);
    draw();
    if(bulletTime)drawBulletTime();
    if(attractDemo){
      attractDemoT+=dt;
      drawAttractOverlay();
      if(attractDemoT>40||gameOverState||gameWon){gameOverState=false;gameWon=false;startAttractDemo();}
    }else if(paused){drawPause();_ovlPadNav();}
    else if(gameOverState){drawGameOver();_ovlPadNav();}
    else if(gameWon){drawWin();_ovlPadNav();}
  }
  requestAnimationFrame(loop);
})(last);

