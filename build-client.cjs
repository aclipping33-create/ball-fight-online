'use strict';
require('./strip-revamp.cjs');
require('./inject-polish.cjs');
require('./inject-party.cjs');
require('./inject-fasiam.cjs');
require('./inject-revamp.cjs');
const fs=require('fs'),path=require('path'),root=__dirname;
let html=fs.readFileSync(path.join(root,'source/game-base.html'),'utf8');
// Eagerly fetch avatars only; chosen heroes' effect images are warmed on demand.
html=html.replace("function readyImage(path){const img=image(path);", "function readyImage(path){if(path&&!images.has(path))requestImage(path);const img=image(path);");
html=html.replace("function warmHero(id){for(const type", "function warmHero(id){for(const slot of ['ball','basic','skill','ultimate','trail']){const map=slot==='ball'?heroTextures:slot==='trail'?trailTextures:fxTex[slot];requestImage(heroPath(map,id));}for(const type");
html=html.replace("map.set(key(m[1]),file);requestImage(file);", "map.set(key(m[1]),file);if(m[2].toLowerCase()==='ball')requestImage(file);");
const runtime=fs.readFileSync(path.join(root,'client-authority.js'),'utf8')+'\n'+fs.readFileSync(path.join(root,'network-chaos.js'),'utf8')+'\n'+fs.readFileSync(path.join(root,'online12-client.js'),'utf8');
if(runtime.includes('</script>'))throw Error('Unsafe literal script close in network runtime');
html=html.replace('</body>','<script>\n'+runtime+'\n</script>\n</body>');
for(const name of ['game.html','index.html','ball-fight-satu-file.html'])fs.writeFileSync(path.join(root,name),html);
console.log('Client Party 2.7.0 built: Chaos Foundry + Party v5 authoritative 1v1 + five boss revamps + Classic retained.');
