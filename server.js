'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{randomBytes,randomUUID}=require('node:crypto');
const {WebSocketServer}=require('ws'),{serveAssets}=require('./asset-files.cjs');
(async()=>{const {RoomSession,HEALTH}=await import('./shared/room-session.mjs'),rooms=new Map(),timers=new Map(),rate=new Map();
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',makeCode=()=>Array.from(randomBytes(4),x=>alphabet[x%alphabet.length]).join('');
const json=(res,data,status=200)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','access-control-allow-origin':'*','cache-control':'no-store'});res.end(JSON.stringify(data));};
function idle(code){clearInterval(timers.get(code));timers.delete(code);}
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');if(req.method==='OPTIONS'){res.writeHead(204,{'access-control-allow-origin':'*','access-control-allow-methods':'GET,OPTIONS'});return res.end();}
 if(url.pathname==='/health')return json(res,HEALTH);
 if(url.pathname==='/lan-info'){let ips=[];try{ips=Object.values(os.networkInterfaces()).flat().filter(x=>x&&x.family==='IPv4'&&!x.internal).map(x=>x.address);}catch(_){}return json(res,{ips});}
 if(url.pathname==='/allocate'){
  const ip=req.socket.remoteAddress,now=Date.now(),r=rate.get(ip)||{at:now,n:0};if(now-r.at>60000){r.at=now;r.n=0;}rate.set(ip,r);if(++r.n>12)return json(res,{error:'Terlalu sering membuat room. Tunggu satu menit.'},429);
  let code;do{code=makeCode();}while(rooms.has(code));const ticket=randomUUID();const room=new RoomSession(code,{send:(s,m)=>{if(s.readyState===1){if(s.bufferedAmount>512*1024){s.close(1013,'Koneksi terlalu lambat');return;}s.send(JSON.stringify(m));}},close:(s,c,r)=>s.close(c,r),active:()=>{if(!timers.has(code))timers.set(code,setInterval(()=>{try{room.tick();}catch(e){console.error('Simulasi terhenti:',e);room.broadcast({type:'error',message:'Simulasi server terhenti. Kembali ke room.'});room.world=null;room.playing=false;idle(code);room.ready.fill(false);room.broadcast({type:'test_stopped',ready:room.ready,reason:'simulation_error'});}},1000/30));},idle:()=>idle(code)});room.reserve(ticket);rooms.set(code,room);return json(res,{code,ticket,protocol:5});
 }
 if(serveAssets(req,res,url.pathname))return;
 if(!['/','/game.html','/index.html','/ball-fight-satu-file.html'].includes(url.pathname)){res.writeHead(404);return res.end('Tidak ditemukan.');}
 fs.readFile(path.join(__dirname,'game.html'),(err,data)=>{res.writeHead(err?500:200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(err?'Game belum tersedia.':data);});
});
const wss=new WebSocketServer({noServer:true,maxPayload:8192,perMessageDeflate:false});
server.on('upgrade',(req,socket,head)=>{let url;try{url=new URL(req.url,'http://localhost');}catch(_){socket.destroy();return;}const code=(url.searchParams.get('code')||'').toUpperCase(),room=rooms.get(code);if(url.pathname!=='/room'||url.searchParams.get('protocol')!=='5'||!room||room.peers.size>=8){socket.write('HTTP/1.1 409 Conflict\r\nConnection: close\r\n\r\nGunakan HTML/web 2.7.0 dan room yang aktif.');socket.destroy();return;}wss.handleUpgrade(req,socket,head,ws=>{room.attach(ws,ws);ws.alive=true;ws.on('pong',()=>ws.alive=true);ws.on('message',(data,binary)=>{if(!binary)room.handle(ws,data.toString());});ws.on('close',()=>room.leave(ws));ws.on('error',()=>room.leave(ws));});});
const cleanup=setInterval(()=>{const now=Date.now();for(const [code,r]of rooms){if(!r.peers.size&&!r.playing&&r.reservedUntil<now){idle(code);rooms.delete(code);}}for(const [ip,r]of rate)if(now-r.at>120000)rate.delete(ip);for(const s of wss.clients){if(!s.alive){s.terminate();continue;}s.alive=false;s.ping();}},30000);cleanup.unref();server.on('close',()=>{clearInterval(cleanup);for(const code of timers.keys())idle(code);});
server.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('Ball Fight SERVER-AUTHORITATIVE 2.7.0 — port '+(process.env.PORT||3000)+' — LAN bisa lewat Termux.'));server.on('error',e=>console.error(e));
})().catch(e=>{console.error(e);process.exitCode=1;});
