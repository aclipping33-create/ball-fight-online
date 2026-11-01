// HTML 2.2.1: layered, offline procedural SFX. Audio RNG never consumes gameplay RNG.
const impactAudio={context:null,noise:null,seed:0x75f451,last:new Map(),active:0,peak:0,played:0,dropped:0,maxVoices:12};
const IMPACT_PROFILES={
 hit:{duration:.17,level:1.4,noise:.37,from:1700,to:480,q:.65,gate:.055,tones:[['triangle',195,82,.27,0,.14],['sine',950,330,.08,0,.055]]},
 blade:{duration:.16,level:1.25,noise:.28,from:4200,to:950,q:.7,gate:.065,tones:[['triangle',1320,520,.13,0,.11],['sine',240,110,.12,.005,.12]]},
 bladeHeavy:{duration:.24,level:1.15,noise:.36,from:2900,to:580,q:.75,gate:.075,tones:[['triangle',860,285,.17,0,.17],['sine',185,70,.25,.005,.2]]},
 dash:{duration:.26,level:.83,noise:.41,from:3900,to:300,q:.6,rise:.025,gate:.095,tones:[['triangle',380,95,.13,.01,.2],['sine',155,72,.18,.01,.2]]},
 ultimate:{duration:.69,level:.82,noise:.25,from:750,to:4800,q:.65,rise:.12,gate:.4,tones:[['triangle',190,780,.16,0,.37],['sine',235,88,.29,.18,.38],['triangle',940,390,.1,.24,.35]]},
 clash:{duration:.16,level:1.3,noise:.31,from:2600,to:700,q:.8,gate:.085,tones:[['triangle',930,400,.16,0,.1],['sine',210,92,.21,0,.14]]},
 twang:{duration:.25,level:.8,noise:.18,from:4300,to:1250,q:1.1,gate:.09,tones:[['triangle',1280,350,.2,0,.2],['sine',1920,620,.1,.005,.22]]},
 fasiamSlash:{duration:.18,level:.82,noise:.31,from:5200,to:1350,q:.72,gate:.065,tones:[['triangle',1880,680,.11,0,.12],['sine',275,130,.1,.006,.12]]},
 fasiamPulse:{duration:.145,level:.6,noise:.18,from:3900,to:1700,q:.9,gate:.14,tones:[['sine',1800,800,.11,0,.11],['triangle',1130,460,.07,.016,.105]]},
 fasiamMerge:{duration:.24,level:.78,noise:.16,from:1300,to:4800,q:.7,rise:.035,gate:.2,tones:[['sine',440,880,.15,0,.15],['triangle',660,1320,.1,.045,.16]]}
};
function impactRandom(){impactAudio.seed=(Math.imul(impactAudio.seed,1664525)+1013904223)>>>0;return impactAudio.seed/4294967296;}
function impactNoise(){
 if(impactAudio.context===audioCtx&&impactAudio.noise)return impactAudio.noise;
 const b=audioCtx.createBuffer(1,Math.ceil(audioCtx.sampleRate*.85),audioCtx.sampleRate),data=b.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=impactRandom()*2-1;
 impactAudio.context=audioCtx;impactAudio.noise=b;impactAudio.last.clear();return b;
}
function playImpact(kind){
 if(!audioCtx||!sfxBus||audioCtx.state!=='running'||preferences.sfx<=0||document.hidden)return false;
 const cfg=IMPACT_PROFILES[kind];if(!cfg)return false;const buffer=impactNoise(),t=audioCtx.currentTime,last=impactAudio.last.get(kind);
 if((last!==undefined&&t-last<cfg.gate)||impactAudio.active>=impactAudio.maxVoices){impactAudio.dropped++;return false;}
 impactAudio.last.set(kind,t);impactAudio.active++;impactAudio.peak=Math.max(impactAudio.peak,impactAudio.active);impactAudio.played++;
 const nodes=[],sources=[],group=audioCtx.createGain();nodes.push(group);group.gain.value=cfg.level;group.connect(['fosaRevive','parrySuccess','counterSlash'].includes(kind)&&impactAudio.audibleBus?impactAudio.audibleBus:sfxBus);
 const vary=.96+impactRandom()*.08;
 function envelope(g,level,start,duration,rise=.004){g.gain.setValueAtTime(.0001,start);g.gain.linearRampToValueAtTime(level,start+Math.min(rise,duration*.3));g.gain.exponentialRampToValueAtTime(.0001,start+duration);}
 const noise=audioCtx.createBufferSource(),filter=audioCtx.createBiquadFilter(),ng=audioCtx.createGain();noise.buffer=buffer;filter.type='bandpass';filter.Q.value=cfg.q;filter.frequency.setValueAtTime(cfg.from*vary,t);filter.frequency.exponentialRampToValueAtTime(cfg.to*vary,t+cfg.duration);envelope(ng,cfg.noise,t,cfg.duration,cfg.rise||.004);noise.connect(filter);filter.connect(ng);ng.connect(group);nodes.push(noise,filter,ng);sources.push({node:noise,start:t,end:t+cfg.duration+.015});
 for(const[type,from,to,level,offset,duration]of cfg.tones){const o=audioCtx.createOscillator(),g=audioCtx.createGain(),start=t+offset;o.type=type;o.frequency.setValueAtTime(from*vary,start);o.frequency.exponentialRampToValueAtTime(to*vary,start+duration);envelope(g,level,start,duration);o.connect(g);g.connect(group);nodes.push(o,g);sources.push({node:o,start,end:start+duration+.015});}
 let pending=sources.length;for(const source of sources){source.node.onended=()=>{if(--pending===0){for(const n of nodes){try{n.disconnect();}catch(_){}}impactAudio.active=Math.max(0,impactAudio.active-1);}};source.node.start(source.start);source.node.stop(source.end);}
 return true;
}
function playFasiamSlash(hit=false){return playImpact(hit?'blade':'fasiamSlash');}
function playFasiamPulse(){return playImpact('fasiamPulse');}
function playFasiamMerge(){return playImpact('fasiamMerge');}
function previewImpactAudio(){initAudio();playImpact('hit');setTimeout(()=>playImpact('bladeHeavy'),200);setTimeout(()=>playImpact('dash'),480);setTimeout(()=>playImpact('ultimate'),850);}
