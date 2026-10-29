// Ball Fight: relay 1v1/2v2 dengan Cloudflare Durable Objects.
// Host mensimulasikan semua hero; relay hanya meneruskan input dan snapshot.
// READY_BOSS_RELAY_V1
const HEROES = new Set([
    'Dummies', 'BladeDancer', 'Mathemathing', 'Gravity',
    'Wemmball', 'Vexen', 'Bane', 'Gloo',
    'Fakhmolitionator', 'Amat', 'Deadbibi', 'PakParkir',
    'Bakso', 'Bantal', 'Nyamuk', 'Sandal',
    'Phantom', 'VoltArrow', 'MagmaMortar', 'FrostCrossbow',
    'OrbitalRay', 'ToxicBlower', 'RicochetDisc', 'SonicWave',
    'NeedleSpinner', 'PhotonCannon', 'GooLauncher', 'HarpoonGunner',
    'BoomerangMaster', 'ShurikenShadow', 'PlasmaSniper', 'FireworksCluster',
    'ChronoSlinger', 'AeroMissile', 'AcidMortar', 'LaserPrism',
    'FeatherDart', 'AshenBrawler', 'TitanShield', 'SawtoothWheel',
    'VampireKnight', 'SumoMaster', 'LancerDragoon', 'CounterDuelist',
    'ChainWrecker', 'GladiatorPugilist', 'ImpactHammer', 'SteamStriker',
    'SpikeHedgehog', 'KarateBlackbelt', 'MonkStaff', 'BouncerTrampoline',
    'RiderCharger', 'DreadBerserker', 'CactusPuncher', 'IronJaw',
    'MagmaGolem', 'PhantomDagger', 'ShadowNinja', 'VenomSerpent',
    'FlashBlade', 'GrimReaper', 'CyberAssassin', 'GripFang',
    'VoidStalker', 'BloodRaven', 'LaserStriker', 'PoisonDartist',
    'SpecterGhost', 'KestrelFalcon', 'ChronoBackstabber', 'NeedleExecutioner',
    'RoseDuelist', 'ShurikenMaster', 'NightshadeVenom', 'WarpBlade',
    'GaleAssassin', 'IronBastion', 'MagmaRhino', 'GravitonCore',
    'BumperPinball', 'IceWallWarden', 'ReflectorShield', 'SlimeDivider',
    'SandwormBurrower', 'AegisGuardian', 'ShockwaveTitan', 'ElectroCage',
    'TarballPit', 'VortexAnchor', 'BoulderRoll', 'SpikeFortress',
    'MoltenTank', 'BubbleGuardian', 'MagneticDefender', 'JuggernautHull',
    'ChainWarden', 'ChronosMage', 'PyromancerCore', 'FrostbiteSorcerer',
    'TelekinesisOrb', 'IllusionistMirror', 'NecroSummoner', 'AlchemistChem',
    'PortalArchitect', 'ZeusThundergod', 'SingularityVoid', 'ManaSiphon',
    'HexCurser', 'SolarFlareMage', 'GravityInverter', 'SpatialDistorter',
    'ChainSpark', 'PlagueCarrier', 'TimeRewinder', 'TornadoSummoner',
    'CosmicSupernova', 'SiameseSlasher',
]);
const ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const DEFAULT_HERO='Fakhmolitionator';
const POWERUPS=new Set(['heal','shield','haste','cooldown','ult','blast']);
const BOSS_IDS=new Set(['mineKing','twinColossus','stormArchon','voidMatriarch','prismHydra']);
const limit=65536,empty=()=>({role:null,code:null}),clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const send=(ws,data)=>{try{if(ws&&ws.readyState===1)ws.send(JSON.stringify(data));}catch(_){}};
const read=ws=>{try{return ws.deserializeAttachment()||empty();}catch(_){return empty();}};
const save=(ws,data)=>ws.serializeAttachment(data);
function cleanHeroName(value){if(typeof value!=='string')return'';const cleaned=value.normalize('NFKC').replace(/[\u0000-\u001f\u007f<>&"'`\\]/g,'').replace(/\s+/g,' ').trim();return Array.from(cleaned).slice(0,24).join('');}
function cleanBattleNames(value,n){return Array.isArray(value)&&value.length===n?value.map(cleanHeroName):null;}
function cleanDrops(value){if(value===undefined)return[];if(!Array.isArray(value)||value.length>3)return null;const out=[];for(const p of value){if(!p||!POWERUPS.has(p.type)||!['id','x','y','age','life'].every(k=>Number.isFinite(p[k])))return null;out.push({id:p.id,type:p.type,x:clamp(p.x,0,900),y:clamp(p.y,0,900),age:clamp(p.age,0,800),life:clamp(p.life,0,20000)});}return out;}
function cleanBlasts(value,capacity){if(value===undefined)return[];if(!Array.isArray(value)||value.length>4)return null;const out=[];for(const b of value){if(!b||!['x','y','r','time','maxTime','damage','owner'].every(k=>Number.isFinite(b[k]))||!Number.isInteger(b.owner)||b.owner<0||b.owner>=capacity)return null;out.push({x:clamp(b.x,0,900),y:clamp(b.y,0,900),r:clamp(b.r,1,300),time:clamp(b.time,0,1000),maxTime:clamp(b.maxTime,1,1000),damage:clamp(b.damage,0,9999),owner:b.owner,teamId:Number.isFinite(b.teamId)?b.teamId:0});}return out;}
export default{async fetch(request,env){const url=new URL(request.url);if(url.pathname==='/health')return new Response(JSON.stringify({game:'ball-fight-online',protocol:1,maxPlayers:4,modes:['1v1','2v2','boss']}),{headers:{'content-type':'application/json; charset=utf-8','access-control-allow-origin':'*','cache-control':'no-store'}});if(url.pathname==='/room'){if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return new Response('WebSocket required',{status:426});return env.ROOMS.get(env.ROOMS.idFromName('ball-fight-private-lobby')).fetch(request);}if(url.pathname==='/')url.pathname='/game.html';return env.ASSETS.fetch(new Request(url,request));}};
export class RoomRelay{
 constructor(ctx,env){this.ctx=ctx;this.env=env;this.rates=new WeakMap();}
 async fetch(request){if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return new Response('WebSocket required',{status:426});if(this.ctx.getWebSockets().length>=100)return new Response('Server penuh',{status:503});const pair=new WebSocketPair(),client=pair[0],socket=pair[1];this.ctx.acceptWebSocket(socket);save(socket,empty());return new Response(null,{status:101,webSocket:client});}
 sockets(){return this.ctx.getWebSockets().filter(s=>s.readyState===1);}
 find(code,exclude=null){const peers=this.sockets().filter(s=>s!==exclude&&read(s).code===code),host=peers.find(s=>read(s).role==='host')||null,guests=peers.filter(s=>read(s).role==='guest').sort((a,b)=>(read(a).slot||0)-(read(b).slot||0));return{host,guests};}
 broadcast(code,message,exclude=null){const{host,guests}=this.find(code);if(host&&host!==exclude)send(host,message);for(const guest of guests)if(guest!==exclude)send(guest,message);}
 newCode(){for(let i=0;i<100;i++){const bytes=new Uint32Array(4);crypto.getRandomValues(bytes);const code=Array.from(bytes,b=>ALPHABET[b%ALPHABET.length]).join('');if(!this.find(code).host)return code;}return null;}
 leave(socket){const meta=read(socket);save(socket,empty());if(!meta.code)return;const{host,guests}=this.find(meta.code,socket);if(meta.role==='host'){for(const guest of guests){save(guest,empty());send(guest,{type:'room_closed'});}return;}if(meta.role!=='guest'||!host)return;const h=read(host),wasPlaying=h.playing;h.playing=false;h.ready=Array(h.heroes.length).fill(false);if(Number.isInteger(meta.slot)&&meta.slot>0&&meta.slot<h.heroes.length)h.heroes[meta.slot]=DEFAULT_HERO;save(host,h);if(wasPlaying)this.broadcast(meta.code,{type:'test_stopped',ready:h.ready});this.broadcast(meta.code,{type:'peer_left',code:meta.code,count:1+guests.length,slot:meta.slot,heroes:h.heroes,ready:h.ready,mode:h.mode,bossId:h.bossId});}
 async webSocketMessage(socket,raw){
  if(typeof raw!=='string'||raw.length>limit){try{socket.close(1009,'Pesan terlalu besar');}catch(_){}return;}
  const now=Date.now();let rate=this.rates.get(socket)||{start:now,count:0,lastJoin:0};if(now-rate.start>=1000){rate.start=now;rate.count=0;}this.rates.set(socket,rate);if(++rate.count>100){try{socket.close(1008,'Terlalu banyak pesan');}catch(_){}return;}
  let m;try{m=JSON.parse(raw);}catch(_){send(socket,{type:'error',message:'Pesan tidak valid.'});return;}if(!m||typeof m!=='object'||Array.isArray(m))return;const self=read(socket);
  if(m.type==='leave'){this.leave(socket);send(socket,{type:'left'});return;}
  if(m.type==='create'){if(self.code){send(socket,{type:'error',message:'Keluar dari room saat ini dulu.'});return;}if(m.mode!==undefined&&!['1v1','2v2','boss'].includes(m.mode)){send(socket,{type:'error',message:'Mode room tidak valid.'});return;}if(this.sockets().filter(s=>read(s).role==='host').length>=40){send(socket,{type:'error',message:'Server penuh. Coba lagi nanti.'});return;}const code=this.newCode();if(!code){send(socket,{type:'error',message:'Server penuh.'});return;}const mode=m.mode||'1v1',capacity=mode==='1v1'?2:4,host={role:'host',code,slot:0,playing:false,capacity,mode,heroes:Array(capacity).fill(DEFAULT_HERO),ready:Array(capacity).fill(false),bossId:'mineKing'};save(socket,host);send(socket,{type:'created',code,role:'host',slot:0,count:1,capacity,mode,heroes:host.heroes,ready:host.ready,bossId:host.bossId});return;}
  if(m.type==='join'){if(self.code){send(socket,{type:'error',message:'Keluar dari room saat ini dulu.'});return;}if(now-rate.lastJoin<750){send(socket,{type:'error',message:'Tunggu sebentar sebelum mencoba lagi.'});return;}rate.lastJoin=now;const code=typeof m.code==='string'?m.code.trim().toUpperCase():'',{host,guests}=/^[A-Z2-9]{4}$/.test(code)?this.find(code):{};if(!host){send(socket,{type:'error',message:'Kode room tidak ditemukan.'});return;}const h=read(host),capacity=h.capacity||2;if(h.playing){send(socket,{type:'error',message:'Pertandingan sedang berlangsung.'});return;}if(guests.length>=capacity-1){send(socket,{type:'error',message:'Room sudah penuh.'});return;}if(!Array.isArray(h.ready))h.ready=Array(capacity).fill(false);const used=new Set(guests.map(g=>read(g).slot));let slot=1;while(used.has(slot)&&slot<capacity)slot++;save(socket,{role:'guest',code,slot});const count=1+guests.length+1;send(socket,{type:'joined',code,role:'guest',slot,count,capacity,mode:h.mode,heroes:h.heroes,ready:h.ready,bossId:h.bossId||'mineKing'});this.broadcast(code,{type:'peer_joined',code,count,slot,heroes:h.heroes,ready:h.ready,mode:h.mode,bossId:h.bossId||'mineKing'},socket);return;}
  if(!self.code){if(m.type==='start_test'||m.type==='choose_hero')send(socket,{type:'error',message:'Kamu belum bergabung ke room.'});return;}
  const{host,guests}=this.find(self.code);if(!host)return;const h=read(host),capacity=h.capacity||2,isHost=socket===host,isGuest=guests.includes(socket),slot=isHost?0:self.slot;if(!Array.isArray(h.ready)||h.ready.length!==capacity)h.ready=Array(capacity).fill(false);if(!h.bossId)h.bossId='mineKing';
  if(m.type==='choose_hero'){if(h.playing||!HEROES.has(m.hero)||(!isHost&&!isGuest)){send(socket,{type:'error',message:'Hero tidak dapat dipilih saat ini.'});return;}h.heroes[slot]=m.hero;h.ready[slot]=false;save(host,h);this.broadcast(self.code,{type:'heroes',heroes:h.heroes,ready:h.ready,mode:h.mode,bossId:h.bossId,count:1+guests.length});return;}
  if(m.type==='ready'){if(h.playing||(!isHost&&!isGuest)||typeof m.ready!=='boolean')return;h.ready[slot]=m.ready;save(host,h);this.broadcast(self.code,{type:'heroes',heroes:h.heroes,ready:h.ready,mode:h.mode,bossId:h.bossId,count:1+guests.length});return;}
  if(m.type==='choose_boss'){if(!isHost||h.mode!=='boss'||h.playing||!BOSS_IDS.has(m.bossId)){send(socket,{type:'error',message:'Boss tidak dapat dipilih saat ini.'});return;}h.bossId=m.bossId;h.ready=Array(capacity).fill(false);save(host,h);this.broadcast(self.code,{type:'heroes',heroes:h.heroes,ready:h.ready,mode:h.mode,bossId:h.bossId,count:1+guests.length});return;}
  if(m.type==='start_test'){const count=guests.length+1;if(!isHost||(h.mode!=='boss'&&guests.length!==capacity-1)){send(socket,{type:'error',message:'Jumlah pemain belum sesuai mode.'});return;}if(h.playing)return;if(!h.ready.slice(0,count).every(Boolean)){send(socket,{type:'error',message:'Semua pemain harus menekan SIAP.'});return;}const walls=m.walls;if(!Array.isArray(walls)||(h.mode!=='boss'&&walls.length===0)||walls.length>80||!walls.every(w=>w&&['x','y','w','h'].every(k=>Number.isFinite(w[k]))&&w.x>=0&&w.y>=0&&w.w>0&&w.h>0&&w.x+w.w<=900&&w.y+w.h<=900)){send(socket,{type:'error',message:'Data map tidak valid.'});return;}h.playing=true;save(host,h);this.broadcast(self.code,{type:'test_started',walls:walls.map(w=>({x:w.x,y:w.y,w:w.w,h:w.h})),mapName:typeof m.mapName==='string'?m.mapName.slice(0,40):'ARENA',heroes:h.mode==='boss'?h.heroes.slice(0,count):h.heroes,capacity,mode:h.mode,bossId:h.bossId,playerCount:count});return;}
  if(m.type==='stop_test'){if(!h.playing||(!isHost&&!isGuest))return;h.playing=false;h.ready=Array(capacity).fill(false);save(host,h);this.broadcast(self.code,{type:'test_stopped',ready:h.ready});return;}
  if(m.type==='input'){if(!h.playing||!isGuest||!Number.isFinite(m.x)||!Number.isFinite(m.y))return;let x=clamp(m.x,-1,1),y=clamp(m.y,-1,1),len=Math.hypot(x,y);if(len>1){x/=len;y/=len;}const packet={type:'input',slot,x,y};if(Array.isArray(h.heroes)&&m.heroId===h.heroes[slot]&&HEROES.has(m.heroId)){const heroName=cleanHeroName(m.heroName);if(heroName){packet.heroId=m.heroId;packet.heroName=heroName;}}send(host,packet);return;}
  if(m.type==='action'){if(!h.playing||!isGuest||!['skill','skill2','ult'].includes(m.action)||(m.action==='skill'&&!Number.isFinite(m.angle)))return;send(host,{type:'action',slot,action:m.action,angle:m.action==='skill'?Math.atan2(Math.sin(m.angle),Math.cos(m.angle)):0});return;}
  if(m.type==='battle_state'){const ps=m.players,expected=h.mode==='boss'?guests.length+1:capacity,hazards=m.hazards===undefined?[]:m.hazards;if(!h.playing||!isHost||!Array.isArray(ps)||ps.length!==expected||!ps.every(p=>p&&typeof p==='object'&&p.data&&typeof p.data==='object')||!Array.isArray(m.shots)||m.shots.length>100||!Array.isArray(m.effects)||m.effects.length>80||!Array.isArray(hazards)||hazards.length>50)return;const drops=cleanDrops(m.drops),blasts=cleanBlasts(m.blasts,capacity);if(!drops||!blasts)return;const packet={type:'battle_state',players:ps,shots:m.shots,effects:m.effects,drops,blasts,boss:m.boss&&typeof m.boss==='object'?m.boss:null,hazards,winner:['P1','P2','P3','P4','TEAM1','TEAM2','PLAYERS','BOSS','DRAW'].includes(m.winner)?m.winner:null},names=cleanBattleNames(m.names,expected);if(names)packet.names=names;for(const guest of guests)send(guest,packet);return;}
  if(m.type==='state'){if(!h.playing||!isHost||!Array.isArray(m.positions)||m.positions.length!==(h.mode==='boss'?guests.length+1:capacity)*2||!m.positions.every(Number.isFinite))return;for(const guest of guests)send(guest,{type:'state',positions:m.positions.map(v=>clamp(v,0,900))});return;}
  send(socket,{type:'error',message:'Perintah belum tersedia.'});
 }
 async webSocketClose(socket){this.leave(socket);}async webSocketError(socket){this.leave(socket);}
}
