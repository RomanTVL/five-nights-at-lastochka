
(()=>{
  "use strict";
  // ================= I18N =================
  const L=window.GAME_DATA.L;
  let LANG='ru';
  const T=k=>L[LANG][k]||k;
  function applyLang(){
    const set=(id,key,html)=>{const el=document.getElementById(id);if(el){if(html)el.innerHTML=T(key);else el.textContent=T(key);}};
    set('warnTitle','warnTitle');set('warnBody','warnBody',true);set('warnBtn','warnBtn');
    set('gameTitle','gameTitle',true);set('startBody','startBody',true);set('startBtn','startBtn');
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
  document.querySelectorAll('.langBtn').forEach(b=>b.addEventListener('click',()=>{
    LANG=b.dataset.lang;applyLang();
    document.getElementById('lang').style.display='none';
    document.getElementById('warn').style.display='flex';
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
  const brow=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.03,0.04),matSkin);brow.position.set(0,0.1,0.26);headG.add(brow);
  const nose=new THREE.Mesh(new THREE.ConeGeometry(0.03,0.06,6),matSkin);nose.rotation.x=Math.PI/2;nose.position.set(0,0.04,0.3);headG.add(nose);
  const cheek=new THREE.Mesh(new THREE.SphereGeometry(0.08,10,8),matSkin);cheek.scale.set(1.3,0.9,0.6);cheek.position.set(0,-0.02,0.24);headG.add(cheek);
  const eyeMat=M(0x000000,1,{emissive:0x992222,emissiveIntensity:0});
  const eyeL=new THREE.Mesh(new THREE.SphereGeometry(0.032,8,8),eyeMat);eyeL.position.set(-0.07,0.07,0.26);headG.add(eyeL);
  const eyeR=eyeL.clone();eyeR.position.x=0.07;headG.add(eyeR);
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
  loadSfx('voice','intro_voice.mp3'); // друг пришлёт голосовое — положи под этим именем
  loadSfx('show','WhoisrunningtheShow.mpeg'); // пасхалка 5-7-0-5-7
  loadSfx('murr','Murr.mp3'); // пасхалка-котик
  loadSfx('s67','676767.mp3'); // пасхалка 6-7-0-6-7
  loadSfx('palata','Palata13.mp3'); // фон истинной концовки
  loadSfx('krank','C418 - zweitonegoismus - 06 krank.mp3'); // фон титров
  function playSfx(key,vol){const a=SFX[key];if(!a||!a._ok)return false;
    try{a.currentTime=0;a.volume=Math.max(0,Math.min(1,(vol||1)*(SET?SET.vol/0.55:1)));a.play().catch(()=>{});return true;}catch(e){return false;}}
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
    for(const sb of SUBS)if(t>=sb[0]&&t<=sb[1]){line=sb[2];break;}
    el.textContent=line;}
  function startCutscene(){
    CUT.active=true;CUT.t=0;
    ['lboxT','lboxB','subs','skipCut'].forEach(id=>document.getElementById(id).style.display='block');
    playSfx('nature',0.65);playSfx('voice',1); // голосовое друга, если уже лежит в assets
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
  function showIntermission(){
    drawInterPic(NIGHT-2);
    const iv=document.getElementById('inter'),it=document.getElementById('interText');
    const lines=window.GAME_DATA.INTER[LANG][NIGHT-2]||[];
    iv.style.display='flex';let li=0;
    (function next(){
      if(li>=lines.length){it.style.opacity=0;
        setTimeout(()=>{iv.style.display='none';showNightCard();},900);return;}
      it.textContent=lines[li];it.style.opacity=1;
      setTimeout(()=>{it.style.opacity=0;setTimeout(()=>{li++;next();},650);},3200);})();
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
  addEventListener('pointermove',e=>move(e.clientX,e.clientY));
  addEventListener('pointerup',e=>{if(pdOnCanvas)up(e.clientX,e.clientY);pdOnCanvas=false;holding=false;});
  let holding=false;

  const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
  function click(px,py){if(!started||dead||won)return; // клики в сцену только во время игры
    ndc.x=(px/innerWidth)*2-1;ndc.y=-(py/innerHeight)*2+1;ray.setFromCamera(ndc,camera);
    const hits=ray.intersectObjects([pane,door,handB,cbody,frost,handB],false);const n=hits.length?hits[0].object.name:null;
    if(activeEvent&&activeEvent.type==='neighbor'){failNeighbor();return;}
    if(n==='cupcake'){if(AC)tone(880,'triangle',0.12,0.2,1100);
      setCue(LANG==='ru'?'он тоже пережил пять ночей':'he survived five nights too',true);
      setTimeout(()=>{if(!activeEvent)setCue('');},1800);return;}
    if(n==='boyhand'&&(!activeEvent||activeEvent.type!=='neighbor')){
      activity+=3;if(AC)tone(140,'sine',0.5,0.12,90);
      setCue(LANG==='ru'?'сосед бормочет: «не сейчас…»':'the neighbor mumbles: "not now…"',true);
      setTimeout(()=>{if(!activeEvent)setCue('');},1800);return;}
    if(n==='window'){knock();doorKnockCount++;paneMat.emissiveIntensity=1.1;setTimeout(()=>paneMat.emissiveIntensity=0.6,120);
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

  function win(){won=true;clearActive();playSfx('nature',1);
    unlocked6=true;unlockedCustom=true;nightsBeaten=Math.max(nightsBeaten,5);refreshMenuXtra();
    document.getElementById('ch').textContent='6:00';
    const w=document.getElementById('win');w.style.display='flex';drawNature();
    const seq=document.getElementById('winSeq'),fin=document.getElementById('winFinal');
    fin.style.display='none';seq.style.opacity=0;
    const lines=window.GAME_DATA.ENDING[LANG];
    let li=0;
    function next(){
      if(li>=lines.length){seq.style.opacity=0;setTimeout(()=>{fin.style.display='flex';},900);return;}
      seq.textContent=lines[li];seq.style.opacity=1;
      setTimeout(()=>{seq.style.opacity=0;setTimeout(()=>{li++;next();},750);},3800);
    }
    setTimeout(next,1700);}
  function drawNature(){const cv=document.getElementById('winCv'),g=cv.getContext('2d');cv.width=innerWidth;cv.height=innerHeight;const W=cv.width,H=cv.height;
    const sky=g.createLinearGradient(0,0,0,H*0.7);sky.addColorStop(0,'#fde6c9');sky.addColorStop(0.5,'#f6b98a');sky.addColorStop(1,'#e78a6a');g.fillStyle=sky;g.fillRect(0,0,W,H);
    g.fillStyle='rgba(255,240,200,0.95)';g.shadowColor='#ffeeba';g.shadowBlur=80;g.beginPath();g.arc(W*0.5,H*0.42,H*0.09,0,7);g.fill();g.shadowBlur=0;
    // слегка видное море у горизонта
    const sea=g.createLinearGradient(0,H*0.545,0,H*0.63);
    sea.addColorStop(0,'#8fc0d8');sea.addColorStop(1,'#4d7d9e');
    g.fillStyle=sea;g.fillRect(0,H*0.545,W,H*0.085);
    g.strokeStyle='rgba(255,244,214,0.55)';g.lineWidth=2;
    g.beginPath();g.moveTo(W*0.3,H*0.575);g.lineTo(W*0.7,H*0.575);g.stroke();
    [['#7fa86a',0.62],['#5c8a52',0.72],['#3f6b3c',0.84]].forEach(([c,y],i)=>{g.fillStyle=c;g.beginPath();g.moveTo(0,H);for(let x=0;x<=W;x+=20)g.lineTo(x,H*y+Math.sin(x*0.01+i)*20);g.lineTo(W,H);g.fill();});
    g.fillStyle='#2c4d2a';g.beginPath();g.moveTo(0,H);for(let x=0;x<=W;x+=12)g.lineTo(x,H*0.92+Math.sin(x*0.03)*8);g.lineTo(W,H);g.fill();
    // лучи солнца
    g.save();g.translate(W*0.5,H*0.42);
    for(let i=0;i<14;i++){const ang=(i/14)*Math.PI*2;
      const rg=g.createLinearGradient(0,0,Math.cos(ang)*H*0.55,Math.sin(ang)*H*0.55);
      rg.addColorStop(0,'rgba(255,235,180,0.20)');rg.addColorStop(1,'rgba(255,235,180,0)');
      g.strokeStyle=rg;g.lineWidth=7;g.beginPath();g.moveTo(Math.cos(ang)*H*0.1,Math.sin(ang)*H*0.1);
      g.lineTo(Math.cos(ang)*H*0.55,Math.sin(ang)*H*0.55);g.stroke();}
    g.restore();
    // утренний туман над холмами
    [0.60,0.70,0.80].forEach((yy,i)=>{const mg=g.createLinearGradient(0,H*yy-24,0,H*yy+24);
      mg.addColorStop(0,'rgba(255,250,240,0)');mg.addColorStop(0.5,'rgba(255,250,240,'+(0.16-i*0.03)+')');mg.addColorStop(1,'rgba(255,250,240,0)');
      g.fillStyle=mg;g.fillRect(0,H*yy-24,W,48);});
    // птицы
    g.strokeStyle='rgba(40,30,25,0.75)';g.lineWidth=2;
    [[0.3,0.25],[0.36,0.22],[0.42,0.27],[0.62,0.2],[0.68,0.24]].forEach(b=>{const bx=W*b[0],by=H*b[1];
      g.beginPath();g.moveTo(bx-8,by);g.quadraticCurveTo(bx-3,by-6,bx,by);g.quadraticCurveTo(bx+3,by-6,bx+8,by);g.stroke();});
    // высокий лес по краям
    g.fillStyle='#1d3320';
    [[0.02,0.55],[0.07,0.7],[0.12,0.5],[0.88,0.6],[0.94,0.75],[0.985,0.52]].forEach(tr=>{
      const tx=W*tr[0],th=H*tr[1];
      for(let k=0;k<4;k++){const w2=(46-k*9)*(W/900),y0=H-th*(k*0.22),hh=th*0.34;
        g.beginPath();g.moveTo(tx-w2,y0);g.lineTo(tx,y0-hh);g.lineTo(tx+w2,y0);g.closePath();g.fill();}});}

  function softReset(){
    dead=false;won=false;started=false;clock=0;eventTimer=0;activeEvent=null;activity=0;windowTaps=0;windowTapT=0;
    clearActive();bedRed=0;standT=0;standTarget=0;tgtYaw=0;tgtPitch=0;lookYaw=0;lookPitch=0;
    camera.position.copy(LIE.pos);
    const dOv=document.getElementById('deathOv');if(dOv)dOv.remove();
    document.getElementById('win').style.display='none';
    scareEl.style.display='none';flash.style.background='#fff';
    CUT.active=false;['lboxT','lboxB','subs','skipCut'].forEach(id=>document.getElementById(id).style.display='none');
    document.getElementById('nightCard').style.display='none';stopSfx('nature');stopSfx('voice');stopSfx('night');
    document.getElementById('inter').style.display='none';
    document.getElementById('escBar').style.display='none';
    document.getElementById('cert').style.display='none';
    document.getElementById('customPanel').style.display='none';
    ESC.active=false;escPreT=-1;DISCO.active=false;discoStop();cueEl.classList.remove('big');
    CUSTOM.active=false;refreshMenuXtra();
    document.getElementById('ch').textContent='12:00';
    document.getElementById('start').style.display='flex';
    if(kindMenu){stopSfx('nature');playSfx('nature',0.5);} else startMenuAmb();
  }
  window.__softReset=softReset;

  function showDeath(kind){
    ['scream1','scream2'].forEach(k=>{const a2=SFX[k];if(a2)a2.loop=false;stopSfx(k);});
    let REASON={door:T('r_door'),buff:T('r_buff'),fast:T('r_fast'),window:T('r_window'),neighbor:T('r_neighbor'),bug:T('r_bug')};
    if(window.__escDeath){ // гибель во время ПОБЕГА — свои фразы
      REASON=LANG==='ru'
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
  const ESC={active:false,z:0,dist:150,speed:4.2,threat:null,tT:0,spawnT:3,crouch:false,mash:0,frozenBy:null};
  const escG=new THREE.Group();escG.position.set(0,-120,0);escG.visible=false;scene.add(escG);
  let escTall=null,escSwarmGlow=null,escSideL=null,escSideR=null,escGate=null,escSwarm=null,escStepT=0,escFogOld=0.115;
  let escPreT=-1; // >=0 — идёт пролог (в комнате): вскочить и выбежать
  (function buildEsc(){
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(50,340),M(0x0d1410,1));ground.rotation.x=-Math.PI/2;ground.position.z=-140;escG.add(ground);
    const path=new THREE.Mesh(new THREE.PlaneGeometry(2.4,340),M(0x1a1712,1));path.rotation.x=-Math.PI/2;path.position.set(0,0.01,-140);escG.add(path);
    const tM=M(0x101a14,1),tr2=M(0x171310,1);
    for(let i=0;i<90;i++){const sx=(Math.random()<0.5?-1:1)*(2.4+Math.random()*9),sz=8-i*1.85-Math.random();
      const tk=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.14,2.8,6),tr2);tk.position.set(sx,1.4,sz);escG.add(tk);
      for(let k=0;k<3;k++){const c=new THREE.Mesh(new THREE.ConeGeometry(1.05-k*0.26,1.6,7),tM);c.position.set(sx,2.3+k*0.95,sz);escG.add(c);}}
    const mn=new THREE.Mesh(new THREE.SphereGeometry(1,20,16),M(0xeaf0fb,1,{emissive:0xeaf0fb,emissiveIntensity:1.8}));mn.position.set(7,13,-170);escG.add(mn);
    escG.add(new THREE.AmbientLight(0x2a3a52,1.7));
    // фонари вдоль всей тропы — видно и старт, и финал
    for(let li=0;li<7;li++){const lx=(li%2?1.6:-1.6),lz=-2-li*22;
      const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.05,1.5,8),M(0x14100c,1));pole.position.set(lx,0.75,lz);escG.add(pole);
      const bl=new THREE.Mesh(new THREE.SphereGeometry(0.1,10,8),M(0xffd9a0,1,{emissive:0xffc470,emissiveIntensity:1.9}));bl.position.set(lx,1.56,lz);escG.add(bl);
      const gl2=new THREE.PointLight(0xd8a24a,1.5,10,2);gl2.position.set(lx,1.65,lz);escG.add(gl2);}
    const l1=new THREE.PointLight(0x9fb8dc,2.6,60,1.6);l1.position.set(3,10,-60);escG.add(l1);
    // ворота в конце
    escGate=new THREE.Group();escGate.position.set(0,0,-152);
    [-1.6,1.6].forEach(x=>{const post=new THREE.Mesh(new THREE.BoxGeometry(0.3,3.4,0.3),M(0x2c2216,0.9));post.position.set(x,1.7,0);escGate.add(post);});
    const arch=new THREE.Mesh(new THREE.BoxGeometry(3.8,0.35,0.3),M(0x2c2216,0.9));arch.position.set(0,3.4,0);escGate.add(arch);
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
    escSwarm=new THREE.Group();escSwarm.visible=false;escG.add(escSwarm);
    for(let k=0;k<3;k++){const cb=new THREE.Group();
      const bd=new THREE.Mesh(new THREE.SphereGeometry(0.16,10,8),matDark);bd.scale.set(1.2,0.6,1.4);bd.position.y=0.13;cb.add(bd);
      [-0.04,0.04].forEach(x2=>{const e2=new THREE.Mesh(new THREE.SphereGeometry(0.016,6,6),M(0x000000,1,{emissive:0xffaa22,emissiveIntensity:1.6}));
        e2.position.set(x2,0.17,0.2);cb.add(e2);});
      cb.position.set((k-1)*0.5,0,k*0.35);escSwarm.add(cb);}
  })();
  function escCue(t){setCue(t,true);}
  function startEscape(){
    stopMenuAmb();document.getElementById('start').style.display='none';
    showNightCard(6); // NIGHT не трогаем — побег не «ночь» в прогрессии
    setTimeout(()=>{
      started=false;ESC.active=true;escPreT=0; // пролог: комната, прыжок с кровати
      ESC.z=6;ESC.dist=150;ESC.speed=4.2;ESC.threat=null;ESC.spawnT=3;ESC.crouch=false;
      camera.position.copy(LIE.pos);lookYaw=0;lookPitch=0;doorTarget=0;doorAngle=0;
      cueEl.classList.add('big');
    },2350);
  }
  function escSpawn(){
    const r=Math.random();
    if(r<0.36){ESC.threat='tall';ESC.tT=0;escTall.visible=true;escTall.position.set(0,0,ESC.z-9);
      creak();escCue(LANG==='ru'?'ЗАМРИ (S)':'FREEZE (S)');}
    else if(r<0.7){ESC.threat='swarm';ESC.tT=0;ESC.mash=0;escSwarmGlow.intensity=3.5;escSwarmGlow.position.set(0,1,ESC.z+3.2);escSwarm.visible=true;escSwarm.position.set(0,0,ESC.z+3.2);
      footsteps(true);escCue(LANG==='ru'?'ЖМИ ПРОБЕЛ! БЫСТРЕЕ!':'MASH SPACE! FASTER!');}
    else{ESC.threat='side';ESC.tT=0;ESC.sideDir=Math.random()<0.5?-1:1;
      const sil2=ESC.sideDir<0?escSideL:escSideR;sil2.visible=true;sil2.position.set(ESC.sideDir*3.0,0,ESC.z-5.5);
      knock();escCue(LANG==='ru'?(ESC.sideDir<0?'УХОДИ ВПРАВО (D)':'УХОДИ ВЛЕВО (A)'):(ESC.sideDir<0?'DODGE RIGHT (D)':'DODGE LEFT (A)'));}
  }
  function escClear(){ESC.threat=null;escTall.visible=false;escSwarmGlow.intensity=0;
    escSideL.visible=false;escSideR.visible=false;escSwarm.visible=false;escCue('');ESC.spawnT=2.5+Math.random()*2.5;}
  function escFail(kind){ESC.active=false;escPreT=-1;escG.visible=false;document.getElementById('escBar').style.display='none';scene.fog.density=escFogOld;cueEl.classList.remove('big');window.__escDeath=kind;window.__wasEscape=true;jumpscare(kind);}
  function escKey(e){
    if(e.code==='KeyS'||e.code==='ы'){ESC.crouch=true;}
    if(e.code==='Space'){e.preventDefault();if(ESC.threat==='swarm'){ESC.mash++;
      if(ESC.mash>=6){escClear();thud();}}}
    if(ESC.threat==='side'){
      const need=ESC.sideDir<0?['KeyD','ArrowRight']:['KeyA','ArrowLeft'];
      if(need.includes(e.code)){escClear();}}
  }
  addEventListener('keyup',e=>{if(ESC.active&&(e.code==='KeyS'))ESC.crouch=false;});
  function escUpdate(dt){
    if(escPreT>=0){ // ---- пролог: вскакиваем и выбегаем ----
      escPreT+=dt;
      const jump=Math.min(1,escPreT/0.4);
      const runP=Math.max(0,Math.min(1,(escPreT-0.45)/1.15));
      // прыжок: вверх с лёгким перелётом, затем рывок к двери
      const y=1.05+jump*(0.62+Math.sin(jump*Math.PI)*0.18);
      const x=-1.75+runP*1.75, z=1.0+runP*(-3.6);
      const bob=runP>0?Math.abs(Math.sin(escPreT*13))*0.08:0;
      camera.position.set(x,y+bob,z);
      camera.rotation.set(-0.03,0,Math.sin(escPreT*11)*0.015*(runP>0?1:0),'YXZ');
      if(escPreT>0.5&&doorTarget<0.9){doorTarget=0.95;thud();} // дверь распахивается
      doorAngle+=((-doorTarget)-doorAngle)*0.2;doorPivot.rotation.y=doorAngle;
      if(escPreT>=1.7){ // выбежали — включаем лес
        escPreT=-1;doorTarget=0;
        escG.visible=true;document.getElementById('escBar').style.display='block';
        escFogOld=scene.fog.density;scene.fog.density=0.045;
        if(SET.shake){flash.style.transition='none';flash.style.opacity='0.7';
          requestAnimationFrame(()=>{flash.style.transition='opacity .4s';flash.style.opacity='0';});}
        escCue(LANG==='ru'?'БЕГИ. Не оглядывайся.':'RUN. Do not look back.');setTimeout(()=>escCue(''),2600);}
      return;}
    const moving=!(ESC.crouch)&&!(ESC.threat==='swarm');
    if(moving){ESC.z-=ESC.speed*dt;ESC.dist-=ESC.speed*dt;}
    document.getElementById('escFill').style.width=Math.max(0,Math.min(100,(1-ESC.dist/150)*100))+'%';
    // камера: бег с покачиванием
    const nowS=performance.now()/1000;
    const bob=moving?Math.abs(Math.sin(nowS*7.5))*0.1:0;
    const jit=(ESC.threat?0.03:0.012);
    camera.position.set(Math.sin(nowS*3.4)*0.07+(Math.random()-0.5)*jit,
      -118.4+bob+(ESC.crouch?-0.35:0)+(Math.random()-0.5)*jit,ESC.z);
    camera.rotation.set(-0.02+(Math.random()-0.5)*jit*0.5,Math.sin(nowS*0.7)*0.05,(Math.random()-0.5)*jit*0.4,'YXZ');
    // живой лес: шаги, редкая сова, сердце при угрозе
    if(moving){escStepT-=dt;if(escStepT<=0){escStepT=0.34;if(AC){noise(0.05,0.14,420);}}}
    if(ESC.threat&&AC&&Math.floor(nowS*2)!==Math.floor((nowS-dt)*2))tone(58,'sine',0.14,0.4,40);
    if(AC&&Math.random()<dt*0.05)tone(620,'sine',0.5,0.05,540); // сова где-то
    if(ESC.threat){ESC.tT+=dt;
      if(ESC.threat==='tall'){
        if(!ESC.crouch&&(ESC.z-escTall.position.z)<4.5)escFail('door');   // подошёл к нему не замерев
        else if(ESC.tT>2.4&&ESC.crouch){escClear();}                     // он прошёл мимо
        else if(ESC.tT>4.5)escFail('door');}
      else if(ESC.threat==='swarm'){escSwarmGlow.position.z=ESC.z+3.2-ESC.tT*1.0;escSwarm.position.z=escSwarmGlow.position.z;escSwarm.children.forEach((cb,k)=>{cb.position.y=Math.abs(Math.sin(performance.now()/1000*12+k))*0.08;});
        if(ESC.tT>2.6)escFail('fast');}
      else if(ESC.threat==='side'){const sil2=ESC.sideDir<0?escSideL:escSideR;
        sil2.position.x=ESC.sideDir*(3.5-ESC.tT*1.1);sil2.position.z=ESC.z-7+ESC.tT*2;
        if(ESC.tT>2.2)escFail('window');}}
    else{ESC.spawnT-=dt;if(ESC.spawnT<=0&&ESC.dist>12)escSpawn();}
    if(ESC.dist<=0){ // ВОРОТА
      ESC.active=false;escG.visible=false;document.getElementById('escBar').style.display='none';scene.fog.density=escFogOld;cueEl.classList.remove('big');
      showCertificate();}
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
      const L7=LANG==='ru'
        ?['Сегодня никто не придёт.','Долговязый устал искать. Тварь наелась тишины.','Те, у окна, просто хотят посмотреть на живого.','Смена 1989 года. Их так и не забрали домой.','Побудь с ними до утра. Им хватит.','теперь они спят. спасибо, что дослушал.']
        :['No one is coming tonight.','The tall one is tired of searching. The little thing is full of silence.','The ones at the window just want to look at someone alive.','Session of 1989. No one ever came to take them home.','Stay with them till morning. That will be enough.','now they sleep. thank you for listening.'];
      let li7=0;
      (function seq(){if(!DISCO.active)return;
        if(li7>=L7.length){discoStop();kindMenu=true;nightsBeaten=Math.max(nightsBeaten,7);rollCredits();return;}
        escCue(L7[li7]);setTimeout(()=>{escCue('');setTimeout(()=>{li7++;seq();},900);},4300);})();
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
    if(code==='5-7-0-5-7'){closeCP();showEgg();return;}
    if(code==='6-7-0-6-7'){closeCP();scare67();return;}
    if(code==='1-2-3-4-5'||code==='5-4-3-2-1'){closeCP();catScare();return;}
    if(code==='7-7-7-7-7'){closeCP(); // ДЖЕКПОТ
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
      started=false;CUSTOM.active=false;document.getElementById('start').style.display='flex';
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
    const cr=document.getElementById('credits'),col=document.getElementById('creditsCol');
    cr.style.display='block';
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
      <div class="role">${ru?'ЛЕГЕНДА ЛАГЕРЯ «ЛАСТОЧКА»':'LEGEND OF CAMP SWALLOW'}</div><div class="name">Роман</div>
      <div class="role">${ru?'ИКГ':'ICG'}</div><div class="name">Илья · spugage</div>
      <div class="role">${ru?'КОМАНДА':'TEAM'}</div><div class="name">Богдан · oboyudnenk1y</div>
      <div class="name">Ильдар · Ilyrc</div>
      <div class="role" style="margin-top:60px">${ru?'СМЕНА 1989 ГОДА':'SESSION OF 1989'}</div>
      <div class="name" style="color:#8b0e0e">${ru?'не дожила до подъёма':'never lived to see the morning'}</div>
      <div class="role" style="margin-top:80px">${ru?'музыка':'music'}</div><div class="name" style="font-size:16px">C418 — krank</div>
      <div class="role" style="margin-top:110px;font-size:18px;color:#c9c3b2">${ru?'СПАСИБО ЗА ИГРУ':'THANKS FOR PLAYING'}</div>
      <div style="height:12vh"></div>`;
    // музыка титров: пропускаем первые 10 секунд тишины
    stopSfx('nature');
    const km=SFX['krank'];
    if(km&&km._ok){try{km.currentTime=10;km.volume=0.7;km.loop=false;km.play().catch(()=>{});}catch(e){playSfx('nature',0.55);}}
    else playSfx('nature',0.55);
    // медленная прокрутка снизу вверх; остановка так, чтобы «спасибо» встало по центру
    let y=innerHeight,stopped=false,scrollDone=false;
    function scroll(){if(stopped)return;
      const endY=innerHeight*0.5-col.offsetHeight+innerHeight*0.30; // «спасибо» ~в центре
      if(y>endY){y-=0.32;col.style.top=y+'px';requestAnimationFrame(scroll);} // ещё медленнее
      else{col.style.top=endY+'px';stopped=true;scrollDone=true;
        const hint=document.createElement('div');hint.id='crHint';
        hint.style.cssText='position:absolute;bottom:7vh;left:0;right:0;text-align:center;font-family:Share Tech Mono;font-size:13px;letter-spacing:0.25em;color:rgba(200,195,178,0.75);animation:menuIn 1.2s ease both;z-index:2;';
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
      stopSfx('krank');stopSfx('nature');
      document.getElementById('trueEnd').style.display='none';
      const hh=document.getElementById('crHint');if(hh)hh.remove();
      kindMenu=true;softReset();}
    addEventListener('keydown',finishCr);
  }

  // тайная пасхалка A: долгий немигающий взгляд в окно → детское лицо на миг
  let winStareT=0;
  function checkStare(dt){
    const lookingWindow=lookYaw<-0.28&&Math.abs(lookPitch)<0.15&&standT<0.3&&!activeEvent;
    if(lookingWindow){winStareT+=dt;
      if(winStareT>12&&winStareT<12.1){paneMat.emissiveIntensity=2.2;
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

  function refreshMenuXtra(){
    const b6=document.getElementById('btnN6'),b7=document.getElementById('btnN7'),bc=document.getElementById('btnCustom');
    b6.style.display=unlocked6?'inline-block':'none';
    b7.style.display=unlocked7?'inline-block':'none';
    bc.style.display=unlockedCustom?'inline-block':'none';
    b6.textContent=LANG==='ru'?'НОЧЬ 6: ПОБЕГ':'NIGHT 6: ESCAPE';
    b7.textContent=LANG==='ru'?'НОЧЬ 7: ???':'NIGHT 7: ???';
    bc.textContent=LANG==='ru'?'СВОЯ НОЧЬ':'CUSTOM NIGHT';
    const st=document.getElementById('star');
    st.style.display=(gotStar||gotStar2)?'inline':'none';
    st.textContent=gotStar2?(gotStar?'★★':'★'):'★';
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

  // ================= LOOP =================
  let last=0,tSec=0,silKnockLatch=false;
  function animate(nw){requestAnimationFrame(animate);const dt=Math.min((nw-last)/1000||0,0.05);last=nw;tSec+=dt;
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
    if(started&&!dead&&!won)checkStare(dt);
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
  document.getElementById('warnBtn').addEventListener('click',()=>{document.getElementById('warn').style.display='none';document.getElementById('diffpick').style.display='flex';startMenuAmb();});
  document.querySelectorAll('.dpcard').forEach(c=>c.addEventListener('click',()=>{
    SET.diff=parseFloat(c.dataset.diff);
    c.style.borderColor='#c94444';c.style.transform='scale(1.06)';c.style.boxShadow='0 0 40px rgba(201,68,68,0.35)';
    setTimeout(()=>{document.getElementById('diffpick').style.display='none';},450);
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
        const flick=kindMenu?1:(Math.random()<0.05?0.3:1);
        if(kindMenu){ // тёплое, спящее лицо
          const cx=W*0.55,cy=H*0.5,r=Math.min(W,H)*0.42;
          const grd=mg.createRadialGradient(cx,cy,r*0.1,cx,cy,r*1.1);
          grd.addColorStop(0,'rgba(190,165,120,0.22)');grd.addColorStop(0.7,'rgba(60,45,28,0.5)');grd.addColorStop(1,'rgba(0,0,0,0)');
          mg.fillStyle=grd;mg.beginPath();mg.ellipse(cx,cy,r*0.72,r,0,0,7);mg.fill();
          mg.strokeStyle='rgba(240,217,140,0.8)';mg.lineWidth=4;
          [-1,1].forEach(sn=>{mg.beginPath();mg.arc(cx+sn*r*0.3,cy-r*0.13,r*0.1,0.15*Math.PI,0.85*Math.PI);mg.stroke();}); // закрытые глаза
          mg.beginPath();mg.arc(cx,cy+r*0.32,r*0.16,0.1*Math.PI,0.9*Math.PI);mg.stroke(); // улыбка
          requestAnimationFrame(draw);return;}
        // большая морда = монстр ТЕКУЩЕЙ ночи, полупрозрачная во тьме
        const FK=['door','fast','neighbor','bug','buff'][Math.min(NIGHT,5)-1]||'door';
        off.width=W;off.height=H; // свой контекст: тени/альфа SCARE не протекают наружу
        try{SCARE[FK](og,W,H,t*0.35);}catch(e){}
        mg.globalAlpha=0.32*flick;mg.drawImage(off,0,0);mg.globalAlpha=1;
        const fade=mg.createRadialGradient(W*0.55,H*0.5,Math.min(W,H)*0.2,W*0.55,H*0.5,Math.max(W,H)*0.62);
        fade.addColorStop(0,'rgba(0,0,0,0)');fade.addColorStop(1,'rgba(0,0,0,0.94)');
        mg.fillStyle=fade;mg.fillRect(0,0,W,H);
        // вспышка глаз при кликах (пасхалка) — поверх любой морды
        const angry=(performance.now()-menuFaceAngryT)<450;
        if(angry){const cx=W*0.55,cy=H*0.5,r=Math.min(W,H)*0.42;
          mg.fillStyle='rgba(255,30,30,0.95)';mg.shadowColor='#a11';mg.shadowBlur=40;
          [-1,1].forEach(sn=>{mg.beginPath();mg.arc(cx+sn*r*0.3,cy-r*0.15,r*0.055,0,7);mg.fill();});mg.shadowBlur=0;}
      }
      requestAnimationFrame(draw);
    } draw();})();

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
    started=false;
    document.getElementById('start').style.display='flex';
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
  // коды вводятся ползунками в «Своей ночи» (см. cpStart)

  // ===== SECRET: menu idle scare + gallery =====
  let galleryUnlocked=false,idleFired=false,menuIdle=0,menuFaceClicks=0;
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
  function menuIdleScare(){
    idleFired=true;audio();if(AC&&AC.state==='suspended')AC.resume();
    scareCv.width=innerWidth;scareCv.height=innerHeight;scareEl.style.zIndex='72';scareEl.style.display='block';
    menuScream();
    if(SET.shake){flash.style.transition='none';flash.style.opacity='1';
      requestAnimationFrame(()=>{flash.style.transition='opacity .3s';flash.style.opacity='0';});}
    const t0=performance.now();
    (function paint(nw){const t=(nw-t0)/1000;
      const sh=SET.shake?(t<0.8?(Math.random()-0.5)*40:0):0;
      sx.save();sx.translate(sh,sh*0.6);drawEye(sx,scareCv.width,scareCv.height,t);sx.restore();
      if(t<2.2)requestAnimationFrame(paint);
      else{scareEl.style.display='none';scareEl.style.zIndex='';unlockGallery(true);}})(t0);}
  function unlockGallery(open){
    galleryUnlocked=true;
    const b=document.getElementById('openGallery');
    b.style.display='inline-block';b.textContent=LANG==='ru'?'ГАЛЕРЕЯ':'GALLERY';
    if(open)showGallery();}
  function showGallery(){
    document.getElementById('galTitle').textContent=LANG==='ru'?'СЕКРЕТНАЯ ГАЛЕРЕЯ':'SECRET GALLERY';
    document.getElementById('galSub').textContent=LANG==='ru'?'ты досидел до них — теперь они твои':'you waited long enough — now they are yours';
    const grid=document.getElementById('galGrid');grid.innerHTML='';
    const names={door:'Дверной',buff:'Высокий',fast:'Быстрый',window:'Из окна',neighbor:'Сосед',bug:'Из-под кровати'};
    Object.keys(SCARE).forEach(k=>{
      const gi=document.createElement('div');gi.className='gi';
      const c=document.createElement('canvas');c.width=180;c.height=180;
      SCARE[k](c.getContext('2d'),180,180,1.1);
      const l=document.createElement('div');l.className='gl';l.textContent=names[k]||k;
      gi.style.cursor='pointer';gi.addEventListener('click',()=>openScarePreview(k));
      gi.appendChild(c);gi.appendChild(l);grid.appendChild(gi);});
    // уникальный глаз — седьмой экспонат
    const gi=document.createElement('div');gi.className='gi';
    const c=document.createElement('canvas');c.width=180;c.height=180;drawEye(c.getContext('2d'),180,180,0.8);
    const l=document.createElement('div');l.className='gl';l.textContent='???';
    gi.style.cursor='pointer';gi.addEventListener('click',()=>openScarePreview('eye'));
    gi.appendChild(c);gi.appendChild(l);grid.appendChild(gi);
    const snd=document.getElementById('galSnd');snd.innerHTML='';
    [['night','Первая ночь'],['scream1','Scream 1'],['scream2','Scream 2'],['nature','Природа']].forEach(([k,nm])=>{
      const b2=document.createElement('button');b2.textContent='▶ '+nm;
      b2.addEventListener('click',()=>{stopSfx('nature');playSfx(k,1);});snd.appendChild(b2);});
    document.getElementById('gallery').style.display='flex';}
  function openScarePreview(kind){
    const v=document.getElementById('galView'),c=document.getElementById('galViewCv');
    v.style.display='block';c.width=innerWidth;c.height=innerHeight;
    const g2=c.getContext('2d');let run=true;const t0=performance.now();
    if(kind==='eye'){menuScream();}
    else{const fk=(kind==='door'||kind==='fast'||kind==='neighbor')?'scream1':'scream2';
      if(!playSfx(fk,0.85))scream(kind);}
    (function pl(nw){if(!run)return;const t=((nw-t0)/1000)%3.2;
      if(kind==='eye')drawEye(g2,c.width,c.height,t);else SCARE[kind](g2,c.width,c.height,t);
      requestAnimationFrame(pl);})(t0);
    v.onclick=()=>{run=false;v.style.display='none';stopSfx('scream1');stopSfx('scream2');};
  }
  document.getElementById('galClose').addEventListener('click',()=>{document.getElementById('gallery').style.display='none';stopSfx('nature');stopSfx('night');stopSfx('scream1');stopSfx('scream2');});
  document.getElementById('openGallery').addEventListener('click',showGallery);
  setInterval(()=>{
    const st=document.getElementById('start');
    if(st.style.display!=='none'&&!CUT.active&&!started&&!idleFired){menuIdle+=0.5;if(menuIdle>=60)menuIdleScare();}
  },500);
  ['pointermove','pointerdown','keydown'].forEach(ev=>addEventListener(ev,()=>{menuIdle=0;}));

  // ===== EASTER EGGS =====
  // 1) набери 1989 — они помнят
  let keyBuf='';
  addEventListener('keydown',e=>{if(e.key.length===1){keyBuf=(keyBuf+e.key).slice(-8);
    if(keyBuf.endsWith('1989')){keyBuf='';neighborTurn();
      const ch=document.getElementById('ch');const old=ch.textContent;
      ch.textContent='5:80';ch.style.color='#c94444';    // сломанное время
      ghost.visible=true;                                  // он всё ещё ждёт подъёма
      setCue(LANG==='ru'?'они помнят':'they remember',true);
      setTimeout(()=>{ch.textContent=old;ch.style.color='';setCue('');ghost.visible=false;},10000);}}});
  // 2) трижды кликни по луне — кровавая луна
  // (пасхалка с луной заменена на руку соседа)
  // 3) пять кликов по лицу в меню — оно замечает тебя и открывает галерею
  document.getElementById('start').addEventListener('click',e=>{
    if(e.target.tagName==='BUTTON')return; // кнопки не в счёт
    if(e.clientX>innerWidth*0.45){ // правая половина — где морда
      menuFaceClicks++;menuFaceAngryT=performance.now();
      if(menuFaceClicks===5){audio();if(AC)tone(120,'sine',1.4,0.2,60);unlockGallery(false);}}});

  // ===== DEV MENU =====
  const devP=document.getElementById('devPanel');
  addEventListener('keydown',e=>{if(e.code==='Backquote'){e.preventDefault();devP.style.display=devP.style.display==='none'?'block':'none';}});
  document.querySelectorAll('.devNight').forEach(bb=>bb.addEventListener('click',()=>{HOUR_SECONDS=parseInt(bb.dataset.hs);}));
  document.getElementById('devNightUp').addEventListener('click',()=>{NIGHT=Math.min(5,NIGHT+1);});
  document.getElementById('devNight1').addEventListener('click',()=>{NIGHT=1;});
  document.getElementById('devSkip').addEventListener('click',()=>{clock+=HOUR_SECONDS;});
  document.getElementById('devWin').addEventListener('click',()=>{clock=HOURS*HOUR_SECONDS-0.05;});
  document.getElementById('devClear').addEventListener('click',()=>{clearActive();});
  document.querySelectorAll('.devEv').forEach(bb=>bb.addEventListener('click',()=>{clearActive();startEvent(bb.dataset.ev);}));
  document.getElementById('devEsc').addEventListener('click',()=>{softReset();startEscape();});
  document.getElementById('devMem').addEventListener('click',()=>{softReset();discoStart();});
  document.getElementById('devCert').addEventListener('click',()=>{showCertificate();});
  document.getElementById('devInter').addEventListener('click',()=>{if(NIGHT<2)NIGHT=2;started=false;clearActive();showIntermission();});
  document.getElementById('devUnlock').addEventListener('click',()=>{unlocked6=true;unlocked7=true;unlockedCustom=true;gotStar=true;gotStar2=true;nightsBeaten=7;seenIntro=true;refreshMenuXtra();});
  document.getElementById('devSecret').addEventListener('click',()=>{softReset();startSecretNight();});
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
