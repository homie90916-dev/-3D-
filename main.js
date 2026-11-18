(() => {
"use strict";

// V4: 2D/2.5D isometric sprite-style prototype based on the user's supplied
// gameplay video. Original canvas artwork; not extracted game assets.
document.addEventListener("contextmenu",e=>e.preventDefault());
document.addEventListener("selectstart",e=>e.preventDefault());
const canvas = document.getElementById("world");
const ctx = canvas.getContext("2d", { alpha: false });
const mini = document.getElementById("minimap");
const mctx = mini ? mini.getContext("2d") : null;
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
 hpBar:document.querySelector("#hpBar"),mpBar:document.querySelector("#mpBar"),xpBar:document.querySelector("#xpBar"),xpText:document.querySelector("#xpText"),footerXp:document.querySelector("#footerXp"),footerXpBar:document.querySelector("#footerXpBar"),
 hpText:document.querySelector("#hpText"),mpText:document.querySelector("#mpText"),levelText:document.querySelector("#levelText"),
 kills:document.querySelector("#kills"),wave:document.querySelector("#wave"),message:document.querySelector("#message"),
 levelUp:document.querySelector("#levelUp"),gameOver:document.querySelector("#gameOver")
};
let hp=100,maxHp=100,mp=60,maxMp=60,xp=0,level=1,kills=0,wave=1,power=1,moveSpeed=3.2;
let autoAttack=true,attackCooldown=0,skillCooldown=0,invuln=0,paused=false,gameEnded=false;
const player={x:0,y:0,faceX:.7071,faceY:.7071,facingSector:2,walk:0,attack:0,attackHitTimer:0,attackTarget:null,attackHitDone:false,skillAnim:0,hit:0,moving:false,deadAt:0};
let screenShake=0;
const enemies=[],particles=[],slashes=[],runes=[],damageTexts=[];
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
 if(ui.xpText)ui.xpText.textContent=`${xp.toFixed(1)}%`;
 if(ui.footerXp)ui.footerXp.textContent=`${xp.toFixed(2)}%`;
 if(ui.footerXpBar)ui.footerXpBar.style.width=`${xp}%`;
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
 ctx.fillStyle="#242321";ctx.fillRect(0,0,W,H);
 const glow=ctx.createRadialGradient(W*.16,H*.35,1,W*.16,H*.35,Math.max(100,W*.25));
 glow.addColorStop(0,"rgba(255,125,45,.13)");glow.addColorStop(1,"rgba(255,125,45,0)");
 ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
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
 // Small broken-stone seams keep the floor from reading as a clean grid.
 ctx.save();ctx.globalAlpha=.16;ctx.strokeStyle="#b5a28b";ctx.lineWidth=.8;
 for(let i=0;i<22;i++){const x=(i*131)%W,y=(i*197)%H;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+6+(i%4)*3,y+4);ctx.lineTo(x+11,y+12);ctx.stroke();}
 ctx.restore();
 // Soft edge vignette and ambient pools of warm/cool light.
 const grd=ctx.createRadialGradient(W*.5,H*.48,30,W*.5,H*.48,Math.max(W,H)*.78);
 grd.addColorStop(0,"rgba(0,0,0,0)");grd.addColorStop(1,"rgba(0,0,0,.58)");
 ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);
}
function drawRuins(){
 const items=[{x:W*.08,y:H*.38,t:"banner"},{x:W*.86,y:H*.42,t:"fire"},{x:W*.80,y:H*.27,t:"pillar"},{x:W*.14,y:H*.72,t:"wall"}];
 for(const o of items){ctx.save();ctx.translate(o.x,o.y);
  if(o.t==="banner"){
   ellipse(0,7,13,6,"#05050599");ctx.strokeStyle="#9b876a";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,-58);ctx.lineTo(0,4);ctx.stroke();
   path([[-2,-53],[23,-48],[20,-10],[7,-17],[-1,-11]],"#671e2b","#c28a65",1);
   ctx.strokeStyle="#d7ae7a88";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(5,-45);ctx.lineTo(17,-42);ctx.lineTo(14,-21);ctx.stroke();
  }else if(o.t==="fire"){
   ellipse(0,6,20,7,"#05050599");path([[-16,-3],[-12,-16],[12,-16],[16,-3]],"#292522","#a28b6a",1.2);
   ctx.save();ctx.globalCompositeOperation="lighter";ctx.shadowColor="#ff7a25";ctx.shadowBlur=20;
   path([[-8,-15],[-7,-29],[0,-44],[5,-28],[10,-15]],"#ff8d32","#ffd27a",1);
   path([[-3,-15],[-2,-27],[2,-35],[5,-17]],"#fff0b0");ctx.restore();
  }else if(o.t==="pillar"){
   ellipse(0,6,19,7,"#05050599");path([[-15,-3],[-13,-42],[0,-51],[14,-42],[15,-3],[0,4]],"#3d3732","#9a8468",1);
   path([[-13,-42],[0,-51],[14,-42],[0,-34]],"#6d5c4b","#c1a17b",1);
   ctx.strokeStyle="#b09a7c55";ctx.beginPath();ctx.moveTo(-7,-32);ctx.lineTo(-5,-9);ctx.moveTo(7,-35);ctx.lineTo(10,-12);ctx.stroke();
  }else{
   ellipse(0,7,35,8,"#05050599");for(let i=0;i<4;i++)path([[-36+i*18,-3],[-33+i*18,-25],[-19+i*18,-32],[-4+i*18,-23],[-2+i*18,-3]],"#51473e","#a08a6d",1);
  }
  ctx.restore();
 }
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
// FINAL 7.0: hybrid directional animation system.
// - Existing 4x4 sheet supplies idle/attack/skill poses and the original appearance.
// - New 4x8 sheet supplies eight genuinely different running views.
// - Canvas transforms add body-weight, lean and foot timing while the ground aura stays planted.
const halpasSheet = new Image();
halpasSheet.src = "./halpas_animated_sprites.png?v=final-8-0";
let halpasSheetReady = false;
halpasSheet.onload = () => { halpasSheetReady = true; };
const halpasRunSheet = new Image();
halpasRunSheet.src = "./halpas_directional_run.png?v=final-8-0";
let halpasRunReady = false;
halpasRunSheet.onload = () => { halpasRunReady = true; };

// Screen-space octants, clockwise from screen-right. The generated atlas rows
// are ordered front, front-right, right, back-right, back, back-left, left, front-left.
const RUN_ROW_FOR_SECTOR = [2,1,0,7,6,5,4,3];
function sectorFromWorldDirection(x,y){
 const d=iso(x,y);
 const a=Math.atan2(d.y,d.x);
 return ((Math.round(a/(Math.PI/4))%8)+8)%8;
}
function setFacing(x,y){
 const l=Math.hypot(x,y)||1;
 player.faceX=x/l; player.faceY=y/l;
 player.facingSector=sectorFromWorldDirection(player.faceX,player.faceY);
}
function drawHalpas(x,y,scale=1,phase=0,faceX=0,faceY=-1,attack=0,hit=0,moving=false,skill=0,dead=0){
 ctx.save();
 ctx.translate(x,y);
 const sector=player.facingSector;
 const runRow=RUN_ROW_FOR_SECTOR[sector]??0;
 // The new atlas contains full, broad strides; 6 frames/sec gives a deliberate
 // armored run cadence instead of the old rapid shuffle.
 const runFrame=moving?Math.floor(phase*.75)%4:0;
 const idleFrame=0;
 const attackProgress=attack>0?clamp(1-attack/.68,0,1):0;
 const skillProgress=skill>0?clamp(1-skill/1.12,0,1):0;
 const runBob=moving?([0,1.6,0,-1.6][runFrame]):Math.sin(time*1.7)*.85;
 const strideLean=moving?([-.045,.015,.045,-.015][runFrame]):0;
 const bodySway=moving?Math.sin(phase*.38)*.018:Math.sin(time*.8)*.006;
 const hitFlash=hit>0;

 // The aura/shadow is rendered independently from the character rig and remains
 // locked to the ground plane (no vertical bounce).
 ctx.save();
 ctx.globalAlpha=.42;ctx.shadowColor="#293fff";ctx.shadowBlur=24;
 ellipse(0,9,35,11,"#202d88");ctx.restore();
 drawAura(0,9,38,"#536cff",.94);

 const drawFrame=(img,cols,rows,col,row,drawW,drawH,dy)=>{
  const cw=img.naturalWidth/cols,ch=img.naturalHeight/rows;
  ctx.drawImage(img,col*cw,row*ch,cw,ch,-drawW/2,-drawH+8+dy,drawW,drawH);
 };
 const runCellW=halpasRunReady?halpasRunSheet.naturalWidth/4:0;
 const runCellH=halpasRunReady?halpasRunSheet.naturalHeight/8:0;
 const oldCellW=halpasSheetReady?halpasSheet.naturalWidth/4:0;
 const oldCellH=halpasSheetReady?halpasSheet.naturalHeight/4:0;
 const cellRatio=halpasRunReady?runCellW/runCellH:(halpasSheetReady?oldCellW/oldCellH:1);
 const h=218*scale,w=h*cellRatio;

 ctx.save();
 ctx.translate(0,-runBob+dead*17);
 ctx.rotate(dead*.24+strideLean+bodySway);
 ctx.scale(1,1+(moving?Math.sin(phase*.75)*.012:0));
 ctx.globalAlpha*=1-dead*.52;
 if(hitFlash){ctx.globalAlpha=.82;ctx.filter="brightness(1.32) saturate(1.12)";}

 if(skill>0 && halpasSheetReady){
  // Original burst animation remains intact.
  const frame=skillProgress<.18?0:skillProgress<.40?1:skillProgress<.74?2:3;
  drawFrame(halpasSheet,4,4,frame,3,h,h,0);
 } else if(attack>0 && halpasRunReady){
  // Keep the correct eight-direction body view; the sword arm is a separate
  // 2D joint rig animated over this directional base pose.
  drawFrame(halpasRunSheet,4,8,0,runRow,w,h,0);
 } else if(attack>0 && halpasSheetReady){
  const frame=attackProgress<.20?0:attackProgress<.44?1:attackProgress<.72?2:3;
  const screenFacing=iso(faceX,faceY);
  ctx.save();if(screenFacing.x<-.18)ctx.scale(-1,1);
  drawFrame(halpasSheet,4,4,frame,2,h,h,0);ctx.restore();
 } else if(halpasRunReady){
  // Direction-specific running frames. When stationary, frame zero is held and
  // a very small breathing/sway transform creates a living idle silhouette.
  drawFrame(halpasRunSheet,4,8,moving?runFrame:idleFrame,runRow,w,h,0);
 } else if(halpasSheetReady){
  // Network/loading fallback: keep the prior sprite available.
  const frame=moving?Math.floor(phase*.75)%4:Math.floor(time*1.65)%4;
  drawFrame(halpasSheet,4,4,frame,moving?1:0,h,h,0);
 } else {
  ctx.save();ctx.globalAlpha=.65;ellipse(0,-76,24,52,"#241b35","#dca34d",2);ctx.restore();
 }
 ctx.restore();

 // 2D skeletal weapon rig: shoulder -> forearm -> hand -> greatsword pivot.
 // This is animated independently from the directional body frames.
 if(attack>0){
  const facing=iso(faceX,faceY),facingAngle=Math.atan2(facing.y,facing.x);
  const side=facing.x<-.18?-1:1;
  const swing=attackProgress<.24?-.95+(attackProgress/.24)*.22:
              attackProgress<.66?-.73+((attackProgress-.24)/.42)*2.18:
              1.45-((attackProgress-.66)/.34)*.72;
  ctx.save();ctx.scale(scale,scale);
  const shoulderX=side*17, shoulderY=-127;
  ctx.translate(shoulderX,shoulderY);
  // Upper arm and forearm are drawn as linked articulated segments.
  ctx.lineCap="round";ctx.lineJoin="round";
  ctx.strokeStyle="#20172a";ctx.lineWidth=12;
  ctx.beginPath();ctx.moveTo(-side*4,-2);ctx.lineTo(side*7,13);ctx.stroke();
  ctx.strokeStyle="#d99b35";ctx.lineWidth=2.2;
  ctx.beginPath();ctx.moveTo(-side*4,-2);ctx.lineTo(side*7,13);ctx.stroke();
  ctx.fillStyle="#171320";ctx.strokeStyle="#f4bd58";ctx.lineWidth=2;
  ctx.beginPath();ctx.roundRect(side*1,7,13,15,3);ctx.fill();ctx.stroke();
  // Hand pivot and blade rotate toward the last movement/attack direction.
  ctx.translate(side*8,18);ctx.rotate(facingAngle+Math.PI/2+swing);
  ctx.save();ctx.shadowColor="#9d55ff";ctx.shadowBlur=17;
  const blade=ctx.createLinearGradient(-7,0,7,-66);
  blade.addColorStop(0,"#44217f");blade.addColorStop(.48,"#bd8bff");blade.addColorStop(1,"#f2ddff");
  path([[-5,-5],[-7,-17],[-3,-58],[0,-72],[4,-57],[7,-17],[5,-5]],blade,"#e4c5ff",1.5);
  ctx.restore();
  // Gold crossguard, grip and pommel.
  path([[-15,-7],[15,-7],[12,-2],[-12,-2]],"#d99a35","#ffe29a",1.2);
  roundedRect(-2,-1,4,14,1,"#4c2a24","#dca34b",1);
  ellipse(0,14,4,4,"#e9ad45","#fff0b2",1);
  // Directional arc follows the same facing vector as the blade.
  ctx.save();ctx.rotate(-swing*.45);ctx.globalAlpha=.25+.48*Math.sin(attackProgress*Math.PI);
  ctx.strokeStyle="#d9b4ff";ctx.shadowColor="#9c5aff";ctx.shadowBlur=17;ctx.lineWidth=5;
  ctx.beginPath();ctx.arc(0,-24,67,-1.05,.72);ctx.stroke();ctx.restore();
  ctx.restore();
 }

 // Rig-style motion accents: the cape and weight are emphasized during a run.
 // The cape's large folds are animated in the authored frame sequence; this
 // subtle trailing ribbon is an additional independent motion layer.
 if(moving && skill<=0 && attack<=0){
  const flutter=Math.sin(phase*.75)*5.2;
  ctx.save();ctx.globalAlpha=.16;ctx.lineWidth=2.2;ctx.strokeStyle="#e14b73";
  ctx.shadowColor="#d82b63";ctx.shadowBlur=8;
  ctx.beginPath();ctx.moveTo(-15,-125);ctx.quadraticCurveTo(-30-flutter,-88,-23-flutter,-48);ctx.stroke();
  ctx.beginPath();ctx.moveTo(-11,-116);ctx.quadraticCurveTo(-23-flutter,-78,-16-flutter,-43);ctx.stroke();
  ctx.restore();
 }

 // Dust puffs reinforce the weight of the boots without moving the ground ring.
 if(moving && skill<=0 && attack<=0){
  const pulse=(Math.sin(phase*.75*Math.PI*2)+1)*.5;
  ctx.save();ctx.globalAlpha=.10+.09*pulse;ctx.fillStyle="#a99aff";
  ctx.shadowColor="#8d7bff";ctx.shadowBlur=8;
  ellipse(-11,5,4+2*pulse,1.8,"rgba(164,145,255,.24)");
  ellipse(10,6,3+2*(1-pulse),1.5,"rgba(164,145,255,.20)");ctx.restore();
 }
 // Orbiting sparks are deliberately subtle so they do not obscure the silhouette.
 ctx.save();ctx.globalCompositeOperation="lighter";
 for(let i=0;i<5;i++){
  const a=phase*1.25+i*1.18;
  const sx=Math.cos(a)*(31+(i%3)*4),sy=-67+Math.sin(a)*37;
  ctx.globalAlpha=.13+.15*Math.sin(phase*3+i);
  ctx.fillStyle=i%2?"#ffad48":"#bd79ff";ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=7;
  ellipse(sx,sy,1.2,1.6,ctx.fillStyle);
 }
 ctx.restore();
 if(attack>.05){
  const sd=iso(faceX,faceY),angle=Math.atan2(sd.y,sd.x);
  ctx.save();ctx.translate(0,-92);ctx.rotate(angle-Math.PI/2);
  ctx.globalAlpha=.25+attack*.2;ctx.strokeStyle="#c18aff";
  ctx.shadowColor="#b24dff";ctx.shadowBlur=14;ctx.lineWidth=3;
  ctx.beginPath();ctx.arc(18,0,48,-1.0,.4);ctx.stroke();ctx.restore();
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
 const p=screenPos(e.x,e.y),bob=Math.sin(time*5.2+e.phase)*2.0;
 ctx.save();ctx.translate(p.x,p.y);
 ctx.save();ctx.globalAlpha=.42;ctx.shadowColor="#e23b62";ctx.shadowBlur=10;ellipse(0,8,16,6,"rgba(0,0,0,.62)");ctx.restore();
 if(e.kind==="knight"){
  path([[-12,-7],[-13,-26],[-8,-38],[8,-38],[13,-25],[12,-6],[5,3],[-6,3]],"#39343b","#b28a76",1.4);
  path([[-11,-30],[-17,-43],[-4,-37],[0,-41],[6,-37],[17,-43],[11,-29]],"#8a7770","#d0b49a",1.2);
  ellipse(0,-37+bob,10,10,"#514044","#d7b5a0",1);
  roundedRect(-5,-39+bob,10,3,1,"#ff8b63");
  path([[-14,-20],[-23,-13],[-18,-7],[-10,-13]],"#4b4144","#b78c77",1);
  path([[14,-20],[23,-13],[18,-7],[10,-13]],"#4b4144","#b78c77",1);
 }else if(e.kind==="skeleton"){
  path([[-9,-5],[-9,-24],[-5,-31],[5,-31],[9,-24],[9,-5],[4,2],[-4,2]],"#383a38","#c4baa5",1.2);
  ellipse(0,-33+bob,9,9,"#aaa99a","#e5d9c3",1);ellipse(-3,-34+bob,1.8,2,"#241b1a");ellipse(3,-34+bob,1.8,2,"#241b1a");
  path([[-7,-38],[-13,-47],[-3,-42]],"#b8b4a5","#f1e1c4",1);path([[7,-38],[13,-47],[3,-42]],"#b8b4a5","#f1e1c4",1);
  ctx.strokeStyle="#d1c7ad";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-5,-18);ctx.lineTo(5,-18);ctx.moveTo(-4,-13);ctx.lineTo(4,-13);ctx.stroke();
 }else{
  ctx.save();ctx.globalAlpha=.16;ctx.shadowColor="#ff365f";ctx.shadowBlur=13;ellipse(0,3,11,4,"#a62949");ctx.restore();
  const bodyGrad=ctx.createLinearGradient(-10,-30,10,3);bodyGrad.addColorStop(0,"#a3455b");bodyGrad.addColorStop(.45,"#6c293e");bodyGrad.addColorStop(1,"#351522");
  path([[-9,-9],[-10,-22],[-7,-30],[0,-33],[7,-30],[10,-21],[9,-9],[4,-3],[-5,-3]],bodyGrad,"#d36b7b",1.35);
  path([[-5,-17],[0,-21],[5,-17],[4,-8],[-4,-8]],"#4a1c30","#9b4861",.8);
  ellipse(-8,-24+bob*.2,3.1,4.2,"#7d3449","#d06b78",.8);ellipse(8,-24+bob*.2,3.1,4.2,"#7d3449","#d06b78",.8);
  const headGrad=ctx.createRadialGradient(-3,-35+bob,1,0,-31+bob,12);headGrad.addColorStop(0,"#b85b68");headGrad.addColorStop(.62,"#773044");headGrad.addColorStop(1,"#3b1828");
  ellipse(0,-31+bob,9.3,9.5,headGrad,"#d47780",1.15);
  path([[-6,-35+bob],[-12,-45+bob],[-3,-40+bob]],"#bd4d43","#ff9361",1);path([[6,-35+bob],[12,-45+bob],[3,-40+bob]],"#bd4d43","#ff9361",1);
  ctx.save();ctx.shadowColor="#ff365f";ctx.shadowBlur=7;roundedRect(-5,-33+bob,3.5,1.8,.8,"#ff7890");roundedRect(1.5,-33+bob,3.5,1.8,.8,"#ff7890");ctx.restore();
 }
 if(e.hp<e.maxHp){roundedRect(-13,-51+bob,26,4,2,"#1c1019");roundedRect(-12.5,-50.5+bob,25*clamp(e.hp/e.maxHp,0,1),3,1.5,"#f05270");}
 ctx.restore();
}
function spawnEnemy(){
 const a=rand(0,Math.PI*2),r=rand(8,13),roll=Math.random();
 const kind=wave>2&&roll>.76?"knight":roll>.40?"skeleton":"ghoul";
 const base=kind==="knight"?78:kind==="skeleton"?52:42;
 enemies.push({x:player.x+Math.cos(a)*r,y:player.y+Math.sin(a)*r,hp:base+wave*6,maxHp:base+wave*6,speed:kind==="knight"?.62:kind==="skeleton"?.88:rand(.75,1.05),attack:rand(.2,1),phase:rand(0,8),kind});
}
for(let i=0;i<7;i++)spawnEnemy();

function addBurst(x,y,color="#a78bff",count=16,power=1){
 for(let i=0;i<count;i++){
  const a=rand(0,Math.PI*2),v=rand(25,100)*power;
  particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v- rand(10,45),life:rand(.35,.8),max:.8,color,size:rand(1.5,4)});
 }
}
function damageEnemy(e,amount){
 e.hp-=amount;
 damageTexts.push({x:e.x,y:e.y,amount:Math.round(amount),life:.72,max:.72,color:"#ffe0a1"});
 addBurst(e.x,e.y,"#ff789e",8,.7);
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
function enemyInFacing(maxDistance=3.05){
 const fx=player.faceX,fy=player.faceY;
 let best=null,bestScore=Infinity;
 for(const e of enemies){
  const dx=e.x-player.x,dy=e.y-player.y;
  const dist=Math.hypot(dx,dy);
  if(dist<.05||dist>maxDistance)continue;
  const dot=(dx*fx+dy*fy)/dist;
  const cross=Math.abs(dx*fy-dy*fx)/dist;
  // A narrow forward arc makes manual attacks follow the joystick's last direction.
  if(dot<.28||cross>.78)continue;
  const score=dist+cross*.42-dot*.18;
  if(score<bestScore){best=e;bestScore=score;}
 }
 return best;
}
function attack(autoTarget=false){
 if(gameEnded||paused||attackCooldown>0)return;
 attackCooldown=.78;player.attack=.68;player.attackHitTimer=.29;
 player.attackHitDone=false;
 const e=autoTarget?nearestEnemy():enemyInFacing();
 player.attackTarget=(e&&Math.hypot(e.x-player.x,e.y-player.y)<3.05)?e:null;
 // Auto combat may turn toward its target. Manual attacks never override the
 // last movement direction: the character strikes where the joystick points.
 if(autoTarget&&player.attackTarget){
  const dx=e.x-player.x,dy=e.y-player.y,l=Math.hypot(dx,dy)||1;
  setFacing(dx,dy);
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
document.querySelector("#attackBtn").addEventListener("pointerdown",e=>{e.preventDefault();attack(false);});
document.querySelector("#skillBtn").addEventListener("pointerdown",e=>{e.preventDefault();castSkill();});
document.querySelector("#burstBtn").addEventListener("pointerdown",e=>{e.preventDefault();castSkill();});
document.querySelector("#potionBtn").addEventListener("pointerdown",e=>{e.preventDefault();if(hp<maxHp){hp=Math.min(maxHp,hp+35);addBurst(player.x,player.y,"#ef6575",18,1);say("生命藥水恢復 35 HP");updateUI();}});
document.querySelector("#lockBtn").addEventListener("click",()=>{const e=nearestEnemy();if(e)setFacing(e.x-player.x,e.y-player.y);});
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
addEventListener("keydown",e=>{keys[e.key.toLowerCase()]=true;if(e.key===" "){e.preventDefault();attack(false);}if(e.key.toLowerCase()==="q")castSkill();});
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
 drawRuins();
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
  // Rising violet energy columns give the awakening skill a larger battlefield presence.
  for(let k=0;k<4;k++){
   const a=k*Math.PI/2+Math.PI/4,rad=28+q*52,bx=p.x+Math.cos(a)*rad,by=p.y+Math.sin(a)*rad*.42;
   const beam=ctx.createLinearGradient(bx,by-92,bx,by+4);
   beam.addColorStop(0,"rgba(185,105,255,0)");beam.addColorStop(.5,"rgba(172,76,255,.62)");beam.addColorStop(1,"rgba(235,190,255,0)");
   ctx.globalAlpha=(1-q)*.75;ctx.fillStyle=beam;ctx.shadowColor="#a84bff";ctx.shadowBlur=17;
   ctx.beginPath();ctx.moveTo(bx-5,by);ctx.lineTo(bx-2,by-75*(1-q));ctx.lineTo(bx+3,by-92*(1-q));ctx.lineTo(bx+7,by);ctx.closePath();ctx.fill();
  }
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
  const p=screenPos(s.x,s.y);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(s.angle||0);
  ctx.globalAlpha=s.life/s.max;ctx.strokeStyle="#d6b5ff";ctx.lineWidth=5;ctx.shadowColor="#7d65ff";ctx.shadowBlur=14;
  ctx.beginPath();ctx.arc(0,0,23,-.92,.92);ctx.stroke();
  ctx.strokeStyle="rgba(247,226,255,.82)";ctx.lineWidth=1.5;
  ctx.beginPath();ctx.arc(0,0,17,-.78,.78);ctx.stroke();ctx.restore();
 }
 for(const pt of particles){
  const p=screenPos(pt.x,pt.y);ctx.save();ctx.globalAlpha=clamp(pt.life/pt.max,0,1);ctx.fillStyle=pt.color;ctx.shadowColor=pt.color;ctx.shadowBlur=8;
  ellipse(p.x,p.y,pt.size,pt.size,pt.color);ctx.restore();
 }
 for(const d of damageTexts){
  const p=screenPos(d.x,d.y), rise=(1-d.life/d.max)*25;
  ctx.save();ctx.globalAlpha=clamp(d.life/d.max,0,1);
  ctx.font="900 13px system-ui, sans-serif";ctx.textAlign="center";
  ctx.lineWidth=3;ctx.strokeStyle="rgba(28,12,25,.9)";ctx.strokeText(String(d.amount),p.x,p.y-42-rise);
  ctx.fillStyle=d.color;ctx.shadowColor="#ff9a55";ctx.shadowBlur=8;
  ctx.fillText(String(d.amount),p.x,p.y-42-rise);ctx.restore();
 }
}
function drawMiniMap(){
 if(!mctx)return;
 const w=mini.width,h=mini.height;mctx.clearRect(0,0,w,h);mctx.fillStyle="#111318";mctx.fillRect(0,0,w,h);
 mctx.strokeStyle="#3a3733";mctx.lineWidth=1;
 for(let i=0;i<7;i++){mctx.beginPath();mctx.moveTo(i*w/6,0);mctx.lineTo(i*w/6,h);mctx.stroke();mctx.beginPath();mctx.moveTo(0,i*h/6);mctx.lineTo(w,i*h/6);mctx.stroke();}
 for(const e of enemies){const x=w/2+(e.x-player.x)*3.1,y=h/2+(e.y-player.y)*2.2;mctx.fillStyle=e.kind==="knight"?"#e39b53":"#c94b53";mctx.beginPath();mctx.arc(x,y,2.2,0,Math.PI*2);mctx.fill();}
 mctx.fillStyle="#f3d78c";mctx.beginPath();mctx.arc(w/2,h/2,3.2,0,Math.PI*2);mctx.fill();
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
     const sd=iso(player.faceX,player.faceY);const slashAngle=Math.atan2(sd.y,sd.x);
     slashes.push({x:target.x,y:target.y,angle:slashAngle,life:.30,max:.30});
     slashes.push({x:target.x+.18,y:target.y-.12,angle:slashAngle,life:.20,max:.20,offset:12});
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
  // Joystick and keyboard directions are screen-space arrows. Convert them
  // through the inverse isometric matrix so "up" really moves toward screen-up.
  let sx=joy.x+(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0);
  let sy=joy.y+(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);
  const inputLen=Math.hypot(sx,sy);
  if(inputLen>1){sx/=inputLen;sy/=inputLen;}
  let dx=sx*.6578947368+sy*1.3157894737;
  let dy=-sx*.6578947368+sy*1.3157894737;
  const worldLen=Math.hypot(dx,dy)||1;
  dx/=worldLen;dy/=worldLen;
  player.moving=inputLen>.055;
  if(player.moving){
   player.x+=dx*moveSpeed*dt;player.y+=dy*moveSpeed*dt;player.walk+=dt*8;
   setFacing(dx,dy);
  } else player.walk+=dt*1.5;
  player.x=clamp(player.x,-30,30);player.y=clamp(player.y,-30,30);
  if(autoAttack&&attackCooldown<=0){const e=nearestEnemy();if(e&&Math.hypot(e.x-player.x,e.y-player.y)<2.75)attack(true);}
  for(const e of [...enemies]){
   const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy)||1;
   if(d>1.12){e.x+=dx/d*e.speed*dt;e.y+=dy/d*e.speed*dt;}
   else if(e.attack<=0){e.attack=1.05;if(invuln<=0){hp-=7;invuln=.48;player.hit=.26;player.walk+=.8;screenShake=Math.max(screenShake,.10);addBurst(player.x,player.y,"#ff4e68",10,.7);if(hp<=0){hp=0;endGame();}}}
   e.attack=Math.max(0,e.attack-dt);
  }
  spawnTimer+=dt;if(enemies.length<9&&spawnTimer>1.1){spawnEnemy();spawnTimer=0;}
  for(const p of particles){p.x+=p.vx*dt/55;p.y+=p.vy*dt/55;p.vy+=80*dt/55;p.life-=dt;}
  for(let i=particles.length-1;i>=0;i--)if(particles[i].life<=0)particles.splice(i,1);
  for(const a of runes)a.life-=dt;for(let i=runes.length-1;i>=0;i--)if(runes[i].life<=0)runes.splice(i,1);
  for(const a of slashes)a.life-=dt;for(let i=slashes.length-1;i>=0;i--)if(slashes[i].life<=0)slashes.splice(i,1);
  for(const d of damageTexts)d.life-=dt;for(let i=damageTexts.length-1;i>=0;i--)if(damageTexts[i].life<=0)damageTexts.splice(i,1);
  updateUI();
 }
 draw();drawMiniMap();requestAnimationFrame(tick);
}
updateUI();requestAnimationFrame(tick);
})();