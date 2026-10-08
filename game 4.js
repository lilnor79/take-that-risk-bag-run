(()=>{'use strict';
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d');
const W=360,H=650,exit={x:155,y:8,w:50,h:30};let scale=1,ox=0,oy=0;
function resize(){const r=canvas.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d);scale=Math.min(canvas.width/W,canvas.height/H);ox=(canvas.width-W*scale)/2;oy=(canvas.height-H*scale)/2}addEventListener('resize',resize);resize();
const views=['start','decision','end','leader','celebrate'];let phase='start',level=1,cash=0,score=0,hasRisked=false,points=[],guards=[],walls=[],player={x:180,y:575},target=null,elapsed=0,last=0,backTo='start',submitted=false,invincible=0,detected=0,confetti=[],celebrateTime=0;
const fmt=n=>'$'+Math.floor(n).toLocaleString('en-US');
const GAME_BUILD='SETTINGS-AND-PACE-V9';
const tiers=['SUPER EASY','EASY','MEDIUM','KINDA HARD','HARD','SUPER HARD','PRO','ADVANCED','EXPERT','ELITE','MASTER','LEGENDARY','NIGHTMARE','IMPOSSIBLE'];
function difficulty(n){return tiers[Math.min(tiers.length-1,Math.floor((n-1)/2))]}

const shapes=[
// Each level has its own obstacles and cash pattern; the five designs repeat with scaling difficulty.
{walls:[{x:32,y:155,w:115,h:16},{x:213,y:155,w:115,h:16},{x:32,y:350,w:115,h:16},{x:213,y:350,w:115,h:16}],spots:[[64,95],[180,105],[296,95],[88,255],[272,255],[65,450],[180,460],[295,450],[180,570]],guards:[[88,230],[270,390]]},
{walls:[{x:35,y:155,w:16,h:155},{x:309,y:155,w:16,h:155},{x:95,y:340,w:170,h:17},{x:70,y:465,w:100,h:16},{x:210,y:465,w:80,h:16}],spots:[[90,95],[270,100],[180,200],[100,275],[255,275],[180,390],[85,545],[275,545],[180,585]],guards:[[180,265],[85,410],[275,410]]},
{walls:[{x:35,y:185,w:180,h:16},{x:260,y:185,w:65,h:16},{x:145,y:305,w:180,h:16},{x:35,y:420,w:180,h:16},{x:260,y:420,w:65,h:16}],spots:[[80,85],[285,90],[285,255],[80,265],[180,375],[280,365],[85,480],[275,500],[180,575]],guards:[[245,120],[85,345],[245,490]]},
{walls:[{x:65,y:130,w:16,h:190},{x:279,y:130,w:16,h:190},{x:125,y:240,w:110,h:16},{x:65,y:430,w:230,h:16}],spots:[[180,85],[105,95],[260,95],[110,200],[250,200],[180,350],[90,390],[270,390],[95,535],[265,535]],guards:[[180,190],[110,350],[250,350]]},
{walls:[{x:32,y:150,w:95,h:17},{x:233,y:150,w:95,h:17},{x:140,y:235,w:80,h:17},{x:32,y:320,w:95,h:17},{x:233,y:320,w:95,h:17},{x:140,y:410,w:80,h:17},{x:32,y:500,w:95,h:17},{x:233,y:500,w:95,h:17}],spots:[[75,95],[180,90],[285,95],[90,205],[270,205],[180,285],[90,380],[270,380],[180,475],[85,570],[275,570]],guards:[[85,255],[270,285],[180,365],[180,540]]}
];
function screen(id){views.forEach(v=>$(v).classList.toggle('hidden',v!==id));$('hud').classList.toggle('hidden',id!=='');$('banner').classList.toggle('hidden',id!=='')}
function gameplay(){views.forEach(v=>$(v).classList.add('hidden'));$('hud').classList.remove('hidden');$('banner').classList.remove('hidden')}
function collision(x,y){return walls.some(w=>x+10>w.x&&x-10<w.x+w.w&&y+10>w.y&&y-10<w.y+w.h)}
function setLevel(){const template=shapes[(level-1)%5];const flip=Math.floor((level-1)/5)%2===1;const mirror=x=>flip?W-x:x;walls=[{x:0,y:0,w:12,h:H},{x:348,y:0,w:12,h:H},{x:0,y:0,w:155,h:12},{x:205,y:0,w:155,h:12},{x:0,y:638,w:360,h:12},...template.walls.map(w=>({...w,x:flip?W-w.x-w.w:w.x}))];player={x:180,y:575};target=null;elapsed=0;invincible=.9;detected=0;
const multiplier=1+Math.floor((level-1)/5)*.45;
// Shorter rounds: 5-6 stacks, spread across the map instead of 8-11.
const stackCount=level<=2?5:6;
const selected=Array.from({length:stackCount},(_,i)=>template.spots[Math.round(i*(template.spots.length-1)/(stackCount-1))]);
points=selected.map((p,i)=>({x:mirror(p[0]),y:p[1],taken:false,value:Math.floor((1800+level*520)*(1+i%3)*multiplier/100)*100}));
guards=template.guards.map((p,i)=>({x:mirror(p[0]),y:p[1],baseX:mirror(p[0]),baseY:p[1],dir:i*2.1,phase:i*2.5,speed:.82+Math.min(3.2,level*.16),range:Math.min(68,33+level*2.1)}));
// More guards in later loops, but preserve readable routes and a safe spawn.
if(level>3)guards.push({x:180,y:175,baseX:180,baseY:175,dir:0,phase:1.1,speed:.6+Math.min(2.6,level*.05),range:36});
if(level>8)guards.push({x:180,y:520,baseX:180,baseY:520,dir:1,phase:2.4,speed:.7+Math.min(2.5,level*.04),range:52});
if(level>15)guards.push({x:180,y:330,baseX:180,baseY:330,dir:2,phase:4.1,speed:.8+Math.min(2.5,level*.04),range:55});
$('level').textContent='STAGE '+level+' · '+difficulty(level);updateHud()}
function detectionLimit(){return Math.max(1.0,3.5-(level-1)*.28)}
function updateHud(){const remaining=points.filter(p=>!p.taken).length;$('cash').textContent=fmt(cash);$('remaining').textContent=remaining+' STACKS LEFT';$('status').textContent=remaining?'EXIT LOCKED':'EXIT OPEN';$('status').style.color=remaining?'#ff8888':'#b8ffb8';$('banner').textContent='';$('timer').textContent=detected>0?'🚨 SPOTTED '+Math.max(0,detectionLimit()-detected).toFixed(1)+'s':'⏱ ESCAPE TIME '+detectionLimit().toFixed(1)+'s';$('timer').style.color=detected>0?'#ff5757':'#c7c7c7'}
function celebrate(){phase='celebrate';target=null;celebrateTime=0;confetti=Array.from({length:85},(_,i)=>({x:Math.random()*W,y:-Math.random()*H*.7,vx:(Math.random()-.5)*80,vy:70+Math.random()*160,spin:Math.random()*6.28,vr:(Math.random()-.5)*7}));$('celebrateCash').textContent=fmt(cash);$('celebrateStage').textContent='STAGE '+level+' COMPLETE';$('celebrateNext').textContent='NEXT: STAGE '+(level+1)+' · '+difficulty(level+1);screen('celebrate')}
function nextStage(){level++;setLevel();phase='playing';gameplay()}
function begin(){const audio=$('soundtrack');audio.currentTime=0;cash=0;level=1;score=0;submitted=false;hasRisked=false;phase='playing';setLevel();gameplay();startMusic()}
function caught(){if(phase!=='playing'||invincible>0)return;target=null;if(!hasRisked){phase='decision';$('atStake').textContent=fmt(cash);screen('decision')}else{cash=0;finish(false)}}
function finish(bank){pauseMusic();phase='end';score=bank?cash:0;submitted=false;$('endLabel').textContent=bank?'BAG SECURED':'BUSTED';$('endTitle').textContent=bank?'YOU TOOK THAT RISK':'YOU LOST THE BAG';$('finalCash').textContent=fmt(score);const best=Number(localStorage.getItem('bag_best')||0);if(score>best)localStorage.setItem('bag_best',String(score));$('best').textContent='PERSONAL BEST: '+fmt(Math.max(score,best))+' · LEVEL '+level;$('notice').textContent=score?'Enter a name to share your score.':'You lost the bag. Play again to post a score.';$('submit').disabled=score===0;$('submit').textContent='POST SCORE TO LEADERBOARD';$('username').value=localStorage.getItem('bag_name')||'';screen('end')}
function riskAgain(){hasRisked=true;phase='playing';invincible=2;elapsed=0;player={x:180,y:575};target=null;points.forEach(p=>p.taken=false);guards.forEach(g=>g.speed*=1.17);updateHud();gameplay();startMusic()}
function update(dt){if(phase!=='playing')return;elapsed+=dt;invincible=Math.max(0,invincible-dt);const speed=140*movementMultiplier*Math.max(.79,1-cash/950000);if(target){const dx=target.x-player.x,dy=target.y-player.y,d=Math.hypot(dx,dy);if(d>4){const step=Math.min(d,speed*dt),nx=player.x+dx/d*step,ny=player.y+dy/d*step;if(!collision(nx,player.y))player.x=nx;if(!collision(player.x,ny))player.y=ny}}let changed=false;for(const p of points){if(!p.taken&&Math.hypot(player.x-p.x,player.y-p.y)<21){p.taken=true;cash+=p.value;changed=true}}if(changed)updateHud();if(points.every(p=>p.taken)&&player.y<43&&Math.abs(player.x-180)<28){celebrate();return}
let seen=false;
for(const g of guards){g.dir=elapsed*g.speed+g.phase;g.x=g.baseX+Math.sin(elapsed*g.speed+g.phase)*g.range;g.y=g.baseY+Math.cos(elapsed*g.speed*.65+g.phase)*12;const dx=player.x-g.x,dy=player.y-g.y,dist=Math.hypot(dx,dy),diff=Math.atan2(Math.sin(Math.atan2(dy,dx)-g.dir),Math.cos(Math.atan2(dy,dx)-g.dir));if(dist<19||(dist<76&&Math.abs(diff)<.45))seen=true}
if(invincible<=0&&seen){detected+=dt;if(detected>=detectionLimit()){detected=0;caught();return}}else detected=0;
updateHud()}

function drawPlayer(){ctx.save();ctx.translate(player.x,player.y);if(invincible>0&&Math.floor(elapsed*12)%2)ctx.globalAlpha=.6;
// Readable top-down silhouette: knit beanie, dark camo puffer, baggy cargos, patterned duffel.
ctx.fillStyle='#060606';ctx.fillRect(-9,8,8,16);ctx.fillRect(2,8,8,16);ctx.fillStyle='#292929';ctx.fillRect(-11,17,11,9);ctx.fillRect(2,17,11,9);
ctx.fillStyle='#090909';ctx.beginPath();ctx.ellipse(0,0,14,17,0,0,7);ctx.fill();ctx.fillStyle='#383838';ctx.beginPath();ctx.ellipse(0,0,11,13,0,0,7);ctx.fill();ctx.strokeStyle='#555';ctx.lineWidth=2;for(const [x,y] of [[-6,-8],[5,-7],[-5,4],[6,7]]){ctx.beginPath();ctx.moveTo(x-3,y);ctx.lineTo(x+3,y+3);ctx.stroke()}
ctx.fillStyle='#080808';ctx.beginPath();ctx.arc(0,-13,10,0,7);ctx.fill();ctx.fillRect(-10,-20,20,7);ctx.strokeStyle='#444';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-8,-17);ctx.lineTo(8,-17);ctx.stroke();
ctx.fillStyle='#090909';ctx.fillRect(-18,-6,7,16);ctx.fillRect(11,-6,7,16);
const b=13+Math.min(9,cash/55000);ctx.fillStyle='#050505';ctx.fillRect(17,-2,b,19);ctx.strokeStyle='#777';ctx.lineWidth=1;ctx.strokeRect(17,-2,b,19);for(let i=20;i<17+b;i+=6){ctx.beginPath();ctx.moveTo(i,2);ctx.lineTo(i+3,6);ctx.stroke()}ctx.fillStyle='#f1f1f1';ctx.font='bold 11px Arial';ctx.textAlign='center';ctx.fillText('!',17+b/2,11);ctx.restore()}
function draw(){ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#090909';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.setTransform(scale,0,0,scale,ox,oy);ctx.fillStyle='#181818';ctx.fillRect(0,0,W,H);ctx.strokeStyle='#252525';ctx.lineWidth=1;for(let x=0;x<W;x+=30){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}for(let y=0;y<H;y+=30){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
ctx.fillStyle='#454545';walls.forEach(w=>ctx.fillRect(w.x,w.y,w.w,w.h));const open=points.length&&points.every(p=>p.taken);ctx.fillStyle=open?'#c7ffcb':'#b33333';ctx.fillRect(exit.x,exit.y,exit.w,exit.h);ctx.fillStyle=open?'#121212':'white';ctx.font='bold 10px Arial';ctx.textAlign='center';ctx.fillText(open?'EXIT':'LOCKED',180,27);if(!open){ctx.strokeStyle='#fff';ctx.lineWidth=2;for(let i=160;i<205;i+=12){ctx.beginPath();ctx.moveTo(i,9);ctx.lineTo(i,34);ctx.stroke()}}
for(const p of points){if(p.taken)continue;
// Bundled banknotes, with stacked paper edges, green ink, and blue $100 security band.
ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle='#617663';ctx.fillRect(-13,-5,27,16);ctx.fillStyle='#d3dfc3';ctx.fillRect(-14,-9,27,15);ctx.strokeStyle='#46664d';ctx.lineWidth=1;ctx.strokeRect(-12,-7,23,11);ctx.fillStyle='#729779';ctx.fillRect(-9,-5,17,7);ctx.fillStyle='#e1ead7';ctx.font='bold 7px Arial';ctx.textAlign='center';ctx.fillText('$100',0,1);ctx.fillStyle='#4785ba';ctx.fillRect(4,-9,4,15);ctx.fillStyle='#f0f2dc';ctx.fillRect(-13,6,26,2);ctx.fillStyle='#859b79';ctx.fillRect(-13,9,26,2);ctx.restore()}
for(const g of guards){
// Patrol beam is independent of the guard sprite: a visible human-shaped officer at its origin.
ctx.beginPath();ctx.moveTo(g.x,g.y);ctx.arc(g.x,g.y,76,g.dir-.45,g.dir+.45);ctx.closePath();ctx.fillStyle='rgba(232,43,48,.27)';ctx.fill();
ctx.save();ctx.translate(g.x,g.y);ctx.rotate(g.dir+Math.PI/2);
// Drop shadow and two separate boots.
ctx.fillStyle='rgba(0,0,0,.65)';ctx.beginPath();ctx.ellipse(0,4,22,27,0,0,Math.PI*2);ctx.fill();
ctx.fillStyle='#080b10';ctx.fillRect(-12,13,10,14);ctx.fillRect(3,13,10,14);
ctx.fillStyle='#56616d';ctx.fillRect(-11,12,9,8);ctx.fillRect(3,12,9,8);
// Broad shoulders, two arms and dark navy uniform body.
ctx.fillStyle='#0d1825';ctx.fillRect(-19,-13,11,26);ctx.fillRect(8,-13,11,26);
ctx.fillStyle='#b6a18c';ctx.fillRect(-18,9,8,7);ctx.fillRect(10,9,8,7);
ctx.fillStyle='#263d56';ctx.beginPath();ctx.roundRect(-13,-15,26,32,5);ctx.fill();
ctx.fillStyle='#101e30';ctx.fillRect(-12,-1,24,5);
ctx.fillStyle='#d6ad48';ctx.fillRect(5,-10,5,7);
ctx.fillStyle='#e6edf2';ctx.font='bold 6px Arial';ctx.textAlign='center';ctx.fillText('SEC',-3,4);
// Head and unmistakable peaked security cap.
ctx.fillStyle='#bca48e';ctx.beginPath();ctx.arc(0,-18,10,0,Math.PI*2);ctx.fill();
ctx.fillStyle='#101b2b';ctx.fillRect(-12,-28,24,8);
ctx.fillStyle='#334d69';ctx.fillRect(-13,-23,26,5);
ctx.fillStyle='#f1cf64';ctx.fillRect(-3,-26,6,3);
// Flashlight held in right hand.
ctx.fillStyle='#d5dde7';ctx.fillRect(17,-10,6,16);
ctx.fillStyle='#f8e8b1';ctx.fillRect(16,-13,8,4);
ctx.restore();}
if(detected>0){ctx.fillStyle='#ff3c3c';ctx.font='bold 15px Arial';ctx.textAlign='center';ctx.fillText('🚨 '+Math.max(0,detectionLimit()-detected).toFixed(1)+'s',player.x,player.y-35)}
drawPlayer()}
function frame(t){const dt=Math.min(.04,(t-last)/1000||0);last=t;update(dt);draw();if(phase==='celebrate'){celebrateTime+=dt;ctx.save();ctx.setTransform(scale,0,0,scale,ox,oy);for(const p of confetti){p.x+=p.vx*dt;p.y+=p.vy*dt;p.spin+=p.vr*dt;if(p.y>H+20)p.y=-30;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.spin);ctx.fillStyle='#b8d9b4';ctx.fillRect(-12,-6,24,12);ctx.strokeStyle='#285b36';ctx.strokeRect(-10,-4,20,8);ctx.fillStyle='#1b5931';ctx.font='bold 7px Arial';ctx.textAlign='center';ctx.fillText('$100',0,2);ctx.restore()}ctx.restore()}requestAnimationFrame(frame)}requestAnimationFrame(frame);
function pointer(e){const r=canvas.getBoundingClientRect();return{x:((e.clientX-r.left)*canvas.width/r.width-ox)/scale,y:((e.clientY-r.top)*canvas.height/r.height-oy)/scale}}
canvas.addEventListener('pointerdown',e=>{if(phase==='playing'){target=pointer(e);canvas.setPointerCapture(e.pointerId)}});canvas.addEventListener('pointermove',e=>{if(phase==='playing'&&(e.buttons||e.pressure>0))target=pointer(e)});canvas.addEventListener('pointerup',()=>target=null);canvas.addEventListener('pointercancel',()=>target=null);
// Settings panel: movement speed and existing audio controls live together.
let movementMultiplier=Number(localStorage.getItem('bag_movement_speed')||'1');
if(!Number.isFinite(movementMultiplier))movementMultiplier=1;
movementMultiplier=Math.max(.6,Math.min(1.8,movementMultiplier));
const settingsStyle=document.createElement('style');
settingsStyle.textContent=`
#bagSettingsButton{position:absolute;left:14px;bottom:calc(22px + env(safe-area-inset-bottom));z-index:10020;width:43px;height:43px;border:1px solid #666;border-radius:50%;background:#171717;color:#fff;font-size:23px;cursor:pointer;box-shadow:0 2px 9px #0008}
#bagSettingsBackdrop{position:absolute;inset:0;z-index:10019;background:#000b;display:none;align-items:center;justify-content:center;padding:18px;box-sizing:border-box}
#bagSettingsBackdrop.open{display:flex}
#bagSettingsPanel{width:min(370px,100%);max-height:85vh;overflow:auto;background:#151515;border:1px solid #666;border-radius:18px;color:#fff;padding:22px;box-sizing:border-box;font-family:Arial,sans-serif;box-shadow:0 12px 45px #000}
#bagSettingsPanel h2{margin:0 0 18px;font-size:23px}
#bagSettingsPanel .bagSettingLabel{display:flex;justify-content:space-between;margin:16px 0 10px;font-size:15px}
#bagSettingsPanel input[type=range]{width:100%;accent-color:#cfcfcf}
#bagSettingsAudio{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:10px}
#bagSettingsAudio button{font-size:20px;padding:8px 12px;border-radius:10px;background:#333;color:white;border:1px solid #777}
#bagSettingsAudio #musicVolume{flex:1;min-width:100px}
#bagSettingsClose{width:100%;margin-top:22px;padding:12px;border-radius:11px;border:0;background:#f0f0f0;color:#111;font-weight:bold;font-size:16px}
`;
document.head.appendChild(settingsStyle);
const settingsButton=document.createElement('button');settingsButton.id='bagSettingsButton';settingsButton.type='button';settingsButton.textContent='⚙';settingsButton.setAttribute('aria-label','Open settings');
const settingsBackdrop=document.createElement('div');settingsBackdrop.id='bagSettingsBackdrop';
settingsBackdrop.innerHTML='<div id="bagSettingsPanel" role="dialog" aria-modal="true" aria-label="Game settings"><h2>⚙ SETTINGS</h2><div class="bagSettingLabel"><span>Movement Speed</span><strong id="bagSpeedPct"></strong></div><input id="bagSpeed" aria-label="Movement speed" type="range" min="60" max="240" step="5"><div class="bagSettingLabel"><span>Music Volume</span></div><div id="bagSettingsAudio"></div><button type="button" id="bagSettingsClose">BACK TO GAME</button></div>';
$('app').append(settingsButton,settingsBackdrop);
const speedControl=$('bagSpeed'),speedPct=$('bagSpeedPct');
function syncSpeed(){speedControl.value=String(Math.round(movementMultiplier*100));speedPct.textContent=Math.round(movementMultiplier*100)+'%'}
speedControl.addEventListener('input',()=>{movementMultiplier=Number(speedControl.value)/100;localStorage.setItem('bag_movement_speed',String(movementMultiplier));syncSpeed()});syncSpeed();
settingsButton.onclick=()=>settingsBackdrop.classList.add('open');
$('bagSettingsClose').onclick=()=>settingsBackdrop.classList.remove('open');
settingsBackdrop.addEventListener('click',e=>{if(e.target===settingsBackdrop)settingsBackdrop.classList.remove('open')});
const track=$('soundtrack');track.loop=true;const slider=$('musicVolume'),toggle=$('musicToggle'),pct=$('musicPct');let volume=Number(localStorage.getItem('bag_music_volume')??60);if(!Number.isFinite(volume))volume=60;volume=Math.max(0,Math.min(100,volume));let lastVolume=volume||60;function syncAudio(){track.volume=volume/100;track.muted=volume===0;slider.value=volume;pct.textContent=volume+'%';toggle.textContent=volume?'🔊':'🔇';localStorage.setItem('bag_music_volume',String(volume))}function startMusic(){track.play().catch(()=>{})}function pauseMusic(){track.pause()}const originalAudioPanel=slider.parentElement; $('bagSettingsAudio').append(toggle,slider,pct); if(originalAudioPanel&&originalAudioPanel!==document.body&&originalAudioPanel.children.length===0)originalAudioPanel.style.display='none';slider.addEventListener('input',()=>{volume=Number(slider.value);if(volume)lastVolume=volume;syncAudio()});toggle.addEventListener('click',()=>{volume=volume?0:lastVolume;syncAudio();if(phase==='playing')startMusic()});syncAudio();
$('nextStage').onclick=nextStage;$('play').onclick=begin;$('again').onclick=begin;$('keep').onclick=()=>finish(true);$('risk').onclick=riskAgain;
$('share').onclick=async()=>{const name=$('username').value.trim()||'A BAG RUN PLAYER',message=`I secured ${fmt(score)} in TAKE THAT RISK: BAG RUN (Level ${level}). Can you beat my bag?`;try{if(navigator.share)await navigator.share({title:'TAKE THAT RISK: BAG RUN',text:message,url:location.protocol.startsWith('http')?location.href:undefined});else if(navigator.clipboard){await navigator.clipboard.writeText(message+' '+(location.protocol.startsWith('http')?location.href:''));$('notice').textContent='Score copied!'}else $('notice').textContent=message}catch(e){if(e.name!=='AbortError')$('notice').textContent='Could not share. Try copying your score.'}};
const cfg=window.BAG_RUN_CONFIG||{},connected=Boolean(cfg.url&&cfg.key&&window.supabase),db=connected?window.supabase.createClient(cfg.url,cfg.key):null;
async function leaderboard(from){backTo=from;screen('leader');$('leaderRows').textContent='Loading worldwide rankings…';$('leaderNotice').textContent='';if(!db){$('leaderRows').textContent='Leaderboard not connected yet.';$('leaderNotice').textContent='Add your Supabase project URL and publishable key to config.js.';return}try{const {data,error}=await db.from('scores').select('name,score,level').order('score',{ascending:false}).limit(100);if(error)throw error;$('leaderRows').replaceChildren();if(!data.length)$('leaderRows').textContent='No scores yet. Be the first!';data.forEach((r,i)=>{const row=document.createElement('div');row.className='leaderRow';const a=document.createElement('span'),b=document.createElement('strong');a.textContent=`${i+1}. ${r.name} · LV ${r.level}`;b.textContent=fmt(r.score);row.append(a,b);$('leaderRows').append(row)})}catch(e){$('leaderRows').textContent='Could not load leaderboard: '+e.message}}
$('ranks').onclick=()=>leaderboard('start');$('endRanks').onclick=()=>leaderboard('end');$('back').onclick=()=>screen(backTo);
$('submit').onclick=async()=>{const name=$('username').value.trim().replace(/\s+/g,' ').slice(0,18);if(!name){$('notice').textContent='Enter a name first.';return}if(!score||submitted)return;localStorage.setItem('bag_name',name);if(!db){$('notice').textContent='Worldwide leaderboard not connected yet. Follow README.';return}$('submit').disabled=true;$('notice').textContent='Posting your score…';try{let {data:{session},error:sessionError}=await db.auth.getSession();if(sessionError)throw sessionError;if(!session){const auth=await db.auth.signInAnonymously();if(auth.error)throw auth.error;session=auth.data.session}const uid=session.user.id;const prev=await db.from('scores').select('score').eq('user_id',uid).maybeSingle();if(prev.error)throw prev.error;if(!prev.data||score>prev.data.score){const result=await db.from('scores').upsert({user_id:uid,name,score,level},{onConflict:'user_id'});if(result.error)throw result.error}submitted=true;$('notice').textContent='Score saved! View worldwide rankings.';$('submit').textContent='SCORE SAVED'}catch(e){$('notice').textContent='Could not post: '+e.message;$('submit').disabled=false}};
})();
