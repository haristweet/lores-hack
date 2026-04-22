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
  }
  requestAnimationFrame(loop);
})(last);

