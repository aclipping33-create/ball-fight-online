// Relay game Ball Fight untuk uji online pribadi; host tetap menjalankan simulasi.
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {serveAssets} = require('./asset-files.cjs');
function lanAddresses() {
    try { return [...new Set(Object.values(os.networkInterfaces()).flat().filter(x => x && (x.family === 'IPv4' || x.family === 4) && !x.internal).map(x => x.address))]; } catch (_) { return []; }
}
const { WebSocketServer, WebSocket } = require('ws');
const { randomInt } = require('crypto');

const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost').pathname;
    if (url === '/health') {
        res.writeHead(200, {'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
        return res.end(JSON.stringify({game:'ball-fight-online',protocol:1,maxPlayers:4,modes:['1v1','2v2','boss']}));
    }
    if (url === '/lan-info') {
        res.writeHead(200, {'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'});
        return res.end(JSON.stringify({ips:lanAddresses()}));
    }
    if (serveAssets(req,res,url)) return;
    if (url !== '/' && url !== '/game.html') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('Tidak ditemukan');
    }
    fs.readFile(path.join(__dirname, 'game.html'), (err, html) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
            return res.end('File game.html tidak ditemukan di folder server.');
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(html);
    });
});

const wss = new WebSocketServer({ server, maxPayload: 65536, perMessageDeflate: false });
// Room hanya disimpan di memori, untuk percobaan pada jaringan tepercaya.
const rooms = new Map();
const heroIds = new Set([
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
    'CosmicSupernova', 'SiameseSlasher', 'Goshiki', 'ARitdri',
]);

const DEFAULT_HERO='Fakhmolitionator';
const POWERUPS=new Set(['heal','shield','haste','cooldown','ult','blast']);
const BOSS_IDS=new Set(['mineKing','twinColossus','stormArchon','voidMatriarch','prismHydra']);
// READY_BOSS_RELAY_V1
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function cleanHeroName(value){if(typeof value!=='string')return'';const cleaned=value.normalize('NFKC').replace(/[\u0000-\u001f\u007f<>&"'`\\]/g,'').replace(/\s+/g,' ').trim();return Array.from(cleaned).slice(0,24).join('');}
function cleanBattleNames(value,n){return Array.isArray(value)&&value.length===n?value.map(cleanHeroName):null;}
function cleanDrops(value){if(value===undefined)return[];if(!Array.isArray(value)||value.length>3)return null;const out=[];for(const p of value){if(!p||!POWERUPS.has(p.type)||!['id','x','y','age','life'].every(k=>Number.isFinite(p[k])))return null;out.push({id:p.id,type:p.type,x:clamp(p.x,0,900),y:clamp(p.y,0,900),age:clamp(p.age,0,800),life:clamp(p.life,0,20000)});}return out;}
function cleanBlasts(value,capacity){if(value===undefined)return[];if(!Array.isArray(value)||value.length>4)return null;const out=[];for(const b of value){if(!b||!['x','y','r','time','maxTime','damage','owner'].every(k=>Number.isFinite(b[k]))||!Number.isInteger(b.owner)||b.owner<0||b.owner>=capacity)return null;out.push({x:clamp(b.x,0,900),y:clamp(b.y,0,900),r:clamp(b.r,1,300),time:clamp(b.time,0,1000),maxTime:clamp(b.maxTime,1,1000),damage:clamp(b.damage,0,9999),owner:b.owner,teamId:Number.isFinite(b.teamId)?b.teamId:0});}return out;}
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function send(socket,message){if(socket&&socket.readyState===WebSocket.OPEN&&socket.bufferedAmount<262144)socket.send(JSON.stringify(message));}
function broadcast(room,message,except=null){if(room.host!==except)send(room.host,message);for(const socket of room.guests.values())if(socket!==except)send(socket,message);}
function newCode(){for(let i=0;i<100;i++){let code='';for(let j=0;j<4;j++)code+=alphabet[randomInt(alphabet.length)];if(!rooms.has(code))return code;}return null;}
function leave(socket){const code=socket.room,room=code&&rooms.get(code);socket.room=null;if(!room)return;if(room.host===socket){rooms.delete(code);for(const guest of room.guests.values()){guest.room=null;send(guest,{type:'room_closed'});}return;}const slot=socket.slot;if(room.guests.get(slot)!==socket)return;room.guests.delete(slot);const wasPlaying=room.playing;room.playing=false;room.ready=Array(room.heroes.length).fill(false);room.heroes[slot]=DEFAULT_HERO;if(wasPlaying)broadcast(room,{type:'test_stopped',ready:room.ready});broadcast(room,{type:'peer_left',code,count:1+room.guests.size,slot,heroes:room.heroes,ready:room.ready,mode:room.mode,bossId:room.bossId});}
wss.on('connection',(socket,request)=>{
 if(request.url!=='/room'||wss.clients.size>100){socket.close(1008,'Tidak tersedia');return;}socket.alive=true;socket.on('pong',()=>{socket.alive=true;});socket.rateAt=Date.now();socket.rateCount=0;socket.lastJoin=0;socket.slot=null;
 socket.on('message',(data,isBinary)=>{
  if(isBinary)return;const now=Date.now();if(now-socket.rateAt>=1000){socket.rateAt=now;socket.rateCount=0;}if(++socket.rateCount>100){socket.close(1008,'Terlalu banyak pesan');return;}let msg;try{msg=JSON.parse(data.toString());}catch(_){send(socket,{type:'error',message:'Pesan tidak valid.'});return;}if(!msg||typeof msg!=='object'||Array.isArray(msg))return;
  if(msg.type==='leave'){leave(socket);send(socket,{type:'left'});return;}
  if(msg.type==='create'){if(socket.room){send(socket,{type:'error',message:'Keluar dari room saat ini dulu.'});return;}if(msg.mode!==undefined&&!['1v1','2v2','boss'].includes(msg.mode)){send(socket,{type:'error',message:'Mode room tidak valid.'});return;}if(rooms.size>=40){send(socket,{type:'error',message:'Server sedang penuh. Coba lagi nanti.'});return;}const code=newCode();if(!code){send(socket,{type:'error',message:'Room penuh. Coba lagi.'});return;}const mode=msg.mode||'1v1',capacity=mode==='1v1'?2:4;rooms.set(code,{host:socket,guests:new Map(),playing:false,capacity,mode,heroes:Array(capacity).fill(DEFAULT_HERO),ready:Array(capacity).fill(false),bossId:'mineKing'});socket.room=code;socket.slot=0;const room=rooms.get(code);send(socket,{type:'created',code,role:'host',slot:0,count:1,capacity,mode,heroes:room.heroes,ready:room.ready,bossId:room.bossId});return;}
  const room=rooms.get(socket.room);
  if(msg.type==='join'){if(socket.room){send(socket,{type:'error',message:'Keluar dari room saat ini dulu.'});return;}if(now-socket.lastJoin<750){send(socket,{type:'error',message:'Tunggu sebentar sebelum mencoba kode lagi.'});return;}socket.lastJoin=now;const code=typeof msg.code==='string'?msg.code.toUpperCase().trim():'',room=/^[A-Z2-9]{4}$/.test(code)?rooms.get(code):null;if(!room){send(socket,{type:'error',message:'Kode room tidak ditemukan.'});return;}if(room.playing){send(socket,{type:'error',message:'Pertandingan sedang berlangsung.'});return;}if(room.guests.size>=room.capacity-1){send(socket,{type:'error',message:'Room sudah penuh.'});return;}if(!Array.isArray(room.ready))room.ready=Array(room.capacity).fill(false);let slot=1;while(room.guests.has(slot))slot++;room.guests.set(slot,socket);socket.room=code;socket.slot=slot;send(socket,{type:'joined',code,role:'guest',slot,count:1+room.guests.size,capacity:room.capacity,mode:room.mode,heroes:room.heroes,ready:room.ready,bossId:room.bossId||'mineKing'});broadcast(room,{type:'peer_joined',code,count:1+room.guests.size,slot,heroes:room.heroes,ready:room.ready,mode:room.mode,bossId:room.bossId||'mineKing'},socket);return;}
  if(msg.type==='choose_hero'){if(!room||room.playing||!heroIds.has(msg.hero)){send(socket,{type:'error',message:'Hero tidak dapat dipilih saat ini.'});return;}if(!Array.isArray(room.ready))room.ready=Array(room.capacity).fill(false);const index=room.host===socket?0:(room.guests.get(socket.slot)===socket?socket.slot:-1);if(index<0)return;room.heroes[index]=msg.hero;room.ready[index]=false;broadcast(room,{type:'heroes',heroes:room.heroes,ready:room.ready,mode:room.mode,bossId:room.bossId,count:1+room.guests.size});return;}
  if(msg.type==='ready'){if(!room||room.playing||typeof msg.ready!=='boolean')return;const index=room.host===socket?0:(room.guests.get(socket.slot)===socket?socket.slot:-1);if(index<0)return;if(!Array.isArray(room.ready))room.ready=Array(room.capacity).fill(false);room.ready[index]=msg.ready;broadcast(room,{type:'heroes',heroes:room.heroes,ready:room.ready,mode:room.mode,bossId:room.bossId,count:1+room.guests.size});return;}
  if(msg.type==='choose_boss'){if(!room||room.host!==socket||room.mode!=='boss'||room.playing||!BOSS_IDS.has(msg.bossId)){send(socket,{type:'error',message:'Boss tidak dapat dipilih saat ini.'});return;}room.bossId=msg.bossId;room.ready=Array(room.capacity).fill(false);broadcast(room,{type:'heroes',heroes:room.heroes,ready:room.ready,mode:room.mode,bossId:room.bossId,count:1+room.guests.size});return;}
  if(msg.type==='start_test'){const count=room?room.guests.size+1:0;if(!room||room.host!==socket||(room.mode!=='boss'&&room.guests.size!==room.capacity-1)){send(socket,{type:'error',message:'Jumlah pemain belum sesuai mode.'});return;}if(room.playing)return;if(!Array.isArray(room.ready)||!room.ready.slice(0,count).every(Boolean)){send(socket,{type:'error',message:'Semua pemain harus menekan SIAP.'});return;}const walls=msg.walls;if(!Array.isArray(walls)||(room.mode!=='boss'&&walls.length===0)||walls.length>80||!walls.every(w=>w&&['x','y','w','h'].every(k=>Number.isFinite(w[k]))&&w.x>=0&&w.y>=0&&w.w>0&&w.h>0&&w.x+w.w<=900&&w.y+w.h<=900)){send(socket,{type:'error',message:'Data map tidak valid.'});return;}room.playing=true;broadcast(room,{type:'test_started',walls:walls.map(w=>({x:w.x,y:w.y,w:w.w,h:w.h})),mapName:typeof msg.mapName==='string'?msg.mapName.slice(0,40):'ARENA',heroes:room.mode==='boss'?room.heroes.slice(0,count):room.heroes.slice(),capacity:room.capacity,mode:room.mode,bossId:room.bossId,playerCount:count});return;}
  if(msg.type==='stop_test'){if(!room||!room.playing||(room.host!==socket&&room.guests.get(socket.slot)!==socket))return;room.playing=false;room.ready=Array(room.capacity).fill(false);broadcast(room,{type:'test_stopped',ready:room.ready});return;}
  if(msg.type==='input'){if(!room||!room.playing||room.guests.get(socket.slot)!==socket||!Number.isFinite(msg.x)||!Number.isFinite(msg.y))return;let x=clamp(msg.x,-1,1),y=clamp(msg.y,-1,1);const len=Math.hypot(x,y);if(len>1){x/=len;y/=len;}const packet={type:'input',slot:socket.slot,x,y};if(Array.isArray(room.heroes)&&msg.heroId===room.heroes[socket.slot]&&heroIds.has(msg.heroId)){const heroName=cleanHeroName(msg.heroName);if(heroName){packet.heroId=msg.heroId;packet.heroName=heroName;}}send(room.host,packet);return;}
  if(msg.type==='action'){if(!room||!room.playing||room.guests.get(socket.slot)!==socket||!['skill','skill2','ult'].includes(msg.action)||(msg.action==='skill'&&!Number.isFinite(msg.angle)))return;send(room.host,{type:'action',slot:socket.slot,action:msg.action,angle:msg.action==='skill'?Math.atan2(Math.sin(msg.angle),Math.cos(msg.angle)):0});return;}
  if(msg.type==='battle_state'){const ps=msg.players,expected=room&&room.mode==='boss'?room.guests.size+1:(room?room.capacity:0),hazards=msg.hazards===undefined?[]:msg.hazards;if(!room||!room.playing||room.host!==socket||!Array.isArray(ps)||ps.length!==expected||!ps.every(p=>p&&typeof p==='object'&&p.data&&typeof p.data==='object')||!Array.isArray(msg.shots)||msg.shots.length>100||!Array.isArray(msg.effects)||msg.effects.length>80||!Array.isArray(hazards)||hazards.length>50)return;const drops=cleanDrops(msg.drops),blasts=cleanBlasts(msg.blasts,room.capacity);if(!drops||!blasts)return;const packet={type:'battle_state',players:ps,shots:msg.shots,effects:msg.effects,drops,blasts,boss:msg.boss&&typeof msg.boss==='object'?msg.boss:null,hazards,winner:['P1','P2','P3','P4','TEAM1','TEAM2','PLAYERS','BOSS','DRAW'].includes(msg.winner)?msg.winner:null},names=cleanBattleNames(msg.names,expected);if(names)packet.names=names;for(const guest of room.guests.values())send(guest,packet);return;}
  if(msg.type==='state'){const p=msg.positions;if(!room||!room.playing||room.host!==socket||!Array.isArray(p)||p.length!==(room.mode==='boss'?room.guests.size+1:room.capacity)*2||!p.every(Number.isFinite))return;for(const guest of room.guests.values())send(guest,{type:'state',positions:p.map(v=>clamp(v,0,900))});return;}
  send(socket,{type:'error',message:'Perintah belum tersedia.'});
 });
 socket.on('error',err=>console.log('Koneksi bermasalah:',err.message));socket.on('close',()=>leave(socket));
});
server.on('error',err=>console.error('Server gagal:',err.message));const pingTimer=setInterval(()=>{for(const socket of wss.clients){if(!socket.alive){socket.terminate();continue;}socket.alive=false;socket.ping();}},30000);server.on('close',()=>clearInterval(pingTimer));const port=Number(process.env.PORT)||3000;server.listen(port,'0.0.0.0',()=>console.log('Ball Fight Online siap di port '+port));
