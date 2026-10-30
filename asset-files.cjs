'use strict';
const fs=require('node:fs'),path=require('node:path');
const ROOT=__dirname;
const valid=(p)=>/^audio\/[a-z0-9_-]+\.mp3$/i.test(p)||/^textures\/(heroes|arena|menu)\/[a-z0-9_-]+\.(png|webp|jpg|jpeg)$/i.test(p);
function manifest(){
 const files=[];
 for(const dir of ['audio','textures/heroes','textures/arena','textures/menu']){
  const full=path.join(ROOT,dir);if(!fs.existsSync(full)||fs.lstatSync(full).isSymbolicLink())continue;
  for(const entry of fs.readdirSync(full,{withFileTypes:true})){
   const rel=dir+'/'+entry.name;if(entry.isFile()&&!entry.isSymbolicLink()&&valid(rel))files.push(rel);
  }
 }
 return {version:1,files:files.sort()};
}
function manifestScript(data=manifest()){return 'window.BALL_FIGHT_ASSETS='+JSON.stringify(data)+';\nif(window.BallFightAssets)window.BallFightAssets.useManifest(window.BALL_FIGHT_ASSETS);\n';}
function serveAssets(req,res,pathname){
 if(pathname==='/assets/manifest.js'){
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return true;}
  const data=Buffer.from(manifestScript());res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Content-Length':data.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data);return true;
 }
 let rel;try{rel=decodeURIComponent(pathname).replace(/^\//,'');}catch(_){return false;}
 if(!valid(rel))return false;
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return true;}
 const file=path.resolve(ROOT,rel);
 try{
  const real=fs.realpathSync(file),base=path.join(ROOT,rel.startsWith('audio/')?'audio':'textures')+path.sep;
  if(!real.startsWith(base)||fs.lstatSync(file).isSymbolicLink())throw Error('unsafe path');
  const stat=fs.statSync(real);if(!stat.isFile())throw Error('not file');
  const mime={'.mp3':'audio/mpeg','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg'}[path.extname(rel).toLowerCase()];
  let start=0,end=stat.size-1,status=200;const range=req.headers.range;
  if(range){
   const m=/^bytes=(\d*)-(\d*)$/.exec(range);
   if(!m||(!m[1]&&!m[2]))throw Error('bad-range');
   if(m[1]){start=Number(m[1]);if(m[2])end=Number(m[2]);}else start=Math.max(0,stat.size-Number(m[2]));
   end=Math.min(end,stat.size-1);
   if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=stat.size){res.writeHead(416,{'Content-Range':'bytes */'+stat.size});res.end();return true;}status=206;
  }
  const headers={'Content-Type':mime,'Content-Length':Math.max(0,end-start+1),'Accept-Ranges':'bytes','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'};
  if(status===206)headers['Content-Range']=`bytes ${start}-${end}/${stat.size}`;
  res.writeHead(status,headers);
  if(req.method==='HEAD'||stat.size===0)res.end();else {const stream=fs.createReadStream(real,{start,end});stream.on('error',()=>res.destroy());stream.pipe(res);}
 }catch(e){if(!res.headersSent)res.writeHead(e.message==='bad-range'?416:404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Aset tidak ditemukan atau permintaan tidak valid.');}
 return true;
}
module.exports={manifest,manifestScript,serveAssets};
