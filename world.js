import * as THREE from './vendor/three.module.min.js';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

// The room, props, scenery and motion are geometry/shaders, not a background plate.
// The earlier artwork is kept in the HTML solely as a WebGL failure fallback.
const canvas = document.getElementById('studio-canvas');
const viewport = document.querySelector('.scene-viewport');
const controls = document.getElementById('camera-controls');
const exploreButton = document.getElementById('explore-toggle');
const exploreLabel = document.getElementById('explore-label');
const resetButton = document.getElementById('camera-reset');
const body = document.body;
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: false });
} catch (_) { canvas.dataset.renderer = 'image-fallback'; }
if (renderer) buildStudio();

function buildStudio() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#9cbec1');
  scene.fog = new THREE.Fog('#a5bcb0', 48, 130);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 140);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const environment = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(environment, 0.04);
  scene.environment = env.texture;
  scene.environmentIntensity = 0.34;
  environment.dispose(); pmrem.dispose();

  let seed = 49;
  const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
  const timeUniform = { value: 0 };
  const animated = [], reels = [], meters = [], pickables = [], targets = new Map();
  const standard = (color, roughness = 0.65, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const mat = {
    wall: standard('#173d46', .92), trim: standard('#163137', .62), wood: standard('#885031', .78),
    walnut: standard('#5d3526', .5), edge: standard('#3d2420'), black: standard('#14252a', .58),
    silver: standard('#bbc8c4', .32, .78), gold: standard('#b99961', .37, .62),
    orange: standard('#c65f31', .87), paper: standard('#e3d9b9', .94), mint: standard('#a9b9a3', .84),
    tape: standard('#3c2b23', .86), soil: standard('#1d2420'), pot: standard('#b68a68', .8),
    green: standard('#3d765a', .8), darkGreen: standard('#204d40', .8), keys: standard('#263b3d', .6)
  };
  function mesh(geometry, material, parent, x=0, y=0, z=0) {
    const m = new THREE.Mesh(geometry, material); m.position.set(x,y,z);
    m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  function box(w,h,d,material,parent,x=0,y=0,z=0,r=.02) {
    return mesh(r ? new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/3,h/3,d/3)) : new THREE.BoxGeometry(w,h,d),material,parent,x,y,z);
  }
  function cylinder(rt,rb,h,material,parent,x=0,y=0,z=0,segments=32) {
    return mesh(new THREE.CylinderGeometry(rt,rb,h,segments),material,parent,x,y,z);
  }
  function sphere(r,material,parent,x,y,z,sx=1,sy=1,sz=1) {
    const m = mesh(new THREE.SphereGeometry(r,20,12),material,parent,x,y,z); m.scale.set(sx,sy,sz); return m;
  }
  function group(x,y,z,parent=scene) { const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g; }
  function wire(points,radius,material,parent) {
    const curve = new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    return mesh(new THREE.TubeGeometry(curve,40,radius,7,false),material,parent);
  }
  function register(g,key,anchor) {
    g.userData.section=key;g.userData.baseY=g.position.y;
    g.traverse(m=>{if(m.isMesh){m.userData.section=key;pickables.push(m);}});
    targets.set(key,{ group:g, anchor:new THREE.Vector3(...anchor), element:document.querySelector(`.scene-hotspot[data-open="${key}"]`), hover:0 });
  }
  const noise = `float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}`;
  mat.wood.onBeforeCompile = s => {
    s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vGrain;').replace('#include <begin_vertex>','#include <begin_vertex>\nvGrain=position;');
    s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vGrain;\n'+noise).replace('#include <color_fragment>',`#include <color_fragment>
    float grain=sin(vGrain.z*56.+noise(vGrain.xz*vec2(.8,2.))*8.+sin(vGrain.x*1.3)*1.2);
    float pores=noise(vGrain.xz*vec2(8.,180.));diffuseColor.rgb*=.94+.025*grain+.055*pores;`);
  };

  // Daylight, a warm desk lamp and soft bounce light.
  const skyLight = new THREE.HemisphereLight('#c9e5e1','#5c4130',1.25);scene.add(skyLight);
  const sun = new THREE.DirectionalLight('#ffe0a7',3.25);sun.position.set(10,12,-5);sun.target.position.set(-3,0,2);scene.add(sun,sun.target);
  sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-17,right:17,top:15,bottom:-12,near:.5,far:45});sun.shadow.bias=-.0003;sun.shadow.normalBias=.025;sun.shadow.radius=4;
  const fill=new THREE.PointLight('#9ed9d8',35,25,2);fill.position.set(-5,5,7);scene.add(fill);
  const windowLight=new THREE.SpotLight('#ffe4bd',135,25,.9,.8,1.4);windowLight.position.set(7,7,-3.5);windowLight.target.position.set(-3,.5,1);scene.add(windowLight,windowLight.target);

  // An open architectural room. The blank left wall leaves breathing room for the type.
  box(100,.28,18,mat.walnut,scene,0,-2.6,-1,0);
  box(44,13,.32,mat.wall,scene,-20.5,3.8,-5.3,0);
  box(40,13,.32,mat.wall,scene,34.45,3.8,-5.3,0);
  box(13,2.8,.4,mat.wall,scene,8,-1.2,-5.3,0);
  box(.4,12,.5,mat.wall,scene,14.4,3.5,-5.2,0);
  box(14,.4,.6,mat.wall,scene,8,9.8,-5.3,0);
  box(44,.12,.15,mat.trim,scene,-20.5,-2.22,-5.08,0);
  // Wide mullioned window: actual openings look onto the animated landscape.
  for(const x of [1.55,5.8,10.05,14.3]) box(.13,9.4,.23,mat.trim,scene,x,5,-5.05,.015);
  for(const y of [.6,4.9,9.7]) box(13,.14,.23,mat.trim,scene,7.95,y,-5.05,.015);
  box(13,.18,.78,mat.wood,scene,7.9,.52,-4.94,.03);
  const glass = mesh(new THREE.PlaneGeometry(12.6,8.9),new THREE.MeshPhysicalMaterial({color:'#b4e0df',transparent:true,opacity:.035,roughness:.15,metalness:.05,depthWrite:false}),scene,7.9,5.1,-5.13);glass.castShadow=false;

  // A real landscape gives the room depth. Distant hills and trees move independently.
  const skyMat = new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{uTime:timeUniform},vertexShader:`varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec3 vP;uniform float uTime;${noise}
  void main(){vec3 d=normalize(vP);float h=smoothstep(-.25,.4,d.y);vec3 col=mix(vec3(.68,.8,.75),vec3(.14,.42,.62),h);float clouds=noise(d.xz*5.+uTime*.004)*noise(d.xz*13.-uTime*.003);col=mix(col,vec3(.88,.88,.77),smoothstep(.33,.56,clouds)*.25);gl_FragColor=vec4(col,1.);}`});
  const sky=mesh(new THREE.SphereGeometry(90,24,12),skyMat,scene,0,0,-16);sky.castShadow=false;sky.receiveShadow=false;
  const groundMat=standard('#365e3c',1);
  const ground=mesh(new THREE.PlaneGeometry(150,120),groundMat,scene,0,-2.65,-42);ground.rotation.x=-Math.PI/2;ground.castShadow=false;
  for(let i=0;i<14;i++) {
    const hill=mesh(new THREE.IcosahedronGeometry(1,2),standard(i<7?'#3e6446':'#53755b',1),scene,(random()-.4)*80,-4,-24-random()*35);
    hill.scale.set(8+random()*15,1.8+random()*2.7,7+random()*10);hill.castShadow=false;
  }
  const leafCanvas=document.createElement('canvas');leafCanvas.width=64;leafCanvas.height=64;
  const lc=leafCanvas.getContext('2d');lc.fillStyle='#fff';
  lc.beginPath();lc.moveTo(8,33);lc.bezierCurveTo(17,7,43,9,57,27);lc.bezierCurveTo(52,48,25,54,8,33);lc.fill();
  const leafTexture=new THREE.CanvasTexture(leafCanvas);
  const outdoorLeaves=new THREE.MeshStandardMaterial({map:leafTexture,alphaTest:.5,side:THREE.DoubleSide,roughness:1,metalness:0});
  outdoorLeaves.onBeforeCompile=s=>{s.uniforms.uTime=timeUniform;s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nuniform float uTime;').replace('#include <begin_vertex>',`#include <begin_vertex>
    vec3 lp=(instanceMatrix*vec4(position,1.)).xyz;
    transformed.x+=sin(lp.z*.55+uTime*.75)*.12;
    transformed.y+=sin(lp.x*.8+uTime*.6)*.035;`);};
  const leafInstances=[];
  const leafPalette=['#36664c','#487756','#5b8559','#719861','#91a66c'].map(c=>new THREE.Color(c));
  const trunkMat=standard('#675942',.93);
  function tree(x,z,scale) {
    const g=group(x,-2.6,z);g.scale.setScalar(scale);
    cylinder(.1,.22,4.2,trunkMat,g,0,2.1,0,8);
    const clumps=[];
    for(let j=0;j<7;j++) {
      const a=j*2.4, cx=Math.cos(a)*(j? .85:0),cy=3.4+random()*1.4,cz=Math.sin(a)*.8;
      clumps.push([cx,cy,cz]);
      if(j<4)wire([[0,2,0],[cx*.5,cy*.8,cz*.5],[cx,cy,cz]],.045,trunkMat,g);
    }
    for(let j=0;j<1000;j++) {
      const c=clumps[j%clumps.length],az=random()*Math.PI*2,vy=random()*2-1,r=Math.cbrt(random()),vx=Math.sqrt(1-vy*vy);
      const px=c[0]+Math.cos(az)*vx*r*1.22,py=c[1]+vy*r*.85,pz=c[2]+Math.sin(az)*vx*r;
      leafInstances.push({x:x+px*scale,y:-2.6+py*scale,z:z+pz*scale,size:(.15+random()*.18)*scale,color:leafPalette[Math.min(4,Math.floor((vy+1)*2.2))],rz:random()*6.28,ry:(random()-.5)*1.5});
    }
  }
  for(let i=0;i<22;i++)tree(-12+random()*60,-22-random()*38,.8+random()*1.4);
  tree(12,-16,1.65);tree(20,-20,1.8);tree(5,-27,1.1);
  const leafMesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),outdoorLeaves,leafInstances.length);
  const leafTransform=new THREE.Object3D();
  leafInstances.forEach((p,i)=>{leafTransform.position.set(p.x,p.y,p.z);leafTransform.rotation.set(.1,p.ry,p.rz);leafTransform.scale.set(p.size,p.size*.8,p.size);leafTransform.updateMatrix();leafMesh.setMatrixAt(i,leafTransform.matrix);leafMesh.setColorAt(i,p.color);});
  leafMesh.instanceMatrix.needsUpdate=true;leafMesh.instanceColor.needsUpdate=true;scene.add(leafMesh);
  const waterMat=new THREE.ShaderMaterial({transparent:false,uniforms:{uTime:timeUniform},vertexShader:`varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec3 vP;uniform float uTime;${noise}
  void main(){float waves=sin(vP.x*2.1+vP.y*.5+uTime*.7)*sin(vP.y*3.7-uTime*.5);float glint=pow(max(0.,waves),14.);vec3 c=mix(vec3(.17,.35,.39),vec3(.45,.65,.60),noise(vP.xy*.2));c+=glint*.17;gl_FragColor=vec4(c,1.);}`});
  const water=mesh(new THREE.PlaneGeometry(55,7),waterMat,scene,12,-2.59,-16);water.rotation.x=-Math.PI/2;water.castShadow=false;

  // Desk, underframe and a few quiet room details.
  box(18,.36,6,mat.wood,scene,0,.38,0,.09);
  box(18,.08,6.03,mat.walnut,scene,0,.19,0,.025);
  for(const x of [-7.7,7.7]) for(const z of [-2.1,2.1]) box(.28,2.7,.28,mat.trim,scene,x,-1.17,z,.025);
  box(15,.17,.18,mat.trim,scene,0,-1.9,-2.1,.02);
  // Contact shadows keep small props visually grounded without extra shadow lights.
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;
  const sc=shadowCanvas.getContext('2d');const grad=sc.createRadialGradient(64,64,5,64,64,64);grad.addColorStop(0,'rgba(6,17,18,.6)');grad.addColorStop(.5,'rgba(6,17,18,.25)');grad.addColorStop(1,'rgba(6,17,18,0)');sc.fillStyle=grad;sc.fillRect(0,0,128,128);
  const shadowTexture=new THREE.CanvasTexture(shadowCanvas);
  function contact(x,z,w,d,opacity=.7) {const m=mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,opacity,depthWrite:false}),scene,x,.568,z);m.rotation.x=-Math.PI/2;m.castShadow=false;}

  // Projects: a terracotta folio with cream paper, string and brass buttons.
  const folder=group(-4.65,.6,.9);folder.rotation.y=.14;
  box(2.85,.06,1.95,mat.orange,folder,0,.04,0,.04);
  box(2.57,.075,1.72,mat.paper,folder,.19,.1,.13,.015);
  const folderTop=box(2.85,.045,1.55,mat.orange,folder,0,.155,-.2,.025);folderTop.rotation.x=.025;
  box(.85,.06,.18,mat.orange,folder,-.7,.1,-1,.015);
  for(const z of [-.35,.16]) cylinder(.095,.095,.035,mat.gold,folder,.72,.2,z,20);
  wire([[.72,.22,-.35],[.77,.225,-.1],[.7,.225,.16]],.009,mat.tape,folder);
  contact(-4.65,.9,3.7,2.65);register(folder,'projects',[0,.23,0]);

  // Tape recorder: separate rotating metal spools, tape, VU needles and keys.
  const recorder=group(-.4,.6,-.6);recorder.rotation.y=-.05;
  box(3.4,2.18,.87,mat.walnut,recorder,0,1.12,0,.12);
  box(3.15,2.04,.09,mat.silver,recorder,0,1.14,.45,.035);
  for(const x of [-1.67,1.67]) box(.13,2.2,.94,mat.wood,recorder,x,1.12,0,.05);
  box(3.1,.34,.1,mat.black,recorder,0,.31,.52,.025);
  function reel(x) {
    const g=group(x,1.64,.54,recorder);
    const tape=cylinder(.62,.62,.1,mat.tape,g,0,0,0,64);tape.rotation.x=Math.PI/2;
    const shape=new THREE.Shape();shape.absarc(0,0,.65,0,Math.PI*2,false);
    for(let j=0;j<3;j++) { const a=j*Math.PI*2/3;const hole=new THREE.Path();
      hole.moveTo(Math.cos(a-.18)*.23,Math.sin(a-.18)*.23);
      hole.lineTo(Math.cos(a-.46)*.53,Math.sin(a-.46)*.53);
      hole.absarc(0,0,.53,a-.46,a+.46,false);
      hole.lineTo(Math.cos(a+.18)*.23,Math.sin(a+.18)*.23);hole.closePath();shape.holes.push(hole);
    }
    mesh(new THREE.ExtrudeGeometry(shape,{depth:.025,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.006,bevelThickness:.006,curveSegments:32}),mat.silver,g,0,0,.08);
    const rim=mesh(new THREE.TorusGeometry(.645,.017,8,64),mat.silver,g,0,0,.08);rim.castShadow=false;
    const hub=cylinder(.14,.14,.11,mat.gold,g,0,0,.13,32);hub.rotation.x=Math.PI/2;
    const pin=cylinder(.055,.055,.135,mat.black,g,0,0,.17,20);pin.rotation.x=Math.PI/2;
    reels.push(g);return g;
  }
  reel(-.83);reel(.83);
  for(const x of [-.42,.42]) {const roller=cylinder(.07,.07,.13,mat.silver,recorder,x,.91,.59,20);roller.rotation.x=Math.PI/2;}
  wire([[-1.18,1.12,.6],[-.43,.89,.6],[.43,.89,.6],[1.18,1.12,.6]],.011,mat.tape,recorder);
  for(const x of [-.58,.11]) {
    box(.54,.27,.07,mat.black,recorder,x,.65,.54,.015);
    box(.47,.19,.008,mat.paper,recorder,x,.65,.58,.004);
    for(let j=0;j<7;j++) box(.006,.025,.005,mat.tape,recorder,x-.18+j*.06,.7,.588,0);
    const pivot=group(x,.578,.595,recorder);box(.008,.15,.008,mat.orange,pivot,0,.07,0,.002);meters.push(pivot);
  }
  for(let i=0;i<5;i++) box(.25,.13,.12,i===4?mat.orange:mat.silver,recorder,-1.12+i*.3,.32,.61,.015);
  for(const x of [.8,1.25]) {const knob=cylinder(.13,.13,.13,mat.black,recorder,x,.56,.57,32);knob.rotation.x=Math.PI/2;
    const dial=cylinder(.108,.108,.14,mat.silver,recorder,x,.56,.6,32);dial.rotation.x=Math.PI/2;}
  for(let i=0;i<14;i++) box(.022,.18,.015,mat.trim,recorder,-1.36+i*.044,.72,.515,.002);
  contact(-.4,-.5,4.3,2.2,.85);register(recorder,'conversations',[0,1.7,.55]);

  // Podcast microphone and its cable, physically separate from the recorder.
  const mic=group(2.08,.59,-.4);mic.rotation.y=-.14;
  cylinder(.41,.46,.11,mat.gold,mic,0,.06,0);
  cylinder(.075,.09,.95,mat.silver,mic,0,.56,0);
  const head=group(0,1.45,0,mic);head.rotation.z=-.08;
  box(.56,.9,.4,mat.gold,head,0,0,0,.19);
  box(.42,.71,.03,mat.black,head,0,.02,.206,.13);
  for(let i=0;i<10;i++) box(.43,.023,.04,mat.silver,head,0,-.26+i*.063,.23,.01);
  box(.035,.72,.05,mat.gold,head,0,.02,.255,.01);
  wire([[-.37,.97,0],[-.38,1.36,0],[0,1.56,-.22],[.38,1.36,0],[.37,.97,0]],.035,mat.gold,mic);
  for(const x of [-.35,.35]) {const screw=cylinder(.07,.07,.09,mat.silver,mic,x,1.4,0,20);screw.rotation.z=Math.PI/2;}
  wire([[2.1,.59,-.4],[2.5,.58,.1],[2.4,.58,.65],[1.2,.58,.8],[.9,.58,-.2]],.018,mat.black,scene);
  contact(2.08,-.4,1.3,1.2);
  mic.traverse(m=>{if(m.isMesh){m.userData.section='conversations';pickables.push(m);}});

  // Notebook and pencil: the third chapter of the portfolio.
  const notebook=group(4.35,.61,1.25);notebook.rotation.y=-.23;
  box(2.45,.05,1.76,mat.mint,notebook,0,.015,0,.04);
  box(2.34,.14,1.63,mat.paper,notebook,.025,.1,0,.015);
  for(let i=0;i<4;i++) box(2.32,.005,.01,mat.walnut,notebook,.03,.055+i*.028,.817,0);
  box(2.45,.06,1.76,mat.mint,notebook,0,.205,0,.035);
  box(.07,.007,1.78,mat.black,notebook,.86,.24,0,.002);
  box(.07,.26,.02,mat.black,notebook,.86,.115,.885,.002);
  box(.15,.012,.3,mat.orange,notebook,-.4,.03,1,.006);
  const pencil=group(.45,.01,1.25,notebook);pencil.rotation.z=Math.PI/2;pencil.rotation.y=.14;
  cylinder(.035,.035,1.85,mat.gold,pencil,0,0,0,6);
  cylinder(0,.035,.17,mat.paper,pencil,0,1.01,0,6);
  cylinder(0,.017,.07,mat.black,pencil,0,1.1,0,6);
  contact(4.35,1.25,3.2,2.4);register(notebook,'story',[0,.27,0]);

  // Rig lives on the laptop. A tiny GPU-drawn network idles on its screen.
  const laptop=group(6.2,.61,-1.4);laptop.rotation.y=-.2;
  box(2.7,.13,1.82,mat.black,laptop,0,.07,0,.075);
  box(1.7,.015,.68,mat.trim,laptop,0,.145,-.2,.025);
  for(let row=0;row<5;row++) for(let col=0;col<12;col++) box(.13,.018,.085,mat.keys,laptop,-.9+col*.165,.162,-.49+row*.12,.012);
  box(.7,.007,.37,mat.silver,laptop,0,.14,.5,.025);
  const lid=group(0,.15,-.82,laptop);lid.rotation.x=-.14;
  box(2.7,1.82,.1,mat.black,lid,0,.91,0,.08);
  const screenMat=new THREE.ShaderMaterial({uniforms:{uTime:timeUniform},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 vUv;uniform float uTime;
  float line(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;return length(pa-ba*clamp(dot(pa,ba)/dot(ba,ba),0.,1.));}
  void main(){vec2 p=vUv;vec3 c=mix(vec3(.015,.055,.075),vec3(.03,.18,.20),p.y);float grid=step(.975,fract(p.x*18.))+step(.975,fract(p.y*12.));c+=grid*.013;
  vec2 a=vec2(.2,.5),b=vec2(.5,.69),d=vec2(.8,.42);float edge=min(line(p,a,b),min(line(p,b,d),line(p,d,a)));c+=vec3(.12,.34,.31)*exp(-edge*170.);
  vec2 pulse=mix(a,b,fract(uTime*.18));c+=vec3(.3,.65,.48)*exp(-length(p-pulse)*85.);
  for(int i=0;i<3;i++){vec2 v=i==0?a:i==1?b:d;float dist=length(p-v);c+=vec3(.28,.68,.57)*(1.-smoothstep(.026,.034,dist));c+=vec3(.10,.22,.18)*exp(-dist*30.);}
  float bar=step(.15,p.x)*step(p.x,.85)*step(.11,p.y)*step(p.y,.115);c+=bar*vec3(.15,.35,.32);gl_FragColor=vec4(c,1.);}`});
  const screen=mesh(new THREE.PlaneGeometry(2.48,1.57),screenMat,lid,0,.94,.056);screen.castShadow=false;
  sphere(.022,mat.keys,lid,0,1.757,.06);
  const screenLight=new THREE.PointLight('#5caeac',1.5,2.6,2);screenLight.position.set(0,1,.5);laptop.add(screenLight);
  contact(6.2,-1.4,3.6,2.5);register(laptop,'rig',[0,1.12,-.8]);

  // Coffee, living foliage and a warm task lamp.
  const coffee=group(-2.42,.59,1.02);
  const cupPoints=[[.0,0],[.23,0],[.29,.05],[.32,.52],[.29,.54],[.27,.48],[.24,.08]].map(p=>new THREE.Vector2(...p));
  mesh(new THREE.LatheGeometry(cupPoints,48),mat.black,coffee);
  const drink=cylinder(.272,.272,.01,mat.tape,coffee,0,.43,0,48);drink.castShadow=false;
  const handle=mesh(new THREE.TorusGeometry(.19,.045,10,30,Math.PI*1.65),mat.black,coffee,.32,.29,0);handle.rotation.z=-Math.PI*.825;
  contact(-2.42,1.02,1.1,.95);
  const steamMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{uTime:timeUniform},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 vUv;uniform float uTime;${noise}
  void main(){float x=vUv.x-.5-sin(vUv.y*8.-uTime*1.3)*.1;float a=exp(-x*x*70.)*sin(vUv.y*3.14159)*noise(vec2(vUv.x*5.,vUv.y*7.-uTime*.4))*.2;gl_FragColor=vec4(.84,.9,.83,a);}`});
  const steam=mesh(new THREE.PlaneGeometry(.58,1.3),steamMat,coffee,0,1.08,0);steam.castShadow=false;
  const steam2=mesh(new THREE.PlaneGeometry(.4,1.1),steamMat,coffee,0,1,0);steam2.rotation.y=1.1;steam2.castShadow=false;
  const plant=group(-16.5,-2.6,-1.7);plant.scale.setScalar(1.6);
  cylinder(.63,.43,.92,mat.pot,plant,0,.46,0);cylinder(.59,.59,.025,mat.soil,plant,0,.92,0);
  for(let j=0;j<13;j++) {
    const a=j*2.4, height=1.6+random()*1.2, reach=.5+random()*.75;
    const px=Math.cos(a)*reach,pz=Math.sin(a)*reach;
    wire([[0,.9,0],[px*.25,height*.85,pz*.25],[px,height,pz]],.014,mat.darkGreen,plant);
    const leaf=sphere(.35,j%2?mat.green:mat.darkGreen,plant,px,height,pz,.6,1.8,.12);leaf.rotation.set(.35,a,-Math.cos(a)*.5);leaf.userData.phase=a;animated.push({kind:'leaf',object:leaf,base:leaf.rotation.z});
  }
  const lamp=group(-6.65,.6,-2.1);cylinder(.45,.5,.09,mat.trim,lamp,0,.05,0);
  wire([[0,.08,0],[0,1.6,0],[.6,2.65,-.1],[1.3,2.5,.4]],.042,mat.gold,lamp);
  const shade=mesh(new THREE.ConeGeometry(.48,.47,32,1,true),mat.trim,lamp,1.3,2.35,.4);shade.rotation.z=-.2;
  const bulb=mesh(new THREE.CircleGeometry(.36,32),new THREE.MeshBasicMaterial({color:'#ffe8b5'}),lamp,1.3,2.12,.4);bulb.rotation.x=Math.PI/2;bulb.castShadow=false;
  const lampLight=new THREE.PointLight('#ffd292',8,4.5,1.5);lampLight.position.set(1.3,2,.4);lamp.add(lampLight);

  // Dust in the sunbeam: depth-tested particles, visible mostly in the light.
  const motePositions=new Float32Array(220*3),moteSeeds=new Float32Array(220);
  for(let i=0;i<220;i++){motePositions[i*3]=-9+random()*21;motePositions[i*3+1]=.8+random()*7;motePositions[i*3+2]=-4+random()*8;moteSeeds[i]=random();}
  const motesGeo=new THREE.BufferGeometry();motesGeo.setAttribute('position',new THREE.BufferAttribute(motePositions,3));motesGeo.setAttribute('aSeed',new THREE.BufferAttribute(moteSeeds,1));
  const motes=new THREE.Points(motesGeo,new THREE.ShaderMaterial({uniforms:{uTime:timeUniform},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexShader:`uniform float uTime;attribute float aSeed;varying float vA;void main(){vec3 p=position;p.x+=sin(uTime*.19+aSeed*19.)*.35;p.y+=sin(uTime*.13+aSeed*30.)*.22;vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=clamp(22./-mv.z,1.,2.8);vA=.1+aSeed*.22;gl_Position=projectionMatrix*mv;}`,fragmentShader:`varying float vA;void main(){float a=1.-smoothstep(.05,.5,length(gl_PointCoord-.5));gl_FragColor=vec4(.9,.85,.62,a*vA);}`}));scene.add(motes);

  // Restrained camera motion by default. The optional look-around mode is a
  // bounded orbit so all views remain inside the intentionally composed room.
  const pointer=new THREE.Vector2(), raycaster=new THREE.Raycaster();
  const lookTarget=new THREE.Vector3(0,1.85,-.7),baseCamera=new THREE.Vector3(0,5.25,14.5);
  const nextCamera=new THREE.Vector3(),aim=new THREE.Vector3();
  let width=0,height=0,compact=false,paused=body.classList.contains('motion-paused');
  let exploring=false,dragging=false,moved=false,downX=0,downY=0,startYaw=0,startPitch=0;
  let yaw=0,pitch=0,smoothYaw=0,smoothPitch=0,activeKey=null,hoverKey=null,frameId=0,last=0,elapsed=0,frames=0;
  const projectVector=new THREE.Vector3();
  const dialog=document.getElementById('portfolio-dialog');
  let panelOpen=dialog.open;
  function resize() {
    if(contextLost)return;
    const rect=viewport.getBoundingClientRect();width=rect.width;height=rect.height;compact=width<760;
    renderer.setPixelRatio(Math.min(devicePixelRatio,compact?1.25:1.5,2300/width));renderer.setSize(width,height,false);
    camera.aspect=width/height;camera.fov=compact?43:42;camera.updateProjectionMatrix();
    canvas.dataset.viewport=`${width}x${height}`;
    draw(0,true);
  }
  function cameraPosition(dt,instant=false) {
    const damp=instant?1:1-Math.exp(-dt*4.5);
    smoothYaw+=(yaw-smoothYaw)*damp;smoothPitch+=(pitch-smoothPitch)*damp;
    const bob=paused?0:Math.sin(elapsed*.19)*.045;
    if(compact){baseCamera.set(1.7,5.5,17.4);lookTarget.set(.4,2.2,-.7);}else{baseCamera.set(0,5.25,14.5);lookTarget.set(0,1.85,-.7);}
    const radius=baseCamera.z-lookTarget.z;
    const passiveX=paused?0:pointer.x*.3+Math.sin(elapsed*.14)*.12,passiveY=paused?0:pointer.y*.13;
    const arrival=paused?0:Math.exp(-elapsed*1.4);
    nextCamera.set(baseCamera.x+Math.sin(smoothYaw)*radius+passiveX,baseCamera.y+smoothPitch*4+bob+passiveY+arrival*.18,lookTarget.z+Math.cos(smoothYaw)*radius+arrival*.8);
    aim.copy(lookTarget);aim.x+=smoothYaw*.65;aim.y+=smoothPitch*.4;
    camera.position.copy(nextCamera);camera.lookAt(aim);camera.updateMatrixWorld();
    canvas.dataset.camera=`${camera.position.x.toFixed(2)},${camera.position.y.toFixed(2)},${camera.position.z.toFixed(2)}`;
  }
  function anchors() {
    for(const item of targets.values()) {
      projectVector.copy(item.anchor);item.group.localToWorld(projectVector);projectVector.project(camera);
      const x=(projectVector.x*.5+.5)*width,y=(-projectVector.y*.5+.5)*height;
      item.element.style.left=`${x.toFixed(1)}px`;item.element.style.top=`${y.toFixed(1)}px`;
      item.element.style.visibility=x<30||x>width-30||y<60||y>height*.78?'hidden':'visible';
    }
  }
  function setHovered(key) {
    if(key===hoverKey)return;hoverKey=key;
    canvas.style.cursor=key&&!exploring?'pointer':dragging?'grabbing':'grab';
    targets.forEach((v,k)=>v.element.classList.toggle('is-hover',k===key));
  }
  function findObject(event) {
    const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
    if(panelOpen||exploring)return null;
    raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(pickables,false)[0];return hit?.object.userData.section||null;
  }
  canvas.addEventListener('pointermove',event=>{
    const key=findObject(event);setHovered(key);
    if(dragging&&exploring){const dx=event.clientX-downX,dy=event.clientY-downY;moved=moved||Math.abs(dx)+Math.abs(dy)>5;yaw=THREE.MathUtils.clamp(startYaw-dx*.002,-.37,.37);pitch=THREE.MathUtils.clamp(startPitch+dy*.002,-.25,.3);}
    if(paused)draw(0,true);
  });
  canvas.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;dragging=true;moved=false;downX=event.clientX;downY=event.clientY;startYaw=yaw;startPitch=pitch;canvas.setPointerCapture(event.pointerId);canvas.classList.add('is-dragging');
  });
  canvas.addEventListener('pointerup',event=>{
    if(!dragging)return;dragging=false;canvas.classList.remove('is-dragging');
    if(!exploring&&!moved){const key=findObject(event);if(key)window.dispatchEvent(new CustomEvent('studio:open',{detail:{section:key}}));}
    if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointercancel',()=>{dragging=false;canvas.classList.remove('is-dragging');});
  canvas.addEventListener('pointerleave',()=>{if(!dragging){pointer.set(0,0);setHovered(null);}});
  document.querySelectorAll('[data-open]').forEach(button=>{
    button.addEventListener('pointerenter',()=>{if(!panelOpen)setHovered(button.dataset.open);});
    button.addEventListener('pointerleave',()=>setHovered(null));
    button.addEventListener('focus',()=>{if(!panelOpen)setHovered(button.dataset.open);});
    button.addEventListener('blur',()=>setHovered(null));
  });
  function setExploring(value) {
    exploring=value;document.querySelectorAll('.hero-copy,.collection-nav,.site-header,.scene-hotspot').forEach(el=>el.inert=value);body.classList.toggle('exploring',value);exploreButton.setAttribute('aria-pressed',String(value));exploreLabel.textContent=value?'Return to studio':'Look around';resetButton.hidden=!value;setHovered(null);
    canvas.dataset.exploring=String(value);
    if(!value){yaw=0;pitch=0;pointer.set(0,0);}
    if(paused)draw(0,true);
  }
  exploreButton.addEventListener('click',()=>setExploring(!exploring));
  resetButton.addEventListener('click',()=>{yaw=0;pitch=0;if(paused)draw(0,true);});
  document.addEventListener('keydown',event=>{
    if(event.ctrlKey||event.altKey||event.metaKey||event.target.matches('input,textarea,select,[contenteditable="true"]')||panelOpen)return;
    if(event.key.toLowerCase()==='f'){event.preventDefault();setExploring(!exploring);}
    if(!exploring)return;
    if(event.key==='Escape'){event.preventDefault();setExploring(false);exploreButton.focus();}
    const offset={ArrowLeft:[.07,0],ArrowRight:[-.07,0],ArrowUp:[0,.06],ArrowDown:[0,-.06]}[event.key];
    if(offset){event.preventDefault();yaw=THREE.MathUtils.clamp(yaw+offset[0],-.37,.37);pitch=THREE.MathUtils.clamp(pitch+offset[1],-.25,.3);if(paused)draw(0,true);}
  });
  window.addEventListener('studio:panel',event=>{panelOpen=event.detail.open;activeKey=panelOpen?event.detail.section:null;if(panelOpen&&exploring)setExploring(false);setHovered(null);if(paused)draw(0,true);});
  window.addEventListener('studio:motion',event=>{paused=event.detail.paused;cancelAnimationFrame(frameId);last=0;if(!paused&&!document.hidden&&!contextLost)frameId=requestAnimationFrame(tick);else if(!contextLost)draw(0,true);});
  document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(frameId);last=0;if(!document.hidden&&!paused&&!contextLost)frameId=requestAnimationFrame(tick);});
  function draw(dt,instant=false) {
    cameraPosition(dt,instant);
    reels.forEach((g,i)=>g.rotation.z=-elapsed*(.31+i*.025));
    meters.forEach((g,i)=>g.rotation.z=Math.sin(elapsed*2.7+i)*.25+Math.sin(elapsed*5.4)*.12);
    animated.forEach(item=>{if(item.kind==='leaf')item.object.rotation.z=item.base+Math.sin(elapsed*.7+item.object.userData.phase)*.04;else item.object.rotation.z=Math.sin(elapsed*.4+item.object.userData.phase)*.005;});
    for(const [key,item]of targets){const goal=key===(hoverKey||activeKey)?1:0;item.hover+=(goal-item.hover)*(instant?1:Math.min(dt*5,1));item.group.position.y=item.group.userData.baseY+item.hover*.055;}
    timeUniform.value=elapsed;anchors();renderer.render(scene,camera);
    frames++;if(frames%30===0){canvas.dataset.frames=String(frames);canvas.dataset.drawCalls=String(renderer.info.render.calls);}
  }
  function tick(now) {const dt=last?Math.min((now-last)/1000,.05):1/60;last=now;elapsed+=dt;draw(dt);if(!paused&&!document.hidden)frameId=requestAnimationFrame(tick);}
  let contextLost=false;
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();contextLost=true;cancelAnimationFrame(frameId);body.classList.remove('scene-3d','exploring');exploring=false;document.querySelectorAll('.hero-copy,.collection-nav,.site-header,.scene-hotspot').forEach(el=>el.inert=false);targets.forEach(item=>{for(const property of ['left','top','visibility'])item.element.style.removeProperty(property);});controls.hidden=true;canvas.dataset.renderer='image-fallback';});
  canvas.addEventListener('webglcontextrestored',()=>{if(!contextLost)return;contextLost=false;body.classList.add('scene-3d');controls.hidden=false;canvas.dataset.renderer='three-webgl2';resize();if(!paused)frameId=requestAnimationFrame(tick);});
  body.classList.add('scene-3d');controls.hidden=false;canvas.dataset.renderer='three-webgl2';
  resize();new ResizeObserver(resize).observe(viewport);
  if(!paused&&!document.hidden)frameId=requestAnimationFrame(tick);
}
