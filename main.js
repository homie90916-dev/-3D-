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

// Original stylized 3D interpretation of the requested dark dragon-like transformation.
function makeHalpas(){
  const root=new THREE.Group(); scene.add(root);
  const add=(geo,material,x,y,z,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0)=>{
    const m=new THREE.Mesh(geo,material); m.position.set(x,y,z); m.scale.set(sx,sy,sz); m.rotation.set(rx,ry,rz); m.castShadow=true; m.receiveShadow=true; root.add(m); return m;
  };
  const sphere=new THREE.SphereGeometry(1,16,12), cone=new THREE.ConeGeometry(1,1,8), cyl=new THREE.CylinderGeometry(1,1,1,10);
  add(sphere, dark,0,1.55,0,.48,.67,.32);
  add(sphere, armor,0,1.65,-.03,.43,.58,.34);
  add(sphere, silver,0,2.12,.02,.32,.35,.29);
  add(sphere, dark,0,2.16,.13,.29,.28,.25);
  // face plate and glowing eyes
  add(sphere,silver,0,2.12,.34,.24,.18,.09);
  add(sphere,eyeMat,-.12,2.22,.39,.045,.035,.025); add(sphere,eyeMat,.12,2.22,.39,.045,.035,.025);
  // crown horns
  add(cone,silver,-.22,2.48,-.01,.12,.55,.12,0,0,.35);
  add(cone,silver,.22,2.48,-.01,.12,.55,.12,0,0,-.35);
  add(cone,red,0,2.52,-.08,.09,.38,.09);
  // shoulder guards, arms, gauntlets
  for(const s of [-1,1]){
    add(sphere,silver,s*.48,1.9,0,.27,.22,.27,0,0,s*-.25);
    add(cone,armor,s*.55,2.04,-.02,.18,.45,.18,0,0,s*-.9);
    add(cyl,dark,s*.48,1.48,0,.13,.53,.13,0,0,s*-.08);
    add(sphere,silver,s*.48,1.17,.03,.16,.17,.16);
    // legs
    add(cyl,armor,s*.22,.67,0,.16,.72,.18,0,0,s*-.03);
    add(sphere,dark,s*.22,.25,.09,.2,.18,.3);
    add(cone,silver,s*.22,.08,.2,.13,.18,.13,Math.PI,0,0);
    // wing spars
    const wing=add(new THREE.BufferGeometry(),purple,s*.7,1.85,-.12,1,1,1);
    wing.geometry.dispose();
    const shape=new THREE.Shape();
    shape.moveTo(0,0); shape.quadraticCurveTo(s*.65,.45,s*1.25,.15);
    shape.lineTo(s*.78,-.35); shape.lineTo(s*.48,-.18); shape.lineTo(s*.25,-.62); shape.lineTo(0,-.3); shape.closePath();
    const wingMesh=new THREE.Mesh(new THREE.ShapeGeometry(shape),dark);
    wingMesh.position.set(s*.55,1.95,-.22); wingMesh.rotation.y=s*-.22; wingMesh.castShadow=true; root.add(wingMesh);
    const vein=new THREE.Mesh(new THREE.BoxGeometry(.035,1.3,.035),glow);
    vein.position.set(s*.92,1.8,-.16); vein.rotation.z=s*.4; root.add(vein);
  }
  // chest rune
  add(cone,glow,0,1.68,.36,.09,.32,.06,Math.PI,0,0);
  // tail
  const tail=add(cone,armor,0,.8,-.52,.17,.95,.17,Math.PI/2,0,0);
  tail.rotation.z=Math.PI/2;
  add(cone,silver,0,.8,-1.02,.16,.3,.16,Math.PI/2,0,0);
  // ground aura
  const aura=new THREE.Mesh(new THREE.TorusGeometry(.85,.035,8,48),glow);
  aura.rotation.x=Math.PI/2; aura.position.y=.04; root.add(aura);
  const aura2=new THREE.Mesh(new THREE.TorusGeometry(1.12,.012,6,48),purple);
  aura2.rotation.x=Math.PI/2; aura2.position.y=.045; root.add(aura2);
  root.userData={wingMeshes:root.children.filter(o=>o.geometry?.type==="ShapeGeometry"), aura};
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
  player.userData.wingMeshes.forEach((w,i)=>{w.rotation.y=(i%2?1:-1)*(.12+Math.sin(t*5)*.12);});
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
