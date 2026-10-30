'use strict';
const fs=require('node:fs'),path=require('node:path');const update=require('./update-assets.cjs');
const data=update(),dest=path.join(__dirname,'public');fs.mkdirSync(dest,{recursive:true});
for(const dir of ['assets','audio','textures'])fs.rmSync(path.join(dest,dir),{recursive:true,force:true});
for(const file of ['game.html','assets/manifest.js',...data.files]){const target=path.join(dest,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(__dirname,file),target);}
console.log('Worker assets siap: game.html + '+data.files.length+' file custom.');
