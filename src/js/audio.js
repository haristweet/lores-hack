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

// ═══════════════════════════════════════════════
//  LOBBY
// ═══════════════════════════════════════════════
let cfg={humans:1,cpus:0,slots:['KB+M']};

function renderLobby(){
  if(!['KB+M','GAMEPAD'].includes(cfg.slots[0]))cfg.slots[0]='KB+M';
  PSG.title();
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
  function kill(){
    // Single descending chirp — chun
    const c=ctx(),t=c.currentTime;
    const osc=c.createOscillator(),g=c.createGain();
    osc.connect(g);g.connect(c.destination);
    osc.type='square';
    osc.frequency.setValueAtTime(900,t);
    osc.frequency.exponentialRampToValueAtTime(380,t+.06);
    g.gain.setValueAtTime(.13,t);g.gain.exponentialRampToValueAtTime(.001,t+.07);
    osc.start(t);osc.stop(t+.08);
  }
  function bossDeath(){
    // Low descending roar
    const c=ctx(),t=c.currentTime;
    const osc=c.createOscillator(),g=c.createGain();
    osc.connect(g);g.connect(c.destination);
    osc.type='sawtooth';
    osc.frequency.setValueAtTime(160,t);
    osc.frequency.exponentialRampToValueAtTime(35,t+.9);
    g.gain.setValueAtTime(.35,t);g.gain.exponentialRampToValueAtTime(.001,t+1.0);
    osc.start(t);osc.stop(t+1.0);
    // Low noise layer
    const sz=Math.ceil(c.sampleRate*.05),buf=c.createBuffer(1,sz,c.sampleRate);
    const d=buf.getChannelData(0);for(let i=0;i<sz;i++)d[i]=Math.random()*2-1;
    const src=c.createBufferSource();src.buffer=buf;src.loop=true;
    const flt=c.createBiquadFilter();flt.type='lowpass';flt.frequency.value=280;
    const ng=c.createGain();
    ng.gain.setValueAtTime(.25,t);ng.gain.exponentialRampToValueAtTime(.001,t+.8);
    src.connect(flt);flt.connect(ng);ng.connect(c.destination);
    src.start(t);src.stop(t+.8);
  }
  function npcFall(){
    const c=ctx(),t=c.currentTime;
    const osc=c.createOscillator(),g=c.createGain();
    osc.type='sawtooth';
    osc.frequency.setValueAtTime(480,t);
    osc.frequency.exponentialRampToValueAtTime(55,t+.75);
    g.gain.setValueAtTime(.28,t);g.gain.exponentialRampToValueAtTime(.001,t+.8);
    osc.connect(g);g.connect(c.destination);
    osc.start(t);osc.stop(t+.8);
    // vibrato-like wobble via second osc
    const osc2=c.createOscillator(),g2=c.createGain();
    osc2.type='square';
    osc2.frequency.setValueAtTime(490,t);
    osc2.frequency.exponentialRampToValueAtTime(58,t+.75);
    g2.gain.setValueAtTime(.09,t);g2.gain.exponentialRampToValueAtTime(.001,t+.7);
    osc2.connect(g2);g2.connect(c.destination);
    osc2.start(t);osc2.stop(t+.8);
  }
  return{clang,driver,kill,bossDeath,npcFall};
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
  // D01-20: major               → bright adventure start
  // D21-40: lydian              → soaring, uplifting (#4 gives floating feel)
  // D41-60: mixolydian          → driving heroic energy (b7 adds punch)
  // D61-80: dorian              → dark hero — tense but still fighting
  // D81-100: major high BPM    → triumphant climax, earned glory
  const ZONES=[
    {sc:[0,2,4,5,7,9,11],root:48,bpmBase:90},
    {sc:[0,2,4,6,7,9,11],root:50,bpmBase:108},
    {sc:[0,2,4,5,7,9,10],root:48,bpmBase:126},
    {sc:[0,2,3,5,7,9,10],root:46,bpmBase:148},
    {sc:[0,2,4,5,7,9,11],root:52,bpmBase:162},
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

  let _titleActive=false;

  return{
    play(st){
      _titleActive=false;this.stop();init();
      const z=zone(st);
      bpm=z.bpmBase+(st%20)*.55; // gentle BPM drift within each zone
      pat=genPat(st);step=0;
      const start=()=>{nextT=AC.currentTime+.08;seqId=setInterval(sched,25);};
      if(AC.state==='suspended'){AC.resume().then(start);}else{start();}
    },
    stop(){if(seqId){clearInterval(seqId);seqId=null;}_titleActive=false;},
    resume(){if(AC&&AC.state==='suspended')AC.resume();},
    boss(st){
      this.stop();init();
      bpm=172+(st%10)*.8; // fast & slightly varies per boss floor
      pat=genBossPat(st);step=0;
      const startB=()=>{nextT=AC.currentTime+.08;};
      if(AC.state==='suspended'){AC.resume().then(startB);}else{startB();}
      nextT=AC.currentTime+.08;
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
    },
    // Title screen BGM — A dorian, 126 BPM, 16 steps
    // Melody phrase 1: A4 _ C5 _ E5 D5 C5 _  (ascends to E5, settles)
    // Melody phrase 2: A4 B4 C5 E5 A5 _ G5 E5 (climbs to A5, resolves down)
    title(){
      if(_titleActive)return; // already playing, don't restart on UI redraws
      _titleActive=true;this.stop();_titleActive=true;init();
      const bpmT=126;
      const mel =[69,null,72,null,76,74,72,null, 69,71,72,76,81,null,79,76];
      const bass=[45,null,45,null,52,null,50,null, 45,null,45,null,52,null,45,null];
      const arp =[57,60,64,69,72,69,64,60, 57,59,60,64,69,71,72,69];
      let tStep=0;
      const sd=60/bpmT/2;
      const play=()=>{
        while(nextT<AC.currentTime+.18){
          const i=tStep%16;
          if(mel[i] !==null)noteOn(midi(mel[i]), 'square',  .14,nextT,sd*.75);
          if(bass[i]!==null)noteOn(midi(bass[i]),'triangle',.20,nextT,sd*1.5);
          if(arp[i] !==null)noteOn(midi(arp[i]), 'square',  .05,nextT,sd*.35);
          if(i%8===0)noiseOn(100,.08,nextT,.09);    // kick (half-time, every bar)
          if(i%8===4)noiseOn(1100,.04,nextT,.04);   // snare (half-time)
          if(i%4===0)noiseOn(5000,.015,nextT,.02);  // hi-hat (quarter notes)
          tStep++;nextT+=sd;
        }
      };
      if(AC.state==='suspended'){AC.resume().then(()=>{nextT=AC.currentTime+.08;seqId=setInterval(play,22);});}
      else{nextT=AC.currentTime+.08;seqId=setInterval(play,22);}
    },
    // Coffee break jingle — Namco early-80s style, G major, 168 BPM
    // Phrase 1: B4 _ D5 G5 E5 D5 B4 _   (ascend to G5, resolve down)
    // Phrase 2: G4 B4 D5 E5 G5 A5 G5 _  (run up to A5, land on G5)
    jingle(){
      this.stop();init();
      const bpmJ=168;
      const mel =[71,null,74,79,76,74,71,null, 67,71,74,76,79,81,79,null];
      const bass=[43,null,43,null,50,null,50,null, 43,null,43,null,41,null,43,null];
      const arp =[55,59,62,67,62,59,55,59, 55,59,62,64,67,69,67,64];
      let jStep=0;
      const sd=60/bpmJ/2;
      const play=()=>{
        while(nextT<AC.currentTime+.18){
          const i=jStep%16;
          if(mel[i] !==null)noteOn(midi(mel[i]), 'square',  .16,nextT,sd*.72);
          if(bass[i]!==null)noteOn(midi(bass[i]),'triangle',.22,nextT,sd*1.4);
          if(arp[i] !==null)noteOn(midi(arp[i]), 'square',  .06,nextT,sd*.30);
          if(i%8===0)noiseOn(120, .07,nextT,.06);   // soft kick
          if(i%4===2)noiseOn(1200,.04,nextT,.025);  // soft snare
          jStep++;nextT+=sd;
        }
      };
      if(AC.state==='suspended'){AC.resume().then(()=>{nextT=AC.currentTime+.08;seqId=setInterval(play,22);});}
      else{nextT=AC.currentTime+.08;seqId=setInterval(play,22);}
    }
  };
})();

