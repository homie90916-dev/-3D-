(() => {
"use strict";

// V4: 2D/2.5D isometric sprite-style prototype based on the user's supplied
// gameplay video. Original canvas artwork; not extracted game assets.
document.addEventListener("contextmenu",e=>e.preventDefault());
document.addEventListener("selectstart",e=>e.preventDefault());
const canvas = document.getElementById("world");
const ctx = canvas.getContext("2d", { alpha: false });
let W=0,H=0,DPR=1;
function resize(){
  DPR=Math.min(window.devicePixelRatio||1,1.7);
  W=window.innerWidth; H=window.innerHeight;
  canvas.width=Math.round(W*DPR); canvas.height=Math.round(H*DPR);
  canvas.style.width=W+"px"; canvas.style.height=H+"px";
  ctx.setTransform(DPR,0,0,DPR,0,0);
}
addEventListener("resize",resize);
addEventListener("orientationchange",resize);
if(window.visualViewport) window.visualViewport.addEventListener("resize",resize);
resize();

const ui={
 hpBar:document.querySelector("#hpBar"),mpBar:document.querySelector("#mpBar"),xpBar:document.querySelector("#xpBar"),
 hpText:document.querySelector("#hpText"),mpText:document.querySelector("#mpText"),levelText:document.querySelector("#levelText"),
 kills:document.querySelector("#kills"),wave:document.querySelector("#wave"),message:document.querySelector("#message"),
 levelUp:document.querySelector("#levelUp"),gameOver:document.querySelector("#gameOver")
};
let hp=100,maxHp=100,mp=60,maxMp=60,xp=0,level=1,kills=0,wave=1,power=1,moveSpeed=3.2;
let autoAttack=true,attackCooldown=0,skillCooldown=0,invuln=0,paused=false,gameEnded=false;
const player={x:0,y:0,faceX:0,faceY:-1,walk:0,attack:0,attackHitTimer:0,attackTarget:null,attackHitDone:false,skillAnim:0,hit:0,moving:false,deadAt:0};
let screenShake=0;
const enemies=[],particles=[],slashes=[],runes=[];
const joy={x:0,y:0,active:false}; const keys={};
let last=performance.now(),time=0,spawnTimer=0;

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rand=(a,b)=>a+Math.random()*(b-a);
function updateUI(){
 ui.hpBar.style.width=`${Math.max(0,hp/maxHp*100)}%`;
 ui.mpBar.style.width=`${mp/maxMp*100}%`;
 ui.xpBar.style.width=`${xp}%`;
 ui.hpText.textContent=`${Math.ceil(hp)}/${maxHp}`;
 ui.mpText.textContent=`${Math.ceil(mp)}/${maxMp}`;
 ui.levelText.textContent=`Lv.${level}`;
 ui.kills.textContent=kills;ui.wave.textContent=wave;
}
function say(s){ui.message.textContent=s;}
function iso(x,y){
 // Isometric ground projection: world axes become diagonal screen axes.
 return {x:(x-y)*0.76,y:(x+y)*0.38};
}
function screenPos(x,y){
 const p=iso(x-player.x,y-player.y);
 return {x:W*.5+p.x*42,y:H*.49+p.y*42};
}
function path(points,fill,stroke=null,line=1){
 ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
 for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);
 ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}
 if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();}
}
function ellipse(x,y,rx,ry,fill,stroke=null,lw=1){
 ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);
 if(fill){ctx.fillStyle=fill;ctx.fill();}
 if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke();}
}
function roundedRect(x,y,w,h,r,fill,stroke=null,lw=1){
 ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();
 if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke();}
}
function drawFloor(){
 ctx.fillStyle="#292720";ctx.fillRect(0,0,W,H);
 const tile=54;
 // Stone paving follows the same isometric grid as the reference footage.
 for(let gy=-25;gy<26;gy++){
  for(let gx=-25;gx<26;gx++){
   const p=iso(gx*1.08,gy*1.08);
   const sx=W/2+(p.x-(iso(player.x,player.y).x))*42;
   const sy=H*.49+(p.y-(iso(player.x,player.y).y))*42;
   if(sx<-tile*2||sx>W+tile*2||sy<-tile*2||sy>H+tile*2)continue;
   const n=Math.sin(gx*12.989+gy*78.233)*43758.5453;
   const f=n-Math.floor(n);
   const base=30+Math.floor(f*17);
   const c=`rgb(${base+8},${base+7},${base+2})`;
   const w=tile*(.88+f*.10),h=tile*.46;
   path([[sx,sy-h],[sx+w,sy],[sx,sy+h],[sx-w,sy]],c,"#171812",1);
   // Broken-stone highlight on upper edge.
   ctx.strokeStyle="rgba(190,174,133,.10)";ctx.lineWidth=1;
   ctx.beginPath();ctx.moveTo(sx-w*.78,sy-h*.12);ctx.lineTo(sx,sy-h*.88);ctx.stroke();
  }
 }
 // Soft edge vignette and ambient pools of warm/cool light.
 const grd=ctx.createRadialGradient(W*.5,H*.48,30,W*.5,H*.48,Math.max(W,H)*.78);
 grd.addColorStop(0,"rgba(0,0,0,0)");grd.addColorStop(1,"rgba(0,0,0,.58)");
 ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);
}
function drawAura(x,y,r,color,alpha=1){
 ctx.save();ctx.globalAlpha=alpha;
 ctx.shadowColor=color;ctx.shadowBlur=16;
 ctx.strokeStyle=color;ctx.lineWidth=2;
 ctx.beginPath();ctx.ellipse(x,y,r,r*.42,0,0,Math.PI*2);ctx.stroke();
 ctx.globalAlpha=alpha*.34;ctx.lineWidth=6;
 ctx.beginPath();ctx.ellipse(x,y,r*.88,r*.36,0,0,Math.PI*2);ctx.stroke();
 ctx.restore();
}
// FINAL 5.0: animated 4x4 sprite sheet. Rows: idle, walk, melee attack, Halpas burst.
// The sheet is a newly-created 2D animation interpretation guided by the supplied
// official appearance image and gameplay recording; it is not extracted game data.
const halpasSheet = new Image();
halpasSheet.src = "./halpas_animated_sprites.png?v=final-5-2";
let halpasSheetReady = false;
halpasSheet.onload = () => { halpasSheetReady = true; };
function drawHalpas(x,y,scale=1,phase=0,faceX=0,faceY=-1,attack=0,hit=0,moving=false,skill=0,dead=0){
 ctx.save();
 ctx.translate(x,y);
 const bob = moving ? Math.abs(Math.sin(phase*4.25))*2.4 : Math.sin(phase*2.7)*1.15;
 // Ground shadow and blue transformation ring remain separate from the sprite.
 ctx.save();
 ctx.globalAlpha=.38;
 ctx.shadowColor="#293fff"; ctx.shadowBlur=24;
 ellipse(0,9,35,11,"#202d88");
 ctx.restore();
 drawAura(0,9,35,"#536cff",.94);

 if(halpasSheetReady){
  const cols=4, rows=4, cellW=halpasSheet.naturalWidth/cols, cellH=halpasSheet.naturalHeight/rows;
  let row=0, frame=0;
  if(skill>0){
   // Burst: gather energy -> spiral -> detonation -> trailing embers.
   const progress=1-skill;
   row=3;
   frame=progress<.18?0:progress<.40?1:progress<.74?2:3;
  } else if(attack>0){
   // Melee: wind-up -> raise weapon -> impact slash -> recovery.
   const progress=1-attack/.68;
   row=2;
   frame=progress<.20?0:progress<.44?1:progress<.72?2:3;
  } else if(moving){
   // Clear four-beat gait at a steady mobile-friendly cadence.
   row=1; frame=Math.floor(phase*8.5)%4;
  } else {
   // Slow idle loop so the armor and cape do not look frozen.
   row=0; frame=Math.floor(phase*3.2)%4;
  }
  const sx=frame*cellW, sy=row*cellH;
  // Fixed frame box keeps the feet planted on the blue ring while each pose changes.
  const h=194*scale, w=h*(cellW/cellH);
  const attackProgress=attack>0?1-attack/.68:0;
  const attackNudge=attack>0?Math.sin(attackProgress*Math.PI)*5.2:0;
  ctx.save();
  ctx.translate(attackNudge,-bob+dead*17);
  ctx.rotate(dead*.24);
  ctx.globalAlpha*=1-dead*.52;
  if(hit>0){ctx.globalAlpha=.78;ctx.filter="brightness(1.3) saturate(1.15)";}
  // Draw the cape-side slice with a small independent flutter; the torso and
  // weapon remain steady, creating a separate cape-motion layer on mobile.
  const capeWidth=w*.43;
  const capeShift=Math.sin(phase*5.4+(moving?1.1:0))*((moving?3.2:1.9)*scale);
  ctx.save();
  ctx.beginPath();ctx.rect(-w/2-5,-h+4,capeWidth+7,h+8);ctx.clip();
  ctx.drawImage(halpasSheet,sx,sy,cellW,cellH,-w/2+capeShift,-h+8,w,h);
  ctx.restore();
  ctx.save();
  ctx.beginPath();ctx.rect(-w/2+capeWidth,-h+4,w-capeWidth+6,h+8);ctx.clip();
  ctx.drawImage(halpasSheet,sx,sy,cellW,cellH,-w/2,-h+8,w,h);
  ctx.restore();
  ctx.restore();
 } else {
  // Loading fallback while the sprite sheet is fetched.
  ctx.save();ctx.globalAlpha=.65;ellipse(0,-76,24,52,"#241b35","#dca34d",2);ctx.restore();
 }
 // Small sparks orbit the character without hiding the animated silhouette.
 ctx.save();ctx.globalCompositeOperation="lighter";
 for(let i=0;i<5;i++){
  const a=phase*1.25+i*1.18;
  const sx=Math.cos(a)*(31+(i%3)*4), sy=-67+Math.sin(a)*37;
  ctx.globalAlpha=.16+.18*Math.sin(phase*3+i);
  ctx.fillStyle=i%2?"#ffad48":"#bd79ff";
  ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=7;
  ellipse(sx,sy,1.2,1.6,ctx.fillStyle);
 }
 ctx.restore();
 if(attack>.05){
  ctx.save();ctx.globalAlpha=.28+attack*.18;ctx.strokeStyle="#c18aff";
  ctx.shadowColor="#b24dff";ctx.shadowBlur=14;ctx.lineWidth=3;
  ctx.beginPath();ctx.arc(16,-94,49,-1.0,.4);ctx.stroke();ctx.restore();
 }
 if(skill>0){
  ctx.save();ctx.globalAlpha=.18+skill*.22;ctx.strokeStyle="#c58bff";
  ctx.shadowColor="#b24dff";ctx.shadowBlur=22;ctx.lineWidth=4;
  ctx.beginPath();ctx.ellipse(0,-84,47+Math.sin(time*18)*5,64+Math.sin(time*18)*7,0,0,Math.PI*2);ctx.stroke();ctx.restore();
 }
 if(hit>0){
  ctx.save();ctx.globalAlpha=clamp(hit/.2,0,1)*.55;ctx.strokeStyle="#ff5268";
  ctx.shadowColor="#ff334f";ctx.shadowBlur=14;ctx.lineWidth=2;
  ctx.beginPath();ctx.ellipse(0,-92,38,76,0,0,Math.PI*2);ctx.stroke();ctx.restore();
 }
 ctx.restore();
}
function drawEnemy(e){
 const p=screenPos(e.x,e.y), bob=Math.sin(time*5+e.phase)*1.5;
 ctx.save();ctx.translate(p.x,p.y);
 ellipse(0,7,14,6,"rgba(0,0,0,.4)");
 // small dark red goblin-like monster
 path([[-9,-5],[-10,-17],[-5,-24],[5,-24],[10,-16],[9,-4],[4,2],[-5,2]],"#451b28","#a94b55",1.2);
 ellipse(0,-24+bob,8,8,"#682c39","#b9565c",1);
 path([[-7,-27],[-11,-37],[-2,-31]],"#c84c3c","#ff8a55",.8);
 path([[7,-27],[11,-37],[2,-31]],"#c84c3c","#ff8a55",.8);
 roundedRect(-4,-25,8,2,1,"#ff4a61");
 if(e.hp<e.maxHp){
  roundedRect(-12,-43,24,3,2,"#24131b");
  roundedRect(-12,-43,24*clamp(e.hp/e.maxHp,0,1),3,2,"#d84a5b");
 }
 ctx.restore();
}
function spawnEnemy(){
 const a=rand(0,Math.PI*2),r=rand(8,13);
 enemies.push({x:player.x+Math.cos(a)*r,y:player.y+Math.sin(a)*r,hp:42+wave*6,maxHp:42+wave*6,speed:rand(.75,1.05),attack:rand(.2,1),phase:rand(0,8)});
}
for(let i=0;i<7;i++)spawnEnemy();

function addBurst(x,y,color="#a78bff",count=16,power=1){
 for(let i=0;i<count;i++){
  const a=rand(0,Math.PI*2),v=rand(25,100)*power;
  particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v- rand(10,45),life:rand(.35,.8),max:.8,color,size:rand(1.5,4)});
 }
}
function damageEnemy(e,amount){
 e.hp-=amount;addBurst(e.x,e.y,"#ff789e",8,.7);
 if(e.hp<=0){
  const idx=enemies.indexOf(e);if(idx>=0)enemies.splice(idx,1);
  kills++;xp+=25;
  if(xp>=100){xp-=100;level++;paused=true;ui.levelUp.classList.remove("hidden");}
  if(kills%8===0){wave++;for(let i=0;i<2+wave;i++)spawnEnemy();say(`第 ${wave} 波怪物來襲！`);}
  updateUI();
 }
}
function nearestEnemy(){
 let best=null,d=Infinity;
 for(const e of enemies){const n=Math.hypot(e.x-player.x,e.y-player.y);if(n<d){d=n;best=e;}}
 return best;
}
function attack(){
 if(gameEnded||paused||attackCooldown>0)return;
 attackCooldown=.78;player.attack=.68;player.attackHitTimer=.29;
 player.attackHitDone=false;
 const e=nearestEnemy();
 player.attackTarget=(e&&Math.hypot(e.x-player.x,e.y-player.y)<2.85)?e:null;
 if(player.attackTarget){
  const dx=e.x-player.x,dy=e.y-player.y,l=Math.hypot(dx,dy)||1;
  player.faceX=dx/l;player.faceY=dy/l;
 }
}
function castSkill(){
 if(gameEnded||paused||skillCooldown>0||mp<25)return;
 mp-=25;skillCooldown=5.4;player.skillAnim=1.12;player.attack=0;player.attackTarget=null;player.attackHitTimer=0;screenShake=.30;
 runes.push({x:player.x,y:player.y,r:.3,life:.9,max:.9});
 addBurst(player.x,player.y,"#b77aff",50,1.8);
 addBurst(player.x,player.y,"#ffb0dc",28,1.3);
 for(const e of [...enemies])if(Math.hypot(e.x-player.x,e.y-player.y)<3.8)damageEnemy(e,68*power);
 updateUI();
}
document.querySelector("#attackBtn").addEventListener("pointerdown",e=>{e.preventDefault();attack();});
document.querySelector("#skillBtn").addEventListener("pointerdown",e=>{e.preventDefault();castSkill();});
document.querySelector("#autoBtn").addEventListener("click",e=>{
 autoAttack=!autoAttack;e.currentTarget.textContent=`自動攻擊：${autoAttack?"開":"關"}`;
 e.currentTarget.classList.toggle("active",autoAttack);
});
for(const b of document.querySelectorAll("[data-up]"))b.addEventListener("click",()=>{
 const up=b.dataset.up;
 if(up==="power")power*=1.25;
 if(up==="health"){maxHp+=30;hp=Math.min(maxHp,hp+30);}
 if(up==="speed")moveSpeed*=1.15;
 ui.levelUp.classList.add("hidden");paused=false;say("力量提升！繼續戰鬥");updateUI();
});
const joyEl=document.querySelector("#joystick"),stick=document.querySelector("#stick");
function setJoy(e){
 const r=joyEl.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
 let dx=e.clientX-cx,dy=e.clientY-cy,len=Math.hypot(dx,dy),max=38;
 if(len>max){dx=dx/len*max;dy=dy/len*max;}
 joy.x=dx/max;joy.y=dy/max;stick.style.transform=`translate(${dx}px,${dy}px)`;
}
joyEl.addEventListener("pointerdown",e=>{joy.active=true;joyEl.setPointerCapture(e.pointerId);setJoy(e);});
joyEl.addEventListener("pointermove",e=>{if(joy.active)setJoy(e);});
function resetJoy(){joy.active=false;joy.x=0;joy.y=0;stick.style.transform="translate(0,0)";}
joyEl.addEventListener("pointerup",resetJoy);joyEl.addEventListener("pointercancel",resetJoy);
addEventListener("keydown",e=>{keys[e.key.toLowerCase()]=true;if(e.key===" "){e.preventDefault();attack();}if(e.key.toLowerCase()==="q")castSkill();});
addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);
document.querySelector("#restartBtn").addEventListener("click",()=>location.reload());
function endGame(){gameEnded=true;screenShake=0;player.deadAt=time;player.attack=0;player.skillAnim=0;ui.gameOver.classList.remove("hidden");document.querySelector("#finalStats").textContent=`等級 ${level} · 擊殺 ${kills} 隻怪物 · 抵擋 ${wave} 波`;}

function draw(){
 ctx.save();
 if(screenShake>0){
  const strength=screenShake*18;
  ctx.translate((Math.random()-.5)*strength,(Math.random()-.5)*strength);
 }
 drawFloor();
 // Sort actors by isometric depth for simple 2.5D overlap.
 const actors=enemies.map(e=>({y:e.x+e.y,draw:()=>drawEnemy(e)}));
 actors.push({y:player.x+player.y,draw:()=>{
  const p=screenPos(player.x,player.y);
  const dead=player.deadAt>0?clamp((time-player.deadAt)/1.05,0,1):0;
  drawHalpas(p.x,p.y,1,player.walk+time,player.faceX,player.faceY,player.attack,player.hit,player.moving,player.skillAnim,dead);
 }});
 actors.sort((a,b)=>a.y-b.y);for(const a of actors)a.draw();

 // Skill circles, sword slashes, floating particles.
 for(const r of runes){
  const p=screenPos(r.x,r.y);const q=1-r.life/r.max;
  ctx.save();ctx.globalAlpha=1-q;ctx.strokeStyle="#bd78ff";ctx.shadowColor="#a64dff";ctx.shadowBlur=18;ctx.lineWidth=3;
  const rr=24+q*135, ry=rr*.42;
  ctx.beginPath();ctx.ellipse(p.x,p.y,rr,ry,0,0,Math.PI*2);ctx.stroke();
  ctx.globalAlpha=(1-q)*.78;ctx.lineWidth=1.4;ctx.strokeStyle="#f0c8ff";
  ctx.beginPath();ctx.ellipse(p.x,p.y,rr*.78,ry*.78,0,0,Math.PI*2);ctx.stroke();
  for(let k=0;k<12;k++){
   const a=(k/12)*Math.PI*2+time*.45;
   const x1=p.x+Math.cos(a)*rr*.82,y1=p.y+Math.sin(a)*ry*.82;
   const x2=p.x+Math.cos(a)*rr*.98,y2=p.y+Math.sin(a)*ry*.98;
   ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
  }
  ctx.restore();
 }
 for(const s of slashes){
  const p=screenPos(s.x,s.y);ctx.save();ctx.globalAlpha=s.life/s.max;ctx.strokeStyle="#d6b5ff";ctx.lineWidth=5;ctx.shadowColor="#7d65ff";ctx.shadowBlur=14;
  ctx.beginPath();ctx.arc(p.x,p.y,23,-1.3,1.1);ctx.stroke();ctx.restore();
 }
 for(const pt of particles){
  const p=screenPos(pt.x,pt.y);ctx.save();ctx.globalAlpha=clamp(pt.life/pt.max,0,1);ctx.fillStyle=pt.color;ctx.shadowColor=pt.color;ctx.shadowBlur=8;
  ellipse(p.x,p.y,pt.size,pt.size,pt.color);ctx.restore();
 }
}
function tick(now){
 const dt=Math.min((now-last)/1000,.04);last=now;time+=dt;
 if(!paused&&!gameEnded){
  attackCooldown=Math.max(0,attackCooldown-dt);skillCooldown=Math.max(0,skillCooldown-dt);invuln=Math.max(0,invuln-dt);screenShake=Math.max(0,screenShake-dt);
  player.attack=Math.max(0,player.attack-dt);player.skillAnim=Math.max(0,player.skillAnim-dt);player.hit=Math.max(0,player.hit-dt);
  if(player.attackHitTimer>0&&!player.attackHitDone){
   player.attackHitTimer=Math.max(0,player.attackHitTimer-dt);
   if(player.attackHitTimer===0){
    player.attackHitDone=true;screenShake=Math.max(screenShake,.075);
    const target=player.attackTarget;
    if(target&&enemies.includes(target)&&Math.hypot(target.x-player.x,target.y-player.y)<3.25){
     damageEnemy(target,23*power);
     slashes.push({x:target.x,y:target.y,life:.30,max:.30});
     slashes.push({x:target.x+.18,y:target.y-.12,life:.20,max:.20,offset:12});
     addBurst(target.x,target.y,"#bd8cff",16,1.0);
    } else {
     const hx=player.x+player.faceX*.9,hy=player.y+player.faceY*.9;
     addBurst(hx,hy,"#8d83ff",11,.75);
     slashes.push({x:hx,y:hy,life:.24,max:.24});
     slashes.push({x:hx-.12,y:hy+.16,life:.16,max:.16,offset:10});
    }
   }
  }
  mp=Math.min(maxMp,mp+dt*2.1);
  let dx=joy.x+(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0);
  let dy=joy.y+(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);
  const len=Math.hypot(dx,dy);if(len>1){dx/=len;dy/=len;}
  player.moving=Math.abs(dx)+Math.abs(dy)>.05;
  if(player.moving){
   player.x+=dx*moveSpeed*dt;player.y+=dy*moveSpeed*dt;player.walk+=dt*8;
   player.faceX=dx;player.faceY=dy;
  } else player.walk+=dt*1.5;
  player.x=clamp(player.x,-30,30);player.y=clamp(player.y,-30,30);
  if(autoAttack&&attackCooldown<=0){const e=nearestEnemy();if(e&&Math.hypot(e.x-player.x,e.y-player.y)<2.75)attack();}
  for(const e of [...enemies]){
   const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy)||1;
   if(d>1.12){e.x+=dx/d*e.speed*dt;e.y+=dy/d*e.speed*dt;}
   else if(e.attack<=0){e.attack=1.05;if(invuln<=0){hp-=7;invuln=.48;player.hit=.26;player.walk+=.8;screenShake=Math.max(screenShake,.10);addBurst(player.x,player.y,"#ff4e68",10,.7);if(hp<=0){hp=0;endGame();}}}
   e.attack=Math.max(0,e.attack-dt);
  }
  spawnTimer+=dt;if(enemies.length<6&&spawnTimer>1.4){spawnEnemy();spawnTimer=0;}
  for(const p of particles){p.x+=p.vx*dt/55;p.y+=p.vy*dt/55;p.vy+=80*dt/55;p.life-=dt;}
  for(let i=particles.length-1;i>=0;i--)if(particles[i].life<=0)particles.splice(i,1);
  for(const a of runes)a.life-=dt;for(let i=runes.length-1;i>=0;i--)if(runes[i].life<=0)runes.splice(i,1);
  for(const a of slashes)a.life-=dt;for(let i=slashes.length-1;i>=0;i--)if(slashes[i].life<=0)slashes.splice(i,1);
  updateUI();
 }
 draw();requestAnimationFrame(tick);
}
updateUI();requestAnimationFrame(tick);
})();