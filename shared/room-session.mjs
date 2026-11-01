import {createWorld} from './game-engine.mjs';
export const PROTOCOL=5;
export const HEALTH={game:'ball-fight-online',protocol:5,authority:'server',version:'2.7.0',heroCount:12,maxPlayers:4,modes:['1v1','boss']};
export const HERO_IDS=new Set(createWorld({heroes:['Dummies','Dummies'],seed:1}).heroes);
export const BOSS_IDS=new Set(['mineKing','twinColossus','stormArchon','voidMatriarch','prismHydra']);
const zero=()=>({x:0,y:0});
export class RoomSession{
 constructor(code,platform={},saved=null){this.code=code;this.platform=platform;this.peers=new Map();this.mode=saved?.mode==='boss'?'boss':'1v1';this.heroes=saved?.heroes||['Fakhmolitionator','Fakhmolitionator'];this.ready=saved?.ready||[false,false];this.bossId=saved?.bossId||'mineKing';this.ticket=saved?.ticket||'';this.reservedUntil=saved?.reservedUntil||0;this.world=null;this.lastTick=0;this.accumulator=0;this.lastSend=0;this.playing=false;this.result=saved?.result||null;this.restarted=!!saved?.playing;}
 get capacity(){return this.mode==='1v1'?2:4;}
 save(){this.platform.persist?.({mode:this.mode,heroes:this.heroes,ready:this.ready,bossId:this.bossId,ticket:this.ticket,reservedUntil:this.reservedUntil,playing:this.playing,result:this.result});}
 reserve(ticket,now=Date.now()){if(this.peers.size||this.playing||this.reservedUntil>now)return false;this.ticket=ticket;this.reservedUntil=now+120000;this.result=null;this.save();return true;}
 attach(id,socket,slot=null){this.peers.set(id,{id,socket,slot,lastSeq:0,lastAction:0,lastState:null,fullAt:0,rateAt:0,rateCount:0});}
 send(peer,msg){if(!peer)return;try{this.platform.send(peer.socket,msg);}catch(_){}}
 broadcast(msg){for(const p of this.members())this.send(p,msg);}
 members(){return [...this.peers.values()].filter(p=>Number.isInteger(p.slot)).sort((a,b)=>a.slot-b.slot);}
 roster(type='heroes'){for(const p of this.members())this.send(p,{type,protocol:5,authority:'server',code:this.code,role:p.slot===0?'host':'guest',slot:p.slot,mode:this.mode,capacity:this.capacity,count:this.members().length,heroes:this.heroes.slice(),ready:this.ready.slice(),bossId:this.bossId});this.save();}
 error(peer,message){this.send(peer,{type:'error',message});}
 handle(id,raw,now=Date.now()){
 const peer=this.peers.get(id);if(!peer)return;if(typeof raw!=='string'||raw.length>8192){this.platform.close?.(peer.socket,1009,'Pesan terlalu besar');return;}
 if(now-peer.rateAt>=1000){peer.rateAt=now;peer.rateCount=0;}if(++peer.rateCount>100){this.platform.close?.(peer.socket,1008,'Terlalu banyak pesan');return;}
 let m;try{m=JSON.parse(raw);}catch(_){return this.error(peer,'Pesan tidak valid.');}if(!m||typeof m!=='object'||Array.isArray(m))return;
 if(m.type==='ping'){this.send(peer,{type:'pong',sentAt:m.sentAt,serverNow:now});return;}
 if(m.type==='create'){
  if(peer.slot!==null||this.members().length)return this.error(peer,'Room sudah digunakan.');
  if(m.protocol!==5||m.ticket!==this.ticket||this.reservedUntil<now)return this.error(peer,'Reservasi tidak valid. Buat room lagi memakai HTML/web 2.7.0.');
  if(!['1v1','boss'].includes(m.mode))return this.error(peer,'Versi ini mendukung Party 1v1 atau Boss; tim PvP ditunda.');this.mode=m.mode;this.heroes=Array(this.capacity).fill('Fakhmolitionator');this.ready=Array(this.capacity).fill(false);peer.slot=0;this.ticket='';this.platform.attachMeta?.(peer.socket,{slot:0});this.roster('created');return;
 }
 if(m.type==='join'){
  if(m.protocol!==5)return this.error(peer,'Perbarui APK/web ke versi server-authoritative.');
  if(peer.slot!==null)return this.error(peer,'Sudah berada di room.');if(this.playing||this.result)return this.error(peer,'Pertandingan masih aktif. Tunggu kembali ke room.');
  const players=this.members();if(!players.some(p=>p.slot===0))return this.error(peer,'Kode room tidak ditemukan atau host sudah keluar.');if(players.length>=this.capacity)return this.error(peer,'Room penuh.');
  peer.slot=players.length;this.ready[peer.slot]=false;this.platform.attachMeta?.(peer.socket,{slot:peer.slot});this.roster('heroes');this.send(peer,{type:'joined',protocol:5,authority:'server',code:this.code,role:'guest',slot:peer.slot,mode:this.mode,capacity:this.capacity,count:this.members().length,heroes:this.heroes.slice(),ready:this.ready.slice(),bossId:this.bossId});return;
 }
 if(peer.slot===null)return this.error(peer,'Bergabung ke room terlebih dahulu.');
 if(m.type==='leave'){this.leave(id);this.send(peer,{type:'left'});return;}
 if(m.type==='choose_hero'){if(this.playing||this.result||!HERO_IDS.has(m.hero))return this.error(peer,'Hero tidak dapat dipilih.');this.heroes[peer.slot]=m.hero;this.ready[peer.slot]=false;this.roster();return;}
 if(m.type==='choose_boss'){if(peer.slot!==0||this.mode!=='boss'||this.playing||!BOSS_IDS.has(m.bossId))return;this.bossId=m.bossId;this.ready.fill(false);this.roster();return;}
 if(m.type==='ready'){if(this.playing||this.result||typeof m.ready!=='boolean')return;this.ready[peer.slot]=m.ready;this.roster();return;}
 if(m.type==='start_test'){
  if(peer.slot!==0)return this.error(peer,'Hanya pembuat room yang dapat memulai.');if(this.playing||this.result)return;
  const n=this.members().length;if((this.mode!=='boss'&&n!==this.capacity)||!this.ready.slice(0,n).every(Boolean))return this.error(peer,'Jumlah pemain belum lengkap atau belum semua SIAP.');
  // Deliberately ignore any client walls, HP, damage, positions or winner.
  this.world=createWorld({mode:this.mode,heroes:this.heroes.slice(0,n),bossId:this.bossId,ruleset:this.mode==='1v1'?'party-v2':'classic'});this.playing=true;this.result=null;this.lastTick=now;this.accumulator=0;this.lastSend=now;this.startedAt=now;
  for(const p of this.members()){p.lastSeq=0;p.lastAction=0;p.lastState=null;}
  this.broadcast(this.world.start);this.emitState(now,true);this.save();this.platform.active?.();return;
 }
 if(m.type==='stop_test'){
  if(this.world&&!this.result){this.result=this.world.end('stopped','DRAW');this.emitState(now,true);}
  this.world=null;this.playing=false;this.result=null;this.ready.fill(false);this.platform.idle?.();this.broadcast({type:'test_stopped',ready:this.ready});this.save();return;
 }
 if(m.type==='resync'){if(this.world)this.sendState(peer,this.world.snapshot(),now,true);else if(this.result)this.sendState(peer,this.result,now,true);return;}
 if(!this.playing||!this.world)return;
 if(m.type==='input'){if(!Number.isSafeInteger(m.seq)||m.seq<=peer.lastSeq||!Number.isFinite(m.x)||!Number.isFinite(m.y))return;peer.lastSeq=m.seq;this.world.input(peer.slot,m.x,m.y,m.seq);return;}
 if(m.type==='action'){if(!['skill','skill2','ult'].includes(m.action)||!Number.isSafeInteger(m.seq)||m.seq<=peer.lastAction||!Number.isFinite(m.angle))return;peer.lastAction=m.seq;this.world.action(peer.slot,m.action,Math.atan2(Math.sin(m.angle),Math.cos(m.angle)));return;}
 // Client snapshots, damage totals, state and victory messages are NEVER accepted.
 if(['battle_state','state','result','damage'].includes(m.type))this.error(peer,'State pertandingan hanya boleh dihitung server.');
 }
 tick(now=Date.now()){
  if(!this.playing||!this.world)return;let elapsed=Math.max(0,Math.min(250,now-this.lastTick));this.lastTick=now;this.accumulator+=elapsed;let steps=0;
  while(this.accumulator>=1000/60&&steps++<15&&!this.world.finished){this.world.step(1000/60);this.accumulator-=1000/60;}
  if(this.world.finished){this.result=this.world.snapshot();this.playing=false;this.emitState(now,true);this.platform.idle?.();this.save();return;}
  if(now-this.lastSend>=50){this.lastSend=now;this.emitState(now);}
 }
 sendState(peer,state,now,force=false){const full=force||!peer.lastState||state.party?.round!==peer.lastState?.party?.round||now-peer.fullAt>=1000;let packet;
  if(full){packet={...state,delta:false,serverNow:now};peer.fullAt=now;}
  else{packet={type:'battle_state',protocol:5,authority:'server',delta:true,baseTick:peer.lastState.tick,tick:state.tick,serverNow:now,simTime:state.simTime,winner:state.winner,players:state.players.map((p,i)=>{const old=peer.lastState.players[i]?.data||{},data={};for(const[k,v]of Object.entries(p.data))if(JSON.stringify(v)!==JSON.stringify(old[k]))data[k]=v;return{data,ready:p.ready};})};for(const key of ['shots','effects','drops','blasts','boss','hazards','names','damage','ack','motion','party'])if(JSON.stringify(state[key])!==JSON.stringify(peer.lastState[key]))packet[key]=state[key];}
  peer.lastState=state;this.send(peer,packet);
 }
 emitState(now,force=false){const state=this.world?.snapshot()||this.result;if(!state)return;for(const p of this.members())this.sendState(p,state,now,force);}
 leave(id){const peer=this.peers.get(id);if(!peer)return;const wasPlayer=peer.slot!==null;this.peers.delete(id);if(!wasPlayer)return;
  if(this.playing&&this.world){this.result=this.world.end('player_left','DRAW');this.playing=false;this.emitState(Date.now(),true);this.platform.idle?.();}
  this.world=null;this.result=null;this.ready.fill(false);
  if(peer.slot===0){for(const p of this.members()){this.send(p,{type:'room_closed'});p.slot=null;this.platform.attachMeta?.(p.socket,{slot:null});}this.heroes=['Fakhmolitionator','Fakhmolitionator'];this.mode='1v1';}
  else{const old=this.heroes.slice();for(const [i,p]of this.members().entries()){this.heroes[i]=old[p.slot];p.slot=i;this.platform.attachMeta?.(p.socket,{slot:i});}this.broadcast({type:'test_stopped',ready:this.ready});this.roster('peer_left');}
  this.save();
 }
}
