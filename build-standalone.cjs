'use strict';
const fs=require('node:fs'),path=require('node:path'),{manifest}=require('./asset-files.cjs');
const data=manifest(),inline={};for(const p of data.files){if(p.endsWith('/config.json'))continue;const mime=p.endsWith('.webp')?'image/webp':p.endsWith('.png')?'image/png':p.endsWith('.mp3')?'audio/mpeg':'image/jpeg';inline[p]='data:'+mime+';base64,'+fs.readFileSync(path.join(__dirname,p)).toString('base64');}
const bootstrap='<script>window.BALL_FIGHT_INLINE='+JSON.stringify(inline)+';window.BALL_FIGHT_ASSETS='+JSON.stringify(data)+';</script>';
const html=fs.readFileSync(path.join(__dirname,'game.html'),'utf8').replace('</head>',bootstrap+'</head>');
const dest=process.argv[2]||path.join(__dirname,'Ball-Fight-Online12-2.7.0.html');fs.writeFileSync(dest,html);console.log('Standalone HTML: '+dest+' ('+fs.statSync(dest).size+' bytes, '+Object.keys(inline).length+' embedded media)');
