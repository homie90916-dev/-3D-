(() => {
"use strict";

// V3: 2D/2.5D isometric sprite-style prototype based on the user's supplied
// gameplay video. Original canvas artwork; not extracted game assets.
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
addEventListener("resize",resize); resize();

const ui={
 hpBar:document.querySelector("#hpBar"),mpBar:document.querySelector("#mpBar"),xpBar:document.querySelector("#xpBar"),
 hpText:document.querySelector("#hpText"),mpText:document.querySelector("#mpText"),levelText:document.querySelector("#levelText"),
 kills:document.querySelector("#kills"),wave:document.querySelector("#wave"),message:document.querySelector("#message"),
 levelUp:document.querySelector("#levelUp"),gameOver:document.querySelector("#gameOver")
};
let hp=100,maxHp=100,mp=60,maxMp=60,xp=0,level=1,kills=0,wave=1,power=1,moveSpeed=3.2;
let autoAttack=true,attackCooldown=0,skillCooldown=0,invuln=0,paused=false,gameEnded=false;
const player={x:0,y:0,faceX:0,faceY:-1,walk:0,attack:0,hit:0};
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
function drawHalpas(x,y,scale=1,phase=0,faceX=0,faceY=-1,attack=0){
 ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
 const bob=Math.sin(phase*7)*1.35;
 const sway=Math.sin(phase*3.1)*4.4 + Math.sin(phase*1.7)*1.4;

 // Ground aura and soft cast shadow.
 ctx.save();ctx.globalAlpha=.25;ctx.shadowColor="#4268ff";ctx.shadowBlur=24;
 ellipse(0,7,29,10,"#344cff");ctx.restore();
 drawAura(0,8,29,"#536cff",.95);

 // No dragon wings: keep the original-inspired cape silhouette clear.
 // Long crimson mantle, layered with dark inner fold and gold hem.
 path([[-10,-34],[10,-34],[15,-17+sway],[20,8+sway], [7,13+sway],[-7,12-sway],[-20,7-sway],[-15,-17]],
      "#360d20","#b33c55",1.5);
 path([[-7,-32],[7,-32],[11,-16+sway],[13,5+sway],[4,9+sway],[-5,8-sway],[-13,4-sway],[-10,-16]],
      "#9b1938","#e05a70",1);
 path([[-13,-15],[-9,-10+sway],[0,-7+sway],[9,-10+sway],[14,-15]],
      null,"#e3b65d",1.2);
 // Layered fabric folds and a soft red highlight make the cape read as cloth.
 path([[-10,-27],[-6,-16+sway],[-8,5+sway]],null,"#d34d68",1.1);
 path([[1,-28],[3,-14+sway],[5,8+sway]],null,"#e45b70",1.0);
 path([[8,-25],[10,-13+sway],[12,4+sway]],null,"#6c142d",1.2);
 // Soft central fabric sheen and darker side folds add cloth depth.
 ctx.save();ctx.globalAlpha=.34;
 const cloth=ctx.createLinearGradient(-15,-20,15,5+sway);
 cloth.addColorStop(0,"#4b1028");cloth.addColorStop(.48,"#f06a7b");cloth.addColorStop(1,"#4a0c25");
 path([[-8,-29],[0,-31],[8,-29],[12,5+sway],[4,9+sway],[-5,8-sway],[-13,4-sway]],cloth);
 ctx.restore();
 // Cloak center seam and clasp.
 ctx.strokeStyle="#e4b75f";ctx.lineWidth=.9;ctx.beginPath();ctx.moveTo(0,-27);ctx.lineTo(0,7+sway);ctx.stroke();
 ellipse(0,-33,4.2,3.3,"#f4d27b","#79501f",1);

 // Armored legs and heavy boots with gold toe plates.
 path([[-11,-8],[-2,-8],[-3,10],[-9,15],[-15,11]],"#151927","#7861b0",1.2);
 path([[2,-8],[11,-8],[15,11],[8,15],[3,10]],"#151927","#7861b0",1.2);
 path([[-15,9],[-5,9],[-4,17],[-17,18]],"#090d17","#d2a34f",1.4);
 path([[5,9],[15,9],[18,17],[5,18]],"#090d17","#d2a34f",1.4);
 path([[-13,11],[-6,11],[-6,14],[-14,14]],"#b88a3e");
 path([[7,11],[14,11],[15,14],[7,14]],"#b88a3e");

 // Torso silhouette and layered breastplate.
 path([[-15,-33],[-11,-40],[0,-43],[11,-40],[15,-33],[13,-10],[8,-3],[-8,-3],[-13,-10]],
      "#101522","#8d70ed",1.8);
 path([[-11,-32],[-7,-38],[0,-40],[7,-38],[11,-32],[9,-12],[0,-7],[-9,-12]],
      "#242039","#d4a44e",1.1);
 path([[-7,-32],[0,-37],[7,-32],[6,-18],[0,-13],[-6,-18]],
      "#171629","#8565d8",1.1);
 path([[-4,-31],[0,-34],[4,-31],[3,-21],[-3,-21]],"#4a3268","#c7a0ff",.8);
 // Fine gold filigree lines on the breastplate.
 ctx.strokeStyle="#d8b05d";ctx.lineWidth=.8;
 ctx.beginPath();ctx.moveTo(-8,-24);ctx.lineTo(-5,-20);ctx.lineTo(-2,-19);
 ctx.moveTo(8,-24);ctx.lineTo(5,-20);ctx.lineTo(2,-19);ctx.stroke();
 // Breastplate highlights and center ruby.
 ctx.strokeStyle="#f0c96b";ctx.lineWidth=1;
 ctx.beginPath();ctx.moveTo(-8,-35);ctx.lineTo(-4,-28);ctx.lineTo(0,-26);ctx.lineTo(4,-28);ctx.lineTo(8,-35);ctx.stroke();
 path([[-2,-25],[0,-28],[2,-25],[0,-21]],"#d84d6d","#ffd0df",.6);

 // Shoulder pauldrons: layered gold rims over dark steel.
 ellipse(-14,-31,7,6,"#282337","#e2b65d",1.6);
 ellipse(14,-31,7,6,"#282337","#e2b65d",1.6);
 path([[-20,-32],[-18,-42],[-12,-39],[-9,-32],[-14,-27]],"#a77732","#f6d987",1.1);
 path([[20,-32],[18,-42],[12,-39],[9,-32],[14,-27]],"#a77732","#f6d987",1.1);
 path([[-18,-34],[-16,-39],[-13,-36]],"#f8dc91");
 path([[18,-34],[16,-39],[13,-36]],"#f8dc91");

 // Forearms and gauntlets.
 path([[-18,-27],[-14,-25],[-15,-12],[-20,-11],[-22,-18]],"#171b2b","#bd8c43",1.2);
 path([[18,-27],[14,-25],[15,-12],[20,-11],[22,-18]],"#171b2b","#bd8c43",1.2);
 path([[-21,-17],[-15,-17],[-14,-12],[-21,-11]],"#c18b3b","#f4d37a",.8);
 path([[21,-17],[15,-17],[14,-12],[21,-11]],"#c18b3b","#f4d37a",.8);

 // Horned dragon helm with a strong faceplate silhouette.
 ellipse(0,-46+bob,10.2,10.8,"#171b2b","#d3a34e",1.4);
 path([[-10,-48],[-8,-57],[-4,-52],[0,-61],[4,-52],[8,-57],[10,-48],[7,-39],[-7,-39]],
      "#9d7133","#f5d47d",1.5);
 path([[-7,-47],[-5,-52],[0,-49],[5,-52],[7,-47],[5,-41],[-5,-41]],
      "#25233d","#e3b75f",1);
 path([[-5,-45],[0,-48],[5,-45],[3,-40],[-3,-40]],"#111a31","#627cff",.8);
 roundedRect(-4,-45+bob,8,2.2,1,"#5d9aff");
 // Crown horns, gold inner edge.
 path([[-7,-51],[-15,-63],[-12,-51],[-5,-48]],"#b78337","#ffe39a",1.2);
 path([[7,-51],[15,-63],[12,-51],[5,-48]],"#b78337","#ffe39a",1.2);
 path([[-13,-58],[-12,-52],[-9,-51]],null,"#fff0bd",.8);
 path([[13,-58],[12,-52],[9,-51]],null,"#fff0bd",.8);

 // Oversized violet greatsword, with gem core, crossguard and pommel.
 ctx.save();ctx.translate(18,-27);ctx.rotate(-.38+attack*.38);
 path([[-2,1],[2,1],[2,16],[-2,16]],"#4d2b20","#e3b65b",1);
 path([[-6,1],[6,1],[5,4],[-5,4]],"#d7a64e","#fff0a0",.8);
 path([[-3,-1],[-7,-20],[0,-34],[7,-20],[3,-1]],"#31145f","#8b6cff",1.5);
 path([[-1,-4],[-4,-20],[0,-29],[4,-20],[1,-4]],"#987cff","#d8c8ff",.8);
 path([[0,-28],[0,-5]],null,"#e5d7ff",.8);
 // Crystal edge glow.
 ctx.save();ctx.globalAlpha=.62;ctx.shadowColor="#a76aff";ctx.shadowBlur=12;
 ctx.strokeStyle="#c8a7ff";ctx.lineWidth=1.5;
 ctx.beginPath();ctx.moveTo(-5,-19);ctx.lineTo(0,-31);ctx.lineTo(5,-19);ctx.stroke();
 ctx.restore();
 ellipse(0,15,2.2,2.2,"#d9b65c","#fff0b0",.5);
 ctx.restore();

 // A brief violet sweep appears only during the attack animation.
 if(attack>.05){
  ctx.save();ctx.globalAlpha=.35+attack*.28;ctx.strokeStyle="#c18aff";
  ctx.shadowColor="#a34dff";ctx.shadowBlur=17;ctx.lineWidth=3;
  ctx.beginPath();ctx.arc(7,-26,31,-1.12,.42);ctx.stroke();
  ctx.restore();
 }

 // Animated glints on metal and a cool blue edge aura.
 ctx.save();ctx.globalCompositeOperation="lighter";ctx.globalAlpha=.22+.06*Math.sin(phase*5);
 ctx.strokeStyle="#638cff";ctx.lineWidth=4;ctx.shadowColor="#4a66ff";ctx.shadowBlur=15;
 ctx.beginPath();ctx.ellipse(0,-28,20,34,0,0,Math.PI*2);ctx.stroke();
 ctx.restore();
 // Tiny moving sparkles around the armor.
 for(let i=0;i<3;i++){
  const a=phase*1.8+i*2.1, sx=Math.cos(a)*24, sy=-28+Math.sin(a)*28;
  ctx.globalAlpha=.45+.35*Math.sin(phase*4+i);
  ellipse(sx,sy,1.1,1.1,"#9ab8ff");
 }
 // Brief warm glints travel across the gold trim during idle animation.
 ctx.globalAlpha=.18+.12*Math.sin(phase*2.2);
 ctx.strokeStyle="#ffe3a0";ctx.lineWidth=.9;
 ctx.beginPath();ctx.moveTo(-17,-33);ctx.lineTo(-12,-29);ctx.moveTo(17,-33);ctx.lineTo(12,-29);ctx.stroke();
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
 attackCooldown=.52;player.attack=.24;
 const e=nearestEnemy();
 if(e&&Math.hypot(e.x-player.x,e.y-player.y)<2.6){
  damageEnemy(e,23*power);
  const dx=e.x-player.x,dy=e.y-player.y,l=Math.hypot(dx,dy)||1;player.faceX=dx/l;player.faceY=dy/l;
 } else addBurst(player.x+player.faceX*.8,player.y+player.faceY*.8,"#777bff",9,.65);
 slashes.push({x:player.x+player.faceX*.5,y:player.y+player.faceY*.5,life:.22,max:.22});
}
function castSkill(){
 if(gameEnded||paused||skillCooldown>0||mp<25)return;
 mp-=25;skillCooldown=5;
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
function endGame(){gameEnded=true;ui.gameOver.classList.remove("hidden");document.querySelector("#finalStats").textContent=`等級 ${level} · 擊殺 ${kills} 隻怪物 · 抵擋 ${wave} 波`;}

function draw(){
 drawFloor();
 // Sort actors by isometric depth for simple 2.5D overlap.
 const actors=enemies.map(e=>({y:e.x+e.y,draw:()=>drawEnemy(e)}));
 actors.push({y:player.x+player.y,draw:()=>{
  const p=screenPos(player.x,player.y);
  drawHalpas(p.x,p.y,1.38,player.walk+time,player.faceX,player.faceY,player.attack>0?1:0);
 }});
 actors.sort((a,b)=>a.y-b.y);for(const a of actors)a.draw();

 // Skill circles, sword slashes, floating particles.
 for(const r of runes){
  const p=screenPos(r.x,r.y);const q=1-r.life/r.max;
  ctx.save();ctx.globalAlpha=1-q;ctx.strokeStyle="#bd78ff";ctx.shadowColor="#a64dff";ctx.shadowBlur=18;ctx.lineWidth=3;
  ctx.beginPath();ctx.ellipse(p.x,p.y,24+q*135,(24+q*135)*.42,0,0,Math.PI*2);ctx.stroke();ctx.restore();
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
  attackCooldown=Math.max(0,attackCooldown-dt);skillCooldown=Math.max(0,skillCooldown-dt);invuln=Math.max(0,invuln-dt);
  player.attack=Math.max(0,player.attack-dt);mp=Math.min(maxMp,mp+dt*2.1);
  let dx=joy.x+(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0);
  let dy=joy.y+(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);
  const len=Math.hypot(dx,dy);if(len>1){dx/=len;dy/=len;}
  if(Math.abs(dx)+Math.abs(dy)>.05){
   player.x+=dx*moveSpeed*dt;player.y+=dy*moveSpeed*dt;player.walk+=dt*8;
   player.faceX=dx;player.faceY=dy;
  } else player.walk+=dt*1.5;
  player.x=clamp(player.x,-30,30);player.y=clamp(player.y,-30,30);
  if(autoAttack&&attackCooldown<=0){const e=nearestEnemy();if(e&&Math.hypot(e.x-player.x,e.y-player.y)<2.55)attack();}
  for(const e of [...enemies]){
   const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy)||1;
   if(d>.72){e.x+=dx/d*e.speed*dt;e.y+=dy/d*e.speed*dt;}
   else if(e.attack<=0){e.attack=1.05;if(invuln<=0){hp-=7;invuln=.48;player.hit=.2;addBurst(player.x,player.y,"#ff4e68",7,.6);if(hp<=0){hp=0;endGame();}}}
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