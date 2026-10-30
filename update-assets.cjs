'use strict';
const fs=require('node:fs'),path=require('node:path');
const {manifest,manifestScript}=require('./asset-files.cjs');
function update(){const data=manifest();fs.mkdirSync(path.join(__dirname,'assets'),{recursive:true});fs.writeFileSync(path.join(__dirname,'assets/manifest.js'),manifestScript(data));console.log('Daftar aset diperbarui: '+data.files.length+' file custom. File lain tetap memakai bawaan.');return data;}
if(require.main===module)update();module.exports=update;
