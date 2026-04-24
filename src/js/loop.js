// ═══════════════════════════════════════════════
//  LOOP
// ═══════════════════════════════════════════════
let last=performance.now();
(function loop(now){
  let dt=Math.min(.05,(now-last)/1000);last=now;
  if(introActive){
    introT+=dt;
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
    }else if(paused)drawPause();
    else if(gameOverState)drawGameOver();
    else if(gameWon)drawWin();
  }
  requestAnimationFrame(loop);
})(last);

