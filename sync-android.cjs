'use strict';
// Copy this repository's current game + editable media into the offline Android bundle.
const fs=require('node:fs'),path=require('node:path');
require('./prepare-worker.cjs');
const android=path.resolve(process.argv[2]||path.join(__dirname,'android')),dest=path.join(android,'assets/www');
if(!fs.existsSync(path.join(android,'AndroidManifest.xml')))throw Error('Folder source Android tidak ditemukan: '+android);
fs.rmSync(dest,{recursive:true,force:true});fs.cpSync(path.join(__dirname,'public'),dest,{recursive:true});
const file=path.join(dest,'game.html');let html=fs.readFileSync(file,'utf8');
const marker="let raw=document.getElementById('lanServerIP').value.trim();";
if(!html.includes(marker))throw Error('APK LAN guard anchor not found');
html=html.replace(marker,marker+"\n if(!raw){lanStatus('Isi IP server LAN host, misalnya 192.168.1.5:3000. APK ini adalah klien, bukan server game.');return null;}");
for(const entry of ['game.html','index.html','ball-fight-satu-file.html'])fs.writeFileSync(path.join(dest,entry),html);
console.log('Bundle Android diperbarui dari web saat ini: '+dest);
