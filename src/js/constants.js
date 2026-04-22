
// ═══════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════
const W=320,H=180,TILE=16,MAPW=64,MAPH=64,MAX_DEPTH=100;

const PERS_LIST=['prospector','sniper','bodyguard','berserker','moody'];
const PERS_LABEL={
  prospector:'PROSP',sniper:'SNIPER',bodyguard:'BDYGRD',berserker:'BSRKR',moody:'MOODY'
};
const PERS_ABILITY={
  prospector:'ITEM',sniper:'MAP',bodyguard:'EXIT',berserker:'ENEMY',moody:null
};

const P_PAL=[
  {name:'P1',body:'#3cf',dark:'#247',head:'#fda',trail:'#8ef'},
  {name:'P2',body:'#f66',dark:'#722',head:'#fda',trail:'#fa8'},
  {name:'P3',body:'#6c6',dark:'#272',head:'#fda',trail:'#af8'},
  {name:'P4',body:'#fc4',dark:'#751',head:'#fda',trail:'#fe8'},
];

// ═══════════════════════════════════════════════
//  SETUP
// ═══════════════════════════════════════════════
const cv=document.getElementById('cv');
const ctx=cv.getContext('2d');
ctx.imageSmoothingEnabled=false;

const lobbyEl=document.getElementById('lobby');
const overEl=document.getElementById('over');
const winEl=document.getElementById('win');
const btOv=document.getElementById('btOv');
const btName=document.getElementById('btName');
const btCount=document.getElementById('btCount');
const ovTitle=document.getElementById('ovTitle');
const ovSub=document.getElementById('ovSub');
const winStat=document.getElementById('winStat');

function fit(){
  const s=Math.max(1,Math.floor(Math.min(window.innerWidth/W,window.innerHeight/H)));
  cv.style.width=(W*s)+'px'; cv.style.height=(H*s)+'px';
}
window.addEventListener('resize',fit); fit();

