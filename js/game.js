const W=128,H=32,D=128,KEY='littleBuilderWorld.v6';
function hgt(x,z){const d=Math.max(Math.abs(x-W/2),Math.abs(z-D/2)),t=Math.min(1,Math.max(0,(d-14)/8));return Math.max(0,Math.round(4+t*(2.2*Math.sin(x*.19)+2.2*Math.cos(z*.16)+1.5*Math.sin((x+z)*.11)+t)))}
const world=new Uint8Array(W*H*D);
const ix=(x,y,z)=>x+W*(z+D*y);
const get=(x,y,z)=>(x<0||y<0||z<0||x>=W||y>=H||z>=D)?0:world[ix(x,y,z)];
const BL=[['Grass',0x5cb85c],['Dirt',0x8b5a2b],['Stone',0x9a9a9a],['Wood',0xb8803f],['Brick',0xc0504d],['Sand',0xf0e0a0],['Leaves',0x2e8b3a],['Blue',0x3b82f6],['Pink',0xf472b6],['Yellow',0xfacc15],['White',0xf8fafc],['Glass',0xaee6ff],['Water',0x3a8fe8],['Snow',0xf4f8ff],['Cactus',0x2e9b3c],['Tall grass',0x3f9e3f],['Red flower',0xe53935],['Yellow flower',0xfacc15],['Pink flower',0xff6fb5],['Blue flower',0x4a7dff],['White flower',0xf8fafc],['Torch',0xff9a3c],['Apple leaves',0x45b82c]];
const hex=c=>'#'+c.toString(16).padStart(6,'0');
let cur=3,mode='build',fly=false,quality='sharp';

// ---------- three ----------
const cv=document.getElementById('c');
const R=new THREE.WebGLRenderer({canvas:cv,antialias:false});
const scene=new THREE.Scene();scene.background=new THREE.Color(0x74c6ff);scene.fog=new THREE.Fog(0x74c6ff,45,95);
const cam=new THREE.PerspectiveCamera(70,1,.1,200);cam.rotation.order='YXZ';
function size(){R.setPixelRatio(quality==='sharp'?Math.min(devicePixelRatio,2):1);R.setSize(innerWidth,innerHeight,false);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix()}
addEventListener('resize',size);size();

// Minecraft-style pixel textures, drawn on a canvas atlas (13 tiles of 16px)
const AT=document.createElement('canvas');AT.width=384;AT.height=16;const ag=AT.getContext('2d');
let sd=7;const rn=()=>(sd=(sd*16807)%2147483647)/2147483647;
function tile(i,fn){for(let y=0;y<16;y++)for(let x=0;x<16;x++){const[c,k]=fn(x,y),m=k*(.86+rn()*.28);ag.fillStyle='rgb('+((c>>16&255)*m|0)+','+((c>>8&255)*m|0)+','+((c&255)*m|0)+')';ag.fillRect(i*16+x,y,1,1)}}
tile(0,()=>[0x72d42b,1]);
tile(1,(x,y)=>y<4+(x*7%3)?[0x72d42b,1]:[0x8b5a2b,1]);
tile(2,()=>[0x8b5a2b,1]);
tile(3,()=>[0xa6aab0,rn()<.15?.8:1]);
tile(4,x=>[0xb8803f,x%4===0?.72:1]);
tile(5,(x,y)=>[(y%4===3||(x+((y>>2)%2)*4)%8===7)?0xd8d2c8:0xc0504d,1]);
tile(6,()=>[0xf0e0a0,1]);
tile(7,()=>rn()<.28?[0x2f8f22,1]:[0x45b82c,1]);
tile(8,()=>[0x3b82f6,1]);tile(9,()=>[0xf472b6,1]);tile(10,()=>[0xfacc15,1]);tile(11,()=>[0xf8fafc,1]);
tile(12,(x,y)=>[(x===0||y===0||x===15||y===15)?0xffffff:0xaee6ff,1]);
tile(13,()=>[0x2f9bff,1]);
tile(14,()=>[0xf4f8ff,rn()<.15?.93:1]);tile(15,(x)=>[x%5===2?0x1f6b2a:0x2e9b3c,1]);
function ptile(i,fn){for(let y=0;y<16;y++)for(let x=0;x<16;x++){const c=fn(x,y);if(c!=null){ag.fillStyle='#'+c.toString(16).padStart(6,'0');ag.fillRect(i*16+x,y,1,1)}}}
const flw=(hd,ct)=>(x,y)=>(x>=7&&x<=8&&y>=8)?0x2e8b3a:(x>=5&&x<=10&&y>=3&&y<=8&&!((x===5||x===10)&&(y===3||y===8)))?((x>=7&&x<=8&&y>=5&&y<=6)?ct:hd):null;
ptile(16,(x,y)=>x%3!==2&&y>=16-(5+((x*5)%9))?((x+y)%3?0x4fbf1f:0x7be034):null);
ptile(17,flw(0xe53935,0xfacc15));ptile(18,flw(0xfacc15,0xff8a3d));ptile(19,flw(0xff6fb5,0xffe066));ptile(20,flw(0x4a7dff,0xffffff));ptile(21,flw(0xffffff,0xffd23f));
ptile(22,(x,y)=>(x>=7&&x<=8)?(y>=6?0x8b5a2b:(y>=4?0xffe066:(y>=2?0xffa31a:null))):((x===6||x===9)&&y>=3&&y<=5)?0xff7a1a:null);
tile(23,(x,y)=>(((x>>1)===1&&(y>>1)===2)||((x>>1)===5&&(y>>1)===5))?[0xe53935,1]:rn()<.28?[0x2f8f22,1]:[0x45b82c,1]);
function tu(i){const k=document.createElement('canvas');k.width=k.height=16;k.getContext('2d').drawImage(AT,(i+1)*16,0,16,16,0,0,16,16);return k.toDataURL()}
const tex=new THREE.CanvasTexture(AT);tex.magFilter=tex.minFilter=THREE.NearestFilter;tex.generateMipmaps=false;
const matO=new THREE.MeshBasicMaterial({map:tex,vertexColors:true,alphaTest:.5});
const matG=new THREE.MeshBasicMaterial({map:tex,vertexColors:true,transparent:true,opacity:.68,depthWrite:false});
const CS=16,CX=W/CS,CZ=D/CS,chunks=[];let lightQ=[];

const F=[[[1,0,0],[[1,0,1],[1,0,0],[1,1,0],[1,1,1]],.85],[[-1,0,0],[[0,0,0],[0,0,1],[0,1,1],[0,1,0]],.85],[[0,1,0],[[0,1,1],[1,1,1],[1,1,0],[0,1,0]],1],[[0,-1,0],[[0,0,0],[1,0,0],[1,0,1],[0,0,1]],.6],[[0,0,1],[[0,0,1],[1,0,1],[1,1,1],[0,1,1]],.92],[[0,0,-1],[[1,0,0],[0,0,0],[0,1,0],[1,1,0]],.75]];
const AOF=[1,.9,.8,.68];
function sol(x,y,z){const b=get(x,y,z);return b&&b!==13&&b!==12&&(b<16||b>22)?1:0}
function AO(x,y,z,d,q){const a=d[0]?0:d[1]?1:2,u=a===0?1:0,w=a===2?1:2,su=q[u]?1:-1,sw=q[w]?1:-1,bx=x+d[0],by=y+d[1],bz=z+d[2];
  const ux=u===0?su:0,uy=u===1?su:0,uz=u===2?su:0,wx=w===0?sw:0,wy=w===1?sw:0,wz=w===2?sw:0;
  const s1=sol(bx+ux,by+uy,bz+uz),s2=sol(bx+wx,by+wy,bz+wz),cn=sol(bx+ux+wx,by+uy+wy,bz+uz+wz);return AOF[s1&&s2?3:s1+s2+cn]}
function lightAt(vx,vy,vz,ls){let m=0;for(let i=0;i<ls.length;i+=3){const d=Math.hypot(vx-ls[i]-.5,vy-ls[i+1]-.5,vz-ls[i+2]-.5);if(d<7){const l=1-d/7;if(l>m)m=l}}return m*m*TS}
function build(glass,x0,z0){const ls=[];for(let i=0;i<TL.length;i+=3)if(TL[i]>=x0-8&&TL[i]<x0+CS+8&&TL[i+2]>=z0-8&&TL[i+2]<z0+CS+8)ls.push(TL[i],TL[i+1],TL[i+2]);
  const p=[],c=[],i=[],u=[];
  for(let y=0;y<H;y++)for(let z=z0;z<z0+CS;z++)for(let x=x0;x<x0+CS;x++){
    const id=world[ix(x,y,z)];if(!id||(id===12||id===13)!==glass)continue;
    
    if(id>=16&&id<=22){const Q=[[[0,0,0],[1,0,1],[1,1,1],[0,1,0]],[[1,0,0],[0,0,1],[0,1,1],[1,1,0]]];
      for(const q of Q)for(const rv of[0,1]){const b=p.length/3;(rv?[3,2,1,0]:[0,1,2,3]).forEach(k=>{const v=q[k];p.push(x+v[0],y+v[1],z+v[2]);{const L=ls.length?lightAt(x+v[0],y+v[1],z+v[2],ls):0,tt=id===22?1.1+.8*TS:.95;c.push(tt*(1+L*2.6),tt*(1+L*1.9),tt*(1+L*.8))}u.push((id+(k===1||k===2?.99:.01))/24,k>1?1:0)});i.push(b,b+1,b+2,b,b+2,b+3)}
      continue}
    for(const[d,cs,s]of F){
      const nx=x+d[0],nz=z+d[2];if(nx<0||nz<0||nx>=W||nz>=D)continue;const n=get(nx,y+d[1],nz);
      if(glass?n!==0:(n!==0&&n!==12&&n!==13&&!(n>=16&&n<=22)))continue;
      const b=p.length/3;
      const t=id===1?(d[1]>0?0:d[1]<0?2:1):id;
      cs.forEach((q,k)=>{p.push(x+q[0],y+q[1],z+q[2]);{const ao=AO(x,y,z,d,q)*s,L=ls.length?lightAt(x+q[0],y+q[1],z+q[2],ls):0;c.push(ao*(1+L*2.6),ao*(1+L*1.9),ao*(1+L*.8))}u.push((t+(k===1||k===2?.99:.01))/24,k>1?1:0)});
      i.push(b,b+1,b+2,b,b+2,b+3);
    }
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(u,2));g.setIndex(i);return g;
}
function rc(i,j){let c=chunks[i+j*CX];if(!c){c=chunks[i+j*CX]={o:new THREE.Mesh(new THREE.BufferGeometry(),matO),g:new THREE.Mesh(new THREE.BufferGeometry(),matG)};scene.add(c.o,c.g)}c.o.position.set(0,0,0);c.g.position.set(0,0,0);c.o.geometry.dispose();c.g.geometry.dispose();c.o.geometry=build(false,i*CS,j*CS);c.g.geometry=build(true,i*CS,j*CS)}
function rebuild(x,z){if(x===undefined){lightQ.length=0;for(let j=0;j<CZ;j++)for(let i=0;i<CX;i++)rc(i,j);return}
  const rd=TD?8:1;TD=false;const a0=Math.max(0,Math.floor((x-rd)/CS)),a1=Math.min(CX-1,Math.floor((x+rd)/CS)),b0=Math.max(0,Math.floor((z-rd)/CS)),b1=Math.min(CZ-1,Math.floor((z+rd)/CS));for(let j=b0;j<=b1;j++)for(let i=a0;i<=a1;i++)rc(i,j)}
// when the 128-block window slides, existing chunk meshes only need moving; rebuild the new edge strips
function shiftChunks(dx,dz){const sx=dx/CS,sz=dz/CS,old=chunks.slice();
  for(let k=0;k<chunks.length;k++)chunks[k]=null;
  for(let j=0;j<CZ;j++)for(let i=0;i<CX;i++){const c=old[i+j*CX];if(!c)continue;const ni=i-sx,nj=j-sz;
    if(ni>=0&&nj>=0&&ni<CX&&nj<CZ){chunks[ni+nj*CX]=c;c.o.position.x-=dx;c.o.position.z-=dz;c.g.position.x-=dx;c.g.position.z-=dz}
    else{scene.remove(c.o,c.g);c.o.geometry.dispose();c.g.geometry.dispose()}}}
function rebuildEdge(dx,dz){const sx=dx/CS,sz=dz/CS,xs=[],zs=[],seen=new Set();
  if(sx>0){for(let i=CX-sx;i<CX;i++)xs.push(i);if(CX-sx-1>=0)xs.push(CX-sx-1);xs.push(0)}
  else if(sx<0){for(let i=0;i<-sx;i++)xs.push(i);if(-sx<CX)xs.push(-sx);xs.push(CX-1)}
  if(sz>0){for(let j=CZ-sz;j<CZ;j++)zs.push(j);if(CZ-sz-1>=0)zs.push(CZ-sz-1);zs.push(0)}
  else if(sz<0){for(let j=0;j<-sz;j++)zs.push(j);if(-sz<CZ)zs.push(-sz);zs.push(CZ-1)}
  for(const i of xs)for(let j=0;j<CZ;j++){const k=i+j*CX;if(!seen.has(k)){seen.add(k);rc(i,j)}}
  for(const j of zs)for(let i=0;i<CX;i++){const k=i+j*CX;if(!seen.has(k)){seen.add(k);rc(i,j)}}}

// clouds
const cm=new THREE.MeshBasicMaterial({color:0xffffff});
const clouds=[];
for(let k=0;k<20;k++){const g=new THREE.Group();for(let j=0;j<4;j++){const m=new THREE.Mesh(new THREE.BoxGeometry(5+Math.random()*4,1.5,3+Math.random()*3),cm);m.position.set(j*4-6,Math.random(),Math.random()*2);g.add(m)}
g.position.set(Math.random()*240-60,38+Math.random()*6,Math.random()*240-60);scene.add(g);clouds.push(g)}

// highlight
const hl=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.02,1.02,1.02)),new THREE.LineBasicMaterial({color:0xffffff}));
hl.visible=false;scene.add(hl);let hlT;

// ---------- world ----------
// ---- endless procedural world: a 128x128 window of terrain follows you; your edits are remembered ----
let SEED=1,FLAT=0,ox=0,oz=0,EDITS=new Map();const SEA=6,FLATH=9;
function hs(x,z,s){let h=(x*374761393+z*668265263+s*1274126177)|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296}
function vn(x,z){const xi=Math.floor(x),zi=Math.floor(z),fx=x-xi,fz=z-zi,u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz),a=hs(xi,zi,SEED),b=hs(xi+1,zi,SEED),c=hs(xi,zi+1,SEED),d=hs(xi+1,zi+1,SEED);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v}
function fbm(x,z,o){let s=0,a=.5,f=1;for(let i=0;i<o;i++){s+=a*vn(x*f,z*f);a/=2;f*=2}return s/(1-Math.pow(.5,o))}
let TL=[],TD=false,TS=.08;
function scanTorches(){TL=[];for(let i=0;i<world.length;i++)if(world[i]===22){const x=i%W,rm=(i-x)/W,z=rm%D;TL.push(x,(rm-z)/D,z)}}
function setB(x,y,z,id){const o=world[ix(x,y,z)];world[ix(x,y,z)]=id;EDITS.set((x+ox)+'|'+y+'|'+(z+oz),id);if(o===22||id===22){TD=true;scanTorches()}}
function st(x,y,z,id,soft){if(x<0||z<0||x>=W||z>=D||y<0||y>=H)return;const i=ix(x,y,z);if(soft&&world[i])return;world[i]=id}
let CH=0,CB=0,CM=0;
function mtn(gx,gz){let m=0;const M=[[(hs(1,3,SEED+31)-.5)*30,-44,17,20]],ca=Math.floor(gx/96),cb=Math.floor(gz/96);
  for(let a=ca-1;a<=ca+1;a++)for(let b=cb-1;b<=cb+1;b++)if(hs(a,b,SEED+41)<.5){const x=a*96+16+hs(a,b,SEED+42)*64,z=b*96+16+hs(a,b,SEED+43)*64;if(Math.max(Math.abs(x),Math.abs(z))>50)M.push([x,z,14+hs(a,b,SEED+44)*6,14+hs(a,b,SEED+45)*7])}
  for(const k of M){const u=1-Math.hypot(gx-k[0],gz-k[1])/k[2];if(u>0)m=Math.max(m,Math.pow(u,1.25)*k[3])}return Math.round(m)}
function col(gx,gz){if(FLAT){CH=FLATH;CB=0;CM=0;return}
  const d=Math.max(Math.abs(gx),Math.abs(gz)),t=Math.min(1,Math.max(0,(d-14)/12)),bt=d<26?.5:fbm(gx*.02+50,gz*.02+50,3),b=bt<.43?2:bt>.57?1:0,n=fbm(gx*.03,gz*.03,4);
  let h=SEA+4+(n-.5)*18*(b===2?1.7:b===1?.6:1);h=Math.max(1,Math.min(H-10,Math.round(FLATH+(h-FLATH)*t)));
  if(b===0&&t>=1)h=Math.round(h/2)*2;
  if(t>=1){const rv=Math.abs(fbm(gx*.014+200,gz*.014+200,2)-.5);if(rv<.03)h=Math.min(h,SEA-1);else if(rv<.05)h=Math.min(h,SEA+1);
    if(d>48){const oc=fbm(gx*.006+300,gz*.006+300,2);if(oc<.36)h=Math.max(1,Math.min(h,SEA-1-Math.floor((.36-oc)*40)))}}
  const m=mtn(gx,gz);if(m>0)h=Math.min(H-2,h+m);CH=h;CB=b;CM=m}
function house(x0,z0,hm,b){const wall=4,roof=5;
  for(let z=z0-1;z<=z0+5;z++)for(let x=x0-1;x<=x0+5;x++)for(let y=hm+1;y<=hm+8;y++)st(x,y,z,0);
  for(let z=z0;z<=z0+4;z++)for(let x=x0;x<=x0+4;x++){for(let y=1;y<hm;y++)st(x,y,z,3,1);st(x,hm,z,4);const e=x===x0||x===x0+4||z===z0||z===z0+4;for(let y=hm+1;y<=hm+3;y++)st(x,y,z,e?wall:0);st(x,hm+4,z,roof)}
  for(let z=z0+1;z<=z0+3;z++)for(let x=x0+1;x<=x0+3;x++)st(x,hm+5,z,roof);
  st(x0+2,hm+6,z0+2,roof);st(x0+2,hm+1,z0+4,0);st(x0+2,hm+2,z0+4,0);
  [[x0,z0+2],[x0+4,z0+2],[x0+2,z0]].forEach(([x,z])=>st(x,hm+2,z,12));st(x0+1,hm+1,z0+1,11);st(x0+1,hm+1,z0+2,9);st(x0+3,hm+1,z0+1,4);st(x0+3,hm+1,z0+3,22);st(x0+1,hm+1,z0+5,22)}
function hInfo(x,z){let mx=0,mn=99;for(let dz=0;dz<5;dz++)for(let dx=0;dx<5;dx++){col(x+dx,z+dz);mx=Math.max(mx,CH);mn=Math.min(mn,CH)}return mx-mn<=1&&mn>SEA+2?mx:0}
function houses(){const list=[[-12,-11],[8,-11]];
  for(let a=Math.floor((ox-8)/48);a<=Math.floor((ox+W+8)/48);a++)for(let b=Math.floor((oz-8)/48);b<=Math.floor((oz+D+8)/48);b++){if(hs(a,b,SEED+21)>=.5)continue;const x=a*48+4+Math.floor(hs(a,b,SEED+22)*38),z=b*48+4+Math.floor(hs(a,b,SEED+23)*38);if(Math.max(Math.abs(x),Math.abs(z))>=24)list.push([x,z])}
  for(const[x,z]of list){if(x+5<ox-2||x>ox+W+2||z+5<oz-2||z>oz+D+2)continue;const hm=hInfo(x,z);if(!hm)continue;col(x+2,z+2);house(x-ox,z-oz,hm,CB)}}
function gen(){world.fill(0);const M=6,PW=W+2*M,HM=new Uint8Array(PW*(D+2*M)),BM=new Uint8Array(HM.length),MM=new Uint8Array(HM.length),hi=(x,z)=>(x+M)+PW*(z+M);
  for(let z=-M;z<D+M;z++)for(let x=-M;x<W+M;x++){const gx=x+ox,gz=z+oz;col(gx,gz);const h=CH,b=CB,mh=CM,k=hi(x,z);HM[k]=h;BM[k]=b;MM[k]=mh;
    if(x<0||z<0||x>=W||z>=D)continue;
    const top=mh>3?(h>=20?14:3):b===1?6:b===2?(h>SEA?14:6):(h<=SEA+1?6:1),sub=mh>3?3:top===6?6:2;
    for(let y=0;y<=h;y++)world[ix(x,y,z)]=y===0?3:y===h?top:y>=h-2?sub:3;
    for(let y=h+1;y<=SEA;y++)world[ix(x,y,z)]=13;
    if(!FLAT&&top===1&&h>SEA+1){const q=hs(gx,gz,SEED+5),bq=hs(gx,gz,SEED+13);world[ix(x,h+1,z)]=bq<.007?7:(q<.14?16:q<.15?17:q<.16?18:q<.17?19:q<.18?20:q<.19?21:0);if(bq<.0035)world[ix(x,h+2,z)]=7}}
  if(!FLAT){
    for(let z=-3;z<D+3;z++)for(let x=-3;x<W+3;x++){const gx=x+ox,gz=z+oz;if(Math.max(Math.abs(gx),Math.abs(gz))<18)continue;
      const k=hi(x,z),h=HM[k],b=BM[k],r=hs(gx,gz,SEED+7);if(h<=SEA+1||h>=18||MM[k]>3)continue;
      if(b===0&&r<(forestAt(gx,gz)?.045:.012)){const lf=hs(gx,gz,SEED+11)<.35?23:7;for(let y=h+1;y<=h+4;y++)st(x,y,z,4);for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)for(let dy=h+3;dy<=h+6;dy++)if(dy<=h+4?!(Math.abs(dx)===2&&Math.abs(dz)===2):(dy===h+5?Math.abs(dx)<=1&&Math.abs(dz)<=1:dx===0&&dz===0))st(x+dx,dy,z+dz,lf,1)}
      else if(b===1&&r<.006){const c=2+Math.floor(hs(gx,gz,SEED+9)*3);for(let y=h+1;y<=h+c;y++)st(x,y,z,15)}
      else if(b===2&&r<.012){for(let y=h+1;y<=h+5;y++)st(x,y,z,4);[2,2,1,1,0].forEach((rad,k2)=>{const y=h+3+k2;for(let dx=-rad;dx<=rad;dx++)for(let dz=-rad;dz<=rad;dz++)if(rad<2||Math.abs(dx)+Math.abs(dz)<=3)st(x+dx,y,z+dz,7,1)});st(x,h+8,z,14)}}
    houses()}
  for(const[k,v]of EDITS){const p=k.split('|'),x=+p[0]-ox,z=+p[2]-oz;if(x>=0&&z>=0&&x<W&&z<D)world[ix(x,+p[1],z)]=v}
  scanTorches()}
function startAt(gx,gz,seed,flat){SEED=seed;FLAT=flat;EDITS=new Map();ox=Math.round((gx-W/2)/16)*16;oz=Math.round((gz-D/2)/16)*16;gen();pos.set(gx-ox,FLATH+3,gz-oz);yaw=0;pitch=-.15;fly=false;sync();rebuild();spawnAnimals()}
function newWorld(){RyleAudio.ui('world');setWeather(0);startAt(0,9,1+Math.floor(Math.random()*99999),0)}
// the window re-centres on you when you walk near its edge; new land appears, your edits stay
function recenter(){const nx=Math.round((ox+pos.x-W/2)/16)*16,nz=Math.round((oz+pos.z-D/2)/16)*16,dx=nx-ox,dz=nz-oz;if(!dx&&!dz)return;
  if(lightQ.length){const sx=dx/CS,sz=dz/CS,q=[];for(const k of lightQ){const i=k%CX,j=(k-i)/CX,ni=i-sx,nj=j-sz;if(ni>=0&&nj>=0&&ni<CX&&nj<CZ)q.push(ni+nj*CX)}lightQ=q}
  ox=nx;oz=nz;pos.x-=dx;pos.z-=dz;gen();
  if(chunks.some(Boolean)&&Math.abs(dx)<W&&Math.abs(dz)<D&&dx%CS===0&&dz%CS===0){shiftChunks(dx,dz);rebuildEdge(dx,dz)}else rebuild();
  for(let k=A.length-1;k>=0;k--){const a=A[k];a.x-=dx;a.z-=dz;if(a!==riding&&(a.x<4||a.z<4||a.x>W-4||a.z>D-4)){killA(a,k)}}
  spawnFish()}
function save(){
  try{localStorage.setItem(KEY,JSON.stringify({s:SEED,f:FLAT,e:[...EDITS],p:[pos.x+ox,pos.y,pos.z+oz,yaw,pitch],x:WX,an:ANSAVE()}));toast('Saved! ✅');RyleAudio.ui('save');return true}
  catch(e){toast('Could not save here');return false}
}
function hasSave(){try{return !!localStorage.getItem(KEY)}catch(e){return false}}
function load(){
  try{const d=JSON.parse(localStorage.getItem(KEY));if(!d||d.s==null)return false;SEED=d.s;FLAT=d.f;EDITS=new Map(d.e);
    ox=Math.round((d.p[0]-W/2)/16)*16;oz=Math.round((d.p[2]-D/2)/16)*16;gen();pos.set(d.p[0]-ox,d.p[1],d.p[2]-oz);yaw=d.p[3];pitch=d.p[4];setWeather(d.x||0);rebuild();if(d.an&&d.an.length)restoreAnimals(d.an);else spawnAnimals();return true}catch(e){return false}
}
function toast(t){const e=document.getElementById('toast');e.textContent=t;e.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('show'),1600)}

// ---------- camera / movement ----------
const pos=new THREE.Vector3(16,2.6,29);let yaw=0,pitch=-.15,jx=0,jy=0,vy=0,eyeY=2.6;
const EYE=1.6,PR=.25;
function ground(x,z){x=Math.floor(x);z=Math.floor(z);for(let y=H-1;y>=0;y--){const b=get(x,y,z);if(b&&b!==13&&(b<16||b>22))return y+1}return 0}
function gnd(x,z,top){x=Math.floor(x);z=Math.floor(z);for(let y=Math.min(H-1,Math.floor(top));y>=0;y--){const b=get(x,y,z);if(b&&b!==13&&(b<16||b>22))return y+1}return 0}
// body is a small square, not a point: keeps the camera/eye clear of block faces
function blockedAt(x,z,feet){for(const sx of[-PR,PR])for(const sz of[-PR,PR])if(gnd(x+sx,z+sz,feet+1.7)>feet+.3)return true;return false}
let vv=0,onG=false,jumpHeld=false;
function stepMove(dt){const wasSw=swimming;swimming=false;
  const sp=(riding?9:fly?13:5)*(wasSw?.7:1)*dt,fx=-Math.sin(yaw),fz=-Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw);
  const mx=(fx*jy+rx*jx)*sp,mz=(fz*jy+rz*jx)*sp;
  if(mx||mz){ph=Math.atan2(-mx,-mz);mvg=1}else mvg=0;
  const nx=Math.min(W-.3,Math.max(.3,pos.x+mx)),nz=Math.min(D-.3,Math.max(.3,pos.z+mz));
  const feet=pos.y-EYE;
  if(fly){
    if(!blockedAt(nx,pos.z,feet))pos.x=nx;
    if(!blockedAt(pos.x,nz,feet))pos.z=nz;
    const ny=Math.min(H+10,Math.max(1.8,pos.y+vy*9*dt));
    if(!blockedAt(pos.x,pos.z,ny-EYE))pos.y=ny;
  }else{
    if(!blockedAt(nx,pos.z,feet))pos.x=nx;
    if(!blockedAt(pos.x,nz,feet))pos.z=nz;
    
    const wx0=Math.floor(pos.x),wz0=Math.floor(pos.z),feetY=pos.y-EYE,
      inW=get(wx0,Math.floor(feetY+.3),wz0)===13,
      eyeW=get(wx0,Math.floor(pos.y),wz0)===13,
      wet=inW||eyeW,
      deep=wet&&(eyeW||get(wx0,Math.floor(feetY+1.2),wz0)===13||get(wx0,Math.floor(feetY-.1),wz0)===13),
      jp=jumpHeld||keys[' ']||vy>0;
    if(wet){swimming=deep;vv=(deep&&vy<0)?-4:jp?(eyeW?3.5:10):(deep?Math.max(-2.5,Math.min(3,(SEA+1.2-pos.y)*4)):Math.max(vv-6*dt,-2.5))}else{if(jp&&onG){vv=10;RyleAudio.jump()}vv=Math.max(-30,vv-24*dt)}
    pos.y+=vv*dt;
    const fl=gnd(pos.x,pos.z,pos.y-EYE+1.1)+EYE;
    if(pos.y<=fl){const fall=Math.abs(vv);pos.y=fl;if(!onG&&!fly){const ly=Math.floor(fl)-1;RyleAudio.land(get(Math.floor(pos.x),ly,Math.floor(pos.z))||1,Math.min(1.1,fall/16))}vv=0;onG=true}else onG=false;
    
    
  }
}
function sync(){vv=0;jumpHeld=false;document.getElementById('tF').classList.toggle('on',fly);document.getElementById('ud').classList.toggle('hide',!fly);document.getElementById('jp').classList.toggle('hide',fly)}

// ---------- weather: automatic cycle (clear, rain, thunder); night stays manual ----------
// Minecraft-style: long clear spells, shorter rain, and the odd thunderstorm. Tapping the
// sun button skips ahead; picking night pauses the cycle until you skip back to daytime.
let WX=0,WXAUTO=true,wxT=0,ltT=9,wxFlash=0;
const WXS=[
  {n:'Sunny day ☀️',i:'☀️',sky:0x74c6ff,tint:'#ffffff',cl:0xffffff,fn:45,ff:95},
  {n:'Rainy day 🌧️',i:'🌧️',sky:0x8e9aa6,tint:'#b4bcc6',cl:0x8a949e,fn:25,ff:75},
  {n:'Night 🌙',i:'🌙',sky:0x1a2358,tint:'#a3b0e0',cl:0x5a628f,fn:35,ff:85},
  {n:'Thunderstorm ⛈️',i:'⛈️',sky:0x59636e,tint:'#8d97a3',cl:0x555e69,fn:16,ff:55}];
const skyC=new THREE.Color(WXS[0].sky),skyG=new THREE.Color(WXS[0].sky);
const cloudC=new THREE.Color(WXS[0].cl),cloudG=new THREE.Color(WXS[0].cl);
const tintC=new THREE.Color(0xffffff),tintG=new THREE.Color(0xffffff);
let FN=45,FF=95,FNG=45,FFG=95,rainA=0,starA=0,orbA=1;
const rainN=700,rp=new Float32Array(rainN*6),rd=[];
for(let k=0;k<rainN;k++)rd.push([0,-999,0]);
const rainG=new THREE.BufferGeometry();rainG.setAttribute('position',new THREE.BufferAttribute(rp,3));
const rain=new THREE.LineSegments(rainG,new THREE.LineBasicMaterial({color:0xaec6e8,transparent:true,opacity:0,fog:false}));rain.frustumCulled=false;rain.visible=false;scene.add(rain);
const spp=new Float32Array(1200);for(let k=0;k<400;k++){const a=Math.random()*6.283,b=Math.random()*1.4+.05,r=170;spp[k*3]=Math.cos(a)*Math.cos(b)*r;spp[k*3+1]=Math.sin(b)*r;spp[k*3+2]=Math.sin(a)*Math.cos(b)*r}
const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.BufferAttribute(spp,3));
const stars=new THREE.Points(sg,new THREE.PointsMaterial({color:0xffffff,size:2.5,sizeAttenuation:false,fog:false,transparent:true,opacity:0}));stars.frustumCulled=false;stars.visible=false;scene.add(stars);
const orb=new THREE.Mesh(new THREE.BoxGeometry(16,16,2),new THREE.MeshBasicMaterial({color:0xfff2a0,fog:false,transparent:true,opacity:1}));orb.frustumCulled=false;scene.add(orb);
// spell lengths in seconds: calm weather lasts longest, storms are short and rare
function wxDur(i){return i===2?0:i===1?45+Math.random()*50:i===3?20+Math.random()*28:100+Math.random()*100}
function setWeather(i){
  WX=i;const w=WXS[i];skyG.setHex(w.sky);cloudG.setHex(w.cl);FNG=w.fn;FFG=w.ff;
  document.getElementById('tint').style.backgroundColor=w.tint;
  const ts=i===2?1:(i===1||i===3)?.35:.08;
  if(ts!==TS){TS=ts;lightQ.length=0;if(chunks.length){const seen=new Set();for(let k=0;k<TL.length;k+=3){const ci=Math.floor(TL[k]/CS),cj=Math.floor(TL[k+2]/CS);for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){const a=ci+di,b=cj+dj;if(a>=0&&b>=0&&a<CX&&b<CZ){const key=a+b*CX;if(!seen.has(key)){seen.add(key);lightQ.push(key)}}}}}}
  tintG.setRGB(i===2?.62:1,i===2?.68:1,i===2?.88:1);
  orb.material.color.setHex(i===2?0xf4f6ff:0xfff2a0);
  document.getElementById('wx').textContent=w.i;
  if(i!==2)wxT=wxDur(i);
}
function advanceWeather(){
  const r=Math.random();let n=0;
  if(WX===0)n=r<.76?1:0;          // clear usually rolls into rain now and then
  else if(WX===1)n=r<.55?0:r<.86?1:3; // rain often clears, sometimes builds into a storm
  else if(WX===3)n=r<.6?1:0;      // storms ease back to rain or clear
  if(n===WX)wxT=wxDur(WX);else{setWeather(n);if(!$('hud').classList.contains('hide'))toast(WXS[n].n)}
}
function lightning(){
  wxFlash=1;
  if(window.RyleAudio&&RyleAudio.thunder)RyleAudio.thunder();
}
function stepWeather(dt){
  const k=Math.min(1,dt*1.6);
  skyC.lerp(skyG,k);cloudC.lerp(cloudG,k);FN+=(FNG-FN)*k;FF+=(FFG-FF)*k;
  if(Math.abs(tintC.r-tintG.r)+Math.abs(tintC.g-tintG.g)+Math.abs(tintC.b-tintG.b)<.004)tintC.copy(tintG);else tintC.lerp(tintG,k);
  matO.color.copy(tintC);matG.color.copy(tintC);cm.color.copy(cloudC);
  const rr=WX===3?.78:WX===1?.62:0;
  rainA+=(rr-rainA)*Math.min(1,dt*2.4);rain.material.opacity=rainA;rain.visible=rainA>.01;
  starA+=((WX===2?1:0)-starA)*Math.min(1,dt*1.8);stars.material.opacity=starA;stars.visible=starA>.01;
  orbA+=((WX===0||WX===2?1:0)-orbA)*Math.min(1,dt*1.8);orb.material.opacity=orbA;orb.visible=orbA>.01;
  if(WX===3){ltT-=dt;if(ltT<=0){ltT=8+Math.random()*10;lightning()}}
  if(wxFlash>0){wxFlash=Math.max(0,wxFlash-dt*3.2);const fl=document.getElementById('flash');if(fl)fl.style.opacity=wxFlash.toFixed(3)}
  if(WXAUTO&&WX!==2){wxT-=dt;if(wxT<=0)advanceWeather()}
}
function stepRain(dt){if(rainA<=.01)return;const cx=cam.position.x,cy=cam.position.y,cz=cam.position.z;
  for(let k=0;k<rainN;k++){const d=rd[k];d[1]-=24*dt;
    if(d[1]<cy-14||Math.abs(d[0]-cx)>30||Math.abs(d[2]-cz)>30){d[0]=cx+Math.random()*60-30;d[1]=cy+Math.random()*28-12;d[2]=cz+Math.random()*60-30}
    const o=k*6;rp[o]=d[0];rp[o+1]=d[1];rp[o+2]=d[2];rp[o+3]=d[0]+.15;rp[o+4]=d[1]+.8;rp[o+5]=d[2]}
  rainG.attributes.position.needsUpdate=true}
// ---------- animals ----------
function box(w,h,d,c,x,y,z,g){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshBasicMaterial({color:c}));m.position.set(x,y,z);g.add(m)}
function chicken(){const g=new THREE.Group();box(.4,.35,.5,0xffffff,0,.4,0,g);box(.22,.28,.22,0xffffff,0,.68,-.28,g);box(.1,.08,.14,0xffa31a,0,.66,-.43,g);box(.08,.1,.14,0xe53935,0,.86,-.28,g);box(.1,.2,.12,0xf0f0f0,0,.5,.3,g);box(.04,.04,.02,0x111111,-.07,.72,-.395,g);box(.04,.04,.02,0x111111,.07,.72,-.395,g);box(.05,.25,.05,0xffa31a,-.1,.12,0,g);box(.05,.25,.05,0xffa31a,.1,.12,0,g);return g}
function cat(c){const g=new THREE.Group();box(.34,.3,.7,c,0,.35,0,g);box(.3,.28,.28,c,0,.55,-.42,g);box(.08,.1,.06,c,-.1,.74,-.45,g);box(.08,.1,.06,c,.1,.74,-.45,g);box(.06,.06,.02,0x111111,-.07,.58,-.565,g);box(.06,.06,.02,0x111111,.07,.58,-.565,g);box(.06,.04,.02,0xf48fb1,0,.52,-.565,g);box(.08,.08,.5,c,0,.5,.55,g);[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(q=>box(.08,.2,.08,c,q[0]*.11,.1,q[1]*.22,g));return g}
const A=[];
function spawnAnimals(){A.forEach(a=>scene.remove(a.g));A.length=0;const cc=[0xf0a04b,0x8a8a8a,0x2b2b2b,0xf5f5f5];
  for(let k=0;k<13;k++){const g=k<8?chicken():cat(cc[k%4]),x=W/2+(Math.random()-.5)*26,z=D/2-4+Math.random()*17,h=Math.random()*6.28;scene.add(g);A.push({g,x,z,y:ground(x,z),h,tg:h,sp:k<8?.9:1.3,t:0,mv:0,ph:k})}}
function stepAnimals(dt){for(const a of A){a.t-=dt;if(a.t<=0){a.t=1+Math.random()*3;a.mv=Math.random()<.7;a.tg=a.h+(Math.random()-.5)*2.5}
  a.h+=Math.max(-3*dt,Math.min(3*dt,a.tg-a.h));
  if(a.mv){const nx=a.x-Math.sin(a.h)*a.sp*dt,nz=a.z-Math.cos(a.h)*a.sp*dt,gy=ground(a.x,a.z),ng=ground(nx,nz);
    if(nx<2||nz<2||nx>W-2||nz>D-2||ng>gy+1.1||get(Math.floor(nx),ng,Math.floor(nz))===13){a.tg=a.h+Math.PI*(.5+Math.random());a.mv=0}else{a.x=nx;a.z=nz}}
  a.y+=(ground(a.x,a.z)-a.y)*Math.min(1,dt*10);
  a.g.position.set(a.x,a.y+(a.mv?Math.abs(Math.sin(performance.now()*.012+a.ph))*.05:0),a.z);a.g.rotation.y=a.h}}
// ---------- player (third person) ----------
let third=true,ph=0,mvg=0,pt=0,sw=0,spawnT=3,riding=null,swimming=false;
const shG=new THREE.CircleGeometry(.5,12),shM=new THREE.MeshBasicMaterial({color:0,transparent:true,opacity:.2,depthWrite:false});
function shadow(g,r){const m=new THREE.Mesh(shG,shM);m.rotation.x=-Math.PI/2;m.position.y=.04;m.scale.setScalar(r);m.userData.nt=1;g.add(m)}
const me=new THREE.Group();me.visible=true;scene.add(me);shadow(me,.6);
function limb(x,y,c,w,h){const g=new THREE.Group();g.position.set(x,y,0);box(w,h,w,c,0,-h/2,0,g);me.add(g);return g}
function limb2(x,y,parts){const g=new THREE.Group();g.position.set(x,y,0);parts.forEach(p=>box(p[0],p[1],p[2],p[3],p[4],p[5],p[6],g));me.add(g);return g}
function leg(x,s){return limb2(x,.6,[[.26,.4,.26,0xb5702c,0,-.2,0],[.06,.14,.2,0xc98a3a,s*.15,-.2,0],[.3,.1,.3,0xdcd2c8,0,-.45,0],[.28,.08,.36,0x8a4b22,0,-.54,-.04],[.3,.04,.4,0x9a98a0,0,-.58,-.04]])}
function arm(x){return limb2(x,1.28,[[.22,.5,.22,0x1f8cf0,0,-.25,0],[.2,.16,.2,0xf6c28f,0,-.57,0]])}
function armR(){const g=new THREE.Group();g.position.set(.36,1.28,0);
  box(.22,.28,.22,0x1f8cf0,0,-.14,0,g);
  const e=new THREE.Group();e.position.set(0,-.28,0);g.add(e);
  box(.22,.22,.22,0x1f8cf0,0,-.11,0,e);
  box(.2,.16,.2,0xf6c28f,0,-.29,0,e);
  me.add(g);g.userData.elbow=e;return g}
me.legL=leg(-.13,-1);me.legR=leg(.13,1);me.armL=arm(-.36);me.armR=armR();me.armL.rotation.z=-.3;me.armR.rotation.z=.3;
me.elbowR=me.armR.userData.elbow;me.elbowR.rotation.x=1.9;
// Minecraft-style tools held in the right hand
function toolModel(kind){const g=new THREE.Group();
  const wood=0x8b5a2b,wood2=0xb8803f,dark=0x6b4423,iron=0xb8bcc2,dia=0x33d6cc,glow=0xc9fff9;
  box(.12,.3,.12,wood,0,-.12,0,g);box(.14,.08,.14,dark,0,-.02,0,g);
  if(kind!=='sword')box(.12,.34,.12,wood2,0,-.44,0,g);
  if(kind==='sword'){
    box(.16,.1,.16,dark,0,.07,0,g);box(.4,.08,.12,dark,0,-.3,0,g);
    box(.06,.14,.14,dark,-.21,-.3,0,g);box(.06,.14,.14,dark,.21,-.3,0,g);
    box(.2,.5,.07,dia,0,-.59,0,g);box(.15,.38,.07,dia,0,-.97,0,g);
    box(.09,.1,.07,dia,0,-1.19,0,g);box(.06,.85,.08,glow,0,-.78,0,g);
    box(.08,.08,.14,glow,0,-.3,0,g);
  }else if(kind==='pick'){
    box(.16,.08,.16,dark,0,-.58,0,g);box(.2,.16,.18,iron,0,-.68,0,g);
    [-1,1].forEach(s=>{box(.18,.1,.14,iron,s*.19,-.69,0,g);box(.16,.08,.12,iron,s*.34,-.73,0,g);box(.1,.1,.1,iron,s*.44,-.78,0,g)});
    box(.12,.1,.12,wood2,0,-.8,0,g);box(.16,.08,.16,dark,0,-.9,0,g);
  }else{
    box(.16,.08,.16,dark,0,-.58,0,g);box(.46,.2,.24,wood2,0,-.72,0,g);
    box(.5,.24,.26,wood2,0,-.72,0,g);box(.52,.05,.28,dark,0,-.66,0,g);
    box(.52,.05,.28,dark,0,-.78,0,g);box(.06,.26,.28,iron,-.27,-.72,0,g);
    box(.06,.26,.28,iron,.27,-.72,0,g);box(.14,.14,.3,wood2,0,-.72,0,g);
    box(.1,.1,.1,dark,0,-.58,0,g);
  }
  const GRIP_LIFT=.18;
  g.children.forEach(c=>c.position.y+=GRIP_LIFT);
  g.userData.grip=GRIP_LIFT;
  return g}
me.wristR=new THREE.Group();me.wristR.position.set(0,-.34,0);me.wristR.rotation.order='YXZ';me.wristR.rotation.x=0;me.wristR.rotation.y=-.5;me.wristR.rotation.z=.35;me.elbowR.add(me.wristR);
me.sword=toolModel('sword');me.wristR.add(me.sword);me.sword.visible=false;
me.pick=toolModel('pick');me.wristR.add(me.pick);me.pick.visible=false;
me.hammer=toolModel('hammer');me.wristR.add(me.hammer);me.hammer.visible=true;
function tools(m,force){const b=m==='build'&&!force,e=m==='erase'&&!force,s=!!force||m==='sword';me.hammer.visible=b;me.pick.visible=e;me.sword.visible=s;
  // first person holds the selected block in build mode; the third-person builder keeps the hammer
  vm.hammer.visible=false;vm.pick.visible=e;vm.sword.visible=s;vmBlock.visible=b}
// ---- first-person hand (Minecraft style): one right hand tucked into the bottom-right corner ----
// The forearm hangs along local -Y from an off-screen shoulder anchor, with a short cuff and fist
// kept small so the tool stays the focus. The tool is rotated at the wrist so it runs diagonally
// up-left across the screen instead of straight up the arm.
const VM_REST_X=2.30,VM_REST_Z=-.10,VM_SCALE=.5,VM_ARM_SCALE=.6;
const VM_REF_ASPECT=1.78,VM_NDC=.84,VM_NDC_Y=-.80,VM_DEPTH=.57,
  VM_WRIST_Z=-.55,VM_WRIST_Y=.42*VM_ARM_SCALE;
// wrist offset from the shoulder anchor in camera space, used to pin the fist to the corner
const VM_HAND_L=.42*VM_ARM_SCALE*VM_SCALE,
  VM_HAND_OFF=.0998*VM_HAND_L,VM_HAND_Y=.663*VM_HAND_L,VM_HAND_D=.742*VM_HAND_L;
const vm=new THREE.Group(),vmBase=new THREE.Group(),vmR=new THREE.Group(),
  vmArm=new THREE.Group(),vmScene=new THREE.Scene(),
  vmCam=new THREE.PerspectiveCamera(70,1,.01,20);vmCam.rotation.order='YXZ';
box(.22,.34,.22,0x1f8cf0,0,-.17,0,vmArm);box(.28,.196,.28,0xf6c28f,0,-.42,0,vmArm);
vmArm.scale.setScalar(VM_ARM_SCALE);vmR.scale.setScalar(VM_SCALE);vmR.add(vmArm);
const vmWrist=new THREE.Group();vmWrist.position.set(0,-VM_WRIST_Y,0);vmWrist.rotation.z=VM_WRIST_Z;vmR.add(vmWrist);
['hammer','pick','sword'].forEach(k=>{vm[k]=me[k].clone();vm[k].visible=false;vmWrist.add(vm[k])});
// held block for build mode: a shaded cube riding in the same fist, facing the camera at a corner
const vmBlock=new THREE.Group();vmBlock.visible=false;
const vmBlockMesh=new THREE.Mesh(new THREE.BoxGeometry(.42,.42,.42),[null,null,null,null,null,null]);
vmBlock.add(vmBlockMesh);vmBlock.position.set(0,-.28,0);vmBlock.rotation.order='YXZ';vmBlock.rotation.set(.35,.55,.35);
vmWrist.add(vmBlock);
// flowers, tall grass and the torch are crossed-quad sprites in the world, not
// cubes, so the held item uses the same two-plane model instead of a textured box
const vmBlockCross=new THREE.Group(),vmCrossGeo=new THREE.PlaneGeometry(.54,.54),
  vmCrossA=new THREE.Mesh(vmCrossGeo),vmCrossB=new THREE.Mesh(vmCrossGeo);
vmCrossB.rotation.y=Math.PI/2;vmBlockCross.add(vmCrossA,vmCrossB);
// hold it the way it grows: the stem/base sits in the fist, the blossom (or
// torch flame) points away up-left, exactly like the upright world sprite
vmBlockCross.rotation.x=Math.PI;
vmBlockCross.position.y=.03;vmBlockCross.visible=false;vmBlock.add(vmBlockCross);
const dcache={};
function dmat(t){return dcache[t]||(dcache[t]=(()=>{const m=tmat(t).clone();m.side=THREE.DoubleSide;return m})())}
const BLK_SHADE=[.72,.72,1,.6,.86,.78],bcache={};
function bmat(t,s){const kb=t+'|'+s;return bcache[kb]||(bcache[kb]=(()=>{const m=tmat(t).clone();m.color.setScalar(s);return m})())}
function updateHeldBlock(){
  // plant + torch ids use the cut-out sprite model
  if(cur>=16&&cur<=22){
    const m=dmat(cur);
    if(vmCrossA.material!==m){vmCrossA.material=m;vmCrossB.material=m}
    vmBlockMesh.visible=false;vmBlockCross.visible=true;
    return;
  }
  vmBlockMesh.visible=true;vmBlockCross.visible=false;
  const side=cur===1?1:cur,top=cur===1?0:cur,bot=cur===1?2:cur;
  vmBlockMesh.material=[bmat(side,BLK_SHADE[0]),bmat(side,BLK_SHADE[1]),bmat(top,BLK_SHADE[2]),
    bmat(bot,BLK_SHADE[3]),bmat(side,BLK_SHADE[4]),bmat(side,BLK_SHADE[5])];
}
vmBase.add(vmR);vm.add(vmBase);
vmBase.position.set(.38,-.38,-.34);vmBase.rotation.order='YXZ';vmBase.rotation.set(VM_REST_X,0,VM_REST_Z);
vm.visible=false;vmCam.add(vm);vmScene.add(vmCam);
const tcache={};
function tmat(t){return tcache[t]||(tcache[t]=(()=>{const c=document.createElement('canvas');c.width=c.height=16;c.getContext('2d').drawImage(AT,t*16,0,16,16,0,0,16,16);const x=new THREE.CanvasTexture(c);x.magFilter=x.minFilter=THREE.NearestFilter;x.generateMipmaps=false;return new THREE.MeshBasicMaterial({map:x,alphaTest:.5})})())}
let vt=0;
// ---- per-tool swing animator: one active timeline, one queued follow-up, shared pose for both views ----
const MODE_TOOL={build:'hammer',erase:'pick',sword:'sword'};
const SWING={
  pick:{dur:.48,impact:.55,pose:'chop',k:1},
  hammer:{dur:.50,impact:.55,pose:'chop',k:1.12},
  sword:{dur:.38,impact:.50,pose:'slash',k:1}
};
const ELBOW_REST=1.9,WRIST_Y=-.5,WRIST_X_REST=.9,VWRIST_REST=.05;
const POSE_KEYS=['shX','shZ','elX','wrX','wrY','vmX','vmZ','vwX','vwY','fpX','fpY'];
const ZERO=[0,0,0,0,0,0,0,0,0,0,0];
const CHOP_WIND=[-.55,0,.25,.35,0,-.18,0,.35,0,.015,-.01];
const CHOP_HIT=[1.0,0,-1.10,-.40,0,0,0,-.50,0,-.135,.19];
const SLASH_WIND=[-.20,.35,.10,.20,-.20,-.15,.25,.20,-.25,.02,-.01];
const SLASH_HIT=[.85,-.45,-.75,-.30,.90,-.10,-.30,-.12,0,-.12,.13];
const pose={shX:0,shZ:0,elX:0,wrX:0,wrY:0,vmX:0,vmZ:0,vwX:0,vwY:0,fpX:0,fpY:0};
let anim=null,animNext=null;
function mix(a,b,t){return a+(b-a)*t}
function smooth(t){return t*t*(3-2*t)}
function resetPose(){for(const k in pose)pose[k]=0}
function applyKeys(out,from,to,t,k){for(let i=0;i<POSE_KEYS.length;i++)out[POSE_KEYS[i]]=mix(from[i],to[i],t)*k}
function poseSwing(kind,p,out){
  for(const k in out)out[k]=0;
  const s=SWING[kind];if(!s)return;
  p=Math.max(0,Math.min(1,p));
  const wind=s.impact*.36;
  const from=s.pose==='slash'?SLASH_WIND:CHOP_WIND;
  const to=s.pose==='slash'?SLASH_HIT:CHOP_HIT;
  if(p<wind)applyKeys(out,ZERO,from,wind?smooth(p/wind):0,s.k);
  else if(p<s.impact){const t=(p-wind)/(s.impact-wind);applyKeys(out,from,to,t*t,s.k)}
  else{const t=(p-s.impact)/(1-s.impact);applyKeys(out,to,ZERO,1-(1-t)*(1-t),s.k)}
}
function startSwing(kind,act){
  if(!SWING[kind])return;
  if(!anim){anim={kind,act:act||null,t:0,fired:false};RyleAudio.toolSwing(kind)}
  else if(!animNext)animNext={kind,act:act||null};
}
function stepSwing(dt){
  if(!anim)return;
  const s=SWING[anim.kind];
  anim.t+=dt;
  const p=Math.min(1,anim.t/s.dur);
  if(!anim.fired&&p>=s.impact){anim.fired=true;if(anim.act)anim.act()}
  poseSwing(anim.kind,p,pose);
  if(p>=1){
    const next=animNext;anim=null;animNext=null;resetPose();
    if(next)startSwing(next.kind,next.act);
  }
}
function cancelSwing(){anim=null;animNext=null;resetPose()}
function stepVM(dt){
  // The hands render through their own camera so narrow/portrait screens can widen the
  // view-model FOV. The arm keeps its Minecraft footprint and the world view stays at 70°.
  const s=Math.min(1,Math.max(.55,Math.pow(cam.aspect/VM_REF_ASPECT,.45)));
  vmCam.position.copy(cam.position);vmCam.rotation.copy(cam.rotation);
  vmCam.aspect=cam.aspect;
  vmCam.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(cam.fov*Math.PI/360)/s));
  vmCam.updateProjectionMatrix();vmCam.updateMatrixWorld(true);
  if(!vm.visible)return;
  const walk=!fly&&!riding&&mvg?1:0;
  vt+=dt*9*(walk?1:swimming?.45:0);
  // Pin the fist to the bottom-right corner for the current aspect and view-model FOV.
  // Portrait screens get a smaller rig so the diagonal tool cannot reach the crosshair.
  const t=Math.tan(vmCam.fov*Math.PI/360),hh=t*VM_DEPTH,hw=hh*vmCam.aspect;
  const k=Math.min(1,Math.max(.6,Math.pow(cam.aspect/VM_REF_ASPECT,.35)));
  const sw=Math.pow(k,3);
  vm.scale.setScalar(k);
  vmBlock.position.set(cam.aspect<1?.3:0,cam.aspect<1?-.95:-.28,0);
  vmBase.position.x=VM_NDC*hw/k+VM_HAND_OFF;
  vmBase.position.y=VM_NDC_Y*hh/k-VM_HAND_Y;
  vmBase.position.z=-VM_DEPTH/k+VM_HAND_D;
  vmWrist.rotation.x=VWRIST_REST+pose.vwX*sw;vmWrist.rotation.y=pose.vwY*sw;vmWrist.rotation.z=VM_WRIST_Z;
  // The base points the arm up/forward, so a forward chop needs the opposite local pitch.
  vmR.rotation.x=-pose.vmX*sw;vmR.rotation.z=pose.vmZ*sw;
  const jump=onG?0:Math.max(-.03,Math.min(.03,vv*.0035));
  vm.position.set((walk?Math.cos(vt*.5)*.01:0)/k+pose.fpX*hw*k*k,
    ((walk?Math.sin(vt)*.014:0)+jump)/k+pose.fpY*hh*k*k,0);}
// Rylecraft hero: blue hoodie, backpack, goggles, messy brown hair
box(.5,.7,.28,0x1f8cf0,0,.95,0,me);box(.52,.1,.3,0x2a9cff,0,.64,0,me);box(.3,.08,.3,0x1b7ad8,0,1.3,0,me);
box(.05,.22,.02,0xffffff,-.08,1.12,-.15,me);box(.05,.22,.02,0xffffff,.08,1.12,-.15,me);box(.2,.16,.02,0xf2f2f2,0,.84,-.15,me);
box(.4,.5,.2,0x8a4b22,0,1.0,.24,me);box(.1,.08,.02,0xf5c518,0,.92,.345,me);box(.1,.2,.14,0x6f3a1a,-.24,.85,.24,me);box(.1,.2,.14,0x6f3a1a,.24,.85,.24,me);
box(.07,.62,.02,0x8a4b22,-.17,1.0,-.15,me);box(.07,.62,.02,0x8a4b22,.17,1.0,-.15,me);box(.06,.06,.02,0xf5c518,-.17,1.12,-.16,me);box(.06,.06,.02,0xf5c518,.17,1.12,-.16,me);
box(.5,.5,.5,0xf6c28f,0,1.55,0,me);
[-1,1].forEach(s=>{box(.12,.12,.02,0xffffff,s*.12,1.58,-.255,me);box(.07,.1,.02,0x2a1a10,s*.11,1.58,-.265,me);box(.025,.025,.02,0xffffff,s*.1,1.62,-.275,me);box(.13,.035,.02,0x5b3a1e,s*.12,1.69,-.26,me);box(.08,.05,.02,0xf3a38a,s*.19,1.5,-.255,me);box(.06,.22,.5,0x8a4a22,s*.28,1.62,.02,me);box(.2,.16,.08,0xe0b87a,s*.13,1.92,-.2,me);box(.15,.11,.02,0x3fa0ff,s*.13,1.92,-.245,me)});
box(.2,.07,.02,0x7a1f1f,0,1.42,-.255,me);box(.16,.025,.02,0xffffff,0,1.455,-.265,me);box(.1,.03,.02,0xf06a78,0,1.4,-.265,me);
box(.54,.14,.54,0x8a4a22,0,1.82,0,me);box(.54,.35,.08,0x8a4a22,0,1.6,.27,me);box(.54,.1,.1,0x8a4a22,0,1.77,-.22,me);
box(.12,.1,.08,0x6a3818,-.18,1.73,-.27,me);box(.12,.1,.08,0x6a3818,.02,1.72,-.27,me);box(.12,.1,.08,0x6a3818,.18,1.73,-.27,me);
box(.14,.14,.14,0x6a3818,-.16,1.94,.05,me);box(.14,.12,.14,0x6a3818,.1,1.93,-.05,me);box(.12,.14,.12,0x6a3818,0,1.98,.1,me);box(.56,.05,.56,0x8a8a92,0,1.86,0,me);
function stepMe(dt){if(!third)return;me.position.set(pos.x,pos.y-EYE+(riding?(riding.rh||1.25)-.6:0),pos.z);
  const d=Math.atan2(Math.sin(ph-me.rotation.y),Math.cos(ph-me.rotation.y));me.rotation.y+=d*Math.min(1,dt*12);
  const mm=(riding||fly)?0:mvg;pt+=dt*9*mm;sw+=((mm?Math.sin(pt)*.7:0)-sw)*Math.min(1,dt*14);
  me.legL.rotation.x=sw;me.legR.rotation.x=-sw;if(riding)me.legL.rotation.x=me.legR.rotation.x=-1.3;me.armL.rotation.x=-sw;me.armR.rotation.x=sw;
  me.armR.rotation.x=(anim?0:sw)+pose.shX;me.armR.rotation.z=.3+pose.shZ;
  me.elbowR.rotation.x=ELBOW_REST+pose.elX;me.wristR.rotation.x=WRIST_X_REST+pose.wrX;me.wristR.rotation.y=WRIST_Y+pose.wrY;
  swimPose(dt)}
// deep water: your builder lies on the surface and swims (crawl stroke arms + flutter kick)
let sk=0,spt=0;
function updUD(){const v=fly||(swimming&&!riding);document.getElementById('ud').classList.toggle('hide',!v);document.getElementById('jp').classList.toggle('hide',v)}
function swimPose(dt){const on=swimming&&!riding?1:0;sk+=(on-sk)*Math.min(1,dt*6);me.rotation.order='YXZ';me.rotation.x=-1.25*sk;me.children[0].visible=sk<.3;
  if(sk>.02){spt+=dt*(mvg?9:3);const a=Math.PI*(.5+.5*Math.sin(spt)),b=Math.PI*(.5-.5*Math.sin(spt)),k=Math.sin(spt*2)*.35;
    me.armR.rotation.x=me.armR.rotation.x*(1-sk)+a*sk;me.armL.rotation.x=me.armL.rotation.x*(1-sk)+b*sk;me.legL.rotation.x=me.legL.rotation.x*(1-sk)+k*sk;me.legR.rotation.x=me.legR.rotation.x*(1-sk)-k*sk;
    me.elbowR.rotation.x=ELBOW_REST;me.wristR.rotation.x=WRIST_X_REST;me.wristR.rotation.y=WRIST_Y;
    me.position.y+=(Math.min(SEA+1-.35,pos.y-.55)-me.position.y)*sk;me.position.x+=Math.sin(me.rotation.y)*.9*sk;me.position.z+=Math.cos(me.rotation.y)*.9*sk}}
// ================= procedural animals (V1): modular parts, seeded looks, biome spawning, simple behaviour =================
const VCM=new THREE.MeshBasicMaterial({vertexColors:true}),FLM=new THREE.MeshBasicMaterial({vertexColors:true,color:0xff8a8a});
function rng(s){let a=(s^0x9e3779b9)>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function ch(R,a){return a[Math.floor(R()*a.length)]}
const HQ={ty:'q',nk:0,sz:[.9,1.1],hp:4,gr:1},HO={...HQ,L:1.3,W:.5,B:.6,lg:.6,lw:.17,hs:.3,nk:.45,sn:.32,ear:'pt',tail:'long',spd:1.1,hp:99,ride:1,saddle:1,mane:1,gr:1};
const SP={
horse:HO,
cow:{...HQ,L:1,W:.55,B:.55,lg:.45,lw:.15,hs:.34,sn:.14,ear:'fl',tail:'rope',horn:'sm',spd:.7,hp:5},
sheep:{...HQ,L:.8,W:.5,B:.5,lg:.35,lw:.12,hs:.26,sn:.1,ear:'fl',tail:'pom',wool:1,spd:.7,prey:1},
pig:{...HQ,L:.8,W:.45,B:.42,lg:.25,lw:.14,hs:.3,sn:.2,ear:'fl',tail:'pom',sz:[.85,1.1],spd:.8},
deer:{...HQ,L:.9,W:.35,B:.42,lg:.6,lw:.1,hs:.22,nk:.35,sn:.2,ear:'pt',tail:'tuft',antler:1,spd:1.2,prey:1},
wolf:{...HQ,L:.85,W:.3,B:.36,lg:.42,lw:.1,hs:.26,sn:.2,ear:'pt',tail:'fluffy',sz:[.9,1.15],spd:1.4,hp:5,gr:0},
fox:{...HQ,L:.55,W:.25,B:.26,lg:.3,lw:.08,hs:.2,sn:.17,ear:'pt',tail:'fluffy',sz:[.85,1.1],spd:1.3,hp:3,gr:0},
rabbit:{...HQ,L:.35,W:.22,B:.24,lg:.16,lw:.08,hs:.18,sn:.08,ear:'lg',tail:'pom',sz:[.8,1.1],spd:1.5,hop:1,hp:2,prey:1},
cat:{...HQ,L:.5,W:.2,B:.22,lg:.22,lw:.07,hs:.18,sn:.06,ear:'pt',tail:'thin',spd:1.3,hp:3,gr:0,prey:1},
dog:{...HQ,L:.6,W:.24,B:.28,lg:.3,lw:.09,hs:.22,sn:.14,ear:'fl',tail:'thin',sz:[.9,1.2],spd:1.4,gr:0},
goat:{...HQ,L:.7,W:.3,B:.38,lg:.4,lw:.09,hs:.2,sn:.12,ear:'pt',tail:'tuft',horn:'cv',beard:1,spd:1.2,prey:1},
camel:{...HQ,L:1.1,W:.45,B:.55,lg:.7,lw:.14,hs:.28,nk:.6,sn:.2,ear:'sm',tail:'tuft',hump:1,spd:.8,hp:6},
chicken:{ty:'b',sz:[.85,1.1],spd:.9,hp:3,gr:1,prey:1},
turtle:{ty:'t',sz:[.8,1.2],spd:.45,hp:4,aq:1,gr:0},
dragon:{...HQ,L:1.6,W:.6,B:.6,lg:.45,lw:.2,hs:.4,nk:.55,sn:.35,ear:'no',tail:'drag',horn:'dr',wing:1,fly:1,fan:1,sz:[1.1,1.5],spd:2,hp:14,gr:0},
unicorn:{...HO,horn:'uni',fan:1,hp:99,sz:[.95,1.1]},
pegasus:{...HO,wing:1,fly:1,fan:1,sz:[.95,1.1]},
magicfox:{...HQ,L:.55,W:.25,B:.26,lg:.3,lw:.08,hs:.2,sn:.17,ear:'pt',tail:'fluffy',fan:1,glow:1,spd:1.4,hp:3,gr:0},
crystalturtle:{ty:'t',sz:[.9,1.3],spd:.5,hp:5,aq:1,fan:1,gr:0},
icewolf:{...HQ,L:.9,W:.32,B:.38,lg:.44,lw:.1,hs:.27,sn:.2,ear:'pt',tail:'fluffy',fan:1,spikes:1,sz:[1,1.25],spd:1.5,hp:6,gr:0},
firedeer:{...HQ,L:.95,W:.36,B:.44,lg:.62,lw:.1,hs:.23,nk:.38,sn:.2,ear:'pt',tail:'tuft',antler:1,flame:1,fan:1,spd:1.3,hp:5}
};
const RIDE={horse:1,unicorn:1,pegasus:1},ACT=28;
const PAL={
horse:[[0x8b5a2b,0x2b1a10],[0xa0522d,0x3a1a0a],[0x2b2b2b,0x111111],[0xf2f2f2,0xb8b8b8],[0xd4a846,0xf4e2b0],[0x9a9a9a,0x555555]],
cow:[[0xf5f5f5,0x222222],[0x8b5a2b,0xf5f5f5],[0x222222,0xf5f5f5],[0xd8b080,0x8b5a2b]],
sheep:[[0xf2f2f2,0x4a3a2a],[0xfff0d0,0x3a2a1a],[0x9a9a9a,0x222222],[0x333333,0x111111],[0xffc0e0,0x8a5a6a],[0xa8d8ff,0x4a5a8a]],
pig:[[0xf4a6b8,0x2b2b2b],[0xf4a6b8,0xd07a90],[0x8a5a44,0x3a2a1a],[0x2b2b2b,0x111111]],
chicken:[[0xffffff,0xe53935],[0x8b5a2b,0xe53935],[0x2b2b2b,0xe53935],[0xe0b040,0xe53935],[0xd0a070,0x3a2a1a]],
deer:[[0xb07a45,0xf5f5f5],[0x8a5a2b,0xf5f5f5],[0xc89a60,0xfff0d0]],
wolf:[[0x8a8a8a,0xdcdcdc],[0x2e2e2e,0x6a6a6a],[0xe8e8e8,0xffffff],[0x7a5a3a,0xd8c0a0]],
fox:[[0xe8742a,0xffffff],[0xd05a1a,0xf5f5f5],[0x9a5a30,0xf0e0c0]],
rabbit:[[0xf5f5f5,0xffc0c8],[0x8b5a2b,0xf5e0c0],[0x9a9a9a,0xffffff],[0xd8b080,0xfff0d0]],
cat:[[0xe8923a,0xf5f5f5],[0x9a9a9a,0xf5f5f5],[0x2b2b2b,0x555555],[0xf5f5f5,0xe8923a],[0xd8b080,0x6a4a2a]],
dog:[[0x8b5a2b,0xf5f5f5],[0x2b2b2b,0x8b5a2b],[0xe0b050,0xfff0d0],[0xf5f5f5,0x222222],[0x9a7a5a,0xf5f5f5]],
goat:[[0xf5f5f5,0xcccccc],[0xe8d8b0,0x8a6a3a],[0x9a9a9a,0x444444],[0x7a5a3a,0xe0c8a0]],
camel:[[0xd8b070,0xa07a40],[0xa87a40,0x6a4a20],[0xe8d0a0,0xb89060]],
turtle:[[0x4a8a3a,0x8ac06a],[0x7a5a2a,0xb09060],[0x3a7a5a,0x9ad0a0]],
dragon:{fire:[0xc8341e,0xf0b040,0xff7a1a,0xf5e0b0],ice:[0x7ec8ff,0xeaf8ff,0xc9efff,0xffffff],nature:[0x3fa83a,0xcfe89a,0x8bd05a,0x7a5a2a],lightning:[0x4a4ad8,0xf5e050,0xf2e040,0xffffff],crystal:[0xb070f0,0xf0c8ff,0x6ee8ff,0x6ee8ff]},
unicorn:[[0xffffff,0xff9ad0],[0xffc8e8,0xc89aff],[0xd8c8ff,0x9ad8ff],[0xc8ffe8,0xffe08a]],
pegasus:[[0xffffff,0x9ad8ff],[0x2b2b2b,0x6a6aff],[0xd0d0d8,0xffffff],[0xfff0d0,0xffb870]],
magicfox:[[0x8a5af0,0x5affe8],[0x3fd0c0,0xffe85a],[0xff7ac8,0x9a5aff]],
crystalturtle:[[0x6ee8ff,0xe0ffff],[0xff9ad8,0xffe0f4],[0xb070f0,0xe8d0ff]],
icewolf:[[0xcfe8ff,0xffffff],[0x9fd0f0,0xeaf6ff]],
firedeer:[[0xc84a1e,0xffb020],[0x8a2a10,0xff7a1a]]};
const PT={horse:['none','none','socks','blaze','pinto'],cow:['spots','spots','patch','none'],sheep:['none'],pig:['none','spots'],chicken:['none'],deer:['none','spots'],wolf:['none','mask'],fox:['none','socks'],rabbit:['none','patch'],cat:['none','patch','socks','calico'],dog:['none','patch','spots'],goat:['none'],camel:['none'],turtle:['none'],dragon:['none'],icewolf:['none']};
// --- modular builder: every part is a list of boxes merged into ONE mesh (shared material), parts: body, head, legs, tail, wings ---
function mrg(list){const p=[],c=[],ix2=[];let n=0;
  for(const[w,h,d,cl,x,y,z]of list){const r=(cl>>16&255)/255,gg=(cl>>8&255)/255,bb=(cl&255)/255;
    for(const f of F){const sh=f[2];for(const q of f[1]){p.push(x+(q[0]-.5)*w,y+(q[1]-.5)*h,z+(q[2]-.5)*d);c.push(r*sh,gg*sh,bb*sh)}ix2.push(n,n+1,n+2,n,n+2,n+3);n+=4}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));g.setIndex(ix2);return g}
function bird(b,a,eye){return{bo:[[.3,.28,.42,b,0,.38,0],[.1,.24,.2,b,0,.56,.26],[.04,.14,.3,b,-.17,.4,.02],[.04,.14,.3,b,.17,.4,.02]],h:{p:[0,.55,-.2],l:[[.18,.2,.2,b,0,.05,-.02],[.12,.06,.1,0xffa31a,0,.02,-.15],[.05,.12,.1,a,0,.19,-.02],[.04,.04,.02,eye,-.07,.07,-.12],[.04,.04,.02,eye,.07,.07,-.12]]},lg:[-1,1].map(s=>({p:[s*.07,.26,0],l:[[.04,.26,.04,0xffa31a,0,-.13,0]]})),t:null,w:[],L:.5,B:.3,lgH:.26}}
function turt(S,b,a,eye){const sk=S.fan?0xa0f0e0:0x8ac06a,bo=[[.6,.26,.7,b,0,.28,0],[.46,.12,.52,a,0,.46,0]];
  if(S.fan)for(let i=0;i<4;i++)bo.push([.1,.3,.1,a,(i%2?1:-1)*.14,.62,i<2?-.15:.15]);
  return{bo,h:{p:[0,.24,-.36],l:[[.22,.2,.26,sk,0,0,-.1],[.04,.04,.02,eye,-.07,.04,-.24],[.04,.04,.02,eye,.07,.04,-.24]]},lg:[[-1,-1],[1,-1],[-1,1],[1,1]].map(q=>({p:[q[0]*.3,.2,q[1]*.22],l:[[.16,.1,.28,sk,q[0]*.06,0,0]]})),t:{p:[0,.2,.36],l:[[.08,.08,.18,sk,0,0,.08]]},w:[],L:.7,B:.3,lgH:.15}}
function quad(S,sp,b,a,eye,pat,R,dw,dh){const L=S.L,W=S.W,B=S.B,lg=S.lg,lw=S.lw,hs=S.hs,nk=S.nk,top=lg+B,bo=[],hd=[],RB=[0xff5a5a,0xffa84a,0xffe85a,0x5adc6a,0x5ab0ff,0xb070f0],ww=S.wool?.07:0,sd=()=>R()<.5?-1:1;
  bo.push(S.wool?[W+.14,B+.12,L+.12,b,0,lg+B/2+.03,0]:[W,B,L,b,0,lg+B/2,0]);
  if(pat==='spots'||pat==='stars'||pat==='speck'||pat==='calico'){const n=pat==='speck'?5:pat==='calico'?3:2+Math.floor(R()*3);
    for(let i=0;i<n;i++){const s=B*(.2+R()*.3);bo.push([.02,s,s*(.8+R()*.6),pat==='stars'?0xffe85a:(pat==='calico'&&i===1?0x2b2b2b:a),sd()*(W/2+.01+ww),lg+B*(.3+R()*.5),(R()-.5)*L*.8])}}
  if(pat==='patch'||pat==='pinto'){const n=pat==='pinto'?3:1+Math.floor(R()*2);for(let i=0;i<n;i++)bo.push([.02,B*(.4+R()*.4),L*(.25+R()*.25),a,sd()*(W/2+.01+ww),lg+B*(.45+R()*.3),(R()-.5)*L*.6])}
  if(S.fan&&!pat.length)pat='stars';
  let hy=lg+B*.8,hz=-L/2+.02,tcol=a;
  if(nk>0){bo.push([W*.55,nk+.12,hs*.9,b,0,top+nk/2-.02,-L/2+hs*.2]);hy=top+nk-hs*.35;hz=-L/2+.02-hs*.05}
  if(S.mane){const rb=S.fan&&R()<.6,mc=sp==='horse'?a:ch(R,[a,0xff9ad0,0x9ad8ff,0xffe08a,0xb09aff]);tcol=rb?RB[0]:mc;for(let i=0;i<4;i++)bo.push([.1,.2,.14,rb?RB[(i+1)%6]:mc,0,top+nk-.05-i*nk/3.5,-L/2+hs*.55+i*.04])}
  if(S.saddle)bo.push([W+.05,.07,.45,0xb02a2a,0,top+.03,.05]);
  if(S.hump){bo.push([W*.7,.3,.32,b,0,top+.14,-.2]);if(R()<.5)bo.push([W*.7,.28,.3,b,0,top+.13,.25])}
  if(S.spikes)for(let i=0;i<4;i++)bo.push([.08,.18,.08,0xffffff,0,top+.09,-L*.3+i*L*.2]);
  if(sp==='dragon')for(let i=0;i<5;i++)bo.push([.1,.16+R()*.1,.1,dh,0,top+.1,-L*.3+i*L*.18]);
  const hc=S.wool?a:b,sc=({pig:0xf08aa0,cow:0xf4b6b6,wolf:a,fox:a,dog:a,icewolf:a,magicfox:a})[sp]||hc,sl=(S.sn||0)*hs*2.4,dv=Math.floor(R()*3);
  hd.push([hs*.9,hs*.9,hs,hc,0,0,-hs*.4]);
  if(S.sn>0){hd.push([hs*.55,hs*.42,sl,sc,0,-hs*.18,-hs*.9-sl/2+.02]);hd.push([hs*.22,hs*.15,.03,0x222222,0,-hs*.06,-hs*.9-sl+.02])}
  if(S.beard)hd.push([.06,.16,.06,a,0,-hs*.5,-hs*.8]);
  if(pat==='blaze')hd.push([hs*.25,hs*.92,hs*1.02,a,0,0,-hs*.4]);
  if(pat==='mask')hd.push([hs*.92,hs*.4,hs*1.02,a,0,-hs*.25,-hs*.4]);
  if(S.horn==='uni'){const hc2=R()<.5?0xffd23f:0xc8f0ff;for(let i=0;i<4;i++)hd.push([hs*.2-i*.03,hs*.26,hs*.2-i*.03,i%2?hc2:0xffffff,0,hs*.6+i*hs*.24,-hs*.45])}
  [-1,1].forEach(s=>{hd.push([hs*.14,hs*.14,.02,eye,s*hs*.27,hs*.12,-hs*.9]);const e=S.ear;
    if(e==='pt')hd.push([hs*.2,hs*.32,hs*.1,b,s*hs*.3,hs*.58,-hs*.2]);
    else if(e==='fl')hd.push([hs*.12,hs*.34,hs*.22,hc,s*hs*.52,hs*.08,-hs*.2]);
    else if(e==='lg')hd.push([hs*.16,hs*.9,hs*.1,b,s*hs*.2,hs*.95,-hs*.2]);
    else if(e==='sm')hd.push([hs*.14,hs*.18,hs*.1,b,s*hs*.4,hs*.5,-hs*.2]);
    if(S.horn==='sm')hd.push([hs*.1,hs*.22,hs*.1,0xe8dcc0,s*hs*.5,hs*.55,-hs*.2]);
    if(S.horn==='cv'){hd.push([hs*.1,hs*.4,hs*.1,0xd8d0b8,s*hs*.25,hs*.65,-hs*.2]);hd.push([hs*.1,hs*.1,hs*.3,0xd8d0b8,s*hs*.25,hs*.85,-hs*.05])}
    if(S.antler){const ac=S.flame?(R()<.5?0xff7a1a:0xffd23f):0xe8dcc0;hd.push([hs*.08,hs*.7,hs*.08,ac,s*hs*.3,hs*.85,-hs*.2]);hd.push([hs*.08,hs*.08,hs*.4,ac,s*hs*.3,hs*1.05,-hs*.4]);hd.push([hs*.08,hs*.3,hs*.08,ac,s*hs*.3,hs*1.3,-hs*.2])}
    if(S.horn==='dr'){if(dv===0)hd.push([hs*.12,hs*.5,hs*.12,dh,s*hs*.3,hs*.7,-hs*.2]);else if(dv===1){hd.push([hs*.12,hs*.35,hs*.12,dh,s*hs*.3,hs*.65,-hs*.2]);hd.push([hs*.12,hs*.12,hs*.4,dh,s*hs*.3,hs*.85,0])}else{hd.push([hs*.1,hs*.3,hs*.1,dh,s*hs*.2,hs*.6,-hs*.2]);hd.push([hs*.1,hs*.4,hs*.1,dh,s*hs*.4,hs*.62,-hs*.1]);hd.push([hs*.1,hs*.2,hs*.1,dh,s*hs*.6,hs*.55,0])}}
  });
  const lgs=[];for(const zs of[-1,1])for(const xs of[-1,1]){const col=S.wool?a:b,hv=pat==='socks'?a:(S.glow||S.flame?0xffd23f:0x3a2a1a),k=pat==='socks'?.3:.18;
    lgs.push({p:[xs*(W/2-lw/2),lg,zs*(L/2-lw/2-.03)],l:[[lw,lg,lw,col,0,-lg/2,0],[lw*1.04,lg*k,lw*1.04,hv,0,-lg+lg*k/2,0]]})}
  const td=Math.floor(R()*3),tl={long:[[.12,.7,.12,tcol,0,-.35,.05]],rope:[[.06,.5,.06,b,0,-.25,.04],[.1,.12,.1,a,0,-.5,.04]],tuft:[[.1,.22,.1,b,0,-.1,.04],[.11,.08,.11,a,0,-.25,.04]],pom:[[.14,.14,.14,sp==='rabbit'?0xffffff:a,0,0,.07]],fluffy:[[.2,.2,.5,b,0,0,.25],[.21,.21,.16,S.glow?0x8aff5a:a,0,0,.58]],thin:[[.06,.4,.06,b,0,.2,.05]],drag:[[.3,.28,.4,b,0,0,.2],[.22,.2,.45,b,0,0,.62],[.15,.15,.5,b,0,0,1.1],td===0?[.2,.2,.25,dh,0,0,1.45]:td===1?[.04,.4,.4,dw,0,0,1.4]:[.28,.28,.28,b,0,0,1.4]]}[S.tail];
  const wg=[];if(S.wing){const wc=sp==='dragon'?dw:ch(R,[0xffffff,0xffffff,0x9ad8ff,0x2b2b2b,0xffb0e0]),ws=sp==='dragon'?1.3:.9;
    for(const s of[1,-1])wg.push({p:[s*W/2,top-.02,-L*.1],l:[[ws,.05,.55,wc,s*ws/2,0,0],[ws*.7,.05,.3,sp==='dragon'?b:a,s*ws*.55,0,.42],[ws,.08,.08,sp==='dragon'?b:wc,s*ws/2,.03,-.28]]})}
  return{bo,h:{p:[0,hy,hz],l:hd},lg:lgs,t:{p:[0,top-B*.15,L/2],l:tl},w:wg,L,B,lgH:lg}}
function mkA(sp,seed,bio){const S=SP[sp],R=rng(seed),g=new THREE.Group(),sz=S.sz[0]+R()*(S.sz[1]-S.sz[0]);
  let b,a,dw=0xffffff,dh=0xe8dcc0;
  if(sp==='dragon'){const k=ch(R,Object.keys(PAL.dragon)),d=PAL.dragon[k];b=d[0];a=d[1];dw=d[2];dh=d[3]}else{const p=ch(R,PAL[sp]);b=p[0];a=p[1]}
  if(bio===2&&(sp==='fox'||sp==='rabbit'||sp==='wolf')){b=0xf2f6fa;a=0xdfe8f0}
  if(bio===1&&(sp==='fox'||sp==='rabbit')){b=0xe0c080;a=0xfff0d0}
  const pat=ch(R,PT[sp]||['stars','none']);let eye=ch(R,S.fan?[0x40d0ff,0xffd23f,0xff5ac8,0x8aff5a]:[0x1a1a1a,0x1a1a1a,0x3a2a10,0x2a5a3a,0x3a6ab0]);
  if(sp==='rabbit'&&b===0xf5f5f5&&R()<.5)eye=0xe03030;
  const P=S.ty==='b'?bird(b,a,eye):S.ty==='t'?turt(S,b,a,eye):quad(S,sp,b,a,eye,pat,R,dw,dh);
  const mesh=l=>new THREE.Mesh(mrg(l),VCM),add=(p,l)=>{const q=new THREE.Group();q.position.set(p[0],p[1],p[2]);q.add(mesh(l));g.add(q);return q};
  g.add(mesh(P.bo));g.head=add(P.h.p,P.h.l);g.legs=P.lg.map(l=>add(l.p,l.l));g.tail=P.t?add(P.t.p,P.t.l):null;g.wings=P.w.map(w=>add(w.p,w.l));
  g.scale.setScalar(sz);g.rh=(P.lgH+P.B)*sz;g.lgH=P.lgH*sz;shadow(g,Math.max(.4,P.L*.8));return g}
// --- biome + spawning ---
function forestAt(gx,gz){return !FLAT&&fbm(gx*.015+400,gz*.015+400,2)>.56}
function magicAt(gx,gz){return !FLAT&&fbm(gx*.01+700,gz*.01+700,2)>.62}
function biomeOf(x,z){col(x+ox,z+oz);return{b:CB,m:CM>3,f:forestAt(x+ox,z+oz),mg:magicAt(x+ox,z+oz)}}
function wt(T){let s=0;for(const t of T)s+=t[1];let r=Math.random()*s;for(const t of T){r-=t[1];if(r<=0)return t[0]}return T[0][0]}
const BTG=[['horse',3],['cow',4],['sheep',4],['rabbit',3],['pig',2],['chicken',3],['cat',1],['dog',1]],BTF=[['deer',4],['wolf',2],['fox',3],['rabbit',2],['pig',1]],BTS=[['fox',3],['rabbit',3],['wolf',2]],BTD=[['camel',4],['fox',3],['rabbit',2],['turtle',2]],BTM=[['goat',6],['wolf',1],['fox',1]],BTX=[['unicorn',3],['pegasus',3],['magicfox',3],['firedeer',2],['dragon',2]];
function pickSp(m){let T=m.m?BTM:m.b===2?BTS:m.b===1?BTD:m.f?BTF:BTG;
  if(Math.random()<(m.mg?.55:.03)){T=m.m?[['dragon',3],['pegasus',2]]:m.b===2?[['icewolf',3],['pegasus',1],['dragon',1]]:m.f&&Math.random()<.5?[['firedeer',1],['magicfox',1]]:BTX}
  return wt(T)}
function spot(x0,z0,rad){for(let t=0;t<25;t++){const x=x0+(Math.random()-.5)*2*rad,z=z0+(Math.random()-.5)*2*rad;if(x<4||z<4||x>W-4||z>D-4)continue;const gy=ground(x,z),fx=Math.floor(x),fz=Math.floor(z),tb=get(fx,gy-1,fz);if((tb!==1&&tb!==6&&tb!==14)||get(fx,gy,fz)===13)continue;return[x,z,tb]}return null}
function waterSpot(x0,z0){for(let t=0;t<20;t++){const x=x0+(Math.random()-.5)*10,z=z0+(Math.random()-.5)*10;if(x<4||z<4||x>W-4||z>D-4)continue;if(get(Math.floor(x),SEA,Math.floor(z))===13)return[x,z]}return null}
function addAnimal(x,z,kind,seed,bio){if(!SP[kind])return null;seed=seed==null?Math.floor(Math.random()*4294967295):seed;bio=bio||0;const g=mkA(kind,seed,bio),S=SP[kind],h=Math.random()*6.28,inw=S.aq&&get(Math.floor(x),SEA,Math.floor(z))===13;
  const a={kind,seed,bio,g,x,z,y:inw?SEA+.7:ground(x,z),h,tg:h,sp:S.spd*(.9+Math.random()*.2),hp:S.hp,st:'idle',t:Math.random()*2,ph:Math.random()*9,hurt:0,kx:0,kz:0,hh:0,hv:0,rh:g.rh,alt:4,sz:g.scale.x};
  g.userData.a=a;scene.add(g);A.push(a);return a}
function disp(g){scene.remove(g);g.traverse(o=>{if(o.isMesh&&o.geometry&&o.geometry!==shG)o.geometry.dispose()})}
function killA(a,k){disp(a.g);A.splice(k==null?A.indexOf(a):k,1)}
function clearAnimals(){A.forEach(a=>disp(a.g));A.length=0;riding=null;document.getElementById('dm').classList.add('hide')}
function spawnAt(s){const m=biomeOf(s[0],s[1]);addAnimal(s[0],s[1],pickSp(m),null,m.b)}
function spawnAnimals(){clearAnimals();const s0=spot(W/2,D/2+4,12);if(s0)addAnimal(s0[0],s0[1],'horse',null,0);
  for(let k=0;k<7;k++){const s=spot(W/2,D/2+4,12);if(s)spawnAt(s)}
  const n=14+Math.floor(Math.random()*8);for(let k=0;k<n;k++){const s=spot(W/2,D/2,W/2-6);if(s)spawnAt(s)}
  for(let k=0;k<4;k++){const s=waterSpot(W*Math.random(),D*Math.random());if(s)addAnimal(s[0],s[1],Math.random()<.12?'crystalturtle':'turtle',null,0)}
  spawnFish()}
function restoreAnimals(l){clearAnimals();l.forEach(r=>{const x=r[2]-ox,z=r[3]-oz;if(x>4&&z>4&&x<W-4&&z<D-4)addAnimal(x,z,r[0],r[1],r[4])});spawnFish()}
function ANSAVE(){return A.slice(0,60).map(a=>[a.kind,a.seed,+(a.x+ox).toFixed(1),+(a.z+oz).toFixed(1),a.bio])}
// --- light state machine: idle / walk / run / graze / look / sleep / fly (swim for turtles) ---
function think(a){const S=SP[a.kind],r=Math.random();a.t=2+Math.random()*4;a.tg=a.h+(Math.random()-.5)*2.6;
  if(S.fly){if(a.st==='fly'){a.t=3+Math.random()*5;if(r<.25){a.st='idle';a.t=2+Math.random()*3}}else if(r<.55){a.st='fly';a.alt=3+Math.random()*6}else a.st=r<.8?'walk':'idle';return}
  if(r<.4)a.st='walk';else if(r<.52)a.st='idle';else if(r<.68&&S.gr)a.st='graze';else if(r<.8)a.st='look';else if(r<.9){a.st='sleep';a.t=6+Math.random()*6}else a.st='walk'}
function animA(a,dt){const g=a.g,st=a.st,mv=st==='walk'||st==='run'||st==='fly',sp=st==='run'?14:a.swm?7:8,now=performance.now();
  a.pt=(a.pt||0)+dt*(mv&&st!=='fly'?sp:0);a.sw2=(a.sw2||0)+(((mv&&st!=='fly')?(st==='run'?.9:.55):0)-(a.sw2||0))*Math.min(1,dt*10);
  const ph=[1,-1,-1,1];g.legs.forEach((l,i)=>l.rotation.x=st==='sleep'?1.2:st==='fly'?.9:Math.sin(a.pt)*a.sw2*ph[i%4]);
  let hx=Math.sin(now*.002+a.ph)*.04,hy=0;if(st==='graze')hx=.8;else if(st==='sleep')hx=.5;else if(st==='look')hy=Math.sin(a.t*2)*.7;
  g.head.rotation.x+=(hx-g.head.rotation.x)*.15;g.head.rotation.y+=(hy-g.head.rotation.y)*.15;
  if(g.tail){g.tail.rotation.x=.15+Math.sin(a.pt*.5+a.ph)*(mv?.25:.1);g.tail.rotation.y=Math.sin(now*.004+a.ph)*(mv?.25:.12)}
  if(g.wings.length){const f=st==='fly'?Math.sin(now*.014+a.ph)*.8:.2+Math.sin(now*.003+a.ph)*.05;g.wings[0].rotation.z=f;g.wings[1].rotation.z=-f}}
function tint(a,on){a.g.traverse(o=>{if(o.isMesh&&!o.userData.nt)o.material=on?FLM:VCM})}
function stepAnimals(dt){const px=pos.x,pz=pos.z;
  spawnT-=dt;if(spawnT<=0){spawnT=4+Math.random()*4;if(A.length<ACT){const ang=Math.random()*6.28,dd=28+Math.random()*20;
    if(Math.random()<.1){const s=waterSpot(px+Math.cos(ang)*dd,pz+Math.sin(ang)*dd);if(s)addAnimal(s[0],s[1],Math.random()<.12?'crystalturtle':'turtle',null,0)}
    else{const s=spot(px+Math.cos(ang)*dd,pz+Math.sin(ang)*dd,4);if(s)spawnAt(s)}}}
  for(let k=A.length-1;k>=0;k--){const a=A[k],S=SP[a.kind];
    if(a===riding){a.x=px;a.z=pz;a.h=ph;a.y=pos.y-EYE;a.st=mvg?'run':'idle';a.g.visible=true;a.g.position.set(px,a.y,pz);a.g.rotation.y=ph;animA(a,dt);continue}
    const dx=a.x-px,dz=a.z-pz,d2=dx*dx+dz*dz;
    if(d2>5200&&A.length>ACT-6){killA(a,k);continue}
    a.g.visible=d2<2300;if(!a.g.visible)continue;
    a.t-=dt;
    if(S.prey&&a.st!=='run'&&d2<36&&a.hurt<=0){a.st='run';a.t=1.5;a.tg=Math.atan2(-dx,-dz)}
    else if(a.t<=0)think(a);
    let df=a.tg-a.h;df=Math.atan2(Math.sin(df),Math.cos(df));a.h+=Math.max(-3.5*dt,Math.min(3.5*dt,df));
    const inw=!!S.aq&&get(Math.floor(a.x),SEA,Math.floor(a.z))===13;a.swm=inw;
    const mv=a.st==='walk'||a.st==='run'||a.st==='fly',spd=a.sp*(a.st==='run'?2.3:a.st==='fly'?1.6:1);
    if(a.hurt>0){a.hurt-=dt;const nx=a.x+a.kx*dt,nz=a.z+a.kz*dt,g0=ground(a.x,a.z),g1=ground(nx,nz);if(nx>2&&nz>2&&nx<W-2&&nz<D-2&&g1<=g0+1.1&&(S.aq||get(Math.floor(nx),g1,Math.floor(nz))!==13)){a.x=nx;a.z=nz}a.kx*=.9;a.kz*=.9;if(a.hurt<=0)tint(a,false)}
    else if(mv){const nx=a.x-Math.sin(a.h)*spd*dt,nz=a.z-Math.cos(a.h)*spd*dt;
      if(nx<3||nz<3||nx>W-3||nz>D-3){a.tg=a.h+Math.PI;if(a.st!=='fly')a.st='idle'}
      else if(a.st==='fly'){a.x=nx;a.z=nz}
      else{const gy=ground(a.x,a.z),ng=ground(nx,nz),wtr=get(Math.floor(nx),ng,Math.floor(nz))===13;
        if(ng>gy+1.1||(wtr&&!S.aq)){a.tg=a.h+Math.PI*(.5+Math.random());a.st='idle';a.t=.4}else{a.x=nx;a.z=nz}}}
    if(a.hv||a.hh>0){a.hh+=a.hv*dt;a.hv-=16*dt;if(a.hh<=0){a.hh=0;a.hv=0}}
    const gnd0=ground(a.x,a.z),ty=a.st==='fly'?gnd0+a.alt:inw?SEA+.7:gnd0;a.y+=(ty-a.y)*Math.min(1,dt*(a.st==='fly'?2:10));
    const now=performance.now(),bob=S.hop&&mv?Math.abs(Math.sin(a.pt*.6))*.22:0,fl=a.st==='fly'?Math.sin(now*.003+a.ph)*.15:0,yo=a.st==='sleep'?-(a.g.lgH||0)*.55:0;
    a.g.position.set(a.x,a.y+a.hh+bob+fl+yo,a.z);a.g.rotation.y=a.h;
    if(d2<900)animA(a,dt)}}
function hitA(a){const dx=a.x-pos.x,dz=a.z-pos.z,l=Math.hypot(dx,dz)||1;a.kx=dx/l*6;a.kz=dz/l*6;a.hv=5;a.hurt=.4;tint(a,true);a.hp--;RyleAudio.animal(a.kind,a.x,a.y+.4,a.z,true);
  if(a.hp<=0){burst(a.x-.5,a.y,a.z-.5,11);burst(a.x-.5,a.y+.5,a.z-.5,11);killA(a);toast('Poof! ✨')}}
const rc2=new THREE.Raycaster();
// ---- horse (rideable) + fish ----
function tryMount(cx,cy){const hl2=A.filter(a=>RIDE[a.kind]&&a.g.visible);if(!hl2.length)return false;rc2.setFromCamera({x:cx/innerWidth*2-1,y:-(cy/innerHeight)*2+1},cam);
  const h=rc2.intersectObjects(hl2.map(a=>a.g),true);if(!h.length)return false;let o=h[0].object;while(o&&!o.userData.a)o=o.parent;if(!o)return false;const a=o.userData.a;
  if(Math.hypot(a.x-pos.x,a.z-pos.z)>6){toast('Walk closer to the horse 🐴');return true}
  riding=a;a.mv=0;fly=false;sync();document.getElementById('dm').classList.remove('hide');toast('Giddy up! 🐴');RyleAudio.animal(a.kind,a.x,a.y+.6,a.z,false);return true}
function mountNear(){let best=null,bd=25;for(const a of A)if(RIDE[a.kind]){const d=(a.x-pos.x)**2+(a.z-pos.z)**2;if(d<bd){bd=d;best=a}}if(!best)return;riding=best;best.mv=0;fly=false;sync();toast('Giddy up! 🐴');RyleAudio.animal(best.kind,best.x,best.y+.6,best.z,false)}
let mst='';
function updMount(){let s='';if(riding)s='off';else for(const a of A)if(RIDE[a.kind]&&(a.x-pos.x)**2+(a.z-pos.z)**2<20){s='on';break}
  if(s!==mst){mst=s;const b=document.getElementById('dm');b.classList.toggle('hide',!s);b.innerHTML=s==='off'?'🚶<small>Get off</small>':'🐴<small>Mount</small>'}}
function dismount(){if(!riding)return;pos.x=Math.min(W-1,Math.max(1,pos.x+Math.cos(yaw)*1.3));pos.z=Math.min(D-1,Math.max(1,pos.z-Math.sin(yaw)*1.3));riding=null;document.getElementById('dm').classList.add('hide');toast('Whoa! 🐴');RyleAudio.hoof()}
const FS=[];
function fish(c){const g=new THREE.Group();box(.18,.2,.5,c,0,0,0,g);box(.04,.26,.16,c,0,0,.3,g);box(.04,.05,.04,0x111111,.1,.04,-.18,g);box(.04,.05,.04,0x111111,-.1,.04,-.18,g);return g}
function spawnFish(){FS.forEach(f=>scene.remove(f.g));FS.length=0;for(let t=0;t<800&&FS.length<18;t++){const x=4+Math.random()*(W-8),z=4+Math.random()*(D-8);if(get(Math.floor(x),SEA,Math.floor(z))===13&&get(Math.floor(x),SEA-1,Math.floor(z))===13){const g=fish([0xff8a3d,0x4aa3ff,0xffd23f,0xf06292][FS.length%4]),h=Math.random()*6.28;scene.add(g);FS.push({g,x,z,y:SEA-.2-Math.random()*.8,h,tg:h,t:0,yt:SEA-.5,sp:.8+Math.random()*.6,ph:Math.random()*9})}}}
function stepFish(dt){for(const f of FS){const dx=f.x-pos.x,dz=f.z-pos.z;f.g.visible=dx*dx+dz*dz<2300;if(!f.g.visible)continue;
  f.t-=dt;if(f.t<=0){f.t=1+Math.random()*3;f.tg=f.h+(Math.random()-.5)*2.5;f.yt=SEA-1.2+Math.random()*1.5}
  f.h+=Math.max(-3*dt,Math.min(3*dt,f.tg-f.h));
  const nx=f.x-Math.sin(f.h)*f.sp*dt,nz=f.z-Math.cos(f.h)*f.sp*dt,ny=f.y+(f.yt-f.y)*dt;
  if(get(Math.floor(nx),Math.floor(ny),Math.floor(nz))===13){f.x=nx;f.z=nz;f.y=ny}else{f.tg=f.h+Math.PI*(.5+Math.random());f.t=.6}
  f.g.position.set(f.x,f.y,f.z);f.g.rotation.y=f.h+Math.sin(performance.now()*.01+f.ph)*.15}}
function hitAt(cx,cy){const a=captureSword(cx,cy);if(a)applySword(a)}
// ---------- picking ----------
function pick(cx,cy){
  const v=new THREE.Vector3(cx/innerWidth*2-1,-(cy/innerHeight)*2+1,.5).unproject(cam).sub(cam.position).normalize();
  let px=cam.position.x,py=cam.position.y,pz=cam.position.z,last=null;
  for(let t=0;t<40;t+=.04){
    const x=Math.floor(px+v.x*t),y=Math.floor(py+v.y*t),z=Math.floor(pz+v.z*t);
    const g0=get(x,y,z);if(g0&&g0!==13){return{hit:[x,y,z],prev:last}}
    if(x>=0&&y>=0&&z>=0&&x<W&&y<H&&z<D&&(!last||last[0]!==x||last[1]!==y||last[2]!==z))last=[x,y,z];
  }
  return null;
}
const pg=new THREE.BoxGeometry(.2,.2,.2),pm={},parts=[];
function burst(x,y,z,id){const m=pm[id]||(pm[id]=new THREE.MeshBasicMaterial({color:BL[id-1][1]}));for(let k=0;k<10;k++){const q=new THREE.Mesh(pg,m);q.position.set(x+.2+Math.random()*.6,y+.2+Math.random()*.6,z+.2+Math.random()*.6);q.v=new THREE.Vector3(Math.random()-.5,Math.random()*3+1,Math.random()-.5).multiplyScalar(1.5);q.life=.8;scene.add(q);parts.push(q)}}
function flash(c){hl.position.set(c[0]+.5,c[1]+.5,c[2]+.5);hl.visible=true;clearTimeout(hlT);hlT=setTimeout(()=>hl.visible=false,450)}
function captureTap(cx,cy){
  if(mode==='sword'){const a=captureSword(cx,cy);return a?()=>applySword(a):null}
  const r=pick(cx,cy);if(!r)return null;
  if(mode==='erase'){const[x,y,z]=r.hit;return()=>applyErase(x,y,z)}
  const g=get(r.hit[0],r.hit[1],r.hit[2]);
  const t=(g>=16&&g<=22)?r.hit:r.prev;if(!t)return null;
  const id=cur;return()=>applyBuild(t[0],t[1],t[2],id);
}
function applyBuild(x,y,z,id){
  const g=get(x,y,z);
  if(g&&g!==13&&!(g>=16&&g<=22))return;
  const cx0=Math.floor(pos.x),cz0=Math.floor(pos.z);
  if(x===cx0&&z===cz0&&(y===Math.floor(pos.y)||y===Math.floor(pos.y-EYE+.1)))return toast('Step aside first!');
  flash([x,y,z]);setB(x,y,z,id);rebuild(x,z);RyleAudio.blockPlace(id);RyleAudio.toolImpact('hammer',id);
}
function applyErase(x,y,z){
  const id=get(x,y,z);
  if(!id||id===13)return;
  if(y===0){toast('Bedrock is too hard to mine! 🪨');return}
  flash([x,y,z]);burst(x,y,z,id);setB(x,y,z,0);rebuild(x,z);RyleAudio.blockBreak(id);RyleAudio.toolImpact('pick',id);
}
function captureSword(cx,cy){
  rc2.setFromCamera({x:cx/innerWidth*2-1,y:-(cy/innerHeight)*2+1},cam);
  const hh=rc2.intersectObjects(A.filter(a=>a.g.visible&&!RIDE[a.kind]).map(a=>a.g),true);if(!hh.length)return null;
  let o=hh[0].object;while(o&&!o.userData.a)o=o.parent;if(!o)return null;const a=o.userData.a;
  const r=pick(cx,cy);
  if(r&&Math.hypot(r.hit[0]+.5-cam.position.x,r.hit[1]+.5-cam.position.y,r.hit[2]+.5-cam.position.z)<hh[0].distance)return null;
  return a;
}
function applySword(a){
  if(!a||!a.g.visible)return;
  if(Math.hypot(a.x-pos.x,a.z-pos.z)>6){toast('Move closer!');return}hitA(a);RyleAudio.toolImpact('sword',3);
}
function tap(cx,cy){if(!riding&&tryMount(cx,cy))return;startSwing(MODE_TOOL[mode],captureTap(cx,cy))}

// ---------- input ----------
let jcv=null,jo=[0,0],jact=false,jt=0;const ptrs=new Map();let tapOK=false,t0=0,mv=0,pd=0;
cv.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'&&e.clientX<innerWidth*.45&&jcv===null){cv.setPointerCapture(e.pointerId);jcv=e.pointerId;jo=[e.clientX,e.clientY];jt=performance.now();jact=false;closePal();return}cv.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,[e.clientX,e.clientY]);
  if(ptrs.size===1){tapOK=true;t0=performance.now();mv=0}else{tapOK=false;const a=[...ptrs.values()];pd=Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1])}
  closePal()});
cv.addEventListener('pointermove',e=>{
  if(e.pointerId===jcv){if(!jact&&Math.hypot(e.clientX-jo[0],e.clientY-jo[1])>12){jact=true;joy.style.left=(jo[0]-joy.offsetWidth/2)+'px';joy.style.top=(jo[1]-joy.offsetWidth/2)+'px';joy.style.bottom='auto'}if(jact)jm(e);return}
  const o=ptrs.get(e.pointerId);if(!o)return;
  const dx=e.clientX-o[0],dy=e.clientY-o[1];ptrs.set(e.pointerId,[e.clientX,e.clientY]);
  if(ptrs.size===1){mv+=Math.abs(dx)+Math.abs(dy);yaw-=dx*.005;pitch=Math.max(-1.5,Math.min(1.5,pitch-dy*.005))}
  else if(ptrs.size===2){const a=[...ptrs.values()],d=Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1]);cam.fov=Math.max(40,Math.min(95,cam.fov-(d-pd)*.1));pd=d;cam.updateProjectionMatrix()}
});
function up(e){if(e.pointerId===jcv){const was=jact;jcv=null;jact=false;jx=jy=0;knob.style.transform='';joy.style.left=joy.style.top=joy.style.bottom='';if(!was&&ptrs.size===0&&performance.now()-jt<400)tap(e.clientX,e.clientY);return}
  const had=ptrs.delete(e.pointerId);
  if(had&&tapOK&&ptrs.size===0&&mv<12&&performance.now()-t0<400)tap(e.clientX,e.clientY);
  if(ptrs.size===0)tapOK=false}
cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',e=>{if(e.pointerId===jcv){jcv=null;jact=false;jx=jy=0;knob.style.transform='';joy.style.left=joy.style.top=joy.style.bottom='';return}ptrs.delete(e.pointerId);tapOK=false});
cv.addEventListener('wheel',e=>{cam.fov=Math.max(40,Math.min(95,cam.fov+e.deltaY*.03));cam.updateProjectionMatrix()});
cv.addEventListener('contextmenu',e=>e.preventDefault());

// joystick
const joy=document.getElementById('joy'),knob=document.getElementById('knob');let jid=null;
function jm(e){const r=joy.getBoundingClientRect();let dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);const m=Math.hypot(dx,dy),L=joy.offsetWidth*.375;if(m>L){dx*=L/m;dy*=L/m}
  knob.style.transform=`translate(${dx}px,${dy}px)`;jx=dx/L;jy=-dy/L}
joy.addEventListener('pointerdown',e=>{jid=e.pointerId;joy.setPointerCapture(jid);jm(e)});
joy.addEventListener('pointermove',e=>{if(e.pointerId===jid)jm(e)});
const jend=e=>{if(e.pointerId===jid){jid=null;jx=jy=0;knob.style.transform=''}};
joy.addEventListener('pointerup',jend);joy.addEventListener('pointercancel',jend);
// keyboard (desktop testing)
const keys={};addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=1});addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=0});
// up/down
function hold(id,v){const b=document.getElementById(id);b.addEventListener('pointerdown',e=>{b.setPointerCapture(e.pointerId);vy=v});const s=()=>vy=0;b.addEventListener('pointerup',s);b.addEventListener('pointercancel',s)}
hold('up',1);hold('dn',-1);
{const b=document.getElementById('sw');let swT;b.addEventListener('pointerdown',()=>{if(mode!=='sword'){tap(innerWidth/2,innerHeight/2);return}tools(mode,true);clearTimeout(swT);swT=setTimeout(()=>tools(mode),800);
  const fx=-Math.sin(yaw),fz=-Math.cos(yaw);let best=null,bd=16;for(const a of A){const dx=a.x-pos.x,dz=a.z-pos.z,d2=dx*dx+dz*dz;if(!RIDE[a.kind]&&d2<bd&&(dx*fx+dz*fz)>.2*Math.sqrt(d2)){best=a;bd=d2}}
  startSwing('sword',best?()=>applySword(best):null)})}
{const b=document.getElementById('jp');let lt=0;b.addEventListener('pointerdown',e=>{b.setPointerCapture(e.pointerId);jumpHeld=true});const s=()=>{jumpHeld=false};b.addEventListener('pointerup',s);b.addEventListener('pointercancel',s)}

// ---------- UI ----------
const $=id=>document.getElementById(id);
const pal=$('pal');
BL.forEach((b,i)=>{if(i===12||i===22)return;const d=document.createElement('button');d.dataset.id=i+1;d.className='sw';d.style.background='url('+tu(i)+') center/cover';d.style.imageRendering='pixelated';d.title=b[0];d.setAttribute('aria-label',b[0]);
  
  d.onclick=()=>{cur=i+1;setMode('build');closePal();swatch()};pal.appendChild(d)});
function swatch(){$('cur').style.background='url('+tu(cur-1)+') center/cover';$('cur').style.imageRendering='pixelated';[...pal.children].forEach(c=>c.classList.toggle('sel',+c.dataset.id===cur));updateHeldBlock()}
function closePal(){pal.classList.add('hide')}
function setMode(m){cancelSwing();mode=m;$('tP').classList.toggle('on',m==='build');$('tE').classList.toggle('on',m==='erase');$('tE').classList.toggle('e',m==='erase');$('tW').classList.toggle('on',m==='sword');tools(m);actionBtn(m)}
function actionBtn(m){const b=document.getElementById('sw'),x=m==='sword'?['🗡️','Attack','linear-gradient(#ff7a7e,#e5303a)','#a52a2e']:m==='erase'?['⛏️','Mine','linear-gradient(#9fb4d4,#566f94)','#475366']:['🔨','Build','linear-gradient(#ffc15a,#ff7a0d)','#c4631b'];b.innerHTML=x[0]+'<small>'+x[1]+'</small>';b.style.background=x[2];b.style.boxShadow='0 4px 0 '+x[3];document.getElementById('xh').classList.add('hide');b.classList.toggle('hide',m!=='sword')}
let trkT=0;
function trk(dt){return;trkT-=dt;if(trkT>0||document.getElementById('hud').classList.contains('hide'))return;trkT=.1;if(mode==='sword'){hl.visible=false;return}
  const r=pick(innerWidth/2,innerHeight/2);if(!r){hl.visible=false;return}const g=get(r.hit[0],r.hit[1],r.hit[2]),t=mode==='erase'?r.hit:((g>=16&&g<=22)?r.hit:(r.prev||r.hit));hl.position.set(t[0]+.5,t[1]+.5,t[2]+.5);hl.visible=true}
$('tB').onclick=()=>pal.classList.toggle('hide');
$('tP').onclick=()=>{setMode('build');closePal()};
$('tE').onclick=()=>{setMode('erase');closePal()};
$('tW').onclick=()=>{setMode('sword');closePal()};
$('tF').onclick=()=>{fly=!fly;sync();closePal()};
$('tS').onclick=()=>{save();closePal()};
function modal(html,fn){const m=$('m');m.classList.remove('about-open');m.innerHTML='<div class="card">'+html+'</div>';m.classList.remove('hide');fn&&fn(m)}
function close(){$('m').classList.add('hide')}
function aboutModal(){
  modal(`<div class="ab-banner"><span class="ab-leaf">🍃</span><span class="ab-i">i</span>About the Game<span class="ab-leaf right">🍃</span></div>
  <button class="ab-x" id="abx" aria-label="Close">✕</button>
  <div class="ab-body">
    <div class="ab-art">
      <svg class="ab-tree" viewBox="0 0 100 140" aria-hidden="true"><rect x="42" y="80" width="16" height="60" fill="#7a4a1e"/><rect x="20" y="30" width="60" height="60" rx="7" fill="#3f9e2f"/><rect x="8" y="54" width="84" height="36" rx="7" fill="#4fbf3f"/><rect x="26" y="12" width="48" height="42" rx="7" fill="#5fd24a"/></svg>
      <svg class="ab-house" viewBox="0 0 120 100" aria-hidden="true"><rect x="22" y="46" width="76" height="48" fill="#c98a55" stroke="#6b4423" stroke-width="4"/><polygon points="10,48 60,10 110,48" fill="#c0392b" stroke="#6b2a1f" stroke-width="4"/><rect x="48" y="66" width="24" height="28" fill="#8a4b22" stroke="#5a2f0c" stroke-width="3"/><rect x="32" y="58" width="12" height="12" fill="#bfe8ff" stroke="#5a2f0c" stroke-width="2"/><rect x="78" y="58" width="12" height="12" fill="#bfe8ff" stroke="#5a2f0c" stroke-width="2"/></svg>
      <svg class="ab-dog" viewBox="0 0 150 115" aria-hidden="true"><rect x="6" y="42" width="30" height="11" rx="5" fill="#e9e9ec" transform="rotate(-16 21 47)"/><rect x="38" y="80" width="13" height="26" fill="#dcdce1"/><rect x="84" y="80" width="13" height="26" fill="#dcdce1"/><rect x="24" y="42" width="80" height="44" rx="10" fill="#f7f7f8" stroke="#c9c9cf" stroke-width="3"/><rect x="30" y="82" width="13" height="24" fill="#f7f7f8"/><rect x="76" y="82" width="13" height="24" fill="#f7f7f8"/><rect x="24" y="42" width="24" height="18" rx="6" fill="#d7d7dc"/><rect x="86" y="20" width="48" height="46" rx="10" fill="#f7f7f8" stroke="#c9c9cf" stroke-width="3"/><polygon points="90,24 100,6 108,24" fill="#d7d7dc" stroke="#b9b9c2" stroke-width="2"/><polygon points="110,24 120,6 126,24" fill="#d7d7dc" stroke="#b9b9c2" stroke-width="2"/><rect x="86" y="20" width="16" height="14" rx="5" fill="#d7d7dc"/><rect x="112" y="42" width="22" height="18" rx="5" fill="#ececef"/><rect x="112" y="28" width="6" height="7" fill="#222"/><rect x="126" y="28" width="6" height="7" fill="#222"/><rect x="126" y="47" width="8" height="7" rx="2" fill="#222"/><rect x="118" y="56" width="7" height="13" rx="3" fill="#ef6f92"/><rect x="86" y="58" width="48" height="8" fill="#e23b3b"/><rect x="104" y="65" width="9" height="11" rx="2" fill="#ffd23f" stroke="#c99a1a" stroke-width="2"/></svg>
      <img class="ab-hero" src="assets/hero.webp" alt="">
    </div>
    <div class="ab-text">
      <h2>RyleCraft Playground</h2>
      <p>is a colorful open-world building adventure where imagination has no limits! Explore beautiful landscapes, build anything you dream of, discover amazing animals and magical creatures, and create your own adventures.</p>
      <div class="ab-love">❤️ Built with love for my nephew, Ryle.</div>
      <div class="ab-tag">Your world, your imagination,<br>your playground!</div>
      <div class="ab-by">Created by <b>Halliday</b></div>
    </div>
  </div>`,m=>{
    m.classList.add('about-open');
    m.querySelector('.card').classList.add('aboutcard');
    const x=m.querySelector('#abx');if(x)x.onclick=close;
    m.onclick=e=>{if(e.target===m)close()};
  });
}
function releasesModal(){
  modal(`<div class="ab-banner"><span class="ab-leaf">✨</span><span class="ab-i" aria-hidden="true">!</span>What’s New<span class="ab-leaf right">✨</span></div>
  <button class="ab-x" id="rnx" aria-label="Close">✕</button>
  <div class="rn-body">
    <div class="rn-head">
      <span class="rn-ver">v1.0.0</span>
      <h2>First Release</h2>
      <span class="rn-date">November 2026</span>
    </div>
    <p class="rn-intro">The adventure begins! Here’s everything waiting for you in RyleCraft Playground.</p>
    <div class="rn-grid">
      <div class="rn-item"><span class="rn-ic">🌍</span><div><b>Endless Worlds</b><small>Forests, deserts, snow lands, rivers, mountains and cozy houses to explore.</small></div></div>
      <div class="rn-item"><span class="rn-ic">🧱</span><div><b>Build &amp; Mine</b><small>Place blocks, dig, and grab the pickaxe or diamond sword.</small></div></div>
      <div class="rn-item"><span class="rn-ic">🐄</span><div><b>Amazing Animals</b><small>Cows, sheep, horses, dogs and other friends to meet.</small></div></div>
      <div class="rn-item"><span class="rn-ic">🌦️</span><div><b>Living Weather</b><small>Sunny days, rain, thunderstorms and starry nights.</small></div></div>
      <div class="rn-item"><span class="rn-ic">🕊️</span><div><b>Fly &amp; Explore</b><small>Fly anywhere, ride animals and dive underwater.</small></div></div>
      <div class="rn-item"><span class="rn-ic">💾</span><div><b>Save Anytime</b><small>Keep your world on this device and continue later.</small></div></div>
    </div>
    <button class="big rn-ok" id="o">Cool!</button>
  </div>`,m=>{
    m.classList.add('about-open');
    m.querySelector('.card').classList.add('notecard');
    const x=m.querySelector('#rnx');if(x)x.onclick=close;
    m.querySelector('#o').onclick=close;
    m.onclick=e=>{if(e.target===m)close()};
  });
}

function howToPlayModal(){
  modal(`<div class="ab-banner"><span class="ab-leaf">🎮</span><span class="ab-i" aria-hidden="true">?</span>How to Play<span class="ab-leaf right">🎮</span></div>
  <button class="ab-x" id="hpx" aria-label="Close">✕</button>
  <div class="hp-body">
    <div class="hp-head">
      <h2>How to Play</h2>
      <span class="hp-sub">Move, build and explore in seconds</span>
    </div>
    <div class="hp-grid">
      <div class="hp-item"><span class="hp-ic">👆</span><div><b>Move</b><small>Drag the left side of the screen. On a computer, use WASD or the arrow keys.</small></div></div>
      <div class="hp-item"><span class="hp-ic">🖐️</span><div><b>Look Around</b><small>Drag the right side to look. Pinch or scroll to zoom; Q and E turn.</small></div></div>
      <div class="hp-item"><span class="hp-ic">🔨</span><div><b>Build &amp; Mine</b><small>Tap to place blocks. Switch to ⛏️ Mine to dig, or ⚔️ Sword to bop.</small></div></div>
      <div class="hp-item"><span class="hp-ic">🕊️</span><div><b>Fly &amp; Save</b><small>Tap 🕊️ to fly anywhere, and 💾 to save your world.</small></div></div>
    </div>
    <button class="big hp-ok" id="o">Got it!</button>
  </div>`,m=>{
    m.classList.add('about-open');
    m.querySelector('.card').classList.add('notecard');
    const x=m.querySelector('#hpx');if(x)x.onclick=close;
    m.querySelector('#o').onclick=close;
    m.onclick=e=>{if(e.target===m)close()};
  });
}
let swallowHomeClick=false;
function enter(){$('home').classList.add('hide');$('hud').classList.remove('hide');swatch();setMode('build');sync()}
function goHome(){if(!$('hud').classList.contains('hide'))save();$('hud').classList.add('hide');$('home').classList.remove('hide');swallowHomeClick=true;playSub()}
$('bNew').onclick=()=>{
  if(hasSave())modal('<h2>Start a new world?</h2><p>Your saved world will be replaced.</p><div class="row"><button class="big soft" id="n">Keep it</button><button class="big" id="y">New world</button></div>',m=>{
    m.querySelector('#n').onclick=close;m.querySelector('#y').onclick=()=>{close();try{localStorage.removeItem(KEY)}catch(e){}newWorld();enter()}});
  else{newWorld();enter()}};
$('bCont').onclick=()=>{if(load())enter();else{newWorld();enter()}};
$('home2').onclick=goHome;
$('wx').onclick=()=>{const order=[0,1,3,2];const n=order[(order.indexOf(WX)+1)%order.length];WXAUTO=true;setWeather(n);toast(WXS[n].n)};
const bMusic=$('bMusic');
function syncMusicBtn(){
  const on=window.RyleAudio?RyleAudio.isMusicEnabled():true;
  bMusic.classList.toggle('off',!on);
  bMusic.setAttribute('aria-pressed',on?'true':'false');
  bMusic.setAttribute('aria-label',on?'Background music and ambience on':'Background music and ambience off');
  // keep the Settings panel in step if it happens to be open
  ['aMr','aAr'].forEach(id=>{const row=document.getElementById(id);if(row)row.classList.toggle('off',!on)});
}
bMusic.onclick=()=>{if(window.RyleAudio){const on=!RyleAudio.isMusicEnabled();RyleAudio.setMusicEnabled(on);toast(on?'Music & ambience on 🎵':'Music & ambience off 🔇')}syncMusicBtn()};
syncMusicBtn();
/* ---- fullscreen: one toggle shared by the in-game button and the home button ---- */
const bFull=$('bFull'),bFs=$('bFs');
const MOBILE=(()=>{try{return (matchMedia('(hover:none) and (pointer:coarse)').matches&&!matchMedia('(hover:hover)').matches)||(navigator.maxTouchPoints>1&&!matchMedia('(hover:hover)').matches)}catch(e){return false}})();
if(MOBILE)document.body.classList.add('mobile-ui');
const fsEl=()=>document.fullscreenElement||document.webkitFullscreenElement||document.msFullscreenElement||null;
const fsSupported=()=>{const e=document.documentElement;return !!(e.requestFullscreen||e.webkitRequestFullscreen||e.msRequestFullscreen)};
function syncFullBtn(){
  const on=!!fsEl(),sup=fsSupported();
  [bFull,bFs].forEach(b=>{b.classList.toggle('on',on);b.setAttribute('aria-pressed',on?'true':'false');b.setAttribute('aria-label',on?'Exit fullscreen':'Enter fullscreen')});
  // the in-game button only makes sense where the browser can actually do it;
  // the home button stays put on touch devices so iPhone users get instructions
  bFull.classList.toggle('hide',!sup);
}
function fullscreenHelp(){
  modal('<h2>Go fullscreen</h2><p>On iPhone and iPad, tap the <b>Share</b> button in Safari, choose <b>Add to Home Screen</b>, then open Rylecraft from your home screen. It starts without browser bars — just the game.</p><button class="big" id="fsh">Got it!</button>',m=>{m.querySelector('#fsh').onclick=close});
}
function toggleFull(){
  if(!fsSupported()){fullscreenHelp();return}
  try{
    if(fsEl()){
      const ex=document.exitFullscreen||document.webkitExitFullscreen||document.msExitFullscreen;
      if(ex){const p=ex.call(document);if(p&&p.catch)p.catch(()=>{})}
    }else{
      const e=document.documentElement,req=e.requestFullscreen||e.webkitRequestFullscreen||e.msRequestFullscreen;
      if(req){const p=req.call(e);if(p&&p.catch)p.catch(()=>{})}
    }
  }catch(e){}
  setTimeout(syncFullBtn,80);
}
bFull.onclick=toggleFull;bFs.onclick=toggleFull;
['fullscreenchange','webkitfullscreenchange','MSFullscreenChange'].forEach(ev=>document.addEventListener(ev,syncFullBtn));
syncFullBtn();

/* ---- forced landscape: phones and tablets must play sideways ---- */
const bLand=$('bLand'),rot=$('rot'),rotGo=$('rotGo');
const isPortrait=()=>{try{return matchMedia('(orientation:portrait)').matches}catch(e){return innerHeight>=innerWidth}};
function landscapeNudge(){
  bLand.classList.add('nudge');setTimeout(()=>bLand.classList.remove('nudge'),600);
  toast('Rotate the device — landscape is the way 🎮');
}
function goLandscape(){
  const lock=()=>{
    try{
      const so=screen.orientation;
      if(so&&typeof so.lock==='function'){const p=so.lock('landscape');if(p&&p.catch)p.catch(landscapeNudge)}
      else landscapeNudge();
    }catch(e){landscapeNudge()}
  };
  if(fsEl()){lock();return}
  if(!fsSupported()){landscapeNudge();return}
  try{
    const e=document.documentElement,req=e.requestFullscreen||e.webkitRequestFullscreen||e.msRequestFullscreen;
    const p=req.call(e);
    if(p&&p.then)p.then(()=>{syncFullBtn();lock()}).catch(landscapeNudge);
    else setTimeout(()=>{syncFullBtn();lock()},120);
  }catch(e){landscapeNudge()}
}
function syncRotGate(){
  const sideways=MOBILE&&!isPortrait();
  rot.classList.toggle('hide',!MOBILE||!isPortrait());
  bLand.classList.toggle('on',sideways);
  bLand.setAttribute('aria-pressed',sideways?'true':'false');
}
bLand.onclick=goLandscape;rotGo.onclick=goLandscape;
['orientationchange','resize'].forEach(ev=>addEventListener(ev,syncRotGate));
syncRotGate();

$('dm').onclick=()=>riding?dismount():mountNear();
// buttons react the moment a finger touches them, even while the joystick is held
$('hud').addEventListener('pointerdown',e=>{const b=e.target.closest&&e.target.closest('button');if(b&&!['up','dn','jp','sw','bFull'].includes(b.id)){e.preventDefault();b.click()}});
$('hud').addEventListener('click',e=>{if(e.isTrusted&&!(e.target.closest&&e.target.closest('#bFull')))e.stopPropagation()},true);
// The in-game Home button and the home-screen info button share the same
// corner, so the tail of the tap that closes the HUD would otherwise open
// How to Play. Swallow exactly the click belonging to that transition; a new
// touch clears the flag, so the next real tap always works (and a long press
// cannot outlast it).
document.addEventListener('pointerdown',()=>{swallowHomeClick=false},true);
$('home').addEventListener('click',e=>{if(e.isTrusted&&swallowHomeClick){swallowHomeClick=false;e.stopPropagation();e.preventDefault()}},true);
$('vw').onclick=()=>{third=!third;me.visible=third;$('vw').textContent=third?'🧍':'👁️'};
$('bSet').onclick=()=>{
  const A=window.RyleAudio,s=A?A.getSettings():{master:.85,music:.6,sfx:.85,ambient:.7,muted:false};
  const mus=A?A.isMusicEnabled():true;
  const sl=(id,lab,key)=>'<label class="vol'+((key==='music'||key==='ambient')&&!mus?' off':'')+'" id="'+id+'r">'+lab+((key==='music'||key==='ambient')?'<em class="offtag">off</em>':'')+'<input type="range" id="'+id+'" min="0" max="100" value="'+Math.round(s[key]*100)+'"><span id="'+id+'v">'+Math.round(s[key]*100)+'%</span></label>';
  modal('<h2>Settings</h2><p>Graphics</p><div class="row"><button class="big '+(quality==='smooth'?'':'soft')+'" id="q1">Smooth</button><button class="big '+(quality==='sharp'?'':'soft')+'" id="q2">Sharp</button></div><p>Sound</p><div class="snd">'+sl('aM','Music','music')+sl('aS','Effects','sfx')+sl('aA','Ambience','ambient')+sl('aZ','Master','master')+'<button class="big soft" id="mu">'+(s.muted?'🔇 Muted':'🔊 Sound on')+'</button></div><p>Worlds are saved on this device and browser only. Clearing browser data can remove them.</p><button class="big alt" id="ok">Done</button>',m=>{
    const bind=(id,key)=>{const el=m.querySelector('#'+id),v=m.querySelector('#'+id+'v');el.oninput=()=>{v.textContent=el.value+'%';A&&A.setVolume(key,el.value/100)};};
    bind('aM','music');bind('aS','sfx');bind('aA','ambient');bind('aZ','master');
    const mu=m.querySelector('#mu');mu.onclick=()=>{const now=A?A.getSettings().muted:false;if(A)A.setMuted(!now);mu.textContent=now?'🔊 Sound on':'🔇 Muted';mu.classList.toggle('alt',!now)};
    m.querySelector('#q1').onclick=()=>{quality='smooth';size();close()};m.querySelector('#q2').onclick=()=>{quality='sharp';size();close()};m.querySelector('#ok').onclick=close});
};
function playSub(){$('psub').textContent=hasSave()?'Continue Adventure':'Start Adventure'}
function ask(fn){if(hasSave())modal('<h2>Start a new world?</h2><p>Your saved world will be replaced.</p><div class="row"><button class="big soft" id="n">Keep it</button><button class="big" id="y">New world</button></div>',m=>{m.querySelector('#n').onclick=close;m.querySelector('#y').onclick=()=>{close();fn()}});else fn()}
function flatWorld(){setWeather(0);startAt(0,9,1,1)}
let NAME='';
const esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function getName(){if(NAME)return NAME;try{NAME=localStorage.getItem('rylecraft.name')||''}catch(e){}return NAME}
function setName(v){NAME=v;try{localStorage.setItem('rylecraft.name',v)}catch(e){}document.getElementById('hn').textContent='Hi, '+v+'! 👑'}
function askName(first){modal('<h2>'+(first?'Welcome, builder! 👋':'Change your name')+'</h2><p>What should we call you?</p><input id="nm" maxlength="14" autocomplete="off" placeholder="Your name" value="'+esc(getName())+'"><div class="row">'+(first?'':'<button class="big soft" id="nc">Cancel</button>')+'<button class="big" id="ny">'+(first?'Let’s go!':'Save')+'</button></div>',m=>{
  const inp=m.querySelector('#nm'),ok=()=>{const v=inp.value.trim().slice(0,14);if(!v){inp.focus();return}setName(v);close();toast('Hi, '+v+'! 👋')};
  m.querySelector('#ny').onclick=ok;inp.addEventListener('keydown',e=>{if(e.key==='Enter')ok()});const c=m.querySelector('#nc');if(c)c.onclick=close;setTimeout(()=>inp.focus(),60)})}
$('hi').onclick=()=>askName(false);
$('bAbout').onclick=aboutModal;
$('bAboutM').onclick=aboutModal;
if(getName())setName(getName());else askName(true);
$('bWorlds').onclick=()=>hasSave()?modal('<h2>My Worlds</h2><p>🌍 '+esc(getName()||'My')+'’s World<br>Saved on this device</p><div class="row"><button class="big soft" id="d">Delete</button><button class="big" id="p">Play</button></div>',m=>{m.querySelector('#p').onclick=()=>{close();if(load())enter()};m.querySelector('#d').onclick=()=>{try{localStorage.removeItem(KEY)}catch(e){}close();playSub();toast('World deleted')}}):modal('<h2>My Worlds</h2><p>No worlds yet. Tap New World to start!</p><button class="big" id="o">OK</button>',m=>{m.querySelector('#o').onclick=close});
$('bInfo').onclick=howToPlayModal;
$('bUp').onclick=releasesModal;
playSub();

// ---------- audio ----------
let stepT=0,hoofT=0,swimT=0,audioSceneT=0,animalT=9,curScene='menu',pendScene='',pendT=0;
const FANT_A={unicorn:1,pegasus:1,magicfox:1,firedeer:1,dragon:1,icewolf:1,crystalturtle:1};
function audioTick(dt){
  if(!window.RyleAudio)return;
  if(document.getElementById('hud').classList.contains('hide')){
    if(curScene!=='menu'){curScene='menu';pendScene='';pendT=0;RyleAudio.setScene('menu');RyleAudio.setEnvironment({night:false,raining:false,water:false,underwater:false,forest:false,mountains:false})}
    RyleAudio.frame(dt,cam);return
  }
  audioSceneT-=dt;animalT-=dt;
  if(audioSceneT<=0){
    audioSceneT=.45;
    const m=biomeOf(pos.x,pos.z);
    const eyeB=get(Math.floor(pos.x),Math.floor(pos.y),Math.floor(pos.z));
    const underwater=eyeB===13;
    const feetB=get(Math.floor(pos.x),Math.floor(pos.y-EYE+.25),Math.floor(pos.z));
    const water=underwater||feetB===13||swimming;
    const ocean=CH<=SEA+1&&!m.m;
    let fantasy=!!m.mg;
    if(!fantasy)for(const a of A)if(FANT_A[a.kind]&&(a.x-pos.x)**2+(a.z-pos.z)**2<22*22){fantasy=true;break}
    const sc=water?'ocean':(WX===2&&!m.mg)?'night':fantasy?'fantasy':ocean?'ocean':m.m?'mountains':m.f?'forest':'grass';
    if(sc!==curScene){
      if(sc===pendScene){pendT+=.45;if(pendT>=.9||curScene==='menu'){RyleAudio.setScene(sc);curScene=sc;pendScene='';pendT=0}}
      else{pendScene=sc;pendT=0}
    }else{pendScene='';pendT=0}
    RyleAudio.setEnvironment({night:WX===2,raining:WX===1||WX===3,storm:WX===3,water,underwater,forest:!!m.f,mountains:!!m.m});
  }
  const ground=get(Math.floor(pos.x),Math.floor(pos.y-EYE-.25),Math.floor(pos.z))||1;
  if(swimming&&mvg){swimT-=dt;if(swimT<=0){swimT=.55;RyleAudio.swim()}}
  else if(riding&&mvg){hoofT-=dt;if(hoofT<=0){hoofT=.3;RyleAudio.hoof()}}
  else if(mvg&&onG&&!fly&&!riding){stepT-=dt;if(stepT<=0){stepT=.4;RyleAudio.step(ground)}}
  else stepT=0;
  if(animalT<=0){
    animalT=9+Math.random()*10;
    let best=null,bd=26*26;
    for(const a of A){if(a===riding||!a.g.visible)continue;const d=(a.x-pos.x)**2+(a.z-pos.z)**2;if(d<bd){bd=d;best=a}}
    if(best){RyleAudio.animal(best.kind,best.x,best.y+.5,best.z,false);if(FANT_A[best.kind])animalT+=8}
  }
  RyleAudio.frame(dt,cam);
}

// ---------- loop ----------
let last=performance.now();
function loop(t){
  requestAnimationFrame(loop);
  const dt=Math.min(.05,(t-last)/1000);last=t;
  if(!$('hud').classList.contains('hide')){
    const ojx=jx,ojy=jy;
    if(keys.w||keys.arrowup)jy=1;if(keys.s||keys.arrowdown)jy=-1;if(keys.a||keys.arrowleft)jx=-1;if(keys.d||keys.arrowright)jx=1;
    if(keys.q)yaw+=dt*1.8;if(keys.e)yaw-=dt*1.8;
    if(keys[' '])vy=1;else if(keys.shift)vy=-1;else if(!keys[' ']&&!document.activeElement.classList.contains('r')&&vy&&(keys[' ']===0||keys.shift===0))vy=0;
    stepMove(dt);jx=ojx;jy=ojy;if(pos.x<40||pos.x>W-40||pos.z<40||pos.z>D-40)recenter();
  }else{yaw+=dt*.08;mvg=0}
  cam.position.copy(pos);cam.rotation.set(pitch,yaw,0);
  if(third){const bx=Math.sin(yaw)*Math.cos(pitch),by=-Math.sin(pitch),bz=Math.cos(yaw)*Math.cos(pitch);let t=0;
    while(t<4.5){const n=t+.15,b=get(Math.floor(pos.x+bx*n),Math.floor(pos.y+by*n),Math.floor(pos.z+bz*n));if(b&&b!==13&&(b<16||b>22))break;t=n}
    t=Math.max(0,t-.2);
    cam.position.set(pos.x+bx*t,pos.y+by*t,pos.z+bz*t);
    if(t<.6)me.visible=false}
  me.visible=third&&!$('hud').classList.contains('hide');vm.visible=!third&&!$('hud').classList.contains('hide');if(me.visible||vm.visible)stepSwing(dt);stepVM(dt);stepMe(dt);stars.position.copy(cam.position);orb.position.set(cam.position.x+80,cam.position.y+110,cam.position.z-90);orb.lookAt(cam.position);stepWeather(dt);stepRain(dt);
  stepAnimals(dt);stepFish(dt);updMount();trk(dt);updUD();audioTick(dt);
  for(let q=0;q<2&&lightQ.length;q++){const k=lightQ.pop();rc(k%CX,Math.floor(k/CX))}
  const uw=get(Math.floor(pos.x),Math.floor(pos.y),Math.floor(pos.z))===13;if(uw){scene.background.setHex(0x2a6fb8);scene.fog.color.setHex(0x2a6fb8);scene.fog.near=1;scene.fog.far=24}else{scene.background.copy(skyC);scene.fog.color.copy(skyC);scene.fog.near=FN;scene.fog.far=FF}
  clouds.forEach(c=>{const q=c.position;q.x+=dt*.6;if(q.x-pos.x>120)q.x-=240;else if(q.x-pos.x<-120)q.x+=240;if(q.z-pos.z>120)q.z-=240;else if(q.z-pos.z<-120)q.z+=240});
  for(let k=parts.length-1;k>=0;k--){const q=parts[k];q.v.y-=12*dt;q.position.addScaledVector(q.v,dt);q.life-=dt;if(q.life<=0){scene.remove(q);parts.splice(k,1)}}
  cam.updateMatrixWorld();R.render(scene,cam);
  R.autoClear=false;R.clearDepth();R.render(vmScene,vmCam);R.autoClear=true;
}
newWorld();requestAnimationFrame(loop);
