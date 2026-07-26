(()=>{
  "use strict";
  // ================= I18N =================
  const L=window.GAME_DATA.L;
  let LANG='ru';
  const T=k=>L[LANG][k]||k;
  function applyLang(){
    const set=(id,key,html)=>{const el=document.getElementById(id);if(el){if(html)el.innerHTML=T(key);else el.textContent=T(key);}};
    set('warnTitle','warnTitle');set('warnBody','warnBody',true);set('warnTip','warnTip',true);set('warnBtn','warnBtn');
    set('gameTitle','gameTitle',true);set('startBody','startBody',true);set('startBtn','startBtn');
    if(window.__title){const gt=document.getElementById('gameTitle');
      if(gt)gt.innerHTML=window.__title;document.title=window.__title;}
    set('setTitle','setTitle');set('lblVol','lblVol');
    const LBL=LANG==='ru'?{lblSens:'Чувствительность мыши',lblFull:'Полный экран',lblSubs:'Субтитры',lblQuiet:'Тише скримеры',lblHints:'Подсказки во всех ночах'}
      :{lblSens:'Mouse sensitivity',lblFull:'Fullscreen',lblSubs:'Subtitles',lblQuiet:'Quieter jumpscares',lblHints:'Hints on all nights'};
    Object.keys(LBL).forEach(k=>{const el2=document.getElementById(k);if(el2)el2.textContent=LBL[k];});set('lblShake','lblShake');set('lblDiff','lblDiff');set('setBack','setBack');set('openSettings','openSettings');
    document.getElementById('hint').textContent=T('hint');
    const ms=document.getElementById('menuSub');if(ms)ms.textContent=T('menuSub');
    const dp=document.getElementById('dpTitle');if(dp)dp.textContent=T('dpTitle');
    const dh=document.getElementById('dpHint');if(dh)dh.textContent=T('dpHint');
    const dpts=document.querySelectorAll('.dpcard .dpt'),dpds=document.querySelectorAll('.dpcard .dpd');
    if(dpts.length===3){dpts[0].textContent=T('d1t');dpts[1].textContent=T('d2t');dpts[2].textContent=T('d3t');
      dpds[0].innerHTML=T('dp1');dpds[1].innerHTML=T('dp2');dpds[2].innerHTML=T('dp3');}
    const dts=document.querySelectorAll('#diffCards .dtitle'),dds=document.querySelectorAll('#diffCards .ddesc');
    if(dts.length===3){dts[0].textContent=T('d1t');dts[1].textContent=T('d2t');dts[2].textContent=T('d3t');
      dds[0].textContent=T('d1d');dds[1].textContent=T('d2d');dds[2].textContent=T('d3d');}
    const wt=document.querySelector('#win h1'),wp=document.querySelector('#win p'),wb=document.querySelector('#win button');
    if(wt)wt.textContent=T('winT');if(wp)wp.textContent=T('winP');if(wb)wb.textContent=T('again');
    try{refreshMenuXtra();}catch(e){}
    try{applyCustomLang();}catch(e){}
  }
  // ---- плавная смена стартовых экранов ----
  // ЕДИНСТВЕННАЯ точка управления экранами: виден ровно один
  const SCREENS=['lang','warn','diffpick','start'];
  function showScreen(id){
    SCREENS.forEach(sid=>{const el=document.getElementById(sid);
      if(!el)return;el.style.opacity='';el.style.transition='';el.style.zIndex='';
      el.style.display=(sid===id)?'flex':'none';});
  }
  function fadeSwap(fromId,toId){showScreen(toId);}
  document.querySelectorAll('.langBtn').forEach(b=>b.addEventListener('click',()=>{
    LANG=b.dataset.lang;applyLang();fadeSwap('lang','warn');
    audio();if(AC&&AC.state==='suspended')AC.resume();
    startMenuAmb(); // звук с самого начала — это первый жест, браузер его пропускает
  }));

  let HOURS=6, HOUR_SECONDS=42, EVENT_MIN=9, EVENT_MAX=16;
  let NIGHT=1;                                   // 1..3
  const NP=window.GAME_DATA.NIGHTS; // параметры ночей — в js/data.js
  const npc=()=>CUSTOM.active?CUSTOM.np:NP[Math.min(NIGHT,NP.length)-1];
  const CUSTOM={active:false,secret:false,np:{f:1,c:1},pool:null,all10:false};
  let unlocked6=false,unlocked7=false,unlockedCustom=false,gotStar=false,gotStar2=false,nightsBeaten=0,kindMenu=false;
  let seenIntro=false;

  const canvas=document.getElementById('c');
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=0.56;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x010206);scene.fog=new THREE.FogExp2(0x010206,0.115);
  const camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,0.03,50);

  // ---- player pose: lower bunk, BACK-LEFT CORNER ----
  const LIE ={pos:new THREE.Vector3(-1.75,1.05,1.0), pitch:0.12};
  const STAND={pos:new THREE.Vector3(0,1.55,-0.3), pitch:-0.02};  // stand up in the CENTRE of the room
  camera.position.copy(LIE.pos);

  const M=(c,r,o={})=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:r},o));
  const matWood=M(0x1c1710,1),matWall=M(0x23262e,0.95),matFar=M(0x2f3640,0.95),matFloor=M(0x14100c,1),
        matSheet=M(0xcfccc2,0.9),matDark=M(0x0f0d0b,1),matSkin=M(0x7c6353,0.85),matHair=M(0x090705,1),
        matFrame=M(0x2c2216,0.9,{metalness:0.1}),matDoor=M(0x171310,0.9);
  function box(w,h,d,mat,x,y,z,ry){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);if(ry)m.rotation.y=ry;scene.add(m);return m;}

  // ---- tight room  x:-2.4..2.4  z:-3.4..1.8 — OLD LOG CABIN walls ----
  box(4.8,0.1,5.2,matFloor,0,0,-0.8);box(4.8,0.1,5.2,matDark,0,2.6,-0.8);
  const LOG_R=0.19, LOG_STEP=0.36;
  function logMat(){const v=0.85+Math.random()*0.3;return M(new THREE.Color(0.16*v,0.115*v,0.075*v).getHex(),0.95);}
  function logRow(len,x,y,z,alongZ){
    const g=new THREE.Mesh(new THREE.CylinderGeometry(LOG_R,LOG_R,len,14),logMat());
    if(alongZ){g.rotation.x=Math.PI/2;}else{g.rotation.z=Math.PI/2;}
    g.position.set(x,y,z);scene.add(g);return g;}
  // LEFT wall (logs along z), split around the window opening (z:-0.15..0.95, y:0.85..2.05)
  for(let i=0;i<8;i++){const y=LOG_R+i*LOG_STEP;
    if(y>0.85&&y<2.05){logRow(2.45,-2.4,y,-2.175,true);logRow(0.85,-2.4,y,1.375,true);}
    else logRow(5.2,-2.4,y,-0.8,true);}
  // RIGHT wall
  for(let i=0;i<8;i++){const y=LOG_R+i*LOG_STEP;logRow(5.2,2.4,y,-0.8,true);}
  // FAR wall (logs along x), leaving the door opening (x:-0.5..0.5, y<2.1)
  for(let i=0;i<8;i++){const y=LOG_R+i*LOG_STEP;
    if(y<2.1){logRow(1.9,-1.45,y,-3.4,false);logRow(1.9,1.45,y,-3.4,false);}
    else logRow(4.8,0,y,-3.4,false);}
  // BACK wall behind player
  for(let i=0;i<8;i++){const y=LOG_R+i*LOG_STEP;logRow(4.8,0,y,1.8,false);}
  // corner posts to hide log ends
  [[-2.4,-3.4],[2.4,-3.4],[-2.4,1.8],[2.4,1.8]].forEach(p=>{
    const c=new THREE.Mesh(new THREE.CylinderGeometry(LOG_R*1.35,LOG_R*1.35,2.7,12),matWood);c.position.set(p[0],1.35,p[1]);scene.add(c);});
  // dark backing planes so gaps between logs don't show void
  box(0.02,2.6,5.2,matDark,2.58,1.3,-0.8); // right backing only — LEFT stays open for the window view
  // night sky backdrop far outside the window
  const sky=new THREE.Mesh(new THREE.PlaneGeometry(16,9),M(0x0e1626,1,{emissive:0x0e1626,emissiveIntensity:0.5}));
  sky.rotation.y=Math.PI/2;sky.position.set(-6.5,2.2,-0.5);scene.add(sky);
  box(4.9,2.6,0.02,matDark,0,1.3,-3.58);box(4.9,2.6,0.02,matDark,0,1.3,1.98);

  // ---- WINDOW on left wall, beside the player (reworked) ----
  const winG=new THREE.Group();winG.position.set(-2.36,1.45,0.4);
  const paneMat=M(0x2a4a68,0.15,{emissive:0x3a6088,emissiveIntensity:0.12,transparent:true,opacity:0.28,metalness:0.3});
  const pane=new THREE.Mesh(new THREE.PlaneGeometry(1.05,1.15),paneMat);pane.rotation.y=Math.PI/2;pane.name='window';winG.add(pane);
  // outer frame
  const fw=0.06;
  [[0,0.62,0,fw,1.2],[0,-0.62,0,fw,1.2],[0,0,0.57,1.28,fw],[0,0,-0.57,1.28,fw]].forEach(f=>{
    const m=new THREE.Mesh(new THREE.BoxGeometry(0.07,f[3],f[4]),matFrame);m.position.set(0,f[1],f[2]);winG.add(m);});
  // muntins (cross bars)
  const mv=new THREE.Mesh(new THREE.BoxGeometry(0.05,1.2,0.03),matFrame);winG.add(mv);
  const mh=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.03,1.1),matFrame);winG.add(mh);
  // sill
  const sill=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.05,1.3),matWood);sill.position.set(0.04,-0.64,0);winG.add(sill);
  scene.add(winG);
  // ---- world outside the window (bigger & brighter so it reads through the glass) ----
  const outMoon=new THREE.Mesh(new THREE.SphereGeometry(0.5,24,18),M(0xeaf0fb,1,{emissive:0xeaf0fb,emissiveIntensity:2.0}));
  outMoon.position.set(-4.2,2.0,0.3);scene.add(outMoon);
  const moonGlow=new THREE.Mesh(new THREE.SphereGeometry(0.9,24,18),M(0xbcd0ec,1,{emissive:0x9fb8dc,emissiveIntensity:0.5,transparent:true,opacity:0.25}));
  moonGlow.position.copy(outMoon.position);scene.add(moonGlow);
  const outLight=new THREE.PointLight(0xbcd0ec,1.3,8,2);outLight.position.set(-3.2,1.8,0.4);scene.add(outLight);
  // tree silhouettes outside, framed by the opening
  [[-3.6,-0.6],[-3.9,1.0],[-3.5,0.3]].forEach(p=>{
    const treeMat=M(0x161c26,1);const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.08,2.6,6),treeMat);trunk.position.set(p[0],1.3,p[1]);scene.add(trunk);
    for(let k=0;k<3;k++){const br=new THREE.Mesh(new THREE.ConeGeometry(0.45-k*0.11,0.65,7),treeMat);br.position.set(p[0],1.7+k*0.42,p[1]);scene.add(br);}});
  const sil=new THREE.Group();sil.position.set(-2.75,1.15,0.4);sil.visible=false;
  [-0.28,0.28].forEach(dz=>{const s=new THREE.Mesh(new THREE.SphereGeometry(0.5,12,10),matDark);s.scale.set(0.45,1.25,0.45);s.position.set(0,0,dz);sil.add(s);
    const h=new THREE.Mesh(new THREE.SphereGeometry(0.17,10,8),matDark);h.position.set(0,0.62,dz);sil.add(h);});
  scene.add(sil);

  // ---- DOOR centered far wall ----
  const doorG=new THREE.Group();doorG.position.set(0,1.02,-3.36);
  const jamb=x=>{const m=new THREE.Mesh(new THREE.BoxGeometry(0.07,2.1,0.1),matFrame);m.position.set(x,0,0.02);doorG.add(m);};
  jamb(-0.48);jamb(0.48);
  const lintel=new THREE.Mesh(new THREE.BoxGeometry(1.03,0.08,0.1),matFrame);lintel.position.set(0,1.05,0.02);doorG.add(lintel);
  scene.add(doorG);
  const doorPivot=new THREE.Group();doorPivot.position.set(-0.43,1.02,-3.36);
  const door=new THREE.Mesh(new THREE.BoxGeometry(0.86,2.0,0.06),matDoor);door.name='door';door.position.set(0.43,0,0);doorPivot.add(door);
  const knob=new THREE.Mesh(new THREE.SphereGeometry(0.04,10,10),M(0x554433,0.5,{metalness:0.6}));knob.position.set(0.75,-0.03,0.05);doorPivot.add(knob);
  scene.add(doorPivot);
  let doorAngle=0,doorTarget=0;
  const spill=new THREE.PointLight(0xffe6c0,0,5,2);spill.position.set(0,1.4,-3.6);scene.add(spill);
  // buff man
  const buff=new THREE.Group();buff.visible=false;buff.position.set(0,0,-3.7);
  (()=>{const t=new THREE.Mesh(new THREE.CylinderGeometry(0.36,0.3,1.15,12),matDark);t.position.set(0,1.2,0);buff.add(t);
    const h=new THREE.Mesh(new THREE.SphereGeometry(0.2,12,10),matDark);h.position.set(0,1.95,0);buff.add(h);
    [-0.44,0.44].forEach(x=>{const a=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.12,1.05,10),matDark);a.position.set(x,1.15,0);buff.add(a);});
    [-0.17,0.17].forEach(x=>{const l=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.14,1.1,10),matDark);l.position.set(x,0.55,0);buff.add(l);});})();
  scene.add(buff);
  // small skittering creature that crawls in on fast footsteps
  const creature=new THREE.Group();creature.visible=false;creature.position.set(0.25,0,-3.28);
  const cBody=new THREE.Mesh(new THREE.SphereGeometry(0.15,12,10),matDark);cBody.scale.set(1.25,0.65,1.5);cBody.position.y=0.14;creature.add(cBody);
  const cHead=new THREE.Mesh(new THREE.SphereGeometry(0.08,10,8),matDark);cHead.position.set(0,0.16,0.2);creature.add(cHead);
  const cEyeM=M(0x000000,1,{emissive:0xcc3333,emissiveIntensity:1});
  [-0.035,0.035].forEach(x=>{const e=new THREE.Mesh(new THREE.SphereGeometry(0.014,6,6),cEyeM);e.position.set(x,0.18,0.27);creature.add(e);});
  for(let li=0;li<6;li++){const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.008,0.2,5),matDark);
    const sn=li<3?-1:1;leg.position.set(sn*0.16,0.08,-0.12+(li%3)*0.14);leg.rotation.z=sn*0.9;creature.add(leg);}
  scene.add(creature);
  let creatureFlee=false;
  const creature2=new THREE.Group();creature2.visible=false;scene.add(creature2);
  {// аккуратная «груда мяса»: округлые бордовые доли + блестящие кишки-петли (не мерзко, стилизованно)
   const meat=M(0x7a1420,0.55,{emissive:0x8a1a24,emissiveIntensity:0.35});
   const gut=M(0xc85a6a,0.35,{emissive:0x9a3a48,emissiveIntensity:0.3});
   [[0,0,0,0.15],[0.09,0.02,0.05,0.11],[-0.08,0.01,-0.04,0.1],[0.02,0.07,-0.06,0.09]].forEach(l=>{
     const lobe=new THREE.Mesh(new THREE.SphereGeometry(l[3],12,10),meat);lobe.scale.set(1.1,0.9,1.2);lobe.position.set(l[0],l[1],l[2]);creature2.add(lobe);});
   // кишки — тор-петли сверху
   for(let k=0;k<3;k++){const loop=new THREE.Mesh(new THREE.TorusGeometry(0.05-k*0.008,0.018,8,14),gut);
     loop.position.set((k-1)*0.05,0.1+k*0.02,0.02);loop.rotation.set(Math.PI/2+k*0.4,k,0);creature2.add(loop);}
   // редкие янтарные «глазки» в мясе
   [[0.05,0.06,0.08],[-0.04,0.05,0.06]].forEach(e=>{const ey=new THREE.Mesh(new THREE.SphereGeometry(0.016,8,8),M(0x000000,1,{emissive:0xffcc33,emissiveIntensity:1.6}));ey.position.set(e[0],e[1],e[2]);creature2.add(ey);});}
  function squeal(){if(!AC)return;tone(1300,'sawtooth',0.3,0.22,420);setTimeout(()=>{if(AC)tone(900,'square',0.15,0.15,1500);},120);}

  // ---- reusable identical bunk bed ----
  function makeBunk(x,z){
    const g=new THREE.Group();g.position.set(x,0,z);
    [[-0.6,-1.3],[0.5,-1.3],[-0.6,1.3],[0.5,1.3]].forEach(p=>{const post=new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.045,2.1,8),matFrame);post.position.set(p[0],1.05,p[1]);g.add(post);});
    const l1=new THREE.Mesh(new THREE.BoxGeometry(1.15,0.14,2.7),matDark);l1.position.set(-0.05,0.5,0);g.add(l1);
    const l2=new THREE.Mesh(new THREE.BoxGeometry(1.15,0.14,2.7),matDark);l2.position.set(-0.05,1.55,0);g.add(l2);
    const l3=new THREE.Mesh(new THREE.BoxGeometry(1.05,0.12,2.6),matSheet);l3.position.set(-0.05,0.6,0);g.add(l3);
    scene.add(g);return g;
  }
  const playerBunk=makeBunk(-1.8,0.4);     // left, flush to wall
  playerBunk.scale.x=-1;
  const neighborBunk=makeBunk(1.8,-0.2);    // right, flush to wall, identical

  // ---- two nightstands flanking the door (opposite corners, away from beds) ----
  function nightstand(x,z){const g=new THREE.Group();g.position.set(x,0,z);
    const body=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.5,0.42),matFrame);body.position.y=0.42;g.add(body);
    const topp=new THREE.Mesh(new THREE.BoxGeometry(0.56,0.05,0.48),matWood);topp.position.y=0.69;g.add(topp);
    [[-0.2,-0.16],[0.2,-0.16],[-0.2,0.16],[0.2,0.16]].forEach(p=>{const l=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.34,0.05),matWood);l.position.set(p[0],0.17,p[1]);g.add(l);});
    
    scene.add(g);return g;}
  const nsL=nightstand(-1.7,-2.95);const nsR=nightstand(1.7,-2.95);
  // мини-отсылка №1: кекс с глазами на левой тумбочке
  const cup2=new THREE.Group();cup2.position.set(1.5,0.72,-2.95); // правая тумбочка, левый край
  const cbody=new THREE.Mesh(new THREE.CylinderGeometry(0.055,0.045,0.07,10),M(0xd88ab0,0.7));cbody.position.y=0.035;cbody.name='cupcake';cup2.add(cbody);
  const frost=new THREE.Mesh(new THREE.SphereGeometry(0.05,10,8),M(0xf2c9dd,0.6));frost.position.y=0.085;frost.name='cupcake';cup2.add(frost);
  const cherry=new THREE.Mesh(new THREE.SphereGeometry(0.016,8,8),M(0xc01818,0.5));cherry.position.y=0.135;cup2.add(cherry);
  [-0.02,0.02].forEach(x2=>{const ey2=new THREE.Mesh(new THREE.SphereGeometry(0.012,6,6),M(0xffffff,0.4,{emissive:0xffffff,emissiveIntensity:0.4}));
    ey2.position.set(x2,0.09,0.045);cup2.add(ey2);});
  scene.add(cup2);

  // ---- dressing: rug, ceiling lamp, picture frame (quality pass) ----
  const rug=new THREE.Mesh(new THREE.CylinderGeometry(1.0,1.0,0.02,24),M(0x2a1e1a,1));rug.position.set(0,0.06,-1.2);scene.add(rug);
  const rug2=new THREE.Mesh(new THREE.CylinderGeometry(0.7,0.7,0.021,24),M(0x38281f,1));rug2.position.set(0,0.065,-1.2);scene.add(rug2);
  const lampWire=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.012,0.5,6),matDark);lampWire.position.set(0,2.35,-1.2);scene.add(lampWire);
  const lampShade=new THREE.Mesh(new THREE.ConeGeometry(0.22,0.22,12,1,true),M(0x1a150f,0.9));lampShade.position.set(0,2.06,-1.2);scene.add(lampShade);
  const pic=new THREE.Mesh(new THREE.BoxGeometry(0.03,0.5,0.4),matFrame);pic.position.set(2.37,1.6,-2.2);scene.add(pic);
  const picIn=new THREE.Mesh(new THREE.PlaneGeometry(0.32,0.42),M(0x11151c,0.8));picIn.rotation.y=-Math.PI/2;picIn.position.set(2.35,1.6,-2.2);scene.add(picIn);
  // floor planks: seam lines over the floor
  for(let px=-2.0;px<=2.01;px+=0.4)box(0.015,0.012,5.2,matDark,px,0.061,-0.8);
  for(let pz=-3.0;pz<=1.61;pz+=1.15)box(4.8,0.012,0.015,matDark,0,0.062,pz);
  // volumetric-looking moonlight shaft from the window
  const shaft=new THREE.Mesh(new THREE.PlaneGeometry(1.15,2.6),
    new THREE.MeshBasicMaterial({color:0x9fc0e8,transparent:true,opacity:0.05,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false}));
  shaft.position.set(-1.55,1.15,0.4);shaft.rotation.y=Math.PI/2*0.92;shaft.rotation.z=-0.55;scene.add(shaft);

  // subtle cold rim light from the door side to separate silhouettes
  const rim=new THREE.PointLight(0x24304a,0.7,6,2);rim.position.set(0.6,1.9,-2.8);scene.add(rim);

  // ---- player's own bedding: feet ahead, hands near camera ----
  const duvet=new THREE.Mesh(new THREE.BoxGeometry(1.0,0.5,2.4),matSheet);duvet.position.set(-1.7,0.6,0.4);scene.add(duvet);
  const handG=new THREE.Group();scene.add(handG);
  function hand(x){const g=new THREE.Group();g.position.set(x,0.90,0.35);
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.12,0.06,0.2),matSkin));
    for(let i=0;i<4;i++){const f=new THREE.Mesh(new THREE.BoxGeometry(0.025,0.04,0.12),matSkin);f.position.set(-0.045+i*0.03,0,0.15);g.add(f);}
    const arm=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.07,0.5,8),matSkin);arm.rotation.x=Math.PI/2;arm.position.set(0,0,0.32);g.add(arm);
    // upper arm + shoulder reaching back past the camera plane — no more severed arms when you turn
    const arm2=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.09,0.45,8),matSkin);arm2.rotation.x=Math.PI/2;arm2.position.set(0,0.02,0.74);g.add(arm2);
    const shld=new THREE.Mesh(new THREE.SphereGeometry(0.11,12,10),matSkin);shld.position.set(0,0.04,0.98);g.add(shld);
    handG.add(g);}
  hand(-2.05);hand(-1.35);
  // blanket over the chest, right under your chin
  const chest=new THREE.Mesh(new THREE.SphereGeometry(0.42,16,12),matSheet);chest.scale.set(1.15,0.5,0.8);chest.position.set(-1.7,0.86,0.95);scene.add(chest);

  // ---- neighbor (fat boy) in neighbor bunk, back turned ----
  const boy=new THREE.Group();boy.position.set(1.78,0.68,-0.1);
  // body under blanket (heavy build, lying on side)
  const shoulder=new THREE.Mesh(new THREE.SphereGeometry(0.42,20,16),matSheet);shoulder.scale.set(0.85,0.75,0.9);shoulder.position.set(0,0.22,0.3);boy.add(shoulder);
  const belly=new THREE.Mesh(new THREE.SphereGeometry(0.5,20,16),matSheet);belly.scale.set(0.95,0.72,1.1);belly.position.set(0,0.16,-0.25);boy.add(belly);
  const hipM=new THREE.Mesh(new THREE.SphereGeometry(0.44,18,14),matSheet);hipM.scale.set(0.9,0.72,0.9);hipM.position.set(0,0.14,-0.85);boy.add(hipM);
  const legs=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.16,0.7,12),matSheet);legs.rotation.x=Math.PI/2;legs.position.set(0,0.05,-1.35);boy.add(legs);
  const armUp=new THREE.Mesh(new THREE.CylinderGeometry(0.055,0.06,0.36,10),matSkin);armUp.rotation.z=1.1;armUp.position.set(0.05,0.42,0.18);boy.add(armUp);
  const armLo=new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.055,0.34,10),matSkin);armLo.rotation.z=0.35;armLo.rotation.x=0.4;armLo.position.set(0.22,0.3,0.02);boy.add(armLo);
  const handB=new THREE.Mesh(new THREE.SphereGeometry(0.06,10,8),matSkin);handB.scale.set(1,0.7,1.2);handB.position.set(0.3,0.22,-0.1);handB.name='boyhand';boy.add(handB);
  // HEAD GROUP with a neck pivot — it turns toward the player, not the body
  const headG=new THREE.Group();headG.position.set(0,0.4,0.6);boy.add(headG);
  const neckB=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.11,0.12,10),matSkin);neckB.rotation.x=0.35;neckB.position.set(0,-0.04,-0.05);headG.add(neckB);
  const bHead=new THREE.Mesh(new THREE.SphereGeometry(0.21,20,16),matSkin);bHead.scale.set(0.95,1.0,1.05);bHead.position.set(0,0.04,0.08);headG.add(bHead);
  const ear=new THREE.Mesh(new THREE.SphereGeometry(0.045,8,8),matSkin);ear.scale.set(0.5,1,0.8);ear.position.set(0.19,0.05,0.08);headG.add(ear);
  const earL=ear.clone();earL.position.x=-0.19;headG.add(earL);
  const bHair=new THREE.Mesh(new THREE.SphereGeometry(0.215,20,16,0,6.28,0,Math.PI*0.55),matHair);bHair.position.set(0,0.07,0.06);bHair.rotation.x=-0.35;headG.add(bHair);
  const nape=new THREE.Mesh(new THREE.SphereGeometry(0.1,10,8),matHair);nape.scale.set(1.4,0.6,0.8);nape.position.set(0,-0.02,-0.02);headG.add(nape);
  // ---- лицо: асимметричное, одутловатое, с деталями ----
  const matSkinDark=M(0x8a6a58,0.85);       // тени, впадины
  const matSkinPale=M(0xc4a894,0.8);        // бледные выступы
  // тяжёлые надбровные дуги, левая ниже правой
  [[-1,0.105,0.02],[1,0.118,-0.01]].forEach(([sn,by,tilt])=>{
    const br=new THREE.Mesh(new THREE.SphereGeometry(0.055,10,8),matSkinDark);
    br.scale.set(1.5,0.55,0.7);br.position.set(sn*0.075,by,0.245);br.rotation.z=sn*0.18+tilt;headG.add(br);});
  // глубокие глазницы
  [[-1,0.072],[1,0.082]].forEach(([sn,ey])=>{
    const soc=new THREE.Mesh(new THREE.SphereGeometry(0.045,10,8),matSkinDark);
    soc.scale.set(1.15,1.0,0.55);soc.position.set(sn*0.072,ey,0.245);headG.add(soc);});
  // мешки под глазами
  [[-1,0.032],[1,0.042]].forEach(([sn,ey])=>{
    const bag=new THREE.Mesh(new THREE.SphereGeometry(0.038,10,8),matSkinPale);
    bag.scale.set(1.3,0.6,0.5);bag.position.set(sn*0.072,ey,0.252);headG.add(bag);});
  // кривой нос из двух частей: горбинка и кончик вбок
  const noseB=new THREE.Mesh(new THREE.SphereGeometry(0.032,10,8),matSkin);
  noseB.scale.set(0.85,1.35,1.1);noseB.position.set(0.006,0.045,0.275);headG.add(noseB);
  const noseT=new THREE.Mesh(new THREE.SphereGeometry(0.028,10,8),matSkinPale);
  noseT.scale.set(1.1,0.85,1.2);noseT.position.set(0.014,0.012,0.295);headG.add(noseT);
  [[-1,0.006],[1,0.026]].forEach(([sn,nx])=>{const nos=new THREE.Mesh(new THREE.SphereGeometry(0.016,8,8),matSkinDark);
    nos.scale.set(0.8,0.7,0.8);nos.position.set(sn*0.026+nx*0.3,0.006,0.288);headG.add(nos);});
  // обвисшие щёки разного размера
  const cheekL=new THREE.Mesh(new THREE.SphereGeometry(0.085,12,10),matSkin);
  cheekL.scale.set(1.15,1.05,0.62);cheekL.position.set(-0.088,-0.028,0.225);headG.add(cheekL);
  const cheekR=new THREE.Mesh(new THREE.SphereGeometry(0.072,12,10),matSkin);
  cheekR.scale.set(1.1,0.95,0.6);cheekR.position.set(0.09,-0.012,0.225);headG.add(cheekR);
  // второй подбородок и приоткрытый кривой рот
  const jowl=new THREE.Mesh(new THREE.SphereGeometry(0.088,12,10),matSkin);
  jowl.scale.set(1.35,0.72,0.75);jowl.position.set(0.004,-0.088,0.19);headG.add(jowl);
  const mouth=new THREE.Mesh(new THREE.SphereGeometry(0.042,10,8),M(0x2a1418,0.9));
  mouth.scale.set(1.45,0.5,0.45);mouth.position.set(-0.008,-0.052,0.268);mouth.rotation.z=0.14;headG.add(mouth);
  const lipU=new THREE.Mesh(new THREE.SphereGeometry(0.038,10,8),matSkinPale);
  lipU.scale.set(1.5,0.32,0.5);lipU.position.set(-0.006,-0.03,0.272);lipU.rotation.z=0.12;headG.add(lipU);
  // редкие зубы
  [-0.022,0.004,0.028].forEach((tx,i)=>{const th=new THREE.Mesh(new THREE.BoxGeometry(0.012,0.016-i*0.002,0.008),M(0xc8bda2,0.6));
    th.position.set(tx,-0.048,0.286);th.rotation.z=0.12+i*0.05;headG.add(th);});
  // залысины и жидкие пряди поверх волос
  for(let k=0;k<7;k++){const str=new THREE.Mesh(new THREE.CylinderGeometry(0.006,0.003,0.09,5),matHair);
    const ang=-0.9+k*0.3;str.position.set(Math.sin(ang)*0.14,0.145,0.06+Math.cos(ang)*0.05);
    str.rotation.set(0.5,ang,Math.sin(ang)*0.4);headG.add(str);}
  // уши разной высоты (правое оттопырено)
  ear.position.set(0.198,0.038,0.07);ear.scale.set(0.55,1.1,0.85);ear.rotation.z=-0.2;
  earL.position.set(-0.185,0.058,0.075);earL.scale.set(0.45,0.95,0.75);
  // глаза: разного размера, левый чуть косит
  const eyeMat=M(0x0a0608,1,{emissive:0x992222,emissiveIntensity:0});
  const eyeL=new THREE.Mesh(new THREE.SphereGeometry(0.036,10,8),eyeMat);eyeL.position.set(-0.072,0.072,0.268);headG.add(eyeL);
  const eyeR=new THREE.Mesh(new THREE.SphereGeometry(0.028,10,8),eyeMat);eyeR.position.set(0.075,0.084,0.264);headG.add(eyeR);
  // веки, полуприкрывающие глаза
  [[-1,0.072,0.089,0.04],[1,0.075,0.099,0.032]].forEach(([sn,lx,ly,lr])=>{
    const lid=new THREE.Mesh(new THREE.SphereGeometry(lr,10,8),matSkin);
    lid.scale.set(1.25,0.5,0.5);lid.position.set(sn*lx,ly,0.264);lid.rotation.z=sn*0.12;headG.add(lid);});
  headG.rotation.y=Math.PI/2;  // face buried toward the wall — back of head to the player
  scene.add(boy);
  const sleeper2=new THREE.Mesh(new THREE.SphereGeometry(0.55,14,12),matDark);sleeper2.scale.set(0.8,0.6,1.5);sleeper2.position.set(-1.75,1.7,0.4);scene.add(sleeper2);
  // едва заметный призрак — сидит на краю верхней койки соседа, болтает ногами (пасхалка 1989)
  const gMat=new THREE.MeshStandardMaterial({color:0xbfc6cf,transparent:true,opacity:0.14,roughness:1,emissive:0x9aa4b4,emissiveIntensity:0.22,depthWrite:false});
  const ghost=new THREE.Group();ghost.visible=false;ghost.position.set(1.22,1.8,-0.2);scene.add(ghost);
  const gTorso=new THREE.Mesh(new THREE.SphereGeometry(0.2,12,10),gMat);gTorso.scale.set(0.75,1.05,0.55);gTorso.position.y=0.14;ghost.add(gTorso);
  const gHead=new THREE.Mesh(new THREE.SphereGeometry(0.12,12,10),gMat);gHead.position.y=0.45;ghost.add(gHead);
  const ghostLegA=new THREE.Group(),ghostLegB=new THREE.Group();
  [[ghostLegA,0.07],[ghostLegB,-0.07]].forEach(([lg,dz])=>{lg.position.set(-0.12,0.0,dz);
    const th=new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.04,0.42,8),gMat);th.position.y=-0.21;lg.add(th);ghost.add(lg);});
  ghost.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}}); // призрак не отбрасывает тень

  // ---- lights ----
  scene.add(new THREE.AmbientLight(0x0d1017,0.3));
  const moon=new THREE.PointLight(0x8db2dc,1.7,8,2.2);moon.position.set(-2.0,1.7,0.4);moon.castShadow=true;
  moon.shadow.mapSize.set(512,512);moon.shadow.bias=-0.001;scene.add(moon);
  scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  const fill=new THREE.PointLight(0x2a3550,0.65,7,2);fill.position.set(0,2.1,-1.0);scene.add(fill);

  // ================= FILE SFX (assets/) =================
  const SFX={};
  function loadSfx(key,file,loop){const a=new Audio('assets/'+file);a.preload='auto';a.loop=!!loop;
    a._ok=false;a.addEventListener('canplaythrough',()=>a._ok=true,{once:true});
    a.addEventListener('error',()=>a._ok=false);SFX[key]=a;}
  loadSfx('night','67df2ab96dead2d.mp3');
  loadSfx('scream1','Scream1.mp3');
  loadSfx('scream2','Scream2.mp3');
  loadSfx('nature','Allgoodbro.mp3',true);
  loadSfx('intro','intro.mp3');   // обучающий голос в начале игры
  loadSfx('voice','intro_voice.mp3'); // друг пришлёт голосовое — положи под этим именем
  loadSfx('show','WhoisrunningtheShow.mpeg'); // пасхалка 5-7-0-5-7
  loadSfx('murr','Murr.mp3'); // пасхалка-котик
  loadSfx('s67','676767.mp3'); // пасхалка 6-7-0-6-7
  loadSfx('palata','Palata13.mp3'); // фон истинной концовки
  loadSfx('krank','C418 - zweitonegoismus - 06 krank.mp3'); // фон титров
  loadSfx('ohno','Oh-noooo.mp3',true);          // музыка погони (зациклена)
  loadSfx('gm','Goodmorninglastochka.mp3');     // рассвет в концовке
  loadSfx('acc','Acceptance.mp3',true);          // полароиды и титры
  loadSfx('zapkill','lightning-noisy-sharp.mp3');           // смертельный удар (с 2-й секунды)
  loadSfx('thunder','lightning-bolt-thunder-crack.mp3');    // обычные раскаты (первые 3 сек)
  loadSfx('chrain','03eab7e91eeb035.mp3',true);             // дождь в хронике
  loadSfx('reka','Reka.mp3',true);                          // река
  function playSfx(key,vol){const a=SFX[key];if(!a||!a._ok)return false;
    try{a.currentTime=0;a.volume=Math.max(0,Math.min(1,(vol||1)*(SET?SET.vol/0.55:1)));a.play().catch(()=>{});return true;}catch(e){return false;}}
  function fadeSfx(key,ms){const a=SFX[key];if(!a||!a._ok)return;const v0=a.volume||1,t0=performance.now();
    (function f(){const pr=(performance.now()-t0)/ms;
      if(pr>=1){try{a.pause();a.currentTime=0;}catch(e){}a.volume=v0;return;}
      try{a.volume=Math.max(0,v0*(1-pr));}catch(e){}requestAnimationFrame(f);})();}
  function stopSfx(key){const a=SFX[key];if(a){try{a.pause();a.currentTime=0;}catch(e){}}}

  // ================= INTRO CUTSCENE WORLD (лес и домики, спрятан ниже сцены) =================
  const cutG=new THREE.Group();cutG.position.set(0,-60,0);scene.add(cutG);
  (function buildCut(){
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(60,80),M(0x0d1410,1));ground.rotation.x=-Math.PI/2;cutG.add(ground);
    const path=new THREE.Mesh(new THREE.PlaneGeometry(2.2,80),M(0x1a1712,1));path.rotation.x=-Math.PI/2;path.position.y=0.01;cutG.add(path);
    const cTree=M(0x101a14,1),cTrunk=M(0x171310,1);
    for(let i=0;i<46;i++){const sx=(Math.random()<0.5?-1:1)*(2.2+Math.random()*8),sz=18-i*1.6-Math.random()*1.2;
      const tr=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.14,2.6,6),cTrunk);tr.position.set(sx,1.3,sz);cutG.add(tr);
      for(let k=0;k<3;k++){const c=new THREE.Mesh(new THREE.ConeGeometry(1.0-k*0.25,1.5,7),cTree);c.position.set(sx,2.2+k*0.9,sz);cutG.add(c);}}
    // домики вдоль тропы
    [[-4.5,8],[4.8,2],[-5.0,-5],[4.5,-11]].forEach((pos,i)=>{
      const hb=new THREE.Mesh(new THREE.BoxGeometry(2.6,1.8,3.2),M(0x201812,0.95));hb.position.set(pos[0],0.9,pos[1]);cutG.add(hb);
      const roof=new THREE.Mesh(new THREE.ConeGeometry(2.4,1.2,4),M(0x14100c,1));roof.rotation.y=Math.PI/4;roof.position.set(pos[0],2.4,pos[1]);cutG.add(roof);
      if(i===1||i===3){const win=new THREE.Mesh(new THREE.PlaneGeometry(0.5,0.4),M(0x0,1,{emissive:0xd8a24a,emissiveIntensity:1.6}));
        win.position.set(pos[0]-1.31,1.1,pos[1]);win.rotation.y=-Math.PI/2;cutG.add(win);}});
    const cMoon=new THREE.Mesh(new THREE.SphereGeometry(0.8,20,16),M(0xeaf0fb,1,{emissive:0xeaf0fb,emissiveIntensity:1.8}));cMoon.position.set(6,11,-30);cutG.add(cMoon);
    const cLight=new THREE.PointLight(0x9fb8dc,3.0,40,1.6);cLight.position.set(3,9,-8);cutG.add(cLight);
    const cAmb=new THREE.AmbientLight(0x1c2636,1.15);cutG.add(cAmb);
    // тёплые напольные лампы вдоль тропы
    [[1.5,11],[-1.5,4],[1.5,-3],[-1.5,-10]].forEach(lp=>{
      const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.05,1.35,8),M(0x14100c,1));pole.position.set(lp[0],0.675,lp[1]);cutG.add(pole);
      const bulb=new THREE.Mesh(new THREE.SphereGeometry(0.1,10,8),M(0xffd9a0,1,{emissive:0xffc470,emissiveIntensity:1.8}));bulb.position.set(lp[0],1.42,lp[1]);cutG.add(bulb);
      const gl=new THREE.PointLight(0xd8a24a,1.25,6.5,2);gl.position.set(lp[0],1.5,lp[1]);cutG.add(gl);});
  })();
  const CUT={active:false,t:0,dur:38};
  const SUBS=window.GAME_DATA.SUBS;
  function setSubs(t){const el=document.getElementById('subs');if(!SET.subs){el.textContent='';return;}let line='';
    if(LANG!=='ru')for(const sb of SUBS)if(t>=sb[0]&&t<=sb[1]){line=sb[2];break;}  // англ. версия — без голоса, с субтитрами
    el.textContent=line;}
  function startCutscene(){
    CUT.active=true;CUT.t=0;
    ['lboxT','lboxB','subs','skipCut'].forEach(id=>document.getElementById(id).style.display='block');
    playSfx('nature',0.65);if(!playSfx('intro',1))playSfx('voice',1);   // обучение; если файла нет — старое голосовое // голосовое друга, если уже лежит в assets
  }
  function endCutscene(){
    if(!CUT.active)return;CUT.active=false;seenIntro=true;
    ['lboxT','lboxB','subs','skipCut'].forEach(id=>document.getElementById(id).style.display='none');
    stopSfx('nature');stopSfx('voice');
    showNightCard();
  }
  function drawInterPic(n){ // полароид с портретом нового гостя
    const c=document.getElementById('interPic'),g=c.getContext('2d');
    const W=c.width,H2=c.height-40;
    g.fillStyle='#efe9d8';g.fillRect(0,0,W,c.height);
    g.fillStyle='#14161c';g.fillRect(8,8,W-16,H2-8);
    g.save();g.translate(8,8);const w=W-16,h=H2-16;
    if(n===0){ // ТВАРЬ: смазанный кадр — хитиновый ком, янтарные глазки, царапины
      g.fillStyle='#221318';g.beginPath();g.ellipse(w*0.5,h*0.62,w*0.22,h*0.16,0,0,7);g.fill();
      g.fillStyle='#ffb340';[[-0.06,0],[0.06,0],[0,-0.05],[-0.12,-0.03],[0.12,-0.03]].forEach(e=>{
        g.beginPath();g.arc(w*(0.5+e[0]),h*(0.56+e[1]),3,0,7);g.fill();});
      g.strokeStyle='#6a5a48';g.lineWidth=2;
      for(let i=0;i<4;i++){g.beginPath();g.moveTo(w*0.2+i*10,h*0.9);g.lineTo(w*0.26+i*10,h*0.72);g.stroke();}
      g.strokeStyle='rgba(200,195,178,0.25)';for(let i=0;i<6;i++){g.beginPath();
        g.moveTo(0,Math.random()*h);g.lineTo(w,Math.random()*h);g.stroke();}}
    else if(n===1){ // СОСЕД: кровать сбоку, круглая голова повёрнута, красные точки глаз
      g.strokeStyle='#8a8f96';g.lineWidth=2;g.strokeRect(w*0.15,h*0.55,w*0.7,h*0.3);
      g.fillStyle='#3a3f48';g.beginPath();g.ellipse(w*0.5,h*0.55,w*0.28,h*0.14,0,Math.PI,0);g.fill();
      g.fillStyle='#524238';g.beginPath();g.arc(w*0.72,h*0.46,h*0.11,0,7);g.fill();
      g.fillStyle='#c94444';[[-0.03],[0.03]].forEach(e=>{
        g.beginPath();g.arc(w*(0.72+e[0]),h*0.46,2.4,0,7);g.fill();});}
    else if(n===2){ // БАБАЙКА: щель под кроватью, пара глаз, красные края
      g.strokeStyle='#8a8f96';g.lineWidth=3;
      g.strokeRect(w*0.12,h*0.25,w*0.76,h*0.35);
      [[0.16],[0.8]].forEach(x=>{g.beginPath();g.moveTo(w*x[0],h*0.6);g.lineTo(w*x[0],h*0.9);g.stroke();});
      g.fillStyle='#000';g.fillRect(w*0.16,h*0.62,w*0.66,h*0.26);
      g.fillStyle='#ffd23e';[[-0.05],[0.05]].forEach(e=>{
        g.beginPath();g.arc(w*(0.5+e[0]),h*0.75,3.4,0,7);g.fill();});
      const rg=g.createLinearGradient(0,0,0,h);rg.addColorStop(0,'rgba(150,0,0,0)');rg.addColorStop(1,'rgba(150,0,0,0.35)');
      g.fillStyle=rg;g.fillRect(0,0,w,h);}
    else{ // ПРЕДУПРЕЖДЕНИЕ: все пятеро в ряд, силуэтами
      const sil5=[[0.14,0.32,0.05],[0.32,0.5,0.09],[0.5,0.42,0.075],[0.68,0.55,0.1],[0.86,0.46,0.07]];
      sil5.forEach((p2,i)=>{g.fillStyle='#2b2f38';
        g.beginPath();g.ellipse(w*p2[0],h*0.72,w*0.055,h*(0.95-p2[1]),0,0,7);g.fill();
        g.beginPath();g.arc(w*p2[0],h*p2[1],h*p2[2],0,7);g.fill();
        g.fillStyle=i%2?'#c94444':'#ffb340';
        g.beginPath();g.arc(w*p2[0]-3,h*p2[1],1.8,0,7);g.fill();
        g.beginPath();g.arc(w*p2[0]+3,h*p2[1],1.8,0,7);g.fill();});}
    g.restore();
  }
  function showIntermission(){ // рассвет + поднимающийся обрывок газеты с текстом о новом госте
    const iv=document.getElementById('inter'),it=document.getElementById('interText');
    const ipx=document.getElementById('interPic');if(ipx)ipx.style.display='none';
    const lines=window.GAME_DATA.INTER[LANG][NIGHT-2]||[];
    iv.style.display='flex';it.style.opacity=0;it.textContent='';
    // канвас рассвета на фоне интермедии
    let bg=document.getElementById('interSky');
    if(!bg){bg=document.createElement('canvas');bg.id='interSky';
      bg.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:0;';
      iv.insertBefore(bg,iv.firstChild);}
    bg.style.display='block';
    const g=bg.getContext('2d');
    stopSfx('nature');if(!playSfx('gm',0.75))playSfx('nature',0.6); // тот же звук, что и в концовке
    const t0=performance.now();let alive=true;
    (function rise(nw){if(!alive)return;const t=(nw-t0)/1000,pr=Math.min(1,t/9);
      bg.width=innerWidth;bg.height=innerHeight;const W=bg.width,H=bg.height;
      const ease=pr*pr*(3-2*pr);
      const mix=(a,b2,x)=>[Math.round(a[0]+(b2[0]-a[0])*x),Math.round(a[1]+(b2[1]-a[1])*x),Math.round(a[2]+(b2[2]-a[2])*x)];
      const rgb=c=>'rgb('+c[0]+','+c[1]+','+c[2]+')';
      const sky=g.createLinearGradient(0,0,0,H*0.7);
      sky.addColorStop(0,rgb(mix([22,16,32],[128,170,205],ease)));
      sky.addColorStop(0.6,rgb(mix([104,36,44],[240,190,150],ease)));
      sky.addColorStop(1,rgb(mix([170,62,38],[252,226,186],ease)));
      g.fillStyle=sky;g.fillRect(0,0,W,H);
      // солнце
      const sunY=H*(0.72-ease*0.30),sunR=H*(0.07+ease*0.03),sc=mix([206,60,36],[255,224,108],ease);
      const halo=g.createRadialGradient(W*0.5,sunY,sunR*0.5,W*0.5,sunY,sunR*3.4);
      halo.addColorStop(0,'rgba('+sc[0]+','+sc[1]+','+sc[2]+',0.45)');halo.addColorStop(1,'rgba('+sc[0]+','+sc[1]+','+sc[2]+',0)');
      g.fillStyle=halo;g.beginPath();g.arc(W*0.5,sunY,sunR*3.4,0,7);g.fill();
      g.fillStyle=rgb(sc);g.shadowColor=rgb(sc);g.shadowBlur=50;
      g.beginPath();g.arc(W*0.5,sunY,sunR,0,7);g.fill();g.shadowBlur=0;
      // холмы и лес
      const hc=mix([16,20,22],[46,84,52],ease);g.fillStyle=rgb(hc);
      g.beginPath();g.moveTo(0,H);for(let x=0;x<=W;x+=22)g.lineTo(x,H*0.78-Math.abs(Math.sin(x*0.007))*H*0.05);
      g.lineTo(W,H);g.closePath();g.fill();
      // ---- ОБРЫВОК ГАЗЕТЫ поднимается вместе с солнцем ----
      const pRise=Math.min(1,Math.max(0,(t-1.0)/4.2)), pe=pRise*pRise*(3-2*pRise);
      if(pRise>0){
        const pw=Math.min(W*0.62,760), ph=Math.min(H*0.54,430);
        const px=W*0.5-pw/2, py=H*(1.05-pe*0.60)-ph*0.35;
        g.save();g.translate(px+pw/2,py+ph/2);
        g.rotate((-0.04+Math.sin(t*0.9)*0.012)*(1-pe*0.6));
        g.shadowColor='rgba(0,0,0,0.45)';g.shadowBlur=40;g.shadowOffsetY=14;
        // бумага с рваным краем
        g.fillStyle='#d9c79a';g.beginPath();
        g.moveTo(-pw/2,-ph/2);
        for(let x=-pw/2;x<pw/2;x+=26)g.lineTo(x,-ph/2+Math.sin(x*0.12)*4);
        g.lineTo(pw/2,ph/2);
        for(let x=pw/2;x>-pw/2;x-=26)g.lineTo(x,ph/2+Math.sin(x*0.15)*5);
        g.closePath();g.fill();g.shadowBlur=0;g.shadowOffsetY=0;
        g.save();g.clip(); // всё старение — строго по рваному контуру
        // пожелтение и складка
        // сильное пожелтение к краям + бурые пятна времени
        const yg=g.createRadialGradient(0,0,ph*0.15,0,0,pw*0.62);
        yg.addColorStop(0,'rgba(206,170,96,0.10)');
        yg.addColorStop(0.55,'rgba(178,132,64,0.30)');
        yg.addColorStop(1,'rgba(120,80,34,0.55)');
        g.fillStyle=yg;g.fillRect(-pw/2,-ph/2,pw,ph);
        for(let i=0;i<16;i++){const sxp=Math.sin(i*23.1)*pw*0.44,syp=Math.cos(i*17.7)*ph*0.42;
          const rr=6+((i*13)%22);
          const sp=g.createRadialGradient(sxp,syp,1,sxp,syp,rr);
          sp.addColorStop(0,'rgba(126,84,36,0.24)');sp.addColorStop(1,'rgba(126,84,36,0)');
          g.fillStyle=sp;g.beginPath();g.arc(sxp,syp,rr,0,7);g.fill();}
        // заломы бумаги
        g.strokeStyle='rgba(110,74,32,0.22)';g.lineWidth=1.4;
        [-0.22,0.16,0.44].forEach(fy=>{g.beginPath();g.moveTo(-pw/2,ph*fy);
          for(let x=-pw/2;x<pw/2;x+=30)g.lineTo(x,ph*fy+Math.sin(x*0.05)*2.5);g.stroke();});
        g.strokeStyle='rgba(120,96,60,0.18)';g.lineWidth=1;
        g.beginPath();g.moveTo(-pw/2,-ph*0.06);g.lineTo(pw/2,-ph*0.02);g.stroke();
        g.restore(); // конец области старения
        // шапка газеты
        g.fillStyle='#39291a';g.textAlign='center';
        g.font='700 '+Math.round(ph*0.075)+'px Cormorant Garamond, serif';
        g.fillText(lines[0]||'',0,-ph*0.30);
        g.strokeStyle='rgba(60,50,36,0.5)';g.lineWidth=2;
        g.beginPath();g.moveTo(-pw*0.40,-ph*0.24);g.lineTo(pw*0.40,-ph*0.24);g.stroke();
        // колонки текста
        g.fillStyle='#4a3524';g.font='italic '+Math.round(ph*0.052)+'px Cormorant Garamond, serif';
        const body=lines.slice(1);
        let yy=-ph*0.12;
        body.forEach(ln=>{
          const words=ln.split(' ');let cur='';const out=[];
          const maxw=pw*0.84;
          words.forEach(w=>{const test=cur?cur+' '+w:w;
            if(g.measureText(test).width>maxw){out.push(cur);cur=w;}else cur=test;});
          if(cur)out.push(cur);
          out.forEach(o=>{g.fillText(o,0,yy);yy+=ph*0.075;});
          yy+=ph*0.028;});
        g.restore();
      }
      if(t<16.5)requestAnimationFrame(rise); // +5 секунд на чтение
      else{alive=false;bg.style.display='none';iv.style.display='none';stopSfx('gm');showNightCard();}
    })(t0);
  }
  function showNightCard(idx){
    const nc=document.getElementById('nightCard');
    const nn=LANG==='ru'
      ?['ПЕРВАЯ НОЧЬ','ВТОРАЯ НОЧЬ','ТРЕТЬЯ НОЧЬ','ЧЕТВЁРТАЯ НОЧЬ','ПЯТАЯ НОЧЬ','НОЧЬ ШЕСТАЯ — ПОБЕГ','НОЧЬ СЕДЬМАЯ']
      :['NIGHT ONE','NIGHT TWO','NIGHT THREE','NIGHT FOUR','NIGHT FIVE','NIGHT SIX — THE ESCAPE','NIGHT SEVEN'];
    const ui=idx||NIGHT;
    document.getElementById('nightCardText').textContent=
      CUSTOM.secret?(LANG==='ru'?'ИЗНАНКА':'THE UNDERSIDE')
      :CUSTOM.active?(LANG==='ru'?'СВОЯ НОЧЬ':'CUSTOM NIGHT')
      :nn[Math.min(ui,7)-1];
    nc.style.display='flex';stopMenuAmb();stopSfx('nature');playSfx('night',1);
    setTimeout(()=>{nc.style.display='none';
      try{camera.position.copy(LIE.pos);}catch(e){}
      lookYaw=0;lookPitch=0;tgtYaw=0;tgtPitch=0;standT=0;standTarget=0;
      stopSfx('nature');stopMenuAmb();started=true;clock=0;activity=0;windowTaps=0;},2300);
  }
  document.getElementById('skipCut').addEventListener('click',endCutscene);

  // ================= AUDIO =================
  let AC=null,MG=null;
  function audio(){if(AC)return;AC=new(AudioContext||webkitAudioContext)();MG=AC.createGain();MG.gain.value=0.55;MG.connect(AC.destination);
    const d=AC.createOscillator();d.type='sine';d.frequency.value=42;const g=AC.createGain();g.gain.value=0.05;d.connect(g);g.connect(MG);d.start();}
  const now=()=>AC?AC.currentTime:0;
  function tone(f,ty,dur,vol,slideTo){const t=now(),o=AC.createOscillator(),g=AC.createGain();o.type=ty;o.frequency.setValueAtTime(f,t);
    if(slideTo)o.frequency.exponentialRampToValueAtTime(slideTo,t+dur);g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.connect(g);g.connect(MG);o.start(t);o.stop(t+dur+0.02);}
  function noise(dur,vol,fc,type='lowpass'){const t=now(),b=AC.createBufferSource(),buf=AC.createBuffer(1,AC.sampleRate*dur,AC.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);b.buffer=buf;const f=AC.createBiquadFilter();f.type=type;f.frequency.value=fc;
    const g=AC.createGain();g.gain.value=vol;b.connect(f);f.connect(g);g.connect(MG);b.start(t);}
  const knock=()=>{tone(120,'sine',0.16,0.6,55);noise(0.03,0.25,1800,'bandpass');};
  function footsteps(fast){const n=fast?6:3,gap=fast?0.14:0.32;for(let i=0;i<n;i++)setTimeout(()=>{if(AC){tone(70,'sine',0.1,0.4,40);noise(0.04,0.15,500);}},i*gap*1000);}
  const creak=()=>tone(90,'sawtooth',1.2,0.18,150);
  // NEW: distinct neighbor-turn sound — slow wet bed creak + low groan so it's obvious
  function neighborTurn(){if(!AC)return;tone(70,'sawtooth',1.6,0.22,120);setTimeout(()=>{if(AC)tone(180,'sine',0.9,0.18,90);},300);noise(1.4,0.12,400);}
  const thud=()=>{tone(80,'sine',0.4,0.7,30);noise(0.1,0.3,300);};
  const groan=()=>tone(150,'sine',0.6,0.25,90);
  const whimper=()=>tone(320,'triangle',0.5,0.2,220);
  const bedKnock=()=>{tone(60,'sine',0.25,0.9,28);noise(0.12,0.5,220);};
  const standSound=()=>{tone(110,'sawtooth',0.5,0.15,150);noise(0.2,0.1,600);}; // bed shifting as you rise

  // ================= SCARES — each hand-drawn & distinct =================
  const scareEl=document.getElementById('scare'),scareCv=document.getElementById('scareCv'),sx=scareCv.getContext('2d'),flash=document.getElementById('flash');
  let dead=false,won=false;
  function scream(kind){if(!AC)return;const t=now();MG.gain.setValueAtTime(1,t);
    const base={door:110,buff:70,fast:130,window:150,neighbor:98,bug:60}[kind]||110;
    const topMul=kind==='bug'?2.0:kind==='buff'?2.4:3.3;
    [base,base*1.06,base*2,base*3.1].forEach(f=>{const o=AC.createOscillator(),g=AC.createGain();o.type='sawtooth';
      o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*topMul,t+0.7);
      g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.3,t+0.03);g.gain.exponentialRampToValueAtTime(0.0001,t+1.6);
      o.connect(g);g.connect(MG);o.start(t);o.stop(t+1.7);});
    noise(1.5,0.5,kind==='bug'?900:kind==='buff'?1400:2600,'bandpass');}

  function jumpscare(kind){
    if(dead||won)return;dead=true;clearActive();
    scareCv.width=innerWidth;scareCv.height=innerHeight;
    const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches||!SET.shake;
    scareEl.style.display='block';
    // a beat of black, then the hit
    setTimeout(()=>{
      const fileKey=(kind==='door'||kind==='fast'||kind==='neighbor')?'scream1':'scream2';
      const fa=SFX[fileKey];if(fa)fa.loop=true; // крик зациклен, пока идёт скример
      if(!playSfx(fileKey,SET.quiet?0.45:1))scream(kind);
      if(SET.shake){flash.style.transition='none';flash.style.opacity='1';requestAnimationFrame(()=>{flash.style.transition='opacity .3s';flash.style.opacity='0';});}
      const t0=performance.now();
      let _looped=false;(function paint(nw){const t=(nw-t0)/1000,W=scareCv.width,H=scareCv.height;
        // LUNGE: erupts from the dark — rapid zoom-in during first 0.35s, then it looms and keeps creeping closer
        const lunge=t<0.35?0.25+ (t/0.35)*0.85 : 1.1+ t*0.06;
        const sh=reduce?0:(t<1.3?(Math.random()-0.5)*52:(Math.random()-0.5)*6);
        sx.save();sx.translate(W/2+sh,H/2+sh*0.6);sx.scale(lunge,lunge);sx.translate(-W/2,-H/2);
        SCARE[kind](sx,W,H,t);sx.restore();
        // darkness vignette pulsing over the scare
        const vg=sx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.25,W/2,H/2,Math.max(W,H)*0.7);
        vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,'+(0.55+Math.sin(t*13)*0.1)+')');
        sx.fillStyle=vg;sx.fillRect(0,0,W,H);
        // ЦИКЛ: на 2-й секунде скример резко перезапускается, экран краснеет
        if(t>=2.0&&!_looped){_looped=true;
          const fk=(kind==='door'||kind==='fast'||kind==='neighbor')?'scream1':'scream2';
          const fa2=SFX[fk];if(fa2){try{fa2.currentTime=0;}catch(e){}}
          if(SET.shake){flash.style.transition='none';flash.style.background='#c00';flash.style.opacity='0.85';
            requestAnimationFrame(()=>{flash.style.transition='opacity 2s';flash.style.opacity='0';
              setTimeout(()=>{flash.style.background='#fff';},2000);});}}
        if(t<3.2)requestAnimationFrame(paint);else showDeath(kind);})(t0);
    },220);
  }

  // shared helpers
  function faceBase(g,cx,cy,r,skin,t){const grd=g.createRadialGradient(cx,cy,r*0.1,cx,cy,r);
    grd.addColorStop(0,skin);grd.addColorStop(0.7,'rgba(28,18,18,1)');grd.addColorStop(1,'#000');g.fillStyle=grd;
    g.beginPath();g.ellipse(cx,cy,r*0.78,r,0,0,7);g.fill();}
  function eyes(g,cx,cy,r,glow,t,sep=0.34,ry=-0.16){g.fillStyle='#000';const eo=r*sep,ey=cy+r*ry;
    [-1,1].forEach(s=>{g.beginPath();g.ellipse(cx+s*eo,ey,r*0.22,r*0.28,0,0,7);g.fill();});
    g.fillStyle=`rgba(${glow},${0.7+Math.sin(t*30)*0.3})`;g.shadowColor='#f22';g.shadowBlur=30;
    [-1,1].forEach(s=>{g.beginPath();g.arc(cx+s*eo,ey,r*0.05,0,7);g.fill();});g.shadowBlur=0;}
  function teeth(g,cx,cy,r,col,rows){g.fillStyle=col;const mw=r*0.5,mx=cx-mw/2;
    for(let i=0;i<8;i++){const tx=mx+i*(mw/7);g.beginPath();g.moveTo(tx,cy+r*0.18);g.lineTo(tx+mw/14,cy+r*0.34);g.lineTo(tx+mw/7,cy+r*0.18);g.fill();}
    if(rows)for(let i=0;i<8;i++){const tx=mx+i*(mw/7),by=cy+r*0.62;g.beginPath();g.moveTo(tx,by);g.lineTo(tx+mw/14,by-r*0.16);g.lineTo(tx+mw/7,by);g.fill();}}

  const SCARE={
    // gaunt pale lunging face
    door(g,W,H,t){ // «Долговязый»: бледное лицо, вытянутое по вертикали до неправильности
      g.fillStyle='#000';g.fillRect(0,0,W,H);
      const cx=W/2+Math.sin(t*23)*2,cy=H*0.52,r=Math.min(W,H)*0.5;
      const stretch=1.25+Math.min(0.55,t*0.2); // лицо продолжает ВЫТЯГИВАТЬСЯ
      const grd=g.createRadialGradient(cx,cy,r*0.05,cx,cy,r*stretch);
      grd.addColorStop(0,'#dcd7c6');grd.addColorStop(0.6,'#6a6558');grd.addColorStop(1,'#000');
      g.fillStyle=grd;g.beginPath();g.ellipse(cx,cy,r*0.3,r*stretch*0.8,0,0,7);g.fill();
      // вертикальные трещины по всей длине
      g.strokeStyle='rgba(50,45,38,0.6)';g.lineWidth=1.5;
      for(let i=-2;i<=2;i++){g.beginPath();g.moveTo(cx+i*r*0.09,cy-r*stretch*0.7);
        g.quadraticCurveTo(cx+i*r*0.12,cy,cx+i*r*0.09,cy+r*stretch*0.7);g.stroke();}
      // крошечные, слишком высоко посаженные глаза с холодным светом
      const ey=cy-r*stretch*0.42;g.fillStyle='#000';
      [-1,1].forEach(sn=>{g.beginPath();g.ellipse(cx+sn*r*0.11,ey,r*0.06,r*0.09,0,0,7);g.fill();});
      g.fillStyle=`rgba(190,215,255,${0.7+Math.sin(t*26)*0.3})`;g.shadowColor='#9cf';g.shadowBlur=22;
      [-1,1].forEach(sn=>{g.beginPath();g.arc(cx+sn*r*0.11,ey,r*0.022,0,7);g.fill();});g.shadowBlur=0;
      // длинный тонкий вертикальный рот-щель, раскрывающийся вниз
      const mlen=r*(0.28+Math.min(0.3,t*0.12));
      g.fillStyle='#0a0705';g.beginPath();g.ellipse(cx,cy+r*stretch*0.32,r*0.045,mlen,0,0,7);g.fill();
      g.strokeStyle='#c9c3b2';g.lineWidth=2;
      for(let i=1;i<7;i++){const yy=cy+r*stretch*0.32-mlen+ i*(mlen*2/7);
        g.beginPath();g.moveTo(cx-r*0.04,yy);g.lineTo(cx+r*0.04,yy);g.stroke();}},
    // massive dark figure filling the frame, glowing eyes
    buff(g,W,H,t){g.fillStyle='#050506';g.fillRect(0,0,W,H);const cx=W/2,cy=H*0.62,r=Math.min(W,H)*0.7;
      g.fillStyle='#0a0a0d';g.beginPath();g.moveTo(cx-r*0.9,H);g.quadraticCurveTo(cx-r*0.7,cy-r*0.3,cx-r*0.28,cy-r*0.55);
      g.quadraticCurveTo(cx,cy-r*0.75,cx+r*0.28,cy-r*0.55);g.quadraticCurveTo(cx+r*0.7,cy-r*0.3,cx+r*0.9,H);g.fill();
      // head
      g.beginPath();g.ellipse(cx,cy-r*0.62,r*0.22,r*0.26,0,0,7);g.fill();
      const ey=cy-r*0.66;g.fillStyle=`rgba(255,60,40,${0.6+Math.sin(t*22)*0.4})`;g.shadowColor='#f30';g.shadowBlur=40;
      [-1,1].forEach(s=>{g.beginPath();g.arc(cx+s*r*0.09,ey,r*0.03,0,7);g.fill();});g.shadowBlur=0;},
    // motion-blurred fast face (duplicated)
    fast(g,W,H,t){ // «Рой глаз»: хитиновая тварь вплотную, семь глаз, жвала
      g.fillStyle='#050205';g.fillRect(0,0,W,H);
      // горизонтальные полосы скорости
      g.strokeStyle='rgba(120,20,30,0.25)';g.lineWidth=3;
      for(let i=0;i<10;i++){const yy=(i/10)*H+Math.sin(t*40+i)*8;
        g.beginPath();g.moveTo(0,yy);g.lineTo(W,yy);g.stroke();}
      const cx=W/2+Math.sin(t*38)*10,cy=H*0.55,r=Math.min(W,H)*0.5;
      // тёмная хитиновая масса
      const grd=g.createRadialGradient(cx,cy,r*0.1,cx,cy,r*1.05);
      grd.addColorStop(0,'#241318');grd.addColorStop(0.7,'#0d0509');grd.addColorStop(1,'#000');
      g.fillStyle=grd;g.beginPath();g.ellipse(cx,cy,r*0.9,r*0.75,0,0,7);g.fill();
      // щетинки по силуэту
      g.strokeStyle='rgba(60,30,35,0.8)';g.lineWidth=2;
      for(let i=0;i<26;i++){const a2=(i/26)*6.28;const x1=cx+Math.cos(a2)*r*0.88,y1=cy+Math.sin(a2)*r*0.73;
        g.beginPath();g.moveTo(x1,y1);g.lineTo(x1+Math.cos(a2)*r*0.1,y1+Math.sin(a2)*r*0.1);g.stroke();}
      // СЕМЬ глаз, каждый пульсирует в своей фазе
      const eyes=[[0,-0.28,0.11],[-0.3,-0.14,0.08],[0.3,-0.14,0.08],[-0.16,-0.02,0.055],[0.16,-0.02,0.055],[-0.42,0.02,0.045],[0.42,0.02,0.045]];
      eyes.forEach((e2,i)=>{const ex=cx+e2[0]*r,ey2=cy+e2[1]*r,er=e2[2]*r;
        g.fillStyle='#000';g.beginPath();g.arc(ex,ey2,er*1.5,0,7);g.fill();
        g.fillStyle=`rgba(255,${140+((i*37)%80)},30,${0.6+Math.sin(t*22+i*1.9)*0.4})`;
        g.shadowColor='#f80';g.shadowBlur=18;g.beginPath();g.arc(ex,ey2,er,0,7);g.fill();g.shadowBlur=0;});
      // жвала: два изогнутых клыка, щёлкают
      const open=0.14+Math.abs(Math.sin(t*13))*0.12;
      g.fillStyle='#b9b2a0';
      [-1,1].forEach(sn=>{g.beginPath();
        g.moveTo(cx+sn*r*0.32,cy+r*0.32);
        g.quadraticCurveTo(cx+sn*r*(0.32-open),cy+r*0.62,cx+sn*r*0.04,cy+r*0.72);
        g.quadraticCurveTo(cx+sn*r*0.26,cy+r*0.58,cx+sn*r*0.32,cy+r*0.32);g.fill();});},

    // face pressed against glass
    window(g,W,H,t){g.fillStyle='#0a1420';g.fillRect(0,0,W,H);const r=Math.min(W,H)*0.42,cx=W/2,cy=H/2;
      faceBase(g,cx,cy,r,'#9fb4c4',t);eyes(g,cx,cy,r,'200,220,255',t);g.fillStyle='#0a1218';g.beginPath();g.ellipse(cx,cy+r*0.42,r*0.24,r*0.3,0,0,7);g.fill();
      // glass frame + condensation streaks over the top
      g.strokeStyle='rgba(120,150,180,0.5)';g.lineWidth=10;g.strokeRect(W*0.12,H*0.1,W*0.76,H*0.8);
      g.beginPath();g.moveTo(W/2,H*0.1);g.lineTo(W/2,H*0.9);g.moveTo(W*0.12,H/2);g.lineTo(W*0.88,H/2);g.stroke();
      g.strokeStyle='rgba(200,220,240,0.15)';g.lineWidth=3;for(let i=0;i<12;i++){const x=W*0.15+Math.random()*W*0.7;g.beginPath();g.moveTo(x,H*0.12);g.lineTo(x+10,H*0.5);g.stroke();}},
    // the fat boy's face, close & pale
    neighbor(g,W,H,t){g.fillStyle='#000';g.fillRect(0,0,W,H);const r=Math.min(W,H)*0.5,cx=W/2,cy=H/2;
      const grd=g.createRadialGradient(cx,cy,r*0.1,cx,cy,r);grd.addColorStop(0,'#b89484');grd.addColorStop(0.75,'rgba(40,26,22,1)');grd.addColorStop(1,'#000');
      g.fillStyle=grd;g.beginPath();g.ellipse(cx,cy,r*0.92,r*0.86,0,0,7);g.fill(); // round fat face
      // short hair cap
      g.fillStyle='#0a0705';g.beginPath();g.ellipse(cx,cy-r*0.55,r*0.9,r*0.4,0,Math.PI,0);g.fill();
      eyes(g,cx,cy,r*0.9,'230,60,60',t,0.3,-0.05);
      // dark streaks weeping from the eyes
      g.strokeStyle='rgba(30,10,10,0.8)';g.lineWidth=6;
      [-1,1].forEach(sn=>{g.beginPath();g.moveTo(cx+sn*r*0.27,cy);g.quadraticCurveTo(cx+sn*r*0.3,cy+r*0.3,cx+sn*r*0.24,cy+r*0.6);g.stroke();});
      // the mouth opens slowly into a silent scream
      const open=Math.min(0.5,0.12+t*0.16);
      g.fillStyle='#120404';g.beginPath();g.ellipse(cx,cy+r*0.45,r*0.28,r*open,0,0,7);g.fill();
      g.fillStyle='#b89484';const mw=r*0.4,mx=cx-mw/2;
      for(let i=0;i<6;i++){const tx=mx+i*(mw/5);g.beginPath();g.moveTo(tx,cy+r*0.32);g.lineTo(tx+mw/10,cy+r*0.42);g.lineTo(tx+mw/5,cy+r*0.32);g.fill();}},
    // red sticky veiny maw
    bug(g,W,H,t){g.fillStyle='#1a0000';g.fillRect(0,0,W,H);const r=Math.min(W,H)*0.5,cx=W/2,cy=H/2;
      const grd=g.createRadialGradient(cx,cy,r*0.1,cx,cy,r);grd.addColorStop(0,'#7a0d0d');grd.addColorStop(0.6,'#3a0505');grd.addColorStop(1,'#000');
      g.fillStyle=grd;g.beginPath();g.ellipse(cx,cy,r*0.8,r,0,0,7);g.fill();
      g.strokeStyle='rgba(160,0,0,0.6)';g.lineWidth=3;for(let i=0;i<14;i++){g.beginPath();const a=Math.random()*6.28;g.moveTo(cx,cy);g.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);g.stroke();}
      eyes(g,cx,cy,r,'255,200,0',t);
      g.fillStyle='#000';g.beginPath();g.ellipse(cx,cy+r*0.4,r*0.34,r*0.46*(1+Math.sin(t*11)*0.18),0,0,7);g.fill();
      g.fillStyle='#c9c3b2';const mw=r*0.6,mx=cx-mw/2;for(let i=0;i<10;i++){const tx=mx+i*(mw/9);g.beginPath();g.moveTo(tx,cy+r*0.1);g.lineTo(tx+mw/18,cy+r*0.42);g.lineTo(tx+mw/9,cy+r*0.1);g.fill();}
      // drips
      g.strokeStyle='rgba(120,0,0,0.8)';g.lineWidth=5;for(let i=0;i<5;i++){const x=cx-r*0.4+Math.random()*r*0.8;g.beginPath();g.moveTo(x,cy+r*0.7);g.lineTo(x,cy+r*0.7+40+Math.random()*60);g.stroke();}},
  };

  // ================= CONTROLS =================
  const YAW_L=-0.42,YAW_R=1.25,PITCH_LIM=0.9;
  const DOOR_YAW=0.0; // from the centre of the room the door is straight ahead
  let lookYaw=0,lookPitch=0,tgtYaw=0,tgtPitch=0,dragging=false,lastX,lastY,moved=0,activity=0;
  let standT=0,standTarget=0; // 0 lying, 1 standing

  function down(x,y){dragging=true;lastX=x;lastY=y;moved=0;document.body.classList.add('grabbing');audio();if(AC&&AC.state==='suspended')AC.resume();document.getElementById('hint').style.opacity='0';}
  function move(x,y){if(!dragging)return;let dx=(x-lastX)*SET.sens,dy=(y-lastY)*SET.sens;lastX=x;lastY=y;moved+=Math.abs(dx)+Math.abs(dy);
    tgtYaw=Math.max(YAW_L,Math.min(YAW_R,tgtYaw+dx*0.005));tgtPitch=Math.max(-PITCH_LIM,Math.min(PITCH_LIM,tgtPitch-dy*0.004));
    activity+=Math.abs(dx)*0.0025;if(activeEvent&&activeEvent.type==='neighbor')failNeighbor();}
  function up(x,y){dragging=false;document.body.classList.remove('grabbing');if(moved<6)click(x,y);}
  let pdOnCanvas=false;
  canvas.addEventListener('pointerdown',e=>{pdOnCanvas=true;down(e.clientX,e.clientY);holding=true;if(activeEvent&&activeEvent.needHold)activeEvent.holdOk=true;});
  let creditsMode=false;
  addEventListener('pointermove',e=>{if(creditsMode||(window.CH&&CH.active))return;move(e.clientX,e.clientY);});
  addEventListener('pointerup',e=>{if(pdOnCanvas)up(e.clientX,e.clientY);pdOnCanvas=false;holding=false;});
  let holding=false;

  const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
  function click(px,py){if(!started||dead||won)return; // клики в сцену только во время игры
    ndc.x=(px/innerWidth)*2-1;ndc.y=-(py/innerHeight)*2+1;ray.setFromCamera(ndc,camera);
    const hits=ray.intersectObjects([pane,door,handB,cbody,frost,handB],false);const n=hits.length?hits[0].object.name:null;
    if(activeEvent&&activeEvent.type==='neighbor'){failNeighbor();return;}
    if(n==='cupcake'){egg('cupcake');if(AC)tone(880,'triangle',0.12,0.2,1100);
      if(SEC.step===1){SEC.cupTaps++;if(SEC.cupTaps>=13){SEC.cupTaps=0;secAdvance(2);
        cherry.material.emissive=new THREE.Color(0xffcc44);cherry.material.emissiveIntensity=1.4;}}
      setCue(LANG==='ru'?'он тоже пережил пять ночей':'he survived five nights too',true);
      setTimeout(()=>{if(!activeEvent)setCue('');},1800);return;}
    if(n==='boyhand'&&(!activeEvent||activeEvent.type!=='neighbor')){
      egg('hand');secHand();activity+=3;if(AC)tone(140,'sine',0.5,0.12,90);
      setCue(LANG==='ru'?'сосед бормочет: «не сейчас…»':'the neighbor mumbles: "not now…"',true);
      setTimeout(()=>{if(!activeEvent)setCue('');},1800);return;}
    if(n==='window'){knock();doorKnockCount++;
      if(SEC.step===2){const tn=performance.now();
        if(tn-SEC.knockT>1500&&SEC.knockT)SEC.knockSeq.push(0); // пауза = разделитель
        SEC.knockT=tn;SEC.knockSeq.push(1);
        if(SEC.knockSeq.length>16)SEC.knockSeq.shift();
        const pat=SEC.knockSeq.join('');
        if(pat.indexOf('111011011')>=0){SEC.knockSeq=[];secAdvance(3);
          paneMat.emissiveIntensity=2.4;setTimeout(()=>{paneMat.emissiveIntensity=0.12;},900);}}paneMat.emissiveIntensity=1.1;setTimeout(()=>paneMat.emissiveIntensity=0.6,120);
      if(doorKnockCount===20){doorKnockCount=0;
        setTimeout(()=>{if(AC){knock();setTimeout(knock,300);setTimeout(knock,600);}},550); // ответ ИЗНУТРИ стекла
        setCue(LANG==='ru'?'…с той стороны постучали в ответ':'…something knocked back from the other side',true);
        setTimeout(()=>{if(!activeEvent)setCue('');},2200);}
      if(activeEvent&&activeEvent.type==='window'){succeedWindow();}
      else{windowTaps++;windowTapT=4;
        if(windowTaps>=(NIGHT===1?5:NIGHT===2?4:3)&&!activeEvent){windowTaps=0;
          activeEvent={type:'neighbor',t:0,limit:6.0*SET.diff,survive:6.0*SET.diff};boyFacing(true,true);setCue(T('cue_neighbor'));}}}}

  addEventListener('keydown',e=>{if(ESC.active){escKey(e);return;}if(dead||won||!started)return;if(e.code==='Space'){e.preventDefault();onSpace();}if(e.code==='KeyS'){e.preventDefault();onS();}});

  function doStand(){standTarget=1;standSound();tgtYaw=DOOR_YAW;tgtPitch=STAND.pitch;} // animate up + face door
  function doLie(){standTarget=0;tgtPitch=PITCH_LIM;tgtYaw=Math.max(YAW_L,Math.min(YAW_R,tgtYaw));} // lie down looking at the ceiling

  function onSpace(){
    if(activeEvent&&activeEvent.type==='neighbor'){failNeighbor();return;}
    if(!activeEvent){doStand();return;} // free stand
    if(activeEvent.type==='door_slow'){doStand();activeEvent.phase='hold';activeEvent.needHold=true;setCue(T('cue_holddoor'));}
    else if(activeEvent.type==='fast'){doStand();activeEvent.phase='closehold';activeEvent.needHold=true;activeEvent.t=0;activeEvent.limit=3.5;
      thud();doorTarget=0.55;creature.visible=true;creatureFlee=false;creature.position.set(0.25,0,-3.28);setCue(T('cue_fasthold'));}
    else if(activeEvent.type==='bug'){doStand();activeEvent.stoodUp=true;whimper();
      bedRed=0;document.getElementById('bedred').style.opacity=0;setCue('');
      setTimeout(()=>{if(activeEvent&&activeEvent.type==='bug')clearActive();},600);}
  }
  function onS(){
    if(activeEvent&&activeEvent.type==='neighbor'){failNeighbor();return;}
    if(activeEvent&&activeEvent.type==='short'){activeEvent.laidDown=true;doLie();setCue('');return;}
        doLie(); // S always lets you lie back down (fixes being stuck standing during window knocks)
  }

  // ================= EVENTS =================
  let activeEvent=null,eventTimer=0,nextEvent=(EVENT_MIN+Math.random()*(EVENT_MAX-EVENT_MIN))*npc().f;
  let windowTaps=0,windowTapT=0;
  let clock=0,started=false,bedRed=0;
  const cueEl=document.getElementById('cue');
  function setCue(txt,force){if(NIGHT>1&&!SET.hints&&txt&&!force)txt='';if(CUSTOM.secret&&!force)txt=''; // подсказки — только в первую ночь
    cueEl.textContent=txt;cueEl.style.color=txt?'rgba(220,210,200,0.9)':'rgba(220,210,200,0)';}
  let boyTargetRot=Math.PI/2,boyArmed=false,boyArmT=0;
  function boyFacing(on,sound){boyTargetRot=on?-Math.PI/2:Math.PI/2;if(!on){boyArmed=false;boyArmT=0;}if(on&&sound)neighborTurn();}
  function clearActive(){activeEvent=null;setCue('');sil.visible=false;buff.visible=false;creature.visible=false;creatureFlee=false;buff.scale.set(1,1,1);buff.rotation.set(0,0,0);spill.intensity=0;bedRed=0;document.getElementById('bedred').style.opacity=0;boyFacing(false);doorTarget=0;}

  const EVENTS=['door_slow','short','fast','window','neighbor','bug'];
  function startEvent(forceType){
    const basePool=CUSTOM.active?CUSTOM.pool:(window.GAME_DATA.NIGHT_POOL[Math.min(NIGHT,5)]||EVENTS);
    const type=forceType||basePool[(Math.random()*basePool.length)|0];
    activeEvent={type,phase:'cue',t:0,limit:4.5};

    if(type==='door_slow'){creak();doorTarget=0.5;activeEvent.limit=5.0;
      if(standT>0.5){activeEvent.phase='hold';activeEvent.needHold=true;setCue(T('cue_holddoor'));}
      else setCue(T('cue_doorslow'));}
    if(type==='short'){footsteps(false);setCue(T('cue_short'));activeEvent.limit=4.0;}
    if(type==='fast'){footsteps(true);activeEvent.limit=3.2;
      if(standT>0.5){activeEvent.phase='closehold';activeEvent.needHold=true;thud();doorTarget=0.55;
        creature.visible=true;creatureFlee=false;creature.position.set(0.25,0,-3.28);setCue(T('cue_fasthold'));}
      else setCue(T('cue_fast'));}
    if(type==='window'){sil.visible=true;knock();setTimeout(()=>{if(AC)knock();},350);setCue(T('cue_window'));activeEvent.limit=3.0;}
    if(type==='neighbor'){boyFacing(true,true);setCue(T('cue_neighbor'));activeEvent.limit=6.0;activeEvent.survive=6.0;}
    if(type==='bug'){bedKnock();activeEvent.limit=3.5;bedRed=0;
      if(standT>0.5){activeEvent.stoodUp=true;whimper();setCue('');
        setTimeout(()=>{if(activeEvent&&activeEvent.type==='bug')clearActive();},600);}
      else setCue(T('cue_bug'));}
    // сложность применяется сразу и надёжно
    activeEvent.limit*=SET.diff;if(activeEvent.survive)activeEvent.survive*=SET.diff;
  }
  function fail(ev){const map={door_slow:'door',short:'buff',fast:'fast',window:'window',neighbor:'neighbor',bug:'bug'};jumpscare(map[ev.type]||'door');}
  function failNeighbor(){if(activeEvent&&activeEvent.type==='neighbor'&&boyArmed)jumpscare('neighbor');}
  function succeedWindow(){sil.visible=false;clearActive();}
  function retreat(){groan();for(let i=0;i<5;i++)setTimeout(()=>{if(AC)tone(65,'sine',0.09,0.3,40);},i*150);}
  function buffScene(){ // the tall one leans in from behind the door and looks at you
    spill.intensity=1.8;buff.visible=true;
    buff.position.set(0.55,0,-3.55);buff.rotation.y=-0.45;buff.rotation.z=0.1;buff.scale.set(1,1.18,1);
    doorTarget=0.45;creak();
    setTimeout(()=>{if(dead)return;doorTarget=0;spill.intensity=0;buff.visible=false;thud();clearActive();},2100);}

  function updateEvents(dt){
    if(!started||dead||won)return;clock+=dt;
    const hour=Math.min(HOURS,Math.floor(clock/HOUR_SECONDS));
    document.getElementById('ch').textContent=(hour===0?12:hour)+':00';
    if(clock>=HOURS*HOUR_SECONDS){
      if(CUSTOM.active){customWin();return;}
      if(NIGHT<5){nightsBeaten=Math.max(nightsBeaten,NIGHT);NIGHT++;started=false;clearActive();showIntermission();return;}
      win();return;}
    if(activeEvent){const ev=activeEvent;ev.t+=dt;
      if(ev.type==='door_slow'){if(ev.phase==='cue'&&ev.t>ev.limit)fail(ev);
        else if(ev.phase==='hold'){
          if(holding){ev.hd=(ev.hd||0)+dt;doorTarget=Math.max(0,0.5-ev.hd*0.5);
            if(doorTarget<=0.02&&!ev.shut){ev.shut=true;if(AC){thud();tone(90,'sine',0.18,0.09,60);} // мягкий щелчок закрытия
              setTimeout(()=>{if(activeEvent===ev)clearActive();},250);}}
          else{ev.g=(ev.g||0)+dt;if(ev.g>1.6)fail(ev);}}}
      else if(ev.type==='short'){if(ev.laidDown){buffScene();ev.laidDown=false;ev.phase='peek';}else if(ev.phase==='cue'&&ev.t>ev.limit)fail(ev);}
      else if(ev.type==='fast'){if(ev.phase==='cue'&&ev.t>ev.limit)fail(ev);
        else if(ev.phase==='closehold'){if(holding){ev.hd=(ev.hd||0)+dt;doorTarget=Math.max(0,0.55-ev.hd*0.45);
          if(doorTarget<=0.02&&!ev.hitDone){ev.hitDone=true;thud();squeal();creatureFlee=true;retreat();
            setTimeout(()=>{if(!dead)clearActive();},900);}}
        else{ev.g=(ev.g||0)+dt;doorTarget=Math.min(0.9,0.55+ev.g*0.28);if(ev.g>1.9)fail(ev);}}}
      else if(ev.type==='window'){if(ev.t>ev.limit){boyFacing(true,true);setTimeout(()=>jumpscare('window'),500);}}
      else if(ev.type==='neighbor'){ev.survive-=dt;if(ev.survive<=0)clearActive();}
      else if(ev.type==='bug'){if(!ev.stoodUp){bedRed+=dt/ev.limit;if(bedRed>=1)jumpscare('bug');if(Math.random()<0.05)bedKnock();}}
    }else{eventTimer+=dt;if(eventTimer>=nextEvent){eventTimer=0;nextEvent=(EVENT_MIN+Math.random()*(EVENT_MAX-EVENT_MIN))*npc().f;startEvent();}}
    activity=Math.max(0,activity-dt*0.5);
    windowTapT-=dt;if(windowTapT<=0)windowTaps=0;
    if(!activeEvent&&activity>14*npc().c&&Math.random()<0.008){activity=0;activeEvent={type:'neighbor',t:0,limit:6.0,survive:6.0};boyFacing(true,true);setCue(T('cue_neighbor'));}
  }

  function win(){won=true;clearActive();
    stopSfx('nature');stopMenuAmb();
    if(!playSfx('gm',0.9))playSfx('nature',1); // Goodmorninglastochka.mp3
    unlocked6=true;unlockedCustom=true;nightsBeaten=Math.max(nightsBeaten,5);refreshMenuXtra();
    document.getElementById('ch').textContent='6:00';
    const w=document.getElementById('win');w.style.display='flex';
    const seq=document.getElementById('winSeq'),fin=document.getElementById('winFinal');
    fin.style.display='none';seq.style.opacity=0;
    // ---- 9 секунд восхода ----
    const sr0=performance.now();
    (function sunrise(nw){const pr=(nw-sr0)/9000;drawNature(pr);
      if(pr<1&&won)requestAnimationFrame(sunrise);})(sr0);
    const lines=window.GAME_DATA.ENDING[LANG];
    let li=0;
    function next(){
      if(li>=lines.length){seq.style.opacity=0;setTimeout(()=>{fin.style.display='flex';},900);return;}
      seq.textContent=lines[li];seq.style.opacity=1;
      setTimeout(()=>{seq.style.opacity=0;setTimeout(()=>{li++;next();},750);},3800);
    }
    setTimeout(next,9200);}
  // ---- РАССВЕТ: 9 секунд, солнце от низкого багрового до полного жёлтого ----
  function drawNature(p){ // p: 0..1 прогресс восхода
    p=Math.max(0,Math.min(1,p===undefined?1:p));
    const cv=document.getElementById('winCv'),g=cv.getContext('2d');
    cv.width=innerWidth;cv.height=innerHeight;const W=cv.width,H=cv.height;
    const ease=p*p*(3-2*p);
    // небо: от тёмно-багрового к тёплому утреннему
    const mix=(a,b2,t)=>[Math.round(a[0]+(b2[0]-a[0])*t),Math.round(a[1]+(b2[1]-a[1])*t),Math.round(a[2]+(b2[2]-a[2])*t)];
    const rgb=c=>'rgb('+c[0]+','+c[1]+','+c[2]+')';
    const top=mix([32,20,44],[168,206,235],ease), midC=mix([120,42,52],[250,196,150],ease), lowC=mix([196,72,44],[255,232,190],ease);
    const sky=g.createLinearGradient(0,0,0,H*0.66);
    sky.addColorStop(0,rgb(top));sky.addColorStop(0.55,rgb(midC));sky.addColorStop(1,rgb(lowC));
    g.fillStyle=sky;g.fillRect(0,0,W,H);
    // звёзды гаснут в начале
    if(ease<0.45){g.fillStyle='rgba(255,255,255,'+(0.45-ease)+')';
      for(let i=0;i<70;i++)g.fillRect((Math.sin(i*31.7)*0.5+0.5)*W,(Math.cos(i*19.3)*0.5+0.5)*H*0.5,1.4,1.4);}
    // СОЛНЦЕ: поднимается из-за горизонта, краснное → жёлтое
    const sunY=H*(0.60-ease*0.26), sunR=H*(0.075+ease*0.035);
    const sunC=mix([214,66,40],[255,226,110],ease);
    g.save();
    const halo=g.createRadialGradient(W*0.5,sunY,sunR*0.6,W*0.5,sunY,sunR*(3.2+ease*1.4));
    halo.addColorStop(0,'rgba('+sunC[0]+','+sunC[1]+','+sunC[2]+',0.55)');
    halo.addColorStop(1,'rgba('+sunC[0]+','+sunC[1]+','+sunC[2]+',0)');
    g.fillStyle=halo;g.beginPath();g.arc(W*0.5,sunY,sunR*(3.2+ease*1.4),0,7);g.fill();
    g.fillStyle=rgb(sunC);g.shadowColor=rgb(sunC);g.shadowBlur=60+ease*40;
    g.beginPath();g.arc(W*0.5,sunY,sunR,0,7);g.fill();g.shadowBlur=0;g.restore();
    // «6 A.M» на солнце
    g.save();g.textAlign='center';g.textBaseline='middle';
    g.fillStyle='rgba(60,26,14,'+(0.5+ease*0.4)+')';
    g.font='700 '+Math.round(sunR*0.72)+'px Cormorant Garamond, serif';
    g.fillText('6 A.M',W*0.5,sunY+sunR*0.04);g.restore();
    // лучи
    g.save();g.translate(W*0.5,sunY);
    for(let i=0;i<16;i++){const ang=(i/16)*Math.PI*2+ease*0.3;
      const rg=g.createLinearGradient(0,0,Math.cos(ang)*H*0.5,Math.sin(ang)*H*0.5);
      rg.addColorStop(0,'rgba(255,235,180,'+(0.06+ease*0.16)+')');rg.addColorStop(1,'rgba(255,235,180,0)');
      g.strokeStyle=rg;g.lineWidth=7;g.beginPath();
      g.moveTo(Math.cos(ang)*sunR,Math.sin(ang)*sunR);
      g.lineTo(Math.cos(ang)*H*0.5,Math.sin(ang)*H*0.5);g.stroke();}
    g.restore();
    // РЕЧКА с отражением солнца
    const rv=g.createLinearGradient(0,H*0.60,0,H*0.75);
    const rTop=mix([90,60,80],[150,196,222],ease), rBot=mix([40,28,44],[66,120,158],ease);
    rv.addColorStop(0,rgb(rTop));rv.addColorStop(1,rgb(rBot));
    g.fillStyle=rv;g.beginPath();g.moveTo(0,H*0.615);
    for(let x=0;x<=W;x+=24)g.lineTo(x,H*0.615+Math.sin(x*0.012)*6);
    g.lineTo(W,H*0.78);g.lineTo(0,H*0.78);g.closePath();g.fill();
    // солнечная дорожка по воде
    for(let i=0;i<11;i++){const yy=H*0.63+i*(H*0.135/11),w2=(W*0.045)*(1+i*0.42);
      g.fillStyle='rgba('+sunC[0]+','+sunC[1]+','+sunC[2]+','+(0.5-i*0.035)*(0.35+ease*0.65)+')';
      g.fillRect(W*0.5-w2/2+Math.sin(i*1.7+ease*3)*7,yy,w2,3.2);}
    // берега и холмы
    [['#4a6f4a',0.60],['#3d5f3d',0.665]].forEach(([c,y],i)=>{
      const hc=mix([28,32,34],[parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)],ease);
      g.fillStyle=rgb(hc);g.beginPath();g.moveTo(0,H*y);
      for(let x=0;x<=W;x+=20)g.lineTo(x,H*y-Math.abs(Math.sin(x*0.008+i))*H*0.045);
      g.lineTo(W,H*y+2);g.lineTo(0,H*y+2);g.closePath();g.fill();});
    // передний берег
    const fg=mix([18,24,20],[44,92,50],ease);
    g.fillStyle=rgb(fg);g.beginPath();g.moveTo(0,H);
    for(let x=0;x<=W;x+=16)g.lineTo(x,H*0.775+Math.sin(x*0.02)*7);
    g.lineTo(W,H);g.closePath();g.fill();
    // деревья по краям
    const tc=mix([14,20,16],[30,58,34],ease);g.fillStyle=rgb(tc);
    [[0.03,0.5],[0.09,0.62],[0.93,0.55],[0.985,0.68]].forEach(tr=>{
      const tx=W*tr[0],th=H*tr[1]*0.5;
      for(let k=0;k<4;k++){const w2=(44-k*9)*(W/900),y0=H*0.79-th*(k*0.2);
        g.beginPath();g.moveTo(tx-w2,y0);g.lineTo(tx,y0-th*0.34);g.lineTo(tx+w2,y0);g.closePath();g.fill();}});
    // туман над водой в начале
    if(ease<0.8){g.fillStyle='rgba(240,232,225,'+(0.22-ease*0.22)+')';g.fillRect(0,H*0.6,W,H*0.14);}
    // птицы к концу
    if(ease>0.55){g.strokeStyle='rgba(40,30,25,'+((ease-0.55)*1.6)+')';g.lineWidth=2;
      [[0.3,0.22],[0.36,0.19],[0.64,0.17]].forEach(b2=>{const bx=W*b2[0],by=H*b2[1];
        g.beginPath();g.moveTo(bx-8,by);g.quadraticCurveTo(bx-3,by-6,bx,by);g.quadraticCurveTo(bx+3,by-6,bx+8,by);g.stroke();});}
  }

  function softReset(){
    dead=false;won=false;started=false;clock=0;eventTimer=0;activeEvent=null;activity=0;windowTaps=0;windowTapT=0;
    clearActive();bedRed=0;standT=0;standTarget=0;tgtYaw=0;tgtPitch=0;lookYaw=0;lookPitch=0;
    camera.position.copy(LIE.pos);
    const dOv=document.getElementById('deathOv');if(dOv)dOv.remove();
    document.getElementById('win').style.display='none';
    scareEl.style.display='none';flash.style.background='#fff';
    CUT.active=false;['lboxT','lboxB','subs','skipCut'].forEach(id=>document.getElementById(id).style.display='none');
    document.getElementById('nightCard').style.display='none';stopSfx('nature');stopSfx('voice');stopSfx('night');stopSfx('gm');stopSfx('ohno');stopSfx('acc');
    document.getElementById('inter').style.display='none';
    document.getElementById('escBar').style.display='none';
    document.getElementById('cert').style.display='none';
    document.getElementById('customPanel').style.display='none';
    talesRun=false;document.getElementById('tales').style.display='none';
    ESC.active=false;escPreT=-1;DISCO.active=false;discoStop();cueEl.classList.remove('big');
    CUSTOM.active=false;refreshMenuXtra();
    document.getElementById('ch').textContent='12:00';
    showScreen('start');
    if(kindMenu){stopSfx('nature');playSfx('nature',0.5);} else startMenuAmb();
  }
  window.__softReset=softReset;

  function showDeath(kind){
    ['scream1','scream2'].forEach(k=>{const a2=SFX[k];if(a2)a2.loop=false;stopSfx(k);});
    let REASON={door:T('r_door'),buff:T('r_buff'),fast:T('r_fast'),window:T('r_window'),neighbor:T('r_neighbor'),bug:T('r_bug')};
    if(window.__escDeath){ // гибель во время ПОБЕГА — свои фразы
      if(window.__escReasonText){REASON={fast:window.__escReasonText,door:window.__escReasonText,window:window.__escReasonText};
        window.__escReasonText=null;window.__escDeath=null;}
      else REASON=LANG==='ru'
        ?{door:'Долговязый настиг тебя на тропе — ты не замер вовремя.',fast:'Рой захлестнул тебя сзади — ты был слишком медленным.',window:'Тень метнулась с обочины — ты не успел свернуть.'}
        :{door:'The tall one caught you on the path — you did not freeze in time.',fast:'The swarm washed over you from behind — too slow.',window:'A shape lunged from the roadside — you failed to dodge.'};
      window.__escDeath=null;}
    const d=document.createElement('div');d.id='deathOv';d.style.cssText='position:fixed;inset:0;z-index:25;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;background:rgba(0,0,0,0.9);color:#c9c3b2;font-family:Cormorant Garamond,serif;text-align:center;padding:20px;';
    const inGame=T('again'); const restart=LANG==='ru'?'ПЕРЕЗАПУСТИТЬ НОЧЬ':'RESTART NIGHT'; const toMenu=LANG==='ru'?'В МЕНЮ':'TO MENU';
    d.innerHTML='<div style="font-size:52px">'+ (LANG==='ru'?'ты не дожил':'you did not survive') +'</div>'+
      '<div style="font-family:Share Tech Mono;font-size:15px;color:#f04a6a;letter-spacing:.05em;max-width:32ch;line-height:1.7">'+(REASON[kind]||(LANG==='ru'?'что-то добралось до тебя':'something got you'))+'</div>'+
      '<div style="display:flex;gap:12px;margin-top:10px;">'+
      '<button id="dRestart" style="font-family:Share Tech Mono;padding:12px 28px;background:transparent;border:1px solid #f04a6a;color:#f04a6a;letter-spacing:.15em;cursor:pointer">'+restart+'</button>'+
      '<button id="dMenu" style="font-family:Share Tech Mono;padding:12px 28px;background:transparent;border:1px solid #c9c3b2;color:#c9c3b2;letter-spacing:.15em;cursor:pointer">'+toMenu+'</button></div>';
    document.body.appendChild(d);
    document.getElementById('dRestart').onclick=()=>{restartNight();};
    document.getElementById('dMenu').onclick=()=>{window.__softReset();};}
  function restartNight(){ // перезапуск текущей ночи (или своей/изнанки) с теми же параметрами
    const wasCustom=CUSTOM.active,wasSecret=CUSTOM.secret;
    const dOv=document.getElementById('deathOv');if(dOv)dOv.remove();
    scareEl.style.display='none';flash.style.background='#fff';
    dead=false;won=false;clearActive();bedRed=0;
    const be=document.getElementById('bedred');if(be)be.style.opacity=0;
    camera.position.copy(LIE.pos);standT=0;standTarget=0;tgtYaw=0;tgtPitch=0;lookYaw=0;lookPitch=0;
    if(wasSecret){startSecretNight();return;}
    if(window.__wasEscape){window.__wasEscape=false;startEscape();return;}
    showNightCard();
  }

  // ================= НОЧЬ 6: ПОБЕГ (авто-бег к воротам) =================
  const ESC={active:false,z:0,dist:225,speed:5.4,threat:null,tT:0,spawnT:2,
    act:null,actT:0,cleared:false,side:1,finale:-1,fT:0};
  const ESC_BASE_Y=-118.4;
  const escG=new THREE.Group();escG.position.set(0,-120,0);escG.visible=false;scene.add(escG);
  let escTall=null,escSwarmGlow=null,escSideL=null,escSideR=null,escGate=null,escSwarm=null,escStepT=0,escFogOld=0.115,escLogHigh=null,escLogLow=null,escLogSide=null,escFallTree=null,escGrate=null;
  let escPreT=-1; // >=0 — идёт пролог (в комнате): вскочить и выбежать
  (function buildEsc(){
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(56,500),M(0x0d1410,1));ground.rotation.x=-Math.PI/2;ground.position.z=-215;escG.add(ground);
    const path=new THREE.Mesh(new THREE.PlaneGeometry(2.6,500),M(0x1a1712,1));path.rotation.x=-Math.PI/2;path.position.set(0,0.01,-215);escG.add(path);
    const tM=M(0x101a14,1),tr2=M(0x171310,1);
    for(let i=0;i<300;i++){const sx=(Math.random()<0.5?-1:1)*(2.3+Math.random()*10),sz=8-i*0.79-Math.random();
      const hh=5.0+Math.random()*2.4; // выше
      const tk=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.17,hh,6),tr2);tk.position.set(sx,hh/2,sz);escG.add(tk);
      for(let k=0;k<4;k++){const c=new THREE.Mesh(new THREE.ConeGeometry(1.25-k*0.24,2.1,7),tM);
        c.position.set(sx,hh*0.62+k*1.25,sz);escG.add(c);}}
    const mn=new THREE.Mesh(new THREE.SphereGeometry(1,20,16),M(0xeaf0fb,1,{emissive:0xeaf0fb,emissiveIntensity:1.8}));mn.position.set(7,13,-170);escG.add(mn);
    escG.add(new THREE.AmbientLight(0x2a3a52,1.7));
    // фонари вдоль всей тропы — видно и старт, и финал
    for(let li=0;li<12;li++){const lx=(li%2?1.6:-1.6),lz=-2-li*20;
      const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.05,1.5,8),M(0x14100c,1));pole.position.set(lx,0.75,lz);escG.add(pole);
      const bl=new THREE.Mesh(new THREE.SphereGeometry(0.1,10,8),M(0xffd9a0,1,{emissive:0xffc470,emissiveIntensity:1.9}));bl.position.set(lx,1.56,lz);escG.add(bl);
      const gl2=new THREE.PointLight(0xd8a24a,1.5,10,2);gl2.position.set(lx,1.65,lz);escG.add(gl2);}
    const l1=new THREE.PointLight(0x9fb8dc,2.6,60,1.6);l1.position.set(3,10,-60);escG.add(l1);
    // ворота в конце
    escGate=new THREE.Group();escGate.position.set(0,0,-222);
    [-1.6,1.6].forEach(x=>{const post=new THREE.Mesh(new THREE.BoxGeometry(0.34,3.6,0.34),M(0x2c2216,0.9));post.position.set(x,1.8,0);escGate.add(post);});
    const arch=new THREE.Mesh(new THREE.BoxGeometry(4.0,0.38,0.34),M(0x2c2216,0.9));arch.position.set(0,3.55,0);escGate.add(arch);
    // ---- ЗАБОР в обе стороны от ворот ----
    const fenceM=M(0x241c12,0.95);
    for(let sn=-1;sn<=1;sn+=2)for(let i=0;i<14;i++){
      const fx=sn*(2.2+i*1.15);
      const pst=new THREE.Mesh(new THREE.BoxGeometry(0.14,2.2,0.14),fenceM);pst.position.set(fx,1.1,0);escGate.add(pst);
      if(i<13){[0.75,1.55].forEach(by=>{const rail=new THREE.Mesh(new THREE.BoxGeometry(1.15,0.1,0.09),fenceM);
        rail.position.set(fx+sn*0.575,by,0);escGate.add(rail);});}}
    // ---- ЖЕЛЕЗНАЯ РЕШЁТКА: падает сверху после того, как ты прошёл ----
    escGrate=new THREE.Group();escGrate.position.set(0,6.9,0);escGate.add(escGrate); // поднята НАД аркой
    const ironM=M(0x4a4e56,0.45,{metalness:0.85});
    for(let i=0;i<9;i++){const bar=new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.045,3.1,8),ironM);
      bar.position.set(-1.4+i*0.35,-1.55,0);escGrate.add(bar);}
    [0.2,-1.5,-3.0].forEach(by=>{const cr=new THREE.Mesh(new THREE.BoxGeometry(3.3,0.09,0.09),ironM);
      cr.position.set(0,by,0);escGrate.add(cr);});
    // острые нижние зубья
    for(let i=0;i<9;i++){const sp=new THREE.Mesh(new THREE.ConeGeometry(0.05,0.22,6),ironM);
      sp.position.set(-1.4+i*0.35,-3.2,0);sp.rotation.x=Math.PI;escGrate.add(sp);}

    const gl=new THREE.PointLight(0xffd9a0,2.2,10,2);gl.position.set(0,3.0,0.5);escGate.add(gl);
    escG.add(escGate);
    // «Долговязый» на тропе
    escTall=new THREE.Group();escTall.visible=false;
    const tb=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.2,2.8,10),matDark);tb.position.y=1.6;escTall.add(tb);
    const th2=new THREE.Mesh(new THREE.SphereGeometry(0.15,12,10),matDark);th2.position.y=3.25;th2.scale.y=1.7;escTall.add(th2);
    [-1,1].forEach(sn=>{const arm=new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.03,2.0,8),matDark);
      arm.position.set(sn*0.24,1.6,0);arm.rotation.z=sn*0.06;escTall.add(arm);});
    const tEyeM=M(0x000000,1,{emissive:0xbcd8ff,emissiveIntensity:1.6});
    [-1,1].forEach(sn=>{const e2=new THREE.Mesh(new THREE.SphereGeometry(0.025,8,8),tEyeM);e2.position.set(sn*0.055,3.32,0.13);escTall.add(e2);});
    escG.add(escTall);
    // свечение роя сзади
    escSwarmGlow=new THREE.PointLight(0xff5522,0,10,2);escG.add(escSwarmGlow);
    // боковые силуэты
    function sideSil(){const g=new THREE.Group();g.visible=false;
      const b2=new THREE.Mesh(new THREE.SphereGeometry(0.5,10,8),matDark);b2.scale.set(0.5,1.3,0.5);b2.position.y=0.8;g.add(b2);
      const h2=new THREE.Mesh(new THREE.SphereGeometry(0.17,10,8),matDark);h2.position.y=1.7;g.add(h2);escG.add(g);return g;}
    escSideL=sideSil();escSideR=sideSil();
    const rEyeM=M(0x000000,1,{emissive:0xdd2222,emissiveIntensity:1.4});
    [escSideL,escSideR].forEach(g2=>{[-0.05,0.05].forEach(x2=>{
      const e2=new THREE.Mesh(new THREE.SphereGeometry(0.03,8,8),rEyeM);e2.position.set(x2,1.72,0.14);g2.add(e2);});});
    // стая: три хитиновых твари с янтарными глазами
    // ---- ПРЕПЯТСТВИЯ: поваленные стволы ----
    const barkM=M(0x2a2018,0.95),barkEnd=M(0x4a3a28,0.9);
    function makeLog(len,rad,h){const g=new THREE.Group();
      const tr=new THREE.Mesh(new THREE.CylinderGeometry(rad,rad*1.08,len,12),barkM);tr.rotation.z=Math.PI/2;g.add(tr);
      [-1,1].forEach(sn=>{const cap=new THREE.Mesh(new THREE.CylinderGeometry(rad*1.02,rad*1.02,0.05,12),barkEnd);
        cap.rotation.z=Math.PI/2;cap.position.x=sn*len/2;g.add(cap);});
      for(let k=0;k<5;k++){const br=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.05,0.5,6),barkM);
        br.position.set(-len/2+Math.random()*len,rad*0.6,0);br.rotation.set(Math.random()*1.2,Math.random()*3,Math.random()*1.2);g.add(br);}
      // ---- опоры: ствол не висит, а лежит на пнях и упирается корнем в землю ----
      const coreM=M(0xa8865c,0.85);            // светлая древесина на сколе
      [-1,1].forEach(sn=>{
        const bx=sn*(len*0.30),by=-h/2-rad*0.5;
        // расширяющийся книзу пень
        const stump=new THREE.Mesh(new THREE.CylinderGeometry(rad*1.45,rad*2.1,h,12),barkM);
        stump.position.set(bx,by,0);g.add(stump);
        // рваный скол сверху: кольца и щепа
        const top=new THREE.Mesh(new THREE.CylinderGeometry(rad*1.46,rad*1.46,0.05,12),coreM);
        top.position.set(bx,by+h/2,0);g.add(top);
        for(let r2=1;r2<=3;r2++){const ring=new THREE.Mesh(new THREE.TorusGeometry(rad*0.4*r2,0.012,6,16),M(0x7a5c38,0.9));
          ring.rotation.x=Math.PI/2;ring.position.set(bx,by+h/2+0.03,0);g.add(ring);}
        for(let k=0;k<5;k++){const sp=new THREE.Mesh(new THREE.ConeGeometry(0.045,0.28,5),coreM);
          const a2=Math.random()*6.28;
          sp.position.set(bx+Math.cos(a2)*rad*0.9,by+h/2+0.1,Math.sin(a2)*rad*0.9);
          sp.rotation.set(Math.random()*0.5-0.25,a2,Math.random()*0.5-0.25);g.add(sp);}
        // корни-лапы, уходящие в землю
        for(let k=0;k<5;k++){const a2=k/5*6.28+sn;
          const rt=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.11,rad*2.6,6),barkM);
          rt.position.set(bx+Math.cos(a2)*rad*1.5,by-h/2+0.05,Math.sin(a2)*rad*1.5);
          rt.rotation.set(Math.PI/2.4,a2,0);g.add(rt);}
        // мох у основания и на скате
        const moss=new THREE.Mesh(new THREE.SphereGeometry(rad*1.7,10,8),M(0x2f5230,1));
        moss.scale.set(1,0.28,1);moss.position.set(bx,by-h/2+0.06,0);g.add(moss);
        const moss2=new THREE.Mesh(new THREE.SphereGeometry(rad*0.6,8,6),M(0x38602f,1));
        moss2.scale.set(1.4,0.5,1);moss2.position.set(bx+rad*0.9,by+h*0.2,rad*0.5);g.add(moss2);
        // поганки
        for(let k=0;k<2;k++){const st2=new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.022,0.09,6),M(0xd8d0b8,0.9));
          const mx=bx+(k?0.9:-0.75)*rad,mz=(k?1:-1)*rad*0.8;
          st2.position.set(mx,by-h/2+0.06,mz);g.add(st2);
          const cap=new THREE.Mesh(new THREE.SphereGeometry(0.05,8,6),M(0x8a5a3a,0.85));
          cap.scale.set(1,0.55,1);cap.position.set(mx,by-h/2+0.12,mz);g.add(cap);}});
      // корневой ком у левого края
      const root=new THREE.Mesh(new THREE.SphereGeometry(rad*2.4,10,8),barkM);
      root.scale.set(0.55,1,0.9);root.position.set(-len/2-rad*0.6,-h*0.5,0);g.add(root);
      for(let k=0;k<6;k++){const rr=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.06,rad*3.2,5),barkM);
        rr.position.set(-len/2-rad*0.8,-h*0.5,0);
        rr.rotation.set(Math.random()*2-1,Math.random()*3,Math.random()*2-1);g.add(rr);}
      g.visible=false;escG.add(g);return g;}
    escLogHigh=makeLog(7,0.3,1.32);   // на уровне груди — ПОДКАТ (S)
    escLogLow =makeLog(7,0.26,0.30);  // низко у земли — ПРЫЖОК (ПРОБЕЛ)
    escLogSide=makeLog(3.4,0.28,0.85);// перегородил половину — УХОД (A/D)
    // дерево, которое рухнет на них в финале
    escFallTree=new THREE.Group();escFallTree.position.set(-3.2,0,-149);escFallTree.visible=false;
    {const tk=new THREE.Mesh(new THREE.CylinderGeometry(0.38,0.62,15,12),barkM);tk.position.y=7.5;escFallTree.add(tk);
     for(let k=0;k<5;k++){const c=new THREE.Mesh(new THREE.ConeGeometry(3.0-k*0.5,3.4,9),M(0x101a14,1));c.position.y=9.5+k*2.1;escFallTree.add(c);}
     for(let k=0;k<7;k++){const br=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.12,2.6,6),barkM);
       br.position.set(0,4+k*1.5,0);br.rotation.set(Math.random()*0.8-0.4,Math.random()*3,1.1+Math.random()*0.5);escFallTree.add(br);}}
    escG.add(escFallTree);
    escSwarm=new THREE.Group();escSwarm.visible=false;escG.add(escSwarm);
    for(let k=0;k<3;k++){const cb=new THREE.Group();
      const bd=new THREE.Mesh(new THREE.SphereGeometry(0.16,10,8),matDark);bd.scale.set(1.2,0.6,1.4);bd.position.y=0.13;cb.add(bd);
      [-0.04,0.04].forEach(x2=>{const e2=new THREE.Mesh(new THREE.SphereGeometry(0.016,6,6),M(0x000000,1,{emissive:0xffaa22,emissiveIntensity:1.6}));
        e2.position.set(x2,0.17,0.2);cb.add(e2);});
      cb.position.set((k-1)*0.5,0,k*0.35);escSwarm.add(cb);}
  })();
  let escCueText='';
  function escCue(t){escCueText=t;setCue(t,true);}
  function startEscape(){
    stopMenuAmb();stopSfx('nature');document.getElementById('start').style.display='none';
    showNightCard(6); // NIGHT не трогаем — побег не «ночь» в прогрессии
    setTimeout(()=>{
      started=false;ESC.active=true;escPreT=0; // пролог: комната, прыжок с кровати
      ESC.z=6;ESC.dist=225;ESC.speed=5.4;ESC.threat=null;ESC.spawnT=2;
      ESC.act=null;ESC.actT=0;ESC.cleared=false;ESC.finale=-1;ESC.fT=0;ESC.falling=false;ESC.fallT=0;ESC.bag=null;ESC.last2=null;ESC._grate=false;
      if(escGrate){escGrate.position.set(0,6.9,0);escGrate.rotation.set(0,0,0);}
      if(escGate){escGate.children.forEach((ch,i)=>{if(i<3){ch.rotation.set(0,0,0);}});
        escGate.children[0]&&escGate.children[0].position.set(-1.6,1.8,0);
        escGate.children[1]&&escGate.children[1].position.set(1.6,1.8,0);
        escGate.children[2]&&escGate.children[2].position.set(0,3.55,0);}
      ESC._showed=false;ESC._fell=false;ESC._crash=false;ESC._fall=0;
      camera.position.copy(LIE.pos);lookYaw=0;lookPitch=0;doorTarget=0;doorAngle=0;
      cueEl.classList.add('big');
      playSfx('ohno',0.85); // ПОГОНЯ пошла
    },2350);
  }

  // ---- препятствия: поваленные стволы, всё на чистую реакцию ----
  function escHideLogs(){escLogHigh.visible=false;escLogLow.visible=false;escLogSide.visible=false;}
  function escActiveLog(){return ESC.threat==='slide'?escLogHigh:ESC.threat==='jump'?escLogLow:escLogSide;}
  function escSpawn(){
    // мешок: каждый тип обязательно встречается, не более двух одинаковых подряд
    if(!ESC.bag||!ESC.bag.length){ESC.bag=['slide','jump','dodge','slide','jump','dodge'];
      for(let i=ESC.bag.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[ESC.bag[i],ESC.bag[j]]=[ESC.bag[j],ESC.bag[i]];}}
    let pick=ESC.bag.pop();
    if(ESC.last2&&ESC.last2[0]===pick&&ESC.last2[1]===pick&&ESC.bag.length){
      const alt=ESC.bag.findIndex(x=>x!==pick);
      if(alt>=0){const tmp=ESC.bag[alt];ESC.bag[alt]=pick;pick=tmp;}}
    ESC.last2=[(ESC.last2||[])[1],pick];
    const zz=ESC.z-30;ESC.tT=0;ESC.cleared=false;
    ESC.act=null;ESC.hinted=false;
    if(pick==='slide'){ESC.threat='slide';escLogHigh.visible=true;escLogHigh.position.set(0,1.32,zz);escLogHigh.rotation.set(0,0.1,0.04);creak();}
    else if(pick==='jump'){ESC.threat='jump';escLogLow.visible=true;escLogLow.position.set(0,0.3,zz);escLogLow.rotation.set(0,-0.14,0.03);thud();}
    else{ESC.side=Math.random()<0.5?-1:1;ESC.threat='dodge';
      escLogSide.visible=true;escLogSide.position.set(ESC.side*1.5,0.85,zz);escLogSide.rotation.set(0,0.3*ESC.side,0.06);knock();}
  }
  function escDo(type){
    ESC.act=type;ESC.actT=0;escCue('');
    if(AC){if(type==='slide')noise(0.4,0.2,900);
      else if(type==='jump'){tone(150,'sine',0.22,0.14,90);setTimeout(()=>{if(AC)noise(0.12,0.14,600);},480);}
      else noise(0.22,0.15,1500);}
    if(AC&&type==='dodge')noise(0.2,0.12,1500);
  }
  function escKey(e){
    if(!ESC.active||ESC.finale>=0||ESC.falling)return;
    if(e.repeat)return;            // зажатая клавиша не повторяет движение
    if(ESC.act)return;             // строго: новое движение только после конца текущего
    // жать можно когда угодно — важно лишь не задеть ствол
    if(e.code==='KeyS'||e.code==='ArrowDown'){e.preventDefault();escDo('slide');}
    else if(e.code==='Space'){e.preventDefault();escDo('jump');}
    else if(e.code==='KeyA'||e.code==='ArrowLeft'){e.preventDefault();ESC.dodgeDir=-1;escDo('dodge');}
    else if(e.code==='KeyD'||e.code==='ArrowRight'){e.preventDefault();ESC.dodgeDir=1;escDo('dodge');}
  }
  function escFail(){
    if(ESC.falling)return;
    ESC.falling=true;ESC.fallT=0;escCue('');
    if(AC){thud();noise(0.5,0.3,300);}
    fadeSfx('ohno',700);
  }
  function escFallUpdate(dt){ // падение, и только потом скример
    ESC.fallT+=dt;const p=Math.min(1,ESC.fallT/0.85);
    const e=p*p;
    camera.position.set(camera.position.x+(Math.random()-0.5)*0.05,
      ESC_BASE_Y-1.25*e,ESC.z-e*0.9);
    camera.rotation.set(-0.9*e,camera.rotation.y,0.55*e+(Math.random()-0.5)*0.05,'YXZ');
    if(ESC.fallT>1.15){escFinishFail();}
  }
  function escFinishFail(){
    ESC.falling=false;ESC.active=false;escPreT=-1;ESC.finale=-1;escHideLogs();escG.visible=false;
    document.getElementById('escBar').style.display='none';
    scene.fog.density=escFogOld;cueEl.classList.remove('big');stopSfx('ohno');
    window.__escDeath='fast';window.__wasEscape=true;
    window.__escReasonText=(LANG==='ru'
      ?{slide:'Ты не успел пригнуться — ствол встретил тебя на бегу.',
         jump:'Ты запнулся о ствол и покатился в траву.',
         dodge:'Ты влетел прямо в поваленное дерево.'}
      :{slide:'You did not duck in time — the trunk caught you mid-run.',
         jump:'You tripped over the trunk and went down.',
         dodge:'You ran straight into the fallen tree.'})[ESC.threat||'jump'];
    jumpscare('fast');
  }

  // ---- финал: ворота, погоня отстаёт, дерево падает на них ----
  function escStartFinale(){
    escHideLogs();ESC.threat=null;escCue('');
    fadeSfx('ohno',2600);
    setTimeout(()=>{if(ESC.finale>=0)playSfx('nature',0.7);},1600);
  }
  function escFinale(dt){
    ESC.fT+=dt;const t=ESC.fT,nowS=performance.now()/1000;
    const gateZ=-222;
    if(t<2.4){ // пробегаем ворота и тормозим ЗА ними
      const sp=ESC.speed*(1-t/2.4);ESC.z-=sp*dt;
      const bob=Math.abs(Math.sin(nowS*8))*0.1*(1-t/2.4);
      camera.position.set(0,ESC_BASE_Y+bob,ESC.z);camera.rotation.set(-0.02,0,0,'YXZ');}
    else if(t<3.9){ // оборачиваемся к воротам
      const pr=(t-2.4)/1.5;camera.position.set(0,ESC_BASE_Y,ESC.z);
      camera.rotation.set(0,Math.PI*pr,0,'YXZ');
      // решётка с лязгом падает за спиной
      if(escGrate){const gp=Math.min(1,pr*1.6);escGrate.position.y=6.9-3.75*gp*gp;
        if(gp>=1&&!ESC._grate){ESC._grate=true;if(AC){thud();noise(0.35,0.25,2600);}}}
      if(!ESC._showed){ESC._showed=true;
        // они уже близко — сразу за воротами
        escTall.visible=true;escTall.position.set(0.7,0,gateZ+4.5);
        escSwarm.visible=true;escSwarm.position.set(-0.7,0,gateZ+5.2);
        escSideL.visible=true;escSideL.position.set(-1.9,0,gateZ+4.8);
        escSideR.visible=true;escSideR.position.set(1.9,0,gateZ+4.8);}}
    else{
      const ft=t-3.9;
      // мы пятимся от ворот и спотыкаемся
      const back=Math.min(1,ft/2.0), stumble=Math.max(0,Math.min(1,(ft-1.5)/0.7));
      const zBack=ESC.z-back*3.2;
      const drop=stumble*0.85, tilt=stumble*0.55;
      camera.position.set(Math.sin(ft*3)*0.05,ESC_BASE_Y-drop,zBack);
      camera.rotation.set(-tilt*0.25,Math.PI,tilt*0.22+Math.sin(ft*9)*0.01*(1-stumble),'YXZ');
      // они подбегают ВПЛОТНУЮ к воротам и тянут лапы
      const run=Math.min(1,ft/1.9);
      escTall.position.z=gateZ+4.5-run*4.0;escTall.rotation.x=0.26*run;
      escTall.children.forEach((ch,i)=>{if(i===2||i===3)ch.rotation.x=-1.15*run;});
      escSwarm.position.z=gateZ+5.2-run*4.4;
      escSwarm.children.forEach((cb,k)=>{cb.position.y=Math.abs(Math.sin(nowS*11+k))*0.09;});
      [escSideL,escSideR].forEach((g2,i)=>{g2.rotation.x=-0.34*run;
        g2.position.z=gateZ+4.8-run*4.2;g2.position.x=(i?1.9:-1.9)*(1-run*0.42);});
      // БОЛЬШОЕ дерево валится ПОПЕРЁК ворот, прямо на них
      if(ft>2.4&&!ESC._fell){ESC._fell=true;ESC._fall=0;
        escFallTree.visible=true;escFallTree.position.set(-6.5,0,gateZ+0.9);escFallTree.rotation.set(0,0,0);
        if(AC){creak();setTimeout(()=>{if(AC)creak();},300);}}
      if(ESC._fell&&!ESC._crash){
        ESC._fall=Math.min(1,ESC._fall+dt*0.9);
        const f=ESC._fall*ESC._fall;
        escFallTree.rotation.z=-(Math.PI/2)*f; // валится ВПРАВО, накрывая ворота
        if(ESC._fall>=1){ESC._crash=true;
          if(AC){thud();noise(0.9,0.4,180);setTimeout(()=>{if(AC)noise(0.5,0.2,90);},160);}
          escTall.visible=false;escSwarm.visible=false;escSideL.visible=false;escSideR.visible=false;
          // дерево ломает ворота: арка проваливается, решётка кренится, столбы валятся
          if(escGate){escGate.children.forEach((ch,i)=>{
            if(i===2){ch.position.y-=0.9;ch.rotation.z=0.32;}          // арка
            if(i===0){ch.rotation.z=-0.42;ch.position.x-=0.35;}        // левый столб
            if(i===1){ch.rotation.z=0.5;ch.position.x+=0.4;}});}
          if(escGrate){escGrate.rotation.z=-0.3;escGrate.position.x=-0.55;escGrate.position.y-=0.4;}
          if(SET.shake){flash.style.transition='none';flash.style.opacity='0.55';
            requestAnimationFrame(()=>{flash.style.transition='opacity .8s';flash.style.opacity='0';});}}}
      if(ft>5.6){
        ESC.active=false;ESC.finale=-1;escG.visible=false;escFallTree.visible=false;
        escFallTree.rotation.set(0,0,0);escTall.rotation.x=0;
        escTall.children.forEach((ch,i)=>{if(i===2||i===3)ch.rotation.x=0;});
        document.getElementById('escBar').style.display='none';
        scene.fog.density=escFogOld;cueEl.classList.remove('big');
        showCertificate();}
    }
  }

  function escUpdate(dt){
    if(escPreT>=0){ // ---- пролог 8с: выбраться из койки, встать, дойти + обучение ----
      escPreT+=dt;const T=escPreT;
      const ease=x=>x*x*(3-2*x), cl=(a,b2,x)=>Math.max(0,Math.min(1,(x-a)/(b2-a)));
      const BX=LIE.pos.x, BY=LIE.pos.y, BZ=LIE.pos.z;
      const OUT_X=-0.95;            // край койки: тут над головой уже нет верхней полки
      const STAND_Y=BY+0.66;
      let x,y,z,pitch=0,roll=0,yaw=0;
      if(T<1.2){ // лежим, открываем глаза, смотрим на дверь
        const p1=ease(cl(0,1.2,T));
        x=BX;y=BY;z=BZ;pitch=0.36*(1-p1)-0.02;yaw=p1*0.26;
      }else if(T<2.4){ // садимся и СМЕЩАЕМСЯ к краю, из-под верхней койки
        const p2=ease(cl(1.2,2.4,T));
        x=BX+(OUT_X-BX)*p2*0.72;y=BY+p2*0.30;z=BZ-p2*0.16;
        pitch=-0.02;yaw=0.26-p2*0.14;roll=Math.sin(p2*Math.PI)*0.035;
      }else if(T<3.4){ // теперь встаём — голова уже вне койки
        const p3=ease(cl(2.4,3.4,T));
        x=BX+(OUT_X-BX)*(0.72+p3*0.28);y=BY+0.30+p3*0.36;z=BZ-0.16-p3*0.22;
        pitch=-0.06+p3*0.04;yaw=0.12-p3*0.09;roll=Math.sin(p3*Math.PI)*0.03;
      }else if(T<6.2){ // идём к двери
        const p4=ease(cl(3.4,6.2,T));
        x=OUT_X+(0-OUT_X)*p4;y=STAND_Y+Math.abs(Math.sin(T*6.8))*0.032;
        z=(BZ-0.38)+((-3.15)-(BZ-0.38))*p4;
        pitch=-0.02;roll=Math.sin(T*6.8)*0.012;
      }else{ // распахиваем дверь и шагаем в проём
        const p5=ease(cl(6.2,7.0,T));
        x=0;y=STAND_Y+Math.abs(Math.sin(T*7.4))*0.028;z=-3.15-p5*0.6;
        pitch=-0.02;roll=Math.sin(T*7.4)*0.01;
      }
      camera.position.set(x,y,z);camera.rotation.set(pitch,-yaw,roll,'YXZ');
      // ---- обучение управлению по ходу ----
      const TUT=LANG==='ru'
        ?[[0.4,'впереди будут поваленные деревья'],
          [2.0,'A — уйти ВЛЕВО от дерева · D — ВПРАВО'],
          [3.6,'S — ПОДКАТ под ствол'],
          [5.2,'ПРОБЕЛ — ПЕРЕПРЫГНУТЬ']]
        :[[0.4,'fallen trees lie ahead'],
          [2.0,'A — go LEFT of the tree · D — RIGHT'],
          [3.6,'S — SLIDE under the trunk'],
          [5.2,'SPACE — JUMP over it']];
      let tShow='';
      for(const [tt,txt] of TUT)if(T>=tt&&T<tt+1.5)tShow=txt;
      if(tShow!==ESC._tut){ESC._tut=tShow;escCue(tShow);}
      if(T>6.5&&doorTarget<0.9){doorTarget=0.95;creak();setTimeout(()=>{if(AC)thud();},280);}
      doorAngle+=((-doorTarget)-doorAngle)*0.11;doorPivot.rotation.y=doorAngle;
      if(escPreT>=7.0){
        escPreT=-1;doorTarget=0;ESC._tut='';
        escG.visible=true;document.getElementById('escBar').style.display='block';
        escFogOld=scene.fog.density;scene.fog.density=0.045;
        if(SET.shake){flash.style.transition='none';flash.style.opacity='0.55';
          requestAnimationFrame(()=>{flash.style.transition='opacity .5s';flash.style.opacity='0';});}
        escCue(LANG==='ru'?'БЕГИ':'RUN');setTimeout(()=>escCue(''),2000);}
      return;}
    if(ESC.falling){escFallUpdate(dt);return;}
    if(ESC.finale>=0){escFinale(dt);return;}
    const nowS=performance.now()/1000;
    ESC.z-=ESC.speed*dt;ESC.dist-=ESC.speed*dt; // бежим всегда, реакции не тормозят
    document.getElementById('escFill').style.width=Math.max(0,Math.min(100,(1-ESC.dist/225)*100))+'%';
    // ---- анимации действий ----
    let yOff=0,xOff=0,roll=0,pitch=0;
    if(ESC.act){ESC.actT+=dt;
      if(ESC.act==='slide'){const pr=Math.min(1,ESC.actT/0.78);
        yOff=-1.08*Math.sin(pr*Math.PI);pitch=0.2*Math.sin(pr*Math.PI);roll=0.13*Math.sin(pr*Math.PI);
        if(pr>=1)ESC.act=null;}
      else if(ESC.act==='jump'){const pr=Math.min(1,ESC.actT/0.72);
        yOff=1.45*Math.sin(pr*Math.PI);pitch=-0.12*Math.sin(pr*Math.PI);
        if(pr>=1)ESC.act=null;}
      else{const pr=Math.min(1,ESC.actT/0.7);const dd=ESC.dodgeDir||(-ESC.side);
        xOff=dd*1.55*Math.sin(pr*Math.PI);roll=-dd*0.17*Math.sin(pr*Math.PI);
        if(pr>=1)ESC.act=null;}}
    const bob=ESC.act?0:Math.abs(Math.sin(nowS*8.6))*0.11;
    const jit=(ESC.threat&&!ESC.cleared?0.038:0.014);
    camera.position.set(xOff+Math.sin(nowS*3.4)*0.06+(Math.random()-0.5)*jit,
      ESC_BASE_Y+bob+yOff+(Math.random()-0.5)*jit,ESC.z);
    camera.rotation.set(-0.02+pitch+(Math.random()-0.5)*jit*0.5,
      Math.sin(nowS*0.7)*0.04,roll+(Math.random()-0.5)*jit*0.4,'YXZ');
    // звук бега и леса
    if(!ESC.act){escStepT-=dt;if(escStepT<=0){escStepT=0.27;if(AC)noise(0.05,0.12,430);}}
    if(AC&&Math.random()<dt*0.04)tone(620,'sine',0.5,0.04,540);
    // ---- столкновение ----
    if(ESC.threat){
      const gap=ESC.z-escActiveLog().position.z;
      if(gap<0.7){ // момент истины: правильная ли поза
        const ok=(ESC.act===ESC.threat)&&(ESC.actT<0.62)&&
          (ESC.threat!=='dodge'||(ESC.dodgeDir||0)===-ESC.side);
        if(!ok){escFail();return;}
        ESC.threat=null;escHideLogs();ESC.spawnT=0.18+Math.random()*0.32;}}
    else if(ESC.dist>52){ESC.spawnT-=dt;if(ESC.spawnT<=0)escSpawn();} // за воротами не спавним
    if(ESC.dist<=0){ESC.finale=0;ESC.fT=0;escStartFinale();}
  }

  // ================= НОЧЬ 7: ДИСКОТЕКА =================
  const DISCO={active:false,t:0,light:null,timer:null};
  function discoStart(){ // НОЧЬ 7 — «ПАМЯТЬ»: все, кто пугал, просто отдыхают
    document.getElementById('start').style.display='none';stopMenuAmb();
    showNightCard(7); // NIGHT не трогаем
    setTimeout(()=>{
      started=false;DISCO.active=true;DISCO.t=0;
      camera.position.copy(LIE.pos);tgtYaw=0.5;tgtPitch=0;lookYaw=0.5;
      if(!DISCO.light){DISCO.light=new THREE.PointLight(0xffb45e,0,9,2);DISCO.light.position.set(1.6,1.0,-2.6);scene.add(DISCO.light);}
      DISCO.light.intensity=2.0; // свеча на тумбочке
      // все на своих местах, мирно
      buff.visible=true;buff.position.set(0,0,-3.1);buff.rotation.set(0.22,0,0);buff.scale.set(1,1.1,1); // стоит у двери, склонив голову
      doorTarget=0.35;
      creature.visible=true;creatureFlee=false;creature.position.set(1.5,0.72,-2.95);creature.scale.set(0.5,0.5,0.5); // красная тварь на правой тумбочке, у кекса
      creature2.visible=true; // мелкая чёрная — скачет на соседе
      sil.visible=true;                                        // стоят за окном, не стучат
      ghost.visible=true;                                       // сидит наверху
      boyFacing(true,false);                                    // сосед просто смотрит — сегодня можно
      const L7=window.GAME_DATA.NIGHT7[LANG];
      let li7=0;
      (function seq(){if(!DISCO.active)return;
        if(li7>=L7.length){discoStop();kindMenu=true;nightsBeaten=Math.max(nightsBeaten,7);showTales();return;}
        escCue(L7[li7]);setTimeout(()=>{escCue('');setTimeout(()=>{li7++;seq();},400);},4400);})();
    },2350);
  }
  function discoStop(){DISCO.active=false;if(DISCO.timer){clearInterval(DISCO.timer);DISCO.timer=null;}
    if(DISCO.light)DISCO.light.intensity=0;ghost.visible=false;sil.visible=false;doorTarget=0;
    buff.visible=false;buff.rotation.set(0,0,0);buff.scale.set(1,1,1);
    creature.visible=false;creature.scale.set(1,1,1);creature2.visible=false;boyFacing(false);setCue('');}

  // ================= СВОЯ НОЧЬ =================
  ['Door','Steps','Win','Nb','Bug'].forEach(k=>{
    document.getElementById('c'+k).addEventListener('input',e=>{document.getElementById('v'+k).textContent=e.target.value;});});
  function applyCustomLang(){
    const T2=LANG==='ru'?{t:'СВОЯ НОЧЬ',d:'Дверь',s:'Топот',w:'Окно',n:'Сосед',b:'Бабайка',go:'НАЧАТЬ',back:'НАЗАД'}
      :{t:'CUSTOM NIGHT',d:'Door',s:'Footsteps',w:'Window',n:'Neighbor',b:'Under-bed',go:'START',back:'BACK'};
    const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
    set('cpTitle',T2.t);
    const L2=document.querySelectorAll('#customPanel label');
    if(L2[0])L2[0].childNodes[0].textContent=T2.d+' ';
    if(L2[1])L2[1].childNodes[0].textContent=T2.s+' ';
    if(L2[2])L2[2].childNodes[0].textContent=T2.w+' ';
    if(L2[3])L2[3].childNodes[0].textContent=T2.n+' ';
    if(L2[4])L2[4].childNodes[0].textContent=T2.b+' ';
    set('cpStart',T2.go);set('cpBack',T2.back);}
  document.getElementById('btnCustom').addEventListener('click',()=>{applyCustomLang();document.getElementById('customPanel').style.display='flex';});
  document.getElementById('cpBack').addEventListener('click',()=>{document.getElementById('customPanel').style.display='none';});
  document.getElementById('cpStart').addEventListener('click',()=>{
    const v={door:+cDoor.value,steps:+cSteps.value,win:+cWin.value,nb:+cNb.value,bug:+cBug.value};
    const vals=Object.values(v),sum=vals.reduce((a2,b2)=>a2+b2,0),avg=sum/5;
    document.getElementById('customPanel').style.display='none';
    document.getElementById('start').style.display='none';stopMenuAmb();
    // пасхалка: все нули — проспал
    if(sum===0){setTimeout(()=>{
      const iv=document.getElementById('inter'),it=document.getElementById('interText');
      iv.style.display='flex';it.textContent=LANG==='ru'?'Ты проспал всю ночь. Повезло.':'You slept through the whole night. Lucky.';it.style.opacity=1;
      setTimeout(()=>{it.style.opacity=0;setTimeout(()=>{iv.style.display='none';softReset();},800);},3200);},300);return;}
    // ===== КОД-ПАСХАЛКИ через ползунки (Дверь-Топот-Окно-Сосед-Бабайка) =====
    const code=[v.door,v.steps,v.win,v.nb,v.bug].join('-');
    const closeCP=()=>{document.getElementById('customPanel').style.display='none';};
    if(code==='5-7-0-5-7'){egg('kane');closeCP();showEgg();return;}
    if(code==='6-7-0-6-7'){egg('s67');closeCP();scare67();return;}
    if(code==='1-2-3-4-5'){if(!window.__catOnce){window.__catOnce=true;egg('cat');closeCP();catScare();return;}}
    if(code==='7-7-7-7-7'){egg('jackpot');closeCP(); // ДЖЕКПОТ
      if(AC){[523,659,784,1047].forEach((f,i)=>setTimeout(()=>tone(f,'square',0.12,0.18,f),i*110));}
      const j=document.createElement('div');j.style.cssText='position:fixed;inset:0;z-index:79;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.85);font-family:Cormorant Garamond,serif;font-size:12vw;color:#f0d94a;text-shadow:0 0 40px #f0d94a;pointer-events:none;';
      j.textContent='7 7 7';document.body.appendChild(j);
      setTimeout(()=>{j.remove();backToMenu();},2200);return;}
    // ТАЙНА: код года 1989 на ползунках (Дверь1 Топот9 Окно8 Сосед9 Бабайка0) открывает ИЗНАНКУ
    if(v.door===1&&v.steps===9&&v.win===8&&v.nb===9&&v.bug===0){startSecretNight();return;}
    CUSTOM.active=true;CUSTOM.secret=false;CUSTOM.all10=vals.every(x=>x===10);
    CUSTOM.np={f:Math.max(0.42,2.0-avg*0.16),c:Math.max(0.35,2.0-avg*0.17)}; // avg=10 → события каждые ~3–5 сек
    // пул событий, взвешенный ползунками
    const pool=[];
    const add=(t2,n)=>{for(let i2=0;i2<n;i2++)pool.push(t2);};
    add('door_slow',v.door);add('short',Math.ceil(v.steps/2));add('fast',Math.floor(v.steps/2)+ (v.steps?1:0));
    add('window',v.win);add('neighbor',v.nb);add('bug',v.bug);
    CUSTOM.pool=pool.length?pool:['door_slow'];
    showNightCard();
  });
  function maxNightScene(){ // награда за 10/10/10/10/10 — огненная корона из всех тварей
    const ov=document.createElement('div');ov.style.cssText='position:fixed;inset:0;z-index:82;background:#000;overflow:hidden;';
    ov.innerHTML='<canvas id="maxCv" style="position:absolute;inset:0;width:100%;height:100%;"></canvas>';
    document.body.appendChild(ov);
    const cv=ov.querySelector('#maxCv'),g=cv.getContext('2d');const t0=performance.now();let run=true;
    if(AC){[262,330,392,523].forEach((f,i)=>setTimeout(()=>tone(f,'sine',1.5,0.14,f),i*180));}
    (function draw(nw){if(!run)return;const t=(nw-t0)/1000;cv.width=innerWidth;cv.height=innerHeight;
      const W=cv.width,H=cv.height,cx=W/2,cy=H*0.5;
      // тёмно-багровый пульс
      const bg=g.createRadialGradient(cx,cy,20,cx,cy,Math.max(W,H)*0.7);
      bg.addColorStop(0,'#2a0a12');bg.addColorStop(1,'#050004');g.fillStyle=bg;g.fillRect(0,0,W,H);
      // корона из 6 морд по кругу, вращается
      const kinds=Object.keys(SCARE);const R=Math.min(W,H)*0.3;
      for(let i=0;i<kinds.length;i++){const k=kinds[i];const a2=t*0.5+i/kinds.length*Math.PI*2;
        const x=cx+Math.cos(a2)*R,y=cy+Math.sin(a2)*R,sz=Math.min(W,H)*0.16;
        const off=document.createElement('canvas');off.width=off.height=128;
        const og=off.getContext('2d');og.clearRect(0,0,128,128);
        try{SCARE[k](og,128,128,t*0.4);}catch(e){continue;}
        g.save();g.globalAlpha=0.85;g.translate(x,y);g.rotate(a2+Math.PI/2);g.drawImage(off,-sz/2,-sz/2,sz,sz);g.restore();}
      // золотая звезда в центре
      g.save();g.translate(cx,cy);g.rotate(t*0.3);const pts=5,or=Math.min(W,H)*0.11*(1+Math.sin(t*3)*0.06),ir=or*0.42;
      g.fillStyle='#f0d94a';g.shadowColor='#f0d94a';g.shadowBlur=50;g.beginPath();
      for(let i=0;i<pts*2;i++){const rad=i%2?ir:or,an=i/(pts*2)*Math.PI*2-Math.PI/2;
        g[i?'lineTo':'moveTo'](Math.cos(an)*rad,Math.sin(an)*rad);}g.closePath();g.fill();g.restore();g.shadowBlur=0;
      // искры
      for(let i=0;i<40;i++){const a2=t*2+i,rr=R*(1.2+Math.sin(t*3+i)*0.3);
        g.fillStyle='rgba(240,180,80,'+(0.3+Math.sin(t*5+i)*0.3)+')';
        g.fillRect(cx+Math.cos(a2)*rr,cy+Math.sin(a2)*rr,2,2);}
      // текст
      g.fillStyle='#f7f2e6';g.textAlign='center';g.font='italic '+Math.round(Math.min(W,H)*0.045)+'px Cormorant Garamond, serif';
      if(t>1)g.fillText(LANG==='ru'?'10 · 10 · 10 · 10 · 10':'10 · 10 · 10 · 10 · 10',cx,H*0.16);
      if(t>3){g.font='italic '+Math.round(Math.min(W,H)*0.03)+'px Cormorant Garamond, serif';g.fillStyle='rgba(240,217,74,0.9)';
        g.fillText(LANG==='ru'?'ты не должен был это пережить. они гордятся тобой.':'you were not supposed to survive this. they are proud.',cx,H*0.86);}
      if(t<8&&run)requestAnimationFrame(draw);else endMax();})(t0);
    function endMax(){run=false;try{ov.remove();}catch(e){}
      document.getElementById('inter').style.display='none';
      started=false;CUSTOM.active=false;showScreen('start');
      if(kindMenu){stopSfx('nature');playSfx('nature',0.5);}else startMenuAmb();}
    ov.onclick=endMax;
  }
  function customWin(){
    if(CUSTOM.secret){endSecret();return;}
    started=false;CUSTOM.active=false;clearActive();
    if(CUSTOM.all10){gotStar2=true;unlocked7=true;unlockedCustom=true;refreshMenuXtra();maxNightScene();return;}
    const iv=document.getElementById('inter'),it=document.getElementById('interText');
    const ip=document.getElementById('interPic');if(ip)ip.style.display='none'; // без полароида на «своей»
    iv.style.display='flex';
    it.textContent=LANG==='ru'?'Своя ночь пережита.':'Custom night survived.';
    it.style.opacity=1;refreshMenuXtra();
    setTimeout(()=>{it.style.opacity=0;setTimeout(()=>{iv.style.display='none';if(ip)ip.style.display='block';softReset();},800);},4200);
  }
  document.getElementById('btnN6').addEventListener('click',startEscape);
  document.getElementById('btnN7').addEventListener('click',discoStart);
  // пасхалка: слово disco открывает седьмую ночь досрочно
  addEventListener('keydown',e=>{if(e.key.length===1){discoBuf=(discoBuf+e.key.toLowerCase()).slice(-6);
    if(discoBuf==='disco'||discoBuf.endsWith('диско')){discoBuf='';unlocked7=true;unlockedCustom=true;refreshMenuXtra();
      setCue(LANG==='ru'?'что-то включилось в клубе…':'something switched on in the club…',true);setTimeout(()=>setCue(''),2200);}}});
  let discoBuf='';

  // ================= СЕКРЕТНАЯ НОЧЬ «ИЗНАНКА» =================
  let secretBeaten=false;
  function startSecretNight(){
    CUSTOM.active=true;CUSTOM.secret=true;CUSTOM.all10=false;
    CUSTOM.np={f:0.24,c:0.24}; // очень часто
    CUSTOM.pool=['neighbor','window','fast','door_slow','bug','short'];
    document.getElementById('start').style.display='none';stopMenuAmb();
    // мир кренится: инвертированный туман, багровый свет
    scene.fog=new THREE.FogExp2(0x2a0508,0.1);scene.background.setHex(0x1a0206); // багровый туман
    showNightCard(7);
    setTimeout(()=>{
      // всё зашёптано, подсказок нет, сосед уже смотрит
      camera.position.copy(LIE.pos);stopSfx('nature');stopMenuAmb();started=true;clock=0;activity=0;windowTaps=0;
      moon.color.setHex(0xff2a2a);moon.intensity=3.2;                 // красная луна
      outMoon.material.emissive.setHex(0xff3a3a);outMoon.material.color.setHex(0xff3a3a);
      moonGlow.material.emissive.setHex(0xaa1414);
      eventTimer=nextEvent-0.5;                                        // первая тварь почти сразу
    },2350);
  }
  function endSecret(){ // пережил Изнанку → ИСТИННАЯ КОНЦОВКА
    secretBeaten=true;started=false;CUSTOM.active=false;CUSTOM.secret=false;clearActive();
    scene.fog=new THREE.FogExp2(0x010206,0.115);scene.background.setHex(0x010206);
    moon.color.setHex(0x8db2dc);moon.intensity=1.7;
    outMoon.material.emissive.setHex(0xeaf0fb);outMoon.material.color.setHex(0xeaf0fb);moonGlow.material.emissive.setHex(0x9fb8dc);
    trueEnding();
  }

  // ================= ИСТИННАЯ КОНЦОВКА: психбольница =================
  function trueEnding(){
    gotStar4=true;try{refreshMenuXtra();}catch(e){}
    const el=document.getElementById('trueEnd'),c=document.getElementById('trueEndCv'),tx=document.getElementById('trueEndText');
    el.style.display='block';c.width=innerWidth;c.height=innerHeight;const g=c.getContext('2d');
    stopSfx('nature');stopMenuAmb();playSfx('palata',0.75)||playSfx('nature',0.4);
    const t0=performance.now();
    const lines=LANG==='ru'?[
      [2.0,'Никакого лагеря не было.'],
      [7.0,'Палата 13. Ты здесь уже очень давно.'],
      [12.5,'Ты сторожишь дверь. Стучишь в ответ на окно.'],
      [18.0,'Чтобы они не пришли за остальными.'],
      [24.0,'Смена 1989 года так и не дожила до подъёма.'],
      [30.0,'Но кто-то ведь должен их помнить.'],
      [36.0,'И теперь их помнит целый мир.']
    ]:[
      [2.0,'There was no camp.'],
      [7.0,'Ward 13. You have been here a very long time.'],
      [12.5,'You guard the door. You knock back at the window.'],
      [18.0,'So they will not come for the others.'],
      [24.0,'The 1989 session never lived to see the morning.'],
      [30.0,'But someone has to remember them.'],
      [36.0,'And now the whole world remembers.']
    ];
    let shown=-1;
    // одна непрерывная величина отдаления d: 0 → далеко, всегда растёт
    (function draw(nw){const t=(nw-t0)/1000;const W=c.width,H=c.height,cx=W/2,cy=H*0.5;
      const d=t/8.5; // плавно и монотонно
      g.fillStyle='#04060a';g.fillRect(0,0,W,H);
      // ---- helper: фигура героя ----
      function hero(sc){g.save();g.translate(cx,cy+H*0.05);g.scale(sc,sc);
        const sway=Math.sin(t*1.1)*7;g.translate(sway,0);
        g.fillStyle='#d8d2c4';g.beginPath();g.ellipse(0,60,50,78,0,0,7);g.fill();
        g.strokeStyle='#b8b2a2';g.lineWidth=24;g.lineCap='round';
        g.beginPath();g.moveTo(-38,40);g.lineTo(36,84);g.stroke();g.beginPath();g.moveTo(38,40);g.lineTo(-36,84);g.stroke();
        g.strokeStyle='#9a9484';g.lineWidth=5;g.beginPath();g.moveTo(-44,56);g.lineTo(44,56);g.stroke();
        g.fillStyle='#cfc7b6';g.beginPath();g.arc(0,-36,32,0,7);g.fill();
        g.fillStyle='rgba(220,40,40,'+(0.7+Math.sin(t*3)*0.3)+')';g.shadowColor='#f22';g.shadowBlur=18;
        g.beginPath();g.arc(-11,-38,4.5,0,7);g.fill();g.beginPath();g.arc(11,-38,4.5,0,7);g.fill();g.shadowBlur=0;g.restore();}

      if(d<1){ // ---- 1: МЫ в углу палаты ----
        const sc=1.5-d*0.6;
        g.save();g.translate(cx,cy);
        g.fillStyle='#12161d';g.beginPath();g.moveTo(-W,-H);g.lineTo(0,-H*0.2);g.lineTo(0,H*0.5);g.lineTo(-W,H);g.closePath();g.fill();
        g.fillStyle='#0d1016';g.beginPath();g.moveTo(W,-H);g.lineTo(0,-H*0.2);g.lineTo(0,H*0.5);g.lineTo(W,H);g.closePath();g.fill();
        g.fillStyle='#080a0e';g.beginPath();g.moveTo(-W,H);g.lineTo(0,H*0.5);g.lineTo(W,H);g.closePath();g.fill();
        g.strokeStyle='rgba(70,80,95,0.2)';g.lineWidth=1;
        for(let i=1;i<8;i++){g.beginPath();g.moveTo(-W,-H+(H*2)*(i/8));g.lineTo(0,-H*0.2+(H*0.7)*(i/8));g.stroke();}
        const lg=g.createRadialGradient(0,-H*0.3,10,0,-H*0.3,H*0.7);
        lg.addColorStop(0,'rgba(150,175,210,0.2)');lg.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=lg;g.fillRect(-W,-H,W*2,H*2);
        g.restore();hero(sc);
      } else if(d<2){ // ---- 2: ДОМИК (корпус) с лесом ----
        const z=d-1;
        // земля/поляна
        g.fillStyle='#0c130d';g.fillRect(0,cy*0.7,W,H);
        g.fillStyle='#070a10';g.fillRect(0,0,W,cy*0.7); // небо
        // луна
        g.fillStyle='#cdd8ea';g.beginPath();g.arc(W*0.78,H*0.2,20-z*6,0,7);g.fill();
        // корпус в центре, уменьшается
        const bw=W*(0.34-z*0.18),bh=H*(0.26-z*0.12),bx=cx-bw/2,by=cy-bh*0.2;
        g.fillStyle='#241c14';g.fillRect(bx,by,bw,bh);
        g.fillStyle='#14100c';g.beginPath();g.moveTo(bx-6,by);g.lineTo(cx,by-bh*0.5);g.lineTo(bx+bw+6,by);g.closePath();g.fill();
        g.fillStyle='rgba(220,90,50,'+(0.9-z*0.5)+')';g.fillRect(cx-bw*0.1,by+bh*0.4,bw*0.14,bh*0.3); // окно светится
        // лес вокруг
        g.fillStyle='#0d1a10';
        for(let i=0;i<50;i++){const tx=(Math.sin(i*5.3)*0.5+0.5)*W,ty=cy*0.7+Math.abs(Math.cos(i*3.1))*H*0.4,ts=8+z*6+((i*3)%7);
          g.beginPath();g.moveTo(tx-ts,ty);g.lineTo(tx,ty-ts*2.4);g.lineTo(tx+ts,ty);g.closePath();g.fill();}
      } else if(d<3.1){ // ---- 3: ОГРОМНЫЙ ЛЕС сверху ----
        const z=d-2;
        g.fillStyle='#0a140d';g.fillRect(0,0,W,H);
        // ковёр леса — тысячи крон
        for(let i=0;i<900;i++){const gx=(Math.sin(i*12.9+z)*0.5+0.5)*W,gy=(Math.cos(i*7.7)*0.5+0.5)*H;
          const shade=20+((i*13)%30);g.fillStyle='rgb('+shade*0.5+','+(shade+18)+','+shade*0.6+')';
          g.fillRect(gx,gy,2.5,2.5);}
        // прогалина с корпусом — крошечная светлая точка
        g.fillStyle='rgba(220,120,60,'+(0.7-z*0.5)+')';g.beginPath();g.arc(cx,cy,Math.max(1,4-z*3),0,7);g.fill();
      } else { // ---- 4: ЗЕМЛЯ из космоса (красиво) ----
        const z=Math.min(1,(d-3.1)/3);
        // звёзды
        for(let i=0;i<240;i++){const a2=0.25+((i*53)%50)/100;g.fillStyle='rgba(255,255,255,'+a2+')';
          g.fillRect((Math.sin(i*31.7)*0.5+0.5)*W,(Math.cos(i*19.3)*0.5+0.5)*H,(i%5===0?1.8:1),(i%5===0?1.8:1));}
        const R=Math.min(W,H)*(0.34-z*0.06); // чуть-чуть отдаляется дальше
        // тень-терминатор: планета освещена сбоку
        // океан
        const og=g.createRadialGradient(cx-R*0.35,cy-R*0.35,R*0.1,cx,cy,R);
        og.addColorStop(0,'#5aa0e0');og.addColorStop(0.6,'#1f5c9a');og.addColorStop(1,'#08203c');
        g.fillStyle=og;g.beginPath();g.arc(cx,cy,R,0,7);g.fill();
        // континенты (мягкие пятна)
        g.save();g.beginPath();g.arc(cx,cy,R,0,7);g.clip();
        g.fillStyle='#2f7040';
        const cont=[[-0.35,-0.25,0.5,0.4],[0.15,-0.05,0.55,0.6],[0.4,-0.45,0.35,0.3],[-0.2,0.45,0.45,0.35],[0.5,0.4,0.3,0.5]];
        cont.forEach(cc=>{g.beginPath();g.ellipse(cx+cc[0]*R,cy+cc[1]*R,R*cc[2],R*cc[3],cc[0]*2,0,7);g.fill();});
        g.fillStyle='#3a8850';cont.forEach(cc=>{g.beginPath();g.ellipse(cx+cc[0]*R+4,cy+cc[1]*R,R*cc[2]*0.6,R*cc[3]*0.6,cc[0],0,7);g.fill();});
        // полярные шапки
        g.fillStyle='rgba(240,248,255,0.85)';
        g.beginPath();g.ellipse(cx,cy-R*0.92,R*0.5,R*0.18,0,0,7);g.fill();
        g.beginPath();g.ellipse(cx,cy+R*0.92,R*0.5,R*0.18,0,0,7);g.fill();
        // облака
        g.fillStyle='rgba(255,255,255,0.22)';
        [[-0.15,-0.1,0.6,0.25],[0.3,0.25,0.5,0.2],[-0.4,0.3,0.4,0.18],[0.1,-0.4,0.5,0.2]].forEach(cc=>{
          g.beginPath();g.ellipse(cx+cc[0]*R,cy+cc[1]*R,R*cc[2],R*cc[3],0.4,0,7);g.fill();});
        // ночная сторона (терминатор справа)
        const sg=g.createLinearGradient(cx,cy,cx+R,cy);
        sg.addColorStop(0,'rgba(0,0,10,0)');sg.addColorStop(0.7,'rgba(0,0,12,0.5)');sg.addColorStop(1,'rgba(0,0,15,0.85)');
        g.fillStyle=sg;g.fillRect(cx-R,cy-R,R*2,R*2);
        g.restore();
        // атмосферный ореол
        const ag=g.createRadialGradient(cx,cy,R*0.96,cx,cy,R*1.18);
        ag.addColorStop(0,'rgba(120,185,255,0.4)');ag.addColorStop(1,'rgba(120,185,255,0)');
        g.fillStyle=ag;g.beginPath();g.arc(cx,cy,R*1.18,0,7);g.fill();
      }
      // виньетка
      const vg=g.createRadialGradient(cx,cy,H*0.12,cx,cy,H*0.8);
      vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,0.5)');g.fillStyle=vg;g.fillRect(0,0,W,H);
      for(let i=0;i<lines.length;i++){if(t>=lines[i][0]&&shown<i){shown=i;tx.textContent=lines[i][1];tx.style.opacity=1;
        setTimeout(()=>{tx.style.opacity=0;},4200);}}
      if(t<42)requestAnimationFrame(draw);
      else{stopSfx('palata');el.style.display='none';rollCredits();}
    })(t0);
  }

  // ================= ТИТРЫ =================
  function rollCredits(){
    // титры — не поверх игры: глушим сцену целиком
    started=false;dead=false;won=false;CUT.active=false;DISCO.active=false;ESC.active=false;
    clearActive();creditsMode=true;
    document.getElementById('c').style.display='none';   // игровой холст прочь
    ESC.active=false;if(window.CH)CH.active=false;
    const stMenu=document.getElementById('start');if(stMenu)stMenu.style.display='none';
    ['vig','grain','bedred','clock','cue','hint','escBar'].forEach(id=>{
      const e=document.getElementById(id);if(e)e.style.display='none';});
    const cr=document.getElementById('credits'),col=document.getElementById('creditsCol');
    cr.style.background='#04040a';cr.style.display='block';
    const ru=LANG==='ru';
    // ---- звёздный фон: канвас позади текста ----
    let starCv=document.getElementById('crStars');
    if(!starCv){starCv=document.createElement('canvas');starCv.id='crStars';
      starCv.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;';
      cr.insertBefore(starCv,cr.firstChild);}
    starCv.style.display='block';
    const sg=starCv.getContext('2d');
    const stars=[];for(let i=0;i<90;i++)stars.push({x:Math.random(),y:Math.random(),ph:Math.random()*6.28,sp:0.4+Math.random()*1.4,r:0.6+Math.random()*1.6});
    let starsRun=true;const st0=performance.now();
    (function twinkle(nw){if(!starsRun)return;const t=(nw-st0)/1000;
      starCv.width=innerWidth;starCv.height=innerHeight;const W=starCv.width,H=starCv.height;
      sg.clearRect(0,0,W,H);
      stars.forEach(s=>{const a=0.15+0.85*Math.abs(Math.sin(t*s.sp+s.ph)); // загораются и гаснут
        sg.fillStyle='rgba(255,252,240,'+a.toFixed(3)+')';
        sg.beginPath();sg.arc(s.x*W,s.y*H,s.r*(0.6+a*0.7),0,7);sg.fill();
        if(a>0.85){sg.strokeStyle='rgba(255,252,240,'+((a-0.85)*3).toFixed(3)+')';sg.lineWidth=1;
          sg.beginPath();sg.moveTo(s.x*W-4,s.y*H);sg.lineTo(s.x*W+4,s.y*H);sg.moveTo(s.x*W,s.y*H-4);sg.lineTo(s.x*W,s.y*H+4);sg.stroke();}});
      requestAnimationFrame(twinkle);})(performance.now());
    // ---- текст титров ----
    col.style.zIndex='1';
    col.innerHTML=`
      <h2>5 НОЧЕЙ В ЛАСТОЧКЕ</h2>
      <div class="role">${ru?'СОЗДАТЕЛЬ, ПРОГРАММИСТ И В ЦЕЛОМ ЛЕГЕНДА':'CREATOR, PROGRAMMER AND ALL-ROUND LEGEND'}</div>
      <div class="name">${ru?'Роман · Легенда':'Roman · The Legend'}</div>
      <div class="role" style="margin-top:26px">${ru?'ИДЕЯ, ПРИДУМАННАЯ В САМОМ ЛАГЕРЕ':'THE IDEA BORN AT THE CAMP ITSELF'}</div>
      <div class="name">Ильдар · Ilyrc</div>
      <div class="name">Богдан · oboyudnenk1y</div>
      <div class="role" style="margin-top:34px">${ru?'СМЕНА 1989 ГОДА':'SESSION OF 1989'}</div>
      <div class="name" style="color:#8b0e0e">${ru?'не дожила до подъёма':'never lived to see the morning'}</div>
      <div class="role" style="margin-top:38px">${ru?'МУЗЫКА':'MUSIC'}</div>
      <div class="name" style="font-size:16px">C418 — krank</div>
      <div class="name" style="font-size:16px">Ridiculon — Acceptance</div>
      <div class="name" style="font-size:13px;color:#6a655a">${ru?'из The Binding of Isaac':'from The Binding of Isaac'}</div>
      <div id="crThanks" class="role" style="margin-top:44px;font-size:18px;color:#c9c3b2">${ru?'СПАСИБО ЗА ИГРУ':'THANKS FOR PLAYING'}</div>
      <div style="height:2vh"></div>`;
    // музыка титров: пропускаем первые 10 секунд тишины
    stopSfx('nature');
    const km=SFX['krank'];
    if(km&&km._ok){try{km.currentTime=10;km.volume=0.62;km.loop=false;km.play().catch(()=>{});}catch(e){}}

    // ---- вписываем титры целиком в экран, потом медленно поднимаем ----
    col.style.transformOrigin='top center';col.style.transform='none';
    const scale=1; // крупный шрифт, без ужатия
    let y=innerHeight,stopped=false,scrollDone=false;
    function scroll(){if(stopped)return;
      const colH=col.offsetHeight*scale;
      const endY=Math.max(innerHeight*0.06,innerHeight-colH-innerHeight*0.10); // не улетает: низ у нижнего края
      if(y>endY){y-=0.32;col.style.top=y+'px';requestAnimationFrame(scroll);}
      else{col.style.top=endY+'px';stopped=true;scrollDone=true;
        const hint=document.createElement('div');hint.id='crHint';
        hint.style.cssText='position:absolute;bottom:2.5vh;left:0;right:0;text-align:center;font-family:Share Tech Mono;font-size:12px;letter-spacing:0.25em;color:rgba(200,195,178,0.75);animation:menuIn 1.2s ease both;z-index:2;';
        hint.textContent=ru?'нажмите ENTER, чтобы продолжить':'press ENTER to continue';
        cr.appendChild(hint);}}
    col.style.top=y+'px';scroll();
    // ---- выход только по ENTER и только после того, как титры докрутились ----
    function finishCr(e){
      if(e&&e.type==='keydown'&&e.code!=='Enter'&&e.code!=='NumpadEnter')return;
      if(!scrollDone)return; // пока не докрутилось — не выпускаем
      starsRun=false;starCv.style.display='none';
      cr.style.display='none';cr.onclick=null;
      removeEventListener('keydown',finishCr);
      stopSfx('krank');stopSfx('nature');stopSfx('acc');
      document.getElementById('trueEnd').style.display='none';
      const hh=document.getElementById('crHint');if(hh)hh.remove();
      creditsMode=false;cr.style.background='';
      document.getElementById('c').style.display='';
      ['vig','grain','clock','cue'].forEach(id=>{const e=document.getElementById(id);if(e)e.style.display='';});
      kindMenu=true;refreshMenuXtra();softReset();}
    addEventListener('keydown',finishCr);
  }

  // тайная пасхалка A: долгий немигающий взгляд в окно → детское лицо на миг
  let winStareT=0;
  function checkStare(dt){
    const lookingWindow=lookYaw<-0.28&&Math.abs(lookPitch)<0.15&&standT<0.3&&!activeEvent;
    if(lookingWindow){winStareT+=dt;
      if(winStareT>12&&winStareT<12.1){egg('stare');paneMat.emissiveIntensity=2.2;
        if(AC)tone(1200,'sine',0.4,0.05,900);
        setTimeout(()=>{paneMat.emissiveIntensity=0.12;},420);}}
    else winStareT=0;
  }
  // тайная пасхалка B: 20 стуков в дверь всего за игру → изнутри отвечают тем же ритмом
  let doorKnockCount=0;
  // тайная пасхалка C: печатать 'mama' на клавиатуре → еле слышный вздох
  let secretBuf='';
  addEventListener('keydown',e=>{if(e.key.length===1){secretBuf=(secretBuf+e.key.toLowerCase()).slice(-6);
    if(secretBuf.endsWith('mama')||secretBuf.endsWith('мама')){secretBuf='';
      if(AC){const o=AC.createOscillator(),g=AC.createGain();o.type='sine';o.frequency.value=140;
        g.gain.setValueAtTime(0.0001,now());g.gain.exponentialRampToValueAtTime(0.05,now()+0.3);
        g.gain.exponentialRampToValueAtTime(0.0001,now()+1.8);o.connect(g);g.connect(MG);o.start();o.stop(now()+1.9);}
    }}});

  // ================= ИСТОРИИ МОНСТРОВ (после ночи 7) =================
  function drawTalePolaroid(cv,mode,seed){
    const g=cv.getContext('2d'),W=cv.width,H=cv.height-26;
    g.clearRect(0,0,cv.width,cv.height);
    g.save();g.beginPath();g.rect(0,0,W,H);g.clip(); // всё строго внутри кадра
    g.fillStyle='#191d24';g.fillRect(0,0,W,H);
    if(typeof mode==='number'){ // ---- ПОРТРЕТ ЧЕЛОВЕКА, свой для каждого монстра ----
      const P=[
        {bg:'#232a25',skin:'#a8836a',hair:'#3a3128',cloth:'#3d4a52',age:'adult',cap:false,beard:true,extra:'wire'},   // 0 электрик
        {bg:'#1f2630',skin:'#c09a80',hair:'#4a3a2a',cloth:'#4a5560',age:'kids',cap:false,beard:false,extra:'four'},   // 1 четверо
        {bg:'#14181a',skin:null,hair:null,cloth:null,age:'none',cap:false,beard:false,extra:'trees'},                  // 2 нелюдь
        {bg:'#242a22',skin:'#bd9679',hair:'#2e2620',cloth:'#5a6350',age:'teen',cap:false,beard:false,extra:'stripe'}, // 3 Ильдар
        {bg:'#26221c',skin:'#c8a184',hair:'#6a5238',cloth:'#7a5b4a',age:'child',cap:false,beard:false,extra:'torch'}, // 4 младший
        {bg:'#1e2630',skin:'#b48f74',hair:'#241d18',cloth:'#8a2a2a',age:'young',cap:true,beard:false,extra:'tie'}     // 5 вожатый
      ][mode%6];
      g.fillStyle=P.bg;g.fillRect(0,0,W,H);
      const drawPerson=(cx,scale,alpha)=>{
        g.save();g.globalAlpha=alpha===undefined?1:alpha;
        const hr=W*0.16*scale, hy=H*(P.age==='child'?0.50:P.age==='kids'?0.48:0.44);
        // плечи (строго в кадре)
        g.fillStyle=P.cloth;g.beginPath();
        g.ellipse(cx,hy+hr*3.1,hr*2.0,hr*1.9,0,Math.PI,0);g.fill();
        g.fillRect(cx-hr*2.0,hy+hr*3.1,hr*4.0,H);
        // шея
        g.fillStyle=P.skin;g.fillRect(cx-hr*0.34,hy+hr*0.75,hr*0.68,hr*0.8);
        // голова
        g.beginPath();g.ellipse(cx,hy,hr*0.92,hr*1.06,0,0,7);g.fill();
        // уши
        [-1,1].forEach(sn=>{g.beginPath();g.ellipse(cx+sn*hr*0.9,hy+hr*0.08,hr*0.16,hr*0.24,0,0,7);g.fill();});
        // волосы
        g.fillStyle=P.hair;
        if(P.cap){g.beginPath();g.ellipse(cx,hy-hr*0.62,hr*1.04,hr*0.58,0,Math.PI,0);g.fill();
          g.fillRect(cx-hr*1.06,hy-hr*0.66,hr*2.12,hr*0.16);}
        else{g.beginPath();g.ellipse(cx,hy-hr*0.44,hr*0.98,hr*0.88,0,Math.PI,0);g.fill();}
        if(P.beard){g.fillStyle=P.hair;g.beginPath();g.ellipse(cx,hy+hr*0.62,hr*0.62,hr*0.4,0,0,Math.PI);g.fill();}
        // глаза и рот
        g.fillStyle='#221a14';[-1,1].forEach(sn=>{g.beginPath();g.arc(cx+sn*hr*0.33,hy-hr*0.02,hr*0.1,0,7);g.fill();});
        g.strokeStyle='#6a4a3a';g.lineWidth=1.5;g.beginPath();
        g.arc(cx,hy+hr*0.34,hr*0.28,0.12*Math.PI,0.88*Math.PI);g.stroke();
        g.restore();};
      if(P.extra==='four'){ // четверо детей в ряд
        [0.22,0.42,0.60,0.80].forEach((fx,i)=>drawPerson(W*fx,0.56,0.95-i*0.05));
      }else if(P.extra==='trees'){ // не человек — пустая опушка
        g.fillStyle='#0d1210';g.fillRect(0,H*0.55,W,H*0.45);
        g.fillStyle='#0a0f0c';
        for(let i=0;i<9;i++){const tx=6+i*(W/9),th=H*(0.3+((i*7)%5)*0.06);
          g.fillRect(tx,H*0.6-th,3,th);
          g.beginPath();g.moveTo(tx-11,H*0.6-th);g.lineTo(tx+1.5,H*0.6-th-16);g.lineTo(tx+14,H*0.6-th);g.closePath();g.fill();}
        g.fillStyle='rgba(255,170,40,0.75)';
        [[0.32,0.44],[0.4,0.42],[0.58,0.47],[0.66,0.44],[0.5,0.52]].forEach(e=>{
          g.beginPath();g.arc(W*e[0],H*e[1],2.2,0,7);g.fill();});
      }else drawPerson(W*0.5,1,1);
      if(P.extra==='wire'){ // провода за электриком
        g.strokeStyle='rgba(20,18,16,0.8)';g.lineWidth=2;
        [0.2,0.3].forEach(yy=>{g.beginPath();g.moveTo(0,H*yy);g.quadraticCurveTo(W/2,H*(yy+0.09),W,H*yy);g.stroke();});}
      if(P.extra==='torch'){ // фонарик в руках у младшего
        g.fillStyle='#6a6a72';g.fillRect(W*0.5-6,H*0.78,12,20);
        g.fillStyle='rgba(255,225,150,0.55)';g.beginPath();g.arc(W*0.5,H*0.78,9,0,7);g.fill();}
      if(P.extra==='tie'){g.fillStyle='#b02a2a';g.beginPath();
        g.moveTo(W*0.5,H*0.66);g.lineTo(W*0.44,H*0.82);g.lineTo(W*0.56,H*0.82);g.closePath();g.fill();}
      if(P.extra==='stripe'){g.fillStyle='rgba(230,230,235,0.5)';
        for(let i=0;i<3;i++)g.fillRect(0,H*0.8+i*7,W,3);}
    }else{ // ---- морда монстра ----
      const off=document.createElement('canvas');off.width=off.height=150;
      const og=off.getContext('2d');og.clearRect(0,0,150,150);
      try{SCARE[mode](og,150,150,1.1);}catch(e){}
      g.drawImage(off,0,0,W,H);
    }
    // старение фотографии
    g.fillStyle='rgba(224,206,164,0.09)';g.fillRect(0,0,W,H);
    g.fillStyle='rgba(230,220,190,0.07)';
    for(let i=0;i<((seed*37)%5)+3;i++)g.fillRect(Math.random()*W,Math.random()*H,W*0.5,1);
    const vg=g.createRadialGradient(W/2,H/2,W*0.2,W/2,H/2,W*0.85);
    vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(30,24,16,0.55)');g.fillStyle=vg;g.fillRect(0,0,W,H);
    g.restore();
  }
  let talesRun=false;
  function showTales(){
    const scr=document.getElementById('tales');scr.style.display='block';talesRun=true;
    stopSfx('nature');stopSfx('gm');playSfx('acc',0.42); // тише фоном
    const MON=window.GAME_DATA.MONSTERS[LANG];
    // ---- реалистичная лампочка сверху ----
    const lc=document.getElementById('talesLamp'),lg2=lc.getContext('2d');
    const lt0=performance.now();
    (function lamp(nw){if(!talesRun)return;lc.width=innerWidth;lc.height=innerHeight;
      const W=lc.width,H=lc.height,t=(nw-lt0)/1000;
      lg2.clearRect(0,0,W,H);
      const sway=Math.sin(t*0.7)*W*0.006, bx=W*0.5+sway, by=H*0.085;
      const flick=0.86+Math.sin(t*11)*0.05+(Math.random()<0.02?-0.28:0);
      // шнур
      lg2.strokeStyle='#1a1a20';lg2.lineWidth=2;lg2.beginPath();lg2.moveTo(W*0.5,0);lg2.quadraticCurveTo(W*0.5+sway*0.5,by*0.55,bx,by-14);lg2.stroke();
      // патрон
      lg2.fillStyle='#2a2a30';lg2.fillRect(bx-6,by-15,12,11);
      // конус света
      const cone=lg2.createLinearGradient(0,by,0,H);
      cone.addColorStop(0,'rgba(255,224,168,'+(0.16*flick)+')');cone.addColorStop(1,'rgba(255,224,168,0)');
      lg2.fillStyle=cone;lg2.beginPath();lg2.moveTo(bx-12,by);lg2.lineTo(bx-W*0.42,H);lg2.lineTo(bx+W*0.42,H);lg2.lineTo(bx+12,by);lg2.closePath();lg2.fill();
      // ореол и колба
      const halo=lg2.createRadialGradient(bx,by,2,bx,by,W*0.17);
      halo.addColorStop(0,'rgba(255,232,180,'+(0.5*flick)+')');halo.addColorStop(1,'rgba(255,232,180,0)');
      lg2.fillStyle=halo;lg2.beginPath();lg2.arc(bx,by,W*0.17,0,7);lg2.fill();
      lg2.fillStyle='rgba(255,240,200,'+(0.9*flick)+')';lg2.beginPath();lg2.ellipse(bx,by+4,9,11,0,0,7);lg2.fill();
      lg2.strokeStyle='rgba(255,210,120,'+flick+')';lg2.lineWidth=1.4; // спираль
      lg2.beginPath();for(let i=0;i<7;i++)lg2.lineTo(bx-4+i*1.4,by+2+(i%2?3:-3));lg2.stroke();
      requestAnimationFrame(lamp);})(lt0);
    // ---- истории: листаются как фотографии, стрелками ----
    const nameEl=document.getElementById('taleName'),txtEl=document.getElementById('taleText'),hintEl=document.getElementById('taleHint');
    hintEl.innerHTML=LANG==='ru'?'← →  листать фотографии &nbsp;·&nbsp; ESC — закрыть':'← →  flip photos &nbsp;·&nbsp; ESC — close';
    const boyC=document.getElementById('talePicBoy'),monC=document.getElementById('talePicMon');
    const wrapPics=boyC.parentElement.parentElement;
    let idx=0,busy=false;
    function render(i){
      const m2=MON[i];
      drawTalePolaroid(boyC,i,i+1);
      drawTalePolaroid(monC,m2.kind,i+3);
      nameEl.textContent=m2.name.toUpperCase()+'  ·  '+m2.who;
      txtEl.innerHTML=m2.lines.join('<br>');
    }
    function flip(dir){ // dir: +1 вперёд, -1 назад
      if(busy)return;
      const ni=idx+dir;
      if(ni<0)return;
      if(ni>=MON.length){ // конец — уходим
        busy=true;wrapPics.style.transition='opacity .8s, transform .8s';
        wrapPics.style.opacity='0';txtEl.style.opacity=0;
        setTimeout(()=>{talesRun=false;scr.style.display='none';scr.onclick=null;stopSfx('acc');
          removeEventListener('keydown',keyNav);kindMenu=true;askChronicle();},850);return;}
      busy=true;
      // улетает старая пара фото, прилетает новая
      wrapPics.style.transition='transform .34s ease-in, opacity .34s ease-in';
      wrapPics.style.transform='translateX('+(-dir*90)+'px) rotate('+(-dir*7)+'deg) scale(0.9)';
      wrapPics.style.opacity='0';
      txtEl.style.opacity=0;
      if(AC)noise(0.16,0.1,2600); // шорох фотобумаги
      setTimeout(()=>{
        idx=ni;render(idx);
        wrapPics.style.transition='none';
        wrapPics.style.transform='translateX('+(dir*90)+'px) rotate('+(dir*7)+'deg) scale(0.9)';
        requestAnimationFrame(()=>{
          wrapPics.style.transition='transform .42s cubic-bezier(.2,1.4,.4,1), opacity .42s ease-out';
          wrapPics.style.transform='none';wrapPics.style.opacity='1';
          setTimeout(()=>{txtEl.style.opacity=1;busy=false;},260);});
      },360);
    }
    function keyNav(e){
      if(!talesRun)return;
      if(e.code==='ArrowRight'||e.code==='Space'||e.code==='Enter'){e.preventDefault();flip(1);}
      else if(e.code==='ArrowLeft'){e.preventDefault();flip(-1);}
      else if(e.code==='Escape'){talesRun=false;scr.style.display='none';stopSfx('acc');
        removeEventListener('keydown',keyNav);kindMenu=true;askChronicle();}
    }
    addEventListener('keydown',keyNav);
    scr.onclick=()=>flip(1);
    // первая карточка — мягкое появление
    wrapPics.style.opacity='0';render(0);
    requestAnimationFrame(()=>{wrapPics.style.transition='opacity .9s ease-out';wrapPics.style.opacity='1';
      setTimeout(()=>{txtEl.style.opacity=1;},500);});
  }

  // ======================================================
  //   А Р Х И В  —  открывается за полное прохождение
  // ======================================================
  let archUnlocked=false, devUnlocked=false, clickCount=0, starsFinished=false, tabHides=0;
  addEventListener('visibilitychange',()=>{if(document.hidden)tabHides++;});
  function gpuName(){try{const c=document.createElement('canvas');
    const gl=c.getContext('webgl')||c.getContext('experimental-webgl');if(!gl)return '—';
    const d=gl.getExtension('WEBGL_debug_renderer_info');
    let r=d?gl.getParameter(d.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
    r=String(r).replace(/\(.*?\)/g,'').replace(/\s+/g,' ').trim();
    return r.length>28?r.slice(0,28)+'…':r;}catch(e){return '—';}}
  function osName(){const u=navigator.userAgent;
    if(/Windows NT 10/.test(u))return 'Windows 10/11';
    if(/Windows/.test(u))return 'Windows';
    if(/Android/.test(u))return 'Android';
    if(/iPhone|iPad/.test(u))return 'iOS';
    if(/Mac OS X/.test(u))return 'macOS';
    if(/Linux/.test(u))return 'Linux';return '—';}
  function browserName(){const u=navigator.userAgent;
    if(/Edg\//.test(u))return 'Edge';if(/OPR\//.test(u))return 'Opera';
    if(/Firefox\//.test(u))return 'Firefox';if(/Chrome\//.test(u))return 'Chrome';
    if(/Safari\//.test(u))return 'Safari';return '—';}
  addEventListener('pointerdown',()=>{clickCount++;});
  function archCards(){
    const ru=LANG==='ru';
    const C=[];
    const S1=(kind,title,tag,desc)=>C.push({draw:g2=>{try{SCARE[kind](g2,420,270,1.15);}catch(e){}},title,tag,desc,watch:kind,sound:(kind==='door'||kind==='fast'||kind==='neighbor')?'scream1':'scream2'});
    S1('door',ru?'Долговязый':'The Tall One',ru?'скример · дверь':'scare · door',
       ru?'Первый, кого рисовали. Лицо тянули по вертикали, пока оно не перестало быть человеческим.':'The first one drawn. The face was stretched until it stopped being human.');
    S1('fast',ru?'Рой глаз':'The Swarm',ru?'скример · топот':'scare · footsteps',
       ru?'Сначала это было лицо. Потом решили: у того, что живёт под полом, лица нет вовсе — только чужие глаза.':'It was a face at first. Then we decided: what lives under the floor has no face — only borrowed eyes.');
    S1('neighbor',ru?'Сосед':'The Neighbor',ru?'скример · койка у стены':'scare · bed by the wall',
       ru?'Единственный, кто не хочет тебя пугать. Он просто поворачивается.':'The only one who does not want to scare you. He simply turns.');
    S1('window',ru?'Те, у окна':'At the Window',ru?'скример · стекло':'scare · glass',
       ru?'Их четверо, но в кадр всегда влезал один. Так страшнее.':'There are four, but only one ever fit the frame. It is worse that way.');
    S1('bug',ru?'Из-под кровати':'Under the Bed',ru?'скример · пол':'scare · floor',
       ru?'Красные края экрана появились раньше самого монстра.':'The red screen edges existed before the monster did.');
    S1('buff',ru?'Вожатый':'The Counselor',ru?'скример · дверной проём':'scare · doorway',
       ru?'Стоит в дверях и считает. В ранней версии он просто входил и всё заканчивалось.':'Stands in the doorway and counts. In an early build he simply walked in and it was over.');
    C.push({draw:g2=>{try{drawEye(g2,420,270,0.9);}catch(e){}},watch:'eye',
      title:ru?'Глаз':'The Eye',tag:ru?'вырезано · ожидание в меню':'cut · menu idle',
      desc:ru?'Ждал шестьдесят секунд бездействия в меню и открывал старую галерею. Галереи больше нет — глаз остался.':'It waited sixty idle seconds in the menu and opened the old gallery. The gallery is gone — the eye remains.'});
    // ---- звуки ----
    const SND=[['night',ru?'Карточка ночи':'Night card',ru?'звук · переход':'sound · transition',ru?'Удар, с которым появляется надпись «ПЕРВАЯ НОЧЬ».':'The hit that slams the night title onto the screen.'],
      ['scream1',ru?'Крик первый':'Scream one',ru?'звук · дверь, топот, сосед':'sound · door, steps, neighbor',ru?'Достался троим. Зациклен, пока идёт скример.':'Shared by three. Looped for as long as the scare lasts.'],
      ['scream2',ru?'Крик второй':'Scream two',ru?'звук · окно, пол, проём':'sound · window, floor, doorway',ru?'Второй половине монстров.':'For the other half of them.'],
      ['nature',ru?'Природа':'Nature',ru?'звук · рассвет':'sound · dawn',ru?'Единственный добрый звук в игре. Играет только когда всё кончилось.':'The only kind sound here. It plays only when it is over.'],
      ['ohno',ru?'Погоня':'The Chase',ru?'звук · ночь шестая':'sound · night six',ru?'Затихает у самых ворот — и тогда становится слышно лес.':'It fades at the gates — and then you hear the forest.'],
      ['gm',ru?'Доброе утро':'Good morning',ru?'звук · шесть утра':'sound · six a.m.',ru?'Под него встаёт солнце с надписью 6 A.M.':'The sun rises to it, with 6 A.M. written on it.'],
      ['palata',ru?'Палата 13':'Ward 13',ru?'звук · истинная концовка':'sound · true ending',ru?'Звучит, пока камера отъезжает от того, кто сидит в углу.':'It plays while the camera pulls back from the one in the corner.'],
      ['acc',ru?'Принятие':'Acceptance',ru?'звук · истории':'sound · tales',ru?'Он играет при смерти Айзека — почему бы не добавить при пролистывании смертей героев.':'It plays when Isaac dies — why not use it while leafing through the deaths of these heroes.'],
      ['s67',ru?'Шестьдесят семь':'Sixty-seven',ru?'звук · код 6-7-0-6-7':'sound · code 6-7-0-6-7',ru?'Никакого отношения к сюжету. Просто было смешно.':'Nothing to do with the story. It was just funny.'],
      ['murr',ru?'Мурр':'Murr',ru?'звук · код 4-3-6-1-7-4':'sound · code 4-3-6-1-7-4',ru?'Моя любимая кошечка Симка. Код — слово Cat в шестнадцатеричном виде.':'My beloved cat Simka. The code is the word Cat written in hexadecimal.'],
      ['show',ru?'Кто здесь главный':'Who runs the show',ru?'звук · код 5-7-0-5-7':'sound · code 5-7-0-5-7',ru?'Три минуты, которые можно пропустить кликом. Почти никто не пропускает.':'Three minutes you may skip with a click. Almost nobody does.'],
      ['krank',ru?'Krank':'Krank',ru?'звук · титры':'sound · credits',ru?'Посмотрел ролик про C418 и вдохновило поставить его песню.':'Watched a video about C418 and felt inspired to use his track.']];
    SND.forEach(([k,ti,tg,de])=>C.push({sndOnly:k,title:ti,tag:tg,desc:de,sound:k,
      draw:g2=>{ // осциллограмма
        g2.fillStyle='#0b0b0e';g2.fillRect(0,0,420,270);
        g2.strokeStyle='rgba(240,217,74,0.7)';g2.lineWidth=1.6;g2.beginPath();
        for(let x=0;x<420;x++){const v=Math.sin(x*0.09+k.length)*Math.sin(x*0.021)*Math.cos(x*0.005+k.length);
          g2.lineTo(x,135+v*95);}g2.stroke();
        g2.strokeStyle='rgba(240,217,74,0.15)';g2.lineWidth=1;
        g2.beginPath();g2.moveTo(0,135);g2.lineTo(420,135);g2.stroke();}}));
    // ---- вырезанные идеи ----
    const IDEA=(title,tag,desc,fn)=>C.push({title,tag,desc,draw:fn});
    IDEA(ru?'Дискотека':'The Disco',ru?'вырезано · ночь седьмая':'cut · night seven',
      ru?'Первая версия седьмой ночи: цветомузыка, бит, сосед кивает в такт, тварь скачет по полу. Заменена на «Память».':'The first night seven: disco lights, a beat, the neighbor nodding along, the creature bouncing. Replaced by "Memory".',
      g2=>{g2.fillStyle='#0a0410';g2.fillRect(0,0,420,270);
        for(let i=0;i<7;i++){g2.fillStyle='hsla('+(i*52)+',90%,55%,0.20)';
          g2.beginPath();g2.arc(60+i*50,80+((i%3)*60),46,0,7);g2.fill();}
        g2.fillStyle='rgba(255,255,255,0.5)';g2.font='16px Share Tech Mono';
        g2.textAlign='center';g2.fillText('♪  ♪  ♪',210,240);});
    IDEA(ru?'Цифровой цирк':'Digital Circus',ru?'вырезано · отсылка':'cut · reference',
      ru?'Стояла на тумбочке и кликалась. Автор посмотрел на модель и попросил убрать её навсегда.':'It stood on the nightstand and could be clicked. The author looked at the model and asked to remove it forever.',
      g2=>{g2.fillStyle='#12040a';g2.fillRect(0,0,420,270);
        g2.strokeStyle='rgba(200,60,80,0.5)';g2.lineWidth=3;
        g2.beginPath();g2.arc(210,140,60,0,7);g2.stroke();
        g2.strokeStyle='rgba(120,60,200,0.5)';
        g2.beginPath();g2.moveTo(180,120);g2.lineTo(210,150);g2.moveTo(210,120);g2.lineTo(180,150);g2.stroke();
        g2.fillStyle='rgba(160,150,160,0.35)';g2.font='italic 15px Cormorant Garamond, serif';
        g2.textAlign='center';g2.fillText('удалено по просьбе автора',210,240);});
    IDEA(ru?'Кровавая луна':'Blood Moon',ru?'вырезано · пасхалка':'cut · easter egg',
      ru?'Три клика по луне за окном красили её в багровый до конца ночи. Заменена на руку соседа.':'Three clicks on the moon turned it crimson until dawn. Replaced by the neighbor hand.',
      g2=>{g2.fillStyle='#07070c';g2.fillRect(0,0,420,270);
        const gr=g2.createRadialGradient(210,130,10,210,130,110);
        gr.addColorStop(0,'#ff4040');gr.addColorStop(1,'rgba(120,10,10,0)');
        g2.fillStyle=gr;g2.beginPath();g2.arc(210,130,110,0,7);g2.fill();
        g2.fillStyle='#d02020';g2.beginPath();g2.arc(210,130,44,0,7);g2.fill();});
    IDEA(ru?'Плоские стены':'Flat Walls',ru?'ранняя версия · комната':'early build · the room',
      ru?'До брёвен корпус был из ровных досок. Сруб появился, когда стало ясно: лагерь должен быть старым.':'Before the logs the cabin was flat boards. The log walls came when it became clear the camp had to be old.',
      g2=>{g2.fillStyle='#171310';g2.fillRect(0,0,420,270);
        g2.strokeStyle='rgba(120,100,78,0.5)';g2.lineWidth=1.4;
        for(let y=20;y<270;y+=26){g2.beginPath();g2.moveTo(0,y);g2.lineTo(420,y);g2.stroke();}
        g2.fillStyle='rgba(60,80,110,0.35)';g2.fillRect(150,70,120,110);});
    IDEA(ru?'Полароиды':'Polaroids',ru?'заменено · вставки':'replaced · interludes',
      ru?'Между ночами показывали снимки: царапины под полом, тринадцать кроватей, фото смены. Их сменила газета на рассвете.':'Between nights we showed photos: scratches under the floor, thirteen beds, a group photo. A newspaper at dawn took their place.',
      g2=>{g2.fillStyle='#0d0d10';g2.fillRect(0,0,420,270);
        [[70,-6],[170,4],[270,-3]].forEach(([x,r])=>{g2.save();g2.translate(x+40,135);g2.rotate(r*Math.PI/180);
          g2.fillStyle='#e8e0cb';g2.fillRect(-42,-52,84,104);
          g2.fillStyle='#1a1d24';g2.fillRect(-35,-45,70,66);g2.restore();});});
    IDEA(ru?'«Рано!»':'"Too early!"',ru?'вырезано · погоня':'cut · the chase',
      ru?'Ранний прыжок сбивал с шага и выводил надпись. Оказалось, что честнее позволить игроку жать что угодно — и отвечать за это.':'Jumping too soon broke your stride and flashed a warning. It proved fairer to let the player press anything — and answer for it.',
      g2=>{g2.fillStyle='#0a0d0a';g2.fillRect(0,0,420,270);
        g2.strokeStyle='rgba(140,120,90,0.6)';g2.lineWidth=14;g2.lineCap='round';
        g2.beginPath();g2.moveTo(40,170);g2.lineTo(380,150);g2.stroke();
        g2.fillStyle='rgba(224,32,32,0.8)';g2.font='700 26px Share Tech Mono';
        g2.textAlign='center';g2.fillText('РАНО!',210,90);});
    IDEA(ru?'Галерея по таймеру':'Idle Gallery',ru?'вырезано · меню':'cut · menu',
      ru?'Старая галерея открывалась, если просидеть в меню минуту. Её место занял этот архив.':'The old gallery opened if you sat in the menu for a minute. This archive took its place.',
      g2=>{g2.fillStyle='#0b0b0f';g2.fillRect(0,0,420,270);
        g2.strokeStyle='rgba(200,195,178,0.25)';g2.lineWidth=1.4;
        for(let i=0;i<6;i++)g2.strokeRect(30+(i%3)*130,50+Math.floor(i/3)*100,110,80);
        g2.fillStyle='rgba(200,195,178,0.3)';g2.font='14px Share Tech Mono';
        g2.textAlign='center';g2.fillText('00:60',210,255);});
    IDEA(ru?'Враги на тропе':'Enemies on the Path',ru?'заменено · ночь шестая':'replaced · night six',
      ru?'Сначала в побеге за тобой гнались сами монстры: замри перед Долговязым, долби пробел от роя, уворачивайся от силуэтов. Заменили на поваленные деревья — стало про реакцию, а не про память.':'At first the monsters chased you: freeze before the Tall One, mash space against the swarm, dodge the silhouettes. Replaced by fallen trunks — it became about reflexes, not memory.',
      g2=>{g2.fillStyle='#0a0f0c';g2.fillRect(0,0,420,270);
        g2.fillStyle='#141b16';for(let i=0;i<7;i++){const x=30+i*58;
          g2.beginPath();g2.moveTo(x-16,200);g2.lineTo(x,120);g2.lineTo(x+16,200);g2.closePath();g2.fill();}
        g2.fillStyle='#1d1410';g2.beginPath();g2.ellipse(210,232,150,16,0,0,7);g2.fill();
        g2.fillStyle='rgba(224,32,32,0.55)';[150,210,270].forEach(x=>{g2.beginPath();g2.arc(x,150,4,0,7);g2.fill();});});
    IDEA(ru?'Зелёная полоса':'The Green Bar',ru?'изменено · погоня':'changed · the chase',
      ru?'Полоса прогресса побега была ярко-зелёной, как в аркаде. Стала приглушённо-красной: бежишь не к победе, а от чего-то.':'The escape progress bar used to be bright green, arcade-style. Now it is a dull red: you are not running toward a win, you are running away.',
      g2=>{g2.fillStyle='#0b0b0f';g2.fillRect(0,0,420,270);
        g2.fillStyle='#11131f';g2.fillRect(40,96,340,20);
        const gr=g2.createLinearGradient(40,0,300,0);gr.addColorStop(0,'#5adb6a');gr.addColorStop(1,'#c9c3b2');
        g2.fillStyle=gr;g2.fillRect(40,96,240,20);
        g2.fillStyle='#140a0c';g2.fillRect(40,156,340,20);
        const gr2=g2.createLinearGradient(40,0,300,0);gr2.addColorStop(0,'#7a2028');gr2.addColorStop(1,'#a83a42');
        g2.fillStyle=gr2;g2.fillRect(40,156,240,20);
        g2.fillStyle='rgba(200,195,178,0.4)';g2.font='12px Share Tech Mono';g2.textAlign='left';
        g2.fillText('было',40,88);g2.fillText('стало',40,148);});
    IDEA(ru?'Тело соседа':'The Neighbor Body',ru?'исправлено · поворот':'fixed · the turn',
      ru?'Раньше поворачивалось всё тело целиком, и лицо уезжало в сторону двери. Голову посадили на отдельный шарнир — теперь она поворачивается к тебе, а тело спит.':'The whole body used to rotate, so the face ended up aimed at the door. The head got its own pivot — now it turns to you while the body sleeps.',
      g2=>{g2.fillStyle='#0d0f14';g2.fillRect(0,0,420,270);
        g2.fillStyle='#2a2f38';g2.beginPath();g2.ellipse(150,180,80,44,0,0,7);g2.fill();
        g2.fillStyle='#8a6a58';g2.beginPath();g2.arc(214,150,30,0,7);g2.fill();
        g2.strokeStyle='rgba(240,217,74,0.55)';g2.lineWidth=2;
        g2.beginPath();g2.arc(214,150,44,-0.9,0.9);g2.stroke();
        g2.fillStyle='rgba(240,217,74,0.8)';g2.beginPath();g2.arc(252,168,4,0,7);g2.fill();});
    IDEA(ru?'Пылинки':'Dust Motes',ru?'вырезано · комната':'cut · the room',
      ru?'В лунном столбе плавали сорок шесть пылинок. Красиво, но отвлекало от темноты — убрали.':'Forty-six motes drifted in the moonbeam. Pretty, but it distracted from the dark — removed.',
      g2=>{g2.fillStyle='#080a10';g2.fillRect(0,0,420,270);
        const gr=g2.createLinearGradient(120,0,300,270);
        gr.addColorStop(0,'rgba(159,192,232,0.18)');gr.addColorStop(1,'rgba(159,192,232,0)');
        g2.fillStyle=gr;g2.beginPath();g2.moveTo(120,0);g2.lineTo(240,0);g2.lineTo(320,270);g2.lineTo(170,270);g2.closePath();g2.fill();
        g2.fillStyle='rgba(207,224,245,0.6)';
        for(let i=0;i<46;i++)g2.fillRect(140+((i*37)%170),20+((i*53)%230),2,2);});
    IDEA(ru?'Провал тишины':'Dead Air',ru?'вырезано · звук':'cut · sound',
      ru?'Раз в минуту весь звук пропадал на секунду. Оказалось не страшно, а похоже на баг.':'Once a minute all sound vanished for a second. It did not read as scary — it read as a bug.',
      g2=>{g2.fillStyle='#0a0a0d';g2.fillRect(0,0,420,270);
        g2.strokeStyle='rgba(140,180,150,0.55)';g2.lineWidth=1.6;g2.beginPath();
        for(let x=0;x<420;x++){const flat=(x>150&&x<270);
          g2.lineTo(x,135+(flat?0:Math.sin(x*0.14)*Math.cos(x*0.03)*70));}
        g2.stroke();
        g2.fillStyle='rgba(224,32,32,0.5)';g2.font='13px Share Tech Mono';g2.textAlign='center';
        g2.fillText('1.0 s',210,120);});
    IDEA(ru?'Блики глаз':'Eye Glints',ru?'вырезано · углы':'cut · corners',
      ru?'В тёмных углах комнаты изредка вспыхивали янтарные точки. Идея нравилась больше, чем исполнение.':'Amber points would flare in the dark corners now and then. The idea was better than the execution.',
      g2=>{g2.fillStyle='#08080c';g2.fillRect(0,0,420,270);
        [[40,40],[380,40],[40,230],[380,230]].forEach(([x,y],i)=>{
          g2.fillStyle='rgba(255,221,102,'+(i===1?0.9:0.18)+')';
          g2.beginPath();g2.arc(x,y,i===1?5:3,0,7);g2.fill();});
        g2.fillStyle='rgba(200,195,178,0.2)';g2.font='12px Share Tech Mono';g2.textAlign='center';
        g2.fillText('. . .',210,140);});
    IDEA(ru?'Первый сюжет':'The First Story',ru?'переписано · лор':'rewritten · lore',
      ru?'В первой версии дети смены 1989 просто не дожили до подъёма, а игрок оказывался в психбольнице. Историю переписали: гроза, три ночи без света и электрик, который так и не дал ток.':'In the first version the 1989 children simply never lived to see the morning, and the player woke in a ward. It was rewritten: a storm, three nights without power, and an electrician who never restored it.',
      g2=>{g2.fillStyle='#12100c';g2.fillRect(0,0,420,270);
        g2.fillStyle='#d9c79a';g2.fillRect(70,40,280,190);
        g2.fillStyle='rgba(120,80,34,0.35)';g2.fillRect(70,40,280,190);
        g2.strokeStyle='rgba(160,40,40,0.8)';g2.lineWidth=3;
        g2.beginPath();g2.moveTo(90,90);g2.lineTo(330,180);g2.moveTo(330,90);g2.lineTo(90,180);g2.stroke();
        g2.fillStyle='#39291a';g2.font='700 16px Cormorant Garamond, serif';g2.textAlign='center';
        g2.fillText('1989',210,68);});
    IDEA(ru?'Голосовое друга':'A Friend\u2019s Voice',ru?'ожидается · катсцена':'pending · cutscene',
      ru?'Вступление должен озвучить друг автора. Файл intro_voice.mp3 уже ждёт своего места в assets — субтитры подгонят под запись.':'The intro is to be voiced by the author\u2019s friend. The file intro_voice.mp3 already waits in assets — subtitles will be timed to the take.',
      g2=>{g2.fillStyle='#0b0d12';g2.fillRect(0,0,420,270);
        g2.strokeStyle='rgba(200,195,178,0.5)';g2.lineWidth=2;
        g2.strokeRect(180,70,60,90);g2.beginPath();g2.arc(210,70,30,Math.PI,0);g2.stroke();
        g2.beginPath();g2.arc(210,160,46,0,Math.PI);g2.stroke();
        g2.beginPath();g2.moveTo(210,206);g2.lineTo(210,232);g2.stroke();
        g2.fillStyle='rgba(240,217,74,0.6)';g2.font='12px Share Tech Mono';g2.textAlign='center';
        g2.fillText('intro_voice.mp3',210,258);});
    IDEA(ru?'Разделённое меню':'The Split Menu',ru?'исправлено · интерфейс':'fixed · interface',
      ru?'Морда справа рисовалась на своём холсте и обрывалась ровной вертикальной линией по центру экрана. Края вырезали в прозрачность — шов исчез.':'The face on the right was drawn on its own canvas and ended in a hard vertical seam down the middle. The edges were cut to transparency — the seam vanished.',
      g2=>{g2.fillStyle='#07070a';g2.fillRect(0,0,420,270);
        g2.fillStyle='#1a1518';g2.fillRect(210,0,210,270);
        g2.strokeStyle='rgba(224,32,32,0.7)';g2.lineWidth=2;g2.setLineDash([6,6]);
        g2.beginPath();g2.moveTo(210,0);g2.lineTo(210,270);g2.stroke();g2.setLineDash([]);
        g2.fillStyle='rgba(185,178,160,0.25)';g2.beginPath();g2.ellipse(310,135,52,86,0,0,7);g2.fill();});
    IDEA(ru?'Первый скриншот':'The First Screenshot',ru?'архив · день первый':'archive · day one',
      ru?'Самая первая сборка: серая коробка, белый прямоугольник вместо двери и куб вместо монстра. Ни звука, ни текстур — но дверь уже надо было держать.':'The very first build: a grey box, a white rectangle for a door and a cube for a monster. No sound, no textures — but the door already had to be held.',
      g2=>{g2.fillStyle='#3a3a3a';g2.fillRect(0,0,420,270);
        g2.fillStyle='#6a6a6a';g2.fillRect(0,190,420,80);
        g2.fillStyle='#e8e8e8';g2.fillRect(60,90,70,120);
        g2.fillStyle='#c04040';g2.fillRect(280,120,60,60);
        g2.fillStyle='rgba(0,0,0,0.5)';g2.font='12px monospace';g2.textAlign='left';
        g2.fillText('fps 60  |  no assets',12,22);});
    IDEA(ru?'Змейка':'The Snake',ru?'до всего · другой проект':'before all this · another project',
      ru?'До «Ласточки» была хоррор-змейка: яблоки превращались в мозги, а на десятом очке выскакивал скример. Оттуда в эту игру перекочевал весь звуковой движок.':'Before Swallow there was a horror snake: apples turned into brains and a scare jumped out at ten points. The entire sound engine moved from there into this game.',
      g2=>{g2.fillStyle='#050505';g2.fillRect(0,0,420,270);
        g2.fillStyle='#2a7a2a';[0,1,2,3,4,5].forEach(i=>g2.fillRect(120+i*24,130,20,20));
        g2.fillStyle='#8b0e0e';g2.beginPath();g2.arc(300,140,11,0,7);g2.fill();
        g2.strokeStyle='rgba(60,60,60,0.8)';g2.lineWidth=2;g2.strokeRect(40,50,340,180);});
    IDEA(ru?'Сортировки':'Sorting Lab',ru?'до всего · учебный проект':'before all this · a study project',
      ru?'Визуализатор сортировок бок о бок: пять алгоритмов, столбики поют при сравнении. Именно там разобрались, зачем нужен логарифм.':'A side-by-side sorting visualiser: five algorithms, bars singing on every comparison. That is where logarithms finally made sense.',
      g2=>{g2.fillStyle='#0b0d12';g2.fillRect(0,0,420,270);
        for(let i=0;i<26;i++){const h=20+((i*53)%180);
          g2.fillStyle=i===9?'#e0d040':'#3f6f9f';g2.fillRect(20+i*15,240-h,11,h);}});
    IDEA(ru?'Тринадцатая кровать':'The Thirteenth Bed',ru?'идея · не вошло':'idea · never shipped',
      ru?'Хотели поставить в комнату тринадцатую койку, пустую и застеленную. Пугала сильнее любого монстра, но ломала планировку — осталась только в тексте.':'We wanted a thirteenth bed in the room, empty and neatly made. It scared harder than any monster but broke the layout — it survived only in the text.',
      g2=>{g2.fillStyle='#0c0e13';g2.fillRect(0,0,420,270);
        [70,210].forEach(x=>{g2.fillStyle='#2a2f38';g2.fillRect(x,150,120,60);});
        g2.strokeStyle='rgba(224,32,32,0.55)';g2.lineWidth=2;g2.setLineDash([7,7]);
        g2.strokeRect(300,150,90,60);g2.setLineDash([]);
        g2.fillStyle='rgba(224,32,32,0.7)';g2.font='14px Share Tech Mono';g2.textAlign='center';
        g2.fillText('13',345,140);});
    IDEA(ru?'Ночь без монстров':'A Night With No One',ru?'идея · не вошло':'idea · never shipped',
      ru?'Одна из ночей должна была пройти совсем пусто: ни шагов, ни стука, шесть часов тишины. Побоялись, что игрок решит, будто игра сломалась.':'One night was meant to be utterly empty: no steps, no knocking, six hours of silence. We feared the player would think the game had broken.',
      g2=>{g2.fillStyle='#07080c';g2.fillRect(0,0,420,270);
        g2.fillStyle='rgba(200,195,178,0.25)';g2.font='italic 22px Cormorant Garamond, serif';
        g2.textAlign='center';g2.fillText('12:00  ·  1:00  ·  2:00',210,120);
        g2.fillStyle='rgba(200,195,178,0.12)';g2.font='italic 17px Cormorant Garamond, serif';
        g2.fillText('никто не пришёл',210,170);});
    IDEA(ru?'Ноги под одеялом':'Feet Under the Blanket',ru?'вырезано · кровать':'cut · the bed',
      ru?'В ногах кровати лежал бугор — твои ступни. При взгляде вниз он выглядел как чужая голова, и его убрали.':'A mound lay at the foot of the bed — your feet. Looking down, it read as someone else\u2019s head, so it went.',
      g2=>{g2.fillStyle='#0c0e13';g2.fillRect(0,0,420,270);
        g2.fillStyle='#39414d';g2.fillRect(120,120,180,120);
        g2.fillStyle='#4a5460';g2.beginPath();g2.ellipse(210,130,52,28,0,Math.PI,0);g2.fill();
        g2.strokeStyle='rgba(224,32,32,0.6)';g2.lineWidth=2.5;
        g2.beginPath();g2.arc(210,124,44,0,7);g2.stroke();});
    return C;
  }
  // ---- финальная карточка: мальчик ----
  function drawBoyCard(g2){
    // фон: тёплый свет сверху, как от лампы над столом
    g2.fillStyle='#0d0f14';g2.fillRect(0,0,420,270);
    const bg=g2.createRadialGradient(210,60,10,210,140,240);
    bg.addColorStop(0,'rgba(255,236,196,0.20)');bg.addColorStop(1,'rgba(0,0,0,0)');
    g2.fillStyle=bg;g2.fillRect(0,0,420,270);
    const cx=210, hy=132, hr=46;      // центр, голова
    // ---- плечи и рубашка ----
    g2.fillStyle='#243040';
    g2.beginPath();
    g2.moveTo(cx-104,270);
    g2.quadraticCurveTo(cx-96,214,cx-40,198);
    g2.lineTo(cx+40,198);
    g2.quadraticCurveTo(cx+96,214,cx+104,270);
    g2.closePath();g2.fill();
    // воротник
    g2.fillStyle='#2e3c4e';
    g2.beginPath();g2.moveTo(cx-34,200);g2.lineTo(cx,224);g2.lineTo(cx+34,200);
    g2.lineTo(cx+22,194);g2.lineTo(cx,212);g2.lineTo(cx-22,194);g2.closePath();g2.fill();
    // ---- шея ----
    g2.fillStyle='#c99e7f';g2.fillRect(cx-15,hy+30,30,34);
    g2.fillStyle='rgba(90,60,44,0.35)';g2.fillRect(cx-15,hy+30,30,10);
    // ---- голова ----
    g2.fillStyle='#d9b294';
    g2.beginPath();g2.ellipse(cx,hy,hr*0.86,hr,0,0,7);g2.fill();
    // уши
    g2.beginPath();g2.ellipse(cx-hr*0.84,hy+6,7,12,0,0,7);g2.fill();
    g2.beginPath();g2.ellipse(cx+hr*0.84,hy+6,7,12,0,0,7);g2.fill();
    // ---- ЛИЦО В ТЕНИ: не разглядеть ----
    g2.save();g2.beginPath();g2.ellipse(cx,hy,hr*0.86,hr,0,0,7);g2.clip();
    // лицо светлое: лишь мягкая тень от кудрей сверху
    const sh=g2.createLinearGradient(0,hy-hr,0,hy+hr*0.4);
    sh.addColorStop(0,'rgba(60,42,32,0.45)');sh.addColorStop(1,'rgba(60,42,32,0)');
    g2.fillStyle=sh;g2.fillRect(cx-hr,hy-hr,hr*2,hr*2);
    // из черт — только небольшая улыбка
    g2.strokeStyle='rgba(150,96,74,0.55)';g2.lineWidth=2.6;g2.lineCap='round';
    g2.beginPath();g2.arc(cx,hy+8,15,0.22*Math.PI,0.78*Math.PI);g2.stroke();
    g2.restore();
    // ---- КУДРИ: три слоя объёма ----
    function curl(x,y,r,c){g2.fillStyle=c;g2.beginPath();g2.arc(x,y,r,0,7);g2.fill();}
    // задний слой (тёмное золото)
    for(let i=0;i<20;i++){const a=Math.PI*1.02+ (i/19)*Math.PI*0.96;
      curl(cx+Math.cos(a)*(hr*1.16),hy+Math.sin(a)*(hr*1.10)-6,15+((i*5)%7),'#b98f4e');}
    // средний слой
    for(let i=0;i<18;i++){const a=Math.PI*1.06+ (i/17)*Math.PI*0.88;
      curl(cx+Math.cos(a)*(hr*1.02),hy+Math.sin(a)*(hr*0.98)-9,13+((i*7)%6),'#dcb367');}
    // передний слой — светлые блики
    for(let i=0;i<14;i++){const a=Math.PI*1.12+ (i/13)*Math.PI*0.76;
      curl(cx+Math.cos(a)*(hr*0.90),hy+Math.sin(a)*(hr*0.88)-11,10+((i*3)%5),'#f0d79b');}
    // чёлка кудрями на лоб
    for(let i=0;i<9;i++){const x=cx-hr*0.72+i*(hr*0.18);
      curl(x,hy-hr*0.52+Math.sin(i*1.3)*7,11+((i*5)%4),'#e8ca8a');
      curl(x+4,hy-hr*0.40+Math.cos(i)*6,8,'#f5e0ad');}
    // отдельные завитки у висков
    curl(cx-hr*0.95,hy-hr*0.10,9,'#dcb367');
    curl(cx+hr*0.97,hy-hr*0.16,8,'#dcb367');
    curl(cx-hr*1.02,hy+hr*0.16,7,'#c9a05c');
    curl(cx+hr*1.04,hy+hr*0.10,7,'#c9a05c');
    // мягкий контровой свет по кудрям
    g2.strokeStyle='rgba(255,240,205,0.30)';g2.lineWidth=3;
    g2.beginPath();g2.arc(cx,hy-4,hr*1.10,Math.PI*1.15,Math.PI*1.85);g2.stroke();
    // виньетка кадра
    const vg=g2.createRadialGradient(210,135,80,210,135,250);
    vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(6,6,10,0.75)');
    g2.fillStyle=vg;g2.fillRect(0,0,420,270);
  }

  function watchScare(kind,sndKey){ // полноэкранный просмотр скримера в движении
    const ov=document.createElement('div');
    ov.style.cssText='position:fixed;inset:0;z-index:88;background:#000;cursor:pointer;';
    ov.innerHTML='<canvas style="position:absolute;inset:0;width:100%;height:100%;"></canvas>'+
      '<div style="position:absolute;bottom:16px;left:0;right:0;text-align:center;font-family:Share Tech Mono;font-size:11px;letter-spacing:0.2em;color:rgba(200,195,178,0.5);pointer-events:none;">клик — закрыть</div>';
    document.body.appendChild(ov);
    const c=ov.querySelector('canvas'),g2=c.getContext('2d');
    let run=true;const t0=performance.now();
    if(sndKey){const fa=SFX[sndKey];if(fa)fa.loop=true;playSfx(sndKey,0.8);}
    (function loop(nw){if(!run)return;c.width=innerWidth;c.height=innerHeight;
      const t=((nw-t0)/1000)%3.4;
      const lunge=t<0.35?0.3+(t/0.35)*0.8:1.1+t*0.05;
      const sh=(t<1.2)?(Math.random()-0.5)*36:0;
      g2.fillStyle='#000';g2.fillRect(0,0,c.width,c.height);
      g2.save();g2.translate(c.width/2+sh,c.height/2+sh*0.6);g2.scale(lunge,lunge);
      g2.translate(-c.width/2,-c.height/2);
      try{(kind==='eye'?drawEye:SCARE[kind])(g2,c.width,c.height,t);}catch(e){}
      g2.restore();
      requestAnimationFrame(loop);})(t0);
    ov.onclick=()=>{run=false;if(sndKey){const fa=SFX[sndKey];if(fa)fa.loop=false;stopSfx(sndKey);}ov.remove();};
  }
  function openArchive(){
    const scr=document.getElementById('arch');if(!scr)return;
    scr.style.display='block';
    const cards=archCards();
    const cv=document.getElementById('archCv'),g2=cv.getContext('2d');
    const card=document.getElementById('archCard');
    const ru=LANG==='ru';
    let i=0,busy=false,thanked=false;
    const total=cards.length+1;
    function render(){
      const isBoy=(i>=cards.length);
      g2.clearRect(0,0,420,270);
      if(isBoy)drawBoyCard(g2); else cards[i].draw(g2);
      document.getElementById('archNum').textContent=String(i+1).padStart(2,'0')+' / '+total;
      document.getElementById('archTag').textContent=isBoy?(ru?'АВТОР':'THE AUTHOR'):cards[i].tag;
      document.getElementById('archTitle').textContent=isBoy?(ru?'Роман':'Roman'):cards[i].title;
      document.getElementById('archDesc').textContent=isBoy?(ru?'нажми на него':'click on him'):cards[i].desc;
      const pb=document.getElementById('archPlay');
      const c2=cards[i];
      if(!isBoy&&c2&&(c2.watch||c2.sound)){pb.style.display='inline-block';
        pb.textContent=c2.watch?(ru?'▶ СМОТРЕТЬ':'▶ WATCH'):(ru?'▶ ПРОСЛУШАТЬ':'▶ PLAY');
        pb.onclick=e=>{e.stopPropagation();
          ['scream1','scream2','nature','ohno','gm','palata','acc','s67','murr','show','krank','night'].forEach(k=>stopSfx(k));
          if(c2.watch)watchScare(c2.watch,c2.sound);else playSfx(c2.sound,0.85);};}
      else pb.style.display='none';
      cv.onclick=isBoy?thank:null;
      cv.style.cursor=isBoy?'pointer':'default';
    }
    function thank(){
      if(thanked)return;thanked=true;devUnlocked=true;
      if(AC){[523,659,784,1047].forEach((f,k)=>setTimeout(()=>tone(f,'sine',0.9,0.1,f),k*150));}
      document.getElementById('archTitle').textContent=ru?'Спасибо за полное прохождение игры!':'Thank you for completing the game!';
      document.getElementById('archTitle').style.color='#f0d94a';
      document.getElementById('archDesc').innerHTML=ru
        ?'Вам открыто дев-меню!<br><b style="color:#f0d94a">нажмите на ~</b>'
        :'The dev menu is unlocked!<br><b style="color:#f0d94a">press ~</b>';
    }
    function go(d){
      if(busy)return;const ni=i+d;
      if(ni<0||ni>=total)return;busy=true;
      card.style.transform='translateX('+(-d*70)+'px) rotateY('+(-d*22)+'deg)';card.style.opacity='0';
      if(AC)noise(0.13,0.08,3000);
      setTimeout(()=>{i=ni;render();
        card.style.transition='none';
        card.style.transform='translateX('+(d*70)+'px) rotateY('+(d*22)+'deg)';
        requestAnimationFrame(()=>{card.style.transition='transform .38s cubic-bezier(.2,.9,.3,1),opacity .38s';
          card.style.transform='none';card.style.opacity='1';busy=false;});},380);
    }
    document.getElementById('archPrev').onclick=()=>go(-1);
    document.getElementById('archNext').onclick=()=>go(1);
    document.getElementById('archNav').innerHTML=ru
      ?'← →  листать плёнку &nbsp;·&nbsp; ESC — закрыть':'← →  wind the reel &nbsp;·&nbsp; ESC — close';
    function key(e){
      if(scr.style.display==='none')return;
      if(e.code==='ArrowRight'){e.preventDefault();go(1);}
      else if(e.code==='ArrowLeft'){e.preventDefault();go(-1);}
      else if(e.code==='Escape'){scr.style.display='none';removeEventListener('keydown',key);
        ['scream1','scream2','nature','ohno','gm','palata','acc','s67','murr','show','krank','night'].forEach(k=>stopSfx(k));}}
    addEventListener('keydown',key);
    render();
  }
  document.getElementById('btnArchive')&&document.getElementById('btnArchive').addEventListener('click',openArchive);

  // ======================================================
  //   Х Р О Н И К А  —  рассказ о той ночи, 3D, от первого лица
  //   Управления нет. Мы — только взгляд внутри чужой памяти.
  // ======================================================
  const CH={active:false,scene:null,cam:null,idx:0,t:0,grp:null,st:null,skipT:0,rain:null,bolt:null};
  window.CH=CH;
  function chCv(){return document.getElementById('chronCv');}

  function chInit(){
    if(CH.scene)return;
    CH.scene=new THREE.Scene();
    CH.scene.fog=new THREE.FogExp2(0x05070c,0.055);
    CH.scene.background=new THREE.Color(0x05070c);
    CH.cam=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,0.05,400);
    CH.amb=new THREE.AmbientLight(0x2a3444,0.5);CH.scene.add(CH.amb);
    CH.moon=new THREE.DirectionalLight(0x8ea6c8,0.35);CH.moon.position.set(-4,9,3);CH.scene.add(CH.moon);
    CH.bolt=new THREE.PointLight(0xdce8ff,0,90,2);CH.bolt.position.set(6,16,-6);CH.scene.add(CH.bolt);
    // дождь — общий для уличных сцен
    const rg=new THREE.BufferGeometry(),N=1400,pos=new Float32Array(N*3);
    for(let i=0;i<N;i++){pos[i*3]=(Math.random()-0.5)*40;pos[i*3+1]=Math.random()*26;pos[i*3+2]=(Math.random()-0.5)*40;}
    rg.setAttribute('position',new THREE.BufferAttribute(pos,3));
    CH.rain=new THREE.Points(rg,new THREE.PointsMaterial({color:0x9fb8dc,size:0.055,transparent:true,opacity:0.45}));
    CH.rain.visible=false;CH.scene.add(CH.rain);
  }
  function chRain(dt,on){
    CH.rain.visible=!!on;if(!on)return;
    const p=CH.rain.geometry.attributes.position.array;
    for(let i=1;i<p.length;i+=3){p[i]-=dt*16;if(p[i]<0)p[i]=26;}
    CH.rain.geometry.attributes.position.needsUpdate=true;
    CH.rain.position.x=CH.cam.position.x;CH.rain.position.z=CH.cam.position.z;
  }
  function chPlayAt(key,at,vol,stopAfter){
    const a2=SFX[key];if(!a2||!a2._ok)return false;
    try{a2.currentTime=at||0;a2.volume=(vol===undefined?1:vol)*(SET.quiet?0.5:1);
      a2.play().catch(()=>{});}catch(e){return false;}
    if(stopAfter)setTimeout(()=>{try{a2.pause();a2.currentTime=0;}catch(e){}},stopAfter*1000);
    return true;
  }
  function chFlash(power){ // молния
    CH.st.flash=Math.max(CH.st.flash||0,power||1);
    CH.bolt.intensity=6*power;
    if(!chPlayAt('thunder',0,0.85,6)&&AC){noise(0.35,0.09,1200);
      setTimeout(()=>{if(AC){noise(1.5,0.15,140);tone(44,'sine',2.0,0.14,38);}},180+Math.random()*380);}
  }
  function chZap(){ // смертельный удар — один и тот же для всех
    if(chPlayAt('zapkill',2,1,3.2))return;   // в файле первые 2 секунды тишины
    if(!AC)return;
    noise(0.16,0.22,3200);
    setTimeout(()=>noise(0.10,0.16,2200),70);
    tone(70,'sawtooth',0.5,0.12,60);
  }
  const chM=(c,r,o)=>M(c,r===undefined?0.9:r,o);
  function chClear(){
    if(CH.grp){CH.scene.remove(CH.grp);
      CH.grp.traverse(o=>{if(o.geometry)o.geometry.dispose&&o.geometry.dispose();});}
    CH.grp=new THREE.Group();CH.scene.add(CH.grp);
    CH.rain.visible=false;CH.bolt.intensity=0;
    CH.amb.intensity=0.5;CH.amb.color.setHex(0x2a3444);
    CH.scene.fog.density=0.055;CH.scene.fog.color.setHex(0x05070c);
    CH.scene.background.setHex(0x05070c);
    CH.cam.position.set(0,1.6,0);CH.cam.rotation.set(0,0,0,'YXZ');CH.cam.fov=62;CH.cam.updateProjectionMatrix();
  }
  // ---- строительные детали ----
  function chTrees(n,rad,grp){
    const tm=chM(0x0d1a12,1),bm=chM(0x241c14,1);
    for(let i=0;i<n;i++){
      const a=Math.random()*6.28,d=4+Math.random()*rad;
      const x=Math.cos(a)*d,z=Math.sin(a)*d,h=5+Math.random()*4;
      const t=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.2,h,6),bm);
      t.position.set(x,h/2,z);grp.add(t);
      for(let k=0;k<3;k++){const c=new THREE.Mesh(new THREE.ConeGeometry(1.5-k*0.35,2.2,7),tm);
        c.position.set(x,h*0.7+k*1.2,z);grp.add(c);}}
  }
  function chCabins(grp,onWin){
    const wm=chM(0x14100c,1),rm=chM(0x0c0a08,1);
    const wins=[];
    for(let i=0;i<4;i++){
      const bx=-9+i*6,bz=-16;
      const b=new THREE.Mesh(new THREE.BoxGeometry(4.6,2.8,4),wm);b.position.set(bx,1.4,bz);grp.add(b);
      const r=new THREE.Mesh(new THREE.ConeGeometry(3.9,1.5,4),rm);r.position.set(bx,3.5,bz);r.rotation.y=Math.PI/4;grp.add(r);
      for(let k=0;k<2;k++){
        const w=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.9),
          M(0x000000,1,{emissive:0xffc46e,emissiveIntensity:1.6}));
        w.position.set(bx-1.1+k*2.2,1.6,bz+2.02);grp.add(w);wins.push(w);}}
    return wins;
  }

  // ---- комната как в игре: бревенчатый сруб ----
  function chRoomShell(g,cz){
    const logm=chM(0x4a3826,1),W=6.4,D=7.6,H=3;
    const fl=new THREE.Mesh(new THREE.PlaneGeometry(W,D),chM(0x3a2c1e,1));
    fl.rotation.x=-Math.PI/2;fl.position.z=cz;g.add(fl);
    const cl=new THREE.Mesh(new THREE.PlaneGeometry(W,D),chM(0x241c14,1));
    cl.rotation.x=Math.PI/2;cl.position.set(0,H,cz);g.add(cl);
    for(let i=0;i<10;i++){const y=0.16+i*0.31;
      [-W/2,W/2].forEach(x=>{const lg=new THREE.Mesh(new THREE.CylinderGeometry(0.155,0.155,D,8),logm);
        lg.rotation.x=Math.PI/2;lg.position.set(x,y,cz);g.add(lg);});
      [cz-D/2,cz+D/2].forEach(z=>{
        const isFar=(z<cz);
        if(isFar&&y<2.2){ // торцевая стена с проёмом под дверь
          const gap=1.35,seg=(W-gap)/2;
          [-1,1].forEach(sn=>{const lg=new THREE.Mesh(new THREE.CylinderGeometry(0.155,0.155,seg,8),logm);
            lg.rotation.z=Math.PI/2;lg.position.set(sn*(gap/2+seg/2),y,z);g.add(lg);});
        }else{const lg=new THREE.Mesh(new THREE.CylinderGeometry(0.155,0.155,W,8),logm);
          lg.rotation.z=Math.PI/2;lg.position.set(0,y,z);g.add(lg);}});}
    // косяк проёма
    const jm=chM(0x2b2119,1);
    [-0.72,0.72].forEach(x=>{const j=new THREE.Mesh(new THREE.BoxGeometry(0.1,2.25,0.22),jm);
      j.position.set(x,1.12,cz-D/2);g.add(j);});
    const lint2=new THREE.Mesh(new THREE.BoxGeometry(1.6,0.16,0.22),jm);
    lint2.position.set(0,2.28,cz-D/2);g.add(lint2);
    return {W,D,H};
  }
  // ---- двухъярусная койка, как в корпусе ----
  function chBunk(g,x,z){
    const grp=new THREE.Group();grp.position.set(x,0,z);g.add(grp);
    const fm=chM(0x2b2119,1),mm=chM(0x4a5462,1),pm=chM(0xd8d2c4,0.9);
    [[-0.9,-1.15],[0.9,-1.15],[-0.9,1.15],[0.9,1.15]].forEach(([px,pz])=>{
      const p2=new THREE.Mesh(new THREE.BoxGeometry(0.09,1.85,0.09),fm);
      p2.position.set(px,0.92,pz);grp.add(p2);});
    const low=new THREE.Group();grp.add(low);
    const lf=new THREE.Mesh(new THREE.BoxGeometry(1.9,0.12,2.4),fm);lf.position.y=0.42;low.add(lf);
    const lm=new THREE.Mesh(new THREE.BoxGeometry(1.8,0.2,2.3),mm);lm.position.y=0.58;low.add(lm);
    const lp=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.14,0.4),pm);lp.position.set(0,0.72,-0.95);low.add(lp);
    const up=new THREE.Group();grp.add(up);
    const uf=new THREE.Mesh(new THREE.BoxGeometry(1.9,0.12,2.4),fm);uf.position.y=1.42;up.add(uf);
    const um=new THREE.Mesh(new THREE.BoxGeometry(1.8,0.2,2.3),mm);um.position.y=1.58;up.add(um);
    const upp=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.14,0.4),pm);upp.position.set(0,1.72,-0.95);up.add(upp);
    return {grp,low,up};
  }
  // ================== СЦЕНЫ ==================
  const CHRON=[];
  const chScene=(time,dur,build,update)=>CHRON.push({time,dur,build,update});

  // 1 — ПАЛ ПАЛЫЧ, столб
  chScene('19:40 · грозовое предупреждение',30,()=>{
    const g=CH.grp;
    CH.scene.fog.density=0.03;
    chTrees(30,26,g);
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.3,11,8),chM(0x241c14));
    pole.position.set(0,5.5,-0.55);g.add(pole);
    const arm=new THREE.Mesh(new THREE.BoxGeometry(3.2,0.16,0.16),chM(0x241c14));
    arm.position.set(0,10.2,-0.55);g.add(arm);
    // коробка, в которой он копается
    const box=new THREE.Mesh(new THREE.BoxGeometry(0.9,1.0,0.35),chM(0x2b2b30,0.7));
    box.position.set(0,9.1,-0.42);g.add(box);
    const inner=new THREE.Mesh(new THREE.BoxGeometry(0.78,0.86,0.06),chM(0x0a0a0c,0.9));
    inner.position.set(0,9.1,-0.28);g.add(inner);
    CH.st.wires=[];
    for(let i=0;i<5;i++){const w=new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.018,0.5,5),
      M([0xb03030,0x2a5fc0,0xd8c020,0x1f8f3f,0xd8d8d8][i],0.6));
      w.position.set(-0.26+i*0.13,9.05,-0.25);w.rotation.z=0.2;g.add(w);CH.st.wires.push(w);}
    // руки в рукавицах
    const glove=chM(0x6a5a44,0.95);
    CH.st.handL=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.16,0.5),glove);
    CH.st.handR=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.16,0.5),glove);
    CH.st.handL.position.set(-0.3,8.75,0.05);CH.st.handR.position.set(0.28,8.9,0.02);
    g.add(CH.st.handL);g.add(CH.st.handR);
    // провода вдаль
    for(let i=0;i<3;i++){const w=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,44,5),chM(0x0b0d10));
      w.rotation.z=Math.PI/2;w.position.set(-16,10.1-i*0.05,-0.55-0.4+i*0.4);g.add(w);}
    const gr=new THREE.Mesh(new THREE.PlaneGeometry(90,90),chM(0x0b120d,1));
    gr.rotation.x=-Math.PI/2;g.add(gr);
    CH.cam.position.set(0,9.4,0.5);CH.cam.rotation.set(-0.55,0,0,'YXZ');
    CH.st.fallen=false;
  },(t,dt)=>{
    chRain(dt,true);
    const L=(a,b,x)=>a+(b-a)*Math.max(0,Math.min(1,x));
    const es=x=>x*x*(3-2*x);
    if(t<9.6){ // копается в коробке
      CH.st.handL.position.y=8.75+Math.sin(t*2.1)*0.04;
      CH.st.handR.position.y=8.9+Math.sin(t*2.6+1)*0.05;
      CH.st.handR.rotation.z=Math.sin(t*2.6)*0.25;
      CH.cam.position.set(0,9.4,0.5);
      CH.cam.rotation.set(-0.55+Math.sin(t*0.8)*0.03,Math.sin(t*0.45)*0.05,0,'YXZ');
      if(!CH.st.b1&&t>4.2){CH.st.b1=true;chFlash(0.6);}
      return;}
    if(!CH.st.zap){CH.st.zap=true;chZap();chFlash(1.5);
      CH.st.wires.forEach(x=>{x.material=M(0x111111,0.9);});
      CH.st.handL.material=M(0x14100e,0.95);CH.st.handR.material=M(0x14100e,0.95);
      CH.st.handR.position.set(0.72,0.1,-1.15);CH.st.handR.rotation.set(0.35,0.8,0.45);
      CH.st.handL.position.set(-0.5,0.1,-1.6);CH.st.handL.rotation.set(0.2,-0.4,0.2);}
    // ---- одна непрерывная траектория: падение → поворот головы ----
    const f=Math.max(0,Math.min(1,(t-9.9)/7.0)), e=f*f;         // падение ускоряется
    const h=es(Math.max(0,Math.min(1,(t-17.4)/3.8)));            // голова набок
    const shake=(1-h)*0.02;
    CH.cam.position.y=L(9.4,0.42,e);
    CH.cam.position.z=L(0.5,-0.15,e);
    CH.cam.rotation.x=L(L(-0.55,1.32,e),0.10,h)+(Math.random()-0.5)*shake;
    CH.cam.rotation.z=L(L(0,0.52,e),1.44,h)+(Math.random()-0.5)*shake;
    CH.cam.rotation.y=L(0,0.52,h);
    CH.cam.fov=L(L(62,82,e),70,h);CH.cam.updateProjectionMatrix();
    if(e>0.93&&!CH.st.thud){CH.st.thud=true;if(AC){thud();noise(0.5,0.2,180);}}
    if(t>21.6){const d=(t-21.6)*0.5;
      CH.amb.intensity=Math.max(0,0.5-d);CH.moon.intensity=Math.max(0,0.35-d*0.7);}
    if(t>24.5)CH.st.portrait='pal';
  });

  // 2 — ТЕ, У ОКНА: лес, фонарь, река с оборванным проводом
  chScene('21:10 · четверо ушли к посёлку',30,()=>{
    const g=CH.grp;CH.scene.fog.density=0.055;CH.scene.fog.color.setHex(0x070b0e);
    CH.scene.background.setHex(0x070b0e);CH.amb.intensity=0.10;CH.moon.intensity=0.16;
    // земля и тропа
    const gr=new THREE.Mesh(new THREE.PlaneGeometry(160,160),chM(0x0a140f,1));
    gr.rotation.x=-Math.PI/2;g.add(gr);
    const path=new THREE.Mesh(new THREE.PlaneGeometry(2.6,70),chM(0x1a150f,1));
    path.rotation.x=-Math.PI/2;path.position.set(0,0.012,-20);g.add(path);
    // лес плотной стеной вдоль тропы
    const bm=chM(0x1b1510,1),cm=chM(0x0f1d14,1);
    for(let i=0;i<70;i++){
      const sn=Math.random()<0.5?-1:1, x=sn*(2.2+Math.random()*9);
      let z=4-Math.random()*46;
      if(z<-23&&z>-46)z=4-Math.random()*24;   // в реке деревьев нет
      const h=5+Math.random()*4.5;
      const tr=new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.22,h,6),bm);
      tr.position.set(x,h/2,z);g.add(tr);
      for(let k=0;k<3;k++){const c=new THREE.Mesh(new THREE.ConeGeometry(1.6-k*0.38,2.3,7),cm);
        c.position.set(x,h*0.66+k*1.25,z);g.add(c);}}
    // четверо: трое впереди — мы четвёртый
    CH.st.kids=[];
    for(let i=0;i<3;i++){const k=new THREE.Group();
      const b=new THREE.Mesh(new THREE.CylinderGeometry(0.17,0.22,1.0,8),chM(0x2a2c33,0.95));b.position.y=0.62;k.add(b);
      const h2=new THREE.Mesh(new THREE.SphereGeometry(0.17,10,8),chM(0x8a6a58,0.95));h2.position.y=1.28;k.add(h2);
      k.position.set([-0.75,0.7,0][i],0,-3.2-i*1.5);g.add(k);CH.st.kids.push(k);}
    // фонарь: направленный конус вперёд
    CH.st.lamp=new THREE.SpotLight(0xffd9a0,2.6,22,0.55,0.4,1.4);
    CH.st.lamp.position.set(0.4,1.35,0);g.add(CH.st.lamp);
    CH.st.lampT=new THREE.Object3D();CH.st.lampT.position.set(0.2,0.6,-8);g.add(CH.st.lampT);
    CH.st.lamp.target=CH.st.lampT;
    // река поперёк тропы
    CH.st.water=new THREE.Mesh(new THREE.PlaneGeometry(120,22),
      M(0x0a1a24,0.15,{emissive:0x0d2230,emissiveIntensity:0.5}));
    CH.st.water.rotation.x=-Math.PI/2;CH.st.water.position.set(0,0.03,-34);g.add(CH.st.water);
    // столб на том берегу и оборванный провод, лежащий в воде
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.28,9,7),bm);
    pole.position.set(7,4.5,-46);g.add(pole);
    const arm=new THREE.Mesh(new THREE.BoxGeometry(2.6,0.14,0.14),bm);
    arm.position.set(7,8.2,-46);g.add(arm);
    CH.st.wire=new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.045,22,6),chM(0x0b0d10));
    CH.st.wire.rotation.set(0,0.5,Math.PI/2.6);CH.st.wire.position.set(3.4,1.4,-38);g.add(CH.st.wire);
    CH.cam.position.set(0,1.6,2);CH.cam.rotation.set(-0.03,0,0,'YXZ');
  },(t,dt)=>{
    const L=(a,b,x)=>a+(b-a)*Math.max(0,Math.min(1,x));
    chRain(dt,true);
    const walk=Math.min(t,23)*1.5;
    CH.cam.position.set(Math.sin(t*2.2)*0.02,1.6+Math.abs(Math.sin(t*4.4))*0.04,2-walk);
    CH.cam.rotation.z=Math.sin(t*2.2)*0.014;
    const wade=(t>16)?Math.min(1,(t-16)/5.5):0;          // все погружаются
    CH.st.kids.forEach((k,i)=>{k.position.z=-3.2-i*1.5-walk*0.985;
      k.position.y=Math.abs(Math.sin(t*4.4+i*1.7))*0.05-wade*0.86;});
    CH.st.lamp.position.set(0.4,1.35,CH.cam.position.z);
    CH.st.lampT.position.z=CH.cam.position.z-8;
    // фонарь садится
    if(t<9)CH.st.lamp.intensity=2.6+Math.sin(t*11)*0.15;
    else if(t<12.5)CH.st.lamp.intensity=(Math.random()<0.35?2.2:0.12);
    else CH.st.lamp.intensity=0;
    if(!CH.st.f1&&t>5.5){CH.st.f1=true;chFlash(0.9);}
    if(!CH.st.f2&&t>13.5){CH.st.f2=true;chFlash(1.1);}   // молния показывает реку впереди
    if(!CH.st.f3&&t>17.5){CH.st.f3=true;chFlash(0.9);}
    // входим в воду
    if(t>16&&t<21.5){const p=(t-16)/5.5;
      CH.cam.position.y=1.6-p*1.12;
      CH.scene.fog.density=0.055+p*0.05;
      if(AC&&Math.random()<dt*3)noise(0.12,0.05,700);}
    if(t>=21.5&&!CH.st.zap){CH.st.zap=true;chZap();CH.st.flash=2.4;CH.st.boltHit=1;
      CH.st.water.material.emissive.setHex(0xbfeaff);CH.st.water.material.emissiveIntensity=6;
      CH.st.kids.forEach(k=>{k.children.forEach(c=>{c.material=M(0x08090c,1);});});}
    if(t>21.5){const d=t-21.5;
      // ребята чернеют и заваливаются в воду
      CH.st.kids.forEach((k,i)=>{const p=Math.min(1,Math.max(0,(d-0.2-i*0.14)/1.0));
        k.rotation.x=-p*1.55;k.position.y=-0.86-p*0.55;
        k.position.x+=(Math.random()-0.5)*0.02*(1-p);
        if(p>0.02&&p<0.06&&AC)noise(0.25,0.09,420);});
      // и мы валимся следом
      const pc=Math.min(1,Math.max(0,(d-0.4)/1.6));
      CH.cam.position.y=L(0.48,0.10,pc);
      CH.cam.rotation.x=L(-0.03,-0.95,pc);
      CH.cam.rotation.z=(Math.random()-0.5)*0.32*Math.max(0,1-d*0.8)+pc*0.55;
      CH.st.water.material.emissiveIntensity=Math.max(0,6-d*3);
      CH.st.boltHit=Math.max(0,1-d*1.6);
      CH.amb.intensity=Math.max(0,0.10-d*0.05);}
  });

  // 3 — ТО, ЧТО ЖИЛО В ЛЕСУ: медленно подходит, пока гаснет свет
  chScene('22:00 · то, что жило в лесу',26,()=>{
    const g=CH.grp;CH.scene.fog.density=0.06;CH.amb.intensity=0.13;CH.moon.intensity=0.2;
    const gr=new THREE.Mesh(new THREE.PlaneGeometry(160,160),chM(0x0a1410,1));
    gr.rotation.x=-Math.PI/2;g.add(gr);
    // стена леса за спиной и по бокам
    const bm=chM(0x150f0b,1),cm=chM(0x0b1710,1);
    for(let i=0;i<64;i++){
      const a=Math.random()*6.28,d=9+Math.random()*16;
      const x=Math.cos(a)*d,z=6+Math.sin(a)*d;
      const h=6+Math.random()*4;
      const tr=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.24,h,6),bm);
      tr.position.set(x,h/2,z);g.add(tr);
      for(let k=0;k<3;k++){const c=new THREE.Mesh(new THREE.ConeGeometry(1.7-k*0.4,2.4,7),cm);
        c.position.set(x,h*0.66+k*1.3,z);g.add(c);}}
    // опушка — черта, которую оно не переступало
    CH.st.edge=new THREE.Mesh(new THREE.PlaneGeometry(60,0.35),
      M(0x000000,1,{emissive:0x1a2a20,emissiveIntensity:0.5,transparent:true,opacity:0.6}));
    CH.st.edge.rotation.x=-Math.PI/2;CH.st.edge.position.set(0,0.02,-6);g.add(CH.st.edge);
    // трава редкая, чтобы читался ход
    const gm=chM(0x16261a,1);
    for(let i=0;i<160;i++){const b=new THREE.Mesh(new THREE.BoxGeometry(0.035,0.55,0.035),gm);
      b.position.set((Math.random()-0.5)*26,0.3,4-Math.random()*30);
      b.rotation.z=(Math.random()-0.5)*0.35;g.add(b);}
    CH.st.wins=chCabins(g);
    CH.cam.position.set(0,0.55,8);CH.cam.rotation.set(0.02,0,0,'YXZ');
  },(t,dt)=>{
    const L=(a,b,x)=>a+(b-a)*Math.max(0,Math.min(1,x));
    chRain(dt,true);
    // окна гаснут одно за другим, и с каждым — шаг ближе
    const off=Math.min(CH.st.wins.length,Math.floor(Math.max(0,t-2.5)/2.1));
    CH.st.wins.forEach((wn,i)=>{if(i<off){wn.material.emissiveIntensity=0;}
      else wn.material.emissiveIntensity=1.6+Math.sin(t*6+i)*0.12;});
    if(off!==CH.st.off){CH.st.off=off;if(AC&&off>0)tone(150-off*8,'sine',0.7,0.07,110);}
    // плавное, тягучее приближение — никаких рывков
    const p=Math.min(1,Math.max(0,(t-2.0)/17));
    CH.cam.position.z=L(8,-12,p*p*(3-2*p));
    CH.cam.position.y=0.55+Math.sin(t*0.9)*0.03;
    CH.cam.rotation.y=Math.sin(t*0.35)*0.07;
    CH.cam.rotation.x=0.02+Math.sin(t*0.6)*0.02;
    // двоящееся зрение проясняется, когда гаснет последнее окно
    CH.st.doubled=(off<CH.st.wins.length);
    if(off>=CH.st.wins.length&&!CH.st.clear){CH.st.clear=true;
      if(AC){tone(90,'sine',2.2,0.11,70);noise(0.6,0.05,500);}
      CH.scene.fog.density=0.02;}
    if(t>20.5)CH.amb.intensity=Math.max(0,0.13-(t-20.5)*0.05);
  });

  // 4 — МЛАДШИЙ: под кроватью, в дом входит высокий
  chScene('23:30 · самый младший',26,()=>{
    const g=CH.grp;CH.scene.fog.density=0.015;CH.amb.intensity=0.20;CH.moon.intensity=0.3;
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(14,14),chM(0x2b2119,1));
    floor.rotation.x=-Math.PI/2;g.add(floor);
    const room=new THREE.Mesh(new THREE.BoxGeometry(7,3,8),chM(0x2a2118,1));
    room.material.side=THREE.BackSide;room.position.set(0,1.5,-1);g.add(room);
    // доски кровати над самым лицом
    CH.st.slats=new THREE.Group();g.add(CH.st.slats);
    for(let i=0;i<11;i++){const b=new THREE.Mesh(new THREE.BoxGeometry(2.2,0.09,0.2),chM(0x241c15,1));
      b.position.set(0,0.66,-1.2+i*0.24);CH.st.slats.add(b);}
    [-1.1,1.1].forEach(x=>{const r=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.66,3),chM(0x241c15,1));
      r.position.set(x,0.33,0);CH.st.slats.add(r);});
    // окно — приглушённое
    const win=new THREE.Mesh(new THREE.PlaneGeometry(1.4,1.6),
      M(0x000000,1,{emissive:0x7f96b4,emissiveIntensity:0.45}));
    win.position.set(-3.45,1.6,-1);win.rotation.y=Math.PI/2;g.add(win);CH.st.win=win;
    // фонарик
    CH.st.torch=new THREE.PointLight(0xffe0a8,1.4,5,2);CH.st.torch.position.set(0.15,0.24,0.55);g.add(CH.st.torch);
    // дверь и высокий силуэт
    CH.st.tall=new THREE.Group();CH.st.tall.visible=false;CH.st.tall.position.set(0,0,-4.6);
    const leg=chM(0x0a0b0e,1);
    [[-0.22],[0.22]].forEach(o=>{const l=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.11,1.5,7),leg);
      l.position.set(o[0],0.75,0);CH.st.tall.add(l);});
    g.add(CH.st.tall);
    CH.cam.position.set(0,0.24,1.0);CH.cam.rotation.set(0.06,0,0,'YXZ');
  },(t,dt)=>{
    const L=(a,b,x)=>a+(b-a)*Math.max(0,Math.min(1,x));
    const per=0.55+t*0.12;
    if(t<14){const on=Math.sin(t*6.283/per)>0.25;
      CH.st.torch.intensity=on?1.4:0.06;}
    else CH.st.torch.intensity=0.04;
    CH.cam.rotation.y=Math.sin(t*0.5)*0.09;
    // входит кто-то высокий
    if(t>7.5&&t<15){CH.st.tall.visible=true;
      const p=Math.min(1,(t-7.5)/6);
      CH.st.tall.position.z=L(-4.6,-1.1,p);
      CH.st.tall.children.forEach((l,i)=>{l.position.y=0.75+Math.abs(Math.sin(t*3.4+i*3))*0.05;});
      if(!CH.st.cr&&t>7.6){CH.st.cr=true;if(AC)creak();}
      CH.cam.rotation.y=L(CH.cam.rotation.y,0.0,p);}
    // УДАР
    if(t>=15&&!CH.st.zap){CH.st.zap=true;chZap();CH.st.flash=2.2;
      if(AC){setTimeout(()=>{if(AC){thud();noise(0.9,0.3,140);}},120);}}
    if(t>=15){const d=t-15;
      // оба яруса складываются и наматывают на брёвна
      const c=Math.min(1,d/1.1);
      CH.st.slats.position.y=-c*0.46;
      CH.st.slats.rotation.z=Math.sin(d*22)*0.08*(1-c)+c*0.22;
      CH.st.slats.rotation.x=c*0.3;
      CH.cam.position.y=L(0.24,0.10,c);
      CH.cam.rotation.z=L(0,0.9,c)+Math.sin(d*30)*0.05*(1-c);
      CH.cam.rotation.x=L(0.06,0.5,c);
      CH.st.red=Math.min(1,d*0.8);          // всё краснеет
      CH.st.torch.intensity=0;
      CH.amb.intensity=Math.max(0,0.20-d*0.06);}
  });

  // 5 — ИЛЬДАР: наша комната, сосед уходит, под койкой мигает
  chScene('23:30 · койка у стены',26,()=>{
    const g=CH.grp;CH.scene.fog.density=0.010;CH.amb.intensity=0.30;CH.moon.intensity=0.22;
    chRoomShell(g,-1.2);
    // лампочка под потолком
    const lamp=new THREE.PointLight(0xffe0b0,0.6,10,2);lamp.position.set(0,2.45,-1.0);g.add(lamp);
    const bulb=new THREE.Mesh(new THREE.SphereGeometry(0.09,10,8),
      M(0x000000,1,{emissive:0xffe8c0,emissiveIntensity:2}));bulb.position.set(0,2.45,-1.0);g.add(bulb);
    const cord=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.012,0.5,5),chM(0x1a1a20,1));
    cord.position.set(0,2.7,-1.2);g.add(cord);
    // окно с рамой — тусклое
    const win=new THREE.Mesh(new THREE.PlaneGeometry(1.25,1.45),
      M(0x000000,1,{emissive:0x5f7490,emissiveIntensity:0.24}));
    win.position.set(-3.14,1.55,-1.4);win.rotation.y=Math.PI/2;g.add(win);
    [[0,1.55,0.02,1.45],[0,1.55,1.25,0.04]].forEach(([a1,b1,c1,d1])=>{
      const fr=new THREE.Mesh(new THREE.BoxGeometry(0.05,d1,c1||0.04),chM(0x2b2119,1));
      fr.position.set(-3.12,b1,-1.4);g.add(fr);});
    // дверь
    CH.st.doorP=new THREE.Group();CH.st.doorP.position.set(-0.66,0,-5.0);g.add(CH.st.doorP);
    const dr=new THREE.Mesh(new THREE.BoxGeometry(1.32,2.2,0.09),chM(0x241c14,1));
    dr.position.set(0.66,1.1,0);CH.st.doorP.add(dr);
    // тумбочка с кексом — как в игре
    const nb=new THREE.Mesh(new THREE.BoxGeometry(0.55,0.6,0.5),chM(0x2b2119,1));
    nb.position.set(2.8,0.3,-0.6);g.add(nb);
    const cake=new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.13,0.14,10),chM(0xb8895a,0.8));
    cake.position.set(2.8,0.67,-0.6);g.add(cake);
    const cher=new THREE.Mesh(new THREE.SphereGeometry(0.04,8,8),
      M(0x8b0e0e,0.4,{emissive:0x8b0e0e,emissiveIntensity:0.5}));
    cher.position.set(2.8,0.77,-0.6);g.add(cher);
    // ДВЕ двухъярусные койки: наша (слева) и его (справа)
    CH.st.bunkO=chBunk(g,-1.85,-1.1);   // наша — на ней спал сосед
    CH.st.bunkM=chBunk(g,1.85,-1.1);    // его
    // тот, кто лежал на нашем месте (нижний ярус)
    CH.st.other=new THREE.Group();
    const ob=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,1.05,9),chM(0x50565f,0.95));ob.position.y=0.64;
    CH.st.other.add(ob);
    const oh=new THREE.Mesh(new THREE.SphereGeometry(0.2,12,10),chM(0xc09a7c,0.9));oh.position.y=1.34;
    CH.st.other.add(oh);
    const ohh=new THREE.Mesh(new THREE.SphereGeometry(0.21,10,8),chM(0x4a3626,1));
    ohh.scale.set(1,0.6,1);ohh.position.y=1.42;CH.st.other.add(ohh);
    CH.st.other.position.set(-1.85,0.0,-1.35);
    CH.st.other.rotation.x=-Math.PI/2;   // сначала ЛЕЖИТ
    g.add(CH.st.other);
    // фонарик младшего — под нашей койкой
    CH.st.under=new THREE.PointLight(0xffe0a8,0,6,2);
    CH.st.under.position.set(-1.85,0.16,-0.9);g.add(CH.st.under);
    CH.st.lens=new THREE.Mesh(new THREE.SphereGeometry(0.05,10,8),
      M(0x000000,1,{emissive:0xffe0a8,emissiveIntensity:0}));
    CH.st.lens.position.set(-1.85,0.16,-0.75);g.add(CH.st.lens);
    CH.st.spot=new THREE.SpotLight(0xffe0a8,0,7,0.42,0.5,1.5);
    CH.st.spot.position.set(-1.85,0.17,-0.8);g.add(CH.st.spot);
    CH.st.spotT=new THREE.Object3D();CH.st.spotT.position.set(0.6,0.02,1.6);g.add(CH.st.spotT);
    CH.st.spot.target=CH.st.spotT;
    // балка над нами
    CH.st.beam=new THREE.Mesh(new THREE.BoxGeometry(0.44,0.38,3.2),chM(0x2e2418,1));
    CH.st.beam.position.set(1.85,2.9,-1.0);g.add(CH.st.beam);
    // лежим на нижнем ярусе своей койки
    CH.cam.position.set(1.85,0.82,0.0);
    CH.cam.rotation.set(-0.05,1.12,0.5,'YXZ');
  },(t,dt)=>{
    const L=(a,b,x)=>a+(b-a)*Math.max(0,Math.min(1,x));
    const br=Math.sin(t*0.85)*0.012;
    const L2=(a,b,x)=>a+(b-a)*Math.max(0,Math.min(1,x));
    const es2=x=>x*x*(3-2*x);
    CH.cam.position.set(1.75,0.85+br,-0.55);
    if(t<10.5){ // смотрим через комнату на нашу койку
      CH.cam.rotation.set(-0.05+Math.sin(t*0.4)*0.03,1.12+Math.sin(t*0.33)*0.09,0.5,'YXZ');
    }else{ // голова поворачивается вверх, к потолку
      const p=es2(Math.min(1,(t-10.5)/3.6));
      CH.cam.rotation.set(L2(-0.05,1.26,p),L2(1.12,0.55,p),L2(0.5,0.18,p),'YXZ');}
    // сосед встаёт с нашего места и уходит в дверь
    if(t<2.2){ // лежит на нижнем ярусе
      CH.st.other.visible=true;
      CH.st.other.rotation.set(-Math.PI/2,0,0);
      CH.st.other.position.set(-1.85,0.62,-1.35);}
    else if(t<4.2){ // садится, спускает ноги на пол
      const p=es2(Math.min(1,(t-2.2)/2));
      CH.st.other.visible=true;
      CH.st.other.rotation.set(L2(-Math.PI/2,0,p),0,0);
      CH.st.other.position.set(-1.85,L2(0.62,0,p),L2(-1.35,-0.1,p));}
    else if(t<10.4){ // идёт к двери, открывает её и выходит
      const p=Math.min(1,(t-4.2)/5.6);
      CH.st.other.visible=true;
      CH.st.other.rotation.set(0,L2(0,0.10,p),0);
      CH.st.other.position.set(L2(-1.85,0,Math.min(1,p*1.5)),0,L2(-0.1,-5.4,p));
      if(p>0.62)CH.st.doorP.rotation.y=L2(0,1.15,(p-0.62)/0.25);
      if(!CH.st.dr&&p>0.62){CH.st.dr=true;if(AC)creak();}
      if(!CH.st.dr2&&p>0.985){CH.st.dr2=true;if(AC)thud();}}
    else CH.st.other.visible=false;
    // под койкой мигает всё чаще и тревожнее
    if(t>4&&t<15){const per=0.62+t*0.08,on=Math.sin(t*6.283/per)>0.28;
      CH.st.under.intensity=on?1.1:0.04;
      CH.st.spot.intensity=on?3.2:0.05;
      CH.st.lens.material.emissiveIntensity=on?2.4:0.06;}
    else{CH.st.under.intensity=0;CH.st.spot.intensity=0;CH.st.lens.material.emissiveIntensity=0;}
    // УДАР и балка в лицо
    if(t>=15&&!CH.st.zap){CH.st.zap=true;chZap();CH.st.flash=2.4;}
    if(t>=15.5){const d=t-15.5,c=Math.min(1,d/0.5);
      CH.st.beam.position.set(1.75,L(2.9,1.02,c*c),L(-1.2,-0.5,c));
      CH.st.beam.rotation.z=c*0.14;CH.st.beam.rotation.x=c*0.1;
      if(c>=1&&!CH.st.hit){CH.st.hit=true;if(AC){thud();noise(0.8,0.32,120);}}
      if(CH.st.hit){const dd=d-0.5;
        CH.st.red=Math.min(0.8,dd*0.8);
        CH.cam.rotation.z=0.5+Math.sin(dd*26)*0.07*Math.max(0,1-dd);
        CH.amb.intensity=Math.max(0,0.30-dd*0.2);}}
  });

  // 6 — ВОЖАТЫЙ: от ворот, и он видит всё
  chScene('23:30 · он вернулся за тринадцатым',52,()=>{
    const g=CH.grp;CH.scene.fog.density=0.055;CH.amb.intensity=0.24;CH.moon.intensity=0.3;
    chTrees(28,30,g);
    const gr=new THREE.Mesh(new THREE.PlaneGeometry(150,150),chM(0x0a1410,1));
    gr.rotation.x=-Math.PI/2;g.add(gr);
    const gate=new THREE.Group();gate.position.set(0,0,-20);
    [-1.8,1.8].forEach(x=>{const p2=new THREE.Mesh(new THREE.BoxGeometry(0.32,3.6,0.32),chM(0x2c2216));
      p2.position.set(x,1.8,0);gate.add(p2);});
    const arch=new THREE.Mesh(new THREE.BoxGeometry(4.2,0.36,0.32),chM(0x2c2216));
    arch.position.set(0,3.6,0);gate.add(arch);g.add(gate);
    CH.st.kids=[];
    for(let i=0;i<12;i++){const k=new THREE.Group();
      const b=new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.19,0.85,7),chM(0x12141a,1));b.position.y=0.55;k.add(b);
      const h=new THREE.Mesh(new THREE.SphereGeometry(0.15,9,7),chM(0x12141a,1));h.position.y=1.12;k.add(h);
      k.position.set(-0.8+(i%2)*1.6,0,-6-Math.floor(i/2)*1.1);g.add(k);CH.st.kids.push(k);}
    CH.st.hand=new THREE.Mesh(new THREE.BoxGeometry(0.13,0.08,0.24),chM(0xa8836a,0.9));g.add(CH.st.hand);
    // ---- корпус ----
    const CZ=14;CH.st.CZ=CZ;
    const walls=new THREE.Mesh(new THREE.BoxGeometry(7,3,9),chM(0x2a2118,1));
    walls.material.side=THREE.BackSide;walls.position.set(0,1.5,CZ);g.add(walls);
    const shell=new THREE.Mesh(new THREE.BoxGeometry(7.4,3.2,9.4),chM(0x14100c,1));
    shell.position.set(0,1.6,CZ);shell.material.side=THREE.BackSide;g.add(shell);
    CH.st.roof=new THREE.Mesh(new THREE.ConeGeometry(6.2,2,4),chM(0x0c0a08,1));
    CH.st.roof.position.set(0,4,CZ);CH.st.roof.rotation.y=Math.PI/4;g.add(CH.st.roof);
    const fm=chM(0x14100c,1);
    [[-2.4,2.6],[2.4,2.6]].forEach(([x,wd])=>{const p3=new THREE.Mesh(new THREE.BoxGeometry(wd,3,0.2),fm);
      p3.position.set(x,1.5,CZ-4.6);g.add(p3);});
    const lint=new THREE.Mesh(new THREE.BoxGeometry(7,0.7,0.2),fm);
    lint.position.set(0,2.65,CZ-4.6);g.add(lint);
    CH.st.doorP=new THREE.Group();CH.st.doorP.position.set(-0.6,0,CZ-4.6);g.add(CH.st.doorP);
    const dr=new THREE.Mesh(new THREE.BoxGeometry(1.2,2.3,0.09),chM(0x241c14,1));
    dr.position.set(0.6,1.15,0);CH.st.doorP.add(dr);
    // окно тусклое + лампа, чтобы комната читалась
    const win=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.7),
      M(0x000000,1,{emissive:0x6d829c,emissiveIntensity:0.32}));
    win.position.set(-3.45,1.7,CZ+0.5);win.rotation.y=Math.PI/2;g.add(win);
    CH.st.lampIn=new THREE.PointLight(0xd8c8b0,0,11,2);CH.st.lampIn.position.set(0,2.5,CZ-0.5);g.add(CH.st.lampIn);
    // двухъярусные койки, как в корпусе
    CH.st.bunkI=chBunk(g,2,CZ+0.4);      // койка Ильдара
    CH.st.bunkY=chBunk(g,-2,CZ+0.4);     // койка, под которой младший
    CH.st.ild=new THREE.Group();                       // тело: голова, плечо, рука поверх одеяла
    const ih=new THREE.Mesh(new THREE.SphereGeometry(0.21,14,12),chM(0xb08a70,0.9));ih.position.set(0,0.82,-0.85);CH.st.ild.add(ih);
    const ihair=new THREE.Mesh(new THREE.SphereGeometry(0.22,12,10),chM(0x3a2c20,1));
    ihair.scale.set(1,0.65,1);ihair.position.set(0,0.9,-0.9);CH.st.ild.add(ihair);
    const ish=new THREE.Mesh(new THREE.BoxGeometry(0.62,0.22,0.5),chM(0x39414d,1));ish.position.set(0,0.74,-0.4);CH.st.ild.add(ish);
    const iarm=new THREE.Mesh(new THREE.CylinderGeometry(0.075,0.08,0.7,8),chM(0xb08a70,0.9));
    iarm.rotation.x=Math.PI/2.2;iarm.position.set(0.36,0.76,-0.1);CH.st.ild.add(iarm);
    CH.st.ild.position.set(2,0,CZ+0.5);g.add(CH.st.ild);
    // балка над ним
    CH.st.beam=new THREE.Mesh(new THREE.BoxGeometry(0.42,0.36,3.2),chM(0x241c15,1));
    CH.st.beam.position.set(2,2.85,CZ+0.4);g.add(CH.st.beam);
    // красная лужа из-под койки младшего
    CH.st.blood=new THREE.Mesh(new THREE.PlaneGeometry(1,1),
      M(0x000000,1,{emissive:0x7a0a0a,emissiveIntensity:0.9,transparent:true,opacity:0.95}));
    CH.st.blood.rotation.x=-Math.PI/2;CH.st.blood.position.set(-2,0.045,CZ-0.5);
    CH.st.blood.scale.set(0.01,0.01,0.01);g.add(CH.st.blood);
    CH.st.under=new THREE.PointLight(0xffe0a8,0,6,2);
    CH.st.under.position.set(-2,0.16,CZ+0.1);g.add(CH.st.under);
    CH.st.lens=new THREE.Mesh(new THREE.SphereGeometry(0.055,10,8),
      M(0x000000,1,{emissive:0xffe0a8,emissiveIntensity:0}));
    CH.st.lens.position.set(-2,0.16,CZ-0.9);g.add(CH.st.lens);
    CH.st.spot=new THREE.SpotLight(0xffe0a8,0,8,0.4,0.5,1.5);
    CH.st.spot.position.set(-2,0.17,CZ-1.0);g.add(CH.st.spot);
    CH.st.spotT=new THREE.Object3D();CH.st.spotT.position.set(0.4,0.02,CZ-4.2);g.add(CH.st.spotT);
    CH.st.spot.target=CH.st.spotT;
    // дыра в потолке (появится в конце)
    CH.st.hole=new THREE.Mesh(new THREE.PlaneGeometry(2.6,2.2),
      M(0x000000,1,{emissive:0x2b3a52,emissiveIntensity:0.6,transparent:true,opacity:0}));
    CH.st.hole.rotation.x=Math.PI/2;CH.st.hole.position.set(0.4,2.98,CZ+0.2);g.add(CH.st.hole);
    CH.cam.position.set(0,1.62,-2);CH.cam.rotation.set(0,0,0,'YXZ');
  },(t,dt)=>{
    const L=(a,b,x)=>a+(b-a)*Math.max(0,Math.min(1,x));
    const es=x=>x*x*(3-2*x);
    const CZ=CH.st.CZ, bob=Math.abs(Math.sin(t*3.6))*0.035;
    chRain(dt,t<27||t>44);
    if(t<8){ const p=t/8;
      CH.cam.position.set(0,1.62+bob,L(-2,-14,p));
      CH.cam.rotation.set(0,0,Math.sin(t*1.8)*0.008,'YXZ');
      CH.st.kids.forEach((k,i)=>{k.position.z=-6-Math.floor(i/2)*1.1-p*11.5;
        k.position.y=Math.abs(Math.sin(t*4+i))*0.045;});
      CH.st.hand.position.set(0.42,1.02,CH.cam.position.z-0.55);
    } else if(t<11.5){ const p=(t-8)/3.5;
      CH.cam.position.set(0,1.62,-14);
      CH.st.hand.position.z-=dt*2.6;CH.st.hand.position.y=L(1.02,0.8,p);
      CH.st.kids.forEach(k=>{k.position.z-=dt*1.6;});
    } else if(t<15){ const p=es((t-11.5)/3.5);
      CH.cam.position.set(0,1.62,-14);CH.cam.rotation.y=L(0,Math.PI,p);
    } else if(t<25){ const p=es((t-15)/10);
      CH.cam.rotation.y=Math.PI;
      CH.cam.position.set(0,1.62+bob,L(-14,CZ-6.2,p));
      if(!CH.st.dr&&t>23.4){CH.st.dr=true;if(AC)creak();}
    } else if(t<28){ const p=es((t-25)/3);
      CH.st.doorP.rotation.y=L(0,1.25,p);
      CH.cam.rotation.y=Math.PI;
      CH.cam.position.set(0,1.62+bob*0.5,L(CZ-6.2,CZ-3.4,p));
      CH.st.lampIn.intensity=p*0.8;
      if(!CH.st.in){CH.st.in=true;CH.scene.fog.density=0.012;CH.amb.intensity=0.40;}
    } else if(t<36){ // видит спящего Ильдара и мигание под соседней койкой
      const lt=t-28;
      CH.cam.position.set(0,1.6,L(CZ-3.4,CZ-2.0,Math.min(1,lt/5)));
      CH.cam.rotation.y=Math.PI+Math.sin(lt*0.42)*0.22;  // обе койки остаются в кадре
      CH.cam.rotation.x=Math.sin(lt*0.3)*0.05;
      const per=0.6+lt*0.12,on=Math.sin(lt*6.283/per)>0.3;
      CH.st.under.intensity=on?1.0:0.05;
      CH.st.spot.intensity=on?3.4:0.06;
      CH.st.lens.material.emissiveIntensity=on?2.4:0.06;
    } else { // ---- УДАР: обе кровати в кадре, всё одновременно ----
      const d=t-36;
      if(!CH.st.zap){CH.st.zap=true;chZap();CH.st.flash=2.6;
        if(AC)setTimeout(()=>{if(AC){thud();noise(1.0,0.32,130);}},130);}
      CH.st.under.intensity=0;CH.st.spot.intensity=0;CH.st.lens.material.emissiveIntensity=0;
      // обе смерти идут в одну секунду
      const c=Math.min(1,d/1.0);
      // оба яруса койки складываются на младшего
      CH.st.bunkY.up.position.y=-c*0.82;CH.st.bunkY.up.rotation.z=c*0.18;
      CH.st.bunkY.low.position.y=-c*0.34;CH.st.bunkY.low.rotation.z=-c*0.12;
      CH.st.bunkY.grp.rotation.z=c*0.10;
      // и из-под неё растекается
      const bp=Math.min(1,Math.max(0,(d-0.9)/3.2));
      CH.st.blood.scale.set(0.01+bp*2.6,1,0.01+bp*1.9);
      CH.st.blood.material.emissiveIntensity=0.9-bp*0.35;
      CH.st.beam.position.y=L(2.85,0.98,c*c);CH.st.beam.rotation.z=c*0.24;
      if(c>=1&&!CH.st.red)CH.st.red=0.0;
      // краснота ему не нужна — он просто оседает
      // и одновременно мы медленно оседаем на пол, не отводя глаз
      const f=Math.min(1,d/4.2);
      CH.cam.position.set(L(0,-0.35,f),L(1.6,0.26,f*f),L(CZ-2.0,CZ-2.6,f));
      CH.cam.rotation.y=Math.PI;
      CH.cam.rotation.z=L(0,0.62,f);
      CH.cam.rotation.x=L(0,0.22,f)+Math.sin(d*9)*0.02*(1-f);
      // последнее: он падает навзничь и смотрит в пролом
      if(d>4.4){const p=Math.min(1,(d-4.4)/2.4);
        CH.st.hole.material.opacity=p;
        CH.st.roof.visible=(p<0.5);
        CH.cam.rotation.x=L(0.22,1.34,p);   // взгляд уходит в потолок (положительный наклон = вверх)
        CH.cam.rotation.z=L(0.62,0.3,p);
        CH.cam.position.y=L(0.26,0.2,p);
        chRain(dt,true);                     // дождь падает в лицо
        if(d>6.6&&Math.random()<dt*0.7)chFlash(0.6);
        CH.amb.intensity=Math.max(0,0.40-Math.max(0,d-7.6)*0.11);
        CH.moon.intensity=Math.max(0,0.3-Math.max(0,d-7.6)*0.09);}
    }
  });

  // ---- ПОРТРЕТЫ (2D) ----
  function chPortrait(g2,W,H,kind,a){
    // тот же портрет, что на полароиде истории, но выцветший до серого
    const S=Math.min(W,H),pw=S*(kind==='trio'?0.40:0.30),ph=pw*(kind==='trio'?1.15:1.32);
    const cx=W/2,cy=H*0.46;
    if(!CH._pc){CH._pc=document.createElement('canvas');CH._pc.width=150;CH._pc.height=185;}
    const idx={pal:0,four:1,none:2,ildar:3,kid:4,trio:5}[kind];
    try{drawTalePolaroid(CH._pc,idx,idx+1);}catch(e){}
    g2.save();g2.globalAlpha=a;
    // рамка-полароид
    g2.fillStyle='#c9c4b6';g2.shadowColor='rgba(0,0,0,0.8)';g2.shadowBlur=40;
    g2.fillRect(cx-pw/2-S*0.014,cy-ph/2-S*0.014,pw+S*0.028,ph+S*0.055);
    g2.shadowBlur=0;
    try{g2.filter='grayscale(1) contrast(0.92) brightness(0.95)';}catch(e){}
    g2.drawImage(CH._pc,cx-pw/2,cy-ph/2,pw,ph*0.86);
    try{g2.filter='none';}catch(e){}
    // выцветание и зерно
    g2.fillStyle='rgba(150,148,140,0.16)';g2.fillRect(cx-pw/2,cy-ph/2,pw,ph*0.86);
    for(let i=0;i<260;i++){g2.fillStyle='rgba(255,255,255,0.035)';
      g2.fillRect(cx-pw/2+Math.random()*pw,cy-ph/2+Math.random()*ph*0.86,1.6,1.6);}
    // подпись под снимком
    const M2=(window.GAME_DATA.MONSTERS[LANG]||[])[idx];
    let cap=M2?(M2.who||M2.name):'';
    if(kind==='trio')cap=(LANG==='ru')?'умер вместе с Ильдаром и самым младшим':'died together with Ildar and the youngest';
    if(cap){g2.fillStyle='rgba(60,58,52,0.85)';g2.textAlign='center';
      g2.font='italic '+Math.round(S*0.021)+'px Cormorant Garamond, serif';
      g2.fillText(cap,cx,cy+ph/2+S*0.026);}
    g2.restore();
  }

  // ---- РЕНДЕР 2D-СЛОЯ ----
  function chDraw2D(){
    const cv=chCv();if(!cv)return;
    const W=cv.width=innerWidth,H=cv.height=innerHeight,S=Math.min(W,H);
    const g2=cv.getContext('2d');g2.clearRect(0,0,W,H);
    const sc=CHRON[CH.idx],t=Math.max(0,CH.t-CH_CARD),ct=CH.t;
    const PORT=['pal','four','none','kid','ildar','trio'];
    // кашетирование
    g2.fillStyle='#000';g2.fillRect(0,0,W,H*0.075);g2.fillRect(0,H*0.925,W,H*0.075);
    // всё краснеет (смерти в доме)
    if(CH.st.red>0){g2.fillStyle='rgba(150,10,14,'+Math.min(0.75,CH.st.red)+')';g2.fillRect(0,0,W,H);}
    // двоение зрения (сцена роя)
    if(CH.st.doubled){g2.fillStyle='rgba(120,140,160,0.05)';g2.fillRect(0,0,W,H);}
    // разряд, ударивший в воду
    if(CH.st.boltHit>0){const bh=CH.st.boltHit;
      g2.strokeStyle='rgba(200,235,255,'+bh+')';g2.lineWidth=3+bh*4;
      g2.beginPath();let bx=W*0.5+(Math.random()-0.5)*W*0.1,by=0;g2.moveTo(bx,by);
      while(by<H*0.62){bx+=(Math.random()-0.5)*W*0.07;by+=H*0.07;g2.lineTo(bx,by);}
      g2.stroke();
      const gl=g2.createRadialGradient(bx,H*0.62,10,bx,H*0.62,W*0.4);
      gl.addColorStop(0,'rgba(190,230,255,'+bh*0.5+')');gl.addColorStop(1,'rgba(190,230,255,0)');
      g2.fillStyle=gl;g2.fillRect(0,0,W,H);}
    // вспышка молнии
    if(CH.st.flash>0){g2.fillStyle='rgba(214,228,255,'+Math.min(0.85,CH.st.flash*0.55)+')';
      g2.fillRect(0,0,W,H);CH.st.flash=Math.max(0,CH.st.flash-0.045);
      CH.bolt.intensity=CH.st.flash*6;}
    // карточка времени
    if(ct<CH_CARD){const a=Math.min(1,ct/0.7)*Math.min(1,(CH_CARD-ct)/0.8);
      g2.fillStyle='rgba(0,0,0,'+a*0.85+')';g2.fillRect(0,0,W,H);
      g2.textAlign='center';g2.fillStyle='rgba(224,190,80,'+a+')';
      g2.font='700 '+Math.round(S*0.032)+'px Share Tech Mono, monospace';
      g2.fillText(sc.time.toUpperCase(),W*0.5,H*0.5);}
    // портрет в конце
    {const pa=Math.min(1,(t-(sc.dur-5.4))/1.3)*Math.min(1,Math.max(0,(sc.dur-0.5-t)/1.1));
      if(pa>0){CH.st.portrait=PORT[CH.idx];g2.fillStyle='rgba(0,0,0,'+Math.min(0.96,pa*1.2)+')';g2.fillRect(0,0,W,H);
        chPortrait(g2,W,H,CH.st.portrait,pa);}}
    // затемнение между сценами
    if(t>sc.dur-1.2){g2.fillStyle='rgba(0,0,0,'+Math.min(1,(t-(sc.dur-1.2))/1.2)+')';g2.fillRect(0,0,W,H);}
    // подсказка о пропуске
    if(CH.skipT>0){g2.fillStyle='rgba(200,195,178,0.5)';g2.textAlign='center';
      g2.font=Math.round(S*0.015)+'px Share Tech Mono, monospace';
      g2.fillText('ESC ДЕРЖАТЬ — ПРОПУСТИТЬ  '+Math.ceil(1.6-CH.skipT)+'',W*0.5,H*0.955);}
  }

  function chStartScene(i){
    CH.idx=i;CH.t=0;CH.st={flash:0};
    stopSfx('chrain');stopSfx('reka');
    if(i===1)playSfx('reka',0.75);else playSfx('chrain',0.6);
    chClear();CHRON[i].build();
  }
  const CH_CARD=3.2;   // столько держится карточка времени, сцена в это время замерла
  function chUpdate(dt){
    const sc=CHRON[CH.idx];CH.t+=dt;
    const st=Math.max(0,CH.t-CH_CARD);
    try{sc.update(st,CH.t<CH_CARD?0:dt);}catch(e){}
    chDraw2D();
    if(CH.t>=sc.dur+CH_CARD){
      if(CH.idx+1<CHRON.length)chStartScene(CH.idx+1);
      else chFinish();}
  }
  function chTrio(after){ // общая картина троих
    const ov=document.createElement('div');
    ov.style.cssText='position:fixed;inset:0;z-index:66;background:#04040a;';
    ov.innerHTML='<canvas style="position:absolute;inset:0;width:100%;height:100%;"></canvas>';
    document.body.appendChild(ov);
    const cv=ov.querySelector('canvas'),g2=cv.getContext('2d');
    if(!CH._pc){CH._pc=document.createElement('canvas');CH._pc.width=150;CH._pc.height=185;}
    const t0=performance.now();let run=true;
    (function d(nw){if(!run)return;
      const W=cv.width=innerWidth,H=cv.height=innerHeight,S=Math.min(W,H);
      const t=(nw-t0)/1000;
      g2.fillStyle='#04040a';g2.fillRect(0,0,W,H);
      const pw=S*0.20,ph=pw*1.32;
      [[4,-1],[3,0],[5,1]].forEach(([idx,off],i)=>{
        const a2=Math.min(1,Math.max(0,(t-0.6-i*1.1)/1.2));if(a2<=0)return;
        const cx=W/2+off*(pw*1.28),cy=H*0.46;
        try{drawTalePolaroid(CH._pc,idx,idx+1);}catch(e){}
        g2.save();g2.globalAlpha=a2;
        g2.fillStyle='#c9c4b6';g2.shadowColor='rgba(0,0,0,0.85)';g2.shadowBlur=34;
        g2.translate(cx,cy);g2.rotate((off)*0.045);g2.translate(-cx,-cy);
        g2.fillRect(cx-pw/2-S*0.012,cy-ph/2-S*0.012,pw+S*0.024,ph+S*0.05);g2.shadowBlur=0;
        try{g2.filter='grayscale(1) contrast(0.9) brightness(0.95)';}catch(e){}
        g2.drawImage(CH._pc,cx-pw/2,cy-ph/2,pw,ph*0.86);
        try{g2.filter='none';}catch(e){}
        g2.fillStyle='rgba(150,148,140,0.18)';g2.fillRect(cx-pw/2,cy-ph/2,pw,ph*0.86);
        g2.restore();});
      const a3=Math.min(1,Math.max(0,(t-4.4)/1.6));
      if(a3>0){g2.textAlign='center';g2.fillStyle='rgba(214,210,198,'+a3+')';
        g2.font='italic '+Math.round(S*0.030)+'px Cormorant Garamond, serif';
        g2.fillText(LANG==='ru'?'все трое — в одну секунду.':'all three, in a single second.',W/2,H*0.80);}
      if(t<9)requestAnimationFrame(d);
      else{ov.style.transition='opacity 1.4s';ov.style.opacity='0';
        setTimeout(()=>{run=false;ov.remove();after();},1500);}
    })(t0);
  }
  function chFinish(){
    CH.active=false;started=false;
    stopSfx('chrain');stopSfx('reka');stopSfx('thunder');stopSfx('zapkill');
    document.getElementById('chron').style.display='none';
    document.getElementById('c').style.display='none';
    chTrio(()=>chPlaque());
  }
  function chPlaque(){ // финальная плашка
    const ru=LANG==='ru',yr=new Date().getFullYear();
    const ov=document.createElement('div');
    ov.style.cssText='position:fixed;inset:0;z-index:66;background:#04040a;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;';
    const L=[ru?('Лагерь «Ласточка» закрыт с 1989 по '+yr+'.'):('Camp Swallow has been closed from 1989 to '+yr+'.'),
             ru?('Тридцать семь лет.'.replace('Тридцать семь',String(yr-1989))):(String(yr-1989)+' years.'),
             ru?'Все тринадцать коек так и стоят застеленными.':'All thirteen beds are still made.'];
    L.forEach((ln,i)=>{const d=document.createElement('div');
      d.style.cssText='font-family:Share Tech Mono;font-size:clamp(13px,1.7vw,17px);letter-spacing:0.16em;color:#a8a294;opacity:0;transition:opacity 1.4s;text-align:center;padding:0 8vw;';
      d.textContent=ln;ov.appendChild(d);
      setTimeout(()=>{d.style.opacity='1';if(AC)tone(180,'sine',0.5,0.05,140);},900+i*2600);});
    document.body.appendChild(ov);
    setTimeout(()=>{ov.style.transition='opacity 1.8s';ov.style.opacity='0';
      setTimeout(()=>{ov.remove();rollCredits();},1900);},11500);
  }
  function startChronicle(from){
    chInit();
    document.getElementById('chronAsk').style.display='none';
    ['start','tales','credits'].forEach(id=>{const e=document.getElementById(id);if(e)e.style.display='none';});
    document.getElementById('c').style.display='';
    document.getElementById('chron').style.display='block';
    stopMenuAmb();stopSfx('nature');stopSfx('acc');
    started=false;CH.active=true;
    chStartScene(from||0);
  }
  function askChronicle(){
    const ru=LANG==='ru';
    const ask=document.getElementById('chronAsk');
    document.getElementById('chronAskT').textContent=ru
      ?'хочешь знать, что с ними случилось?':'do you want to know what happened to them?';
    document.getElementById('chronYes').textContent=ru?'ДА':'YES';
    document.getElementById('chronNo').textContent=ru?'НЕТ, ХВАТИТ':'NO, ENOUGH';
    ask.style.display='flex';
    document.getElementById('chronYes').onclick=()=>startChronicle();
    document.getElementById('chronNo').onclick=()=>{ask.style.display='none';rollCredits();};
  }
  // пропуск — удерживать ESC
  addEventListener('keydown',e=>{if(CH.active&&e.code==='Escape'&&!CH._hold){CH._hold=setInterval(()=>{
    CH.skipT+=0.1;if(CH.skipT>1.6){clearInterval(CH._hold);CH._hold=null;CH.skipT=0;chFinish();}},100);}});
  addEventListener('keyup',e=>{if(e.code==='Escape'&&CH._hold){clearInterval(CH._hold);CH._hold=null;CH.skipT=0;}});
  document.getElementById('devChron')&&document.getElementById('devChron').addEventListener('click',()=>{
    document.getElementById('devPanel').style.display='none';
    const ov=document.createElement('div');
    ov.style.cssText='position:fixed;inset:0;z-index:93;background:rgba(5,6,10,0.97);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;';
    let h='<div style="font-family:Cormorant Garamond,serif;font-size:24px;color:#c9c3b2;margin-bottom:8px;">с какой сцены?</div>';
    CHRON.forEach((sc,i)=>{h+='<button data-i="'+i+'" style="font-family:Share Tech Mono;font-size:12px;letter-spacing:0.14em;padding:8px 22px;min-width:330px;background:transparent;border:1px solid rgba(200,195,178,0.35);color:#c9c3b2;cursor:pointer;">'+(i+1)+'. '+sc.time+'</button>';});
    h+='<button id="chClose" style="margin-top:10px;font-family:Share Tech Mono;font-size:12px;padding:7px 20px;background:transparent;border:1px solid rgba(224,32,32,0.5);color:#e02020;cursor:pointer;">ЗАКРЫТЬ</button>';
    ov.innerHTML=h;document.body.appendChild(ov);
    ov.querySelectorAll('button[data-i]').forEach(b2=>b2.onclick=()=>{ov.remove();startChronicle(+b2.dataset.i);});
    ov.querySelector('#chClose').onclick=()=>ov.remove();});

  // ======================================================
  //   С Ц Е Н Ы - И Д Е И  (превью, дев-меню → «идеи»)
  //   10 набросков + одна доведённая до ума.
  // ======================================================
  const IDEAS=[];
  const idea=(name,dur,fn)=>IDEAS.push({name,dur,fn});

  idea('Зеркало',9,(g,W,H,S,t)=>{ // набросок
    g.fillStyle='#07070b';g.fillRect(0,0,W,H);
    const drawMenu=(y,flip,al)=>{g.save();g.globalAlpha=al;g.translate(0,y);
      if(flip){g.scale(1,-1);g.translate(0,-H*0.5);}
      g.fillStyle='#c9c3b2';g.font='700 '+Math.round(S*0.05)+'px Cormorant Garamond, serif';
      g.textAlign='left';g.fillText('5 НОЧЕЙ В ЛАСТОЧКЕ',W*0.08,H*0.16);
      g.strokeStyle='rgba(200,195,178,0.5)';g.lineWidth=1.4;
      g.strokeRect(W*0.08,H*0.24,W*0.22,H*0.07);g.strokeRect(W*0.08,H*0.35,W*0.26,H*0.07);
      g.restore();};
    drawMenu(0,false,1);
    drawMenu(H*0.5,true,0.35+Math.sin(t*2)*0.08);
    if(t>4){g.fillStyle='rgba(224,32,32,'+Math.min(0.9,(t-4)*0.5)+')';
      g.font='700 '+Math.round(S*0.05)+'px Cormorant Garamond, serif';g.textAlign='left';
      g.save();g.translate(0,H*0.5);g.scale(1,-1);g.translate(0,-H*0.5);
      g.fillText('5 НОЧЕЙ С ТОБОЙ',W*0.08,H*0.16);g.restore();}});

  idea('Курсор',9,(g,W,H,S,t)=>{ // набросок
    g.fillStyle='#08080c';g.fillRect(0,0,W,H);
    const n=Math.min(40,1+Math.floor(t*5));
    for(let i=0;i<n;i++){const a=t*0.8+i*0.7,r=i*S*0.012;
      const x=W*0.5+Math.cos(a)*r,y=H*0.5+Math.sin(a)*r;
      g.fillStyle='rgba(230,226,214,'+(i?0.35:1)+')';
      g.beginPath();g.moveTo(x,y);g.lineTo(x,y+S*0.028);g.lineTo(x+S*0.008,y+S*0.021);
      g.lineTo(x+S*0.019,y+S*0.032);g.lineTo(x+S*0.024,y+S*0.028);g.lineTo(x+S*0.014,y+S*0.017);
      g.lineTo(x+S*0.021,y+S*0.014);g.closePath();g.fill();}
    g.fillStyle='rgba(150,146,136,0.7)';g.font='italic '+Math.round(S*0.03)+'px Cormorant Garamond, serif';
    g.textAlign='center';g.fillText('который из них твой?',W*0.5,H*0.86);});

  idea('Твоё имя',10,(g,W,H,S,t)=>{ // набросок
    g.fillStyle='#06060a';g.fillRect(0,0,W,H);
    const AB='АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ';
    const target='ТЫ';let out='';
    for(let i=0;i<8;i++){
      if(t>2+i*0.9)out+=(i<target.length?target[i]:' ');
      else out+=AB[(Math.random()*AB.length)|0];}
    g.fillStyle='rgba(224,32,32,0.9)';g.font='700 '+Math.round(S*0.09)+'px Share Tech Mono, monospace';
    g.textAlign='center';g.fillText(out,W*0.5,H*0.5);
    g.fillStyle='rgba(120,190,140,0.7)';g.font=Math.round(S*0.02)+'px Share Tech Mono, monospace';
    g.fillText('> подбор имени наблюдателя…',W*0.5,H*0.62);});

  idea('Распад',9,(g,W,H,S,t)=>{ // набросок
    g.fillStyle='#07070b';g.fillRect(0,0,W,H);
    g.fillStyle='#c9c3b2';g.font='700 '+Math.round(S*0.06)+'px Cormorant Garamond, serif';
    g.textAlign='center';
    if(t<1.5)g.fillText('5 НОЧЕЙ В ЛАСТОЧКЕ',W*0.5,H*0.4);
    else{const n=600;
      for(let i=0;i<n;i++){const px=W*0.18+((i*37)%(W*0.64));
        const fall=Math.max(0,(t-1.5-((i%50)*0.02)))*H*0.18;
        g.fillStyle='rgba(201,195,178,'+Math.max(0,0.8-(t-1.5)*0.2)+')';
        g.fillRect(px,H*0.4-8+fall,3,3);}}});

  idea('Двойник',9,(g,W,H,S,t)=>{ // набросок
    g.fillStyle='#05060a';g.fillRect(0,0,W,H);
    const sil=(cx,al)=>{g.fillStyle='rgba(0,0,0,'+al+')';
      g.beginPath();g.ellipse(cx,H*1.02,W*0.13,H*0.30,0,Math.PI,0);g.fill();
      g.beginPath();g.arc(cx,H*0.80,W*0.045,0,7);g.fill();};
    const gl=g.createRadialGradient(W*0.5,H*0.35,20,W*0.5,H*0.35,W*0.5);
    gl.addColorStop(0,'rgba(140,140,160,0.25)');gl.addColorStop(1,'rgba(0,0,0,0)');
    g.fillStyle=gl;g.fillRect(0,0,W,H);
    sil(W*0.42,1);
    if(t>3)sil(W*0.62,Math.min(1,(t-3)*0.6));
    if(t>6){g.fillStyle='rgba(224,32,32,'+Math.min(0.9,(t-6)*0.7)+')';
      g.font='italic '+Math.round(S*0.03)+'px Cormorant Garamond, serif';g.textAlign='center';
      g.fillText('он сидит здесь дольше тебя',W*0.5,H*0.62);}});

  idea('Годы назад',9,(g,W,H,S,t)=>{ // набросок
    g.fillStyle='#07070b';g.fillRect(0,0,W,H);
    const y=Math.max(1989,Math.round(2026-(t*4.2)*(2026-1989)/9));
    g.fillStyle=y<=1989?'rgba(224,32,32,0.95)':'rgba(201,195,178,0.9)';
    g.font='700 '+Math.round(S*0.14)+'px Share Tech Mono, monospace';g.textAlign='center';
    g.fillText(String(y),W*0.5,H*0.52);
    if(y<=1989){g.fillStyle='rgba(150,146,136,0.8)';
      g.font='italic '+Math.round(S*0.028)+'px Cormorant Garamond, serif';
      g.fillText('дальше отматывать некуда',W*0.5,H*0.66);}});

  idea('Плёнка горит',9,(g,W,H,S,t)=>{ // набросок
    g.fillStyle='#0a0908';g.fillRect(0,0,W,H);
    g.fillStyle='#14120f';g.fillRect(0,H*0.18,W,H*0.64);
    g.fillStyle='#0a0908';
    for(let x=10;x<W;x+=54){g.fillRect(x,H*0.20,26,14);g.fillRect(x,H*0.76,26,14);}
    const burn=Math.max(0,(t-1.5))*W*0.16;
    if(burn>0){g.save();
      const grd=g.createRadialGradient(W*0.5,H*0.5,burn*0.5,W*0.5,H*0.5,burn);
      grd.addColorStop(0,'rgba(0,0,0,1)');grd.addColorStop(0.7,'rgba(180,60,20,0.9)');
      grd.addColorStop(1,'rgba(255,180,60,0)');
      g.fillStyle=grd;g.beginPath();g.arc(W*0.5,H*0.5,burn,0,7);g.fill();g.restore();}
    g.fillStyle='rgba(150,146,136,0.6)';g.font='italic '+Math.round(S*0.026)+'px Cormorant Garamond, serif';
    g.textAlign='center';g.fillText('плёнку смены 1989 никто не проявлял',W*0.5,H*0.92);});

  idea('Файлы',10,(g,W,H,S,t)=>{ // набросок
    g.fillStyle='#06070a';g.fillRect(0,0,W,H);
    const F=['index.html','app.js','data.js','scream1.mp3','scream2.mp3','krank.mp3','1989.log','roman.txt'];
    g.textAlign='left';g.font=Math.round(S*0.022)+'px Share Tech Mono, monospace';
    F.forEach((f,i)=>{if(t<0.4+i*0.7)return;
      const last=(i===F.length-1);
      g.fillStyle=last?'rgba(224,32,32,0.95)':'rgba(120,190,140,0.8)';
      g.fillText((last?'> ':'  ')+f,W*0.28,H*0.22+i*S*0.05);});
    if(t>6.4){g.fillStyle='rgba(224,32,32,0.9)';g.textAlign='center';
      g.font='italic '+Math.round(S*0.028)+'px Cormorant Garamond, serif';
      g.fillText('этот файл появился сегодня',W*0.5,H*0.88);}});

  idea('Дверь в меню',10,(g,W,H,S,t)=>{ // набросок
    g.fillStyle='#07070b';g.fillRect(0,0,W,H);
    const op=Math.min(1,t/6);
    g.fillStyle='#14100c';g.fillRect(W*0.62,H*0.18,W*0.24,H*0.64);
    g.save();g.translate(W*0.62,H*0.18);
    g.transform(1,0,-op*0.5,1,0,0);
    g.fillStyle='#241c14';g.fillRect(0,0,W*0.24,H*0.64);
    g.restore();
    const glow=g.createLinearGradient(W*0.62,0,W*0.86,0);
    glow.addColorStop(0,'rgba(224,32,32,'+op*0.5+')');glow.addColorStop(1,'rgba(224,32,32,0)');
    g.fillStyle=glow;g.fillRect(W*0.62,H*0.18,W*0.24,H*0.64);
    g.fillStyle='rgba(200,195,178,0.75)';g.font=Math.round(S*0.024)+'px Share Tech Mono, monospace';
    g.textAlign='center';g.fillText(op<1?'ЗАЖМИ МЫШЬ':'ты не держал',W*0.5,H*0.9);});

  idea('Морзе',10,(g,W,H,S,t)=>{ // набросок
    g.fillStyle='#06060a';g.fillRect(0,0,W,H);
    const pat=[1,1,1,0,1,0,1,1,0,1];
    const i=Math.floor(t*1.6)%pat.length;
    if(pat[i]){g.fillStyle='rgba(230,226,214,0.9)';
      g.beginPath();g.arc(W*0.5,H*0.42,S*0.05,0,7);g.fill();}
    g.fillStyle='rgba(150,146,136,0.8)';g.font=Math.round(S*0.03)+'px Share Tech Mono, monospace';
    g.textAlign='center';
    g.fillText(pat.slice(0,i+1).map(v=>v?'—':'·').join(' '),W*0.5,H*0.62);
    if(t>6){g.fillStyle='rgba(224,32,32,0.9)';
      g.font='italic '+Math.round(S*0.03)+'px Cormorant Garamond, serif';
      g.fillText('«о т к р о й»',W*0.5,H*0.76);}});

  // ============ ДОВЕДЁННАЯ ДО УМА: ГРОЗА 1989 ============
  idea('★ ГРОЗА 1989',26,(g,W,H,S,t,st8)=>{
    if(!st8.rain){st8.rain=[];for(let i=0;i<420;i++)
      st8.rain.push({x:Math.random(),y:Math.random(),v:0.55+Math.random()*0.8,l:0.02+Math.random()*0.05,w:Math.random()<0.25?2:1});
      st8.flash=0;st8.next=1.4;st8.win=[1,1,1,1,1,1,1,1];st8.off=0;st8.pole=1;}
    // небо
    const sky=g.createLinearGradient(0,0,0,H);
    sky.addColorStop(0,'#0a0d16');sky.addColorStop(0.55,'#131a26');sky.addColorStop(1,'#080a0e');
    g.fillStyle=sky;g.fillRect(0,0,W,H);
    // молнии по расписанию
    st8.next-=0.016;
    if(st8.next<=0){st8.next=1.2+Math.random()*2.6;st8.flash=1;
      if(AC){noise(0.5,0.10,900);setTimeout(()=>{if(AC){noise(1.4,0.16,150);tone(48,'sine',1.8,0.14,40);}},220+Math.random()*400);}
      if(t>9&&st8.off<8){st8.off++;st8.win[8-st8.off]=0;}      // окна гаснут одно за другим
      if(t>15&&st8.pole)st8.pole=0;}                            // и человек со столба исчезает
    st8.flash=Math.max(0,st8.flash-0.055);
    if(st8.flash>0){g.fillStyle='rgba(200,215,255,'+(st8.flash*0.55)+')';g.fillRect(0,0,W,H);
      // разряд
      g.strokeStyle='rgba(235,242,255,'+st8.flash+')';g.lineWidth=2+st8.flash*2;
      g.beginPath();let lx=W*(0.2+Math.random()*0.6),ly=0;g.moveTo(lx,ly);
      while(ly<H*0.5){lx+=(Math.random()-0.5)*W*0.09;ly+=H*0.06;g.lineTo(lx,ly);}
      g.stroke();}
    // дальний лес
    g.fillStyle='rgba(8,12,10,0.95)';
    for(let i=0;i<40;i++){const bx=W*(i/40)+Math.sin(i)*8,hh=H*(0.16+((i*7)%5)*0.02);
      g.beginPath();g.moveTo(bx-16,H*0.72);g.lineTo(bx,H*0.72-hh);g.lineTo(bx+16,H*0.72);g.closePath();g.fill();}
    // корпуса с окнами
    for(let i=0;i<4;i++){const bx=W*(0.10+i*0.22),bw=W*0.15,bh=H*0.17,by=H*0.72-bh;
      g.fillStyle='#0d1014';g.fillRect(bx,by,bw,bh);
      g.fillStyle='#0a0c0f';g.beginPath();g.moveTo(bx-8,by);g.lineTo(bx+bw/2,by-H*0.05);g.lineTo(bx+bw+8,by);g.closePath();g.fill();
      for(let k=0;k<2;k++){const on=st8.win[i*2+k];
        g.fillStyle=on?'rgba(255,196,110,'+(0.75+Math.sin(t*7+i)*0.08)+')':'rgba(20,24,30,0.9)';
        g.fillRect(bx+bw*(0.18+k*0.42),by+bh*0.32,bw*0.22,bh*0.3);}}
    // столб и электрик
    const px=W*0.80;
    g.strokeStyle='#0b0d10';g.lineWidth=W*0.008;
    g.beginPath();g.moveTo(px,H*0.72);g.lineTo(px,H*0.30);g.stroke();
    g.lineWidth=W*0.005;g.beginPath();g.moveTo(px-W*0.035,H*0.34);g.lineTo(px+W*0.035,H*0.34);g.stroke();
    g.strokeStyle='rgba(10,12,16,0.9)';g.lineWidth=1.6;
    g.beginPath();g.moveTo(0,H*0.30);g.quadraticCurveTo(W*0.4,H*0.38,px,H*0.34);g.stroke();
    if(st8.pole){g.fillStyle='#05060a';
      g.beginPath();g.ellipse(px+W*0.012,H*0.40,W*0.012,H*0.030,0.2,0,7);g.fill();
      g.beginPath();g.arc(px+W*0.012,H*0.365,W*0.010,0,7);g.fill();}
    // дождь
    st8.rain.forEach(r=>{r.y+=r.v*0.016;r.x-=0.0025;
      if(r.y>1){r.y=-0.05;r.x=Math.random();}
      g.strokeStyle='rgba(180,200,230,'+(0.18+r.w*0.12)+')';g.lineWidth=r.w;
      g.beginPath();g.moveTo(r.x*W,r.y*H);g.lineTo(r.x*W-6,(r.y+r.l)*H);g.stroke();});
    // лужи-блики на земле
    g.fillStyle='rgba(120,150,190,0.05)';g.fillRect(0,H*0.72,W,H*0.28);
    for(let i=0;i<7;i++){g.fillStyle='rgba(160,190,230,'+(0.05+st8.flash*0.25)+')';
      g.beginPath();g.ellipse(W*(0.08+i*0.14),H*(0.80+((i*3)%4)*0.04),W*0.05,H*0.008,0,0,7);g.fill();}
    // текст
    const LN=[[2.0,'Гроза началась в половине двенадцатого.'],
              [7.0,'Свет мигнул трижды и погас во всём лагере.'],
              [12.5,'Электрик полез на столб один — ждать бригаду было некогда.'],
              [18.0,'Больше на столб никто не поднимался.'],
              [22.0,'Три ночи темноты. Смена так и не дожила до подъёма.']];
    LN.forEach(l=>{const al=Math.min(1,Math.max(0,(t-l[0])/1.0))*Math.min(1,Math.max(0,(l[0]+4.4-t)/1.0));
      if(al<=0)return;
      g.textAlign='center';g.font='italic '+Math.round(S*0.032)+'px Cormorant Garamond, serif';
      const tw=g.measureText(l[1]).width;
      g.fillStyle='rgba(3,4,7,'+al*0.75+')';g.fillRect(W*0.5-tw/2-24,H*0.90-S*0.04,tw+48,S*0.06);
      g.fillStyle='rgba(226,222,210,'+al+')';g.fillText(l[1],W*0.5,H*0.90);});
  });

  function playIdea(n){
    const it=IDEAS[n];if(!it)return;
    const ov=document.createElement('div');
    ov.style.cssText='position:fixed;inset:0;z-index:92;background:#000;cursor:pointer;';
    ov.innerHTML='<canvas style="position:absolute;inset:0;width:100%;height:100%;"></canvas>'+
      '<div style="position:absolute;top:14px;left:0;right:0;text-align:center;font-family:Share Tech Mono;font-size:11px;letter-spacing:0.25em;color:rgba(200,195,178,0.45);pointer-events:none;">'+
      it.name.toUpperCase()+' &nbsp;·&nbsp; клик — закрыть</div>';
    document.body.appendChild(ov);
    const cv=ov.querySelector('canvas'),g=cv.getContext('2d');
    const t0=performance.now();let run=true;const st8={};
    (function loop(nw){if(!run)return;
      const W=cv.width=innerWidth,H=cv.height=innerHeight,S=Math.min(W,H);
      const t=(nw-t0)/1000;
      try{it.fn(g,W,H,S,t%it.dur,st8);}catch(e){}
      requestAnimationFrame(loop);})(t0);
    ov.onclick=()=>{run=false;ov.remove();};
  }
  function openIdeas(){
    const ov=document.createElement('div');
    ov.style.cssText='position:fixed;inset:0;z-index:91;background:rgba(5,6,10,0.97);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;';
    let html='<div style="font-family:Cormorant Garamond,serif;font-size:26px;color:#c9c3b2;margin-bottom:10px;">сцены-идеи</div>';
    IDEAS.forEach((it,i)=>{html+='<button data-i="'+i+'" style="font-family:Share Tech Mono;font-size:13px;letter-spacing:0.18em;padding:9px 26px;min-width:280px;background:transparent;border:1px solid '+(it.name[0]==='★'?'rgba(240,217,74,0.6);color:#f0d94a':'rgba(200,195,178,0.35);color:#c9c3b2')+';cursor:pointer;">'+it.name+'</button>';});
    html+='<button id="ideasClose" style="margin-top:14px;font-family:Share Tech Mono;font-size:12px;padding:8px 22px;background:transparent;border:1px solid rgba(224,32,32,0.5);color:#e02020;cursor:pointer;">ЗАКРЫТЬ</button>';
    ov.innerHTML=html;document.body.appendChild(ov);
    ov.querySelectorAll('button[data-i]').forEach(b=>b.onclick=()=>playIdea(+b.dataset.i));
    ov.querySelector('#ideasClose').onclick=()=>ov.remove();
  }
  document.getElementById('devIdeas')&&document.getElementById('devIdeas').addEventListener('click',openIdeas);

  // ---- пять красных звёзд: нужно прокликать все ----
  const STARCLICK={got:new Set()};
  function starClick(i,el){
    if(STARCLICK.got.has(i))return;
    STARCLICK.got.add(i);
    el.style.color='#fff';el.style.textShadow='0 0 30px #fff,0 0 80px rgba(255,255,255,0.6)';
    el.style.animation='none';
    if(AC)tone(420+STARCLICK.got.size*140,'sine',0.6,0.12,300);
    if(STARCLICK.got.size>=5){
      document.querySelectorAll('.starOne').forEach(sp=>{sp.style.transition='.9s';
        sp.style.color='#e02020';sp.style.textShadow='0 0 46px #e02020,0 0 120px rgba(224,32,32,0.8)';});
      setTimeout(()=>{onAllStarsClicked();},900);
    }
  }
  // ==========================================================
  //   Ф И Н А Л :  «ТЫ ТОЖЕ ЗДЕСЬ»
  //   Игра осознаёт наблюдателя. В конце камера отъезжает
  //   от монитора, на котором — это самое меню.
  // ==========================================================
  function onAllStarsClicked(){
    started=false;dead=false;won=false;clearActive();
    stopMenuAmb();stopSfx('nature');stopSfx('gm');stopSfx('acc');
    ['gallery','galView','tales','inter','cert','customPanel','settings','arch'].forEach(id=>{
      const e=document.getElementById(id);if(e)e.style.display='none';});
    showScreen('start');
    window.__trapMode=true;
    const st=document.getElementById('start');
    if(st){st.style.transform='';st.style.transformOrigin='center center';
      st.style.zIndex='97';st.style.pointerEvents='none';}
    const ov=document.createElement('div');ov.id='trapOv';
    ov.style.cssText='position:fixed;inset:0;z-index:98;overflow:hidden;cursor:none;pointer-events:none;';
    ov.innerHTML='<canvas id="trapCv" style="position:absolute;inset:0;width:100%;height:100%;"></canvas>';
    document.body.appendChild(ov);
    const cv=ov.querySelector('#trapCv'),g=cv.getContext('2d');
    const ru=LANG==='ru';
    const bStart=document.getElementById('startBtn'),bSet=document.getElementById('openSettings');
    const oldStart=bStart?bStart.textContent:'',oldSet=bSet?bSet.textContent:'';
    const oldTitle=document.title;
    let hum=null;
    if(AC){try{hum=AC.createGain();hum.gain.value=0;hum.connect(MG);
      const o=AC.createOscillator();o.type='sawtooth';o.frequency.value=41;
      const lp=AC.createBiquadFilter();lp.type='lowpass';lp.frequency.value=120;
      o.connect(lp);lp.connect(hum);o.start();hum._o=o;
      hum.gain.linearRampToValueAtTime(0.12,AC.currentTime+3);}catch(e){}}
    const beep=(f,d,v)=>{if(AC)tone(f,'square',d||0.06,v||0.05,f);};
    const NAMES=['Ильдар К.','Лёша П.','Марина С.','Гриша Н.','Оля В.','Толя Д.',
                 'Света Р.','Костя М.','Ира Б.','Женя Ф.','Саша Т.','Илья К.'];
    const t0=performance.now();
    let W=0,H=0,S=0;
    function tint(a){g.fillStyle='rgba(0,0,0,'+a+')';g.fillRect(0,0,W,H);}
    function panel(x,y,w2,h2,a){g.fillStyle='rgba(5,6,9,'+(a===undefined?0.88:a)+')';g.fillRect(x,y,w2,h2);
      g.strokeStyle='rgba(70,74,84,0.35)';g.lineWidth=1;g.strokeRect(x,y,w2,h2);}
    function say(lines,lt,start,step,y){
      lines.forEach((ln,i)=>{const at=start+i*step,
        al=Math.min(1,Math.max(0,(lt-at)/0.8))*Math.min(1,Math.max(0,(at+step-0.4-lt)/0.7));
        if(al<=0)return;
        const yy=y||H*0.84;
        g.font='italic '+Math.round(S*0.034)+'px Cormorant Garamond, serif';
        const tw=g.measureText(ln).width;
        g.fillStyle='rgba(4,4,7,'+al*0.8+')';g.fillRect(W*0.5-tw/2-26,yy-S*0.042,tw+52,S*0.062);
        g.fillStyle='rgba(232,228,216,'+al+')';g.textAlign='center';g.fillText(ln,W*0.5,yy);});
    }
    function scan(){for(let i=0;i<20;i++){const yy=Math.random()*H;
      g.fillStyle='rgba(201,195,178,'+(Math.random()*0.045)+')';g.fillRect(0,yy,W,Math.random()*2.2);}}
    const d0=new Date();
    const RES=innerWidth+'×'+innerHeight;
    const TZ=(()=>{try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'—';}catch(e){return '—';}})();
    const NAV=(navigator.language||'—');
    const HH=String(d0.getHours()).padStart(2,'0')+':'+String(d0.getMinutes()).padStart(2,'0');
    const DATE=String(d0.getDate()).padStart(2,'0')+'.'+String(d0.getMonth()+1).padStart(2,'0')+'.'+d0.getFullYear();
    const NEWTITLE=ru?'5 НОЧЕЙ С ТОБОЙ':'5 NIGHTS WITH YOU';

    const PH=[];const add=(dur,fn)=>PH.push({dur,fn});

    // 1 — меню глючит
    add(12,(lt)=>{tint(Math.min(0.35,lt/5));scan();
      if(Math.random()<0.05){g.fillStyle='rgba(139,14,14,0.08)';g.fillRect(0,0,W,H);}
      say(ru?['ты собрал все звёзды.','ни один из них не собирал.','они просто жили здесь. а ты — приходил.']
            :['you collected every star.','none of them ever did.','they lived here. you came and went.'],lt,1.4,3.4);});

    // 2 — переименовываются НАСТОЯЩИЕ кнопки
    add(10,(lt)=>{tint(0.42);scan();
      if(lt>1.2&&!ov._r1){ov._r1=true;beep(190,0.25,0.08);
        if(bStart){bStart.textContent=ru?'ОСТАТЬСЯ':'STAY';bStart.style.color='#e02020';bStart.style.borderColor='rgba(224,32,32,0.7)';}}
      if(lt>3.4&&!ov._r2){ov._r2=true;beep(160,0.25,0.08);
        if(bSet){bSet.textContent=ru?'НАСТРОЕК БОЛЬШЕ НЕТ':'NO SETTINGS LEFT';bSet.style.color='#e02020';bSet.style.borderColor='rgba(224,32,32,0.7)';}}
      say(ru?['кнопки больше ничего не значат.','ты уже внутри.']
            :['the buttons mean nothing now.','you are already inside.'],lt,5.2,3.0);});

    // 3 — журнал на подложке
    add(12,(lt)=>{tint(0.55);
      const logs=ru?['сессия активна','наблюдатель: обнаружен','идентификация…','имя не найдено','присвоено: ГОСТЬ №13']
                   :['session active','observer: detected','identifying…','name not found','assigned: GUEST #13'];
      const px=W*0.05,py=H*0.07,pw=Math.min(W*0.52,S*0.9),ph=logs.length*S*0.032+S*0.04;
      panel(px-S*0.02,py-S*0.03,pw,ph);
      g.textAlign='left';g.font=Math.round(S*0.018)+'px Share Tech Mono, monospace';
      logs.forEach((l2,i)=>{const at=0.5+i*1.2;if(lt<at)return;
        g.fillStyle='rgba(120,190,140,'+Math.min(0.85,(lt-at)*2)+')';
        g.fillText('> '+l2,px,py+i*S*0.032);});
      g.textAlign='center';
      say(ru?['мы считали тебя гостем.','гость уходит в шесть утра.','ты возвращался. по своей воле.']
            :['we took you for a guest.','a guest leaves at six.','you came back. willingly.'],lt,3.2,3.0);});

    // 4 — монтаж
    add(13,(lt)=>{tint(0.6);
      const cut=Math.floor(lt/1.15)%7;
      g.save();g.translate(W*0.5,H*0.42);const sc=1+Math.sin(lt*9)*0.01;g.scale(sc,sc);
      g.strokeStyle='rgba(150,175,195,0.5)';g.lineWidth=1.4;g.fillStyle='rgba(150,175,195,0.10)';
      if(cut===0){g.strokeRect(-W*0.16,-H*0.10,W*0.32,H*0.20);g.strokeRect(-W*0.12,-H*0.03,W*0.10,H*0.07);}
      else if(cut===1){for(let i=0;i<9;i++){g.beginPath();g.moveTo(-W*0.2+i*W*0.05,H*0.12);g.lineTo(-W*0.2+i*W*0.05,-H*0.12);g.stroke();}}
      else if(cut===2){g.beginPath();g.arc(0,0,S*0.09,0,7);g.stroke();
        g.beginPath();g.arc(-S*0.03,-S*0.02,S*0.012,0,7);g.fill();
        g.beginPath();g.arc(S*0.03,-S*0.02,S*0.012,0,7);g.fill();}
      else if(cut===3){g.beginPath();g.moveTo(-W*0.18,H*0.10);g.lineTo(0,-H*0.10);g.lineTo(W*0.18,H*0.10);g.stroke();}
      else if(cut===4){[-1,1].forEach(sn=>{g.strokeRect(sn*W*0.10-W*0.012,-H*0.12,W*0.024,H*0.24);});
        g.strokeRect(-W*0.12,-H*0.14,W*0.24,W*0.012);}
      else if(cut===5){g.strokeRect(-W*0.10,-H*0.12,W*0.20,H*0.24);
        for(let i=1;i<5;i++){g.beginPath();g.moveTo(-W*0.10,-H*0.12+i*H*0.048);g.lineTo(W*0.10,-H*0.12+i*H*0.048);g.stroke();}}
      else {g.beginPath();g.arc(0,0,S*0.10,0,7);g.stroke();
        g.fillStyle='rgba(224,32,32,0.5)';g.beginPath();g.arc(0,0,S*0.03,0,7);g.fill();}
      g.restore();
      if(Math.floor(lt/1.15)!==ov._lastCut){ov._lastCut=Math.floor(lt/1.15);beep(300+Math.random()*500,0.04,0.05);}
      say(ru?['мы всё сохранили.','каждую твою ночь.','каждую твою ошибку.','каждый раз, когда ты начинал заново.']
            :['we kept everything.','every night of yours.','every mistake.','every time you started over.'],lt,1.0,3.0,H*0.86);});

    // 5 — счётчики
    add(11,(lt)=>{tint(0.66);
      const secs=Math.floor(performance.now()/1000);
      const rows=ru?[['ночей пройдено',nightsBeaten],['звёзд собрано',5],['секунд в системе',secs],['кликов сделано',clickCount]]
                   :[['nights cleared',nightsBeaten],['stars collected',5],['seconds inside',secs],['clicks made',clickCount]];
      panel(W*0.20,H*0.24,W*0.60,S*0.30);
      g.textAlign='left';
      rows.forEach((r,i)=>{const at=0.6+i*1.4;if(lt<at)return;
        const pr=Math.min(1,(lt-at)/1.0);
        g.fillStyle='rgba(150,146,136,'+Math.min(1,pr*2)+')';
        g.font=Math.round(S*0.022)+'px Share Tech Mono, monospace';
        g.fillText(r[0],W*0.24,H*0.30+i*S*0.06);
        g.fillStyle='rgba(224,190,80,'+Math.min(1,pr*2)+')';g.textAlign='right';
        g.fillText(String(pr<1?Math.floor(r[1]*Math.random()*pr+r[1]*pr*0.5):r[1]),W*0.76,H*0.30+i*S*0.06);
        g.textAlign='left';});
      g.textAlign='center';
      say(ru?['мы считали. всегда считали.']:['we counted. we always counted.'],lt,7.0,3.6);});

    // 6 — список
    add(14,(lt)=>{tint(0.76);
      g.font=Math.round(S*0.025)+'px Cormorant Garamond, serif';g.textAlign='right';
      NAMES.forEach((nm,i)=>{const at=0.3+i*0.4,al=Math.min(1,Math.max(0,(lt-at)/0.35));
        if(al<=0)return;g.fillStyle='rgba(150,146,136,'+al*0.85+')';
        g.fillText((i+1)+'.  '+nm,W*0.5,H*0.16+i*S*0.04);});
      if(lt>5.6){const al=Math.min(1,(lt-5.6)/1.0),bl=(Math.sin(lt*7)>0)?1:0.35;
        g.fillStyle='rgba(224,32,32,'+al+')';g.fillText('13.  ',W*0.5,H*0.16+12*S*0.04);
        g.textAlign='left';g.fillStyle='rgba(224,32,32,'+al*bl+')';
        g.fillText(ru?'ТЫ':'YOU',W*0.5,H*0.16+12*S*0.04);
        g.font=Math.round(S*0.017)+'px Share Tech Mono, monospace';
        g.fillStyle='rgba(180,60,60,'+al*0.8+')';
        g.fillText((ru?'в системе с ':'in system since ')+DATE,W*0.5,H*0.16+12*S*0.04+S*0.028);
        g.textAlign='center';
        if(!ov._b6){ov._b6=true;beep(140,0.6,0.12);}}
      say(ru?['тринадцатая строка пустовала тридцать семь лет.']:['the thirteenth line was empty for thirty-seven years.'],lt,9.0,4.4,H*0.92);});

    // 7 — прощания
    add(16,(lt)=>{tint(0.72);
      const who=ru?[['Пал Палыч','свет я так и не дал. прости.'],
                    ['те, у окна','мы дошли. спасибо, что стучал в ответ.'],
                    ['рой','я больше не голоден.'],
                    ['Ильдар','можно я посплю? ты подежуришь.'],
                    ['младший','дядя, тут не страшно. правда.'],
                    ['вожатый','отряд в сборе. все тринадцать.']]
                  :[['Pal Palych','I never fixed the lights. forgive me.'],
                    ['the ones at the window','we made it. thanks for knocking back.'],
                    ['the swarm','I am not hungry anymore.'],
                    ['Ildar','may I sleep? you keep watch.'],
                    ['the youngest','mister, it is not scary here. really.'],
                    ['the counselor','squad assembled. all thirteen.']];
      const i=Math.min(who.length-1,Math.floor(lt/2.6));
      const lt2=lt-i*2.6, al=Math.min(1,lt2/0.5)*Math.min(1,Math.max(0,(2.4-lt2)/0.5));
      if(al>0){g.fillStyle='rgba(150,146,136,'+al*0.8+')';
        g.font=Math.round(S*0.019)+'px Share Tech Mono, monospace';
        g.fillText(who[i][0].toUpperCase(),W*0.5,H*0.42);
        g.fillStyle='rgba(232,228,216,'+al+')';
        g.font='italic '+Math.round(S*0.036)+'px Cormorant Garamond, serif';
        g.fillText(who[i][1],W*0.5,H*0.52);}
      if(Math.floor(lt/2.6)!==ov._lastWho){ov._lastWho=Math.floor(lt/2.6);beep(680,0.12,0.05);}});

    // 8 — крик
    add(6,(lt)=>{
      tint(Math.min(0.95,lt*1.6));
      if(lt<0.1&&!ov._scr){ov._scr=true;
        if(AC){tone(70,'sawtooth',1.6,0.18,60);noise(1.2,0.16,300);}}
      const puls=1+Math.sin(lt*16)*0.05;
      const al=Math.min(1,lt/0.35)*Math.min(1,Math.max(0,(5.4-lt)/1.0));
      g.save();g.translate(W*0.5,H*0.5);g.scale(puls,puls);
      g.fillStyle='rgba(224,20,20,'+al+')';
      g.shadowColor='#e01414';g.shadowBlur=70*al;
      g.font='700 '+Math.round(S*0.11)+'px Cormorant Garamond, serif';g.textAlign='center';
      g.fillText(ru?'ИХ ВСЕХ НЕТ':'THEY ARE ALL GONE',(Math.random()-0.5)*7,S*0.035);
      g.restore();g.shadowBlur=0;
      for(let i=0;i<10;i++){g.fillStyle='rgba(139,14,14,'+(Math.random()*0.14*al)+')';
        g.fillRect(0,Math.random()*H,W,2+Math.random()*26);}});

    // 9 — окна выхода: сотни, «НЕТ» по центру, гаснут от клика
    add(16,(lt)=>{tint(0.66);
      if(!ov._wins){ov._wins=[];
        ov.style.pointerEvents='auto';ov.style.cursor='pointer';
        ov._hit=(ev)=>{const bw=S*0.21,bh=S*0.095;
          for(let i=ov._wins.length-1;i>=0;i--){const o=ov._wins[i];
            const px=W*o.x,py=H*o.y;
            if(ev.clientX>px&&ev.clientX<px+bw&&ev.clientY>py&&ev.clientY<py+bh){
              ov._wins.splice(i,1);beep(1200,0.05,0.05);
              // на месте закрытого немедленно открываются два новых
              for(let k=0;k<2;k++)ov._wins.push({x:0.02+Math.random()*0.76,y:0.04+Math.random()*0.80,r:(Math.random()-0.5)*7});
              return;}}};
        ov.addEventListener('pointerdown',ov._hit);}
      const need=Math.min(260,Math.floor(lt*22));
      while(ov._wins.length<need){
        ov._wins.push({x:0.02+Math.random()*0.76,y:0.04+Math.random()*0.80,r:(Math.random()-0.5)*7});
        if(Math.random()<0.25)beep(900+Math.random()*600,0.02,0.03);}
      const bw=S*0.21,bh=S*0.095;
      ov._wins.forEach(o=>{const px=W*o.x,py=H*o.y;
        g.save();g.translate(px,py);g.rotate(o.r*Math.PI/180);
        g.fillStyle='rgba(12,14,20,0.97)';g.fillRect(0,0,bw,bh);
        g.strokeStyle='rgba(201,195,178,0.4)';g.lineWidth=1;g.strokeRect(0,0,bw,bh);
        g.fillStyle='#c9c3b2';g.font=Math.round(S*0.014)+'px Share Tech Mono, monospace';
        g.textAlign='center';
        g.fillText(ru?'выйти из игры?':'quit the game?',bw*0.5,bh*0.34);
        g.strokeStyle='rgba(224,32,32,0.75)';g.strokeRect(bw*0.5-bw*0.16,bh*0.52,bw*0.32,bh*0.32);
        g.fillStyle='rgba(224,32,32,0.9)';g.fillText(ru?'НЕТ':'NO',bw*0.5,bh*0.75);
        g.restore();});
      g.textAlign='center';
      say(ru?['закрывай сколько хочешь.','кнопки «да» здесь никогда не было.','но ты дочитаешь. ты всегда дочитываешь.']
            :['close as many as you like.','the "yes" was never here.','but you will read to the end.'],lt,4.0,3.8,H*0.95);
      if(lt>15.4&&ov._hit){ov.removeEventListener('pointerdown',ov._hit);ov._hit=null;
        ov.style.pointerEvents='none';ov.style.cursor='none';}});

    // 10 — игра читает тебя
    add(20,(lt)=>{tint(0.82);
      const mins=Math.floor(performance.now()/60000);
      const days=ru?['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота']
                   :['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      const rows=[
        [ru?'экран':'screen',RES+' · '+screen.colorDepth+'bit'],
        [ru?'система':'system',osName()],
        [ru?'браузер':'browser',browserName()],
        [ru?'видеокарта':'graphics',gpuName()],
        [ru?'ядер процессора':'cpu cores',String(navigator.hardwareConcurrency||'—')],
        [ru?'память устройства':'device memory',(navigator.deviceMemory?navigator.deviceMemory+' GB':'—')],
        [ru?'язык':'language',NAV],
        [ru?'часовой пояс':'time zone',TZ],
        [ru?'сегодня':'today',days[d0.getDay()]+', '+DATE],
        [ru?'у тебя сейчас':'your local time',HH],
        [ru?'вкладка открыта':'tab open for',mins+(ru?' мин':' min')],
        [ru?'ты уходил из вкладки':'you left the tab',tabHides+(ru?' раз':' times')]
      ];
      panel(W*0.16,H*0.10,W*0.68,S*0.72);
      g.textAlign='left';
      rows.forEach((r,i)=>{const at=0.4+i*0.85;if(lt<at)return;
        const al=Math.min(1,(lt-at)/0.5);
        g.fillStyle='rgba(150,146,136,'+al*0.85+')';
        g.font=Math.round(S*0.019)+'px Share Tech Mono, monospace';
        g.fillText(r[0],W*0.19,H*0.155+i*S*0.055);
        g.fillStyle='rgba(224,32,32,'+al+')';g.textAlign='right';
        g.fillText(String(r[1]),W*0.81,H*0.155+i*S*0.055);g.textAlign='left';});
      g.textAlign='center';
      say(ru?['мы видим не только эту комнату.','мы видим ту, в которой сидишь ты.','и знаем, сколько раз ты пробовал уйти.']
            :['we see more than this room.','we see the one you are sitting in.','and we know how often you tried to leave.'],lt,11.4,2.8,H*0.94);});

    // 11 — имя игры сходит с ума и меняется навсегда
    add(16,(lt)=>{
      // ХАОС: меню полностью скрыто за помехами
      g.fillStyle='#000';g.fillRect(0,0,W,H);
      for(let i=0;i<70;i++){const yy=Math.random()*H,hh=2+Math.random()*22;
        const v=(Math.random()*70)|0;
        g.fillStyle='rgb('+(v+Math.random()*40)+','+v+','+(v+Math.random()*20)+')';
        g.globalAlpha=0.5+Math.random()*0.5;g.fillRect((Math.random()-0.5)*W*0.4,yy,W,hh);}
      g.globalAlpha=1;
      for(let i=0;i<9;i++){g.fillStyle='rgba(139,14,14,'+(Math.random()*0.35)+')';
        g.fillRect(Math.random()*W,0,4+Math.random()*70,H);}
      for(let i=0;i<450;i++){const v=(Math.random()*255)|0;
        g.fillStyle='rgba('+v+','+v+','+v+',0.5)';
        g.fillRect(Math.random()*W,Math.random()*H,2,2);}
      if(Math.random()<0.22){g.fillStyle='rgba(255,255,255,0.10)';g.fillRect(0,0,W,H);}
      const base=ru?'5 НОЧЕЙ В ЛАСТОЧКЕ':'5 NIGHTS AT SWALLOW';
      let tgt=NEWTITLE;while(tgt.length<base.length)tgt+=' ';
      const pr=Math.min(1,lt/9);
      const junk='#@%&$*ЖЩЪЫЬЭЮЯ8§±10';
      let out='';
      for(let i=0;i<base.length;i++){
        if(i/base.length<pr)out+=tgt[i];
        else out+=(Math.random()<0.30?junk[(Math.random()*junk.length)|0]:base[i]);}
      // вкладка сходит с ума вместе с названием
      if(lt<10.4){if(!ov._ttl||performance.now()-ov._ttl>110){ov._ttl=performance.now();
        let j='';for(let i=0;i<base.length;i++)
          j+=(Math.random()<pr?tgt[i]:(Math.random()<0.35?junk[(Math.random()*junk.length)|0]:base[i]));
        document.title=j;}}
      else if(!ov._ttlDone){ov._ttlDone=true;document.title=NEWTITLE;
        window.__title=NEWTITLE;
        const gt=document.getElementById('gameTitle');if(gt)gt.innerHTML=NEWTITLE;
        if(AC){tone(58,'sine',2.6,0.16,44);}}
      g.save();g.translate(W*0.5,H*0.46);
      const jx=(lt<10.4)?(Math.random()-0.5)*10:0;
      g.fillStyle='rgba(224,32,32,'+(0.65+Math.random()*0.35)+')';
      g.shadowColor='#8b0e0e';g.shadowBlur=30;
      g.font='700 '+Math.round(S*0.055)+'px Cormorant Garamond, serif';g.textAlign='center';
      g.fillText(out,jx,0);g.restore();g.shadowBlur=0;
      if(Math.random()<0.12)beep(70+Math.random()*240,0.03,0.045);
      if(lt>10.6)say(ru?['так честнее.','это никогда не было про лагерь.']
                       :['this is more honest.','it was never about the camp.'],lt,10.8,2.6,H*0.74);});

    // 12 — тишина
    add(7,(lt)=>{tint(Math.min(0.94,0.6+lt*0.22));
      const al=Math.min(1,lt/2)*Math.min(1,Math.max(0,(6.2-lt)/2));
      g.fillStyle='rgba(180,176,168,'+al*0.5+')';
      g.font='italic '+Math.round(S*0.028)+'px Cormorant Garamond, serif';
      g.textAlign='center';g.fillText('…',W*0.5,H*0.5);});

    // 13 — короткий отъезд к монитору и быстрый возврат
    add(17,(lt)=>{
      const OUT=8.5, HOLD=4.5, BACK=2.2;
      let k;
      if(lt<OUT){const p=lt/OUT,e=p*p*(3-2*p);k=1-e*0.46;}      // мягко отъезжаем
      else if(lt<OUT+HOLD)k=0.54;                                // держим
      else {const p=Math.min(1,(lt-OUT-HOLD)/BACK),e=p*p*(3-2*p);k=0.54+e*0.46;} // быстро возвращаемся
      if(st)st.style.transform='scale('+k+')';
      const sw=W*k,sh=H*k,sx=(W-sw)/2,sy=(H-sh)/2;
      // всё вокруг — чистая чернота, никакой комнаты
      g.fillStyle='#000';g.fillRect(0,0,W,H);
      g.clearRect(sx,sy,sw,sh);
      const bez=Math.max(2,sw*0.022);
      if(k<0.99){
        g.fillStyle='#0a0b0e';
        g.fillRect(sx-bez,sy-bez,sw+bez*2,bez);
        g.fillRect(sx-bez,sy+sh,sw+bez*2,bez*1.9);
        g.fillRect(sx-bez,sy,bez,sh);g.fillRect(sx+sw,sy,bez,sh);
        g.strokeStyle='rgba(96,102,116,0.5)';g.lineWidth=1;
        g.strokeRect(sx-bez,sy-bez,sw+bez*2,sh+bez*2.9);
        // ножка и подставка
        const baseY=sy+sh+bez*1.9;
        g.fillStyle='#0a0b0e';
        g.fillRect(W/2-sw*0.035,baseY,sw*0.07,sh*0.10);
        g.beginPath();
        g.moveTo(W/2-sw*0.17,baseY+sh*0.135);g.lineTo(W/2+sw*0.17,baseY+sh*0.135);
        g.lineTo(W/2+sw*0.13,baseY+sh*0.10);g.lineTo(W/2-sw*0.13,baseY+sh*0.10);
        g.closePath();g.fill();
        g.strokeStyle='rgba(96,102,116,0.35)';g.lineWidth=1;g.stroke();
        // свечение экрана в темноте
        const gl=g.createRadialGradient(W/2,H/2,sw*0.3,W/2,H/2,sw*1.1);
        gl.addColorStop(0,'rgba(120,116,126,0.07)');gl.addColorStop(1,'rgba(0,0,0,0)');
        g.fillStyle=gl;g.fillRect(0,0,W,H);}
      // последняя строка — пока стоим
      if(lt>OUT+0.6&&lt<OUT+HOLD){
        const al=Math.min(1,(lt-OUT-0.6)/1.0)*Math.min(1,Math.max(0,(OUT+HOLD-lt)/0.8));
        g.fillStyle='rgba(224,32,32,'+al+')';
        g.font='italic '+Math.round(S*0.030)+'px Cormorant Garamond, serif';g.textAlign='center';
        g.fillText(ru?'спокойной ночи, тринадцатый.':'good night, thirteenth.',W*0.5,sy-bez*2.6);}});

    (function draw(nw){
      const t=(nw-t0)/1000;
      W=cv.width=innerWidth;H=cv.height=innerHeight;S=Math.min(W,H);
      g.clearRect(0,0,W,H);g.textAlign='center';
      let acc=0,done=true;
      for(const ph of PH){
        if(t<acc+ph.dur){ph.fn(t-acc);done=false;break;}
        acc+=ph.dur;}
      for(let i=0;i<22;i++){g.fillStyle='rgba(255,255,255,0.012)';
        g.fillRect(Math.random()*W,Math.random()*H,1.4,1.4);}
      if(done){
        if(hum){try{hum.gain.linearRampToValueAtTime(0.0001,AC.currentTime+1.2);
          setTimeout(()=>{try{hum._o.stop();}catch(e2){}},1400);}catch(e2){}}
        window.__trapMode=false;archUnlocked=true;
        if(bStart){bStart.textContent=oldStart;bStart.style.color='';bStart.style.borderColor='';}
        if(bSet){bSet.textContent=oldSet;bSet.style.color='';bSet.style.borderColor='';}
        document.title=NEWTITLE;
        if(st){st.style.transform='';st.style.pointerEvents='';st.style.opacity='';}
        g.clearRect(0,0,W,H);
        setTimeout(()=>{splitAndCredits(ov,cv,g,st);},3000); // три секунды тишины — и меню расходится
        return;}
      requestAnimationFrame(draw);
    })(t0);
  }

  // ---- меню расходится надвое, салют и финальные титры ----
  function starCredits(){ // финальные титры со звёздами — целиком, для проверки
    const st=document.getElementById('start');
    showScreen('start');
    const ov=document.createElement('div');ov.id='trapOv';
    ov.style.cssText='position:fixed;inset:0;z-index:98;overflow:hidden;pointer-events:none;';
    ov.innerHTML='<canvas style="position:absolute;inset:0;width:100%;height:100%;"></canvas>';
    document.body.appendChild(ov);
    const cv=ov.querySelector('canvas'),g=cv.getContext('2d');
    stopMenuAmb();stopSfx('nature');
    splitAndCredits(ov,cv,g,st);
  }
  document.getElementById('devCredits')&&document.getElementById('devCredits').addEventListener('click',()=>{
    document.getElementById('devPanel').style.display='none';starCredits();});

  function splitAndCredits(ov,cv,g,st){
    const ru=LANG==='ru';
    let clone=null;
    try{
      clone=st.cloneNode(true);clone.id='startClone';
      const oc=st.querySelector('canvas'),nc=clone.querySelector('canvas');
      if(oc&&nc){const img=new Image();img.src=oc.toDataURL();
        img.style.cssText=oc.style.cssText;nc.parentNode.replaceChild(img,nc);}
      clone.style.zIndex='97';clone.style.pointerEvents='none';
      clone.style.clipPath='inset(0 0 0 50%)';
      document.body.appendChild(clone);
      st.style.clipPath='inset(0 50% 0 0)';
    }catch(e){clone=null;}
    if(AC){noise(0.9,0.20,180);tone(64,'sine',2.2,0.14,48);}
    requestAnimationFrame(()=>{
      st.style.transition='transform 1.6s cubic-bezier(.5,0,.3,1),opacity 1.6s';
      st.style.transform='translateX(-62%) rotate(-5deg)';st.style.opacity='0';
      if(clone){clone.style.transition='transform 1.6s cubic-bezier(.5,0,.3,1),opacity 1.6s';
        clone.style.transform='translateX(62%) rotate(5deg)';clone.style.opacity='0';}});

    stopSfx('nature');stopSfx('gm');

    const parts=[],rockets=[];
    const COL=['#ffd94a','#ff6a4a','#6ad8ff','#b78cff','#7dff9a','#fff2c2'];
    function launch(){const x=0.12+Math.random()*0.76;
      rockets.push({x,y:1.05,vy:-(0.55+Math.random()*0.22),tx:0.18+Math.random()*0.42,c:COL[(Math.random()*COL.length)|0]});
      if(AC)tone(220+Math.random()*140,'sine',0.5,0.05,900);}
    function burst(x,y,c,kind){
      if(AC){noise(0.35,0.10,320);tone(90,'sine',0.5,0.09,70);}
      kind=kind||['ball','ring','willow','crackle'][(Math.random()*4)|0];
      const n=(kind==='crackle'?90:58)+((Math.random()*30)|0);
      for(let i=0;i<n;i++){
        let a=Math.random()*6.28, sp=0.06+Math.random()*0.22, life=1, g2=1;
        if(kind==='ring'){a=(i/n)*6.28;sp=0.17+Math.random()*0.03;}
        else if(kind==='willow'){sp=0.05+Math.random()*0.12;life=1.7;g2=1.6;}
        else if(kind==='crackle'){sp=0.03+Math.random()*0.26;life=0.6;}
        parts.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life,g:g2,
          c:Math.random()<0.22?'#ffffff':c,sz:1+Math.random()*2.4,tw:Math.random()<0.3});}}
    const LINES=ru?[[2.0,NEWTITLE_G()],[6.0,'спасибо, что остался.'],
        [10.0,'Роман · Богдан · Ильдар'],[14.5,'смена 1989 года — свободна.'],
        [19.0,'а ты — уже нет.']]
      :[[2.0,NEWTITLE_G()],[6.0,'thank you for staying.'],
        [10.0,'Roman · Bogdan · Ildar'],[14.5,'the 1989 session is free.'],
        [19.0,'you are not.']];
    function NEWTITLE_G(){return window.__title||(LANG==='ru'?'5 НОЧЕЙ С ТОБОЙ':'5 NIGHTS WITH YOU');}
    const t0=performance.now();let last=0;
    ov.style.pointerEvents='none';
    (function fw(nw){
      const t=(nw-t0)/1000,dt=Math.min(0.05,(nw-last)/1000||0.016);last=nw;
      const W=cv.width=innerWidth,H=cv.height=innerHeight,S=Math.min(W,H);
      g.fillStyle='rgba(4,4,8,'+(t<1.6?0.10:0.22)+')';g.fillRect(0,0,W,H);
      if(t>1.4&&Math.random()<0.075)launch();
      // финальный залп
      if(t>11.4&&!ov._volley){ov._volley=true;
        for(let k=0;k<9;k++)setTimeout(()=>{launch();launch();},k*230);}
      for(let i=rockets.length-1;i>=0;i--){const r=rockets[i];
        r.y+=r.vy*dt;r.vy+=0.30*dt;
        g.fillStyle=r.c;g.globalAlpha=0.9;
        g.fillRect(r.x*W-1.5,r.y*H-6,3,10);g.globalAlpha=1;
        if(r.vy>-0.05||r.y<=r.tx){burst(r.x,r.y,r.c);rockets.splice(i,1);}}
      for(let i=parts.length-1;i>=0;i--){const p2=parts[i];
        p2.x+=p2.vx*dt*0.55;p2.y+=p2.vy*dt*0.55;p2.vy+=0.32*dt*(p2.g||1);
        p2.vx*=0.995;p2.life-=dt*0.42;
        if(p2.life<=0){parts.splice(i,1);continue;}
        const tw=p2.tw?(0.55+Math.random()*0.45):1;
        g.globalAlpha=Math.max(0,Math.min(1,p2.life))*tw;g.fillStyle=p2.c;
        g.fillRect(p2.x*W,p2.y*H,p2.sz,p2.sz);
        if(p2.sz>2){g.globalAlpha*=0.3;g.fillRect(p2.x*W-p2.vx*8,p2.y*H-p2.vy*8,p2.sz*0.7,p2.sz*0.7);}}
      g.globalAlpha=1;
      g.textAlign='center';
      LINES.forEach((ln,i)=>{const at=ln[0],
        al=Math.min(1,Math.max(0,(t-at)/1.2))*Math.min(1,Math.max(0,(at+4.6-t)/1.2));
        if(al<=0)return;
        const big=(i===0);
        g.fillStyle=big?'rgba(255,232,170,'+al+')':'rgba(232,228,216,'+al+')';
        g.shadowColor='rgba(255,220,140,'+al*0.7+')';g.shadowBlur=big?40:16;
        g.font=(big?'700 ':'italic ')+Math.round(S*(big?0.062:0.034))+'px Cormorant Garamond, serif';
        g.fillText(ln[1],W*0.5,H*(big?0.42:0.46));g.shadowBlur=0;});
      // силуэт лагеря внизу и поднимающиеся угли
      g.fillStyle='rgba(6,9,7,0.95)';
      g.beginPath();g.moveTo(0,H);
      for(let x=0;x<=W;x+=26){const hh=H*0.10+Math.abs(Math.sin(x*0.012))*H*0.07;
        g.lineTo(x,H-hh);}
      g.lineTo(W,H);g.closePath();g.fill();
      g.fillStyle='rgba(10,14,11,0.98)';
      for(let i=0;i<9;i++){const bx=W*(0.06+i*0.11),bw2=W*0.06,bh2=H*0.10;
        g.fillRect(bx,H-bh2,bw2,bh2);
        g.beginPath();g.moveTo(bx-4,H-bh2);g.lineTo(bx+bw2/2,H-bh2-H*0.035);g.lineTo(bx+bw2+4,H-bh2);g.closePath();g.fill();
        if(t>3){g.fillStyle='rgba(255,196,110,'+Math.min(0.85,(t-3)*0.25)+')';
          g.fillRect(bx+bw2*0.32,H-bh2*0.62,bw2*0.34,bh2*0.26);
          g.fillStyle='rgba(10,14,11,0.98)';}}
      if(!ov._emb){ov._emb=[];for(let i=0;i<70;i++)ov._emb.push({x:Math.random(),y:1+Math.random(),v:0.02+Math.random()*0.05,s:1+Math.random()*2});}
      ov._emb.forEach(e2=>{e2.y-=e2.v*dt;e2.x+=Math.sin(t*0.7+e2.y*9)*0.0004;
        if(e2.y<-0.05){e2.y=1.05;e2.x=Math.random();}
        g.fillStyle='rgba(255,'+(150+((e2.s*40)|0))+',90,'+(0.25+Math.sin(t*3+e2.x*12)*0.2)+')';
        g.fillRect(e2.x*W,e2.y*H,e2.s,e2.s);});
      if(t<16)requestAnimationFrame(fw);
      else{
        ov.style.transition='opacity 1.6s';ov.style.opacity='0';
        setTimeout(()=>{
          ov.remove();
          if(clone)clone.remove();
          st.style.transition='';st.style.transform='';st.style.opacity='';
          st.style.clipPath='';st.style.zIndex='';
          starsFinished=true;archUnlocked=true;
          rollCredits(); // настоящие титры под krank
        },1700);}
    })(t0);
  }

  function refreshMenuXtra(){
    const b6=document.getElementById('btnN6'),b7=document.getElementById('btnN7'),bc=document.getElementById('btnCustom');
    b6.style.display=unlocked6?'inline-block':'none';
    b7.style.display=unlocked7?'inline-block':'none';
    bc.style.display=unlockedCustom?'inline-block':'none';
    const ba=document.getElementById('btnArchive');
    if(ba){ba.style.display=archUnlocked?'inline-block':'none';
      ba.textContent=LANG==='ru'?'АРХИВ':'ARCHIVE';}
    b6.textContent=LANG==='ru'?'НОЧЬ 6: ПОБЕГ':'NIGHT 6: ESCAPE';
    b7.textContent=LANG==='ru'?'НОЧЬ 7: ???':'NIGHT 7: ???';
    bc.textContent=LANG==='ru'?'СВОЯ НОЧЬ':'CUSTOM NIGHT';
    const st=document.getElementById('star');
    st.style.display=(gotStar||gotStar2||secStar3||gotStar4||gotStar5)?'inline':'none';
    const earned=[gotStar,gotStar2,secStar3,gotStar4,gotStar5];
    const total=earned.filter(Boolean).length;
    const allFive=total>=5&&!starsFinished;
    st.innerHTML='';
    earned.forEach((has,i)=>{if(!has)return;
      const sp=document.createElement('span');sp.textContent='★';
      sp.dataset.si=i;sp.className='starOne'+(allFive?' starRed':'');
      sp.style.cssText='display:inline-block;margin-right:4px;transition:.3s;'+
        (allFive?'color:#e02020;text-shadow:0 0 22px #e02020,0 0 60px rgba(224,32,32,0.55);cursor:pointer;'
          :starsFinished?'color:#ffd94a;text-shadow:0 0 26px #ffd94a,0 0 70px rgba(255,217,74,0.55);'
                :'color:#f0d94a;text-shadow:0 0 16px #f0d94a;');
      if(allFive){sp.style.animation='starPulse 1.6s ease-in-out '+(i*0.18)+'s infinite';
        sp.addEventListener('click',ev=>{ev.stopPropagation();starClick(i,sp);});}
      st.appendChild(sp);});
    st.style.textShadow='none';
    // кнопка старта: ВОЙТИ или ПРОДОЛЖИТЬ + подсказка ночи
    const sb=document.getElementById('startBtn'),nh=document.getElementById('nightHint');
    if(NIGHT>1&&NIGHT<=5){sb.textContent=LANG==='ru'?'ПРОДОЛЖИТЬ':'CONTINUE';
      nh.textContent=(LANG==='ru'?'впереди — ночь ':'up next — night ')+NIGHT+(LANG==='ru'?' из 5':' of 5');}
    else{sb.textContent=T('startBtn');nh.textContent='';}
    const fr=document.getElementById('faceRow');fr.style.display='none';
    // выбор ночи (когда есть что выбирать)
    const nsel=document.getElementById('nightSelect');nsel.innerHTML='';
    if(nightsBeaten>=1){nsel.style.display='flex';
      for(let n2=1;n2<=5;n2++){const bb=document.createElement('button');bb.className='nsBtn'+(n2===NIGHT?' on':'');
        bb.textContent=(LANG==='ru'?'Н':'N')+n2;bb.disabled=n2>nightsBeaten+1;
        bb.addEventListener('click',()=>{NIGHT=n2;refreshMenuXtra();});nsel.appendChild(bb);}
      const ng=document.createElement('button');ng.className='nsBtn';
      ng.textContent=LANG==='ru'?'НОВАЯ ИГРА':'NEW GAME';
      ng.addEventListener('click',()=>{NIGHT=1;seenIntro=false;refreshMenuXtra();});nsel.appendChild(ng);}
    else nsel.style.display='none';
    // доброе меню после седьмой ночи
    document.getElementById('start').classList.toggle('kind',kindMenu);
    const ms=document.getElementById('menuSub');
    if(kindMenu)ms.textContent=LANG==='ru'?'они спят спокойно':'they sleep peacefully';
  }
  function showCertificate(){
    gotStar=true;unlocked7=true;nightsBeaten=Math.max(nightsBeaten,6);refreshMenuXtra();
    const c=document.getElementById('cert');
    document.getElementById('certTitle').textContent=LANG==='ru'?'СПРАВКА ОБ ОТЪЕЗДЕ':'DISCHARGE CERTIFICATE';
    document.getElementById('certL1').textContent=LANG==='ru'?'Настоящим удостоверяется, что воспитанник третьего отряда':'This certifies that a camper of the third squad';
    document.getElementById('certL2').innerHTML=LANG==='ru'?'выбыл из детского лагеря «Ласточка» <b>живым</b>, пережив шесть ночей и один побег.':'has left camp "Swallow" <b>alive</b>, having survived six nights and one escape.';
    document.getElementById('certL3').textContent=LANG==='ru'?'Претензий к лагерю не имеет. Ночами спит. Почти.':'Has no complaints. Sleeps at night. Mostly.';
    c.style.display='flex';playSfx('nature',0.8);
  }
  document.getElementById('certBtn').addEventListener('click',()=>{
    document.getElementById('cert').style.display='none';softReset();});

  // ---------- дополнительные эффекты ----------
  const FX={breathT:0,whisperT:14,deadT:26,glintT:20,clockT:11,glintMesh:null};
  function fxInit(){}
  let fxReady=false;
  function fxUpdate(dt){
    if(!started||dead||won)return;
    if(!fxReady){fxReady=true;try{fxInit();}catch(e){}}
    // дыхание виньетки
    {FX.breathT+=dt;
      const v=document.getElementById('vig');
      if(v)v.style.boxShadow='inset 0 0 '+(240+Math.sin(FX.breathT*0.16)*44)+'px '+
        (90+Math.sin(FX.breathT*0.16)*16)+'px rgba(0,0,0,0.96)';}
    // шёпот
    {FX.whisperT-=dt;
      if(FX.whisperT<=0){FX.whisperT=22+Math.random()*40;
        if(AC&&!activeEvent){const n=3+((Math.random()*3)|0);
          for(let i=0;i<n;i++)setTimeout(()=>{if(AC)noise(0.12+Math.random()*0.1,0.028,700+Math.random()*900,'bandpass');},i*190);}}}
  }

  // ================= LOOP =================
  let last=0,tSec=0,silKnockLatch=false;
  function animate(nw){requestAnimationFrame(animate);const dt=Math.min((nw-last)/1000||0,0.05);last=nw;tSec+=dt;
    if(CH.active){CH.cam.aspect=innerWidth/innerHeight;CH.cam.updateProjectionMatrix();
      chUpdate(dt);renderer.render(CH.scene,CH.cam);return;}
    if(ESC.active){escUpdate(dt);renderer.render(scene,camera);return;}
    if(DISCO.active){DISCO.t+=dt;
      DISCO.light.intensity=2.0+Math.sin(DISCO.t*9)*0.25+Math.sin(DISCO.t*23)*0.1; // дрожь свечи
      ghostLegA.rotation.z=Math.sin(DISCO.t*0.9)*0.3;ghostLegB.rotation.z=Math.sin(DISCO.t*0.9+2.8)*0.3;
      headG.rotation.y+=(boyTargetRot-headG.rotation.y)*0.02;
      // красная тварь тычет кекс лапкой
      creature.rotation.z=Math.sin(DISCO.t*3)*0.25;creature.position.x=1.5+Math.sin(DISCO.t*3)*0.03;
      // мелкая чёрная скачет на груди соседа
      if(creature2.visible){creature2.position.set(1.78,1.18+Math.abs(Math.sin(DISCO.t*4))*0.12,-0.1);creature2.rotation.y=DISCO.t*1.5;creature2.scale.setScalar(1+Math.sin(DISCO.t*6)*0.06);}
      lookYaw+=(tgtYaw-lookYaw)*0.04;camera.rotation.set(0,-lookYaw,0,'YXZ');
      renderer.render(scene,camera);return;}
    if(CUT.active){CUT.t+=dt;
      const z=16-CUT.t*0.82;                       // медленно идём по тропе
      camera.position.set(Math.sin(CUT.t*1.6)*0.06,-58.4+Math.abs(Math.sin(CUT.t*2.4))*0.035,z);
      camera.rotation.set(-0.03+Math.sin(CUT.t*0.5)*0.02,Math.sin(CUT.t*0.33)*0.18,0,'YXZ');
      setSubs(CUT.t);
      if(CUT.t>=CUT.dur)endCutscene();
      renderer.render(scene,camera);return;}
    // stand/lie animation
    standT+=(standTarget-standT)*0.12;
    camera.position.lerpVectors(LIE.pos,STAND.pos,standT);
    lookYaw+=(tgtYaw-lookYaw)*0.09;lookPitch+=(tgtPitch-lookPitch)*0.09;camera.rotation.set(lookPitch,-lookYaw,0,'YXZ');
    doorAngle+=((-doorTarget)-doorAngle)*0.15;doorPivot.rotation.y=doorAngle;
    if(started&&!dead&&!won){checkStare(dt);fxUpdate(dt);}
    const breath=1+Math.sin(tSec*1.1)*0.015;boy.scale.set(1,breath,1);
    if(ghost.visible){ghostLegA.rotation.z=Math.sin(tSec*1.15)*0.4;ghostLegB.rotation.z=Math.sin(tSec*1.15+2.7)*0.4;}
    // slow neighbor turn (like a head slowly turning) + delayed arming
    headG.rotation.y+=(boyTargetRot-headG.rotation.y)*0.028;
    const turnFrac=(Math.PI/2-headG.rotation.y)/Math.PI; // 0 asleep → 1 fully facing you
    eyeMat.emissiveIntensity=Math.max(0,turnFrac)*0.9;
    if(boyTargetRot<0&&Math.abs(headG.rotation.y-boyTargetRot)<0.06){boyArmT+=dt;if(boyArmT>1.0)boyArmed=true;}
    if(creature.visible){
      if(!creatureFlee){creature.position.z=Math.min(-3.05,creature.position.z+dt*0.12);
        creature.position.y=Math.abs(Math.sin(tSec*14))*0.02;creature.rotation.y=Math.sin(tSec*9)*0.15;}
      else{creature.position.z-=dt*5.5;creature.scale.setScalar(Math.max(0.5,creature.scale.x-dt*1.2));
        if(creature.position.z<-4.2){creature.visible=false;creature.scale.setScalar(1);}}}
    if(sil.visible){sil.position.x=-2.78;sil.position.z=0.4+Math.sin(tSec*2.2)*0.12;
      sil.rotation.z=Math.sin(tSec*3)*0.05;sil.rotation.x=Math.sin(tSec*1.7)*0.04;
      const pk=Math.sin(tSec*4)>0.985;
      if(pk&&!silKnockLatch&&AC){knock();silKnockLatch=true;}
      if(!pk)silKnockLatch=false;}
    moon.intensity=1.7+Math.sin(tSec*3.1)*0.1;
    if(activeEvent&&activeEvent.type==='bug')document.getElementById('bedred').style.opacity=bedRed.toFixed(2);
    updateEvents(dt);renderer.render(scene,camera);}
  animate(0);

  // ================= WARNING + SETTINGS =================
  const SET={vol:0.55,shake:true,diff:1,sens:1,subs:true,quiet:false,hints:false};
  let menuAmbOn=false,menuAmbGain=null,menuAmbTimer=null;
  function startMenuAmb(){audio();if(menuAmbOn||!AC)return;menuAmbOn=true;
    if(kindMenu&&playSfx('nature',0.45))return; // природа — только в добром меню после ночи 7; иначе гул
    if(AC.state==='suspended')AC.resume();
    menuAmbGain=AC.createGain();menuAmbGain.gain.value=0;menuAmbGain.connect(MG);
    const o=AC.createOscillator();o.type='sawtooth';o.frequency.value=34;
    const lp=AC.createBiquadFilter();lp.type='lowpass';lp.frequency.value=110;
    o.connect(lp);lp.connect(menuAmbGain);o.start();menuAmbGain._o=o;
    menuAmbGain.gain.linearRampToValueAtTime(0.14,AC.currentTime+2.5);
    menuAmbTimer=setInterval(()=>{if(!menuAmbOn)return;
      const r=Math.random();
      if(r<0.4)tone(55+Math.random()*35,'sine',1.8,0.06,42);        // distant moan
      else if(r<0.7)noise(0.5,0.05,260);                              // muffled shuffle
      else tone(880+Math.random()*200,'sine',0.09,0.03,860);          // faint metallic tick
    },3200);}
  function stopMenuAmb(){if(!menuAmbOn)return;menuAmbOn=false;stopSfx('nature');clearInterval(menuAmbTimer);
    if(menuAmbGain){const g=menuAmbGain;g.gain.linearRampToValueAtTime(0.0001,AC.currentTime+1);
      setTimeout(()=>{try{g._o.stop()}catch(e){}},1200);menuAmbGain=null;}}
  document.getElementById('warnBtn').addEventListener('click',()=>{fadeSwap('warn','diffpick');});
  document.querySelectorAll('.dpcard').forEach(c=>c.addEventListener('click',()=>{
    SET.diff=parseFloat(c.dataset.diff);
    c.style.borderColor='#c94444';c.style.transform='scale(1.06)';c.style.boxShadow='0 0 40px rgba(201,68,68,0.35)';
    setTimeout(()=>{showScreen('start');},450);
    // sync the small cards in settings
    document.querySelectorAll('.dcard').forEach(x=>{const on=x.dataset.diff===c.dataset.diff;
      x.style.border=on?'1px solid #c94444':'1px solid #323b45';x.style.background=on?'rgba(201,68,68,0.08)':'transparent';});
  }));
  document.getElementById('openSettings').addEventListener('click',()=>{document.getElementById('settings').style.display='flex';});
  document.getElementById('setBack').addEventListener('click',()=>{document.getElementById('settings').style.display='none';});
  document.getElementById('setVol').addEventListener('input',e=>{SET.vol=e.target.value/100;if(MG)MG.gain.value=SET.vol;});
  document.getElementById('setSens').addEventListener('input',e=>{SET.sens=e.target.value/100;});
  document.getElementById('setFull').addEventListener('change',e=>{
    if(e.target.checked){document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen();}
    else{document.exitFullscreen&&document.exitFullscreen();}});
  document.getElementById('setSubs').addEventListener('change',e=>{SET.subs=e.target.checked;});
  document.getElementById('setQuiet').addEventListener('change',e=>{SET.quiet=e.target.checked;});
  document.getElementById('setHints').addEventListener('change',e=>{SET.hints=e.target.checked;});
  document.getElementById('setShake').addEventListener('change',e=>{SET.shake=e.target.checked;});
  document.querySelectorAll('.dcard').forEach(c=>c.addEventListener('click',()=>{
    document.querySelectorAll('.dcard').forEach(x=>{x.classList.remove('sel');x.style.border='1px solid #323b45';x.style.background='transparent';});
    c.classList.add('sel');c.style.border='1px solid #c94444';c.style.background='rgba(201,68,68,0.08)';
    SET.diff=parseFloat(c.dataset.diff);}));

    // FNAF-style menu face: dim flickering figure watching from the dark
  let menuFaceAngryT=0; // объявлено ДО цикла отрисовки, который стартует сразу
  (function menuFaceLoop(){
    const mc=document.getElementById('menuFace');if(!mc)return;const mg=mc.getContext('2d');
    const off=document.createElement('canvas'),og=off.getContext('2d'); // изолированный слой для морды
    function draw(){
      const st=document.getElementById('start');
      if(st&&st.style.display!=='none'){
        mc.width=mc.clientWidth||600;mc.height=mc.clientHeight||600;
        const W=mc.width,H=mc.height,t=performance.now()/1000;
        mg.clearRect(0,0,W,H);
        const flick=1; // лицо статично, без мерцания
        if(kindMenu){ // тёплое, спящее лицо
          const cx=W*0.55,cy=H*0.5,r=Math.min(W,H)*0.42;
          const grd=mg.createRadialGradient(cx,cy,r*0.1,cx,cy,r*1.1);
          grd.addColorStop(0,'rgba(190,165,120,0.22)');grd.addColorStop(0.7,'rgba(60,45,28,0.5)');grd.addColorStop(1,'rgba(0,0,0,0)');
          mg.fillStyle=grd;mg.beginPath();mg.ellipse(cx,cy,r*0.72,r,0,0,7);mg.fill();
          mg.strokeStyle='rgba(240,217,140,0.8)';mg.lineWidth=4;
          [-1,1].forEach(sn=>{mg.beginPath();mg.arc(cx+sn*r*0.3,cy-r*0.13,r*0.1,0.15*Math.PI,0.85*Math.PI);mg.stroke();}); // закрытые глаза
          mg.beginPath();mg.arc(cx,cy+r*0.32,r*0.16,0.1*Math.PI,0.9*Math.PI);mg.stroke(); // улыбка
          requestAnimationFrame(draw);return;}
        if(window.__trapMode){ // финал: вместо монстра — тот, кто смотрит
          const cx2=W*0.55,cy2=H*0.5,r2=Math.min(W,H)*0.34;
          mg.save();
          const gr=mg.createRadialGradient(cx2,cy2,r2*0.1,cx2,cy2,r2*1.5);
          gr.addColorStop(0,'rgba(150,140,150,0.20)');gr.addColorStop(1,'rgba(0,0,0,0)');
          mg.fillStyle=gr;mg.beginPath();mg.arc(cx2,cy2,r2*1.5,0,7);mg.fill();
          // силуэт головы и плеч со спины — отражение
          mg.fillStyle='rgba(8,8,12,0.85)';
          mg.beginPath();mg.ellipse(cx2,cy2+r2*1.5,r2*1.15,r2*0.95,0,Math.PI,0);mg.fill();
          mg.beginPath();mg.ellipse(cx2,cy2+r2*0.15,r2*0.42,r2*0.5,0,0,7);mg.fill();
          mg.strokeStyle='rgba(170,165,175,0.16)';mg.lineWidth=r2*0.05;
          mg.beginPath();mg.ellipse(cx2,cy2+r2*0.15,r2*0.42,r2*0.5,0,Math.PI*0.15,Math.PI*0.85);mg.stroke();
          mg.restore();
          requestAnimationFrame(draw);return;}
        // большая морда = монстр ТЕКУЩЕЙ ночи, полупрозрачная во тьме
        const FK=['door','fast','neighbor','bug','buff'][Math.min(NIGHT,5)-1]||'door';
        off.width=W;off.height=H;
        try{SCARE[FK](og,W,H,1.05);}catch(e){} // фиксированная фаза — морда не двигается
        mg.globalAlpha=0.34;mg.drawImage(off,0,0);mg.globalAlpha=1;
        // ВЫРЕЗАЕМ края в прозрачность — никакой границы канваса
        mg.globalCompositeOperation='destination-out';
        const mask=mg.createRadialGradient(W*0.5,H*0.5,Math.min(W,H)*0.05,W*0.5,H*0.5,Math.min(W,H)*0.62);
        mask.addColorStop(0,'rgba(0,0,0,0)');mask.addColorStop(0.62,'rgba(0,0,0,0.55)');mask.addColorStop(1,'rgba(0,0,0,1)');
        mg.fillStyle=mask;mg.fillRect(0,0,W,H);
        // и по горизонтали тоже, чтобы левый край растаял в фон меню
        const hmask=mg.createLinearGradient(0,0,W*0.5,0);
        hmask.addColorStop(0,'rgba(0,0,0,1)');hmask.addColorStop(1,'rgba(0,0,0,0)');
        mg.fillStyle=hmask;mg.fillRect(0,0,W*0.5,H);
        mg.globalCompositeOperation='source-over';
        // вспышка глаз при кликах (пасхалка) — поверх любой морды
        const angry=(performance.now()-menuFaceAngryT)<450;
        if(angry){const cx=W*0.55,cy=H*0.5,r=Math.min(W,H)*0.42;
          mg.fillStyle='rgba(255,30,30,0.95)';mg.shadowColor='#a11';mg.shadowBlur=40;
          [-1,1].forEach(sn=>{mg.beginPath();mg.arc(cx+sn*r*0.3,cy-r*0.15,r*0.055,0,7);mg.fill();});mg.shadowBlur=0;}
      }
      requestAnimationFrame(draw);
    } draw();})();

  // ======================================================
  //  Т А Й Н А   (многоступенчатая, с микро-подсказками)
  //  Прогресс живёт в рамках сессии. Каждый шаг даёт
  //  едва заметный отклик — звук и крошечный знак.
  // ======================================================
  const SEC={step:0,marks:0,cupTaps:0,knockSeq:[],knockT:0,galOrder:[],done:false};
  // ---- коллекция пасхалок (для пятой звезды) ----
  const EGG_ALL=['cupcake','hand','1989','stare','kane','s67','cat','jackpot']; // 8 штук
  const EGGS=new Set();
  function egg(id){
    if(EGGS.has(id))return;EGGS.add(id);
    if(AC)tone(1560,'sine',0.5,0.045,2300);
    if(EGGS.size>=EGG_ALL.length&&!gotStar5){gotStar5=true;
      setTimeout(()=>{if(AC){[784,988,1175].forEach((f,i)=>setTimeout(()=>tone(f,'sine',0.9,0.09,f),i*160));}
        refreshMenuXtra();},600);}
  }
  let gotStar4=false,gotStar5=false;
  function secMark(){ // микро-отклик: тихий чистый тон + счётчик знаков
    SEC.marks++;
    if(AC){const t0=now();const o=AC.createOscillator(),g2=AC.createGain();
      o.type='sine';o.frequency.setValueAtTime(1320,t0);o.frequency.exponentialRampToValueAtTime(1980,t0+0.5);
      g2.gain.setValueAtTime(0.0001,t0);g2.gain.exponentialRampToValueAtTime(0.055,t0+0.05);
      g2.gain.exponentialRampToValueAtTime(0.0001,t0+0.9);o.connect(g2);g2.connect(MG);o.start(t0);o.stop(t0+0.95);}
    const v=document.getElementById('menuVer');
    if(v)v.textContent='v3.0 · '+'·'.repeat(SEC.marks);
  }
  function secAdvance(n){ if(SEC.step===n-1){SEC.step=n;secMark();return true;} return false; }

  // --- ШАГ 1: меню, надпись версии ---
  (function(){const v=document.getElementById('menuVer');if(!v)return;
    let c=0;v.style.cursor='default';
    v.addEventListener('click',e=>{e.stopPropagation();
      if(SEC.step!==0)return;
      if(++c>=13){c=0;secAdvance(1);}});})();

  // --- ШАГ 4: рука соседа, тринадцать касаний ---
  function secHand(){
    if(SEC.step!==3)return;
    SEC.handTaps=(SEC.handTaps||0)+1;
    if(SEC.handTaps>=13){SEC.handTaps=0;secAdvance(4);setTimeout(secFinale,900);}
  }

  // --- НАГРАДА: последняя перекличка ---
  function secFinale(){
    if(SEC.done)return;SEC.done=true;
    started=false;clearActive();
    stopSfx('nature');stopSfx('gm');stopMenuAmb();
    ['gallery','galView','tales','start','inter'].forEach(id=>{const e=document.getElementById(id);if(e)e.style.display='none';});
    const ov=document.createElement('div');ov.id='secOv';
    ov.style.cssText='position:fixed;inset:0;z-index:90;background:#000;overflow:hidden;';
    ov.innerHTML='<canvas id="secCv" style="position:absolute;inset:0;width:100%;height:100%;"></canvas>';
    document.body.appendChild(ov);
    const cv=ov.querySelector('#secCv'),g=cv.getContext('2d');
    playSfx('acc',0.5);
    const ru=LANG==='ru';
    const NAMES=['Ильдар К.','Лёша П.','Марина С.','Гриша Н.','Оля В.','Толя Д.',
                 'Света Р.','Костя М.','Ира Б.','Женя Ф.','Саша Т.','Илья К.'];
    const T1=ru?'ПОСЛЕДНЯЯ ПЕРЕКЛИЧКА':'THE LAST ROLL CALL';
    const T2=ru?'смена 1989 года · отряд третий':'session of 1989 · third squad';
    const END=ru
      ?['Двенадцать. Все на месте.','Тринадцатая кровать — твоя. Она пуста.','Ты выспался. Впервые за тридцать семь лет.']
      :['Twelve. All present.','The thirteenth bed is yours. It is empty.','You slept. For the first time in thirty-seven years.'];
    const t0=performance.now();
    (function draw(nw){const t=(nw-t0)/1000,W=cv.width=innerWidth,H=cv.height=innerHeight;
      g.fillStyle='#05060a';g.fillRect(0,0,W,H);
      // тёплый свет сверху, как от лампы
      const lg=g.createRadialGradient(W*0.5,-H*0.1,20,W*0.5,-H*0.1,H*1.25);
      lg.addColorStop(0,'rgba(255,226,170,0.14)');lg.addColorStop(1,'rgba(255,226,170,0)');
      g.fillStyle=lg;g.fillRect(0,0,W,H);
      g.textAlign='center';
      // заголовок
      g.fillStyle='rgba(201,195,178,'+Math.min(1,t/1.2)+')';
      g.font='700 '+Math.round(Math.min(W,H)*0.045)+'px Cormorant Garamond, serif';
      g.fillText(T1,W*0.5,H*0.13);
      g.fillStyle='rgba(110,106,96,'+Math.min(1,Math.max(0,(t-0.6)/1.2))+')';
      g.font='italic '+Math.round(Math.min(W,H)*0.022)+'px Cormorant Garamond, serif';
      g.fillText(T2,W*0.5,H*0.185);
      // имена по очереди, двумя колонками — «здесь»
      g.font=Math.round(Math.min(W,H)*0.028)+'px Cormorant Garamond, serif';
      NAMES.forEach((nm,i)=>{
        const at=1.6+i*0.85, a2=Math.min(1,Math.max(0,(t-at)/0.7));
        if(a2<=0)return;
        const col=i<6?0:1, row=i%6;
        const x=W*(col?0.66:0.34), y=H*0.30+row*H*0.075;
        g.fillStyle='rgba(207,201,186,'+a2+')';g.textAlign='right';g.fillText(nm,x,y);
        g.fillStyle='rgba(140,190,150,'+a2*0.9+')';g.textAlign='left';
        g.fillText(ru?'  здесь':'  here',x,y);});
      // финальные строки
      g.textAlign='center';
      END.forEach((ln,i)=>{
        const at=12.4+i*3.4, a2=Math.min(1,Math.max(0,(t-at)/1.1))*Math.min(1,Math.max(0,(at+3.0-t)/0.9));
        if(a2<=0)return;
        g.fillStyle='rgba(230,226,214,'+a2+')';
        g.font='italic '+Math.round(Math.min(W,H)*0.032)+'px Cormorant Garamond, serif';
        g.fillText(ln,W*0.5,H*0.86);});
      // золотая звезда в конце
      if(t>22.4){const a2=Math.min(1,(t-22.4)/1.4);
        g.save();g.translate(W*0.5,H*0.5);g.rotate(t*0.12);
        const or=Math.min(W,H)*0.075*(1+Math.sin(t*2)*0.04),ir=or*0.42;
        g.fillStyle='rgba(240,217,74,'+a2+')';g.shadowColor='#f0d94a';g.shadowBlur=60*a2;
        g.beginPath();for(let i=0;i<10;i++){const rad=i%2?ir:or,an=i/10*Math.PI*2-Math.PI/2;
          g[i?'lineTo':'moveTo'](Math.cos(an)*rad,Math.sin(an)*rad);}
        g.closePath();g.fill();g.restore();g.shadowBlur=0;}
      if(t<26)requestAnimationFrame(draw);
      else{ov.remove();stopSfx('acc');
        gotStar=true;gotStar2=true;secStar3=true;
        unlocked6=unlocked7=unlockedCustom=true;nightsBeaten=Math.max(nightsBeaten,7);
        kindMenu=true;refreshMenuXtra();showScreen('start');startMenuAmb();}
    })(t0);
  }
  let secStar3=false;

  // ===== пасхалки с кодами =====
  let codeBuf='';
  function catScare(){
    audio();if(AC&&AC.state==='suspended')AC.resume();
    scareCv.width=innerWidth;scareCv.height=innerHeight;scareEl.style.zIndex='72';scareEl.style.display='block';
    const _m=SFX['murr'];if(_m&&_m._ok){try{_m.currentTime=2;_m.volume=SET.quiet?0.5:1;_m.play().catch(()=>{});}catch(e){}} // старт со 2-й секунды
    const stopAt=setTimeout(()=>{stopSfx('murr');},4000);
    if(SET.shake){flash.style.transition='none';flash.style.opacity='1';requestAnimationFrame(()=>{flash.style.transition='opacity .3s';flash.style.opacity='0';});}
    const t0=performance.now();
    let _looped=false;(function paint(nw){const t=(nw-t0)/1000,W=scareCv.width,H=scareCv.height;
      const sh=SET.shake?(Math.random()-0.5)*30:0;sx.save();sx.translate(sh,sh);
      // сиамский котик
      sx.fillStyle='#100c0a';sx.fillRect(0,0,W,H);
      const cx=W/2,cy=H*0.52,r=Math.min(W,H)*0.34*(1+Math.sin(t*8)*0.03);
      sx.fillStyle='#e8dcc8';sx.beginPath();sx.ellipse(cx,cy,r,r*1.05,0,0,7);sx.fill(); // морда
      sx.fillStyle='#4a3728';[-1,1].forEach(sn=>{sx.beginPath();sx.moveTo(cx+sn*r*0.5,cy-r*0.7);sx.lineTo(cx+sn*r*0.95,cy-r*1.25);sx.lineTo(cx+sn*r*0.28,cy-r*0.95);sx.closePath();sx.fill();}); // уши
      sx.fillStyle='#3a2c20';sx.beginPath();sx.ellipse(cx,cy+r*0.25,r*0.6,r*0.5,0,0,7);sx.fill(); // тёмная мордочка-маска
      // голубые глаза
      sx.fillStyle='#5ac8ff';sx.shadowColor='#5ac8ff';sx.shadowBlur=24;
      [-1,1].forEach(sn=>{sx.beginPath();sx.ellipse(cx+sn*r*0.32,cy-r*0.05,r*0.16,r*0.2,0,0,7);sx.fill();});sx.shadowBlur=0;
      sx.fillStyle='#000';[-1,1].forEach(sn=>{sx.beginPath();sx.ellipse(cx+sn*r*0.32,cy-r*0.05,r*0.05,r*0.16,0,0,7);sx.fill();}); // зрачки-щели
      sx.fillStyle='#ffb0c0';sx.beginPath();sx.moveTo(cx,cy+r*0.28);sx.lineTo(cx-r*0.09,cy+r*0.4);sx.lineTo(cx+r*0.09,cy+r*0.4);sx.closePath();sx.fill(); // нос
      sx.strokeStyle='rgba(255,255,255,0.6)';sx.lineWidth=2; // усы
      [-1,1].forEach(sn=>{for(let i=0;i<3;i++){sx.beginPath();sx.moveTo(cx+sn*r*0.15,cy+r*0.42+i*6);sx.lineTo(cx+sn*r*0.9,cy+r*0.3+i*12);sx.stroke();}});
      sx.restore();
      if(t<4)requestAnimationFrame(paint);
      else{scareEl.style.display='none';scareEl.style.zIndex='';stopSfx('murr');clearTimeout(stopAt);backToMenu();}
    })(t0);
  }
  function backToMenu(){ // единый безопасный возврат в меню после пасхалки
    started=false;showScreen('start');
    if(kindMenu){stopSfx('nature');playSfx('nature',0.5);}else startMenuAmb();}
  let showActive=false;
  function scare67(){
    audio();if(AC&&AC.state==='suspended')AC.resume();
    stopMenuAmb();stopSfx('nature');
    const ov=document.createElement('div');ov.id='s67ov';
    ov.style.cssText='position:fixed;inset:0;z-index:78;background:#0a0004;cursor:pointer;overflow:hidden;';
    ov.innerHTML='<canvas id="s67cv" style="position:absolute;inset:0;width:100%;height:100%;"></canvas>'+
      '<div style="position:absolute;bottom:5vh;left:0;right:0;text-align:center;font-family:\'Share Tech Mono\';font-size:12px;letter-spacing:0.25em;color:rgba(255,255,255,0.5);z-index:2;">КЛИК — ПРОПУСТИТЬ</div>';
    document.body.appendChild(ov);
    const cv=ov.querySelector('#s67cv'),g=cv.getContext('2d');
    const okAudio=playSfx('s67',1);const snd=SFX['s67'];
    // падающие 67
    const drops=[];for(let i=0;i<60;i++)drops.push({x:Math.random(),y:Math.random()*-1,v:0.15+Math.random()*0.5,s:14+Math.random()*46,r:Math.random()*6.28});
    const t0=performance.now();let run=true;
    function finish(){run=false;stopSfx('s67');ov.remove();backToMenu();}
    (function draw(nw){if(!run)return;const t=(nw-t0)/1000;cv.width=innerWidth;cv.height=innerHeight;
      const W=cv.width,H=cv.height;
      g.fillStyle='rgba(10,0,4,0.35)';g.fillRect(0,0,W,H); // лёгкий трейл
      // огромная пульсирующая 67 по центру
      g.save();g.translate(W/2,H*0.42);const pl=1+Math.sin(t*10)*0.06;g.scale(pl,pl);
      g.fillStyle='#c0182a';g.shadowColor='#f22';g.shadowBlur=40;g.font='900 '+Math.round(Math.min(W,H)*0.4)+'px Share Tech Mono, monospace';g.textAlign='center';g.textBaseline='middle';
      g.fillText('67',0,0);g.restore();g.shadowBlur=0;
      // дождь из 67
      g.fillStyle='#e8dcc8';g.textAlign='center';g.textBaseline='middle';
      drops.forEach(d=>{d.y+=d.v*0.01;if(d.y>1.1){d.y=-0.1;d.x=Math.random();}
        g.save();g.translate(d.x*W,d.y*H);g.rotate(d.r+t*0.5);g.font='700 '+d.s+'px Share Tech Mono, monospace';
        g.globalAlpha=0.8;g.fillText('67',0,0);g.restore();});g.globalAlpha=1;
      const done=(snd&&snd._ok&&snd.duration&&snd.currentTime>=snd.duration-0.1);
      if(!okAudio&&t>6){finish();return;}      // нет файла — 6 сек и хватит
      if(done){finish();return;}
      if(run)requestAnimationFrame(draw);})(t0);
    ov.onclick=finish;
  }
  function showEgg(){ // 57057 — «Кейн» + песня WhoisrunningtheShow.mpeg, 3 минуты, пропуск
    if(showActive)return;showActive=true;
    stopMenuAmb();stopSfx('nature');
    if(!playSfx('show',1)){showActive=false;setCue(LANG==='ru'?'файл WhoisrunningtheShow.mpeg не найден':'WhoisrunningtheShow.mpeg not found',true);setTimeout(()=>setCue(''),2600);backToMenu();return;}
    const ov=document.createElement('div');ov.id='showOv';
    ov.style.cssText='position:fixed;inset:0;z-index:78;background:#0a0004;cursor:pointer;overflow:hidden;';
    ov.innerHTML='<canvas id="showCv" style="position:absolute;inset:0;width:100%;height:100%;"></canvas>'+
      '<div style="position:absolute;bottom:5vh;left:0;right:0;text-align:center;font-family:\'Share Tech Mono\';font-size:12px;letter-spacing:0.25em;color:rgba(255,255,255,0.5);z-index:2;">КЛИК — ПРОПУСТИТЬ</div>';
    document.body.appendChild(ov);
    const cv=ov.querySelector('#showCv'),g=cv.getContext('2d');const t0=performance.now();let run=true;
    function finish(){run=false;stopSfx('show');ov.remove();showActive=false;backToMenu();}
    (function draw(nw){if(!run)return;const t=(nw-t0)/1000;cv.width=innerWidth;cv.height=innerHeight;
      const W=cv.width,H=cv.height,cx=W/2,cy=H*0.47;
      // красный бархатный фон с виньеткой
      const bg=g.createRadialGradient(cx,cy,40,cx,cy,Math.max(W,H)*0.75);
      bg.addColorStop(0,'#6a0f18');bg.addColorStop(1,'#180205');g.fillStyle=bg;g.fillRect(0,0,W,H);
      const R=Math.min(W,H)*0.30;
      const open=R*(0.62+Math.sin(t*2.6)*0.05); // пасть слегка «говорит»
      // ---- голова = раскрытая челюсть-капкан (как на фото) ----
      // тёмная глубина рта
      g.fillStyle='#1a0407';g.beginPath();g.ellipse(cx,cy,R*1.02,open+R*0.1,0,0,7);g.fill();
      // функция ряда зубов по дуге
      function jaw(dir){ // dir=-1 верхняя, +1 нижняя
        const baseY=cy+dir*open, N=13;
        // белая десна-дуга
        g.fillStyle='#efe9dc';g.beginPath();
        g.ellipse(cx,cy+dir*(open+R*0.34),R*1.05,R*0.5,0,dir>0?0:Math.PI,dir>0?Math.PI:0);g.fill();
        // отдельные зубы
        for(let i=0;i<N;i++){const fr=i/(N-1),ang=Math.PI*fr;
          const tx=cx-Math.cos(ang)*R*0.92, w=R*0.15;
          const ty=baseY;
          g.fillStyle='#f7f2e6';
          g.beginPath();
          g.moveTo(tx-w/2,ty);g.lineTo(tx+w/2,ty);
          g.lineTo(tx+w*0.34,ty+dir*R*0.28);
          g.quadraticCurveTo(tx,ty+dir*R*0.34,tx-w*0.34,ty+dir*R*0.28);
          g.closePath();g.fill();
          g.strokeStyle='rgba(150,120,120,0.35)';g.lineWidth=1;g.stroke();}
      }
      jaw(-1);jaw(1);
      // ---- два больших мультяшных глаза, разнесены и приподняты ----
      const eR=R*0.30;
      [[-1,'#1f6dff','#0a3aa0'],[1,'#22a355','#0d5a2a']].forEach(([sn,c1,c2],idx)=>{
        const ex=cx+sn*R*0.46, ey=cy-R*0.16;
        // белок с мягкой тенью
        g.fillStyle='#fbfbf7';g.beginPath();g.arc(ex,ey,eR,0,7);g.fill();
        g.strokeStyle='rgba(0,0,0,0.25)';g.lineWidth=eR*0.06;g.stroke();
        // радужка с градиентом
        const iris=g.createRadialGradient(ex,ey,eR*0.1,ex,ey,eR*0.66);
        iris.addColorStop(0,c1);iris.addColorStop(1,c2);g.fillStyle=iris;
        const gx=ex+Math.sin(t*1.3)*eR*0.12, gy=ey+Math.cos(t*1.1)*eR*0.08; // взгляд бегает
        g.beginPath();g.arc(gx,gy,eR*0.62,0,7);g.fill();
        g.fillStyle='#08080e';g.beginPath();g.arc(gx,gy,eR*0.3,0,7);g.fill();
        // блики
        g.fillStyle='rgba(255,255,255,0.95)';g.beginPath();g.arc(gx-eR*0.2,gy-eR*0.24,eR*0.13,0,7);g.fill();
        g.fillStyle='rgba(255,255,255,0.5)';g.beginPath();g.arc(gx+eR*0.18,gy+eR*0.12,eR*0.07,0,7);g.fill();});
      // подпись
      g.fillStyle='rgba(10,6,8,'+(0.65+Math.sin(t*5)*0.25)+')';g.font='700 italic '+Math.round(R*0.22)+'px Cormorant Garamond, serif';g.textAlign='center';
      g.fillText(LANG==='ru'?'кто здесь главный?':'who is running the show?',cx,cy+R*1.35);
      const snd=SFX['show'];const done=(snd&&snd._ok&&snd.duration&&snd.currentTime>=snd.duration-0.15);
      if(done){finish();return;}
      if(t<180&&run)requestAnimationFrame(draw);else finish();})(t0);
    function finish(){run=false;stopSfx('show');ov.remove();showActive=false;backToMenu();}
    ov.onclick=finish;
  }
  // 436174 — «Cat» в шестнадцатеричном виде. Работает всегда и откуда угодно.
  let catBuf='';
  addEventListener('keydown',e=>{if(e.key&&e.key.length===1&&/[0-9]/.test(e.key)){
    catBuf=(catBuf+e.key).slice(-6);
    if(catBuf==='436174'){catBuf='';egg('cat');
      const cp=document.getElementById('customPanel');if(cp)cp.style.display='none';
      catScare();}}});

  // ===== SECRET: menu idle scare + gallery =====
  function menuScream(){if(!AC)return;const t=now();MG.gain.setValueAtTime(1,t);
    [180,186,540,1080].forEach(f=>{const o=AC.createOscillator(),g=AC.createGain();o.type='square';
      o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*0.4,t+0.9);
      g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.26,t+0.02);
      g.gain.exponentialRampToValueAtTime(0.0001,t+1.2);o.connect(g);g.connect(MG);o.start(t);o.stop(t+1.25);});
    noise(1.1,0.45,3400,'bandpass');}
  function drawEye(g,W,H,t){ // уникальный скример ожидания: гигантский налитый кровью глаз
    g.fillStyle='#050202';g.fillRect(0,0,W,H);
    const cx=W/2,cy=H/2,R=Math.min(W,H)*0.46;
    g.fillStyle='#d8d2c4';g.beginPath();g.ellipse(cx,cy,R*1.25,R*0.8,0,0,7);g.fill();
    g.strokeStyle='rgba(150,20,20,0.65)';g.lineWidth=2.5;
    for(let i=0;i<26;i++){const a2=Math.random()*6.28;g.beginPath();
      g.moveTo(cx+Math.cos(a2)*R*0.45,cy+Math.sin(a2)*R*0.3);
      g.quadraticCurveTo(cx+Math.cos(a2)*R*0.8,cy+Math.sin(a2)*R*0.55,cx+Math.cos(a2)*R*1.2,cy+Math.sin(a2)*R*0.75);g.stroke();}
    g.fillStyle='#2a1408';g.beginPath();g.arc(cx,cy,R*0.42,0,7);g.fill();
    g.fillStyle='#8b0e0e';g.beginPath();g.arc(cx,cy,R*0.4,0,7);g.fill();
    const pup=Math.max(0.09,0.22-t*0.08); // зрачок сжимается — он тебя УВИДЕЛ
    g.fillStyle='#000';g.beginPath();g.arc(cx,cy,R*pup,0,7);g.fill();
    g.fillStyle='rgba(255,255,255,0.5)';g.beginPath();g.arc(cx-R*0.12,cy-R*0.12,R*0.05,0,7);g.fill();
    const lid=Math.max(0,(t-1.4)*1.4);
    g.fillStyle='#050202';g.fillRect(0,0,W,H*0.5*lid);g.fillRect(0,H-H*0.5*lid,W,H*0.5*lid);}
  // ===== EASTER EGGS =====
  // 1) набери 1989 — они помнят
  let keyBuf='';
  addEventListener('keydown',e=>{if(e.key.length===1){keyBuf=(keyBuf+e.key).slice(-8);
    if(keyBuf.endsWith('1989')){keyBuf='';egg('1989');neighborTurn();
      const ch=document.getElementById('ch');const old=ch.textContent;
      ch.textContent='5:80';ch.style.color='#c94444';    // сломанное время
      ghost.visible=true;                                  // он всё ещё ждёт подъёма
      setCue(LANG==='ru'?'они помнят':'they remember',true);
      setTimeout(()=>{ch.textContent=old;ch.style.color='';setCue('');ghost.visible=false;},10000);}}});
  // 2) трижды кликни по луне — кровавая луна
  // (пасхалка с луной заменена на руку соседа)
  // 3) пять кликов по лицу в меню — оно замечает тебя и открывает галерею

  // ===== DEV MENU =====
  const devP=document.getElementById('devPanel');
  addEventListener('keydown',e=>{if(e.code==='Backquote'){e.preventDefault();
    if(!devUnlocked)return;   // открывается только после карточки автора в архиве
    devP.style.display=devP.style.display==='none'?'block':'none';}});
  document.querySelectorAll('.devNight').forEach(bb=>bb.addEventListener('click',()=>{HOUR_SECONDS=parseInt(bb.dataset.hs);}));
  document.getElementById('devNightUp').addEventListener('click',()=>{NIGHT=Math.min(5,NIGHT+1);});
  document.querySelectorAll('.devSetN').forEach(b=>b.addEventListener('click',()=>{
    NIGHT=+b.dataset.n;nightsBeaten=Math.max(nightsBeaten,NIGHT-1);refreshMenuXtra();softReset();}));
  document.getElementById('devSkip').addEventListener('click',()=>{clock+=HOUR_SECONDS;});
  document.getElementById('devWin').addEventListener('click',()=>{clock=HOURS*HOUR_SECONDS-0.05;});
  document.getElementById('devClear').addEventListener('click',()=>{clearActive();});
  document.querySelectorAll('.devEv').forEach(bb=>bb.addEventListener('click',()=>{clearActive();startEvent(bb.dataset.ev);}));
  document.getElementById('devEsc').addEventListener('click',()=>{softReset();startEscape();});
  document.getElementById('devMem').addEventListener('click',()=>{softReset();discoStart();});
  document.getElementById('devTales')&&document.getElementById('devTales').addEventListener('click',()=>{softReset();showTales();});
  document.getElementById('devCert').addEventListener('click',()=>{showCertificate();});
  document.getElementById('devInter').addEventListener('click',()=>{if(NIGHT<2)NIGHT=2;started=false;clearActive();showIntermission();});
  document.getElementById('devUnlock').addEventListener('click',()=>{unlocked6=true;unlocked7=true;unlockedCustom=true;gotStar=true;gotStar2=true;secStar3=true;gotStar4=true;gotStar5=true;EGG_ALL.forEach(e=>EGGS.add(e));nightsBeaten=7;seenIntro=true;archUnlocked=true;devUnlocked=true;refreshMenuXtra();});
  document.getElementById('devSecret').addEventListener('click',()=>{softReset();startSecretNight();});
  document.getElementById('devTrap')&&document.getElementById('devTrap').addEventListener('click',()=>{onAllStarsClicked();});
  document.getElementById('devTrue').addEventListener('click',()=>{document.getElementById('start').style.display='none';trueEnding();});
  setInterval(()=>{
    if(devP.style.display==='none')return;
    const total=HOURS*HOUR_SECONDS,rem=Math.max(0,total-clock);
    document.getElementById('devStats').innerHTML=
      'ночь: <b style="color:#f0a742">'+NIGHT+'</b> / 3<br>время: '+clock.toFixed(1)+' / '+total+'с · <b style="color:#8fd18a">осталось '+rem.toFixed(1)+'с</b><br>'+
      'событие: '+(activeEvent?('<b style="color:#f0a742">'+activeEvent.type+'</b> ['+(activeEvent.phase||'—')+'] t='+activeEvent.t.toFixed(1)+'/'+(activeEvent.limit||0).toFixed(1)):'—')+'<br>'+
      'след. событие: '+(activeEvent?'—':((nextEvent-eventTimer).toFixed(1)+'с'))+'<br>'+
      'поза: <b>'+(standT>0.5?'СТОИТ':'лежит (S)')+'</b> · мышь зажата: '+(holding?'да':'нет')+'<br>'+
      'агрессия соседа: '+activity.toFixed(1)+' / 14 · стуков в окно: '+windowTaps+'<br>'+
      'дверь открыта: '+doorTarget.toFixed(2)+' · краснота кровати: '+bedRed.toFixed(2)+'<br>'+
      'пройдено ночей: '+nightsBeaten+' · интро: '+(seenIntro?'да':'нет')+' · ★'+(gotStar?1:0)+(gotStar2?'+★':'')+'<br>'+
      'пул ночи: '+((CUSTOM.active?CUSTOM.pool:(window.GAME_DATA.NIGHT_POOL[Math.min(NIGHT,5)]||[])).filter((v,i,arr)=>arr.indexOf(v)===i).join(', '))+'<br>'+
      'побег: '+(ESC.active?('дист '+ESC.dist.toFixed(0)+' угроза '+(ESC.threat||'—')+(escPreT>=0?' [пролог]':'')):'—');
  },200);

  document.getElementById('startBtn').addEventListener('click',()=>{audio();if(AC&&AC.state==='suspended')AC.resume();if(MG)MG.gain.value=SET.vol;NIGHT=Math.max(1,Math.min(NIGHT,5));document.getElementById('start').style.display='none';stopMenuAmb();if(!seenIntro&&NIGHT===1)startCutscene();else showNightCard();});
  addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
})();
