import * as THREE from 'https://esm.sh/three@0.170.0';
import { GLTFLoader } from 'https://esm.sh/three@0.170.0/examples/jsm/loaders/GLTFLoader.js?external=three';
import { clone as cloneSkeleton } from 'https://esm.sh/three@0.170.0/examples/jsm/utils/SkeletonUtils.js?external=three';

// True real-time 3D scene. THREE is loaded as a classic global script for iOS WebView compatibility.
window.addEventListener('error', (event) => {
  const toast = document.querySelector('#toast');
  if (toast) {
    toast.textContent = '遊戲啟動錯誤：' + (event.message || 'JavaScript error');
    toast.classList.remove('fade');
    toast.classList.add('error');
  }
});
window.addEventListener('unhandledrejection', (event) => {
  const toast = document.querySelector('#toast');
  if (toast) {
    toast.textContent = '3D 載入失敗：' + String(event.reason || 'network error');
    toast.classList.remove('fade');
    toast.classList.add('error');
  }
});
const stage=document.querySelector('#stage');
window.__GAME_READY__=true;
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.35));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;stage.appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x100d14);scene.fog=new THREE.FogExp2(0x100d14,.018);
const camera=new THREE.PerspectiveCamera(36,innerWidth/innerHeight,.1,120);camera.position.set(0,13,18);camera.lookAt(0,0,0);
scene.add(new THREE.HemisphereLight(0x9a9bc4,0x25120e,1.55));
const moon=new THREE.DirectionalLight(0xb9b9ff,2.2);moon.position.set(-7,13,7);moon.castShadow=true;moon.shadow.mapSize.set(1536,1536);moon.shadow.camera.left=-18;moon.shadow.camera.right=18;moon.shadow.camera.top=18;moon.shadow.camera.bottom=-18;scene.add(moon);
const goldLight=new THREE.PointLight(0xff8b37,45,18,2);goldLight.position.set(-5,3,-4);scene.add(goldLight);
const violetLight=new THREE.PointLight(0x813dff,30,15,2);violetLight.position.set(4,2,1);scene.add(violetLight);
const mat=(c,metal=0,rough=.55,em=0)=>new THREE.MeshStandardMaterial({color:c,metalness:metal,roughness:rough,emissive:c,emissiveIntensity:em});
const stone=mat(0x28252c,.32,.82),edge=mat(0x66513c,.7,.42),gold=mat(0xd2a64f,.82,.28),darkGold=mat(0x73502d,.75,.4),armor=mat(0x211a2b,.75,.3),armor2=mat(0x44324f,.72,.29),purple=mat(0x812dff,.45,.22,.85),bone=mat(0xc4bca8,.18,.62),red=mat(0x741a2a,.12,.7),black=mat(0x09080c,.15,.7),firemat=new THREE.MeshBasicMaterial({color:0xff8a2a});
const floor=new THREE.Mesh(new THREE.PlaneGeometry(52,52),mat(0x17151b,.18,.92));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
// Textured crypt masonry: one shared instanced tile batch instead of hundreds of draw calls.
function makeStoneTexture(){
  const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');
  ctx.fillStyle='#39343a';ctx.fillRect(0,0,512,512);
  for(let i=0;i<18000;i++){const v=90+Math.random()*70;ctx.fillStyle=`rgba(${v},${v-5},${v+3},${Math.random()*.18})`;ctx.fillRect(Math.random()*512,Math.random()*512,1+Math.random()*3,1+Math.random()*3);}
  ctx.strokeStyle='rgba(8,6,10,.42)';ctx.lineWidth=3;
  for(let i=0;i<22;i++){let x=Math.random()*512,y=Math.random()*512;ctx.beginPath();ctx.moveTo(x,y);for(let j=0;j<4;j++){x+=(Math.random()-.5)*60;y+=Math.random()*35;ctx.lineTo(x,y);}ctx.stroke();}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1,1);t.colorSpace=THREE.SRGBColorSpace;return t;
}
const stoneTex=makeStoneTexture();
const tileGeo=new THREE.BoxGeometry(1.96,.16,1.96);
const tileMatA=new THREE.MeshStandardMaterial({map:stoneTex,color:0xaaa2a8,roughness:.94,metalness:.12});
const tileMatB=new THREE.MeshStandardMaterial({map:stoneTex,color:0x777078,roughness:.96,metalness:.08});
const tileA=new THREE.InstancedMesh(tileGeo,tileMatA,625),tileB=new THREE.InstancedMesh(tileGeo,tileMatB,625);
const dummy=new THREE.Object3D();let ia=0,ib=0;
for(let x=-24;x<=24;x+=2)for(let z=-24;z<=24;z+=2){dummy.position.set(x,-.08,z);dummy.rotation.y=((x+z)%4===0)?.012:0;dummy.updateMatrix();if(((x+z)/2)%2){tileA.setMatrixAt(ia++,dummy.matrix);}else{tileB.setMatrixAt(ib++,dummy.matrix);}}
tileA.count=ia;tileB.count=ib;tileA.receiveShadow=tileB.receiveShadow=true;scene.add(tileA,tileB);
// Inlaid crimson processional carpet with a woven gold border and repeating sigils.
const cc=document.createElement('canvas');cc.width=512;cc.height=256;const cx=cc.getContext('2d');
cx.fillStyle='#40101d';cx.fillRect(0,0,512,256);cx.strokeStyle='#c89a4b';cx.lineWidth=9;cx.strokeRect(12,12,488,232);cx.strokeStyle='#8e5d35';cx.lineWidth=3;cx.strokeRect(28,28,456,200);
for(let i=0;i<12;i++){cx.save();cx.translate(42+i*39,128);cx.rotate(Math.PI/4);cx.strokeStyle='#d5aa62';cx.lineWidth=4;cx.strokeRect(-10,-10,20,20);cx.restore();}
const carpetTex=new THREE.CanvasTexture(cc);carpetTex.colorSpace=THREE.SRGBColorSpace;
const carpet=new THREE.Mesh(new THREE.PlaneGeometry(8,18),new THREE.MeshStandardMaterial({map:carpetTex,roughness:.8,metalness:.18}));carpet.rotation.x=-Math.PI/2;carpet.position.set(0,.012,0);scene.add(carpet);
const ring=new THREE.Mesh(new THREE.TorusGeometry(4.5,.12,12,96),gold);ring.rotation.x=Math.PI/2;ring.position.y=.06;scene.add(ring);
for(let i=0;i<8;i++){const a=i*Math.PI/4;const g=new THREE.Group();g.position.set(Math.cos(a)*3.15,.1,Math.sin(a)*3.15);g.rotation.y=-a;const r=new THREE.Mesh(new THREE.BoxGeometry(.75,.06,.75),darkGold);g.add(r);const gem=new THREE.Mesh(new THREE.OctahedronGeometry(.22),purple);gem.position.y=.18;g.add(gem);scene.add(g);}
// gothic pillars, plinths and braziers around the arena
function pillar(x,z){const base=new THREE.Mesh(new THREE.CylinderGeometry(.9,1.05,.35,16),edge);base.position.set(x,.17,z);base.castShadow=true;scene.add(base);const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.52,.68,4,20),stone);shaft.position.set(x,2.25,z);shaft.castShadow=true;shaft.receiveShadow=true;scene.add(shaft);const capital=new THREE.Mesh(new THREE.BoxGeometry(1.55,.38,1.55),darkGold);capital.position.set(x,4.35,z);capital.castShadow=true;scene.add(capital);const flame=new THREE.Mesh(new THREE.IcosahedronGeometry(.27,1),firemat);flame.position.set(x,4.85,z);scene.add(flame);const light=new THREE.PointLight(0xff7a2b,38,9,2);light.position.set(x,4.7,z);scene.add(light);return {flame,light};}
const torches=[];for(const [x,z] of [[-9,-8],[9,-8],[-9,8],[9,8],[-13,0],[13,0]])torches.push(pillar(x,z));
// Monumental crypt perimeter: buttresses, ribbed arches, tomb plinths and hanging standards.
function arch(x,z,span=5,height=5){
  const curve=new THREE.CatmullRomCurve3([
    new THREE.Vector3(x-span/2,0,z),new THREE.Vector3(x-span/2,height*.72,z),
    new THREE.Vector3(x-span*.28,height,z),new THREE.Vector3(x,height*1.06,z),
    new THREE.Vector3(x+span*.28,height,z),new THREE.Vector3(x+span/2,height*.72,z),
    new THREE.Vector3(x+span/2,0,z)
  ]);
  const tube=new THREE.Mesh(new THREE.TubeGeometry(curve,48,.22,12,false),darkGold);tube.castShadow=true;scene.add(tube);
  for(const s of [-1,1]){const pil=new THREE.Mesh(new THREE.CylinderGeometry(.38,.5,height*.72,16),stone);pil.position.set(x+s*span/2,height*.36,z);pil.castShadow=true;pil.receiveShadow=true;scene.add(pil);
    const cap=new THREE.Mesh(new THREE.BoxGeometry(.95,.28,.95),gold);cap.position.set(x+s*span/2,height*.75,z);scene.add(cap);}
}
arch(-7,-18,7,5.5);arch(7,-18,7,5.5);arch(-18,0,6,4.8);arch(18,0,6,4.8);
function sarcophagus(x,z,rot=0){
  const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;
  const base=new THREE.Mesh(new THREE.BoxGeometry(2.2,.55,1.15),stone);base.position.y=.28;base.castShadow=true;base.receiveShadow=true;g.add(base);
  const lid=new THREE.Mesh(new THREE.BoxGeometry(2.35,.28,1.25),edge);lid.position.y=.68;lid.rotation.z=-.06;lid.castShadow=true;g.add(lid);
  const crest=new THREE.Mesh(new THREE.OctahedronGeometry(.28),purple);crest.position.set(0,.9,.02);g.add(crest);
  for(const s of [-1,1]){const band=new THREE.Mesh(new THREE.BoxGeometry(.08,.62,1.2),gold);band.position.set(s*.72,.42,0);g.add(band);}
  scene.add(g);
}
sarcophagus(-10,-5,.3);sarcophagus(10,-5,-.3);sarcophagus(-10,6,-.25);sarcophagus(10,6,.25);

// central broken obelisks and rubble
for(let i=0;i<18;i++){const a=i*2.399,r=8+Math.random()*10;const b=new THREE.Mesh(new THREE.DodecahedronGeometry(.35+Math.random()*.5,0),i%3?stone:edge);b.position.set(Math.cos(a)*r,.25,Math.sin(a)*r);b.rotation.set(Math.random(),Math.random(),Math.random());b.castShadow=true;scene.add(b);}
function box(parent,w,h,d,material,x,y,z){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function sphere(parent,r,material,x,y,z,sx=1,sy=1,sz=1){const m=new THREE.Mesh(new THREE.SphereGeometry(r,12,10),material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;parent.add(m);return m;}
function limb(parent,a,b,r1,r2,material){const v=new THREE.Vector3().subVectors(b,a),m=new THREE.Mesh(new THREE.CylinderGeometry(r2,r1,v.length(),8),material);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());m.castShadow=true;parent.add(m);return m;}

const gltfLoader = new GLTFLoader();
const ASSET_URLS = {
  hero: 'https://grab3d.com/dl/samurai-rigged/samurai-rigged.glb',
  skeleton: 'https://grab3d.com/dl/skeleton-warrior-rigged/skeleton-warrior-rigged.glb',
  orc: 'https://grab3d.com/dl/orc-rigged/orc-rigged.glb'
};
const assetPromises = {};
function loadGLB(url) {
  if (!assetPromises[url]) {
    assetPromises[url] = new Promise((resolve, reject) => {
      gltfLoader.load(url, resolve, undefined, reject);
    });
  }
  return assetPromises[url];
}
function recolorHero(model) {
  model.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach(m => {
      if (!m || !m.color) return;
      const c = m.color.clone(); const hsl = {};
      c.getHSL(hsl);
      // Preserve brass/gold; shift the red lacquer and dark cloth toward black-violet.
      if (hsl.h < .12 && hsl.s > .18 && hsl.l > .16) {
        m.color.set('#51406f');
        m.metalness = Math.max(m.metalness || 0, .62);
        m.roughness = Math.min(m.roughness || .5, .34);
      } else if (hsl.l < .22) {
        m.color.lerp(new THREE.Color('#24172f'), .38);
      }
      m.needsUpdate = true;
    });
  });
}
function makeCape(root) {
  const w=1.0,h=1.45,cols=10,rows=14,positions=[],uv=[],indices=[];
  for(let y=0;y<=rows;y++) for(let x=0;x<=cols;x++){
    const u=x/cols,v=y/rows;
    positions.push((u-.5)*(w*(.72+.48*v)), -v*h, -.25-.18*v);
    uv.push(u,1-v);
  }
  for(let y=0;y<rows;y++) for(let x=0;x<cols;x++){
    const a=y*(cols+1)+x,b=a+1,c=a+cols+1,d=c+1;
    indices.push(a,c,b,b,c,d);
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
  const cloth=new THREE.MeshStandardMaterial({color:0x78152b,roughness:.78,metalness:.05,side:THREE.DoubleSide});
  const cape=new THREE.Mesh(geo,cloth);cape.position.set(0,1.55,-.02);cape.castShadow=true;root.add(cape);
  const edgeGeo=new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(-.5,1.55,-.28),new THREE.Vector3(-.55,.95,-.39),new THREE.Vector3(-.68,.2,-.47)
  ]),18,.018,6,false);
  const trim=new THREE.Mesh(edgeGeo,gold);root.add(trim);
  return {mesh:cape,base:positions.slice()};
}
function makeGreatsword(root) {
  const g=new THREE.Group();g.position.set(.48,1.15,.18);g.rotation.set(.2,0,-.32);root.add(g);
  const steel=new THREE.MeshStandardMaterial({color:0x8e5bff,metalness:.82,roughness:.18,emissive:0x4b12a8,emissiveIntensity:.85});
  const goldMetal=new THREE.MeshStandardMaterial({color:0xd8b66a,metalness:.9,roughness:.22});
  const blade=new THREE.Mesh(new THREE.BoxGeometry(.17,1.22,.055),steel);blade.position.y=.72;g.add(blade);
  const ridge=new THREE.Mesh(new THREE.BoxGeometry(.035,1.16,.065),new THREE.MeshStandardMaterial({color:0xe2c7ff,metalness:.8,roughness:.16,emissive:0x9b55ff,emissiveIntensity:1.4}));ridge.position.set(0,.72,.035);g.add(ridge);
  const cross=new THREE.Mesh(new THREE.BoxGeometry(.58,.09,.12),goldMetal);cross.position.y=.08;g.add(cross);
  const grip=new THREE.Mesh(new THREE.CylinderGeometry(.055,.06,.38,12),new THREE.MeshStandardMaterial({color:0x28172f,metalness:.45,roughness:.45}));grip.position.y=-.14;g.add(grip);
  const pommel=new THREE.Mesh(new THREE.OctahedronGeometry(.1),goldMetal);pommel.position.y=-.36;g.add(pommel);
  return g;
}
function createKnight(){
  const root=new THREE.Group(),parts={};const rig={root,parts,mixer:null,model:null,action:null};
  const capeData=makeCape(root);parts.cape=capeData.mesh;parts.capeBase=capeData.base;
  parts.sword=makeGreatsword(root);parts.arms=[new THREE.Group(),new THREE.Group()];parts.legs=[new THREE.Group(),new THREE.Group()];
  const aura=new THREE.Mesh(new THREE.TorusGeometry(.9,.035,10,72),new THREE.MeshBasicMaterial({color:0x9b4cff,transparent:true,opacity:.75}));
  aura.rotation.x=Math.PI/2;aura.position.y=.05;root.add(aura);parts.aura=aura;
  loadGLB(ASSET_URLS.hero).then(gltf=>{
    const model=gltf.scene;recolorHero(model);
    const box3=new THREE.Box3().setFromObject(model),size=box3.getSize(new THREE.Vector3());
    const s=2.25/Math.max(size.y,.001);model.scale.setScalar(s);
    const center=box3.getCenter(new THREE.Vector3());model.position.set(-center.x*s,-box3.min.y*s,-center.z*s);
    model.rotation.y=0; // GLB +Z front faces the isometric camera
    root.add(model);rig.model=model;
    if(gltf.animations?.length){rig.mixer=new THREE.AnimationMixer(model);
      const walkClip=gltf.animations.find(a=>/walk/i.test(a.name))||gltf.animations[0];
      const runClip=gltf.animations.find(a=>/run/i.test(a.name))||walkClip;
      rig.actions={walk:rig.mixer.clipAction(walkClip),run:rig.mixer.clipAction(runClip)};
      rig.actions.walk.play();rig.activeAction=rig.actions.walk;
    }
    // Gold swept horns reinforce the user's chosen black-purple-gold warlord silhouette.
    const hornMat=new THREE.MeshStandardMaterial({color:0xe2bd67,metalness:.9,roughness:.2});
    for(const side of [-1,1]){
      const curve=new THREE.CatmullRomCurve3([
        new THREE.Vector3(side*.2,1.95,.03),new THREE.Vector3(side*.34,2.12,.02),
        new THREE.Vector3(side*.43,2.32,-.01),new THREE.Vector3(side*.36,2.52,-.04)
      ]);
      const horn=new THREE.Mesh(new THREE.TubeGeometry(curve,20,.065,10,false),hornMat);
      horn.castShadow=true;root.add(horn);
    }
    document.querySelector('#toast').textContent='高精度主角模型已載入，正在載入怪物與陵墓場景…';
  }).catch(err=>assetError('主角模型',err));
  return rig;
}
const hero=createKnight();hero.root.position.set(0,0,0);scene.add(hero.root);

const enemyAssets={0:ASSET_URLS.skeleton,1:ASSET_URLS.orc,2:ASSET_URLS.skeleton};
function createSkeleton(type=0){
  const root=new THREE.Group(),body=new THREE.Group(),sword=new THREE.Group();
  root.add(body);const scale=type===2?1.32:type===1?1.08:1;root.scale.setScalar(scale);
  const hpbg=new THREE.Mesh(new THREE.PlaneGeometry(1.05,.09),new THREE.MeshBasicMaterial({color:0x18080b,side:THREE.DoubleSide}));
  hpbg.position.y=2.5;root.add(hpbg);
  const hpfg=new THREE.Mesh(new THREE.PlaneGeometry(1.0,.055),new THREE.MeshBasicMaterial({color:type===2?0xb65cff:0xd52a37,side:THREE.DoubleSide}));
  hpfg.position.set(0,2.5,.015);root.add(hpfg);
  const e={root,body,sword,hpfg,hp:type===2?360:type===1?145:100,max:type===2?360:type===1?145:100,
    speed:type===2?1.0:type===1?1.25:1.5,damage:type===2?18:type===1?12:9,attack:0,phase:Math.random()*6,dead:false,type,mixer:null,model:null,action:null};
  loadGLB(enemyAssets[type]).then(gltf=>{
    const model=cloneSkeleton(gltf.scene);
    model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    const b=new THREE.Box3().setFromObject(model),sz=b.getSize(new THREE.Vector3()),s=1.95/Math.max(sz.y,.001);
    model.scale.setScalar(s);const c=b.getCenter(new THREE.Vector3());model.position.set(-c.x*s,-b.min.y*s,-c.z*s);
    if(type===2){model.scale.multiplyScalar(1.32);model.traverse(o=>{if(o.isMesh){const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>{if(m.color)m.color.lerp(new THREE.Color('#7651b6'),.2);});}});}
    root.add(model);e.model=model;
    if(gltf.animations?.length){e.mixer=new THREE.AnimationMixer(model);const clip=gltf.animations.find(a=>/walk|run/i.test(a.name))||gltf.animations[0];e.action=e.mixer.clipAction(clip);e.action.play();}
  }).catch(err=>assetError('怪物模型',err));
  return e;
}
function assetError(name,err){
  console.error(name,err);
  const t=document.querySelector('#toast');
  if(t){t.textContent=name+'載入失敗，請確認網路後重新整理';t.classList.remove('fade');t.classList.add('error');}
}
const particles=[]; // Runtime particle pool used by spells and combat effects.
const enemies=[];let kills=0,level=91,xp=0,hp=42198,maxHp=42198,mp=5621,maxMp=5621,power=1,moveSpeed=4.2,auto=true,elapsed=0,spawnClock=0,attackClock=0,skillClock=0,paused=false;
function spawnEnemy(){const a=Math.random()*Math.PI*2,r=8+Math.random()*5;const type=Math.random()<.12?2:Math.random()<.32?1:0;const e=createSkeleton(type);e.root.position.set(hero.root.position.x+Math.cos(a)*r,0,hero.root.position.z+Math.sin(a)*r);scene.add(e.root);enemies.push(e);}
for(let i=0;i<7;i++)spawnEnemy();
function floating(text,pos,crit=false){const v=pos.clone().project(camera),el=document.createElement('div');el.className='damage'+(crit?' crit':'');el.textContent=text;el.style.left=((v.x*.5+.5)*innerWidth)+'px';el.style.top=((-v.y*.5+.5)*innerHeight)+'px';document.querySelector('#damage').append(el);setTimeout(()=>el.remove(),1000);}
function burst(pos,color=0xb35aff,count=22){for(let i=0;i<count;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.045+Math.random()*.045,6,6),new THREE.MeshBasicMaterial({color,transparent:true}));m.position.copy(pos);scene.add(m);const vel=new THREE.Vector3((Math.random()-.5)*4,Math.random()*3,(Math.random()-.5)*4);particles.push({mesh:m,vel,life:.55+Math.random()*.45});}}
function nearest(){let best=null,d=1e9;for(const e of enemies){if(e.dead)continue;const n=e.root.position.distanceTo(hero.root.position);if(n<d){d=n;best=e;}}return best;}
function hitEnemy(e,amount){if(!e||e.dead)return;e.hp-=amount;const pos=e.root.position.clone().add(new THREE.Vector3(0,2.2,0));floating(Math.random()<.18?'Critical '+Math.round(amount*1.7):String(Math.round(amount)),pos,amount>40);burst(e.root.position.clone().add(new THREE.Vector3(0,1,0)),0xb66cff,10);if(e.hp<=0){e.dead=true;kills++;xp+=.18;if(xp>=100){xp=0;level++;paused=true;document.querySelector('#levelup').classList.remove('hidden');}document.querySelector('#kills').textContent=kills;document.querySelector('#questkills').textContent=kills;e.root.userData.death=0;}}
function doAttack(){const e=nearest();hero.parts.arms[1].rotation.x=-1.3;hero.parts.sword.rotation.x=-1.6;hero.parts.sword.rotation.z=-.8;burst(hero.root.position.clone().add(new THREE.Vector3(0,1.3,-.7)),0xa94cff,12);if(e&&e.root.position.distanceTo(hero.root.position)<3.2){const d=e.root.position.clone().sub(hero.root.position);hero.root.rotation.y=Math.atan2(d.x,d.z);hitEnemy(e,38*power);}}
function castSkill(){if(skillClock>0||mp<450)return;mp-=450;skillClock=5;const center=hero.root.position.clone();const ring=new THREE.Mesh(new THREE.TorusGeometry(3.7,.09,8,64),new THREE.MeshBasicMaterial({color:0xb75cff,transparent:true,opacity:.95}));ring.rotation.x=Math.PI/2;ring.position.set(center.x,.18,center.z);scene.add(ring);setTimeout(()=>scene.remove(ring),800);burst(center.clone().add(new THREE.Vector3(0,.7,0)),0xc07aff,95);for(const e of enemies)if(!e.dead&&e.root.position.distanceTo(center)<4.2)hitEnemy(e,155*power);}
function updateBars(){document.querySelector('#hpbar').style.width=(hp/maxHp*100)+'%';document.querySelector('#mpbar').style.width=(mp/maxMp*100)+'%';document.querySelector('#hptext').textContent=Math.round(hp)+' / '+maxHp;document.querySelector('#mptext').textContent=Math.round(mp)+' / '+maxMp;document.querySelector('#xpbar').style.width=xp+'%';document.querySelector('#xptext').textContent=xp.toFixed(2)+'%';document.querySelector('#level').textContent=level;}
let joy={x:0,y:0,active:false};const joyEl=document.querySelector('#joystick'),stick=document.querySelector('#stick');function setJoy(e){const r=joyEl.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,len=Math.hypot(dx,dy),m=35,x=len>m?dx/len*m:dx,y=len>m?dy/len*m:dy;joy.x=x/m;joy.y=y/m;stick.style.transform=`translate(${x}px,${y}px)`;}joyEl.addEventListener('pointerdown',e=>{joy.active=true;joyEl.setPointerCapture(e.pointerId);setJoy(e);});joyEl.addEventListener('pointermove',e=>{if(joy.active)setJoy(e);});function endJoy(){joy.active=false;joy.x=joy.y=0;stick.style.transform='translate(0,0)';}joyEl.addEventListener('pointerup',endJoy);joyEl.addEventListener('pointercancel',endJoy);
const keys={};addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if(e.code==='Space'){e.preventDefault();doAttack();}if(e.key.toLowerCase()==='q')castSkill();});addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
document.querySelector('#attack').addEventListener('pointerdown',e=>{e.preventDefault();doAttack();});document.querySelector('#skill').addEventListener('pointerdown',e=>{e.preventDefault();castSkill();});document.querySelector('#auto').addEventListener('click',e=>{auto=!auto;e.currentTarget.classList.toggle('active',auto);});document.querySelectorAll('[data-up]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.up==='power')power*=1.25;if(b.dataset.up==='health'){maxHp+=3000;hp=maxHp;}if(b.dataset.up==='speed')moveSpeed*=1.15;paused=false;document.querySelector('#levelup').classList.add('hidden');}));
let last=performance.now();const clock=new THREE.Clock();
function update(dt){if(paused)return;elapsed+=dt;spawnClock+=dt;attackClock-=dt;skillClock-=dt;const kx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),ky=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);let mx=joy.active?joy.x:kx,my=joy.active?joy.y:ky;const len=Math.hypot(mx,my);if(len>1){mx/=len;my/=len;}const moving=Math.hypot(mx,my)>.08;if(moving){hero.root.position.x+=mx*moveSpeed*dt;hero.root.position.z+=my*moveSpeed*dt;hero.root.rotation.y=Math.atan2(mx,my);}
if(hero.mixer){
  const desired=moving?'run':'walk';
  if(hero.actions && hero.activeAction!==hero.actions[desired]){
    hero.activeAction.fadeOut(.18);hero.actions[desired].reset().fadeIn(.18).play();hero.activeAction=hero.actions[desired];
  }
  hero.mixer.update(dt);
}
hero.parts.cape.rotation.x=-.05+(moving?Math.sin(elapsed*8)*.12:Math.sin(elapsed*1.8)*.035);
hero.parts.cape.rotation.z=moving?Math.sin(elapsed*6)*.07:Math.sin(elapsed*1.4)*.025;
hero.parts.aura.rotation.z=elapsed*.8;
hero.parts.sword.rotation.x=THREE.MathUtils.lerp(hero.parts.sword.rotation.x,0,dt*7);
hero.parts.sword.rotation.z=THREE.MathUtils.lerp(hero.parts.sword.rotation.z,moving?-.1:0,dt*4);
if(auto&&attackClock<=0){const e=nearest();if(e&&e.root.position.distanceTo(hero.root.position)<3.2){doAttack();attackClock=.85;}}
for(const e of [...enemies]){if(e.mixer)e.mixer.update(dt);if(e.dead){e.root.userData.death=(e.root.userData.death||0)+dt;e.root.rotation.z=Math.min(1.5,e.root.userData.death*2);e.root.position.y=-Math.min(.7,e.root.userData.death*.7);if(e.root.userData.death>1.1){scene.remove(e.root);enemies.splice(enemies.indexOf(e),1);}continue;}const dir=hero.root.position.clone().sub(e.root.position);const d=dir.length();if(d>1.5){dir.normalize();e.root.position.addScaledVector(dir,e.speed*dt);e.root.rotation.y=Math.atan2(dir.x,dir.z);e.body.rotation.x=Math.sin(elapsed*5+e.phase)*.01;}else{e.attack-=dt;if(e.attack<=0){e.attack=1.5;hp=Math.max(0,hp-e.damage);floating('-'+e.damage,hero.root.position.clone().add(new THREE.Vector3(0,2,0)));}}e.hpfg.scale.x=Math.max(.001,e.hp/e.max);e.hpfg.position.x=-(1-e.hp/e.max)*.43;}
if(spawnClock>1.6&&enemies.length<12){spawnClock=0;spawnEnemy();}for(const p of [...particles]){p.life-=dt;p.mesh.position.addScaledVector(p.vel,dt);p.vel.y-=3*dt;p.mesh.material.opacity=Math.max(0,p.life);if(p.life<=0){scene.remove(p.mesh);particles.splice(particles.indexOf(p),1);}}
// follow camera with smooth lag and slight movement framing
const target=new THREE.Vector3(hero.root.position.x,0,hero.root.position.z);camera.position.lerp(new THREE.Vector3(target.x,target.y+13,target.z+18),1-Math.pow(.001,dt));camera.lookAt(target.x,0,target.z);goldLight.intensity=40+Math.sin(elapsed*3)*5;violetLight.intensity=28+Math.sin(elapsed*4)*8;torches.forEach((t,i)=>{t.flame.scale.y=.8+Math.sin(elapsed*9+i)*.25;t.light.intensity=34+Math.sin(elapsed*8+i)*8;});updateBars();document.querySelector('#timer').textContent=new Date(elapsed*1000).toISOString().slice(14,19);}
function frame(){requestAnimationFrame(frame);const dt=Math.min(clock.getDelta(),.04);update(dt);renderer.render(scene,camera);}frame();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.35));});
Promise.all([loadGLB(ASSET_URLS.hero),loadGLB(ASSET_URLS.skeleton),loadGLB(ASSET_URLS.orc)]).then(()=>{
  const t=document.querySelector('#toast');if(t){t.textContent='高精度 3D 角色與怪物載入完成';setTimeout(()=>t.classList.add('fade'),2200);}
}).catch(err=>assetError('3D 資產',err));
updateBars();
