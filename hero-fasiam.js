// FASIAM SLICER — offline hero. All combat is update-driven; drawing never applies damage.
DAMAGE_SCHEMA.FasiamSlicer={basic:{label:'Fasiam · Arc Slash',value:16,step:1},skill:{label:'Fasiam · Shadow Dash',value:62,step:1},ult:{label:'Fasiam · Domain pulse',value:18,step:1}};
const FASIAM={hp:360,speed:330,basicCd:400,basicReach:76,basicHalfArc:1.05,dashRange:280,dashCd:5500,slowMs:900,slowFactor:.65,splitMs:360,domainMs:3000,mergeMs:260,splitTravel:180,pulseMs:200,pulses:15,autoAimRange:300,domainSlow:.55,halfAngle:Math.PI/3};
function fasiamOwner(e){return e&&e.fasiamOwner?e.fasiamOwner:e;}
function fasiamFoes(e){return gamePlayers.filter(t=>t.hp>0&&isOpponent(e,t));}
function fasiamFreeTravel(x,y,angle,distance,radius){const b=getArenaBounds(),dx=Math.cos(angle),dy=Math.sin(angle);let last=0;for(let d=0;d<=distance;d+=2){const px=x+dx*d,py=y+dy*d;if(px-radius<b.left||px+radius>b.right||py-radius<b.top||py+radius>b.bottom||(mazeMode&&circleHitsWall(px,py,radius+1))||(typeof party!=='undefined'&&party.active&&partySolidAt(px,py,radius)))break;last=d;}return last;}
function fasiamAutoTarget(e){return fasiamFoes(e).filter(t=>!t.isIntangible&&canLockTarget(t)&&Math.hypot(t.x-e.x,t.y-e.y)<=FASIAM.autoAimRange&&(!mazeMode||hasLineOfSight(e.x,e.y,t.x,t.y))).sort((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y))[0]||null;}
function fasiamWedge(c,x,y,angle,range,half){c.beginPath();c.moveTo(x,y);c.arc(x,y,range,angle-half,angle+half);c.closePath();}
const fasiamSpriteCache=new Map();
function fasiamSprite(slot){
 if(typeof Image==='undefined'||!window.BALL_FIGHT_ASSETS?.heroes?.FasiamSlicer?.customSprites)return null;
 const path=AssetPack.resolveAsset('FasiamSlicer',slot);if(!path)return null;if(!fasiamSpriteCache.has(path)){const img=new Image();img.src=AssetPack.url(path);fasiamSpriteCache.set(path,img);}const img=fasiamSpriteCache.get(path);return img.complete&&img.naturalWidth>0?img:null;
}
function fasiamOrb(c,x,y,r,angle,side,opacity=1){
 c.save();c.globalAlpha*=opacity;c.translate(x,y);c.rotate(angle);const color=side<0?'#39eaff':'#ad67ff';
 c.shadowColor=color;c.shadowBlur=10;const g=c.createRadialGradient(-r*.32,-r*.4,1,0,0,r);g.addColorStop(0,'#e8ffff');g.addColorStop(.22,color);g.addColorStop(.72,side<0?'#155e75':'#5b21b6');g.addColorStop(1,'#101227');c.fillStyle=g;c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();c.shadowBlur=0;c.strokeStyle='#090e20';c.lineWidth=2.5;c.stroke();c.strokeStyle=color;c.lineWidth=1.25;c.beginPath();c.arc(0,0,r*.78,.4,5.4);c.stroke();
 const skin=fasiamSprite('ball');if(skin){c.save();c.beginPath();c.arc(0,0,r-.5,0,Math.PI*2);c.clip();c.drawImage(skin,0,side<0?0:skin.naturalHeight/2,skin.naturalWidth,skin.naturalHeight/2,-r,-r,r*2,r*2);c.restore();}
 c.fillStyle='#0b1229';c.beginPath();c.moveTo(r*.1,-r*.45);c.lineTo(r*.82,-r*.21);c.lineTo(r*.82,r*.21);c.lineTo(r*.1,r*.45);c.closePath();c.fill();c.strokeStyle='#f8ffff';c.lineWidth=1.8;c.beginPath();c.moveTo(r*.25,-r*.18);c.lineTo(r*.68,-r*.09);c.moveTo(r*.25,r*.18);c.lineTo(r*.68,r*.09);c.stroke();
 // Cyan Alpha carries two short blades; purple Beta carries the long katana.
 const sy=side<0?-1:1;c.translate(r*.25,sy*r*.84);c.rotate(side<0?-.2:.14);
 const blade=(length,offset)=>{c.save();c.translate(0,offset);c.fillStyle='#f0fdff';c.strokeStyle=color;c.lineWidth=1;c.beginPath();c.moveTo(-4,-2);c.lineTo(length-5,-2);c.lineTo(length+3,0);c.lineTo(length-5,3);c.lineTo(-4,2);c.closePath();c.fill();c.stroke();c.strokeStyle='#111827';c.lineWidth=4;c.beginPath();c.moveTo(-13,0);c.lineTo(-4,0);c.stroke();c.strokeStyle='#e9d5ff';c.lineWidth=2;c.beginPath();c.moveTo(-3,-6);c.lineTo(-3,6);c.stroke();c.restore();};
 if(side<0){blade(r*.95,-4);blade(r*.76,5);}else blade(r*1.95,0);c.restore();
}
class FasiamCompanion extends BaseEntity{
 constructor(owner){super(owner.x,owner.y,owner.radius*.68,'#a855f7',owner.isP2);this.fasiamOwner=owner;this.heroId='FasiamSlicer';this.name='Fasiam-Beta';this.teamId=owner.teamId;this.hudSlot=null;this.active=true;this.manualSkillOnly=true;this.vx=this.vy=0;for(const key of [...EXPANSION_STATUS_FIELDS,'stunTimer','slowTimer','slowFactor','iFrame','expDots','expShield','expMarks','vulnerabilityTimer','vulnerabilityStacks','isIntangible','isShadowStepping','isPhantomHidden','phantomVeil','expStealth'])Object.defineProperty(this,key,{configurable:true,get:()=>owner[key],set:v=>{owner[key]=v;}});Object.defineProperty(this,'hp',{configurable:true,get:()=>this.active&&owner.fasiamPhase!=='joined'?owner.hp:0,set:()=>{}});Object.defineProperty(this,'maxHp',{configurable:true,get:()=>owner.maxHp,set:()=>{}});}
 takeDamage(amount,pierce=false){if(!this.active||this.fasiamOwner.hp<=0)return 0;return this.fasiamOwner.takeDamage(amount,pierce);}
 update(){} updateMovement(){} draw(){} drawHP(){}
}
class FasiamSlicer extends BaseEntity{
 constructor(x,y,isP2){super(x,y,31,'#22d3ee',isP2);this.name='Fasiam Slicer';this.hp=this.maxHp=FASIAM.hp;this.facing=0;this.ultCharge=0;this.manualCd1=0;this.attackCd=0;this.ultRetryMs=0;this.isUltMode=false;this.fasiamPhase='joined';this.phaseElapsed=0;this.fasiamTime=0;this.fasiamFx=[];this.dashShadows=[];this.slashSide=1;this.domain=null;this.beta=null;this.proceduralBody=true;this.proceduralFx=true;}
 takeDamage(amount,pierce=false){const dealt=super.takeDamage(amount,pierce);if(this.hp<=0)this.cancelDomain();return dealt;}
 aimAt(enemy){if(enemy&&enemy.hp>0&&!enemy.phantomVeil)this.facing=Math.atan2(enemy.y-this.y,enemy.x-this.x);}
 update(dt,enemy){
  if(this.hp<=0){this.cancelDomain();return;}if(this.fasiamPhase!=='joined'){this.vx=this.vy=0;return;}
  if(Math.hypot(this.vx,this.vy)>5)this.facing=Math.atan2(this.vy,this.vx);this.updateMovement(dt,enemy);
  if(this.ultRetryMs<=0&&this.ultCharge>=100&&(!this.manualSkillOnly||this.isBot||this._ultArmed)){this.castUlt(enemy);if(this.isUltMode)return;}
  const foes=fasiamFoes(this);if(this.attackCd<=0&&foes.some(t=>Math.hypot(t.x-this.x,t.y-this.y)<FASIAM.basicReach+t.radius)){this.aimAt(enemy);this.basic();}
  if(!this.manualSkillOnly&&this.manualCd1<=0&&enemy&&Math.hypot(enemy.x-this.x,enemy.y-this.y)<350){this.aimAt(enemy);this.manualSkill1(this.facing);}
 }
 tickFasiam(dt){
  dt=Math.max(0,Math.min(100,dt));this.fasiamTime+=dt;if(this.isUltMode&&this.iFrame>0&&!(this.stunTimer>0))this.iFrame=Math.max(0,this.iFrame-dt);this.ultRetryMs=Math.max(0,this.ultRetryMs-dt);this.manualCd1=Math.max(0,this.manualCd1-dt);this.attackCd=Math.max(0,this.attackCd-dt);
  for(const f of this.fasiamFx)f.life-=dt;this.fasiamFx=this.fasiamFx.filter(f=>f.life>0).slice(-44);for(const s of this.dashShadows)s.life-=dt;this.dashShadows=this.dashShadows.filter(s=>s.life>0).slice(-16);
  if(this.hp<=0){this.cancelDomain();return;}if(!this.isUltMode)this.ultCharge=Math.min(100,this.ultCharge+dt*.004);
  if(this.domain){const b=getArenaBounds(),d=this.domain;for(const key of ['a','b']){d[key+'x']=Math.max(b.left+this.radius,Math.min(b.right-this.radius,d[key+'x']));d[key+'y']=Math.max(b.top+this.radius,Math.min(b.bottom-this.radius,d[key+'y']));}d.range=Math.hypot(d.bx-d.ax,d.by-d.ay);d.angle=Math.atan2(d.by-d.ay,d.bx-d.ax);if(d.range<70)this.cancelDomain();}
  let left=dt;for(let guard=0;left>0&&this.domain&&guard<4;guard++){
   const duration=this.fasiamPhase==='split'?FASIAM.splitMs:this.fasiamPhase==='domain'?FASIAM.domainMs:FASIAM.mergeMs,used=Math.min(left,duration-this.phaseElapsed);this.phaseElapsed+=used;left-=used;const p=Math.min(1,this.phaseElapsed/duration),d=this.domain;
   if(this.fasiamPhase==='split'){const q=1-Math.pow(1-p,3);this.x=d.cx+(d.ax-d.cx)*q;this.y=d.cy+(d.ay-d.cy)*q;this.beta.x=d.cx+(d.bx-d.cx)*q;this.beta.y=d.cy+(d.by-d.cy)*q;this.facing=d.angle;}
   else if(this.fasiamPhase==='domain'){this.x=d.ax;this.y=d.ay;this.beta.x=d.bx;this.beta.y=d.by;this.holdDomainTargets();const waves=Math.min(FASIAM.pulses,Math.floor(Math.max(0,this.phaseElapsed-.00001)/FASIAM.pulseMs)+1);while(d.waves<waves){this.domainPulse(d.waves++);}}
   else if(this.fasiamPhase==='merge'){const q=1-Math.pow(1-p,3);this.x=d.ax;this.y=d.ay;this.beta.x=d.bx+(d.ax-d.bx)*q;this.beta.y=d.by+(d.ay-d.by)*q;}
   this.vx=this.vy=0;if(this.phaseElapsed>=duration-.00001){this.phaseElapsed=0;if(this.fasiamPhase==='split'){this.fasiamPhase='domain';playBladeHit(true);}else if(this.fasiamPhase==='domain'){this.fasiamPhase='merge';playDash();}else{this.fasiamFx.push({kind:'fusion',x:this.x,y:this.y,life:330,max:330,angle:d.angle});playFasiamMerge();this.cancelDomain();}}
  }
 }
 basic(){
  if(this.hp<=0||this.stunTimer>0||this.attackCd>0||this.isUltMode)return;this.attackCd=FASIAM.basicCd;this.slashSide*=-1;const a=this.facing;
  this.fasiamFx.push({kind:'arc',x:this.x,y:this.y,angle:a,side:this.slashSide,life:155,max:155,r:FASIAM.basicReach});let hit=false;const hitOwners=new Set();
  for(const t of fasiamFoes(this)){if(hitOwners.has(fasiamOwner(t)))continue;const dx=t.x-this.x,dy=t.y-this.y,dist=Math.hypot(dx,dy),angle=Math.atan2(Math.sin(Math.atan2(dy,dx)-a),Math.cos(Math.atan2(dy,dx)-a));if(dist>FASIAM.basicReach+t.radius||Math.abs(angle)>FASIAM.basicHalfArc||t.isIntangible||(mazeMode&&!hasLineOfSight(this.x,this.y,t.x,t.y)))continue;hitOwners.add(fasiamOwner(t));const dealt=t.takeDamage(D('FasiamSlicer','basic'));if(dealt>0){hit=true;this.ultCharge=Math.min(100,this.ultCharge+2);}}
  playFasiamSlash(hit);
 }
 manualSkill1(angle){
  if(this.hp<=0||this.stunTimer>0||this.expRootTimer>0||this.expSilenceTimer>0||this.manualCd1>0||this.isUltMode)return false;
  const a=Number.isFinite(angle)?angle:this.facing,dist=fasiamFreeTravel(this.x,this.y,a,FASIAM.dashRange,this.radius);if(dist<8)return false;
  const sx=this.x,sy=this.y,ex=sx+Math.cos(a)*dist,ey=sy+Math.sin(a)*dist;this.manualCd1=FASIAM.dashCd;this.facing=a;
  for(let t=0;t<=dist;t+=32)this.dashShadows.push({x:sx+Math.cos(a)*t,y:sy+Math.sin(a)*t,angle:a,life:300*(.4+.6*t/dist),max:300});
  this.x=ex;this.y=ey;this.vx=this.vy=0;let hits=0;const hitOwners=new Set();
  for(const t of fasiamFoes(this)){if(hitOwners.has(fasiamOwner(t)))continue;const reach=t.radius+this.radius*.75;if(t.isIntangible||distSqPointToSegment(t.x,t.y,sx,sy,ex,ey)>reach*reach||(mazeMode&&!hasLineOfSight(sx,sy,t.x,t.y)))continue;hitOwners.add(fasiamOwner(t));const dealt=t.takeDamage(D('FasiamSlicer','skill'));if(dealt>0){hits++;if(!(fasiamOwner(t).expCcImmuneTimer>0)){const target=fasiamOwner(t);target.slowTimer=Math.max(target.slowTimer||0,FASIAM.slowMs);target.slowFactor=Math.min(target.slowFactor||1,FASIAM.slowFactor);}this.fasiamFx.push({kind:'cross',x:t.x,y:t.y,angle:a+.8,life:220,max:220,r:34});}}
  this.ultCharge=Math.min(100,this.ultCharge+Math.min(18,hits*6));this.fasiamFx.push({kind:'cross',x:ex,y:ey,angle:a+.8,life:260,max:260,r:48});playDash();if(hits)playBladeHit(true);return true;
 }
 castUlt(enemy){
  if(this.hp<=0||this.stunTimer>0||this.expSilenceTimer>0||this.ultCharge<100||this.isUltMode)return false;const locked=fasiamAutoTarget(this);if(locked)this.aimAt(locked);else if(enemy)this.aimAt(enemy);const bias=locked?Math.min(150,Math.hypot(locked.x-this.x,locked.y-this.y)*.5):0;this.lastAutoAim=locked?{x:locked.x,y:locked.y}:null;
  let angle=this.facing,left=fasiamFreeTravel(this.x,this.y,angle+Math.PI,FASIAM.splitTravel-bias,this.radius),right=fasiamFreeTravel(this.x,this.y,angle,FASIAM.splitTravel+bias,this.radius);
  if(left+right<110){const alt=angle+Math.PI/2,l=fasiamFreeTravel(this.x,this.y,alt+Math.PI,FASIAM.splitTravel,this.radius),r=fasiamFreeTravel(this.x,this.y,alt,FASIAM.splitTravel,this.radius);if(l+r>left+right){angle=alt;left=l;right=r;}}
  if(left+right<100){this._ultArmed=false;this.ultRetryMs=500;createFloatingText(this.x,this.y-60,'RUANG TERLALU SEMPIT','#c4b5fd');return false;}
  const ux=Math.cos(angle),uy=Math.sin(angle);this.domain={cx:this.x,cy:this.y,ax:this.x-ux*left,ay:this.y-uy*left,bx:this.x+ux*right,by:this.y+uy*right,angle,range:left+right,waves:0};this.beta=new FasiamCompanion(this);this._joinedRadius=this.radius;this.beta.radius=this.radius*.74;this.radius*=.74;this.isUltMode=true;this.fasiamPhase='split';this.phaseElapsed=0;this.ultCharge=0;this._ultArmed=false;this.vx=this.vy=0;gamePlayers=[...gamePlayers,this.beta];playUltActivate();createFloatingText(this.x,this.y-70,'DUAL HORIZON','#a855f7');return true;
 }
 inDomain(t){const d=this.domain;if(!d||t.hp<=0||!isOpponent(this,t))return false;const test=(x,y,a)=>{const dx=t.x-x,dy=t.y-y,dist=Math.hypot(dx,dy),rel=Math.atan2(Math.sin(Math.atan2(dy,dx)-a),Math.cos(Math.atan2(dy,dx)-a));return dist<=d.range+t.radius*.5&&Math.abs(rel)<=FASIAM.halfAngle+Math.atan2(t.radius*.5,dist||1);};return test(d.ax,d.ay,d.angle)&&test(d.bx,d.by,d.angle+Math.PI)&&(!mazeMode||hasLineOfSight(d.ax,d.ay,t.x,t.y)||hasLineOfSight(d.bx,d.by,t.x,t.y));}
 holdDomainTargets(){for(const t of fasiamFoes(this))if(this.inDomain(t)&&!fasiamOwner(t).isIntangible&&!(fasiamOwner(t).expInvulnTimer>0)&&!(fasiamOwner(t).expCcImmuneTimer>0)){const target=fasiamOwner(t);target.slowFactor=target.slowTimer>0?Math.min(target.slowFactor||1,FASIAM.domainSlow):FASIAM.domainSlow;target.slowTimer=Math.max(target.slowTimer||0,180);}}
 domainPulse(wave){const d=this.domain;if(!d)return;const hitOwners=new Set();for(const t of fasiamFoes(this))if(!hitOwners.has(fasiamOwner(t))&&this.inDomain(t)&&!t.isIntangible){hitOwners.add(fasiamOwner(t));t.takeDamage(D('FasiamSlicer','ult'),true);}
  const mx=(d.ax+d.bx)/2,my=(d.ay+d.by)/2;for(let i=0;i<4;i++){const s=(Math.random()-.5)*d.range*.8,u=(Math.random()-.5)*d.range*.7;this.fasiamFx.push({kind:'cross',x:mx+Math.cos(d.angle)*s-Math.sin(d.angle)*u,y:my+Math.sin(d.angle)*s+Math.cos(d.angle)*u,angle:d.angle+(i%2?-.8:.8),life:165,max:165,r:36+Math.random()*24,domain:true});}if(wave%3===0)playFasiamPulse();
 }
 cancelDomain(){if(this.beta){this.beta.active=false;const b=this.beta;gamePlayers=gamePlayers.filter(e=>e!==b);}this.beta=null;this.domain=null;if(this._joinedRadius){this.radius=this._joinedRadius;this._joinedRadius=null;const p=clampInside(this.x,this.y,this.radius);this.x=p.x;this.y=p.y;}this.isUltMode=false;this.fasiamPhase='joined';this.phaseElapsed=0;this.fasiamFx=this.fasiamFx.filter(f=>!f.domain);}
 drawDomain(){const d=this.domain;if(!d)return;const c=ctx,a=d.angle,fade=this.fasiamPhase==='split'?Math.min(1,this.phaseElapsed/FASIAM.splitMs):this.fasiamPhase==='merge'?1-this.phaseElapsed/FASIAM.mergeMs:1;
  c.save();c.globalAlpha=fade;fasiamWedge(c,d.ax,d.ay,a,d.range,FASIAM.halfAngle);c.clip();fasiamWedge(c,d.bx,d.by,a+Math.PI,d.range,FASIAM.halfAngle);c.clip();const g=c.createLinearGradient(d.ax,d.ay,d.bx,d.by);g.addColorStop(0,'rgba(34,211,238,.14)');g.addColorStop(.5,'rgba(88,28,135,.23)');g.addColorStop(1,'rgba(168,85,247,.17)');c.fillStyle=g;c.fillRect(0,0,canvas.width,canvas.height);c.strokeStyle='rgba(165,243,252,.22)';c.lineWidth=1;for(let i=-4;i<=4;i++){c.beginPath();c.moveTo(d.ax-Math.sin(a)*i*42,d.ay+Math.cos(a)*i*42);c.lineTo(d.bx-Math.sin(a)*i*42,d.by+Math.cos(a)*i*42);c.stroke();}c.restore();
  // Same two-sector intersection boundary as the actual hit test, not a fake full-screen AoE.
  for(const [x,y,ang,ox,oy,oa,color]of[[d.ax,d.ay,a,d.bx,d.by,a+Math.PI,'#67e8f9'],[d.bx,d.by,a+Math.PI,d.ax,d.ay,a,'#c084fc']]){c.save();c.globalAlpha=fade*.8;fasiamWedge(c,ox,oy,oa,d.range,FASIAM.halfAngle);c.clip();fasiamWedge(c,x,y,ang,d.range,FASIAM.halfAngle);c.strokeStyle=color;c.lineWidth=2;c.setLineDash([9,7]);c.lineDashOffset=-this.fasiamTime/28;c.stroke();c.restore();}
 }
 draw(){if(this.hp<=0)return;this.drawDomain();const c=ctx,r=this._joinedRadius||this.radius;
  for(const s of this.dashShadows){const opacity=Math.max(0,s.life/s.max)*.25;const dx=-Math.sin(s.angle)*r*.5,dy=Math.cos(s.angle)*r*.5;fasiamOrb(c,s.x-dx,s.y-dy,r*.5,s.angle,-1,opacity);fasiamOrb(c,s.x+dx,s.y+dy,r*.5,s.angle,1,opacity);}
  for(const f of this.fasiamFx){c.save();if(f.domain&&this.domain){const d=this.domain;fasiamWedge(c,d.ax,d.ay,d.angle,d.range,FASIAM.halfAngle);c.clip();fasiamWedge(c,d.bx,d.by,d.angle+Math.PI,d.range,FASIAM.halfAngle);c.clip();}c.globalAlpha=Math.max(0,f.life/f.max);c.translate(f.x,f.y);c.rotate(f.angle||0);c.shadowBlur=8;c.shadowColor=f.kind==='arc'?'#22d3ee':'#c084fc';c.strokeStyle=f.kind==='arc'?'#a5f3fc':'#e9d5ff';c.lineWidth=f.kind==='arc'?2.1:2.8;const art=fasiamSprite(f.kind==='arc'?'basic':f.domain||f.kind==='fusion'?'ultimate':'skill');if(art){c.drawImage(art,-(f.r||45),-(f.r||45),(f.r||45)*2,(f.r||45)*2);}
   if(f.kind==='arc'){const p=1-f.life/f.max;c.beginPath();c.arc(0,0,f.r*.75,-1.05+p*.7,1.05+p*.7);c.stroke();c.lineWidth=.8;c.strokeStyle='#22d3ee';c.beginPath();c.arc(0,0,f.r*.88,-.9+p*.7,.9+p*.7);c.stroke();}
   else if(f.kind==='fusion'){c.strokeStyle='#67e8f9';c.beginPath();c.arc(0,0,18+(1-f.life/f.max)*55,0,Math.PI*2);c.stroke();}
   else{for(const sign of[-1,1]){c.strokeStyle=sign<0?'#67e8f9':'#c084fc';c.beginPath();c.moveTo(-f.r,-f.r*.5*sign);c.quadraticCurveTo(0,-f.r*.12*sign,f.r,f.r*.5*sign);c.stroke();}}c.restore();}
  if(this.domain&&this.beta){fasiamOrb(c,this.x,this.y,r*.74,this.domain.angle,-1);fasiamOrb(c,this.beta.x,this.beta.y,r*.74,this.domain.angle+Math.PI,1);c.save();c.font='900 12px system-ui';c.textAlign='center';c.strokeStyle='#0f172a';c.lineWidth=3;for(const [x,y,text,color]of[[this.x,this.y,'FASIAM-ALPHA','#67e8f9'],[this.beta.x,this.beta.y,'FASIAM-BETA','#c084fc']]){c.strokeText(text,x,y-r-15);c.fillStyle=color;c.fillText(text,x,y-r-15);}c.restore();}
  else{const dx=-Math.sin(this.facing)*r*.5,dy=Math.cos(this.facing)*r*.5;fasiamOrb(c,this.x-dx,this.y-dy,r*.5,this.facing,-1);fasiamOrb(c,this.x+dx,this.y+dy,r*.5,this.facing,1);}
  this.drawHP();
 }
 updateUI(prefix){const el=id=>document.getElementById(prefix+id);el('TitleLabel').textContent='FASIAM SLICER';el('StatsText').textContent='ARC '+D('FasiamSlicer','basic')+' · DASH '+D('FasiamSlicer','skill')+'\n'+(this.isUltMode?this.fasiamPhase.toUpperCase():this.manualCd1>0?'DASH '+(this.manualCd1/1000).toFixed(1)+'s':'SHADOW DASH READY');el('UltContainer').classList.remove('hidden');el('UltProgressBar').style.width=Math.min(100,this.ultCharge)+'%';el('UltProgressText').textContent=this.isUltMode?'DUAL HORIZON':Math.floor(this.ultCharge)+'%';}
}
function fasiamCamera(){const e=gamePlayers.find(p=>p instanceof FasiamSlicer&&p.hp>0&&p.domain);if(!e)return false;const d=e.domain,W=canvas.width,H=canvas.height,z=Math.max(1,Math.min(1.3,W/(d.range*1.9+100),H/(d.range*1.9+100))),halfW=W/(2*z),halfH=H/(2*z),cx=Math.max(halfW,Math.min(W-halfW,(d.ax+d.bx)/2)),cy=Math.max(halfH,Math.min(H-halfH,(d.ay+d.by)/2));ctx.setTransform(z,0,0,z,W/2-cx*z,H/2-cy*z);if(duelMode)duelCamera={x:cx,y:cy,zoom:z,time:performance.now()};return true;}
