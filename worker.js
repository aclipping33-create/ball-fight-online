import {RoomSession,HEALTH} from './shared/room-session.mjs';
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',limits=new Map();
const cors={'access-control-allow-origin':'*','access-control-allow-methods':'GET,OPTIONS','cache-control':'no-store'};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'content-type':'application/json; charset=utf-8'}});
const roomCode=()=>Array.from(crypto.getRandomValues(new Uint8Array(4)),x=>alphabet[x%alphabet.length]).join('');
export default {async fetch(request,env){
 const url=new URL(request.url);if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(url.pathname==='/health')return json(HEALTH);
 if(url.pathname==='/allocate'){
  const ip=request.headers.get('CF-Connecting-IP')||'unknown',now=Date.now(),rate=limits.get(ip)||{at:now,n:0};if(now-rate.at>60000){rate.at=now;rate.n=0;}if(++rate.n>12)return json({error:'Terlalu sering membuat room. Tunggu satu menit.'},429);limits.set(ip,rate);if(limits.size>2048)limits.delete(limits.keys().next().value);
  for(let i=0;i<8;i++){const code=roomCode(),ticket=crypto.randomUUID(),id=env.ROOMS.idFromName('online12-v5:'+code),stub=env.ROOMS.get(id,{locationHint:'apac'});const response=await stub.fetch(new Request('https://room.internal/reserve',{method:'POST',body:JSON.stringify({code,ticket})}));if(response.ok)return json({code,ticket,protocol:5});}
  return json({error:'Belum bisa membuat room. Coba lagi.'},503);
 }
 if(url.pathname==='/room'){
  const code=(url.searchParams.get('code')||'').toUpperCase();if(!/^[A-Z2-9]{4}$/.test(code)||url.searchParams.get('protocol')!=='5')return json({error:'Server ini memerlukan HTML/web 2.7.0.'},409);
  if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return new Response('WebSocket required',{status:426});return env.ROOMS.get(env.ROOMS.idFromName('online12-v5:'+code),{locationHint:'apac'}).fetch(request);
 }
 if(url.pathname==='/')url.pathname='/index.html';return env.ASSETS.fetch(new Request(url,request));
}};
// Class name and v1 SQLite migration stay unchanged. New per-room IDs isolate matches.
export class RoomRelay{
 constructor(ctx,env){this.ctx=ctx;this.env=env;this.timer=null;this.room=null;ctx.blockConcurrencyWhile(async()=>{const saved=await ctx.storage.get('room');const code=saved?.code||'';this.makeRoom(code,saved);for(const socket of ctx.getWebSockets()){let m={};try{m=socket.deserializeAttachment()||{};}catch(_){}this.room.attach(socket,socket,Number.isInteger(m.slot)?m.slot:null);}if(this.room.restarted){this.room.ready.fill(false);this.room.save();this.room.broadcast({type:'test_stopped',ready:this.room.ready,reason:'server_restart'});}});}
 makeRoom(code,saved=null){this.room=new RoomSession(code,{send:(s,m)=>s.send(JSON.stringify(m)),close:(s,c,r)=>s.close(c,r),attachMeta:(s,m)=>s.serializeAttachment(m),persist:meta=>{this.ctx.waitUntil(this.ctx.storage.put('room',{...meta,code:this.room.code}));},active:()=>{if(!this.timer)this.timer=setInterval(()=>{try{this.room.tick();}catch(e){console.error('simulation-error',String(e));this.room.broadcast({type:'error',message:'Simulasi server terhenti. Kembali ke room dan mulai lagi.'});this.room.world=null;this.room.playing=false;this.stop();this.room.ready.fill(false);this.room.broadcast({type:'test_stopped',ready:this.room.ready,reason:'simulation_error'});this.room.save();}},1000/30);},idle:()=>this.stop()},saved);}
 stop(){if(this.timer){clearInterval(this.timer);this.timer=null;}}
 async fetch(request){const url=new URL(request.url);
  if(url.pathname==='/reserve'){let data;try{data=await request.json();}catch(_){return new Response('Invalid',{status:400});}if(!/^[A-Z2-9]{4}$/.test(data.code)||typeof data.ticket!=='string')return new Response('Invalid',{status:400});if(!this.room.code)this.room.code=data.code;return new Response(null,{status:this.room.reserve(data.ticket)?201:409});}
  if(this.room.peers.size>=8)return new Response('Room penuh',{status:503});const pair=new WebSocketPair(),client=pair[0],server=pair[1];this.ctx.acceptWebSocket(server);server.serializeAttachment({slot:null});this.room.attach(server,server);return new Response(null,{status:101,webSocket:client});
 }
 async webSocketMessage(socket,raw){this.room.handle(socket,raw);}
 async webSocketClose(socket,code=1000,reason=''){try{socket.close([1005,1006,1015].includes(code)?1000:code,reason);}catch(_){}this.room.leave(socket);if(!this.room.members().length)this.stop();}
 async webSocketError(socket){try{socket.close(1011,'Koneksi terputus');}catch(_){}this.room.leave(socket);if(!this.room.members().length)this.stop();}
}
