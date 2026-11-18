import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const mount = document.querySelector("#game");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x090d17);
scene.fog = new THREE.Fog(0x090d17, 18, 62);
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 120);
camera.position.set(0, 7, 11);
const renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
mount.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0x9db6e8, 0x17101e, 1.6));
const key = new THREE.DirectionalLight(0xffd5bb, 2.3);
key.position.set(-7, 12, 6); key.castShadow = true; key.shadow.mapSize.set(1024,1024); scene.add(key);
const violet = new THREE.PointLight(0x743bff, 22, 18); violet.position.set(0,3,0); scene.add(violet);

const mat = (color, metalness=0, roughness=.6, emissive=0x000000, intensity=0) =>
  new THREE.MeshStandardMaterial({color, metalness, roughness, emissive, emissiveIntensity:intensity});
const floorMat=mat(0x222532,.15,.92), stoneMat=mat(0x343646,.2,.8), dark=mat(0x10131e,.65,.38),
      armor=mat(0x34394d,.8,.28,0x16152b,.35), silver=mat(0x9ca7b9,.8,.24),
      purple=mat(0x5722a0,.4,.28,0x7c2cff,1.2), glow=mat(0x8f39ff,.2,.25,0xb32fff,2.4),
      red=mat(0x8d2333,.25,.35,0x510a19,.5), eyeMat=new THREE.MeshBasicMaterial({color:0xff3d5e});

const floor = new THREE.Mesh(new THREE.CircleGeometry(38,64),floorMat);
floor.rotation.x=-Math.PI/2; floor.position.y=-.08; floor.receiveShadow=true; scene.add(floor);
const grid = new THREE.GridHelper(70,70,0x41445d,0x24283b); grid.position.y=-.06; scene.add(grid);
for(let i=0;i<24;i++){
  const a=i*Math.PI*2/24, r=17+Math.random()*9;
  const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(.45+Math.random()*.9,0),stoneMat);
  rock.position.set(Math.cos(a)*r,.25,Math.sin(a)*r); rock.rotation.set(Math.random(),Math.random(),Math.random()); rock.castShadow=true; scene.add(rock);
}

// Version 2: detailed original 3D interpretation guided by the public promotional
// appearance reference: dark plate armor, gold trim, horned helm, crimson cape,
// and a large violet greatsword. This is a newly-built approximation, not game assets.
function makeHalpas(){
  const root=new THREE.Group(); scene.add(root);
  const body=new THREE.Group(); root.add(body);
  const gold=mat(0xb78a3d,.82,.25,0x4a2b08,.22);
  const goldBright=mat(0xf0c86b,.78,.2,0x76501b,.35);
  const blackSteel=mat(0x171b25,.88,.28,0x090d19,.18);
  const steel=mat(0x343b49,.86,.24,0x151b2c,.22);
  const steelLight=mat(0x667184,.82,.22);
  const leather=mat(0x24151b,.18,.72);
  const capeMat=new THREE.MeshStandardMaterial({color:0x781b32,roughness:.78,side:THREE.DoubleSide,emissive:0x26000b,emissiveIntensity:.22});
  const purpleBlade=new THREE.MeshStandardMaterial({color:0x8b4cff,metalness:.55,roughness:.2,emissive:0x7c20ff,emissiveIntensity:1.7,transparent:true,opacity:.94});
  const darkPurple=mat(0x32145e,.62,.25,0x4b13a1,.8);
  const redEye=new THREE.MeshBasicMaterial({color:0xff3b58});
  const sphere=new THREE.SphereGeometry(1,18,14), cyl=new THREE.CylinderGeometry(1,1,1,12), cone=new THREE.ConeGeometry(1,1,10);
  const add=(parent,geo,material,x,y,z,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0)=>{
    const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.rotation.set(rx,ry,rz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
  };
  const box=(parent,material,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0)=>add(parent,new THREE.BoxGeometry(1,1,1),material,x,y,z,sx,sy,sz,rx,ry,rz);
  const plate=(parent,pts,material,x,y,z,depth=.07)=>{
    const sh=new THREE.Shape();sh.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)sh.lineTo(pts[i][0],pts[i][1]);sh.closePath();
    const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,{depth,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.035,bevelThickness:.025}),material);
    mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  };
  // Heavy armored torso and waist.
  add(body,sphere,blackSteel,0,1.48,0,.48,.68,.32);
  add(body,sphere,steel,0,1.58,.015,.43,.58,.34);
  box(body,blackSteel,0,1.08,0,.48,.24,.36);
  // Back armor spine, visible from the third-person camera.
  for(let i=0;i<4;i++){
    const y=1.25+i*.19;
    plate(body,[[-.16,.08],[0,.18],[.16,.08],[0,-.09]],i%2?gold:steelLight,-.0,y,-.355,.045);
  }
  // Front chest cuirass with raised gold heraldic ribs and central amethyst.
  plate(body,[[-.34,.28],[-.27,.53],[0,.62],[.27,.53],[.34,.28],[.18,-.05],[0,-.16],[-.18,-.05]],blackSteel,-.34,1.36,.29,.09);
  plate(body,[[-.28,.23],[-.2,.46],[0,.52],[.2,.46],[.28,.23],[.13,-.02],[0,-.1],[-.13,-.02]],steel,-.28,1.4,.385,.045);
  plate(body,[[-.19,.2],[-.1,.39],[0,.45],[.1,.39],[.19,.2],[0,-.05]],gold,-.19,1.42,.44,.025);
  add(body,sphere,darkPurple,0,1.67,.49,.105,.14,.055);
  add(body,sphere,purpleBlade,0,1.68,.545,.055,.085,.025);
  // Waist belt and layered armored tassets.
  box(body,gold,0,1.04,.02,.62,.09,.39);
  add(body,sphere,goldBright,0,1.04,.235,.13,.12,.055);
  for(const side of [-1,1]){
    plate(body,[[-.02,.12],[.2,.2],[.29,-.18],[.12,-.34],[-.06,-.19]],blackSteel,side*.16,.83,.25,.06);
    plate(body,[[-.01,.1],[.15,.15],[.21,-.14],[.1,-.25],[-.04,-.15]],gold,side*.16,.84,.315,.025);
  }
  // Neck and imposing horned helmet.
  add(body,cyl,blackSteel,0,2.04,0,.19,.28,.19);
  add(body,sphere,blackSteel,0,2.27,0,.34,.39,.31);
  add(body,sphere,steel,0,2.31,.015,.32,.34,.3);
  // Helmet brow, cheek guards and face slit.
  plate(body,[[-.31,.06],[-.24,.2],[0,.28],[.24,.2],[.31,.06],[.17,-.02],[0,.04],[-.17,-.02]],gold,-.31,2.28,.255,.045);
  plate(body,[[-.27,.05],[-.2,-.19],[-.08,-.28],[0,-.1],[.08,-.28],[.2,-.19],[.27,.05],[0,.12]],blackSteel,-.27,2.12,.29,.055);
  box(body,redEye,0,2.24,.355,.22,.035,.025);
  // Crown crest and swept horns.
  plate(body,[[-.13,.03],[0,.32],[.13,.03],[.08,-.05],[-.08,-.05]],goldBright,-.13,2.52,.05,.04);
  const hornL=add(body,cone,gold,-.22,2.55,-.015,.105,.56,.105,0,0,.38);hornL.rotation.z=.48;
  const hornR=add(body,cone,gold,.22,2.55,-.015,.105,.56,.105,0,0,-.38);hornR.rotation.z=-.48;
  // Side helmet fins and engraved cheek plates.
  for(const side of [-1,1]){
    plate(body,[[0,.16],[.18,.04],[.13,-.18],[0,-.26],[-.04,-.04]],steelLight,side*.24,2.19,.12,.035);
    add(body,cone,blackSteel,side*.31,2.35,-.04,.08,.32,.08,0,0,side*-.65);
  }
  // Massive layered pauldrons, gold edges, spikes and articulated arms.
  for(const side of [-1,1]){
    const sh= new THREE.Group();sh.position.set(side*.48,1.91,0);body.add(sh);
    add(sh,sphere,blackSteel,0,0,0,.34,.27,.34);
    add(sh,sphere,steel,0,.035,.025,.31,.23,.31);
    plate(sh,[[-.29,.04],[-.2,.24],[0,.34],[.2,.24],[.3,.04],[.14,-.1],[0,-.17],[-.14,-.1]],gold, -.29,-.12,.22,.035);
    add(sh,cone,goldBright,side*.04,.24,-.02,.12,.42,.12,0,0,side*-.12);
    add(sh,cone,steelLight,side*.25,.04,-.03,.1,.27,.1,0,0,side*-.7);
    const arm=new THREE.Group();arm.position.set(side*.51,1.48,.015);body.add(arm);
    add(arm,cyl,blackSteel,0,0,0,.145,.53,.15,0,0,side*-.08);
    add(arm,cyl,steel,0,-.03,.015,.15,.35,.155,0,0,side*-.08);
    add(arm,sphere,gold,0,-.25,.02,.17,.13,.17);
    add(arm,sphere,steelLight,0,-.36,.045,.16,.16,.17);
    // forearm vambrace
    plate(arm,[[-.12,.18],[-.1,-.08],[0,-.2],[.1,-.08],[.12,.18],[0,.26]],gold,-.12,-.19,.16,.035);
    // thighs, greaves, knee caps and armored boots
    add(body,cyl,blackSteel,side*.22,.66,0,.19,.66,.2,0,0,side*-.025);
    add(body,cyl,steel,side*.22,.64,.025,.17,.46,.19,0,0,side*-.025);
    add(body,sphere,gold,side*.22,.43,.19,.18,.15,.075);
    plate(body,[[-.13,.18],[0,.27],[.13,.18],[.1,-.12],[0,-.2],[-.1,-.12]],gold,side*.22,.48,.18,.03);
    add(body,sphere,blackSteel,side*.22,.19,.12,.21,.18,.31);
    add(body,sphere,steel,side*.22,.16,.2,.2,.11,.25);
    // gold toe cap
    plate(body,[[-.16,.05],[0,.13],[.16,.05],[.12,-.08],[-.12,-.08]],gold,side*.22,.08,.37,.035);
  }
  // Long crimson war-cape, flared behind the armor; double-sided for mobile view.
  const capeShape=new THREE.Shape();
  capeShape.moveTo(-.31,1.98);capeShape.quadraticCurveTo(-.48,1.3,-.66,.55);
  capeShape.quadraticCurveTo(-.5,.35,-.3,.48);capeShape.lineTo(0,.36);
  capeShape.lineTo(.3,.48);capeShape.quadraticCurveTo(.5,.35,.66,.55);
  capeShape.quadraticCurveTo(.48,1.3,.31,1.98);capeShape.quadraticCurveTo(0,1.84,-.31,1.98);
  const capeGeo=new THREE.ShapeGeometry(capeShape,12);
  const cape=new THREE.Mesh(capeGeo,capeMat);cape.position.set(0,0,-.31);cape.rotation.x=-.08;cape.castShadow=true;body.add(cape);
  // Cape gold clasp and edge piping.
  add(body,sphere,goldBright,0,1.91,-.34,.16,.12,.07);
  const capeTrimMat=mat(0xb88639,.7,.3);
  for(const side of [-1,1]){
    const trim=add(body,new THREE.BoxGeometry(.025,1.42,.025),capeTrimMat,side*.46,1.19,-.29,1,1,1,0,0,side*side*.1);
  }
  // Greatsword in the right hand: dark gold hilt and glowing violet blade.
  const sword=new THREE.Group();sword.position.set(.72,1.12,.22);sword.rotation.z=-.18;body.add(sword);
  box(sword,blackSteel,0,0,0,.12,.48,.12);
  box(sword,goldBright,0,.02,.07,.23,.075,.12);
  add(sword,sphere,goldBright,0,-.28,0,.14,.14,.14);
  // broad tapered crystal blade
  plate(sword,[[-.13,.19],[-.19,.72],[-.12,1.35],[0,1.58],[.12,1.35],[.19,.72],[.13,.19]],darkPurple,-.13,.16,.015,.07);
  plate(sword,[[-.09,.22],[-.13,.75],[-.08,1.32],[0,1.49],[.08,1.32],[.13,.75],[.09,.22]],purpleBlade,-.09,.18,.095,.025);
  box(sword,gold,0,.2,.04,.37,.07,.16);
  add(sword,cone,goldBright,0,1.67,.04,.09,.2,.09,0,0,Math.PI);
  // Small runic lights and back-mounted armor studs.
  for(let i=0;i<5;i++){
    const y=1.18+i*.16;
    add(body,sphere,goldBright,0,y,-.39,.035,.035,.025);
  }
  const aura=new THREE.Mesh(new THREE.TorusGeometry(.9,.035,8,48),glow);
  aura.rotation.x=Math.PI/2;aura.position.y=.04;root.add(aura);
  const aura2=new THREE.Mesh(new THREE.TorusGeometry(1.17,.012,6,48),purple);
  aura2.rotation.x=Math.PI/2;aura2.position.y=.045;root.add(aura2);
  root.userData={wingMeshes:[],aura,cape,sword,body};
  return root;
}
const player=makeHalpas(); player.position.set(0,0,0);

const enemyMat=mat(0x7a3544,.25,.65), enemyGlow=mat(0xff572f,.1,.3,0x9b210c,1);
const enemies=[], effects=[], pickups=[];
let hp=100,maxHp=100,mp=60,maxMp=60,xp=0,level=1,kills=0,wave=1,power=1,speed=5.2,autoAttack=true,attackCooldown=0,skillCooldown=0,invuln=0,paused=false,gameEnded=false;
const ui={
 hpBar:document.querySelector("#hpBar"),mpBar:document.querySelector("#mpBar"),xpBar:document.querySelector("#xpBar"),
 hpText:document.querySelector("#hpText"),mpText:document.querySelector("#mpText"),levelText:document.querySelector("#levelText"),
 kills:document.querySelector("#kills"),wave:document.querySelector("#wave"),message:document.querySelector("#message"),
 levelUp:document.querySelector("#levelUp"),gameOver:document.querySelector("#gameOver")
};
function updateUI(){
 ui.hpBar.style.width=`${Math.max(0,hp/maxHp*100)}%`;ui.mpBar.style.width=`${mp/maxMp*100}%`;ui.xpBar.style.width=`${xp/100*100}%`;
 ui.hpText.textContent=`${Math.ceil(hp)}/${maxHp}`;ui.mpText.textContent=`${Math.ceil(mp)}/${maxMp}`;
 ui.levelText.textContent=`Lv.${level}`;ui.kills.textContent=kills;ui.wave.textContent=wave;
}
function spawnEnemy(){
 const a=Math.random()*Math.PI*2,r=13+Math.random()*5;
 const g=new THREE.Group();
 const body=new THREE.Mesh(new THREE.SphereGeometry(.48,12,10),enemyMat);body.position.y=.65;body.scale.set(.8,1.1,.7);body.castShadow=true;g.add(body);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.28,10,8),enemyMat);head.position.set(0,1.25,.12);head.castShadow=true;g.add(head);
 for(const s of [-1,1]){const horn=new THREE.Mesh(new THREE.ConeGeometry(.09,.3,6),enemyGlow);horn.position.set(s*.17,1.5,.12);horn.rotation.z=s*-.35;g.add(horn);}
 const eye=new THREE.Mesh(new THREE.BoxGeometry(.22,.045,.035),eyeMat);eye.position.set(0,1.27,.38);g.add(eye);
 g.position.set(Math.cos(a)*r,0,Math.sin(a)*r);scene.add(g);
 enemies.push({mesh:g,hp:38+wave*5,speed:1.25+Math.random()*.35,attack:0});
}
for(let i=0;i<7;i++)spawnEnemy();

function burst(pos,color=0xa94cff,size=1){
 const group=new THREE.Group();group.position.copy(pos);scene.add(group);
 for(let i=0;i<12;i++){
  const p=new THREE.Mesh(new THREE.SphereGeometry(.07,6,6),new THREE.MeshBasicMaterial({color}));
  const a=Math.random()*Math.PI*2, v=.8+Math.random()*2;
  p.userData.vel=new THREE.Vector3(Math.cos(a)*v,Math.random()*2,Math.sin(a)*v);group.add(p);
 }
 effects.push({mesh:group,time:.65,kind:"burst"});
}
function damageEnemy(e,amount){
 e.hp-=amount;burst(e.mesh.position.clone().add(new THREE.Vector3(0,1,0)),0xff6a9b,.5);
 if(e.hp<=0){
  scene.remove(e.mesh);const idx=enemies.indexOf(e);if(idx>=0)enemies.splice(idx,1);
  kills++;xp+=25; if(xp>=100){xp-=100;level++;paused=true;ui.levelUp.classList.remove("hidden");}
  if(kills%8===0){wave++;for(let i=0;i<2+wave;i++)spawnEnemy();ui.message.textContent=`第 ${wave} 波怪物來襲！`;}
  updateUI();
 }
}
function nearestEnemy(){
 let best=null,d=Infinity;for(const e of enemies){const n=e.mesh.position.distanceTo(player.position);if(n<d){d=n;best=e;}}return best;
}
function attack(){
 if(gameEnded||paused||attackCooldown>0)return;
 attackCooldown=.48;
 const e=nearestEnemy();
 if(e&&e.mesh.position.distanceTo(player.position)<3.5){
  damageEnemy(e,22*power);
  player.rotation.y=Math.atan2(e.mesh.position.x-player.position.x,e.mesh.position.z-player.position.z);
  burst(player.position.clone().add(new THREE.Vector3(0,1.4,0)),0xc88aff,.7);
 }else{
  // swing slash in front even if no target
  burst(player.position.clone().add(new THREE.Vector3(0,1.1,1.2).applyAxisAngle(new THREE.Vector3(0,1,0),player.rotation.y)),0x9d52ff,.7);
 }
}
function castSkill(){
 if(gameEnded||paused||skillCooldown>0||mp<25)return;
 mp-=25;skillCooldown=5;
 const ring=new THREE.Mesh(new THREE.TorusGeometry(4.1,.14,10,64),glow);
 ring.rotation.x=Math.PI/2;ring.position.set(player.position.x,.16,player.position.z);scene.add(ring);
 effects.push({mesh:ring,time:.7,kind:"ring"});
 for(const e of [...enemies])if(e.mesh.position.distanceTo(player.position)<4.5)damageEnemy(e,65*power);
 burst(player.position.clone().add(new THREE.Vector3(0,1,0)),0xff6bcb,2);updateUI();
}
document.querySelector("#attackBtn").addEventListener("pointerdown",e=>{e.preventDefault();attack();});
document.querySelector("#skillBtn").addEventListener("pointerdown",e=>{e.preventDefault();castSkill();});
document.querySelector("#autoBtn").addEventListener("click",e=>{autoAttack=!autoAttack;e.currentTarget.textContent=`自動攻擊：${autoAttack?"開":"關"}`;e.currentTarget.classList.toggle("active",autoAttack);});

for(const b of document.querySelectorAll("[data-up]"))b.addEventListener("click",()=>{
 const up=b.dataset.up;
 if(up==="power")power*=1.25;if(up==="health"){maxHp+=30;hp=Math.min(maxHp,hp+30);}
 if(up==="speed")speed*=1.15;
 ui.levelUp.classList.add("hidden");paused=false;ui.message.textContent="力量提升！繼續戰鬥";updateUI();
});

let joy={x:0,y:0,active:false},keys={};
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

// Camera and game loop
const clock=new THREE.Clock();
function animate(){
 requestAnimationFrame(animate);
 const dt=Math.min(clock.getDelta(),.04),t=clock.elapsedTime;
 if(!paused&&!gameEnded){
  attackCooldown=Math.max(0,attackCooldown-dt);skillCooldown=Math.max(0,skillCooldown-dt);invuln=Math.max(0,invuln-dt);
  mp=Math.min(maxMp,mp+dt*2.2);
  let x=joy.x+(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0);
  let z=joy.y+(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);
  const v=new THREE.Vector3(x,0,z);if(v.length()>1)v.normalize();
  if(v.lengthSq()>.01){player.position.addScaledVector(v,speed*dt);player.rotation.y=Math.atan2(v.x,v.z);}
  player.position.x=THREE.MathUtils.clamp(player.position.x,-25,25);player.position.z=THREE.MathUtils.clamp(player.position.z,-25,25);
  player.position.y=Math.sin(t*3)*.025;
  player.userData.cape.rotation.y=Math.sin(t*2.2)*.045;
  player.userData.cape.rotation.z=Math.sin(t*3.1)*.025;
  player.userData.sword.rotation.z=-.18+Math.sin(t*2.8)*.025;
  player.userData.aura.rotation.z=t*.8;
  if(autoAttack&&attackCooldown<=0){const e=nearestEnemy();if(e&&e.mesh.position.distanceTo(player.position)<3.1)attack();}
  for(const e of [...enemies]){
   const dir=player.position.clone().sub(e.mesh.position);dir.y=0;const d=dir.length();
   if(d>1.15){dir.normalize();e.mesh.position.addScaledVector(dir,e.speed*dt);e.mesh.rotation.y=Math.atan2(dir.x,dir.z);}
   else if(e.attack<=0){e.attack=1.1;if(invuln<=0){hp-=7;invuln=.45;burst(player.position.clone().add(new THREE.Vector3(0,1,0)),0xff334f,.5);if(hp<=0){hp=0;endGame();}}}
   e.attack=Math.max(0,e.attack-dt);
  }
  if(enemies.length<5&&Math.random()<dt*.55)spawnEnemy();
  for(const ef of [...effects]){
   ef.time-=dt;
   if(ef.kind==="burst")for(const p of ef.mesh.children){p.position.addScaledVector(p.userData.vel,dt);p.userData.vel.y-=4*dt;}
   if(ef.kind==="ring"){ef.mesh.scale.multiplyScalar(1+dt*1.6);}
   if(ef.time<=0){scene.remove(ef.mesh);effects.splice(effects.indexOf(ef),1);}
  }
  // Camera follows behind player, with a little damping.
  const behind=new THREE.Vector3(0,6.5,-9).applyAxisAngle(new THREE.Vector3(0,1,0),player.rotation.y);
  const desired=player.position.clone().add(behind);
  camera.position.lerp(desired,1-Math.exp(-4*dt));
  camera.lookAt(player.position.x,1.1,player.position.z);
  updateUI();
 }
 renderer.render(scene,camera);
}
animate();

addEventListener("resize",()=>{
 camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
 renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));
});
