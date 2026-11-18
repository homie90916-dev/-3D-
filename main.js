(() => {
"use strict";

// V3: 2D/2.5D isometric sprite-style prototype based on the user's supplied
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
function drawHalpas(x,y,scale=1,phase=0,faceX=0,faceY=-1,attack=0,hit=0){
 ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
 const bob=Math.sin(phase*6.5)*1.1;
 const capeWave=Math.sin(phase*2.7)*3.5 + Math.sin(phase*1.4)*1.8;
 const flame=Math.sin(phase*4.1)*1.6;

 // Ground shadow and the familiar blue transformation circle.
 ctx.save();ctx.globalAlpha=.3;ctx.shadowColor="#3c55ff";ctx.shadowBlur=24;
 ellipse(0,10,34,11,"#293fff");ctx.restore();
 drawAura(0,10,32,"#536cff",.92);

 // Purple/orange released-energy flames behind the body. These are aura tongues,
 // not wings: they rise and flare from the shoulders with irregular pointed tips.
 ctx.save();ctx.globalCompositeOperation="lighter";
 const auraGrad=ctx.createRadialGradient(0,-61,5,0,-54,54);
 auraGrad.addColorStop(0,"rgba(255,171,55,.48)");
 auraGrad.addColorStop(.38,"rgba(174,59,255,.27)");
 auraGrad.addColorStop(1,"rgba(65,31,150,0)");
 ellipse(0,-55,38,49,auraGrad);
 ctx.globalAlpha=.74;
 const energyFlames=[
  [[-23,-43],[-35,-62],[-32,-82],[-22,-68],[-18,-52]],
  [[-12,-51],[-20,-75],[-10,-91],[-5,-72],[-4,-53]],
  [[7,-53],[11,-76],[24,-91],[22,-69],[16,-49]],
  [[21,-44],[32,-63],[39,-78],[36,-56],[27,-43]]
 ];
 energyFlames.forEach((pts,i)=>{
  ctx.save();ctx.globalAlpha=.42+.12*Math.sin(phase*3+i);
  ctx.shadowColor=i%2?"#ff9b35":"#a54cff";ctx.shadowBlur=15;
  path(pts,i%2?"rgba(255,151,52,.45)":"rgba(151,69,255,.43)",i%2?"#ffbd64":"#c18aff",1.1);
  ctx.restore();
 });
 ctx.restore();

 // Heavy crimson mantle: anchored high on the left shoulder and sweeping down-left.
 // This deliberately follows the reference card's one-sided cape silhouette.
 const c=capeWave;
 const capeGrad=ctx.createLinearGradient(-39,-43,10,20);
 capeGrad.addColorStop(0,"#210711");capeGrad.addColorStop(.34,"#8d102b");
 capeGrad.addColorStop(.7,"#bd2341");capeGrad.addColorStop(1,"#3b0918");
 path([[-17,-48],[-31,-48],[-42,-35],[-48,-10],[-56,13],[-48,23],[-37,18],[-28,23],[-17,12],[-13,-10]],capeGrad,"#e4a34c",1.4);
 path([[-23,-43],[-34,-37],[-40,-13],[-49,14],[-40,18],[-31,11],[-24,16],[-18,6],[-17,-22]],"#a91634","#6f1025",.8);
 // Cloth folds, gold hem and wind-caught highlights.
 path([[-30,-37],[-33,-17+c],[-44,15+c]],null,"#ef5268",1.5);
 path([[-23,-34],[-25,-13+c],[-34,17+c]],null,"#5b0c22",1.7);
 path([[-17,-39],[-19,-15+c],[-23,10+c]],null,"#e74a62",1.1);
 path([[-48,14+c],[-40,20+c],[-31,15+c],[-24,19+c],[-17,10+c]],null,"#e9b85e",1.4);
 // Inner dark lining gives the cape weight.
 path([[-18,-42],[-26,-35],[-31,-12+c],[-27,12+c],[-19,4]],"rgba(31,5,19,.72)");

 // Back armor and waist silhouette.
 path([[-19,-35],[18,-35],[22,-5],[15,15],[-13,15],[-22,-4]],"#171018","#5b351f",1.3);
 path([[-17,-12],[-11,-17],[11,-17],[17,-10],[13,15],[7,23],[-9,23],[-16,14]],"#17131b","#b7792f",1.2);

 // Long, weighty legs and pointed gold-black greaves (less chibi proportions).
 path([[-14,-5],[-3,-5],[-5,22],[-10,31],[-20,28],[-19,18]],"#16131a","#8d592a",1.2);
 path([[3,-5],[15,-5],[19,17],[15,29],[5,31],[2,21]],"#100f17","#8d592a",1.2);
 path([[-21,21],[-7,22],[-7,32],[-25,34],[-29,29]],"#080a10","#e0a846",1.6);
 path([[6,22],[20,21],[27,28],[24,34],[6,33]],"#080a10","#e0a846",1.6);
 path([[-24,27],[-9,27],[-8,30],[-25,31]],"#bd7d29","#ffe19a",.8);
 path([[8,27],[23,27],[24,30],[8,30]],"#bd7d29","#ffe19a",.8);

 // Broad black-gold torso with layered, angular plate construction.
 const torso=ctx.createLinearGradient(-22,-43,22,16);
 torso.addColorStop(0,"#4b3422");torso.addColorStop(.2,"#19151a");
 torso.addColorStop(.58,"#090b12");torso.addColorStop(.82,"#302018");torso.addColorStop(1,"#09090e");
 path([[-19,-45],[-12,-53],[0,-56],[13,-52],[20,-43],[18,-15],[12,-2],[7,5],[-8,5],[-15,-4],[-20,-17]],torso,"#d59b42",2);
 // Outer gold bevel plates and central dark cuirass.
 path([[-16,-43],[-10,-49],[0,-52],[10,-49],[16,-42],[14,-17],[8,-7],[-8,-7],[-14,-17]],"#16121a","#f0bd58",1.5);
 path([[-11,-43],[-6,-47],[0,-48],[7,-46],[11,-41],[9,-19],[0,-13],[-9,-19]],"#21151b","#9a642d",1.1);
 path([[-7,-41],[0,-45],[7,-41],[6,-22],[0,-17],[-6,-22]],"#090d15","#d49a3e",1.1);
 // Raised chest ribs and angular gold filigree.
 path([[-14,-39],[-9,-30],[-5,-26],[0,-25]],null,"#e6ad4e",1.5);
 path([[14,-39],[9,-30],[5,-26],[0,-25]],null,"#e6ad4e",1.5);
 path([[-10,-18],[-5,-12],[0,-10],[5,-12],[10,-18]],null,"#c78b39",1.2);
 // Glowing magenta heart/core as seen on the card art.
 ctx.save();ctx.globalCompositeOperation="lighter";ctx.shadowColor="#ff3cbd";ctx.shadowBlur=13;
 path([[-4,-31],[0,-36],[5,-31],[3,-24],[0,-21],[-3,-25]],"#d62c8b","#ffb1e8",1.1);
 ellipse(0,-29,1.8,2.4,"#fff0fb");ctx.restore();

 // Massive flame-forged pauldrons: asymmetrical, broad and bright gold.
 const shoulderGrad=ctx.createLinearGradient(-30,-51,30,-27);
 shoulderGrad.addColorStop(0,"#fff0a0");shoulderGrad.addColorStop(.22,"#d98a25");
 shoulderGrad.addColorStop(.55,"#61351b");shoulderGrad.addColorStop(.82,"#e5a83e");shoulderGrad.addColorStop(1,"#3b2118");
 path([[-29,-39],[-31,-52],[-23,-61],[-15,-55],[-10,-43],[-15,-30],[-25,-28]],shoulderGrad,"#ffe28b",1.8);
 path([[15,-43],[20,-57],[29,-61],[35,-51],[32,-37],[25,-29],[16,-31]],shoulderGrad,"#ffe28b",1.8);
 path([[-28,-47],[-23,-56],[-18,-51],[-15,-42],[-23,-37]],"#f6bd4c","#fff0ad",1);
 path([[20,-44],[25,-55],[31,-51],[29,-40],[23,-36]],"#e8a33c","#fff0ad",1);
 // Flame-shaped upper spikes on the shoulders.
 path([[-26,-54],[-33,-68],[-20,-61],[-15,-51]],"#d77b25","#ffe7a0",1.2);
 path([[25,-55],[35,-68],[32,-53],[19,-49]],"#d77b25","#ffe7a0",1.2);

 // Armored arms, heavy gauntlets and glowing gold knuckle plates.
 path([[-25,-35],[-18,-33],[-20,-14],[-25,-10],[-30,-17]],"#17131a","#b77b31",1.2);
 path([[22,-34],[29,-32],[31,-15],[25,-10],[20,-17]],"#17131a","#b77b31",1.2);
 path([[-29,-21],[-20,-23],[-18,-14],[-27,-12]],"#b7772c","#ffe08a",1.2);
 path([[20,-22],[30,-21],[31,-12],[22,-12]],"#b7772c","#ffe08a",1.2);

 // Demonic head: dark mask, glowing eyes and a blazing gold crown of horns.
 const head=ctx.createRadialGradient(-3,-66,2,0,-64,17);
 head.addColorStop(0,"#4a2518");head.addColorStop(.52,"#171018");head.addColorStop(1,"#05070d");
 ellipse(0,-65+bob,13,16,head,"#d58d32",1.5);
 path([[-11,-69],[-9,-79],[-3,-75],[0,-82],[4,-75],[10,-80],[12,-68],[8,-56],[0,-53],[-9,-57]],"#151018","#f0b44a",1.5);
 // Face mask and jaw ridges.
 path([[-8,-67],[0,-72],[8,-67],[6,-59],[0,-55],[-6,-59]],"#070910","#8e5127",.8);
 path([[-6,-65],[-2,-67],[0,-64],[-4,-62]],"#ff8c35");
 path([[6,-65],[2,-67],[0,-64],[4,-62]],"#ff8c35");
 path([[-5,-58],[0,-61],[5,-58],[2,-55],[-2,-55]],"#33202a","#d38b37",.7);
 // Large crown horns: flame-like, branching and asymmetrical rather than a simple pair.
 path([[-9,-69],[-20,-83],[-18,-67],[-12,-60]],"#c87924","#ffe7a0",1.4);
 path([[8,-69],[19,-86],[17,-67],[11,-59]],"#d98a2d","#fff0ae",1.4);
 path([[-17,-78],[-24,-87],[-20,-73]],"#f4b747","#fff0a0",1);
 path([[17,-80],[25,-88],[20,-73]],"#f4b747","#fff0a0",1);
 path([[-3,-76],[0,-88],[4,-76],[2,-70]],"#f6b83f","#fff0b2",1.2);
 // Fiery rim light around the crown.
 ctx.save();ctx.globalCompositeOperation="lighter";ctx.globalAlpha=.48;
 ctx.strokeStyle="#ff9a35";ctx.shadowColor="#ff6a1a";ctx.shadowBlur=12;ctx.lineWidth=2;
 ctx.beginPath();ctx.arc(0,-66,16,Math.PI*1.08,Math.PI*1.9);ctx.stroke();ctx.restore();

 // Violet greatsword held to the right; retain the established game identity.
 ctx.save();ctx.translate(24,-30);ctx.rotate(-.24+attack*.42);
 path([[-3,0],[3,0],[3,20],[-3,20]],"#3b211b","#e0a34a",1);
 path([[-8,0],[8,0],[6,4],[-6,4]],"#c38a36","#ffe6a0",1);
 path([[-4,-2],[-8,-24],[0,-46],[8,-24],[4,-2]],"#24103f","#d6a4ff",1.8);
 path([[-2,-5],[-5,-24],[0,-40],[5,-24],[2,-5]],"#8353d8","#f0d5ff",1);
 path([[0,-39],[0,-7]],null,"#fff0ff",1.2);
 ctx.save();ctx.globalAlpha=.72;ctx.shadowColor="#b85aff";ctx.shadowBlur=17;
 ctx.strokeStyle="#d7b5ff";ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(-6,-23);ctx.lineTo(0,-43);ctx.lineTo(6,-23);ctx.stroke();ctx.restore();
 ellipse(0,19,2.4,2.4,"#f4c45f","#fff0a0",.7);
 ctx.restore();

 // Short purple energy arc during attacks, separate from the body's aura.
 if(attack>.05){
  ctx.save();ctx.globalAlpha=.38+attack*.32;ctx.strokeStyle="#c18aff";
  ctx.shadowColor="#b24dff";ctx.shadowBlur=19;ctx.lineWidth=3.2;
  ctx.beginPath();ctx.arc(7,-43,43,-1.08,.42);ctx.stroke();ctx.restore();
 }
 // Gold embers and violet sparks around the released form.
 ctx.save();ctx.globalCompositeOperation="lighter";
 for(let i=0;i<7;i++){
  const a=phase*1.35+i*0.91;
  const sx=Math.cos(a)*(27+(i%3)*4), sy=-52+Math.sin(a)*34;
  ctx.globalAlpha=.28+.28*Math.sin(phase*3+i);
  ctx.fillStyle=i%2?"#ffad48":"#bd79ff";ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=8;
  ellipse(sx,sy,1.2+(i%2)*.5,1.8,ctx.fillStyle);
 }
 ctx.restore();
 if(hit>0){
  ctx.save();ctx.globalAlpha=clamp(hit/.2,0,1)*.72;ctx.strokeStyle="#ff5268";
  ctx.shadowColor="#ff334f";ctx.shadowBlur=16;ctx.lineWidth=2.2;
  ctx.beginPath();ctx.ellipse(0,-35,35,54,0,0,Math.PI*2);ctx.stroke();ctx.restore();
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
  drawHalpas(p.x,p.y,1.38,player.walk+time,player.faceX,player.faceY,player.attack>0?1:0,player.hit);
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
  player.attack=Math.max(0,player.attack-dt);player.hit=Math.max(0,player.hit-dt);mp=Math.min(maxMp,mp+dt*2.1);
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