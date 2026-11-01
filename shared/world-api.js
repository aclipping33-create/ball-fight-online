// Authoritative adapter. All fighting uses the original classes/physics above.
let serverDamageActor=null,simTick=0,damageTotals=[],lastInput=[],lastSeq=[],lastInputAt=[],finished=false;
const nativeClockStart=clock;
function serverDamage(target,args,actor){
 if(!target||typeof target.takeDamage!=='function')return 0;
 const hp=Math.max(0,target.hp||0),sh=Math.max(0,target.shield||0),ex=Math.max(0,target.expShield||0);
 target._bossDamageSource=actor;let result;try{result=target.takeDamage(...args);}finally{delete target._bossDamageSource;}const slot=lanFighters.indexOf(fasiamOwner(actor));
 if(!finished&&slot>=0&&actor!==target&&isOpponent(actor,target)){
  const fallback=Math.max(0,hp-(target.hp||0))+Math.max(0,sh-(target.shield||0));
  const amount=Math.min(hp+sh+ex,Math.max(0,Number.isFinite(result)?result:fallback)+Math.max(0,ex-(target.expShield||0)));
  if(Number.isFinite(amount))damageTotals[slot]+=amount;
 }
 return result;
}
// Venuz­don­oa deliberately calls BaseEntity.takeDamage directly to bypass ordinary guards.
// It still needs one authoritative damage-ledger entry (boss path is already instrumented).
const serverLogicNative=duelLogicHit;duelLogicHit=function(actor,target,amount){target=fasiamOwner(target);const hp=Math.max(0,target.hp||0),sh=Math.max(0,target.shield||0),ex=Math.max(0,target.expShield||0);const result=serverLogicNative(actor,target,amount),slot=lanFighters.indexOf(fasiamOwner(actor));if(!target.isBoss&&!finished&&slot>=0&&actor!==target&&isOpponent(actor,target)){const fallback=Math.max(0,hp-target.hp)+Math.max(0,sh-(target.shield||0));damageTotals[slot]+=Math.min(hp+sh+ex,Math.max(0,Number.isFinite(result)?result:fallback)+Math.max(0,ex-(target.expShield||0)));}return result;};
const mode=['1v1','2v2','boss'].includes(options.mode)?options.mode:'1v1';
const usesParty=options.ruleset==='party-v2'&&mode==='1v1';let roundWait=0,partyAccumulator=0;
const count=mode==='boss'?Math.max(1,Math.min(4,options.heroes?.length||1)):mode==='2v2'?4:2;
lanRoomMode=mode;lanRole='host';lanMoveActive=true;lanMatchActive=true;lanCapacity=count;lanSlot=0;
lanHeroes=Array.from({length:count},(_,i)=>CHARACTERS.some(c=>c.id===options.heroes?.[i])?options.heroes[i]:'Dummies');
lanBossSelected=BOSS_DEFS.some(b=>b.id===options.bossId)?options.bossId:'mineKing';
const generatedMap=usesParty?{walls:[],name:'CHAOS FOUNDRY · PARTY'}:mode==='boss'?{walls:[],name:'BOSS'}:lanMakeArenaMap();
lanArenaWalls=(options.walls||generatedMap.walls).map(w=>({...w}));lanArenaName=generatedMap.name||'ARENA SERVER';
AssetPack.useManifest({files:[],heroes:heroVisualConfigs});
lanSaveWorldAndCreateHeroes();canvas.width=canvas.height=900;mazeWalls=lanArenaWalls;
if(mode==='boss'){lanBossState=lanBossMakeState(lanBossSelected,count);lanBossActive=true;lanBossHazards=[];gamePlayers=[...lanFighters,lanBossState.entity];if(count===1)p2=lanBossState.entity;}
if(usesParty){party.active=true;party.open=false;party.config={...party.config,heroes:lanHeroes.slice(),map:options.map==='ring'?'ring':'bumpers',opponent:'local',log:false};party.seed=(options.seed||randomSeed)>>>0;partyBuildRound();lanFighters=party.fighters;lanArenaWalls=mazeWalls;chaos.network=true;}else for(const e of lanFighters){e.isBot=false;e.manualSkillOnly=true;armUltManual(e);}
for(const field of ['slowTimer','slowFactor','isIntangible','shadowStepTimer','expRootTimer','expCharmTimer','expConfuseTimer','powerHasteTimer','expSpeedTimer','expSpeedFactor','expCcImmuneTimer','expStealth','expInvulnTimer','expArmorBreakTimer'])if(!LAN_RENDER_FIELDS.includes(field))LAN_RENDER_FIELDS.push(field);
damageTotals=Array(count).fill(0);lastSeq=Array(count).fill(0);lastInputAt=Array(count).fill(clock);lastInput=Array.from({length:count},()=>({x:0,y:0}));
function input(slot,x,y,seq){if(finished||!Number.isInteger(slot)||slot<0||slot>=count||!Number.isFinite(x)||!Number.isFinite(y)||!Number.isSafeInteger(seq)||seq<=lastSeq[slot])return false;const length=Math.hypot(x,y);lastInput[slot]={x:length>1?x/length:x,y:length>1?y/length:y};lastSeq[slot]=seq;lastInputAt[slot]=clock;return true;}
function action(slot,name,angle=0){if(finished||!Number.isInteger(slot)||slot<0||slot>=count||!['skill','skill2','ult'].includes(name))return false;const e=lanFighters[slot];if(e.hp<=0||e.stunTimer>0)return false;serverDamageActor=e;try{if(usesParty)return partyAction(slot,name,Number.isFinite(angle)?angle:0);lanDoAction(slot,name,Number.isFinite(angle)?angle:0);}finally{serverDamageActor=null;}return true;}
function step(realDt=1000/60){
 if(finished)return;const ms=Math.max(0,Math.min(50,realDt));clock+=ms;const dt=ms*neoSlowFactor();simTick++;
 if(usesParty){serverDamageActor=null;for(let i=0;i<count;i++){if(clock-lastInputAt[i]>300)lastInput[i]={x:0,y:0};Object.assign(party.inputs[i],lastInput[i],{active:true});}
 if(party.state==='round_end'){roundWait+=ms;if(roundWait>=1800){roundWait=0;partyContinue();lanFighters=party.fighters;lastInput=lastInput.map(()=>({x:0,y:0}));}}else{partyAccumulator+=ms;while(partyAccumulator+1e-8>=1000/120){partyStep(1000/120);partyAccumulator-=1000/120;}}
 lanArenaWalls=mazeWalls;if(party.state==='series_end'){lanWinner=party.scores[0]>=3?'P1':'P2';finished=true;}return;}
 if(lanBossActive){serverDamageActor=lanBossState.entity;lanBossTick(ms);serverDamageActor=null;}
 AssetPack.beginFrame(dt,lanFighters);
 for(let i=0;i<count;i++){const e=lanFighters[i];if(clock-lastInputAt[i]>300)lastInput[i]={x:0,y:0};serverDamageActor=e;lanTickHero(e,lanNearestOpponent(e),lastInput[i],dt);}
 serverDamageActor=null;
 for(const e of lanFighters){tickFillerPush(e,dt);resolveWalls(e);constrainEntityToArena(e);resolveFillerCones(e);}
 for(let i=0;i<count;i++)for(let j=i+1;j<count;j++)if(lanFighters[i].hp>0&&lanFighters[j].hp>0)resolveBallCollision(lanFighters[i],lanFighters[j]);
 AssetPack.endFrame(dt,lanFighters);tickPowerupSystem(dt,lanFighters);lanUpdateShots(dt);

 for(let i=floatingTexts.length-1;i>=0;i--){floatingTexts[i].y-=40*dt/1000;floatingTexts[i].timer-=dt/1000;if(floatingTexts[i].timer<=0)floatingTexts.splice(i,1);}
 particles=[];lanWinner=lanComputeWinner();if(lanWinner)finished=true;
}
function standings(){const best=Math.max(0,...damageTotals);return lanFighters.map((e,i)=>({slot:i,player:'P'+(i+1),hero:e.heroId,name:heroOriginalName(e.heroId),damage:Math.round(damageTotals[i]*100)/100,top:best>0&&Math.abs(damageTotals[i]-best)<.005,team:mode==='2v2'?(i<2?1:2):mode==='boss'?1:null})).sort((a,b)=>b.damage-a.damage||a.slot-b.slot).map((e,i,a)=>({...e,rank:i===0||a[i-1].damage!==e.damage?i+1:a.findIndex(x=>x.damage===e.damage)+1}));}
function snapshot(){const packet=lanBuildSnapshot();for(let i=0;i<lanFighters.length;i++){const e=lanFighters[i],m=lastInput[i],n=Math.hypot(m.x,m.y);packet.players[i].data.netDash=AssetPack.isDash(e);packet.players[i].data.netSpeed=(n>.05?Math.min(MAX_SPEED,Math.hypot(e.vx,e.vy)/n):fighterSpeed(e))*neoSlowFactor()*(e.slowTimer>0?e.slowFactor:1)*getStickyMovementFactor(e);packet.players[i].data.netCanMove=!(e.hp<=0||e.stunTimer>0||e.expRootTimer>0||e.expCharmTimer>0||e.expConfuseTimer>0||e.purpleCast>0||e.napTimer>0||AssetPack.isDash(e)||(e instanceof FasiamSlicer&&e.isUltMode));}
if(usesParty){packet.party={ruleset:'party-v2',map:party.config.map,clock:chaos.time,state:party.state,round:party.round,scores:party.scores.slice(),remaining:party.remaining,countdown:party.countdown,intermission:Math.max(0,1800-roundWait),walls:mazeWalls.map(w=>({...w})),hazards:party.config.map==='bumpers'?chaosHazards():[]};for(let i=0;i<packet.players.length;i++){const d=packet.players[i].data,m=partyMotion(lanFighters[i]);d.netCanMove=party.state==='playing'&&d.netCanMove;d.netLocX=m.lx;d.netLocY=m.ly;d.netImpulseX=m.ix;d.netImpulseY=m.iy;d.netVX=lanFighters[i].vx;d.netVY=lanFighters[i].vy;}}
packet.authority='server';packet.protocol=5;packet.tick=simTick;packet.simTime=Math.round(clock-nativeClockStart);packet.damage=standings();packet.ack=lastSeq.slice();packet.motion=lastInput.map(v=>({...v}));return packet;}
function end(reason='timeout',winner='DRAW'){if(!finished){lanWinner=winner;finished=true;}return {...snapshot(),reason};}
return {input,action,step,snapshot,standings,end,get finished(){return finished;},get winner(){return lanWinner;},get heroes(){return CHARACTERS.map(c=>c.id);},get start(){return {type:'test_started',authority:'server',protocol:5,walls:lanArenaWalls,mapName:lanArenaName,ruleset:usesParty?'party-v2':'classic',arenaSize:usesParty?720:900,heroes:lanHeroes.slice(),capacity:mode==='1v1'?2:4,mode,bossId:lanBossSelected,playerCount:count};},
 // Only exposed in the in-process JS API; never in HTTP/WebSocket protocol.
 testDuelHit:(owner,t,amt,pierce=false,kind='melee')=>duelHit(owner,t,amt,pierce,kind),testLogicHit:(owner,t,amt)=>duelLogicHit(owner,t,amt),testDuelInterrupt:t=>duelInterrupt(t),testSpeed:e=>fighterSpeed(e),testContext:(owner,fn)=>duelContext(owner,'melee',fn),
 inspect:()=>({fighters:lanFighters,boss:lanBossState?.entity,bossState:lanBossState,party:usesParty?party:null,projectiles,drops:plusDrops,walls:mazeWalls}),testDamage:(owner,target,amount,pierce=true)=>serverDamage(target,[amount,pierce],owner),testEffect:(owner,target,effect,amount)=>applyExpansionEffect(owner,target,effect,amount),testTickStatus:(e,dt)=>tickExpansionStatus(e,dt)};
