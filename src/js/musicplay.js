
// ═══════════════════════════════════════════════
//  MUSIC PLAY MODE
// ═══════════════════════════════════════════════
let musicPlayMode=false,musicPlayT=0,musicPlaySong=0;
let _mpPadPrev={};

const MUSIC_SONGS=[
  {label:'TITLE BGM',   play:()=>PSG.title()},
  {label:'COFFEE BREAK',play:()=>PSG.jingle()},
  {label:'ZONE 1',      play:()=>PSG.play(1)},
  {label:'ZONE 2',      play:()=>PSG.play(21)},
  {label:'ZONE 3',      play:()=>PSG.play(41)},
  {label:'ZONE 4',      play:()=>PSG.play(61)},
  {label:'ZONE 5',      play:()=>PSG.play(81)},
  {label:'BOSS',        play:()=>PSG.boss(10)},
];
const _MP_ENEMIES=['grunt','runner','shooter','bomber','ghost','brute'];
const _MP_GY=110;

function startMusicPlay(){
  musicPlayMode=true;musicPlayT=0;musicPlaySong=0;
  MUSIC_SONGS[0].play();
}
function stopMusicPlay(){
  musicPlayMode=false;
  PSG.title();
}
function _mpChangeSong(dir){
  musicPlaySong=(musicPlaySong+dir+MUSIC_SONGS.length)%MUSIC_SONGS.length;
  MUSIC_SONGS[musicPlaySong].play();
}

function drawMusicPlay(dt){
  musicPlayT+=dt;
  const t=musicPlayT;

  // Background
  ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
  for(let sy=0;sy<H;sy+=4){ctx.fillStyle='rgba(0,0,24,0.14)';ctx.fillRect(0,sy,W,2);}

  // Title
  ctx.globalAlpha=0.85+Math.sin(t*2.5)*.15;
  pixBig('MUSIC PLAY',Math.round((W-80)/2),7,'#f80');
  ctx.globalAlpha=1;

  // Song name with arrows
  const song=MUSIC_SONGS[musicPlaySong];
  const lArr=musicPlaySong>0?'<':' ';
  const rArr=musicPlaySong<MUSIC_SONGS.length-1?'>':' ';
  const nameStr=lArr+' '+song.label+' '+rArr;
  pixText(nameStr,Math.round((W-nameStr.length*4)/2),20,'#ff0');

  // Dot indicators
  const dotSpan=MUSIC_SONGS.length*6;
  const dotX0=Math.round((W-dotSpan)/2);
  for(let i=0;i<MUSIC_SONGS.length;i++){
    ctx.fillStyle=i===musicPlaySong?'#ff0':'#334';
    ctx.fillRect(dotX0+i*6,29,4,2);
  }

  // Ground line
  ctx.fillStyle='#333';ctx.fillRect(10,_MP_GY+8,W-20,1);

  // Dancing enemies
  const n=_MP_ENEMIES.length;
  const span=W-60;
  for(let i=0;i<n;i++){
    const type=_MP_ENEMIES[i];
    const phase=i*Math.PI*2/n;
    const ex=Math.round(30+span*i/(n-1));
    // bounce: up-down in rhythm
    const bounce=Math.sin(t*3.5+phase)*5;
    const ey=_MP_GY+bounce;
    // spin angle
    const ang=t*2+phase;
    const e=makeEnemy(type,ex,ey);
    e.ang=ang;e.anim=t*3+phase*0.5;e.hit=0;e._dead=false;
    const sv=time;time=t+phase*0.3;
    drawEnemy(e);
    time=sv;ctx.globalAlpha=1;
    // name label
    const lbl=type.toUpperCase();
    pixText(lbl,Math.round(ex-lbl.length*2),_MP_GY+12,'#446');
  }

  // Controls hint
  ctx.globalAlpha=0.4+Math.sin(t*3)*.1;
  pixText('LEFT/RIGHT: SONG    ESC: EXIT',Math.round((W-116)/2),H-9,'#445');
  ctx.globalAlpha=1;

  // Gamepad support
  const gps=navigator.getGamepads?navigator.getGamepads():[];
  let gp=null;for(const g of gps){if(g){gp=g;break;}}
  if(gp){
    const edge=(k,v)=>{const r=v&&!_mpPadPrev[k];_mpPadPrev[k]=v;return r;};
    const ax=gp.axes[0]||0;
    if(edge('R',(gp.buttons[15]?.pressed)||ax>0.5))_mpChangeSong(1);
    if(edge('L',(gp.buttons[14]?.pressed)||ax<-0.5))_mpChangeSong(-1);
    if(edge('B',gp.buttons[1]?.pressed))stopMusicPlay();
  }else{_mpPadPrev={};}
}
