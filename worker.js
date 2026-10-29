// Ball Fight: relay sederhana untuk mabar pribadi, menggunakan Cloudflare Durable Objects.
// Game tetap disimulasikan oleh HP host. Tidak ada akun pemain atau anti-cheat.
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
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const DEFAULT_HERO = 'Fakhmolitionator';

function cleanHeroName(value) {
    if (typeof value !== 'string') return '';
    const cleaned=value.normalize('NFKC').replace(/[\u0000-\u001f\u007f<>&"'`\\]/g,'').replace(/\s+/g,' ').trim();
    return Array.from(cleaned).slice(0,24).join('');
}
function cleanBattleNames(value) {
    return Array.isArray(value) && value.length===2 ? value.map(cleanHeroName) : null;
}

const limit = 65536;
const empty = () => ({role:null,code:null});
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const send = (ws,data) => {try{if(ws && ws.readyState === 1) ws.send(JSON.stringify(data))}catch(_){}};
const read = ws => {try {return ws.deserializeAttachment() || empty()}catch(_){return empty()}};
const save = (ws,data) => ws.serializeAttachment(data);

export default {
 async fetch(request,env){
   const url=new URL(request.url);
   if(url.pathname==='/health')return new Response(JSON.stringify({game:'ball-fight-online',protocol:1}),{headers:{'content-type':'application/json; charset=utf-8','access-control-allow-origin':'*','cache-control':'no-store'}});
   if(url.pathname==='/room'){
     if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return new Response('WebSocket required',{status:426});
     return env.ROOMS.get(env.ROOMS.idFromName('ball-fight-private-lobby')).fetch(request);
   }
   if(url.pathname==='/')url.pathname='/game.html';
   return env.ASSETS.fetch(new Request(url,request));
 }
};

export class RoomRelay {
 constructor(ctx,env){this.ctx=ctx;this.env=env;this.rates=new WeakMap()}
 async fetch(request){
   if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return new Response('WebSocket required',{status:426});
   if(this.ctx.getWebSockets().length>=100)return new Response('Server penuh',{status:503});
   const pair=new WebSocketPair(),client=pair[0],socket=pair[1];
   this.ctx.acceptWebSocket(socket);save(socket,empty());
   return new Response(null,{status:101,webSocket:client});
 }
 sockets(){return this.ctx.getWebSockets().filter(s=>s.readyState===1)}
 find(code,exclude=null){
   const peers=this.sockets().filter(s=>s!==exclude&&read(s).code===code);
   const host=peers.find(s=>read(s).role==='host')||null;
   const guest=peers.find(s=>read(s).role==='guest')||null;
   return {host,guest};
 }
 newCode(){
   for(let i=0;i<100;i++){
     const bytes=new Uint32Array(4);crypto.getRandomValues(bytes);
     const code=Array.from(bytes,b=>ALPHABET[b%ALPHABET.length]).join('');
     if(!this.find(code).host)return code;
   }return null;
 }
 leave(socket){
   const meta=read(socket);save(socket,empty());
   if(!meta.code)return;
   const peer=this.find(meta.code,socket);
   if(meta.role==='host'){
     if(peer.guest){save(peer.guest,empty());send(peer.guest,{type:'room_closed'})}
   }else if(meta.role==='guest'&&peer.host){
     const host=read(peer.host);host.playing=false;host.heroes[1]=DEFAULT_HERO;save(peer.host,host);
     send(peer.host,{type:'peer_left',code:meta.code,heroes:host.heroes});
   }
 }
 async webSocketMessage(socket,raw){
   if(typeof raw!=='string'||raw.length>limit){try{socket.close(1009,'Pesan terlalu besar')}catch(_){}return}
   const now=Date.now();let rate=this.rates.get(socket)||{start:now,count:0,lastJoin:0};
   if(now-rate.start>=1000){rate.start=now;rate.count=0}this.rates.set(socket,rate);
   if(++rate.count>100){try{socket.close(1008,'Terlalu banyak pesan')}catch(_){}return}
   let m;try{m=JSON.parse(raw)}catch(_){send(socket,{type:'error',message:'Pesan tidak valid.'});return}
   if(!m||typeof m!=='object'||Array.isArray(m))return;
   const self=read(socket);
   if(m.type==='leave'){this.leave(socket);send(socket,{type:'left'});return}
   if(m.type==='create'){
     if(self.code){send(socket,{type:'error',message:'Keluar dari room saat ini dulu.'});return}
     if(this.sockets().filter(s=>read(s).role==='host').length>=40){send(socket,{type:'error',message:'Server penuh. Coba lagi nanti.'});return}
     const code=this.newCode();if(!code){send(socket,{type:'error',message:'Server penuh.'});return}
     const host={role:'host',code,playing:false,heroes:[DEFAULT_HERO,DEFAULT_HERO]};save(socket,host);
     send(socket,{type:'created',code,role:'host',count:1,heroes:host.heroes});return;
   }
   if(m.type==='join'){
     if(self.code){send(socket,{type:'error',message:'Keluar dari room saat ini dulu.'});return}
     if(now-rate.lastJoin<750){send(socket,{type:'error',message:'Tunggu sebentar sebelum mencoba lagi.'});return}rate.lastJoin=now;
     const code=typeof m.code==='string'?m.code.trim().toUpperCase():'';
     const {host,guest}=/^[A-Z2-9]{4}$/.test(code)?this.find(code):{};
     if(!host){send(socket,{type:'error',message:'Kode room tidak ditemukan.'});return}
     if(guest){send(socket,{type:'error',message:'Room sudah penuh.'});return}
     const h=read(host);save(socket,{role:'guest',code});
     send(socket,{type:'joined',code,role:'guest',count:2,heroes:h.heroes});send(host,{type:'peer_joined',code,count:2,heroes:h.heroes});return;
   }
   if(!self.code){if(m.type==='start_test'||m.type==='choose_hero')send(socket,{type:'error',message:'Kamu belum bergabung ke room.'});return;}
   const {host,guest}=this.find(self.code);if(!host)return;
   const h=read(host),isHost=socket===host,isGuest=socket===guest;
   if(m.type==='choose_hero'){
     if(h.playing||!HEROES.has(m.hero)||(!isHost&&!isGuest)){send(socket,{type:'error',message:'Hero tidak dapat dipilih saat ini.'});return}
     h.heroes[isHost?0:1]=m.hero;save(host,h);send(host,{type:'heroes',heroes:h.heroes});send(guest,{type:'heroes',heroes:h.heroes});return;
   }
   if(m.type==='start_test'){
     if(!isHost||!guest){send(socket,{type:'error',message:'Host memerlukan dua pemain.'});return}if(h.playing)return;
     const walls=m.walls;
     if(!Array.isArray(walls)||walls.length===0||walls.length>80||!walls.every(w=>w&&['x','y','w','h'].every(k=>Number.isFinite(w[k]))&&w.x>=0&&w.y>=0&&w.w>0&&w.h>0&&w.x+w.w<=900&&w.y+w.h<=900)){
       send(socket,{type:'error',message:'Data map tidak valid.'});return;
     }
     h.playing=true;save(host,h);const start={type:'test_started',walls:walls.map(w=>({x:w.x,y:w.y,w:w.w,h:w.h})),mapName:typeof m.mapName==='string'?m.mapName.slice(0,40):'ARENA',heroes:h.heroes};send(host,start);send(guest,start);return;
   }
   if(m.type==='stop_test'){
     if(!h.playing||(!isHost&&!isGuest))return;h.playing=false;save(host,h);send(host,{type:'test_stopped'});send(guest,{type:'test_stopped'});return;
   }
   if(m.type==='input'){
     if(!h.playing||!isGuest||!Number.isFinite(m.x)||!Number.isFinite(m.y))return;
     let x=clamp(m.x,-1,1),y=clamp(m.y,-1,1),len=Math.hypot(x,y);if(len>1){x/=len;y/=len}
     const packet={type:'input',x,y};
     if(Array.isArray(h.heroes)&&m.heroId===h.heroes[1]&&HEROES.has(m.heroId)){
       const heroName=cleanHeroName(m.heroName);if(heroName){packet.heroId=m.heroId;packet.heroName=heroName;}
     }
     send(host,packet);return;
   }
   if(m.type==='action'){
     if(!h.playing||!isGuest||!['skill','skill2','ult'].includes(m.action)||(m.action==='skill'&&!Number.isFinite(m.angle)))return;
     send(host,{type:'action',action:m.action,angle:m.action==='skill'?Math.atan2(Math.sin(m.angle),Math.cos(m.angle)):0});return;
   }
   if(m.type==='battle_state'){
     const ps=m.players;
     if(!h.playing||!isHost||!Array.isArray(ps)||ps.length!==2||!ps.every(p=>p&&typeof p==='object'&&p.data&&typeof p.data==='object')||!Array.isArray(m.shots)||m.shots.length>100||!Array.isArray(m.effects)||m.effects.length>80)return;
     const packet={type:'battle_state',players:ps,shots:m.shots,effects:m.effects,winner:['P1','P2','DRAW'].includes(m.winner)?m.winner:null};
     const names=cleanBattleNames(m.names);if(names)packet.names=names;send(guest,packet);return;
   }
   if(m.type==='state'){
     if(!h.playing||!isHost||!Array.isArray(m.positions)||m.positions.length!==4||!m.positions.every(Number.isFinite))return;
     send(guest,{type:'state',positions:m.positions.map(v=>clamp(v,0,900))});return;
   }
   send(socket,{type:'error',message:'Perintah belum tersedia.'});
 }
 async webSocketClose(socket){this.leave(socket)}
 async webSocketError(socket){this.leave(socket)}
}
