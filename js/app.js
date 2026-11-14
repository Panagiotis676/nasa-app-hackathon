// Earth Jukebox web app: reads map frames, turns them into sound and speech.
// Chrysanthos: moved here from the <script> block in index.html so HTML, CSS and JS are in separate files.
const $=id=>document.getElementById(id),cl=v=>Math.max(0,Math.min(1,v));
const HEX={diverging:['#2166ac','#67a9cf','#f7f7f7','#ef8a62','#b2182b'],viridis:['#440154','#3b528b','#21918c','#5ec962','#fde725'],inferno:['#000004','#420a68','#932667','#dd513a','#fca50a','#fcffa4'],plasma:['#0d0887','#7e03a8','#cc4778','#f89540','#f0f921'],jet:['#00007f','#0000ff','#00ffff','#ffff00','#ff0000','#7f0000']};
let S,frames=[],uploaded=[],mode='demo',fIdx=0,pos=0,playing=false,timer,last,ac,master,pan,voices=[];
// Chrysanthos: sources = the {name, img} list being played (a preset or your uploads), customLut = colours from an uploaded colorbar,
// preset = the NASA preset in use (or null), booting = stay quiet while the page first loads
let sources=[],customLut=null,preset=null,booting=true;
let manualCustomLut=false,autoBarState=null;
let audioMutex='none'; // none | sonify | describe
let describeUtterance=null;
const isDescribeSpeaking=()=>('speechSynthesis' in window)&&(audioMutex==='describe'||speechSynthesis.speaking||speechSynthesis.pending);
function pauseSonifyOnly(){playing=false;clearInterval(timer);if(ac)voices.forEach(g=>g.gain.setTargetAtTime(0,ac.currentTime,.05));$('play').textContent='Play';if(audioMutex==='sonify')audioMutex='none';}
function lutFor(n){if(n==='gray')return null;if(n==='custom')return customLut;const s=HEX[n].map(h=>[1,3,5].map(i=>parseInt(h.substr(i,2),16))),L=[];for(let i=0;i<256;i++){const p=i/255*(s.length-1),k=Math.min(Math.floor(p),s.length-2),f=p-k;L.push([0,1,2].map(c=>s[k][c]+(s[k+1][c]-s[k][c])*f));}return L;}
// Chrysanthos: brightness mode now uses the min/max boxes too. It was stuck on 0..1, and dim maps like night lights came out almost silent.
// Also reads the trim boxes (crop).
function readS(){const c=$('cmap').value,g=c==='gray',tr=id=>Math.max(0,Math.min(90,+$(id).value||0));return{gray:g,lut:lutFor(c),vmin:+$('vmin').value,vmax:+$('vmax').value,units:$('units').value.trim()||(g?'brightness':''),tol:+$('tol').value||50,lat0:+$('lat0').value,lat1:+$('lat1').value,lon0:+$('lon0').value,lon1:+$('lon1').value,autoColorbar:$('autoColorbar').checked,crop:{t:tr('cropT'),b:tr('cropB'),l:tr('cropL'),r:tr('cropR')}};}
const u=()=>S.units?' '+S.units:'';
// Chrysanthos: decimals depend on the value range. With a fixed 2 decimals the night lights (avg ~0.004) all read as "0.00"
const fmt=n=>n.toFixed(Math.max(0,Math.min(6,2-Math.floor(Math.log10(Math.abs(S.vmax-S.vmin)||1)))));
// Chrysanthos: for data that can't go below zero (brightness, CO2...) "up 35 percent" is much easier to follow than a raw number
const pct=(d,base)=>{if(!(S.vmin>=0&&base>0))return'';const p=Math.abs(100*d/base);return' ('+(d>=0?'up ':'down ')+(p<10?p.toFixed(1):Math.round(p))+' percent)';};
function announce(t,isDescribe=false){
  if(booting)return;
  if($('speech').checked&&'speechSynthesis' in window){
    if(isDescribe&&audioMutex==='sonify')pauseSonifyOnly();
    if(isDescribe)audioMutex='describe';
    if(!isDescribe&&audioMutex==='sonify'){$('live').textContent='';setTimeout(()=>{$('live').textContent=t},60);return;}
    speechSynthesis.cancel();
    const m=new SpeechSynthesisUtterance(t);m.lang='en';
    if(isDescribe){
      describeUtterance=m;
      m.onend=()=>{if(describeUtterance===m){describeUtterance=null;if(audioMutex==='describe')audioMutex='none';}};
      m.onerror=()=>{if(describeUtterance===m){describeUtterance=null;if(audioMutex==='describe')audioMutex='none';}};
    }
    speechSynthesis.speak(m);
  }else{$('live').textContent='';setTimeout(()=>{$('live').textContent=t},60);}
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
function describe(f,i){const s=f.st;if(!s.n)return'Frame '+(i+1)+': no readable data. Check the colormap, range and tolerance.';const x=s.mi%f.W,y=Math.floor(s.mi/f.W),la=S.lat1-y/Math.max(f.H-1,1)*(S.lat1-S.lat0),lo=S.lon0+x/Math.max(f.W-1,1)*(S.lon1-S.lon0),q=fmt;
let t='Frame '+(i+1)+' of '+frames.length+', '+f.name+'. Data covers '+Math.round(100*s.n/(f.W*f.H))+' percent of the map. The average is '+q(s.mean)+u()+', ranging from '+q(s.mn)+' to '+q(s.mx)+u()+'. The highest value is near '+Math.abs(la).toFixed(0)+' degrees '+(la>=0?'north':'south')+', '+Math.abs(lo).toFixed(0)+' degrees '+(lo>=0?'east':'west')+'. The northern half averages '+q(s.north)+u()+' and the southern half '+q(s.south)+u()+'.';
const p=frames[i-1];if(p&&p.st.n)t+=' Compared with the previous frame, the average changed by '+(s.mean-p.st.mean>=0?'plus ':'minus ')+q(Math.abs(s.mean-p.st.mean))+u()+pct(s.mean-p.st.mean,p.st.mean)+'.';
// Chrysanthos: the big picture too, change since the first frame (e.g. 2012 to 2023)
const f0=frames[0];if(i>1&&f0.st.n)t+=' Since the first frame, '+f0.name+', it changed by '+(s.mean-f0.st.mean>=0?'plus ':'minus ')+q(Math.abs(s.mean-f0.st.mean))+u()+pct(s.mean-f0.st.mean,f0.st.mean)+'.';return t;}
const legendText=()=>'Listening guide. The sound sweeps from the west edge of the map in your left ear to the east edge in your right ear. Higher pitch means further north and lower pitch further south. '+(preset&&preset.loudness?preset.loudness:'Louder means a higher value, from silence at '+S.vmin+u()+' or no data, up to full volume at '+S.vmax+u()+'.')+' When a new frame starts, a rising two-note chime means the average went up and a falling chime means it went down.';
function draw(){const f=frames[fIdx];if(!f)return;const c=$('cv'),x=c.getContext('2d');if(c.width!==f.disp.width||c.height!==f.disp.height){c.width=f.disp.width;c.height=f.disp.height;}x.drawImage(f.disp,0,0);const px=pos*c.width,w=Math.max(3,c.width/120);x.fillStyle='#000';x.fillRect(px-w,0,2*w,c.height);x.fillStyle='#ffe600';x.fillRect(px-w/2,0,w,c.height);}
const updStatus=()=>{$('status').textContent=frames.length?'Frame '+(fIdx+1)+' of '+frames.length+': '+frames[fIdx].name:'No frames loaded.';};
const hz=i=>440*2**((48+12*Math.floor(i/5)+[0,2,4,7,9][i%5]-69)/12);
function initAudio(){if(ac)return;ac=new(window.AudioContext||window.webkitAudioContext)();master=ac.createGain();master.gain.value=+$('vol').value;const comp=ac.createDynamicsCompressor(),bus=ac.createGain();pan=ac.createStereoPanner?ac.createStereoPanner():null;if(pan){bus.connect(pan);pan.connect(comp);}else bus.connect(comp);comp.connect(master);master.connect(ac.destination);
for(let b=0;b<12;b++){const f=hz(11-b),g=ac.createGain(),g2=ac.createGain(),o1=ac.createOscillator(),o2=ac.createOscillator();g.gain.value=0;g2.gain.value=.3;o1.frequency.value=f;o2.frequency.value=2*f;o1.connect(g);o2.connect(g2);g2.connect(g);g.connect(bus);o1.start();o2.start();voices.push(g);}}
function chime(dir){const sq=dir==='up'?[660,880]:dir==='down'?[880,660]:[770];sq.forEach((fr,k)=>{const o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime+k*.18;o.type='triangle';o.frequency.value=fr;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.25,t+.02);g.gain.exponentialRampToValueAtTime(.001,t+.3);o.connect(master);g.connect(master);o.disconnect();o.connect(g);o.start(t);o.stop(t+.32);});}
function goTo(i){fIdx=i;pos=0;const f=frames[i],p=frames[i-1];let m='Frame '+(i+1)+' of '+frames.length+', '+f.name+'.',dir=null;if(p&&p.st.n&&f.st.n){
// Chrysanthos: for data that can't go negative the threshold is now 1% of the previous average, not 1% of the whole range.
// Night lights grow ~2-6% a year, which used to always come out as "about the same" with a flat chime.
const d=f.st.mean-p.st.mean,th=S.vmin>=0&&p.st.mean>0?p.st.mean*.01:(S.vmax-S.vmin)*.01;dir=d>th?'up':d<-th?'down':'same';m+=' Average '+(dir==='same'?'about the same':dir+' '+fmt(Math.abs(d))+u()+pct(d,p.st.mean))+'.';}if(playing&&dir)chime(dir);announce(m);draw();updStatus();}
function tick(){const now=performance.now();pos+=(now-last)/1000/(+$('speed').value);last=now;
if(pos>=1){if(fIdx<frames.length-1)goTo(fIdx+1);else if($('loop').checked)goTo(0);else{pause();pos=1;draw();announce('End of frames.');return;}}
const f=frames[fIdx],col=Math.min(f.W-1,Math.floor(pos*f.W)),t=ac.currentTime;for(let b=0;b<12;b++)voices[b].gain.setTargetAtTime(Math.pow(f.B[b*f.W+col],1.5)*.07,t,.04);if(pan)pan.pan.setTargetAtTime(pos*2-1,t,.04);draw();}
async function play(){
  if(!frames.length){announce('Add frames first.');return;}
  if(isDescribeSpeaking()){$('live').textContent='Description is speaking. Sonification is blocked until it finishes.';return;}
  audioMutex='sonify';
  initAudio();
  try{await ac.resume();}catch(_err){if(audioMutex==='sonify')audioMutex='none';return;}
  if(pos>=1)pos=0;playing=true;last=performance.now();clearInterval(timer);timer=setInterval(tick,30);$('play').textContent='Pause';
}
// Chrysanthos: Pause now stops the voice too, not only the music. Before, it kept talking until the sentence was finished.
function pause(){playing=false;clearInterval(timer);if(ac)voices.forEach(g=>g.gain.setTargetAtTime(0,ac.currentTime,.05));if('speechSynthesis' in window)speechSynthesis.cancel();describeUtterance=null;if(audioMutex!=='none')audioMutex='none';$('live').textContent='';$('play').textContent='Play';}
const toggle=()=>playing?pause():play();
function step(d){const i=fIdx+d;if(i<0||i>=frames.length){announce(d>0?'This is the last frame.':'This is the first frame.');return;}goTo(i);}
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
fIdx=Math.min(fIdx,Math.max(0,frames.length-1));pos=0;draw();updStatus();if(!frames.length){announce('Add images to begin.');return;}
const cov=frames.reduce((a,f)=>a+f.st.n/(f.W*f.H),0)/frames.length;announce(pre+(cov<.05?'Loaded '+frames.length+' frames, but very few pixels matched the colormap. Check the colormap, range and tolerance.':'Loaded '+frames.length+' frames. Press Play to listen.'));}
function setDemo(){$('cmap').value='diverging';$('vmin').value=-3;$('vmax').value=3;$('units').value='°C anomaly';mode='demo';preset=null;$('intro').textContent='Made-up data, not from NASA: six months of a pretend ocean temperature anomaly, with a warm patch in the Pacific that grows and then fades.';}
const loadImg=f=>new Promise((ok,no)=>{const url=URL.createObjectURL(f),i=new Image();i.onload=()=>{URL.revokeObjectURL(url);ok(i);};i.onerror=()=>no(new Error(f.name));i.src=url;});
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
function prep(im,name,autoCrop){const k=S.crop,ac=autoCrop||{t:0,b:0,l:0,r:0},mix={t:Math.min(90,k.t+ac.t),b:Math.min(90,k.b+ac.b),l:Math.min(90,k.l+ac.l),r:Math.min(90,k.r+ac.r)},sx=im.width*mix.l/100,sy=im.height*mix.t/100,sw=Math.max(1,im.width*(1-(mix.l+mix.r)/100)),sh=Math.max(1,im.height*(1-(mix.t+mix.b)/100)),mk=m=>{const s=Math.min(1,m/Math.max(sw,sh)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(sw*s));c.height=Math.max(1,Math.round(sh*s));c.getContext('2d').drawImage(im,sx,sy,sw,sh,0,0,c.width,c.height);return c;},a=mk(160),d=mk(720);return{name:name.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' '),raw:a.getContext('2d').getImageData(0,0,a.width,a.height),disp:d};}
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
else if(k==='r')replay();else if(k==='d')describeNow();else if(k==='l')say(legendText());});
setDemo();S=readS();frames=demoFrames();draw();updStatus();
renderUploadList();
setDetectBadge('off','waiting for images.');
setAutoStatus('Auto colorbar detection is idle.');
// Chrysanthos: open on the real NASA night lights if the data file is there, otherwise stay on the demo like before
if(window.EJ_PRESETS&&window.EJ_PRESETS.nightlights){$('preset').value='nightlights';usePreset('nightlights').finally(()=>{booting=false;});}
else{$('preset').querySelector('[value=nightlights]').disabled=true;$('preset').value='demo';booting=false;}
