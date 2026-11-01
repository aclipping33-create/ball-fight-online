'use strict';
const fs=require('node:fs'),path=require('node:path'),root=__dirname,file=path.join(root,'source/game-base.html');
let s=fs.readFileSync(file,'utf8');const begin='// BEGIN IMPACT AUDIO 2.2.1',end='// END IMPACT AUDIO 2.2.1',block=begin+'\n'+fs.readFileSync(path.join(root,'audio-impact.js'),'utf8')+'\n'+end;
if(s.includes(begin)){const a=s.indexOf(begin),b=s.indexOf(end,a);if(b<0)throw Error('Missing impact block end');s=s.slice(0,a)+block+s.slice(b+end.length);}else{const anchor='// --- AUDIO SYSTEM (Web Audio API) ---';if(!s.includes(anchor))throw Error('Audio anchor missing');s=s.replace(anchor,block+'\n'+anchor);}
fs.writeFileSync(file,s);
