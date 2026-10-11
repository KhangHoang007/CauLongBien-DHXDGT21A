import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';

const stage=document.getElementById('stage');
const status=document.getElementById('status');
let seed=7219;
const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const groups={},batches=new Map();
const scene=new THREE.Scene();
scene.background=new THREE.Color('#d9ded8');
scene.fog=new THREE.Fog('#d9ded8',32,75);
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});}
catch(e){status.textContent='Trình duyệt chưa bật WebGL. Anh mở bằng Chrome/Edge có tăng tốc đồ họa để xem mô hình 3D.';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.18;
renderer.outputColorSpace=THREE.SRGBColorSpace;
stage.prepend(renderer.domElement);
renderer.domElement.setAttribute('aria-label','Mô hình cầu 3D, kéo để xoay và cuộn để phóng to');
renderer.domElement.tabIndex=0;
const camera=new THREE.PerspectiveCamera(34,1,.025,150);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.dampingFactor=.085;
controls.minDistance=.7;controls.maxDistance=38;
controls.maxPolarAngle=Math.PI*.91;
controls.autoRotateSpeed=.6;
controls.target.set(0,.7,0);

scene.add(new THREE.HemisphereLight('#eef5ff','#8a7961',2.2));
const key=new THREE.DirectionalLight('#fff0d7',3.2);key.position.set(-3,10,7);key.castShadow=true;
key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-9;key.shadow.camera.right=9;key.shadow.camera.top=7;key.shadow.camera.bottom=-7;
key.shadow.camera.near=.1;key.shadow.camera.far=30;key.shadow.bias=-.00015;key.shadow.normalBias=.015;scene.add(key);
const fill=new THREE.DirectionalLight('#dfecff',1.1);fill.position.set(6,4,-7);scene.add(fill);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#c9d0c9',roughness:.95}));
ground.rotation.x=-Math.PI/2;ground.position.y=-1.63;ground.receiveShadow=true;scene.add(ground);

// Hand-painted timber and silver surfaces, generated deterministically, not flat color fills.
function texture(kind){
 const c=document.createElement('canvas');c.width=256;c.height=1024;const ctx=c.getContext('2d');
 const base=kind==='gold'?[157,137,79]:kind==='silver'?[160,164,157]:[62,56,44];
 const img=ctx.createImageData(c.width,c.height);
 for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
  const grain=Math.sin(x*.25+Math.sin(y*.023)*.45)*4+Math.sin(x*1.32+y*.013)*3;
  const noise=(rand()-.5)*22;const stain=Math.sin(y*.045+x*.03)*3;
  const i=(y*c.width+x)*4;for(let k=0;k<3;k++)img.data[i+k]=base[k]+grain+noise+stain;img.data[i+3]=255;
 }
 ctx.putImageData(img,0,0);
 for(let i=0;i<320;i++){
  const x=rand()*256,y=rand()*1024,l=20+rand()*330;
  ctx.strokeStyle=i%3?'rgba(42,34,17,.16)':'rgba(246,229,165,.22)';
  if(kind==='silver')ctx.strokeStyle=i%2?'rgba(54,58,54,.12)':'rgba(252,253,239,.32)';
  ctx.lineWidth=.25+rand()*1.4;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+rand()*2,y+l);ctx.stroke();
 }
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;
}
const goldTex=texture('gold'),silverTex=texture('silver'),darkTex=texture('dark');
function material(color,map,metalness,roughness,bump=.004){return new THREE.MeshStandardMaterial({color,map,metalness,roughness,bumpMap:map,bumpScale:bump});}
const gold=material('#e4ca87',goldTex,.28,.68,.006);
const goldLight=material('#f4d693',goldTex,.24,.72,.006);
const goldDark=material('#bb995b',goldTex,.18,.83,.006);
const silver=material('#e2e7e5',silverTex,.42,.56,.004);
const silverDark=material('#b6bcb9',silverTex,.3,.72,.006);
const railMat=material('#a7adac',silverTex,.56,.38,.003);
const rawWood=material('#bbae80',goldTex,.04,.91,.005);
const bedMat=material('#737263',darkTex,.06,.98,.004);
const glueGold=new THREE.MeshStandardMaterial({color:'#b2a06a',roughness:.57,metalness:.12});
const glueSilver=new THREE.MeshStandardMaterial({color:'#bec0ad',roughness:.48,metalness:.28});
const seamMat=new THREE.MeshStandardMaterial({color:'#615f55',roughness:1});
const boxGeo=new THREE.BoxGeometry(1,1,1);
const cylinderGeo=new THREE.CylinderGeometry(1,1,1,10,1);
const smoothCylinder=new THREE.CylinderGeometry(1,1,1,32,1);
const sphereGeo=new THREE.SphereGeometry(1,7,5);
const dummy=new THREE.Object3D();
function layer(name){if(!groups[name]){groups[name]=new THREE.Group();groups[name].name=name;scene.add(groups[name]);}return groups[name];}
function instance(geo,mat,pos,scale,quat,cat){
 const id=cat+':'+geo.id+':'+mat.id;
 if(!batches.has(id))batches.set(id,{geo,mat,cat,transforms:[]});
 dummy.position.copy(pos);dummy.scale.copy(scale);dummy.quaternion.copy(quat||new THREE.Quaternion());dummy.updateMatrix();
 batches.get(id).transforms.push(dummy.matrix.clone());
}
function box(x,y,z,sx,sy,sz,mat=gold,cat='truss'){instance(boxGeo,mat,V(x,y,z),V(sx,sy,sz),null,cat);}
function rod(a,b,r=.014,mat=gold,cat='truss',smooth=false){
 const d=b.clone().sub(a),len=d.length();if(len<1e-6)return;
 instance(smooth?smoothCylinder:cylinderGeo,mat,a.clone().add(b).multiplyScalar(.5),V(r,len,r),new THREE.Quaternion().setFromUnitVectors(V(0,1,0),d.normalize()),cat);
}
function beam(a,b,width,depth,mat=gold,cat='truss'){
 const d=b.clone().sub(a),len=d.length();
 instance(boxGeo,mat,a.clone().add(b).multiplyScalar(.5),V(width,len,depth),new THREE.Quaternion().setFromUnitVectors(V(0,1,0),d.normalize()),cat);
}
function blob(p,size,mat,cat){instance(sphereGeo,mat,p,V(size*(1+rand()*.4),size*.35,size*(1+rand()*.4)),null,cat);}

// Composite members: many glued sticks, with small cross ties and diagonal lacing.
function timber(a,b,width=.145,depth=.11,laced=false,cat='truss'){
 const d=b.clone().sub(a),len=d.length();d.normalize();
 const u=V(d.y,-d.x,0).normalize(),v=V(0,0,1);
 const point=(t,s,f)=>a.clone().addScaledVector(d,t).addScaledVector(u,s).addScaledVector(v,f);
 beam(a,b,width,depth,gold,cat);
 const count=Math.max(3,Math.round(width/.024));
 for(const sign of [-1,1]){
  for(let j=0;j<count;j++){
   const s=(j/(count-1)-.5)*(width-.009),f=sign*(depth/2+.001);
   rod(point(.003,s,f),point(len-.003,s,f),.008,j%3===0?goldDark:goldLight,cat);
  }
  if(laced){
   const n=Math.max(2,Math.round(len/.235));
   for(let j=0;j<n;j++){
    const t=j*len/n,nt=(j+1)*len/n,f=sign*(depth/2+.013);
    rod(point(t,-width*.57,f),point(t,width*.57,f),.013,goldLight,cat);
    rod(point(t,-width*.48,f),point(nt,width*.48,f),.010,goldDark,cat);
   }
   rod(point(len,-width*.57,sign*(depth/2+.013)),point(len,width*.57,sign*(depth/2+.013)),.013,goldLight,cat);
  }
 }
 // End-facing ladder faces of the upright portal posts, visible in the frontal photos.
 if(laced&&Math.abs(d.y)>.94){
  for(const sign of [-1,1]){
   for(let k=0;k<5;k++)rod(point(0,sign*(width/2+.004),(k/4-.5)*depth),point(len,sign*(width/2+.004),(k/4-.5)*depth),.007,goldLight,cat);
   const n=Math.max(2,Math.round(len/.235));
   for(let j=0;j<n;j++){
    const t=j*len/n,nt=(j+1)*len/n,s=sign*(width/2+.014);
    rod(point(t,s,-depth*.56),point(t,s,depth*.56),.012,goldLight,cat);
    rod(point(t,s,-depth*.5),point(nt,s,depth*.5),.009,goldDark,cat);
   }
  }
 }
}

// Thin double deck with exposed spacers, matching the end photographs.
box(0,-.18,0,11.8,.05,3.06,silverDark,'deck');
box(0,-.105,0,11.7,.05,2.93,rawWood,'deck');
for(const z of [-1.28,0,1.28])box(0,-.045,z,11.65,.15,.085,rawWood,'deck');
for(let x=-5.7;x<=5.71;x+=.65)box(x,-.06,0,.08,.15,2.90,silverDark,'deck');
// Silver-painted strips have rounded outer tips and visible joints, no road paint markings.
const plankCount=66,plankPitch=11.7/plankCount;
for(let i=0;i<plankCount;i++){
 const x=-5.85+(i+.5)*plankPitch;
 for(const side of [-1,1]){
  const y=.052+(rand()-.5)*.002,mat=i%7===0?silverDark:silver;
  box(x,y,side*1.01,plankPitch-.006,.027,.85,mat,'deck');
  instance(smoothCylinder,mat,V(x,y,side*1.43),V((plankPitch-.006)/2,.027,(plankPitch-.006)/2),null,'deck');
  // Fine scratched grain on every few boards is geometry so it remains legible at close range.
  if(i%3===0)rod(V(x+.036,y+.014,side*.65),V(x+.037,y+.014,side*1.42),.0018,silverDark,'deck');
 }
}
// Central track bed and wood side boards at the bottom of the gold truss.
box(0,.055,0,11.7,.055,1.02,bedMat,'rail');
for(const z of [-.555,.555])box(0,.157,z,11.74,.23,.035,goldDark,'truss');
for(let x=-5.68;x<5.8;x+=.245){
 box(x,.11,0,.085,.055,.83,silverDark,'rail');
 for(const z of [-.405,.405])instance(smoothCylinder,silverDark,V(x,.11,z),V(.042,.055,.042),null,'rail');
 for(const z of [-.235,.235]){
  box(x,.146,z,.12,.017,.082,railMat,'rail');
  blob(V(x,.155,z+.032),.015,glueSilver,'rail');
 }
}
for(const z of [-.235,.235]){
 box(0,.166,z,11.69,.025,.049,railMat,'rail');
 box(0,.193,z,11.69,.039,.022,railMat,'rail');
 box(0,.220,z,11.70,.02,.041,silver,'rail');
}

// Measured visually from the side photograph: low approach, steep rise, a high peak,
// and four tall portal stations. Unmeasured lengths remain relative.
const stations=[[-5.35,1.30],[-4.07,1.30],[-2.79,1.30],[-1.51,1.30],[-.20,3.08],[1.38,3.68],[3.10,3.16],[4.95,2.92]];
for(const side of [-1,1]){
 const z=side*.60;
 timber(V(-5.42,.26,z),V(5.78,.26,z),.12,.12,false);
 stations.forEach(([x,h],i)=>{
  // Several glued sticks give each pillar the wide, flat cross section seen in the reference.
  timber(V(x,.25,z),V(x,h,z),i>3?.18:.15,.165,true);
  blob(V(x,.26,z),.085,glueGold,'truss');
  blob(V(x,h,z),.065,glueGold,'truss');
  if(i<stations.length-1){
   const [nx,nh]=stations[i+1];
   timber(V(x,h,z),V(nx,nh,z),.15,.14,false);
   const mid=(x+nx)/2;
   // Repeated V struts, including the low approach bays.
   if(i!==3){
    timber(V(x,h-.04,z),V(mid,.27,z),.14,.10,false);
    timber(V(mid,.27,z),V(nx,nh-.04,z),.14,.10,false);
   }else{
    timber(V(x,.28,z),V(nx,nh,z),.17,.13,false);
    timber(V(x,h,z),V(nx,nh,z),.17,.13,false);
   }
  }
 });
 timber(V(4.95,2.92,z),V(5.76,.28,z),.18,.14,false);
 timber(V(-5.35,1.30,z),V(-5.75,.28,z),.15,.12,false);
}
// Roof crossbeams and narrow X braces connecting only the central gold truss.
stations.forEach(([x,h],i)=>{
 beam(V(x,h,-.60),V(x,h,.60),.105,.14,gold,'roof');
 if(i<stations.length-1){
  const [nx,nh]=stations[i+1];
  rod(V(x,h+.075,-.61),V(nx,nh+.075,.61),.014,goldLight,'roof');
  rod(V(x,h+.079,.61),V(nx,nh+.079,-.61),.014,goldLight,'roof');
  const n=Math.ceil((nx-x)/.17);
  for(let j=1;j<n;j++){
   const t=j/n;
   for(const s of [-1,1])rod(V(x+(nx-x)*t,h+(nh-h)*t+.073,s*.51),V(x+(nx-x)*t+.10,h+(nh-h)*t+.077,s*.70),.008,goldDark,'roof');
  }
 }
});

// The outer silver railings: fine posts and visible handmade glue at their feet.
for(const side of [-1,1]){
 for(let i=0;i<44;i++){
  const x=-5.74+i*11.48/43,z=side*1.44;
  const lean=(rand()-.5)*.045;
  rod(V(x,.08,z),V(x+lean,.43,z+side*.025),.010,silver,'fence');
  blob(V(x,.08,z),.033,glueSilver,'fence');
  blob(V(x+lean,.43,z+side*.025),.019,silverDark,'fence');
 }
 rod(V(-5.89,.43,side*1.465),V(5.89,.43,side*1.465),.018,silver,'fence');
}

// A single bevelled plinth under each pair of round painted columns.
const plinthShape=new THREE.Shape();
plinthShape.moveTo(-.27,-1.05);plinthShape.lineTo(.27,-1.05);plinthShape.lineTo(.27,1.05);plinthShape.lineTo(-.27,1.05);plinthShape.closePath();
const plinthGeo=new THREE.ExtrudeGeometry(plinthShape,{depth:.10,bevelEnabled:true,bevelThickness:.085,bevelSize:.085,bevelSegments:1,steps:1});
plinthGeo.rotateX(-Math.PI/2);
const pierStations=[-5.33,.55,5.33];
for(const x of pierStations){
 box(x,-1.56,0,.73,.12,2.32,silverDark,'piers');
 const m=new THREE.Mesh(plinthGeo,silver);m.position.set(x,-1.46,0);m.castShadow=true;m.receiveShadow=true;layer('piers').add(m);
 for(let z=-.99;z<1.01;z+=.225){
  box(x,-1.270,z,.48,.012,.217,silver,'piers');
 }
 for(const z of [-.64,.64]){
  // Square sockets surrounding the cylindrical shafts remain visible in the close-ups.
  box(x,-1.265,z,.36,.017,.36,seamMat,'piers');
  rod(V(x,-1.273,z),V(x,-.197,z),.147,silver,'piers',true);
  blob(V(x,-.20,z),.16,silverDark,'piers');
 }
}

let totalInstances=0;
for(const b of batches.values()){
 const mesh=new THREE.InstancedMesh(b.geo,b.mat,b.transforms.length);
 b.transforms.forEach((t,i)=>mesh.setMatrixAt(i,t));mesh.instanceMatrix.needsUpdate=true;
 mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();layer(b.cat).add(mesh);totalInstances+=b.transforms.length;
}
window.__bridgeInfo={version:4,photos:10,instances:totalInstances,piers:3,columns:6,stations:stations.map(s=>[...s]),layers:Object.keys(groups)};

const views={
 overall:{p:[11,6.5,15],t:[0,.7,0]},
 side:{p:[0,2,19.5],t:[0,.9,0]},
 high:{p:[15,3,2.4],t:[1,.9,0]},
 low:{p:[-15,3.2,2.4],t:[-1,.85,0]},
 top:{p:[0,17,.01],t:[0,0,0]},
 reverse:{p:[-10,5,-15],t:[0,.7,0]},
 joint:{p:[3,3.3,3.0],t:[1.38,2.65,.60]},
 track:{p:[8,2.8,3.0],t:[3.6,.3,0]},
 pier:{p:[7.9,.3,4.1],t:[5.33,-.90,0]}
};
let transition=null;
function view(name,animate=true){
 const v=views[name];controls.autoRotate=false;
 const p=V(...v.p),t=V(...v.t);
 if(['overall','side','reverse','top'].includes(name)){
  const direction=p.clone().sub(t).normalize(),right=V(0,1,0).cross(direction).normalize(),up=direction.clone().cross(right);
  const tan=Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),aspect=stage.clientWidth/stage.clientHeight;
  let required=0;
  for(const x of [-6,6])for(const y of [-1.64,3.9])for(const z of [-1.6,1.6]){
   const relative=V(x,y,z).sub(t),near=relative.dot(direction);
   required=Math.max(required,near+Math.abs(relative.dot(right))/(tan*aspect),near+Math.abs(relative.dot(up))/tan);
  }
  p.copy(t).addScaledVector(direction,required*1.12);
 }
 if(animate)transition={fromP:camera.position.clone(),fromT:controls.target.clone(),p,t,start:performance.now()};
 else{camera.position.copy(p);controls.target.copy(t);controls.update();}
 document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
 document.querySelectorAll('[data-action="spin"]').forEach(b=>{b.classList.remove('active');b.textContent='Tự xoay 360°';});
}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>view(b.dataset.view)));
document.querySelectorAll('[data-layer]').forEach(el=>el.addEventListener('change',()=>{groups[el.dataset.layer].visible=el.checked;}));
document.querySelectorAll('[data-action="spin"]').forEach(b=>b.addEventListener('click',()=>{controls.autoRotate=!controls.autoRotate;document.querySelectorAll('[data-action="spin"]').forEach(el=>{el.classList.toggle('active',controls.autoRotate);el.textContent=controls.autoRotate?'Dừng xoay':'Tự xoay 360°';});}));
document.querySelector('[data-action="roof"]').addEventListener('click',e=>{groups.roof.visible=!groups.roof.visible;document.querySelector('[data-layer="roof"]').checked=groups.roof.visible;e.target.textContent=groups.roof.visible?'Ẩn mái giằng':'Hiện mái giằng';});
function zoom(factor){transition=null;camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target);controls.update();}
document.getElementById('plus').onclick=()=>zoom(.82);document.getElementById('minus').onclick=()=>zoom(1.22);
controls.addEventListener('start',()=>{transition=null;});
function resize(){const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(stage);resize();view('overall',false);
document.getElementById('capture').onclick=()=>{renderer.render(scene,camera);const link=document.createElement('a');link.download='cau-que-go-goc-nhin.png';link.href=renderer.domElement.toDataURL('image/png');link.click();};

const photos=[['01-side.jpg','01 · Toàn bộ mặt bên'],['02-end-high.jpg','02 · Đầu cao, giàn và đường ray'],['03-end-low.jpg','03 · Đầu thấp, mặt cầu và móng'],['04-top.jpg','04 · Nhìn từ trên, giằng chữ X'],['05-low-angle.jpg','05 · Mặt bên đầu thấp'],['06-pier.jpg','06 · Cột tròn và bệ móng chung'],['07-high-angle.jpg','07 · Giàn cao và mối nối'],['08-low-front.jpg','08 · Lối ngoài hai bên đường ray'],['09-track.jpg','09 · Tà vẹt, ray và thanh giàn'],['10-other-side.jpg','10 · Mặt bên còn lại']];
const gallery=document.getElementById('gallery');
function photo(i){document.getElementById('mainPhoto').src='./photos/'+photos[i][0];document.getElementById('photoTitle').textContent=photos[i][1];document.querySelectorAll('.thumbs button').forEach((b,j)=>b.classList.toggle('selected',j===i));}
photos.forEach((p,i)=>{const b=document.createElement('button');b.setAttribute('aria-label',p[1]);const img=document.createElement('img');img.src='./photos/'+p[0];img.loading='lazy';img.alt=p[1];b.append(img);b.onclick=()=>photo(i);document.getElementById('thumbs').append(b);});
document.getElementById('showPhotos').onclick=()=>{gallery.hidden=false;controls.autoRotate=false;photo(0);};
document.getElementById('closePhotos').onclick=()=>gallery.hidden=true;
document.addEventListener('keydown',e=>{if(e.key==='Escape')gallery.hidden=true;});

let started=false;
function frame(now){
 requestAnimationFrame(frame);
 if(transition){let t=Math.min(1,(now-transition.start)/700);t=t*t*(3-2*t);camera.position.lerpVectors(transition.fromP,transition.p,t);controls.target.lerpVectors(transition.fromT,transition.t,t);if(t>=1)transition=null;}
 controls.update();renderer.render(scene,camera);
 if(!started){status.hidden=true;started=true;}
}
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();status.textContent='Mô hình tạm dừng do mất kết nối đồ họa. Anh tải lại trang để xem tiếp.';status.hidden=false;});
requestAnimationFrame(frame);
