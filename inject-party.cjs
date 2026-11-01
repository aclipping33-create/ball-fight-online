'use strict';
const fs=require('node:fs'),path=require('node:path'),r=__dirname,p=path.join(r,'source/game-base.html');let s=fs.readFileSync(p,'utf8');
function insert(begin,end,text,anchor){const block=begin+'\n'+text+'\n'+end;if(s.includes(begin)){const a=s.indexOf(begin),b=s.indexOf(end,a);if(b<0)throw Error('Party end marker missing');s=s.slice(0,a)+block+s.slice(b+end.length);}else {if(!s.includes(anchor))throw Error('Party anchor missing '+anchor);s=s.replace(anchor,block+'\n'+anchor);}}
insert('/* BEGIN PARTY STYLE */','/* END PARTY STYLE */',fs.readFileSync(path.join(r,'party-style.css'),'utf8'),'</style>');
insert('<!-- BEGIN PARTY UI -->','<!-- END PARTY UI -->',fs.readFileSync(path.join(r,'party-ui.html'),'utf8'),'<script>');
const jsBegin='// BEGIN PARTY MODE',jsEnd='// END PARTY MODE';if(s.includes(jsBegin)){const a=s.indexOf(jsBegin),b=s.indexOf(jsEnd,a);s=s.slice(0,a)+s.slice(b+jsEnd.length);}
const close=s.lastIndexOf('</script>');if(close<0)throw Error('Main script close missing');s=s.slice(0,close).replace(/\s*$/,'\n')+jsBegin+'\n'+fs.readFileSync(path.join(r,'party-mode.js'),'utf8')+'\n'+jsEnd+'\n'+s.slice(close);
fs.writeFileSync(p,s);
