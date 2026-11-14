// Earth Jukebox web app: reads map frames, turns them into sound and speech.
// Chrysanthos: moved here from the <script> block in index.html so HTML, CSS and JS are in separate files.
const $=id=>document.getElementById(id),cl=v=>Math.max(0,Math.min(1,v));
const HEX={diverging:['#2166ac','#67a9cf','#f7f7f7','#ef8a62','#b2182b'],viridis:['#440154','#3b528b','#21918c','#5ec962','#fde725'],inferno:['#000004','#420a68','#932667','#dd513a','#fca50a','#fcffa4'],plasma:['#0d0887','#7e03a8','#cc4778','#f89540','#f0f921'],jet:['#00007f','#0000ff','#00ffff','#ffff00','#ff0000','#7f0000']};
let S,frames=[],uploaded=[],mode='demo',fIdx=0,pos=0,playing=false,timer,last,ac,master,pan,voices=[];
// Chrysanthos: sources = the {name, img} list being played (a preset or your uploads), customLut = colours from an uploaded colorbar,
// preset = the NASA preset in use (or null), booting = stay quiet while the page first loads
let sources=[],customLut=null,preset=null,booting=true;
// Chrysanthos: view = 'frames' (play every frame) or 'change' (one sweep of last minus first frame), downVoices = the low buzz for "went down"
let view='frames',downVoices=[];
// Panagiotis: manualCustomLut = a colorbar image was uploaded by hand, autoBarState = colorbar found inside the frames
let manualCustomLut=false,autoBarState=null;
// Panagiotis: stop only the sound (used when Describe starts talking during playback)
function pauseSonifyOnly(){playing=false;clearInterval(timer);if(ac)voices.concat(downVoices).forEach(g=>g.gain.setTargetAtTime(0,ac.currentTime,.05));setPlayBtn(false);}
function lutFor(n){if(n==='gray')return null;if(n==='custom')return customLut;const s=HEX[n].map(h=>[1,3,5].map(i=>parseInt(h.substr(i,2),16))),L=[];for(let i=0;i<256;i++){const p=i/255*(s.length-1),k=Math.min(Math.floor(p),s.length-2),f=p-k;L.push([0,1,2].map(c=>s[k][c]+(s[k+1][c]-s[k][c])*f));}return L;}
// Chrysanthos: brightness mode now uses the min/max boxes too. It was stuck on 0..1, and dim maps like night lights came out almost silent.
// Also reads the trim boxes (crop).
function readS(){const c=$('cmap').value,g=c==='gray',tr=id=>Math.max(0,Math.min(90,+$(id).value||0));return{gray:g,lut:lutFor(c),vmin:+$('vmin').value,vmax:+$('vmax').value,units:$('units').value.trim()||(g?'brightness':''),tol:+$('tol').value||50,lat0:+$('lat0').value,lat1:+$('lat1').value,lon0:+$('lon0').value,lon1:+$('lon1').value,autoColorbar:$('autoColorbar').checked,crop:{t:tr('cropT'),b:tr('cropB'),l:tr('cropL'),r:tr('cropR')}};}
const u=()=>S.units?' '+S.units:'';
// Chrysanthos: decimals depend on the value range. With a fixed 2 decimals the night lights (avg ~0.004) all read as "0.00"
const fmt=n=>n.toFixed(Math.max(0,Math.min(6,2-Math.floor(Math.log10(Math.abs(S.vmax-S.vmin)||1)))));
// Chrysanthos: for data that can't go below zero (brightness, CO2...) "up 35 percent" is much easier to follow than a raw number
const pct=(d,base)=>{if(!(S.vmin>=0&&base>0))return'';const p=Math.abs(100*d/base);return' ('+(d>=0?'up ':'down ')+(p<10?p.toFixed(1):Math.round(p))+' percent)';};
// Panagiotis: Describe (isDescribe) pauses the sound so the description can be heard.
// Chrysanthos: other announcements (like the year when a new frame starts) are spoken again while playing, otherwise
// someone who can't see the screen doesn't know which year they're hearing.
function announce(t,isDescribe=false){
  if(booting)return;
  if(isDescribe&&playing)pauseSonifyOnly();
  if($('speech').checked&&'speechSynthesis' in window){speechSynthesis.cancel();const m=new SpeechSynthesisUtterance(t);m.lang='en';speechSynthesis.speak(m);}
  else{$('live').textContent='';setTimeout(()=>{$('live').textContent=t},60);}
}
function say(t){$('dtxt').textContent=t;$('cv').setAttribute('aria-label','Earth map frame. '+t);announce(t,true);}
function decode(raw){const d=raw.data,n=raw.width*raw.height,v=new Float32Array(n),t2=S.tol*S.tol,L=S.lut;for(let i=0;i<n;i++){const r=d[4*i],g=d[4*i+1],b=d[4*i+2];if(d[4*i+3]<128){v[i]=NaN;continue;}if(!L){v[i]=(.2126*r+.7152*g+.0722*b)/255;continue;}let best=1e9,bi=0;for(let k=0;k<256;k++){const c=L[k],e=(r-c[0])**2+(g-c[1])**2+(b-c[2])**2;if(e<best){best=e;bi=k;}}v[i]=best<=t2?S.vmin+(S.vmax-S.vmin)*bi/255:NaN;}return v;}
function mkFrame(name,W,H,vals,disp){const B=12,f={name,W,H,vals,disp,B:new Float32Array(B*W)},e=[];for(let i=0;i<=B;i++)e.push(Math.round(i*H/B));let n=0,sum=0,mn=Infinity,mx=-Infinity,mi=0,nN=0,sN=0,nS=0,sS=0;
for(let y=0;y<H;y++)for(let x=0;x<W;x++){const v=vals[y*W+x];if(v!==v)continue;n++;sum+=v;if(v<mn)mn=v;if(v>mx){mx=v;mi=y*W+x;}if(y<H/2){nN++;sN+=v;}else{nS++;sS+=v;}}
for(let b=0;b<B;b++)for(let x=0;x<W;x++){let c=0,t=0;for(let y=e[b];y<e[b+1];y++){const v=vals[y*W+x];if(v===v){c++;t+=v;}}f.B[b*W+x]=c>=Math.max(1,.3*(e[b+1]-e[b]))?cl((t/c-S.vmin)/(S.vmax-S.vmin)):0;}
f.st={n,mean:n?sum/n:0,mn,mx,mi,north:nN?sN/nN:NaN,south:nS?sS/nS:NaN};return f;}
function dispFromVals(f){const c=document.createElement('canvas');c.width=f.W;c.height=f.H;const x=c.getContext('2d'),im=x.createImageData(f.W,f.H);for(let i=0;i<f.W*f.H;i++){const v=f.vals[i],o=4*i;if(v!==v){im.data[o]=107;im.data[o+1]=114;im.data[o+2]=128;}else{const q=cl((v-S.vmin)/(S.vmax-S.vmin));if(S.lut){const L=S.lut[Math.round(q*255)];im.data[o]=L[0];im.data[o+1]=L[1];im.data[o+2]=L[2];}else{im.data[o]=im.data[o+1]=im.data[o+2]=255*q;}}im.data[o+3]=255;}x.putImageData(im,0,0);return c;}
function demoFrames(){const out=[],s=[.2,.9,1.8,2.6,1.6,.4];for(let t=0;t<6;t++){const W=160,H=80,v=new Float32Array(W*H);for(let y=0;y<H;y++)for(let x=0;x<W;x++){const lo=x/(W-1)*360-180,la=90-y/(H-1)*180,land=(lo>-130&&lo<-60&&la>15&&la<70)||(lo>-80&&lo<-35&&la>-55&&la<10)||(lo>-15&&lo<50&&la>-35&&la<35)||(lo>-10&&lo<150&&la>35&&la<70)||(lo>113&&lo<153&&la>-39&&la<-12);let a=NaN;if(!land){a=.8*Math.sin(lo*Math.PI/90+t*.9)*Math.cos(la*Math.PI/120)+s[t]*Math.exp(-(((lo+130)/35)**2+(la/10)**2));a=Math.max(-3,Math.min(3,a));if(S.gray)a=(a+3)/6;}v[y*W+x]=a;}
const f=mkFrame('Demo month '+(t+1)+' of 6, synthetic',W,H,v,null);f.disp=dispFromVals(f);out.push(f);}return out;}
// Chrysanthos: "near India (23 degrees north, 78 degrees east)" instead of only the numbers. Uses the same REGIONS list as the change mode.
const where=(la,lo)=>{const c=Math.abs(la).toFixed(0)+' degrees '+(la>=0?'north':'south')+', '+Math.abs(lo).toFixed(0)+' degrees '+(lo>=0?'east':'west'),p=placeAt(la,lo);return p?p+' ('+c+')':c;};
function describe(f,i){if(f.change)return describeChange(f);const s=f.st;if(!s.n)return'Frame '+(i+1)+': no readable data. Check the colormap, range and tolerance.';const x=s.mi%f.W,y=Math.floor(s.mi/f.W),la=S.lat1-y/Math.max(f.H-1,1)*(S.lat1-S.lat0),lo=S.lon0+x/Math.max(f.W-1,1)*(S.lon1-S.lon0),q=fmt;
let t='Frame '+(i+1)+' of '+frames.length+', '+f.name+'. Data covers '+Math.round(100*s.n/(f.W*f.H))+' percent of the map. The average is '+q(s.mean)+u()+', ranging from '+q(s.mn)+' to '+q(s.mx)+u()+'. The highest value is near '+where(la,lo)+'. The northern half averages '+q(s.north)+u()+' and the southern half '+q(s.south)+u()+'.';
const p=frames[i-1];if(p&&p.st.n)t+=' Compared with the previous frame, the average changed by '+(s.mean-p.st.mean>=0?'plus ':'minus ')+q(Math.abs(s.mean-p.st.mean))+u()+pct(s.mean-p.st.mean,p.st.mean)+'.';
// Chrysanthos: the big picture too, change since the first frame (e.g. 2012 to 2023)
const f0=frames[0];if(i>1&&f0.st.n)t+=' Since the first frame, '+f0.name+', it changed by '+(s.mean-f0.st.mean>=0?'plus ':'minus ')+q(Math.abs(s.mean-f0.st.mean))+u()+pct(s.mean-f0.st.mean,f0.st.mean)+'.';return t;}
// ---------------------------------------------------------------------------------------------
// Chrysanthos: "hear the change" mode. Instead of playing every frame one after another, play ONE
// sweep of (last frame minus first frame): a bright high tone where the value went up, a low buzz
// where it went down, silence where nothing changed. For night lights that's 2012 -> 2023 in one go,
// so you don't have to remember 12 sweeps to notice the difference.
// ---------------------------------------------------------------------------------------------

// Rough boxes to put a name on a place: [name, south, north, west, east]. First match wins, so small or
// specific places go before big ones. They overlap at borders, it's only meant for "near India" level.
// Turkey, Iran, Iraq, Syria and the Gulf are one "Middle East", otherwise it gets split into many small mentions.
// No "and" inside names, the voice joins them with "and" ("near China, the Middle East and India").
// China comes after India, Southeast Asia and the Middle East, because its box also covers northern India.
const REGIONS=[
 ['Japan',30,46,129,146],['South Korea',33,38.6,125,130],['Taiwan',21.5,25.5,119.5,122.5],['the Philippines',4.5,21,116,127],
 ['Bangladesh',20.5,26.7,88.5,92.7],['Sri Lanka',5.8,10,79.5,82],['Pakistan',23,37,60,75.5],['India',6,36,68,97.5],
 ['Vietnam',8.5,23.5,102,109.5],['Malaysia',1,7,99.5,104.5],['Thailand',5.5,20.5,97.5,105.6],['Myanmar',10,28.5,92.2,101.2],['Indonesia',-11,6,95,141],
 ['Egypt',22,31.7,24.7,35],['the Middle East',29.5,42.2,26,63.3],['the Middle East',12,32,34.2,60],['Central Asia',36,55,46,87],
 ['China',20,41,73,123],['northern China',41,54,73,135],
 ['the British Isles',49.8,61,-11,2],['Scandinavia',54.5,71.5,4.5,32],['the Iberian Peninsula',35.8,44,-10,4.3],['Italy',36.5,47.1,6.6,18.6],
 ['the Balkans',34.8,46.2,13.5,29.7],['Ukraine',44.3,52.4,22.1,40.2],['western Europe',42,56,-5,15],['eastern Europe',45,56,14,32],
 ['western Russia',50,70,30,60],['Siberia',45,78,60,180],
 ['North Africa',27,37.5,-13,11.6],['Libya',19.5,33.2,9.3,25],['Nigeria',4,14,2.7,14.7],['West Africa',4,25,-18,2.7],
 ['Ethiopia',3.4,15,33,48],['Sudan',8.6,22,21.8,38.6],['East Africa',-12,5,28.5,42],['Central Africa',-13.5,14,8.5,28.5],
 ['South Africa',-35,-22,16,33],['southern Africa',-27,-13.5,11.5,41],['Madagascar',-25.7,-11.9,43,50.5],
 ['Alaska',51,72,-170,-129.9],['Canada',48.5,72,-141,-52],['Florida',24.4,31,-87.6,-80],['the eastern United States',25.8,48.5,-100,-66.9],
 ['the western United States',31.3,48.5,-125,-100],['Mexico',14.5,32.7,-118.4,-86.7],['the Caribbean',10,27.3,-85,-59.4],['Central America',7,18.5,-92.3,-77.1],
 ['northern South America',-4.3,12.5,-79,-59.8],['western South America',-18.4,1.5,-81.4,-68.6],['southeastern Brazil',-25.5,-12,-53,-39],
 ['southern Brazil',-34,-25.5,-58,-48],['northeastern Brazil',-18,-1,-47,-34.7],['Argentina',-55,-21.8,-68.5,-53.6],['Chile',-56,-17.5,-76,-66.5],
 ['central South America',-27.6,-9.7,-69.6,-54.2],['Brazil',-34,5.3,-74,-34.7],
 ['eastern Australia',-39.2,-10,141,154],['Australia',-44,-10,112,154],['New Zealand',-47.5,-34,166,179]];
function placeAt(la,lo){for(const r of REGIONS)if(la>=r[1]&&la<=r[2]&&lo>=r[3]&&lo<=r[4])return r[0];return null;}
const latAt=(y,H)=>S.lat1-(y+.5)/H*(S.lat1-S.lat0),lonAt=(x,W)=>S.lon0+(x+.5)/W*(S.lon1-S.lon0);
const quantile=(arr,q)=>{const a=Float32Array.from(arr).sort();return a.length?a[Math.min(a.length-1,Math.floor(q*a.length))]:0;};

function mkChange(a,b){
 const W=a.W,H=a.H,n=W*H,d=new Float32Array(n),abs=[];
 for(let i=0;i<n;i++){const v=b.vals[i]-a.vals[i];d[i]=v;if(v===v&&v!==0)abs.push(Math.abs(v));}
 const big=quantile(abs,.99)||1,thr=.1*big; // changes under 10% of the big ones count as "no change" (JPEG noise etc.)
 // loudness per latitude band and column, like mkFrame, but split in two: went up (B) and went down (Bd).
 // Measured separately, so a band where some places went up and others down plays both sounds instead of cancelling out.
 const NB=12,e=[];for(let i=0;i<=NB;i++)e.push(Math.round(i*H/NB));const bu=new Float32Array(NB*W),bd=new Float32Array(NB*W);
 for(let k=0;k<NB;k++)for(let x=0;x<W;x++){let c=0,tu=0,td=0;for(let y=e[k];y<e[k+1];y++){const v=d[y*W+x];if(v!==v)continue;c++;if(v>thr)tu+=v;else if(v<-thr)td-=v;}
  if(c>=Math.max(1,.3*(e[k+1]-e[k]))){bu[k*W+x]=tu/c;bd[k*W+x]=td/c;}}
 const bs=quantile([...bu,...bd].filter(v=>v>0),.98)||1,loud=v=>{const q=Math.pow(cl(v/bs),.7);return q<.08?0:q;};
 const f={name:'What changed, '+a.name+' to '+b.name,change:true,from:a,to:b,W,H,vals:d,B:bu.map(loud),Bd:bd.map(loud)};
 // where did it change most: add up the change inside each named region
 const up={},down={};let nv=0,nUp=0,nDown=0;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const v=d[y*W+x];if(v!==v)continue;nv++;if(Math.abs(v)<thr)continue;if(v>0)nUp++;else nDown++;
  const p=placeAt(latAt(y,H),lonAt(x,W));if(!p)continue;const o=v>0?up:down;o[p]=(o[p]||0)+Math.abs(v);}
 const rank=o=>Object.entries(o).sort((p,q)=>q[1]-p[1]);
 f.st={n:nv,mean:b.st.mean-a.st.mean,up:rank(up),down:rank(down),nUp,nDown};
 f.disp=changeDisp(a,b,d,W,H,big);return f;}

// Picture for sighted people (and the video): gold where it went up, blue where it went down, on a dim copy of the last frame.
// Sharp when both frames are plain brightness maps of the same size, otherwise drawn from the small analysis grid.
function changeDisp(a,b,d,W,H,big){
 const hi=S.gray&&a.disp&&b.disp&&a.disp.width===b.disp.width&&a.disp.height===b.disp.height,w=hi?a.disp.width:W,h=hi?a.disp.height:H;
 const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d'),im=x.createImageData(w,h);let dd=d,base=null,scale=big;
 if(hi){const A=a.disp.getContext('2d').getImageData(0,0,w,h).data,Z=b.disp.getContext('2d').getImageData(0,0,w,h).data,lum=(P,i)=>(.2126*P[4*i]+.7152*P[4*i+1]+.0722*P[4*i+2])/255,abs=[];
  dd=new Float32Array(w*h);base=new Float32Array(w*h);for(let i=0;i<w*h;i++){base[i]=lum(Z,i);dd[i]=base[i]-lum(A,i);if(dd[i]!==0)abs.push(Math.abs(dd[i]));}scale=quantile(abs,.995)||1;}
 for(let i=0;i<w*h;i++){const v=dd[i],o=4*i;let r,g,bl;
  if(v!==v){r=g=bl=60;}else{const q=cl(Math.abs(v)/scale),k=q<.1?0:Math.sqrt(q),bg=base?Math.min(1,base[i]*4)*45:0;
   if(v>0){r=bg+k*255;g=bg+k*200;bl=bg+k*60;}else{r=bg+k*70;g=bg+k*150;bl=bg+k*255;}}
  im.data[o]=r;im.data[o+1]=g;im.data[o+2]=bl;im.data[o+3]=255;}
 x.putImageData(im,0,0);return c;}

// words for the voice. A preset can swap them for its own (night lights: "Lights grew the most near ...")
const CW=()=>Object.assign({legend:'A bright, high tone means the value went up there and a low buzz means it went down. Silence means no change.',up:'The biggest increases are near',down:'The biggest decreases are near',more:'went up',less:'went down'},preset&&preset.change);
const changeHow=()=>CW().legend;
const pctWord=v=>v<1?'less than 1':Math.round(v);
function describeChange(f){
 const s=f.st,a=f.from,b=f.to,names=(arr,k)=>{const t=arr.slice(0,k).filter(p=>p[1]>=.2*arr[0][1]).map(p=>p[0]);return t.length>1?t.slice(0,-1).join(', ')+' and '+t[t.length-1]:t[0];};
 const p=S.vmin>=0&&a.st.mean>0?Math.abs(100*s.mean/a.st.mean):null;
 let t='What changed from '+a.name+' to '+b.name+'. Overall the average '+((p!==null?p<.05:+fmt(Math.abs(s.mean))===0)?'stayed about the same':'went '+(s.mean>=0?'up ':'down ')+(p!==null?(p<10?p.toFixed(1):Math.round(p))+' percent':'by '+fmt(Math.abs(s.mean))+u()))+'.';
 const w=CW();if(s.up.length)t+=' '+w.up+' '+names(s.up,3)+'.';
 if(s.down.length&&(!s.up.length||s.down[0][1]>=.1*s.up[0][1]||s.nDown>=.1*s.nUp))t+=' '+w.down+' '+names(s.down,2)+'.';
 else if(s.up.length)t+=' Hardly anywhere '+w.less+'.';
 return t+' '+pctWord(100*s.nUp/s.n)+' percent of the map '+w.more+' and '+pctWord(100*s.nDown/s.n)+' percent '+w.less+', the rest stayed about the same.';}

const legendText=()=>view==='change'?'Listening guide for what changed. The sound sweeps from the west edge of the map in your left ear to the east edge in your right ear. Higher pitch means further north and lower pitch further south. '+changeHow()+' Press D afterwards to hear where it changed the most.':'Listening guide. The sound sweeps from the west edge of the map in your left ear to the east edge in your right ear. Higher pitch means further north and lower pitch further south. '+(preset&&preset.loudness?preset.loudness:'Louder means a higher value, from silence at '+S.vmin+u()+' or no data, up to full volume at '+S.vmax+u()+'.')+' When a new frame starts, a rising two-note chime means the average went up and a falling chime means it went down.';
// Chrysanthos: things only sighted people see (the screen reader gets the same info from the status and the voice):
// the Play/Pause icon, the 12-band level meter next to the map, the longitude readout and the clickable timeline.
function setPlayBtn(on){const b=$('play');b.textContent=on?'Pause':'Play';b.dataset.state=on?'playing':'paused';if(!on&&frames[fIdx])setMeter(null,0);}
let meterBars=null;
function setMeter(f,col){if(!meterBars){const m=$('meter');meterBars=[];for(let b=0;b<12;b++){const i=document.createElement('i');m.appendChild(i);meterBars.push(i);}}
 for(let b=0;b<12;b++){const k=f?b*f.W+col:0,st=meterBars[b].style;if(!st||!st.setProperty)continue;st.setProperty('--u',f?Math.sqrt(f.B[k]).toFixed(3):0);st.setProperty('--d',f&&f.change?Math.sqrt(f.Bd[k]).toFixed(3):0);}} // sqrt: only to make quiet bands visible
function setLon(){const lo=S.lon0+Math.min(1,pos)*(S.lon1-S.lon0);$('tmLon').textContent='Lon '+Math.abs(lo).toFixed(0)+'° '+(lo>=0?'E':'W');}
let tlKey='';
function renderTimeline(){const t=$('timeline'),key=frames.map(f=>f.name).join('|');
 if(key!==tlKey){tlKey=key;t.textContent='';frames.forEach((f,i)=>{const b=document.createElement('button');b.type='button';b.textContent=f.change?f.from.name+' → '+f.to.name:f.name;
  b.setAttribute('aria-label',f.change?f.name:'Frame '+(i+1)+', '+f.name);b.onclick=()=>{if(i!==fIdx||!playing)goTo(i);};t.appendChild(b);});}
 // only the current frame's button is in the Tab order, so keyboard users reach Play quickly (arrows, N and P move between frames)
 Array.prototype.forEach.call(t.children||[],(b,i)=>{b.setAttribute('aria-current',i===fIdx?'true':'false');b.tabIndex=i===fIdx?0:-1;});}
function draw(){const f=frames[fIdx];if(!f)return;const c=$('cv'),x=c.getContext('2d');if(c.width!==f.disp.width||c.height!==f.disp.height){c.width=f.disp.width;c.height=f.disp.height;}x.drawImage(f.disp,0,0);const px=pos*c.width,w=Math.max(3,c.width/120);x.fillStyle='#000';x.fillRect(px-w,0,2*w,c.height);x.fillStyle='#ffe600';x.fillRect(px-w/2,0,w,c.height);setLon();}
const updStatus=()=>{const f=frames[fIdx];$('tmMode').textContent=f&&f.change?'Change mode':'Every frame';renderTimeline();$('status').textContent=!f?'No frames loaded.':f.change?f.name:'Frame '+(fIdx+1)+' of '+frames.length+': '+f.name;};
const hz=i=>440*2**((48+12*Math.floor(i/5)+[0,2,4,7,9][i%5]-69)/12);
function initAudio(){if(ac)return;ac=new(window.AudioContext||window.webkitAudioContext)();master=ac.createGain();master.gain.value=+$('vol').value;const comp=ac.createDynamicsCompressor(),bus=ac.createGain();pan=ac.createStereoPanner?ac.createStereoPanner():null;if(pan){bus.connect(pan);pan.connect(comp);}else bus.connect(comp);comp.connect(master);master.connect(ac.destination);
for(let b=0;b<12;b++){const f=hz(11-b),g=ac.createGain(),g2=ac.createGain(),o1=ac.createOscillator(),o2=ac.createOscillator();g.gain.value=0;g2.gain.value=.3;o1.frequency.value=f;o2.frequency.value=2*f;o1.connect(g);o2.connect(g2);g2.connect(g);g.connect(bus);o1.start();o2.start();voices.push(g);}
// Chrysanthos: second set of voices for "hear the change", used where the value went down: an octave lower and buzzy
// (sawtooth through a low-pass filter), so it can't be mistaken for the clean tone that means "went up"
for(let b=0;b<12;b++){const f=hz(11-b)/2,o=ac.createOscillator(),lp=ac.createBiquadFilter(),g=ac.createGain();o.type='sawtooth';o.frequency.value=f;lp.type='lowpass';lp.frequency.value=f*3;g.gain.value=0;o.connect(lp);lp.connect(g);g.connect(bus);o.start();downVoices.push(g);}}
function chime(dir){const sq=dir==='up'?[660,880]:dir==='down'?[880,660]:[770];sq.forEach((fr,k)=>{const o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime+k*.18;o.type='triangle';o.frequency.value=fr;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.25,t+.02);g.gain.exponentialRampToValueAtTime(.001,t+.3);o.connect(master);g.connect(master);o.disconnect();o.connect(g);o.start(t);o.stop(t+.32);});}
function goTo(i){fIdx=i;pos=0;const f=frames[i],p=frames[i-1];let m=f.change?f.name+'.':'Frame '+(i+1)+' of '+frames.length+', '+f.name+'.',dir=null;if(p&&p.st.n&&f.st.n){
// Chrysanthos: for data that can't go negative the threshold is now 1% of the previous average, not 1% of the whole range.
// Night lights grow ~2-6% a year, which used to always come out as "about the same" with a flat chime.
const d=f.st.mean-p.st.mean,th=S.vmin>=0&&p.st.mean>0?p.st.mean*.01:(S.vmax-S.vmin)*.01;dir=d>th?'up':d<-th?'down':'same';m+=' Average '+(dir==='same'?'about the same':dir+' '+fmt(Math.abs(d))+u()+pct(d,p.st.mean))+'.';}if(playing&&dir)chime(dir);announce(m);draw();updStatus();}
function tick(){const now=performance.now();pos+=(now-last)/1000/(+$('speed').value);last=now;
if(pos>=1){if(fIdx<frames.length-1)goTo(fIdx+1);else if($('loop').checked)goTo(0);else{pause();pos=1;draw();announce(frames[fIdx].change?'End. Press D to hear where it changed the most.':'End of frames.');return;}}
const f=frames[fIdx],col=Math.min(f.W-1,Math.floor(pos*f.W)),t=ac.currentTime;for(let b=0;b<12;b++){const k=b*f.W+col;voices[b].gain.setTargetAtTime(f.change?f.B[k]*.08:Math.pow(f.B[k],1.5)*.07,t,.04);downVoices[b].gain.setTargetAtTime(f.change?f.Bd[k]*.13:0,t,.04);}if(pan)pan.pan.setTargetAtTime(pos*2-1,t,.04);setMeter(f,col);draw();}
// Chrysanthos (merging with Panagiotis's version): Play stops whatever the voice is saying and starts the sound
// straight away, so you never press Play and get nothing
async function play(){if(!frames.length){announce('Add frames first.');return;}if('speechSynthesis' in window)speechSynthesis.cancel();initAudio();try{await ac.resume();}catch(_err){return;}if(pos>=1)pos=0;playing=true;last=performance.now();clearInterval(timer);timer=setInterval(tick,30);setPlayBtn(true);}
// Chrysanthos: Pause now stops the voice too, not only the music. Before, it kept talking until the sentence was finished.
function pause(){playing=false;clearInterval(timer);if(ac)voices.concat(downVoices).forEach(g=>g.gain.setTargetAtTime(0,ac.currentTime,.05));if('speechSynthesis' in window)speechSynthesis.cancel();$('live').textContent='';setPlayBtn(false);}
const toggle=()=>playing?pause():play();
function step(d){if(frames[0]&&frames[0].change){announce('In this mode there is one sweep, from the first to the last frame. Press C to hear every frame.');return;}const i=fIdx+d;if(i<0||i>=frames.length){announce(d>0?'This is the last frame.':'This is the first frame.');return;}goTo(i);}
function replay(){pos=0;draw();if(!playing)play();}
const describeNow=()=>{if(frames.length)say(describe(frames[fIdx],fIdx));};
// Chrysanthos: images are now cropped (prep) on every rebuild, so changing the trim boxes takes effect straight away.
// "lead" is an optional sentence to say first (e.g. the preset intro). It's also called as an event listener, hence the typeof check.
function rebuild(lead){pause();S=readS();const pre=typeof lead==='string'?lead+' ':'';if(!(S.vmax>S.vmin)){announce('The maximum value must be larger than the minimum.');return;}
if(S.crop.t+S.crop.b>=95||S.crop.l+S.crop.r>=95){announce('The trims leave almost nothing of the map. Make them smaller.');return;}
autoBarState=null;
if(mode==='images'&&sources.length&&S.autoColorbar&&!manualCustomLut){
  const found=detectAutoColorbarFromSources(sources);
  if(found){
    autoBarState={crop:autoCropFromDetection(found),edge:found.edge};
    makeCustomLutFromLine(found.line);
    S.lut=customLut;
    setDetectBadge('auto','detected automatically on the '+found.edge+' edge.');
    setAutoStatus('Auto-detected an embedded colorbar on the '+found.edge+' edge (frame '+(found.frame+1)+', confidence '+found.score.toFixed(1)+') and using it as LUT.');
  }else{setDetectBadge('off','no embedded colorbar detected; using selected colormap.');setAutoStatus('No embedded colorbar detected. Using the selected colormap.');}
}else if(mode==='images'&&manualCustomLut){
  setDetectBadge('manual','using uploaded colorbar image.');
  setAutoStatus('Using uploaded colorbar image.');
}else if(mode==='images'&&!S.autoColorbar){
  setDetectBadge('off','auto-detection is off; using selected colormap.');
  setAutoStatus('Auto colorbar detection is off.');
}else{setDetectBadge('off','waiting for images.');setAutoStatus('Auto colorbar detection is idle.');}

frames=mode==='demo'?demoFrames():sources.map(x=>{const p=prep(x.img,x.name,autoBarState?autoBarState.crop:null);return mkFrame(p.name,p.raw.width,p.raw.height,decode(p.raw),p.disp);});
// Chrysanthos: in "hear the change" mode the frame list becomes a single frame, last minus first
let note='';if(view==='change'&&frames.length){const a=frames[0],b=frames[frames.length-1],why=frames.length<2?'needs at least two frames':a.W!==b.W||a.H!==b.H?'needs the first and last frame to be the same size':'';
 if(why){view='frames';$('view').value='frames';note='Hearing only the change '+why+', so every frame will play instead. ';}else frames=[mkChange(a,b)];}
fIdx=Math.min(fIdx,Math.max(0,frames.length-1));pos=0;draw();updStatus();if(!frames.length){announce('Add images to begin.');return;}
const cov=frames.reduce((a,f)=>a+f.st.n/(f.W*f.H),0)/frames.length,f0=frames[0];
announce(pre+note+(cov<.05?'Loaded '+frames.length+' frames, but very few pixels matched the colormap. Check the colormap, range and tolerance.':f0.change?'Ready to hear what changed from '+f0.from.name+' to '+f0.to.name+'. '+changeHow()+' Press Play to listen.':'Loaded '+frames.length+' frames. Press Play to listen.'));}
function setView(v){view=v;$('view').value=v;fIdx=0;rebuild();}
function setDemo(){$('cmap').value='diverging';$('vmin').value=-3;$('vmax').value=3;$('units').value='°C anomaly';mode='demo';preset=null;$('intro').textContent='Made-up data, not from NASA: six months of a pretend ocean temperature anomaly, with a warm patch in the Pacific that grows and then fades.';}
const isPngOrJpeg=f=>{const ext=f.name.toLowerCase().match(/\.[^.]+$/)?.[0],byName=ext==='.png'||ext==='.jpg'||ext==='.jpeg',byType=f.type==='image/png'||f.type==='image/jpeg';return byName&&(!f.type||byType);};
const loadImg=f=>new Promise((ok,no)=>{if(!isPngOrJpeg(f)){no(new Error(`${f.name} is not a PNG or JPEG image`));return;}const url=URL.createObjectURL(f),i=new Image();i.onload=()=>{URL.revokeObjectURL(url);ok(i);};i.onerror=()=>{URL.revokeObjectURL(url);no(new Error(f.name));};i.src=url;});
const loadURL=(url,name)=>new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>no(new Error(name));i.src=url;});
const fileKey=f=>`${f.name}::${f.size}::${f.lastModified}`;
const itemKey=x=>x.id||x.name;
const setAutoStatus=t=>{$('autoColorbarStatus').textContent=t;};
const setDetectBadge=(kind,text)=>{const el=$('cmapDetect');if(!el)return;el.className='detect-badge '+kind;el.textContent='Colorbar status: '+text;};
function renderUploadList(){const ul=$('uploadList');ul.textContent='';if(!uploaded.length){const li=document.createElement('li');li.className='empty';li.textContent='No uploaded frames yet.';ul.appendChild(li);}else uploaded.forEach((it,i)=>{const li=document.createElement('li'),nm=document.createElement('span'),btn=document.createElement('button');nm.className='name';nm.textContent=(i+1)+'. '+it.name;btn.type='button';btn.className='subtle';btn.dataset.remove=itemKey(it);btn.textContent='Remove';li.appendChild(nm);li.appendChild(btn);ul.appendChild(li);});$('clearUploads').disabled=!uploaded.length;$('uploadHint').textContent=uploaded.length?`${uploaded.length} frame${uploaded.length===1?'':'s'} loaded.`:'Add files in batches. New selections are appended and sorted by name.';}

function makeCustomLutFromLine(line){const len=line.length||1;customLut=[];for(let k=0;k<256;k++)customLut.push(line[Math.round(k*(len-1)/255)]);$('cmap').querySelector('[value=custom]').disabled=false;}

function detectEmbeddedColorbar(im){
  const c=document.createElement('canvas'),s=Math.min(1,640/Math.max(im.width,im.height));
  c.width=Math.max(1,Math.round(im.width*s));c.height=Math.max(1,Math.round(im.height*s));
  const x=c.getContext('2d');x.drawImage(im,0,0,c.width,c.height);
  const raw=x.getImageData(0,0,c.width,c.height).data,W=c.width,H=c.height;
  const px=(xx,yy)=>{const o=4*(yy*W+xx);return[raw[o],raw[o+1],raw[o+2],raw[o+3]];};
  const candidates=[],bands=[0.06,0.1,0.14],insets=[0,0.03];
  bands.forEach(fr=>{const bh=Math.max(6,Math.round(H*fr)),bw=Math.max(6,Math.round(W*fr));
    insets.forEach(ins=>{const ix=Math.round(W*ins),iy=Math.round(H*ins);
	  candidates.push({edge:'top',x:0,y:iy,w:W,h:bh});
	  candidates.push({edge:'bottom',x:0,y:Math.max(0,H-bh-iy),w:W,h:bh});
	  candidates.push({edge:'left',x:ix,y:0,w:bw,h:H});
	  candidates.push({edge:'right',x:Math.max(0,W-bw-ix),y:0,w:bw,h:H});
    });
  });

  let best=null;
  for(const r of candidates){
	const wide=r.w>=r.h,len=wide?r.w:r.h,th=wide?r.h:r.w;if(len<24||th<4)continue;
	const line=[];let acrossErr=0,used=0;
	for(let i=0;i<len;i++){
	  let rr=0,gg=0,bb=0,aa=0,samp=0;
	  for(let j=0;j<th;j++){
		const xx=wide?(r.x+i):(r.x+j),yy=wide?(r.y+j):(r.y+i),p=px(xx,yy);
		if(p[3]<40)continue;
		rr+=p[0];gg+=p[1];bb+=p[2];aa+=p[3];samp++;
	  }
	  if(!samp){line.push([0,0,0]);continue;}
	  const ar=rr/samp,ag=gg/samp,ab=bb/samp,aaMean=aa/samp;
	  line.push([ar,ag,ab]);used++;
	  let e=0;
	  for(let j=0;j<th;j++){
		const xx=wide?(r.x+i):(r.x+j),yy=wide?(r.y+j):(r.y+i),p=px(xx,yy);
		if(p[3]<40)continue;
		e+=Math.sqrt((p[0]-ar)**2+(p[1]-ag)**2+(p[2]-ab)**2)+Math.abs(p[3]-aaMean)*0.1;
	  }
	  acrossErr+=e/Math.max(1,samp);
	}
	if(used<len*0.8)continue;
	if(!wide)line.reverse();
	let grad=0,sat=0;
	for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i];grad+=Math.sqrt((a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2);}
	for(let i=0;i<line.length;i++){const mx=Math.max(...line[i]),mn=Math.min(...line[i]);sat+=mx-mn;}
	grad/=Math.max(1,line.length-1);sat/=Math.max(1,line.length);
	const flatPenalty=acrossErr/Math.max(1,len); // true colorbars are smoother across thickness than along length
	const score=grad+sat*0.35-flatPenalty*0.25;
	if(score>12&&(!best||score>best.score))best={score,line,edge:r.edge,rect:r,W,H};
  }
  return best;
}
function detectAutoColorbarFromSources(list){
  const maxChecks=Math.min(3,list.length);
  let best=null;
  for(let i=0;i<maxChecks;i++){
    const found=detectEmbeddedColorbar(list[i].img);
    if(found&&(!best||found.score>best.score))best={...found,frame:i};
  }
  return best;
}
function autoCropFromDetection(d){const pct=(v,tot)=>Math.max(0,Math.min(90,(v/tot)*100));const pad=1.2;if(!d)return{t:0,b:0,l:0,r:0};if(d.edge==='top')return{t:Math.min(90,pct(d.rect.h,d.H)+pad),b:0,l:0,r:0};if(d.edge==='bottom')return{t:0,b:Math.min(90,pct(d.rect.h,d.H)+pad),l:0,r:0};if(d.edge==='left')return{t:0,b:0,l:Math.min(90,pct(d.rect.w,d.W)+pad),r:0};return{t:0,b:0,l:0,r:Math.min(90,pct(d.rect.w,d.W)+pad)};}
// Chrysanthos: prep now cuts out the map area first (trim boxes), then makes the small analysis copy and the display copy like before
// Chrysanthos: for brightness maps (night lights) the small copy used for the numbers is now an exact average of all
// the pixels each cell covers. The browser's own shrinking skips pixels, so single bright spots decided the
// "highest value" (2012 came out as Korea or Texas, it's really Cairo) and some years even read as a drop that
// isn't in the data (2015). Colormap maps still use the browser, there averaging would mix colours into ones
// that aren't on the colorbar.
function areaDown(im,sx,sy,sw,sh,m){
 const s=Math.min(1,m/Math.max(sw,sh)),W=Math.max(1,Math.round(sw*s)),H=Math.max(1,Math.round(sh*s));
 const k=Math.min(1,8*Math.max(W,H)/Math.max(sw,sh)),iw=Math.max(W,Math.round(sw*k)),ih=Math.max(H,Math.round(sh*k)); // at most 8x8 source pixels per cell
 const c=document.createElement('canvas');c.width=iw;c.height=ih;const x=c.getContext('2d');x.drawImage(im,sx,sy,sw,sh,0,0,iw,ih);
 const src=x.getImageData(0,0,iw,ih).data,out=new Uint8ClampedArray(W*H*4);
 for(let j=0;j<H;j++){const y0=Math.floor(j*ih/H),y1=Math.max(y0+1,Math.floor((j+1)*ih/H));
  for(let i=0;i<W;i++){const x0=Math.floor(i*iw/W),x1=Math.max(x0+1,Math.floor((i+1)*iw/W));let r=0,g=0,b=0,a=0,n=0;
   for(let yy=y0;yy<y1;yy++)for(let xx=x0;xx<x1;xx++){const o=4*(yy*iw+xx);r+=src[o];g+=src[o+1];b+=src[o+2];a+=src[o+3];n++;}
   const o=4*(j*W+i);out[o]=r/n;out[o+1]=g/n;out[o+2]=b/n;out[o+3]=a/n;}}
 return{data:out,width:W,height:H};}
function prep(im,name,autoCrop){const k=S.crop,ac=autoCrop||{t:0,b:0,l:0,r:0},mix={t:Math.min(90,k.t+ac.t),b:Math.min(90,k.b+ac.b),l:Math.min(90,k.l+ac.l),r:Math.min(90,k.r+ac.r)},sx=im.width*mix.l/100,sy=im.height*mix.t/100,sw=Math.max(1,im.width*(1-(mix.l+mix.r)/100)),sh=Math.max(1,im.height*(1-(mix.t+mix.b)/100)),mk=m=>{const s=Math.min(1,m/Math.max(sw,sh)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(sw*s));c.height=Math.max(1,Math.round(sh*s));c.getContext('2d').drawImage(im,sx,sy,sw,sh,0,0,c.width,c.height);return c;},d=mk(720);let raw;if(S.gray)raw=areaDown(im,sx,sy,sw,sh,160);else{const a=mk(160);raw=a.getContext('2d').getImageData(0,0,a.width,a.height);}return{name:name.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' '),raw,disp:d};}
$('files').addEventListener('change',async e=>{const fl=[...e.target.files].sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));if(!fl.length)return;announce('Loading '+fl.length+' images.');const keep=new Set(uploaded.map(itemKey));const add=[];try{for(const f of fl){const id=fileKey(f);if(keep.has(id))continue;add.push({id,name:f.name,img:await loadImg(f)});keep.add(id);}}catch(err){announce('Could not read '+err.message+'. Please use PNG or JPEG images.');return;}if(!add.length){announce('Those images are already loaded.');e.target.value='';return;}
uploaded=[...uploaded,...add].sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));renderUploadList();sources=uploaded;mode='images';preset=null;const o=$('preset').querySelector('[value=upload]');o.disabled=false;$('preset').value='upload';$('intro').textContent='Your own images, '+uploaded.length+' frames.';fIdx=0;e.target.value='';rebuild();});

$('uploadList').addEventListener('click',e=>{const id=e.target&&e.target.dataset?e.target.dataset.remove:null;if(!id)return;uploaded=uploaded.filter(x=>itemKey(x)!==id);renderUploadList();if(!uploaded.length){sources=[];mode='images';pause();frames=[];draw();updStatus();announce('All uploaded frames were removed.');return;}if($('preset').value==='upload'){sources=uploaded;fIdx=0;rebuild();}});
$('clearUploads').addEventListener('click',()=>{if(!uploaded.length)return;uploaded=[];sources=[];renderUploadList();if($('preset').value==='upload'){pause();frames=[];draw();updStatus();announce('All uploaded frames were removed. Add images to begin.');}});

// Chrysanthos: load a ready-made map. Sets the colormap, range, units and extent for you, then plays like uploaded images.
async function usePreset(id){pause();
if(id==='demo'){setDemo();fIdx=0;rebuild('Demo with made-up data.');return;}
if(id==='upload'){if(!uploaded.length)return;preset=null;sources=uploaded;mode='images';$('intro').textContent='Your own images, '+uploaded.length+' frames.';fIdx=0;rebuild();return;}
const P=(window.EJ_PRESETS||{})[id];if(!P){announce('This map is missing, the file data/'+id+'.js was not found.');return;}
$('status').textContent='Loading '+P.title+'…';
let imgs;try{imgs=await Promise.all(P.frames.map(f=>loadURL(f.src,f.name)));}catch(err){announce('Could not load '+P.title+'.');return;}
$('cmap').value=P.cmap;$('vmin').value=P.vmin;$('vmax').value=P.vmax;$('units').value=P.units||'';
$('lat0').value=P.lat[0];$('lat1').value=P.lat[1];$('lon0').value=P.lon[0];$('lon1').value=P.lon[1];
['cropT','cropB','cropL','cropR'].forEach(k=>{$(k).value=0;});
preset=P;sources=P.frames.map((f,i)=>({name:f.name,img:imgs[i]}));mode='images';
$('intro').textContent=P.intro+' Source: '+P.source+'.';fIdx=0;rebuild(P.intro);}
$('preset').addEventListener('change',()=>usePreset($('preset').value));
$('view').addEventListener('change',()=>setView($('view').value));

// Chrysanthos: same idea as lut_from_colorbar() in image_describer.py. Average across the bar's thickness, then take 256 colours along it.
$('cbar').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;let im;try{im=await loadImg(f);}catch(err){announce('Could not read '+err.message+'.');return;}
const c=document.createElement('canvas'),s=Math.min(1,1024/Math.max(im.width,im.height));c.width=Math.max(1,Math.round(im.width*s));c.height=Math.max(1,Math.round(im.height*s));
const x=c.getContext('2d');x.drawImage(im,0,0,c.width,c.height);const d=x.getImageData(0,0,c.width,c.height).data,W=c.width,H=c.height,wide=W>=H,len=wide?W:H,th=wide?H:W,line=[];
for(let i=0;i<len;i++){let r=0,g=0,b=0;for(let j=0;j<th;j++){const o=4*(wide?j*W+i:i*W+j);r+=d[o];g+=d[o+1];b+=d[o+2];}line.push([r/th,g/th,b/th]);}
if(!wide)line.reverse(); // tall bar: bottom = minimum
manualCustomLut=true;makeCustomLutFromLine(line);$('cmap').value='custom';setDetectBadge('manual','using uploaded colorbar image.');setAutoStatus('Using uploaded colorbar image.');rebuild('Colorbar loaded, now set the minimum and maximum printed on it.');});

// Chrysanthos: picking "brightness only" by hand resets the range to 0..1 (presets set their own). Has to be added before the rebuild listener below.
$('cmap').addEventListener('change',()=>{if($('cmap').value==='gray'){$('vmin').value=0;$('vmax').value=1;}if($('cmap').value!=='custom')manualCustomLut=false;});
['cmap','vmin','vmax','units','tol','lat0','lat1','lon0','lon1','cropT','cropB','cropL','cropR','autoColorbar'].forEach(id=>$(id).addEventListener('change',rebuild));
$('play').onclick=toggle;$('prev').onclick=()=>step(-1);$('next').onclick=()=>step(1);$('replay').onclick=replay;$('desc').onclick=describeNow;$('leg').onclick=()=>say(legendText());
$('vol').addEventListener('input',()=>{if(master)master.gain.value=+$('vol').value;});
document.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey)return;const t=e.target.tagName;if(t==='INPUT'||t==='SELECT'||t==='TEXTAREA')return;const k=e.key.toLowerCase();
if(k===' '){if(t==='BUTTON'||t==='SUMMARY'||t==='A')return;e.preventDefault();toggle();}
else if(k==='arrowright'||k==='n'){e.preventDefault();step(1);}else if(k==='arrowleft'||k==='p'){e.preventDefault();step(-1);}
else if(k==='r')replay();else if(k==='d')describeNow();else if(k==='l')say(legendText());else if(k==='c')setView(view==='change'?'frames':'change');});
// Chrysanthos: light theme switch. The page is dark ("space") by default, some low-vision users read better on light.
function setTheme(light){const r=document.documentElement;if(r&&r.setAttribute){if(light)r.setAttribute('data-theme','light');else r.removeAttribute('data-theme');}$('themeBtn').setAttribute('aria-pressed',light?'true':'false');try{localStorage.setItem('ej-theme',light?'light':'dark');}catch(_e){}}
$('themeBtn').addEventListener('click',()=>setTheme(!(document.documentElement&&document.documentElement.getAttribute('data-theme')==='light')));
try{if(localStorage.getItem('ej-theme')==='light')setTheme(true);}catch(_e){}
setDemo();S=readS();frames=demoFrames();draw();updStatus();
renderUploadList();
setDetectBadge('off','waiting for images.');
setAutoStatus('Auto colorbar detection is idle.');
// Chrysanthos: open on the real NASA night lights if the data file is there, otherwise stay on the demo like before
if(window.EJ_PRESETS&&window.EJ_PRESETS.nightlights){$('preset').value='nightlights';usePreset('nightlights').finally(()=>{booting=false;});}
else{$('preset').querySelector('[value=nightlights]').disabled=true;$('preset').value='demo';booting=false;}
