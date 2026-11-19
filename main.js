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
const arenaTexture = new Image();
arenaTexture.src = "./arena_ancient_ruins.png?v=11-0";
let arenaTextureReady = false;
arenaTexture.onload = () => { arenaTextureReady = true; };
function drawFloor(){
  // Detailed painted dungeon arena, used as a world texture rather than a flat
  // procedural checkerboard. The camera follows the hero with a restrained pan.
  ctx.fillStyle="#17151a";ctx.fillRect(0,0,W,H);
  if(arenaTextureReady){
    const iw=arenaTexture.naturalWidth, ih=arenaTexture.naturalHeight;
    const scale=Math.max(W/iw,H/ih)*1.22;
    const dw=iw*scale,dh=ih*scale;
    const driftX=clamp(-player.x*19,-260,260),driftY=clamp(-player.y*13,-170,170);
    const ox=(W-dw)/2+driftX, oy=(H-dh)/2+driftY;
    ctx.drawImage(arenaTexture,ox,oy,dw,dh);
  } else {
    const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,"#33252a");g.addColorStop(1,"#101116");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  }
  // Ambient haze, ember pools, and edge vignette keep the floor legible under
  // the HUD while retaining the original game's dark, ornate battlefield mood.
  const haze=ctx.createRadialGradient(W*.5,H*.48,8,W*.5,H*.48,Math.max(W,H)*.62);
  haze.addColorStop(0,"rgba(8,5,12,.02)");haze.addColorStop(.72,"rgba(7,5,10,.18)");haze.addColorStop(1,"rgba(3,3,7,.72)");
  ctx.fillStyle=haze;ctx.fillRect(0,0,W,H);
  ctx.save();ctx.globalCompositeOperation="lighter";
  for(let i=0;i<24;i++){
    const x=((i*173+time*(i%3+1)*3)% (W+40))-20;
    const y=((i*97+Math.sin(time*.7+i)*22)%H);
    const r=1.1+(i%3)*.7;ctx.globalAlpha=.10+.08*Math.sin(time*2+i);
    ctx.fillStyle=i%4===0?"#b66bff":"#ff9a4d";ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=9;
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}

function drawRuins(){
 const items=[{x:W*.08,y:H*.38,t:"banner"},{x:W*.86,y:H*.42,t:"fire"},{x:W*.80,y:H*.27,t:"pillar"},{x:W*.14,y:H*.72,t:"wall"},{x:W*.92,y:H*.72,t:"pillar"},{x:W*.04,y:H*.57,t:"fire"}];
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
halpasSheet.src = "./halpas_animated_sprites_v10.png?v=final-11-0";
let halpasSheetReady = false;
halpasSheet.onload = () => { halpasSheetReady = true; };
const halpasRunSheet = new Image();
halpasRunSheet.src = "./halpas_directional_run.png?v=final-11-0";
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
 const runFrame=moving?Math.floor(phase*1.15)%4:0;
 // Four authored idle poses loop slowly: breathing, weapon sway and cape settling.
 const idleFrame=Math.floor(time*1.35)%4;
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
 const h=252*scale,w=h*cellRatio;

 ctx.save();
 ctx.translate(0,-runBob+dead*17);
 ctx.rotate(dead*.24+strideLean+bodySway);
 ctx.scale(1,1+(moving?Math.sin(phase*.75)*.012:0));
 ctx.globalAlpha*=1-dead*.52;
 if(hitFlash){ctx.globalAlpha=.90;ctx.filter="brightness(1.22) saturate(1.25)";}

 if(hit>0 && halpasSheetReady){
  // Dedicated stagger/recovery poses from the new high-detail atlas.
  const hitFrame=hit>.19?0:hit>.12?1:hit>.06?2:3;
  drawFrame(halpasSheet,4,4,hitFrame,3,h,h,0);
 } else if(skill>0 && halpasSheetReady){
  // The new atlas row 3 is a committed four-pose sword/energy combo.
  const frame=skillProgress<.18?0:skillProgress<.40?1:skillProgress<.74?2:3;
  drawFrame(halpasSheet,4,4,frame,2,h,h,0);
 } else if(attack>0 && halpasSheetReady){
  // IMPORTANT: use the authored sword-combo row before the run atlas.
  // FINAL 8.0 accidentally selected the running atlas first, hiding the
  // actual raised-sword / slash poses during every attack.
  const frame=attackProgress<.18?0:attackProgress<.43?1:attackProgress<.72?2:3;
  const screenFacing=iso(faceX,faceY);
  ctx.save();
  if(screenFacing.x<-.18)ctx.scale(-1,1);
  // A slight forward body pitch makes the strike read as a committed swing.
  ctx.rotate(attackProgress<.25?-.035:attackProgress<.68?.055:-.015);
  drawFrame(halpasSheet,4,4,frame,2,h,h,0);
  ctx.restore();
 } else if(halpasRunReady && moving){
  // Direction-specific run cycle only while movement input is active.
  drawFrame(halpasRunSheet,4,8,runFrame,runRow,w,h,0);
 } else if(halpasSheetReady){
  // Dedicated idle loop from row 0; never leave the character in a frozen run pose.
  drawFrame(halpasSheet,4,4,idleFrame,0,h,h,0);
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
 if(attack>0 && !halpasSheetReady){
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
 const p=screenPos(e.x,e.y),bob=Math.sin(time*4.4+e.phase)*1.9;
 const gait=Math.sin(time*7.2+e.phase)*2.2;
 ctx.save();ctx.translate(p.x,p.y);
 const attackLunge=e.attack>0?Math.sin((1-e.attack/1.05)*Math.PI)*5:0;
 ctx.translate(0,-attackLunge);
 if(e.kind==="brute")ctx.scale(1.48,1.48);
 else if(e.kind==="mage")ctx.scale(1.16,1.16);
 else ctx.scale(1.08,1.08);
 // Ground shadow and species-specific aura.
 ctx.save();ctx.globalAlpha=.48;ctx.shadowColor=e.kind==="knight"?"#d88b43":e.kind==="mage"?"#a56bdf":e.kind==="brute"?"#e34e58":"#d33c59";ctx.shadowBlur=12;
 ellipse(0,8,20,7,"rgba(0,0,0,.72)");ctx.restore();
 ctx.save();ctx.scale(1.24,1.24);
 if(e.kind==="knight"){
  // Rusted elite guard: layered plate, pauldrons, rivets, helmet and ember visor.
  path([[-13,-7],[-14,-25],[-10,-38],[-6,-43],[6,-43],[11,-37],[14,-24],[13,-6],[6,3],[-7,3]],"#27252a","#c49a69",1.5);
  path([[-11,-29],[-18,-36],[-22,-29],[-17,-17],[-10,-19]],"#51413b","#d6a56c",1.3);
  path([[11,-29],[18,-36],[22,-29],[17,-17],[10,-19]],"#51413b","#d6a56c",1.3);
  path([[-9,-26],[0,-32],[9,-26],[7,-9],[0,-5],[-7,-9]],"#5a4640","#d6b27c",1.1);
  path([[-6,-24],[0,-28],[6,-24],[5,-14],[0,-11],[-5,-14]],"#29252c","#98745b",.8);
  ellipse(0,-38+bob,10,10,"#494044","#d9b78b",1.3);
  path([[-9,-40+bob],[-13,-52+bob],[-3,-46+bob],[0,-53+bob],[4,-46+bob],[13,-52+bob],[9,-39+bob]],"#62504a","#e0bb82",1.4);
  roundedRect(-6,-39+bob,12,3.5,1,"#ff8b52");
  ctx.save();ctx.shadowColor="#ff6a39";ctx.shadowBlur=8;roundedRect(-4.5,-39+bob,9,1.5,.7,"#ffe0a0");ctx.restore();
  path([[-14,-19],[-23,-12],[-19,-5],[-10,-12]],"#373039","#c79a68",1.2);
  path([[14,-19],[23,-12],[19,-5],[10,-12]],"#373039","#c79a68",1.2);
  // Chest crest and plate seams.
  path([[-4,-25],[0,-29],[4,-25],[3,-18],[0,-15],[-3,-18]],"#a36d43","#f0c27e",.9);
  ellipse(0,-22,2.2,2.8,"#f7b75b");
  ctx.strokeStyle="rgba(239,205,151,.72)";ctx.lineWidth=.8;
  ctx.beginPath();ctx.moveTo(-7,-8);ctx.lineTo(0,-5);ctx.lineTo(7,-8);ctx.stroke();
 }else if(e.kind==="mage"){
  // Ashen necromancer: layered robe, shoulder mantle, hood, glowing sigil and staff.
  path([[-10,-7],[-13,-22],[-12,-35],[-8,-43],[0,-47],[9,-42],[13,-29],[11,-9],[5,4],[-7,4]],"#20172c","#a78acb",1.4);
  path([[-12,-28],[-19,-38],[-8,-36],[0,-42],[9,-36],[18,-39],[12,-25],[6,-19],[-7,-19]],"#49315d","#c4a0ec",1.2);
  path([[-8,-12],[0,-23],[8,-12],[5,2],[-5,2]],"#30203d","#8d65b4",1);
  ellipse(0,-35+bob,8.5,10,"#171322","#b18bdb",1.1);
  ctx.save();ctx.shadowColor="#c56cff";ctx.shadowBlur=13;ellipse(0,-35+bob,3.1,3.1,"#dc8bff");ctx.restore();
  ctx.strokeStyle="#8f72b4";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(15,-5);ctx.lineTo(20,-51+bob);ctx.stroke();
  ctx.save();ctx.shadowColor="#b76cff";ctx.shadowBlur=12;ellipse(20,-54+bob,5,5,"#c58aff","#f0d5ff",1);ctx.restore();
  path([[-14,-18],[-21,-8],[-15,-3],[-8,-12]],"#30213c","#9f7ac1",1);
  path([[14,-18],[21,-8],[15,-3],[8,-12]],"#30213c","#9f7ac1",1);
 }else if(e.kind==="brute"){
  // Heavy abyss brute: oversized shoulders, horned skull, layered chest plates and claws.
  path([[-20,-7],[-22,-28],[-16,-43],[-9,-50],[9,-50],[17,-42],[22,-25],[19,-5],[9,7],[-10,7]],"#38202a","#d18b64",2);
  path([[-17,-37],[-27,-47],[-28,-30],[-19,-21]],"#5a3039","#e4a27b",1.8);
  path([[17,-37],[27,-47],[28,-30],[19,-21]],"#5a3039","#e4a27b",1.8);
  path([[-12,-32],[0,-40],[12,-32],[10,-10],[0,-4],[-10,-10]],"#572a37","#e6a27e",1.4);
  path([[-8,-29],[0,-34],[8,-29],[7,-14],[0,-10],[-7,-14]],"#291823","#a85a68",1);
  ellipse(0,-49+bob,12,11,"#5a3038","#e2a17a",1.6);
  path([[-9,-54+bob],[-17,-67+bob],[-4,-60+bob],[0,-65+bob],[5,-60+bob],[17,-67+bob],[9,-53+bob]],"#b46a58","#ffd0a1",1.6);
  ctx.save();ctx.shadowColor="#ff4c5c";ctx.shadowBlur=12;ellipse(-4,-50+bob,2.4,2,"#ff6b61");ellipse(4,-50+bob,2.4,2,"#ff6b61");ctx.restore();
  path([[-21,-27],[-31,-18+gait],[-28,-7+gait],[-17,-14]],"#4b2932","#d58b70",1.5);
  path([[21,-27],[31,-18-gait],[28,-7-gait],[17,-14]],"#4b2932","#d58b70",1.5);
  for(let i=0;i<3;i++){ctx.strokeStyle="#f0b78a";ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(-7+i*7,-8);ctx.lineTo(-5+i*7,-2);ctx.stroke();}
 }else if(e.kind==="skeleton"){
  // Bone warrior with rib cage, shoulder bones, jaw and a chipped skull.
  path([[-9,-6],[-10,-23],[-6,-31],[6,-31],[10,-23],[9,-6],[4,2],[-4,2]],"#393936","#d4c6a9",1.2);
  path([[-7,-25],[-15,-29],[-18,-23],[-11,-17]],"#827c6b","#e2d3b6",1);
  path([[7,-25],[15,-29],[18,-23],[11,-17]],"#827c6b","#e2d3b6",1);
  ellipse(0,-34+bob,9.5,10,"#aaa38f","#f0dfbf",1.2);
  path([[-7,-38+bob],[-13,-49+bob],[-3,-43+bob],[0,-46+bob],[6,-42+bob],[12,-48+bob],[7,-36+bob]],"#9c9583","#e9d9b8",1);
  ellipse(-3.2,-35+bob,2.1,2.8,"#211b1b");ellipse(3.2,-35+bob,2.1,2.8,"#211b1b");
  path([[-4,-28+bob],[0,-26+bob],[4,-28+bob],[3,-23+bob],[-3,-23+bob]],"#706b5d","#e7d8bd",.8);
  ctx.strokeStyle="#e0d3b8";ctx.lineWidth=1.2;
  ctx.beginPath();ctx.moveTo(-5,-19);ctx.lineTo(5,-19);ctx.moveTo(-5,-15);ctx.lineTo(5,-15);ctx.moveTo(-4,-11);ctx.lineTo(4,-11);ctx.stroke();
  ctx.strokeStyle="#8e8878";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-6,-7);ctx.lineTo(-10,1);ctx.moveTo(6,-7);ctx.lineTo(10,1);ctx.stroke();
 }else{
  // Crimson cave fiend: layered hide, horns, glowing eyes and a plated belly.
  ctx.save();ctx.globalAlpha=.22;ctx.shadowColor="#ff365f";ctx.shadowBlur=16;ellipse(0,3,14,5,"#a62949");ctx.restore();
  const bodyGrad=ctx.createLinearGradient(-11,-34,11,4);bodyGrad.addColorStop(0,"#bd5a68");bodyGrad.addColorStop(.42,"#742a40");bodyGrad.addColorStop(1,"#291521");
  path([[-10,-8],[-12,-22],[-9,-32],[-3,-36],[4,-34],[11,-26],[12,-10],[5,3],[-6,3]],bodyGrad,"#df8490",1.5);
  path([[-8,-25],[-16,-31],[-19,-22],[-12,-17]],"#69253a","#d76b78",1.1);
  path([[8,-25],[16,-31],[19,-22],[12,-17]],"#69253a","#d76b78",1.1);
  path([[-6,-17],[0,-22],[6,-17],[5,-8],[0,-5],[-5,-8]],"#3b1929","#b85a70",1);
  ctx.strokeStyle="rgba(245,158,161,.62)";ctx.lineWidth=.8;
  ctx.beginPath();ctx.moveTo(-4,-15);ctx.lineTo(0,-12);ctx.lineTo(4,-15);ctx.stroke();
  const headGrad=ctx.createRadialGradient(-3,-38+bob,1,0,-33+bob,13);headGrad.addColorStop(0,"#cf6d79");headGrad.addColorStop(.62,"#813349");headGrad.addColorStop(1,"#321525");
  ellipse(0,-34+bob,10.5,10.5,headGrad,"#e58b91",1.2);
  path([[-6,-39+bob],[-13,-52+bob],[-3,-45+bob],[0,-49+bob],[4,-44+bob],[13,-51+bob],[7,-37+bob]],"#a94348","#ff9b68",1.2);
  ctx.save();ctx.shadowColor="#ff365f";ctx.shadowBlur=9;roundedRect(-6,-36+bob,4,2.2,1,"#ffb0a0");roundedRect(2,-36+bob,4,2.2,1,"#ffb0a0");ctx.restore();
  ellipse(0,-27+bob,3.5,1.7,"#2c101d");
 }
 ctx.restore();
 // Ground contact rune and health indicator.
 ctx.save();ctx.globalAlpha=.28;ctx.strokeStyle=e.kind==="knight"?"#dca45c":e.kind==="mage"?"#a56bdf":e.kind==="brute"?"#e34e58":"#c94c66";ctx.lineWidth=1;
 ctx.beginPath();ctx.ellipse(0,7,16,5,0,0,Math.PI*2);ctx.stroke();ctx.restore();
 {
  ctx.save();ctx.globalAlpha=e.hp<e.maxHp?.95:.62;
  roundedRect(-17,-63+bob,34,6,2,"#100b12","#9b7c63",.6);
  roundedRect(-16,-62.3+bob,32*clamp(e.hp/e.maxHp,0,1),4.6,1.5,e.kind==="knight"?"#e0a34f":e.kind==="mage"?"#b77aff":e.kind==="brute"?"#ef5361":"#ed526f");
  ctx.restore();
 }
 ctx.restore();
}
function spawnEnemy(){
 const a=rand(0,Math.PI*2),r=rand(3.15,5.25),roll=Math.random();
 const kind=wave>3&&roll>.91?"brute":wave>1&&roll>.80?"mage":wave>2&&roll>.68?"knight":roll>.36?"skeleton":"ghoul";
 const base=kind==="brute"?165:kind==="knight"?88:kind==="mage"?64:kind==="skeleton"?54:44;
 const speed=kind==="brute"?.48:kind==="knight"?.62:kind==="mage"?.70:kind==="skeleton"?.88:rand(.78,1.08);
 enemies.push({x:player.x+Math.cos(a)*r,y:player.y+Math.sin(a)*r,hp:base+wave*7,maxHp:base+wave*7,speed,attack:rand(.2,1),phase:rand(0,8),kind});
}
for(let i=0;i<11;i++)spawnEnemy();

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
 runes.push({x:player.x,y:player.y,r:.3,life:1.12,max:1.12});
 runes.push({x:player.x,y:player.y,r:.3,life:.72,max:.72,inner:true});
 screenShake=Math.max(screenShake,.16);
 addBurst(player.x,player.y,"#b77aff",64,1.95);
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
  drawHalpas(p.x,p.y,.82,player.walk+time,player.faceX,player.faceY,player.attack,player.hit,player.moving,player.skillAnim,dead);
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
  ctx.globalAlpha*=.62;ctx.strokeStyle="#a56aff";ctx.lineWidth=11;ctx.shadowBlur=24;
  ctx.beginPath();ctx.arc(0,0,28,-.98,.98);ctx.stroke();
  ctx.globalAlpha*=.92;ctx.strokeStyle="rgba(247,226,255,.82)";ctx.lineWidth=1.8;
  ctx.beginPath();ctx.arc(0,0,17,-.78,.78);ctx.stroke();
  ctx.globalAlpha*=.72;ctx.strokeStyle="#fff0ff";ctx.lineWidth=1.2;ctx.shadowBlur=22;
  ctx.beginPath();ctx.arc(0,0,28,-.68,.68);ctx.stroke();ctx.restore();
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
 for(const e of enemies){const x=w/2+(e.x-player.x)*3.1,y=h/2+(e.y-player.y)*2.2;mctx.fillStyle=e.kind==="knight"?"#e39b53":e.kind==="mage"?"#b77aff":e.kind==="brute"?"#f05a62":"#c94b53";mctx.beginPath();mctx.arc(x,y,2.2,0,Math.PI*2);mctx.fill();}
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
  spawnTimer+=dt;if(enemies.length<Math.min(22,12+wave*2)&&spawnTimer>Math.max(.42,.88-wave*.025)){spawnEnemy();spawnTimer=0;}
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