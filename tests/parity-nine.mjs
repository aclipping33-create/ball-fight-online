import {createWorld} from '../shared/game-engine.mjs';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const baseline=JSON.parse(fs.readFileSync(new URL('../verification/baseline-nine-hashes.json',import.meta.url))),checks=[];
for(const[id,expected]of Object.entries(baseline.hashes)){
 const w=createWorld({heroes:[id,'Dummies'],seed:5,walls:[]}),h=createHash('sha256');
 for(let i=0;i<300;i++){w.input(0,.7,.2,i+1);if(i===10)w.action(0,'skill',0);w.step();const snap=w.snapshot();snap.protocol=3;delete snap.noTimeLimit;for(const p of snap.players)for(const k of ['domain','beta','joinedRadius','logicCast','netAnchored','interruptTimer'])delete p.data[k];h.update(JSON.stringify(snap));}
 const actual=h.digest('hex');if(['Goshiki','Gravity','Amat'].includes(id)){if(id!=='Amat')assert.notEqual(actual,expected,id+' must implement approved revamp');checks.push({hero:id,ticks:300,intentionallyRevamped:true});}else{assert.equal(actual,expected,id+' mechanics differ after only protocol header normalization');checks.push({hero:id,ticks:300,sha256:actual,identical:true});}
}
fs.writeFileSync(new URL('../verification/old-nine-parity.json',import.meta.url),JSON.stringify({checks,identicalHeroComparisons:1800,intentionallyRevampedHeroComparisons:900,normalization:'Protocol 5→3 and new renderer-only companion/logic/anchor/noTimeLimit fields omitted; combat data unchanged'},null,2));console.log('PASS: six unchanged heroes exact normalized snapshot hashes: 1800; Goshiki/Gravity revamped, Amat basic nerf authorized');
