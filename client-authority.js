// SERVER-AUTHORITATIVE MULTIPLAYER v5. Offline gameplay above is unchanged.
const netGame={active:false,seq:0,actionSeq:0,state:null,frames:[],lastReceive:0,lastSend:0,rtt:0,jitter:0,prediction:null,correction:{x:0,y:0},damage:[],resyncAt:0,pingTimer:0,bytes:0};
window.BallFightNetwork=netGame;
function netSend(m){if(lanSocket?.readyState===WebSocket.OPEN)lanSocket.send(JSON.stringify(m));}
function netRoster(m){if(Array.isArray(m.heroes))lanHeroes=m.heroes.slice();if(Array.isArray(m.ready))lanReadyStates=m.ready.slice();if(['1v1','boss'].includes(m.mode))lanRoomMode=m.mode;if(BOSS_DEFS.some(b=>b.id===m.bossId))lanBossSelected=m.bossId;if(Number.isInteger(m.slot)){lanSlot=m.slot;lanRole=m.slot===0?'host':'guest';}if(Number.isInteger(m.capacity))lanCapacity=m.capacity;if(Number.isInteger(m.count))lanCount=m.count;}
function netOnMessage(m){
 if(m.type==='pong'){if(Number.isFinite(m.sentAt)){const r=Math.max(0,performance.now()-m.sentAt);netGame.jitter=netGame.jitter*.8+Math.abs(r-netGame.rtt)*.2;netGame.rtt=netGame.rtt?netGame.rtt*.7+r*.3:r;}return;}
 if(m.type==='battle_state'){netReceiveState(m);return;}
 netRoster(m);lanPending=false;
 if(m.type==='created'||m.type==='joined'){lanRoomCode=m.code;lanInRoom=true;lanStatus('Room '+m.code+' · '+lanCount+'/'+lanCapacity+' pemain · SIMULASI SERVER');lanFindHostIP();}
 else if(m.type==='heroes'){if(lanInRoom)lanStatus('Room '+lanRoomCode+' · '+lanCount+'/'+lanCapacity+' · Semua pemain tekan SIAP.');}
 else if(m.type==='peer_left'){lanStatus('Pemain keluar. Room '+lanRoomCode+' · '+lanCount+'/'+lanCapacity);}
 else if(m.type==='test_started'){if(m.authority!=='server'||m.protocol!==5){lanStatus('Server belum diperbarui.');return;}lanBeginMovementTest(m);}
 else if(m.type==='test_stopped'){lanEndMovementTest();lanStatus(m.reason==='server_restart'?'Server restart/deploy. Pertandingan dibatalkan; silakan SIAP lagi.':'Kembali ke room. Tekan SIAP untuk pertandingan berikutnya.');}
 else if(m.type==='room_closed'||m.type==='left'){const oldSocket=lanSocket;lanSocket=null;clearInterval(netGame.pingTimer);oldSocket?.close();lanEndMovementTest();lanInRoom=false;lanRole=null;lanSlot=null;lanCount=0;lanStatus(m.type==='left'?'Kamu keluar dari room.':'Pembuat room keluar; room ditutup.');}
 else if(m.type==='error'){lanStatus(m.message||'Server menolak permintaan.');}
 lanButtons();
}
lanRequest=async function(message){
 if(lanPending)return;if(lanSocket?.readyState===WebSocket.OPEN&&lanInRoom){netSend(message);return;}
 if(!['create','join'].includes(message.type))return;
 if(lanSocket){const old=lanSocket;lanSocket=null;old.close();}clearInterval(netGame.pingTimer);
 lanPending=true;lanButtons();const generation=++roomRequestGeneration;let socket;
 try{
  let base;if(roomNetwork==='online'){base=getOnlineBase();if(!base)throw Error('Isi URL HTTPS Workers terlebih dahulu.');onlineServerBase=base;try{localStorage.setItem('ballFightOnlineServer',base);}catch(_){} }
  else{const ws=getLanSocketAddress();if(!ws)throw Error('Isi IP HP/perangkat yang menjalankan server Termux/Node.');base=ws.replace(/^ws/,'http').replace(/\/room$/,'');}
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),15000);let status;try{const r=await fetch(base+'/health',{cache:'no-store',signal:abort.signal});if(!r.ok)throw Error('Health '+r.status);status=await r.json();}finally{clearTimeout(timer);}
  if(status.protocol!==5||status.version!=='2.7.0'||status.heroCount!==12||status.authority!=='server')throw Error('Versi server/roster berbeda. Deploy paket ONLINE12 2.7.0 terlebih dahulu.');
  let code,ticket='';if(message.type==='create'){const r=await fetch(base+'/allocate',{cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error||'Tidak dapat membuat room.');code=d.code;ticket=d.ticket;}else code=message.code;
  if(generation!==roomRequestGeneration)return;
  socket=new WebSocket(base.replace(/^http/,'ws')+'/room?protocol=5&code='+encodeURIComponent(code));lanSocket=socket;
  socket.onopen=()=>{if(lanSocket!==socket)return;socket.send(JSON.stringify({...message,protocol:5,code,ticket}));netSend({type:'ping',sentAt:performance.now()});clearInterval(netGame.pingTimer);netGame.pingTimer=setInterval(()=>netSend({type:'ping',sentAt:performance.now()}),5000);};
  socket.onmessage=event=>{if(lanSocket!==socket)return;netGame.bytes+=event.data.length;let m;try{m=JSON.parse(event.data);}catch(_){return;}netOnMessage(m);};
  socket.onclose=()=>{if(lanSocket!==socket)return;clearInterval(netGame.pingTimer);lanSocket=null;lanPending=false;lanInRoom=false;lanRole=null;lanSlot=null;lanCount=0;lanEndMovementTest();lanButtons();lanStatus('Koneksi server terputus. Periksa internet/kuota Workers atau Termux yang harus tetap menyala.');};
  socket.onerror=()=>{if(lanSocket===socket)lanStatus('Tidak dapat terhubung ke server. Periksa URL/IP dan paket server 2.7.0.');};
 }catch(e){if(generation!==roomRequestGeneration)return;lanPending=false;lanButtons();lanStatus(e.name==='AbortError'?'Server belum merespons dalam 15 detik. Periksa URL/IP dan coba lagi.':String(e.message||e));}
};
lanCreateRoom=function(){lanRequest({type:'create',mode:lanRoomMode});};
lanStartMovementTest=function(){if(lanRole!=='host'||!lanAllRequiredReady()){lanStatus('Semua pemain harus SIAP.');return;}netSend({type:'start_test'});};
lanStopMovementTest=function(){netSend({type:'stop_test'});};
lanSendRaw=netSend;
lanSendAction=function(action,angle=0){if(!netGame.active||lanWinner||(netGame.state?.party&&netGame.state.party.state!=='playing'))return;netSend({type:'action',action,angle:Number.isFinite(angle)?angle:0,seq:++netGame.actionSeq});const button=document.getElementById(action==='ult'?'lanUltBtn':action==='skill2'?'lanSkill2Btn':'lanSkillStick');button?.animate?.([{filter:'brightness(1.8)'},{filter:'brightness(1)'}],{duration:180});};
// No browser, including the room creator, may execute authoritative actions or ticks.
lanDoAction=function(index,action,angle){if(index===lanLocalSlot())lanSendAction(action,angle);};
const serverBeginBase=lanBeginMovementTest;
lanBeginMovementTest=function(m){serverBeginBase(m);if(m.ruleset==='party-v2'){canvas.width=canvas.height=m.arenaSize||720;party.camera={x:360,y:360,z:1};}netGame.active=true;netGame.seq=0;netGame.actionSeq=0;netGame.state=null;netGame.frames=[];netGame.lastReceive=0;netGame.lastSend=0;netGame.prediction=null;netGame.correction={x:0,y:0};netGame.damage=[];lanLastFrame=0;};
const serverEndBase=lanEndMovementTest;
lanEndMovementTest=function(...args){netGame.active=false;chaos.network=false;netGame.state=null;netGame.frames=[];netGame.prediction=null;netGame.damage=[];const table=document.getElementById('netDamageRanking');if(table)table.remove();return serverEndBase(...args);};
function netReceiveState(packet){
 if(!netGame.active||packet.protocol!==5||packet.authority!=='server'||!Array.isArray(packet.players)||packet.players.length!==lanFighters.length)return;
 const prev=netGame.state;
 if(packet.delta&&(!prev||packet.baseTick!==prev.tick)){const now=performance.now();if(now-netGame.resyncAt>500){netGame.resyncAt=now;netSend({type:'resync'});}return;}
 const state=packet.delta?{...prev,...packet,players:packet.players.map((p,i)=>({...prev.players[i],...p,data:{...prev.players[i].data,...p.data}}))}:packet;
 netGame.state=state;if(state.party){mazeWalls=lanArenaWalls=(state.party.walls||[]).map(w=>({...w}));chaos.time=state.party.clock;chaos.network=true;}const now=performance.now();netGame.lastReceive=now;
 if(state.party&&prev?.party?.round!==state.party.round){lanFighters=state.players.map((p,i)=>{const e=createCharacter(lanHeroes[i],p.data.x,p.data.y,i===1);e.manualSkillOnly=true;e.isBot=false;e.hudSlot=null;return e;});[p1,p2]=lanFighters;gamePlayers=lanFighters;}
 const local=lanLocalSlot(),me=lanFighters[local];const visual=me?{x:me.x,y:me.y}:null;
 // Reuse the original visual/sound snapshot importer, never its host simulator.
 lanApplySnapshot(JSON.parse(JSON.stringify(state)));
 for(let i=0;i<lanFighters.length;i++){
  const e=lanFighters[i],d=state.players[i].data;
  if(Number.isFinite(d.netSpeed))e.netSpeed=d.netSpeed;e.netDash=!!d.netDash;e.netCanMove=d.netCanMove!==false;
  for(const k of ['slowTimer','slowFactor','isIntangible','shadowStepTimer','expRootTimer','expCharmTimer','expConfuseTimer','expStealth','expInvulnTimer'])if(d[k]!==undefined)e[k]=d[k];
  for(const kind of ['neoShots','rockets'])if(Array.isArray(e[kind]))for(const s of e[kind]){s._netX=s.x;s._netY=s.y;}
 }
 for(const s of projectiles){s._netX=s.x;s._netY=s.y;}
 netGame.frames.push({at:now,positions:state.players.map(p=>({x:p.data.x,y:p.data.y}))});if(netGame.frames.length>10)netGame.frames.shift();
 if(me&&visual){if(state.party&&prev?.party?.round!==state.party.round){lanMoveBridge.x=lanMoveBridge.y=lanSkillBridge.x=lanSkillBridge.y=0;lanMoveBridge.active=lanSkillBridge.active=false;for(const id of['lanMoveKnob','lanSkillKnob'])document.getElementById(id).style.transform='translate(-50%,-50%)';visual.x=state.players[local].data.x;visual.y=state.players[local].data.y;netGame.prediction={...visual};}if(!netGame.prediction)netGame.prediction={...visual};const d=state.players[local].data,motion=state.motion?.[local]||{x:0,y:0},ahead=Math.min(150,netGame.rtt*.5)/1000,speed=d.netSpeed||fighterSpeed(me);const desired={x:d.x+(d.netDash?0:state.party?(d.netVX||0)*ahead:motion.x*speed*ahead),y:d.y+(d.netDash?0:state.party?(d.netVY||0)*ahead:motion.y*speed*ahead)},dx=desired.x-netGame.prediction.x,dy=desired.y-netGame.prediction.y;
  if(Math.hypot(dx,dy)>120||d.netDash||d.netCanMove===false||d.stunTimer>0||d.hp<=0){netGame.prediction={x:d.x,y:d.y};netGame.correction={x:0,y:0};}else netGame.correction={x:dx,y:dy};if(state.party)Object.assign(netGame.prediction,{lx:d.netLocX||0,ly:d.netLocY||0,ix:d.netImpulseX||0,iy:d.netImpulseY||0});me.x=visual.x;me.y=visual.y;
 }
 if(Array.isArray(state.damage)){netGame.damage=state.damage;netRenderDamage();}
}
function netRenderDamage(){
 const card=document.getElementById('lanResultCard');if(!card||!lanWinner||!netGame.damage.length)return;let box=document.getElementById('netDamageRanking');if(!box){box=document.createElement('section');box.id='netDamageRanking';document.getElementById('lanResultWinners').after(box);}
 if(lanWinner==='PLAYERS'&&card.dataset.tone!=='win')card.dataset.tone='win';else if(lanWinner==='BOSS'&&card.dataset.tone!=='loss')card.dataset.tone='loss';
 const signature=lanWinner+JSON.stringify(netGame.damage);if(box.dataset.signature===signature)return;box.dataset.signature=signature;box.replaceChildren();const heading=document.createElement('b');heading.textContent='PERINGKAT TOTAL DAMAGE';box.appendChild(heading);
 for(const row of netGame.damage){const line=document.createElement('div');line.className='netDamageRow'+(row.top?' top':'');const name=document.createElement('span'),value=document.createElement('strong');name.textContent=row.rank+'. '+row.player+' · '+(CHARACTERS.find(c=>c.id===row.hero)?.name||row.name||'HERO');value.textContent=Number(row.damage||0).toLocaleString('id-ID',{maximumFractionDigits:1});line.append(name,value);if(row.top){const badge=document.createElement('small');badge.textContent='TOP DAMAGE';line.appendChild(badge);}box.appendChild(line);}
}
lanMovementFrame=function(now){
 if(!netGame.active||!lanMoveActive)return;
 if(lanLastFrame&&now-lanLastFrame<1000/preferences.fps-1){lanMoveFrame=requestAnimationFrame(lanMovementFrame);return;}
 const dt=lanLastFrame?Math.min(.05,(now-lanLastFrame)/1000):0;lanLastFrame=now;
 let x=lanMoveBridge.x,y=lanMoveBridge.y;const length=Math.hypot(x,y);if(length>1){x/=length;y/=length;}lanMoveInput={x,y};lanAim={active:lanSkillBridge.active,x:lanSkillBridge.x,y:lanSkillBridge.y};
 if(!lanWinner&&(now-netGame.lastSend>=50||netGame.lastSend===0)){netGame.lastSend=now;netSend({type:'input',x,y,seq:++netGame.seq});}
 const local=lanLocalSlot(),frames=netGame.frames,t=now-Math.min(130,65+netGame.jitter*.5);let a=frames[0],b=frames.at(-1);for(let i=1;i<frames.length;i++)if(frames[i].at>=t){a=frames[i-1];b=frames[i];break;}
 for(let i=0;i<lanFighters.length;i++){
  const e=lanFighters[i];if(!a||!b)continue;
  if(i===local&&netGame.prediction){const p=netGame.prediction,oldX=p.x,oldY=p.y;if(!lanWinner&&e.hp>0&&e.netCanMove!==false&&!e.netDash&&!(e.stunTimer>0)&&!(e.expRootTimer>0)&&!(e.expCharmTimer>0)&&!(e.expConfuseTimer>0)){
    if(netGame.state?.party){const v=fighterSpeed(e),blend=1-Math.exp(-(Math.hypot(x,y)>.05?14:19)*dt),slow=e.slowTimer>0?e.slowFactor:1;p.lx=(p.lx||0)+(x*v-(p.lx||0))*blend;p.ly=(p.ly||0)+(y*v-(p.ly||0))*blend;p.ix=(p.ix||0)*Math.exp(-dt/.17);p.iy=(p.iy||0)*Math.exp(-dt/.17);p.x+=(p.lx*slow+p.ix)*dt;p.y+=(p.ly*slow+p.iy)*dt;}else{const speed=e.netSpeed||fighterSpeed(e);p.x+=x*speed*dt;p.y+=y*speed*dt;}
   }
   const k=1-Math.exp(-7*dt);p.x+=netGame.correction.x*k;p.y+=netGame.correction.y*k;netGame.correction.x*=1-k;netGame.correction.y*=1-k;e.x=p.x;e.y=p.y;
   // Collision is a visual predictor only; authoritative coordinates remain on server.
   resolveWalls(e);const bounds=getArenaBounds();e.x=Math.max(bounds.left+e.radius,Math.min(bounds.right-e.radius,e.x));e.y=Math.max(bounds.top+e.radius,Math.min(bounds.bottom-e.radius,e.y));if(!Number.isFinite(e.x)||!Number.isFinite(e.y)){e.x=oldX;e.y=oldY;}p.x=e.x;p.y=e.y;
  }else{const aa=a.positions[i],bb=b.positions[i];if(!aa||!bb)continue;const f=a===b?1:Math.max(0,Math.min(1,(t-a.at)/(b.at-a.at||1)));if(Math.hypot(bb.x-aa.x,bb.y-aa.y)>170){e.x=bb.x;e.y=bb.y;}else{e.x=aa.x+(bb.x-aa.x)*f;e.y=aa.y+(bb.y-aa.y)*f;}}
  const since=Math.min(.08,(now-netGame.lastReceive)/1000);for(const kind of ['neoShots','rockets'])for(const s of e[kind]||[])if(Number.isFinite(s._netX)&&Number.isFinite(s._netY)){const vx=Number.isFinite(s.vx)?s.vx:Math.cos(s.ang||0)*(s.speed||0),vy=Number.isFinite(s.vy)?s.vy:Math.sin(s.ang||0)*(s.speed||0);s.x=s._netX+vx*since;s.y=s._netY+vy*since;}
 }
 for(const s of projectiles){const since=Math.min(.08,(now-netGame.lastReceive)/1000);if(Number.isFinite(s._netX)){s.x=s._netX+(s.vx||0)*since;s.y=s._netY+(s.vy||0)*since;}}
 lanPositions=lanFighters.flatMap(e=>[e.x,e.y]);lanUpdateBattleHud();lanDrawArena(dt);
 const badge=document.getElementById('netServerBadge');if(badge)badge.textContent='SERVER · '+Math.round(netGame.rtt)+' ms'+(now-netGame.lastReceive>1500&&!lanWinner?' · MENUNGGU DATA':'');
 lanMoveFrame=requestAnimationFrame(lanMovementFrame);
};
const netHudBase=lanUpdateBattleHud;lanUpdateBattleHud=function(){netHudBase();if(!netGame.active)return;const e=lanFighters[lanLocalSlot()];if(e&&!e.isUltMode&&!(e instanceof Dummies))document.getElementById('lanUltLabel').textContent=e.lanReady?'SIAP':Math.floor(e.ultCharge||0)+'%';netRenderDamage();};
// Boss can also use the same authoritative server over local Wi-Fi.
const netBossButtons=lanBossModeButtons;lanBossModeButtons=function(){netBossButtons();const button=document.getElementById('lanModeBoss');if(button)button.style.display=lanInRoom?'none':'block';};
lanSetBossMode=function(){if(lanInRoom)return;lanRoomMode='boss';lanCapacity=4;lanReadyStates=[];lanUpdatePartyModeButtons();lanBossModeButtons();lanBossRenderPicker();lanButtons();};
const netCss=document.createElement('style');netCss.textContent='#lanResultCard{max-height:calc(100dvh - 32px);overflow-y:auto}#netDamageRanking{width:100%;text-align:left;border-top:2px solid #111;padding-top:8px;font:800 10px/1.4 system-ui}#netDamageRanking>b{display:block;font-size:9px;margin-bottom:5px}.netDamageRow{display:grid;grid-template-columns:1fr auto;gap:2px 6px;padding:5px;border-bottom:1px solid #d1d5db}.netDamageRow>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.netDamageRow.top{background:#fef08a}.netDamageRow small{grid-column:1/-1;color:#854d0e;font-size:8px!important;letter-spacing:0!important}#netServerBadge{position:absolute;right:9px;top:46px;font:800 8px system-ui;color:#334155;pointer-events:none}';document.head.appendChild(netCss);
const netBadge=document.createElement('span');netBadge.id='netServerBadge';netBadge.textContent='SIMULASI SERVER';document.getElementById('lanMoveOverlay').appendChild(netBadge);
// Result avatars now resolve the per-hero external ball slot.
new MutationObserver(()=>{const winners=document.querySelectorAll('#lanResultWinners .lanResultHero');if(!winners.length)return;const ids=lanWinner==='PLAYERS'?lanFighters:lanWinner==='TEAM1'?lanFighters.slice(0,2):lanWinner==='TEAM2'?lanFighters.slice(2):/^P[1-4]$/.test(lanWinner||'')?[lanFighters[+lanWinner[1]-1]]:[];winners.forEach((el,i)=>{const path=ids[i]&&AssetPack.resolveAsset(ids[i].heroId,'ball'),avatar=el.querySelector('.lanResultAvatar');if(path&&avatar&&!avatar.querySelector('img')){const img=document.createElement('img');img.alt='';img.src=AssetPack.url(path);avatar.appendChild(img);}});}).observe(document.getElementById('lanResultWinners'),{childList:true});
