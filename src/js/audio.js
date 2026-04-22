// ═══════════════════════════════════════════════
//  BGM EXPORT
// ═══════════════════════════════════════════════
function _audioToWav(buffer){
  const nCh=buffer.numberOfChannels,sr=buffer.sampleRate,ns=buffer.length;
  const ab=new ArrayBuffer(44+ns*nCh*2),v=new DataView(ab);
  const ws=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
  ws(0,'RIFF');v.setUint32(4,36+ns*nCh*2,true);ws(8,'WAVE');
  ws(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);
  v.setUint16(22,nCh,true);v.setUint32(24,sr,true);
  v.setUint32(28,sr*nCh*2,true);v.setUint16(32,nCh*2,true);v.setUint16(34,16,true);
  ws(36,'data');v.setUint32(40,ns*nCh*2,true);
  let off=44;
  for(let i=0;i<ns;i++)for(let c=0;c<nCh;c++){
    const s=Math.max(-1,Math.min(1,buffer.getChannelData(c)[i]));
    v.setInt16(off,s*0x7FFF,true);off+=2;
  }
  return ab;
}

const ZONE_NAMES=['D01-20','D21-40','D41-60','D61-80','D81-100'];
let _bgmRendering=false;

async function downloadBGM(stageForZone){
  if(_bgmRendering)return;
  _bgmRendering=true;
  const zi=Math.min(4,Math.floor((stageForZone-1)/20));
  const zn=ZONE_NAMES[zi];
  // Update all 5 buttons
  document.querySelectorAll('.bgmBtn').forEach(b=>{ b.disabled=true; });
  const thisBtn=document.querySelector(`.bgmBtn[data-zi="${zi}"]`);
  if(thisBtn)thisBtn.textContent='RENDERING...';
  try{
    const buf=await PSG.render(stageForZone,62);
    const wav=_audioToWav(buf);
    const blob=new Blob([wav],{type:'audio/wav'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download=`escape-depth-bgm-${zn}.wav`;
    document.body.appendChild(a);a.click();
    setTimeout(()=>{document.body.removeChild(a);URL.revokeObjectURL(url);},1000);
  }catch(e){console.error('BGM render failed',e);}
  finally{
    _bgmRendering=false;
    document.querySelectorAll('.bgmBtn').forEach((b,i)=>{
      b.disabled=false;b.textContent=ZONE_NAMES[i];
    });
  }
}

// ═══════════════════════════════════════════════
//  LOBBY
// ═══════════════════════════════════════════════
let cfg={humans:1,cpus:0,slots:['KB+M']};

function renderLobby(){
  if(!['KB+M','GAMEPAD'].includes(cfg.slots[0]))cfg.slots[0]='KB+M';
}

function pollPads(){
  const gps=navigator.getGamepads?navigator.getGamepads():[];
  const ns=[];for(let i=0;i<gps.length;i++)if(gps[i])ns.push(gps[i].id.split('(')[0].trim().slice(0,16));
  padStatus=ns.length?ns.join(' / '):'NO GAMEPAD DETECTED';
}

cfg.humans=1;cfg.cpus=0;renderLobby();
addEventListener('gamepadconnected',pollPads);addEventListener('gamepaddisconnected',pollPads);
setInterval(pollPads,500);

// ═══════════════════════════════════════════════
//  SE ENGINE
// ═══════════════════════════════════════════════
const SE=(()=>{
  let ac;
  function ctx(){return ac||(ac=new(window.AudioContext||window.webkitAudioContext)());}
  function clang(){
    // Metallic resonance — secret wall hit
    const c=ctx(),t=c.currentTime;
    const osc=c.createOscillator(),gain=c.createGain();
    osc.connect(gain);gain.connect(c.destination);
    osc.type='triangle';
    osc.frequency.setValueAtTime(1320,t);
    osc.frequency.exponentialRampToValueAtTime(330,t+.35);
    gain.gain.setValueAtTime(.25,t);gain.gain.exponentialRampToValueAtTime(.001,t+.4);
    osc.start(t);osc.stop(t+.4);
  }
  function driver(){
    // Pickup jingle — driver acquired
    const c=ctx(),t=c.currentTime;
    [440,550,660,880].forEach((hz,i)=>{
      const osc=c.createOscillator(),gain=c.createGain();
      osc.connect(gain);gain.connect(c.destination);
      osc.type='square';
      osc.frequency.value=hz;
      const s=t+i*.07;
      gain.gain.setValueAtTime(.12,s);gain.gain.exponentialRampToValueAtTime(.001,s+.18);
      osc.start(s);osc.stop(s+.18);
    });
  }
  return{clang,driver};
})();

// ═══════════════════════════════════════════════
//  PSG MUSIC ENGINE  (Web Audio API / AY-3-8910 style)
// ═══════════════════════════════════════════════
const PSG=(()=>{
  let AC,mGain,dNode,dGain,seqId,nextT,step,pat,bpm;
  const CLK=1750000; // AY-3-8910 master clock

  // Deterministic LCG seeded per stage
  function rng(seed){
    let s=(seed*1664525+1013904223)>>>0;
    return()=>{s=(s*1664525+1013904223)>>>0;return s/0x100000000;};
  }

  // Quantize to real PSG frequency steps (removes "clean" digital sound)
  function pf(hz){const n=Math.max(1,Math.round(CLK/(16*hz)));return CLK/(16*n);}
  function midi(n){return pf(440*Math.pow(2,(n-69)/12));}

  // Depth zones — scale, root MIDI, base BPM
  // D01-20: major               → bright and clear
  // D21-40: mixolydian          → major feel, slight edge (b7)
  // D41-60: dorian              → minor but not oppressive (raised 6th)
  // D61-80: natural minor       → tension building
  // D81-100: phrygian           → dark, but not locrian-level horror
  const ZONES=[
    {sc:[0,2,4,5,7,9,11],root:50,bpmBase:82},
    {sc:[0,2,4,5,7,9,10], root:48,bpmBase:98},
    {sc:[0,2,3,5,7,9,10], root:46,bpmBase:116},
    {sc:[0,2,3,5,7,8,10], root:44,bpmBase:136},
    {sc:[0,1,3,5,7,8,10], root:42,bpmBase:156},
  ];
  function zone(st){return ZONES[Math.min(4,Math.floor((st-1)/20))];}

  // Generate 8 or 16-step pattern seeded from stage
  // Boss pattern — aggressive, 16-step, diminished-dominant flavour
  function genBossPat(st){
    const r=rng(st*3571+99991);
    // Double harmonic / diminished feel: root, b2, 3, b5, 5, b7
    const sc=[0,1,4,6,7,10];
    // Root drops deeper with each boss floor
    const rt=36+((st/10)|0)%4*(-2);
    const mel=[],bass=[],arp=[];
    for(let i=0;i<16;i++){
      // Punchy melody: mostly on-beat, occasional rests
      mel.push(r()<0.18?null:rt+sc[Math.floor(r()*sc.length)]+(r()<0.35?12:0)+24);
      // Driving bass on every beat (every 4 8th-steps), occasional 5th
      bass.push(i%4===0?rt+12:i%4===2?rt+7+12:null);
      // Fast frantic arpeggio always on (16th-note feel)
      arp.push(rt+sc[i%sc.length]+(i%3===0?24:12));
    }
    return{mel,bass,arp,len:16};
  }

  function genPat(st){
    const r=rng(st*7919+31337);
    const z=zone(st);
    const sc=z.sc,rt=z.root;
    const deep=st>=61;
    const len=deep?16:8;
    const mel=[],bass=[],arp=[];
    for(let i=0;i<len;i++){
      // Melody: ~25% rest, otherwise random scale degree, occasional +1 octave
      mel.push(r()<0.30?null:rt+sc[Math.floor(r()*sc.length)]+(r()<0.40?12:0)+24);
      // Bass: root on beat1, 5th on beat3
      const fifth=sc[sc.length>4?4:sc.length-1];
      bass.push(i%len===0?rt+12:i%4===2?rt+fifth+12:null);
      // Arpeggio texture only D61+ (frantic upper channel)
      arp.push(deep?rt+sc[i%sc.length]+(i%2?12:24):null);
    }
    return{mel,bass,arp,len};
  }

  function init(){
    if(AC)return;
    AC=new(window.AudioContext||window.webkitAudioContext)();
    mGain=AC.createGain();mGain.gain.value=0.20;
    // Subtle delay echo (dungeon reverb feel)
    dNode=AC.createDelay(1);dNode.delayTime.value=0.20;
    dGain=AC.createGain();dGain.gain.value=0.25;
    mGain.connect(AC.destination);
    mGain.connect(dNode);dNode.connect(dGain);dGain.connect(AC.destination);
  }

  // Square/triangle note with hard PSG-style envelope
  function noteOn(hz,type,vol,t,dur){
    const o=AC.createOscillator(),g=AC.createGain();
    o.type=type;o.frequency.value=hz;
    g.gain.setValueAtTime(vol,t);
    g.gain.setValueAtTime(vol*.55,t+dur*.55);
    g.gain.setValueAtTime(0.0001,t+dur*.92);
    o.connect(g);g.connect(mGain);
    o.start(t);o.stop(t+dur+.02);
  }

  // Band-pass filtered noise (kick / snare / hi-hat)
  function noiseOn(freq,vol,t,dur){
    const sz=Math.ceil(AC.sampleRate*.04),buf=AC.createBuffer(1,sz,AC.sampleRate);
    const d=buf.getChannelData(0);for(let i=0;i<sz;i++)d[i]=Math.random()*2-1;
    const src=AC.createBufferSource();src.buffer=buf;src.loop=true;
    const flt=AC.createBiquadFilter();flt.type='bandpass';flt.frequency.value=freq;flt.Q.value=.9;
    const g=AC.createGain();
    g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    src.connect(flt);flt.connect(g);g.connect(mGain);
    src.start(t);src.stop(t+dur+.01);
  }

  function sched(){
    const sd=60/bpm/2; // 8th-note duration in seconds
    while(nextT<AC.currentTime+.18){
      const i=step%pat.len;
      if(pat.mel[i]!==null) noteOn(midi(pat.mel[i]),'square',.15,nextT,sd*.72);
      if(pat.bass[i]!==null) noteOn(midi(pat.bass[i]),'triangle',.21,nextT,sd*1.45);
      if(pat.arp[i]!==null) noteOn(midi(pat.arp[i]),'square',.07,nextT,sd*.32);
      if(i%8===0) noiseOn(100,.11,nextT,.08);   // kick
      if(i%4===2) noiseOn(1100,.05,nextT,.035); // snare
      if(i%2===0) noiseOn(5000,.025,nextT,.02); // hi-hat
      step++;nextT+=sd;
    }
  }

  return{
    play(st){
      this.stop();init();
      if(AC.state==='suspended')AC.resume();
      const z=zone(st);
      bpm=z.bpmBase+(st%20)*.55; // gentle BPM drift within each zone
      pat=genPat(st);step=0;nextT=AC.currentTime+.06;
      seqId=setInterval(sched,25);
    },
    stop(){if(seqId){clearInterval(seqId);seqId=null;}},
    resume(){if(AC&&AC.state==='suspended')AC.resume();},
    boss(st){
      this.stop();init();
      if(AC.state==='suspended')AC.resume();
      bpm=172+(st%10)*.8; // fast & slightly varies per boss floor
      pat=genBossPat(st);step=0;nextT=AC.currentTime+.06;
      seqId=setInterval(()=>{
        const sd=60/bpm/2;
        while(nextT<AC.currentTime+.18){
          const i=step%pat.len;
          if(pat.mel[i]!==null) noteOn(midi(pat.mel[i]),'square',.18,nextT,sd*.55);
          if(pat.bass[i]!==null) noteOn(midi(pat.bass[i]),'sawtooth',.26,nextT,sd*1.1);
          if(pat.arp[i]!==null) noteOn(midi(pat.arp[i]),'square',.09,nextT,sd*.25);
          // Heavy beat: kick every beat, snare every off-beat, hi-hat every step
          if(i%4===0) noiseOn(80,.18,nextT,.12);   // heavy kick
          if(i%4===2) noiseOn(900,.12,nextT,.06);  // snare
          noiseOn(6000,.04,nextT,.015);             // hi-hat every 8th
          step++;nextT+=sd;
        }
      },22);
    },
    // Offline render — returns Promise<AudioBuffer>
    async render(stage,duration=62){
      const SR=44100;
      const oAC=new OfflineAudioContext(2,SR*duration,SR);
      const oG=oAC.createGain();oG.gain.value=0.20;
      const oDly=oAC.createDelay(1);oDly.delayTime.value=0.20;
      const oDlyG=oAC.createGain();oDlyG.gain.value=0.25;
      oG.connect(oAC.destination);oG.connect(oDly);oDly.connect(oDlyG);oDlyG.connect(oAC.destination);
      function no(hz,type,vol,t,dur){
        const o=oAC.createOscillator(),g=oAC.createGain();
        o.type=type;o.frequency.value=hz;
        g.gain.setValueAtTime(vol,t);g.gain.setValueAtTime(vol*.55,t+dur*.55);
        g.gain.setValueAtTime(0.0001,t+dur*.92);
        o.connect(g);g.connect(oG);o.start(t);o.stop(t+dur+.02);
      }
      function nn(freq,vol,t,dur){
        const sz=Math.ceil(SR*.04),nb=oAC.createBuffer(1,sz,SR);
        const d=nb.getChannelData(0);for(let i=0;i<sz;i++)d[i]=Math.random()*2-1;
        const src=oAC.createBufferSource();src.buffer=nb;src.loop=true;
        const flt=oAC.createBiquadFilter();flt.type='bandpass';flt.frequency.value=freq;flt.Q.value=.9;
        const g=oAC.createGain();
        g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
        src.connect(flt);flt.connect(g);g.connect(oG);src.start(t);src.stop(t+dur+.01);
      }
      const z=zone(stage);
      const lbpm=z.bpmBase+(stage%20)*.55,lpat=genPat(stage);
      const sd=60/lbpm/2;
      let t=.02,st2=0;
      while(t<duration-sd){
        const i=st2%lpat.len;
        if(lpat.mel[i]!==null)no(midi(lpat.mel[i]),'square',.15,t,sd*.72);
        if(lpat.bass[i]!==null)no(midi(lpat.bass[i]),'triangle',.21,t,sd*1.45);
        if(lpat.arp[i]!==null)no(midi(lpat.arp[i]),'square',.07,t,sd*.32);
        if(i%8===0)nn(100,.11,t,.08);
        if(i%4===2)nn(1100,.05,t,.035);
        if(i%2===0)nn(5000,.025,t,.02);
        st2++;t+=sd;
      }
      return oAC.startRendering();
    }
  };
})();

