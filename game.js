(()=>{'use strict';
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d');
const W=360,H=650,exit={x:143,y:15,w:74,h:49};let scale=1,ox=0,oy=0;
function resize(){const r=canvas.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d);scale=Math.min(canvas.width/W,canvas.height/H);ox=(canvas.width-W*scale)/2;oy=(canvas.height-H*scale)/2}addEventListener('resize',resize);resize();
const views=['start','decision','end','leader','celebrate','shop'];let phase='start',level=1,cash=0,score=0,hasRisked=false,points=[],guards=[],walls=[],player={x:180,y:575},target=null,elapsed=0,last=0,backTo='start',submitted=false,invincible=0,detected=0,confetti=[],celebrateTime=0;
// Fixed thumbstick, with left/right handed placement saved in settings.
const stick={active:false,id:null,x:0,y:0,dx:0,dy:0,vx:0,vy:0};
const STICK_RADIUS=39,STICK_DEADZONE=5;
let joystickSide=localStorage.getItem('bag_joystick_side')==='right'?'right':'left';
let controlMode=localStorage.getItem('bag_control_mode')==='free'?'free':'joystick';
function placeStick(){stick.x=joystickSide==='right'?W-49:49;stick.y=H-49;}
placeStick();
function resetStick(){stick.active=false;stick.id=null;stick.dx=stick.dy=stick.vx=stick.vy=0;}
function drawStick(){
 if(phase!=='playing'||controlMode==='free')return;
 ctx.save();ctx.lineWidth=3;
 ctx.fillStyle='rgba(10,22,16,.62)';ctx.strokeStyle='rgba(109,255,158,.84)';
 ctx.shadowColor='rgba(27,241,100,.48)';ctx.shadowBlur=12;
 ctx.beginPath();ctx.arc(stick.x,stick.y,STICK_RADIUS,0,Math.PI*2);ctx.fill();ctx.stroke();
 ctx.shadowBlur=0;ctx.strokeStyle='rgba(190,255,206,.23)';ctx.lineWidth=1.5;
 ctx.beginPath();ctx.arc(stick.x,stick.y,STICK_RADIUS*.67,0,Math.PI*2);ctx.stroke();
 ctx.fillStyle='#1bd969';ctx.strokeStyle='#c5ffce';ctx.lineWidth=3;
 ctx.shadowColor='#1de96c';ctx.shadowBlur=10;
 ctx.beginPath();ctx.arc(stick.x+stick.dx,stick.y+stick.dy,16,0,Math.PI*2);ctx.fill();ctx.stroke();
 ctx.restore();
}
const fmt=n=>'$'+Math.floor(n).toLocaleString('en-US');
const GAME_BUILD='JOYSTICK-POLISH-V30';
const SHOP_PRICES={character:[0,250000,500000,1000000,2000000],map:[0,350000,750000,1500000,3000000]};
function shopPrice(tab,index){return SHOP_PRICES[tab][index]??Infinity;}
const CHARACTERS=[{name:'Original Runner',coat:'#383838',hat:'#080808',pants:'#292929'},{name:'Redline',coat:'#922d32',hat:'#1b1010',pants:'#292929'},{name:'Ghost',coat:'#d1d4dc',hat:'#f0f0f0',pants:'#575d66'},{name:'Gold Rush',coat:'#9c7834',hat:'#21190a',pants:'#443822'},{name:'Night Ops',coat:'#244d3d',hat:'#090f0d',pants:'#182f26'}];
const MAPS=[{name:'Warehouse',floor:'#181818',grid:'#252525',wall:'#454545'},{name:'Neon Vault',floor:'#111a24',grid:'#203c53',wall:'#35617a'},{name:'Red Zone',floor:'#241416',grid:'#402328',wall:'#73353b'},{name:'Money Lab',floor:'#15241c',grid:'#294637',wall:'#50735c'},{name:'Gold District',floor:'#282116',grid:'#4c3c24',wall:'#88703d'}];
let ownedChars=JSON.parse(localStorage.getItem('bag_owned_chars')||'[0]'),ownedMaps=JSON.parse(localStorage.getItem('bag_owned_maps')||'[0]');
let activeChar=Number(localStorage.getItem('bag_active_char')||0),activeMap=Number(localStorage.getItem('bag_active_map')||0);
if(!CHARACTERS[activeChar]||!ownedChars.includes(activeChar))activeChar=0;
if(!MAPS[activeMap]||!ownedMaps.includes(activeMap))activeMap=0;
const tiers=['SUPER EASY','EASY','MEDIUM','KINDA HARD','HARD','SUPER HARD','PRO','LEGENDARY','IMPOSSIBLE','NIGHTMARE','ELITE','MASTER','INSANE','UNTOUCHABLE','NO MERCY','CHAOS','DANGER ZONE','MOST WANTED','FINAL BOSS','UNREAL','BEYOND IMPOSSIBLE'];
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
function setLevel(){const template=shapes[(level-1)%5];const flip=Math.floor((level-1)/5)%2===1;const mirror=x=>flip?W-x:x;walls=[{x:0,y:0,w:12,h:H},{x:348,y:0,w:12,h:H},{x:0,y:0,w:155,h:12},{x:205,y:0,w:155,h:12},{x:0,y:638,w:360,h:12},...template.walls.map(w=>({...w,x:flip?W-w.x-w.w:w.x}))];player={x:180,y:575};target=null;resetStick();elapsed=0;invincible=.9;detected=0;
const multiplier=1+Math.floor((level-1)/5)*.45;
// Shorter rounds: 5-6 stacks, spread across the map instead of 8-11.
const stackCount=Math.min(template.spots.length,level<=2?5:6+Math.floor((level-3)/4));
const selected=Array.from({length:stackCount},(_,i)=>template.spots[Math.round(i*(template.spots.length-1)/(stackCount-1))]);
points=selected.map((p,i)=>({x:mirror(p[0]),y:p[1],taken:false,value:Math.floor((1800+level*520)*(1+i%3)*multiplier/100)*100}));
guards=template.guards.map((p,i)=>({x:mirror(p[0]),y:p[1],baseX:mirror(p[0]),baseY:p[1],dir:i*2.1,phase:i*2.5,speed:1.05+Math.min(3.8,level*.20),range:Math.min(75,38+level*2.3),alert:0}));
// More guards in later loops, but preserve readable routes and a safe spawn.
if(level>3)guards.push({x:180,y:175,baseX:180,baseY:175,dir:0,phase:1.1,speed:.9+Math.min(3,level*.10),range:44,alert:0});
if(level>6)guards.push({x:180,y:520,baseX:180,baseY:520,dir:1,phase:2.4,speed:1+Math.min(3,level*.10),range:56,alert:0});
if(level>11)guards.push({x:180,y:330,baseX:180,baseY:330,dir:2,phase:4.1,speed:1.1+Math.min(3,level*.10),range:60,alert:0});
// Additional officers enter every five stages. Positions are offset to keep the spawn navigable.
for(let i=0;i<Math.min(9,Math.floor((level-14)/5));i++){const x=[75,285,105,255,180,85,275,125,235][i],y=[130,280,390,170,440,330,510,245,360][i];guards.push({x,y,baseX:x,baseY:y,dir:i*.9,phase:i*1.7+.4,speed:1.25+Math.min(4,level*.11),range:24+i*3,alert:0});}
$('level').textContent='STAGE '+level+' · '+difficulty(level);updateHud()}
function detectionLimit(){return level>=15?Math.max(2,2.5-Math.floor((level-15)/10)*.1):Math.max(.9,3.5-Math.floor((level-1)/2)*.23)}
function updateHud(){const remaining=points.filter(p=>!p.taken).length;$('cash').textContent=fmt(cash);$('remaining').textContent=remaining+' STACKS LEFT';$('status').textContent=remaining?'EXIT LOCKED':'EXIT OPEN';$('status').style.color=remaining?'#ff8888':'#b8ffb8';$('banner').textContent='';$('timer').textContent=detected>0?'🚨 SPOTTED '+Math.max(0,detectionLimit()-detected).toFixed(1)+'s':'⏱ ESCAPE TIME '+detectionLimit().toFixed(1)+'s';$('timer').style.color=detected>0?'#ff5757':'#c7c7c7'}
function celebrate(){phase='celebrate';target=null;resetStick();celebrateTime=0;confetti=Array.from({length:85},(_,i)=>({x:Math.random()*W,y:-Math.random()*H*.7,vx:(Math.random()-.5)*80,vy:70+Math.random()*160,spin:Math.random()*6.28,vr:(Math.random()-.5)*7}));$('celebrateCash').textContent=fmt(cash);$('celebrateStage').textContent='STAGE '+level+' COMPLETE';$('celebrateNext').textContent='NEXT: STAGE '+(level+1)+' · '+difficulty(level+1);screen('celebrate')}
function nextStage(){level++;setLevel();phase='playing';gameplay()}
function begin(){const audio=$('soundtrack');audio.currentTime=0;cash=0;level=1;score=0;submitted=false;hasRisked=false;phase='playing';setLevel();gameplay();startMusic()}
function caught(){if(phase!=='playing'||invincible>0)return;target=null;resetStick();if(!hasRisked){phase='decision';$('atStake').textContent=fmt(cash);screen('decision')}else{cash=0;finish(false)}}
function finish(bank){resetStick();pauseMusic();phase='end';score=bank?cash:0;submitted=false;$('endLabel').textContent=bank?'BAG SECURED':'BUSTED';$('endTitle').textContent=bank?'YOU TOOK THAT RISK':'YOU LOST THE BAG';$('finalCash').textContent=fmt(score);const best=Number(localStorage.getItem('bag_best')||0);if(score>best)localStorage.setItem('bag_best',String(score));$('best').textContent='PERSONAL BEST: '+fmt(Math.max(score,best))+' · LEVEL '+level;$('notice').textContent=score?'Enter a name to share your score.':'You lost the bag. Play again to post a score.';$('submit').disabled=score===0;$('submit').textContent='POST SCORE TO LEADERBOARD';$('username').value=localStorage.getItem('bag_name')||'';screen('end')}
function riskAgain(){hasRisked=true;phase='playing';invincible=2;elapsed=0;player={x:180,y:575};target=null;resetStick();points.forEach(p=>p.taken=false);guards.forEach(g=>g.speed*=1.17);updateHud();gameplay();startMusic()}
function update(dt){if(phase!=='playing')return;elapsed+=dt;invincible=Math.max(0,invincible-dt);const speed=140*movementMultiplier;
if(stick.active){
 const magnitude=Math.hypot(stick.dx,stick.dy);
 const power=magnitude<=STICK_DEADZONE?0:Math.min(1,(magnitude-STICK_DEADZONE)/(STICK_RADIUS-STICK_DEADZONE));
 const wantedX=magnitude?stick.dx/magnitude*power:0,wantedY=magnitude?stick.dy/magnitude*power:0;
 // Responsive but gently smoothed movement, independent of screen size or finger position.
 const easing=1-Math.exp(-23*dt);
 stick.vx+=(wantedX-stick.vx)*easing;stick.vy+=(wantedY-stick.vy)*easing;
 const nx=player.x+stick.vx*speed*dt,ny=player.y+stick.vy*speed*dt;
 if(!collision(nx,player.y))player.x=Math.max(15,Math.min(W-15,nx));
 if(!collision(player.x,ny))player.y=Math.max(15,Math.min(H-15,ny));
}else if(target){const dx=target.x-player.x,dy=target.y-player.y,d=Math.hypot(dx,dy);if(d>4){const step=Math.min(d,speed*dt),nx=player.x+dx/d*step,ny=player.y+dy/d*step;if(!collision(nx,player.y))player.x=nx;if(!collision(player.x,ny))player.y=ny}}let changed=false;for(const p of points){if(!p.taken&&Math.hypot(player.x-p.x,player.y-p.y)<21){p.taken=true;cash+=p.value;changed=true}}if(changed)updateHud();if(points.every(p=>p.taken)&&player.y<69&&Math.abs(player.x-180)<37){celebrate();return}
let seen=false;
for(const g of guards){
  const patrolAngle=elapsed*g.speed+g.phase;
  const chaseUnlocked=level>=15;
  const dx0=player.x-g.x,dy0=player.y-g.y,dist0=Math.hypot(dx0,dy0);
  const facingDiff=Math.atan2(Math.sin(Math.atan2(dy0,dx0)-g.dir),Math.cos(Math.atan2(dy0,dx0)-g.dir));
  const spotted=dist0<20||(dist0<Math.min(100,73+level*1.4)&&Math.abs(facingDiff)<.52);
  if(chaseUnlocked&&invincible<=0&&spotted){if(!(g.alert>0))detected=0;g.alert=Math.max(g.alert||0,Math.min(4.2,1.5+(level-15)*.13));}
  if(chaseUnlocked&&g.alert>0){
    g.alert=Math.max(0,g.alert-dt);
    const dx=player.x-g.x,dy=player.y-g.y,d=Math.hypot(dx,dy);
    if(d>1){g.dir=Math.atan2(dy,dx);const step=Math.min(d,(58+Math.min(65,(level-15)*5))*dt);const nx=g.x+dx/d*step,ny=g.y+dy/d*step;if(!collision(nx,g.y))g.x=nx;if(!collision(g.x,ny))g.y=ny}
  }else{g.dir=patrolAngle;g.x=g.baseX+Math.sin(patrolAngle)*g.range;g.y=g.baseY+Math.cos(elapsed*g.speed*.65+g.phase)*12}
  const dx=player.x-g.x,dy=player.y-g.y,dist=Math.hypot(dx,dy),diff=Math.atan2(Math.sin(Math.atan2(dy,dx)-g.dir),Math.cos(Math.atan2(dy,dx)-g.dir));
  if(dist<20||(dist<Math.min(100,73+level*1.4)&&Math.abs(diff)<.52))seen=true;
}
if(invincible<=0&&seen){detected+=dt;if(detected>=detectionLimit()){detected=0;caught();return}}else detected=0;
updateHud()}

function drawPlayer(){ctx.save();ctx.translate(player.x,player.y);if(invincible>0&&Math.floor(elapsed*12)%2)ctx.globalAlpha=.6;
const outfit=CHARACTERS[activeChar],c=activeChar;
// Each outfit has a unique cut, accessories and material detailing while preserving its color.
// No oversized circular shadow behind the runner.
ctx.fillStyle=outfit.pants;ctx.fillRect(-12,9,11,19);ctx.fillRect(2,9,11,19);
ctx.fillStyle=c===2?'#eef1f5':c===3?'#e1b957':c===4?'#151f1b':'#101010';ctx.fillRect(-13,23,12,6);ctx.fillRect(2,23,12,6);
ctx.fillStyle=outfit.coat;ctx.beginPath();ctx.roundRect(-16,-12,32,29,c===1?10:6);ctx.fill();
ctx.fillStyle=outfit.coat;ctx.fillRect(-21,-9,7,20);ctx.fillRect(14,-9,7,20);
ctx.strokeStyle=c===2?'#8796a8':c===3?'#f2d68c':c===1?'#e24b4f':c===4?'#719b7a':'#62666a';ctx.lineWidth=2;
ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(0,16);ctx.stroke();
if(c===0){for(const [x,y] of [[-9,-6],[7,-5],[-7,6],[9,9]]){ctx.fillStyle='#4e5851';ctx.fillRect(x,y,5,4)}}
if(c===1){ctx.fillStyle='#2c0f15';ctx.fillRect(-13,-8,5,20);ctx.fillRect(8,-8,5,20);ctx.strokeStyle='#f45a62';ctx.beginPath();ctx.moveTo(-11,-8);ctx.lineTo(-11,11);ctx.moveTo(11,-8);ctx.lineTo(11,11);ctx.stroke();ctx.fillStyle='#eeb2b2';ctx.fillRect(-6,6,12,3)}
if(c===2){ctx.fillStyle='#f5f6fa';ctx.beginPath();ctx.arc(0,-12,14,Math.PI,0);ctx.fill();ctx.strokeStyle='#9fa9bc';ctx.stroke();ctx.fillStyle='#bbc6d4';ctx.fillRect(-12,8,24,3)}
if(c===3){ctx.fillStyle='#efc565';ctx.fillRect(-13,-9,5,5);ctx.fillRect(8,-9,5,5);ctx.fillStyle='#6c5225';ctx.fillRect(-11,9,22,5);ctx.strokeStyle='#f7d77e';ctx.strokeRect(-11,-10,22,23)}
if(c===4){ctx.fillStyle='#101f17';ctx.fillRect(-12,-8,24,9);ctx.fillStyle='#54735b';ctx.fillRect(-11,-5,9,6);ctx.fillRect(3,-5,9,6);ctx.fillStyle='#111b16';ctx.fillRect(-10,7,20,7)}
ctx.fillStyle=outfit.hat;ctx.beginPath();ctx.arc(0,-17,11,0,Math.PI*2);ctx.fill();ctx.fillRect(-11,-24,22,7);
ctx.strokeStyle=c===3?'#e1b958':c===1?'#c84a52':c===2?'#a4acba':c===4?'#4e7963':'#666';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-10,-20);ctx.lineTo(10,-20);ctx.stroke();
if(c===1){ctx.fillStyle='#c84a52';ctx.fillRect(-5,-27,10,3)}if(c===3){ctx.fillStyle='#ffe08c';ctx.fillRect(-4,-25,8,4)}if(c===4){ctx.fillStyle='#6a9475';ctx.fillRect(-9,-26,18,3)}
// Side-carried canvas duffel: horizontal body, handles, straps and end caps.
ctx.save();ctx.translate(23,7);ctx.rotate(-.18);
ctx.strokeStyle='#777';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(0,-6,8,Math.PI*1.1,Math.PI*1.9);ctx.stroke();
ctx.fillStyle=c===3?'#47351a':c===2?'#9da6ae':c===4?'#1b3428':'#171b1e';
ctx.beginPath();ctx.roundRect(-13,-8,28,19,7);ctx.fill();
ctx.strokeStyle=c===3?'#dbb658':c===1?'#bb4149':c===2?'#d8e0e6':c===4?'#558a6b':'#717b82';ctx.lineWidth=2;ctx.stroke();
ctx.strokeStyle='#2a3032';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-6,-7);ctx.lineTo(-6,10);ctx.moveTo(8,-7);ctx.lineTo(8,10);ctx.stroke();
ctx.fillStyle='#b0a37a';ctx.fillRect(-8,-1,4,4);ctx.fillRect(6,-1,4,4);
ctx.fillStyle='#0c1012';ctx.beginPath();ctx.ellipse(-11,1,3,7,0,0,Math.PI*2);ctx.fill();
ctx.restore();ctx.restore()}
function drawMapDetails(theme){const m=activeMap;ctx.save();
// Background detail never changes obstacle collisions or guard sightlines.
if(m===0){ctx.strokeStyle='#303030';ctx.lineWidth=2;for(let y=52;y<H;y+=160){ctx.strokeRect(18,y,34,45);ctx.strokeRect(309,y+42,32,38)}ctx.fillStyle='#3a3529';for(let y=85;y<H;y+=210){ctx.fillRect(23,y,19,4);ctx.fillRect(317,y+25,18,4)}}
if(m===1){ctx.strokeStyle='#00c9f0';ctx.lineWidth=2;ctx.shadowColor='#02b9ff';ctx.shadowBlur=11;for(let y=80;y<H;y+=130){ctx.strokeRect(16,y,23,55);ctx.strokeRect(321,y+36,23,55)}ctx.strokeStyle='#b05dff';ctx.beginPath();ctx.moveTo(28,60);ctx.lineTo(28,H-50);ctx.moveTo(332,60);ctx.lineTo(332,H-50);ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle='#00d6fc';ctx.font='bold 11px Arial';ctx.textAlign='center';ctx.fillText('VAULT // 01',180,90)}
if(m===2){ctx.strokeStyle='#e35151';ctx.lineWidth=3;for(let y=75;y<H;y+=135){ctx.beginPath();ctx.moveTo(16,y);ctx.lineTo(39,y+23);ctx.moveTo(321,y+23);ctx.lineTo(344,y);ctx.stroke()}ctx.fillStyle='#75302e';for(let y=55;y<H;y+=170){ctx.fillRect(16,y,34,8);ctx.fillRect(310,y+52,34,8)}ctx.fillStyle='#ff8b6d';ctx.font='bold 10px Arial';ctx.textAlign='center';ctx.fillText('RESTRICTED ZONE',180,91)}
if(m===3){ctx.strokeStyle='#62c79a';ctx.lineWidth=1.5;for(let y=55;y<H;y+=125){ctx.strokeRect(18,y,36,36);ctx.strokeRect(306,y+30,36,36);ctx.beginPath();ctx.moveTo(18,y+18);ctx.lineTo(54,y+18);ctx.moveTo(36,y);ctx.lineTo(36,y+36);ctx.stroke()}ctx.fillStyle='#76d2a4';ctx.font='bold 11px monospace';ctx.textAlign='center';ctx.fillText('LAB / SECURE',180,91);ctx.fillStyle='#335745';for(let y=115;y<H;y+=190){ctx.fillRect(20,y,26,8);ctx.fillRect(315,y+45,26,8)}}
if(m===4){ctx.strokeStyle='#b99750';ctx.lineWidth=2;for(let y=75;y<H;y+=145){ctx.strokeRect(17,y,28,48);ctx.strokeRect(315,y+22,28,48);ctx.beginPath();ctx.moveTo(20,y+8);ctx.lineTo(42,y+8);ctx.moveTo(318,y+30);ctx.lineTo(340,y+30);ctx.stroke()}ctx.fillStyle='#d3af64';ctx.font='bold 12px Georgia';ctx.textAlign='center';ctx.fillText('GOLD DISTRICT',180,91);ctx.fillStyle='#68522c';for(let y=145;y<H;y+=210){ctx.fillRect(20,y,20,5);ctx.fillRect(320,y+30,20,5)}}
ctx.restore()}
function draw(){ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#090909';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.setTransform(scale,0,0,scale,ox,oy);const theme=MAPS[activeMap];ctx.fillStyle=theme.floor;ctx.fillRect(0,0,W,H);ctx.strokeStyle=theme.grid;ctx.lineWidth=1;for(let x=0;x<W;x+=30){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}for(let y=0;y<H;y+=30){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
drawMapDetails(theme);ctx.fillStyle=theme.wall;walls.forEach(w=>{ctx.fillRect(w.x,w.y,w.w,w.h);ctx.fillStyle=activeMap===1?'#74c6e2':activeMap===2?'#a95355':activeMap===3?'#6fa88a':activeMap===4?'#c7a767':'#666';ctx.fillRect(w.x,w.y,Math.max(2,w.w),Math.min(3,w.h));ctx.fillStyle=theme.wall});const open=points.length&&points.every(p=>p.taken);// Large, readable exit door with a clear locked/open state.
ctx.save();ctx.shadowColor=open?'#32e56c':'#e23b43';ctx.shadowBlur=19;
ctx.fillStyle=open?'#073e21':'#54171c';ctx.fillRect(exit.x,exit.y,exit.w,exit.h);
ctx.shadowBlur=0;ctx.strokeStyle=open?'#50ff91':'#ff6a72';ctx.lineWidth=3;ctx.strokeRect(exit.x+1.5,exit.y+1.5,exit.w-3,exit.h-3);
ctx.strokeStyle=open?'#a4ffc3':'#ff9ca1';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(exit.x+9,exit.y+5);ctx.lineTo(exit.x+9,exit.y+exit.h-5);ctx.moveTo(exit.x+exit.w-9,exit.y+5);ctx.lineTo(exit.x+exit.w-9,exit.y+exit.h-5);ctx.stroke();
ctx.textAlign='center';ctx.fillStyle='#fff';ctx.font='bold 20px Arial';ctx.fillText(open?'🔓':'🔒',180,exit.y+25);ctx.font='bold 11px Arial';ctx.fillText(open?'EXIT OPEN':'LOCKED',180,exit.y+40);ctx.restore();
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
drawPlayer();drawStick()}
let simAccumulator=0;function frame(t){const dt=Math.min(.05,(t-last)/1000||0);last=t;simAccumulator=Math.min(.05,simAccumulator+dt);let steps=0;while(simAccumulator>=1/120&&steps<6){update(1/120);simAccumulator-=1/120;steps++}draw();if(phase==='celebrate'){celebrateTime+=dt;ctx.save();ctx.setTransform(scale,0,0,scale,ox,oy);for(const p of confetti){p.x+=p.vx*dt;p.y+=p.vy*dt;p.spin+=p.vr*dt;if(p.y>H+20)p.y=-30;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.spin);ctx.fillStyle='#b8d9b4';ctx.fillRect(-12,-6,24,12);ctx.strokeStyle='#285b36';ctx.strokeRect(-10,-4,20,8);ctx.fillStyle='#1b5931';ctx.font='bold 7px Arial';ctx.textAlign='center';ctx.fillText('$100',0,2);ctx.restore()}ctx.restore()}requestAnimationFrame(frame)}requestAnimationFrame(frame);
function pointer(e){const r=canvas.getBoundingClientRect();return{x:((e.clientX-r.left)*canvas.width/r.width-ox)/scale,y:((e.clientY-r.top)*canvas.height/r.height-oy)/scale}}
function moveStick(e){
 const p=pointer(e),dx=p.x-stick.x,dy=p.y-stick.y,len=Math.hypot(dx,dy),ratio=len>STICK_RADIUS?STICK_RADIUS/len:1;
 stick.dx=dx*ratio;stick.dy=dy*ratio;
}
canvas.addEventListener('pointerdown',e=>{
 if(phase!=='playing'||stick.active)return;
 e.preventDefault();const p=pointer(e);stick.active=true;stick.id=e.pointerId;
 // Only begin movement from the visible joystick; its location never jumps.
 if(controlMode==='free'){stick.x=p.x;stick.y=p.y;}else if(Math.hypot(p.x-stick.x,p.y-stick.y)>STICK_RADIUS+25){resetStick();return;}
 stick.dx=stick.dy=stick.vx=stick.vy=0;target=null;
 moveStick(e);canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove',e=>{
 if(stick.active&&e.pointerId===stick.id){e.preventDefault();moveStick(e)}
});
function releaseStick(e){if(stick.active&&e.pointerId===stick.id){resetStick();placeStick();target=null}}
canvas.addEventListener('pointerup',releaseStick);
canvas.addEventListener('pointercancel',releaseStick);
canvas.addEventListener('lostpointercapture',releaseStick);
// Settings panel: movement speed and existing audio controls live together.
let movementMultiplier=Number(localStorage.getItem('bag_movement_speed')||'1');
if(!Number.isFinite(movementMultiplier))movementMultiplier=1;
movementMultiplier=Math.max(.6,Math.min(2.4,movementMultiplier));
// Cosmetic shop. Unlocks are saved on this device; no real-money purchases.
let shopReturn='start',shopTab='character',pendingItem=null;
const shopCSS=document.createElement('style');shopCSS.textContent=`
#bagShopButton{position:absolute;right:14px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:10018;width:46px;height:46px;border-radius:17px;border:2px solid #c9a04e;background:linear-gradient(135deg,#47331c,#151515);color:white;font-size:24px;padding:0;box-shadow:0 0 16px #f5b94a70;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0}
#bagShopButton span{font-size:8px;letter-spacing:1px;color:#ffe0a1}
#shop{z-index:10021;justify-content:flex-start;overflow-y:auto;padding-top:calc(24px + env(safe-area-inset-top));gap:12px}
#shop .shopTabs{display:flex;width:100%;max-width:360px;gap:7px}#shop .shopTabs button{flex:1;background:#303030;color:#fff;padding:11px 4px;border:1px solid #666}
#shop .shopTabs button.active{background:#a4772d;color:#fff}
#shopGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;width:100%;max-width:360px}
.shopCard{background:#202020;border:1px solid #565656;border-radius:12px;padding:12px 8px;display:flex;flex-direction:column;gap:8px;align-items:center;min-height:147px}
.shopCard .shopPreview{width:74px;height:63px;border-radius:10px;border:2px solid #777;display:flex;align-items:center;justify-content:center;font-size:32px}
.shopCard strong{font-size:12px}.shopCard button{padding:9px 5px;font-size:11px;width:100%;background:#e2b457;color:#151515}.shopCard button:disabled{background:#444;color:#aaa}
#shopNotice{color:#f3c87e;font-size:12px;min-height:15px;max-width:330px}
#shopConfirm{position:absolute;inset:0;background:#000d;z-index:10022;display:none;align-items:center;justify-content:center;padding:20px}
#shopConfirm>div{background:#191919;border:1px solid #c39850;border-radius:14px;padding:22px;max-width:355px;text-align:center;display:flex;flex-direction:column;gap:13px}
#shopConfirm h2{font-size:21px}#shopConfirm p{font-size:13px;color:#ddd;line-height:1.5;margin:0}
`;document.head.append(shopCSS);
const shopButton=document.createElement('button');shopButton.id='bagShopButton';shopButton.type='button';shopButton.innerHTML='👕<span>SHOP</span>';shopButton.setAttribute('aria-label','Customize characters and maps');$('app').append(shopButton);
const shopScreen=document.createElement('div');shopScreen.id='shop';shopScreen.className='screen hidden';shopScreen.innerHTML='<div class="brand">TAKE THAT RISK</div><h2>👕 CUSTOMIZE</h2><div class="sub" id="shopBalance"></div><div class="shopTabs"><button id="shopChars" type="button">CHARACTERS</button><button id="shopMaps" type="button">MAPS</button></div><div id="shopGrid"></div><div id="shopNotice"></div><div class="panel"><button class="secondary" id="shopBack">BACK TO GAME</button></div>';$('app').append(shopScreen);
const confirmScreen=document.createElement('div');confirmScreen.id='shopConfirm';confirmScreen.innerHTML='<div><h2>⚠️ RESET YOUR RUN?</h2><p id="shopConfirmText"></p><button class="danger" id="shopConfirmYes">UNLOCK & RESTART</button><button class="secondary" id="shopConfirmNo">CANCEL</button></div>';$('app').append(confirmScreen);
function renderShop(){const items=shopTab==='character'?CHARACTERS:MAPS,owned=shopTab==='character'?ownedChars:ownedMaps,active=shopTab==='character'?activeChar:activeMap;$('shopBalance').textContent='IN THE BAG: '+fmt(cash)+' · UNLOCKS FROM $250,000';$('shopChars').classList.toggle('active',shopTab==='character');$('shopMaps').classList.toggle('active',shopTab==='map');$('shopGrid').replaceChildren();items.forEach((item,i)=>{const price=shopPrice(shopTab,i);const card=document.createElement('div');card.className='shopCard';const preview=document.createElement('div');preview.className='shopPreview';preview.style.background=shopTab==='character'?item.coat:item.floor;preview.textContent=shopTab==='character'?['🧥','🧥','🥷','👑','🪖'][i]:['🏭','🌃','🚨','🧪','🏙️'][i];preview.style.boxShadow=shopTab==='map'?'inset 0 0 0 3px '+item.wall+', 0 0 14px '+item.grid:'inset 0 -14px 0 '+item.pants+', 0 0 10px '+item.coat;preview.style.borderColor=shopTab==='character'?item.hat:item.wall;const name=document.createElement('strong');name.textContent=item.name;const btn=document.createElement('button');btn.textContent=i===active?'✓ EQUIPPED':owned.includes(i)?'EQUIP':fmt(price)+' · UNLOCK';btn.disabled=i===active;btn.onclick=()=>{if(owned.includes(i)){if(shopTab==='character'){activeChar=i;localStorage.setItem('bag_active_char',String(i))}else{activeMap=i;localStorage.setItem('bag_active_map',String(i))}renderShop();return}if(cash<price){$('shopNotice').textContent='🔒 Collect '+fmt(price)+' in one run to unlock '+item.name+'.';return}pendingItem={tab:shopTab,index:i,price};$('shopConfirmText').textContent='Unlock '+item.name+' for '+fmt(price)+'? Your current run will end and you will restart at Stage 1 with $0. Your existing leaderboard entry must be removed, so you will need to earn your ranking again. Purchased items stay unlocked on this device.';confirmScreen.style.display='flex'};card.append(preview,name,btn);$('shopGrid').append(card)})}
function openShop(){resetStick();shopReturn=phase;shopTab='character';pendingItem=null;target=null;phase='shop';screen('shop');renderShop();$('shopNotice').textContent='Unlocks start at $250,000. Each item has its own price.'}
function closeShop(){if(shopReturn==='playing'){phase='playing';gameplay()}else{phase=shopReturn;screen(shopReturn)}}
shopButton.onclick=openShop;$('shopBack').onclick=closeShop;$('shopChars').onclick=()=>{shopTab='character';renderShop()};$('shopMaps').onclick=()=>{shopTab='map';renderShop()};$('shopConfirmNo').onclick=()=>{confirmScreen.style.display='none';pendingItem=null};
$('shopConfirmYes').onclick=async()=>{if(!pendingItem||cash<shopPrice(pendingItem.tab,pendingItem.index))return;const button=$('shopConfirmYes');button.disabled=true;button.textContent='CHECKING LEADERBOARD…';try{
// A leaderboard entry is only deleted when the database permits it. Never promise a reset without confirming deletion.
if(db){const {data:{session},error:sessionError}=await db.auth.getSession();if(sessionError)throw sessionError;if(session){const result=await db.from('scores').delete().eq('user_id',session.user.id).select('user_id');if(result.error)throw result.error;const verify=await db.from('scores').select('user_id').eq('user_id',session.user.id).maybeSingle();if(verify.error)throw verify.error;if(verify.data)throw Error('Leaderboard score could not be removed. Check Supabase DELETE permissions.')}}
const {tab,index}=pendingItem;if(tab==='character'){ownedChars=[...new Set([...ownedChars,index])];activeChar=index;localStorage.setItem('bag_owned_chars',JSON.stringify(ownedChars));localStorage.setItem('bag_active_char',String(index))}else{ownedMaps=[...new Set([...ownedMaps,index])];activeMap=index;localStorage.setItem('bag_owned_maps',JSON.stringify(ownedMaps));localStorage.setItem('bag_active_map',String(index))}localStorage.removeItem('bag_best');confirmScreen.style.display='none';pendingItem=null;begin();
}catch(e){confirmScreen.style.display='none';$('shopNotice').textContent='Purchase canceled: '+e.message+'. Your money was not spent.'}finally{button.disabled=false;button.textContent='UNLOCK & RESTART'}};

const footerStyle=document.createElement('style');footerStyle.textContent='#game{height:calc(100% - 190px)!important}#app{background:#090909}';document.head.appendChild(footerStyle);
const settingsStyle=document.createElement('style');
settingsStyle.textContent=`
#bagSettingsButton{position:absolute;left:14px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:10020;width:46px;height:46px;padding:0;display:flex;align-items:center;justify-content:center;line-height:1;border:1px solid #666;border-radius:50%;background:#171717;color:#fff;font-size:30px;font-weight:400;cursor:pointer;box-shadow:0 2px 9px #0008}
#bagSettingsBackdrop{position:absolute;inset:0;z-index:10019;background:#000b;display:none;align-items:center;justify-content:center;padding:18px;box-sizing:border-box}
#bagSettingsBackdrop.open{display:flex}
#bagSettingsPanel{width:min(370px,100%);max-height:85vh;overflow:auto;background:#151515;border:1px solid #666;border-radius:18px;color:#fff;padding:22px;box-sizing:border-box;font-family:Arial,sans-serif;box-shadow:0 12px 45px #000}
#bagSettingsPanel h2{margin:0 0 18px;font-size:23px}
#bagSettingsPanel .bagSettingLabel{display:flex;justify-content:space-between;margin:16px 0 10px;font-size:15px}
#bagSettingsPanel input[type=range]{width:100%;accent-color:#22d467;appearance:none;-webkit-appearance:none;background:linear-gradient(90deg,#148d47,#22d467);height:7px;border-radius:99px;padding:0;cursor:pointer}
#bagSettingsPanel input[type=range]::-webkit-slider-thumb{appearance:none;-webkit-appearance:none;width:30px;height:30px;border-radius:50%;border:2px solid #aaffb8;background:#073b20 url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 30 30%22%3E%3Ctext x=%2215%22 y=%2222%22 font-family=%22Arial,sans-serif%22 font-size=%2223%22 font-weight=%22900%22 fill=%22%23baffc6%22 text-anchor=%22middle%22%3E%24%3C/text%3E%3C/svg%3E") center center / 27px 27px no-repeat;box-shadow:0 0 0 3px #073b20,0 0 13px #17e877}
#bagSettingsPanel input[type=range]::-moz-range-thumb{width:27px;height:27px;border-radius:50%;border:2px solid #aaffb8;background:#073b20 url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 30 30%22%3E%3Ctext x=%2215%22 y=%2222%22 font-family=%22Arial,sans-serif%22 font-size=%2223%22 font-weight=%22900%22 fill=%22%23baffc6%22 text-anchor=%22middle%22%3E%24%3C/text%3E%3C/svg%3E") center center / 27px 27px no-repeat}
.bagDollarHandle{display:none!important;position:absolute;pointer-events:none;color:#baffc6;font-family:Arial,sans-serif;font-size:19px;font-weight:900;line-height:1;display:flex;align-items:center;justify-content:center;width:30px;height:30px;text-shadow:0 0 3px #18f067;transform:translate(-50%,-50%);top:50%;margin:0;padding:0}
.bagSliderWrap{position:relative;width:100%;padding:15px 0;box-sizing:border-box}.bagSliderWrap input{display:block;margin:0;width:100%;height:7px}.bagSliderWrap .bagDollarHandle{top:50%}
#bagSettingsAudio{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:10px}
#bagSettingsAudio button{font-size:20px;padding:8px 12px;border-radius:10px;background:#333;color:white;border:1px solid #777}
#bagSettingsAudio .bagSliderWrap{flex:1;min-width:100px}#bagSettingsAudio input[type=range]{flex:1;min-width:90px;width:auto!important;margin:12px 0}#bagSettingsPanel input[type=range]::-webkit-slider-thumb{background-position:center center!important}
#bagControlModes{display:flex;gap:10px;margin-bottom:6px}#bagControlModes button{flex:1;background:#252525;color:white;border:1px solid #555;border-radius:10px;padding:12px 7px;font-size:13px;font-weight:800}#bagControlModes button.selected{background:#105b30;border-color:#3bff89;box-shadow:0 0 10px #12a74b88}#bagJoystickSides{display:flex;gap:10px}#bagJoystickSides button{flex:1;background:#252525;color:white;border:1px solid #555;border-radius:10px;padding:12px;font-weight:800}#bagJoystickSides button.selected{background:#105b30;border-color:#3bff89;box-shadow:0 0 10px #12a74b88}#bagSettingsClose{width:100%;margin-top:22px;padding:12px;border-radius:11px;border:0;background:#f0f0f0;color:#111;font-weight:bold;font-size:16px}
`;
document.head.appendChild(settingsStyle);
const settingsButton=document.createElement('button');settingsButton.id='bagSettingsButton';settingsButton.type='button';settingsButton.textContent='⚙';settingsButton.setAttribute('aria-label','Open settings');
const settingsBackdrop=document.createElement('div');settingsBackdrop.id='bagSettingsBackdrop';
settingsBackdrop.innerHTML='<div id="bagSettingsPanel" role="dialog" aria-modal="true" aria-label="Game settings"><h2>⚙ SETTINGS <span style="font-size:11px;color:#69f79b;vertical-align:middle">V30</span></h2><div class="bagSettingLabel"><span>Movement Speed</span><strong id="bagSpeedPct"></strong></div><input id="bagSpeed" aria-label="Movement speed" type="range" min="60" max="240" step="5"><div class="bagSettingLabel"><span>Control Style</span></div><div id="bagControlModes" role="group" aria-label="Movement control style"><button type="button" data-mode="joystick">🕹 JOYSTICK</button><button type="button" data-mode="free">👆 FREE HAND</button></div><div id="bagJoystickSection"><div class="bagSettingLabel"><span>Joystick Side</span></div><div id="bagJoystickSides" role="group" aria-label="Joystick side"><button type="button" data-side="left">◀ LEFT</button><button type="button" data-side="right">RIGHT ▶</button></div></div><div class="bagSettingLabel"><span>Music Volume</span></div><div id="bagSettingsAudio"></div><button type="button" id="bagSettingsClose">BACK TO GAME</button></div>';
$('app').append(settingsButton,settingsBackdrop);
const speedControl=$('bagSpeed'),speedPct=$('bagSpeedPct');
function syncJoystickSide(){document.querySelectorAll('#bagJoystickSides button').forEach(b=>{b.classList.toggle('selected',b.dataset.side===joystickSide);b.setAttribute('aria-pressed',String(b.dataset.side===joystickSide))});placeStick();resetStick();}
document.querySelectorAll('#bagJoystickSides button').forEach(b=>b.addEventListener('click',()=>{joystickSide=b.dataset.side;localStorage.setItem('bag_joystick_side',joystickSide);syncJoystickSide()}));syncJoystickSide();
function syncControlMode(){document.querySelectorAll('#bagControlModes button').forEach(b=>{b.classList.toggle('selected',b.dataset.mode===controlMode);b.setAttribute('aria-pressed',String(b.dataset.mode===controlMode))});$('bagJoystickSection').style.display=controlMode==='joystick'?'block':'none';resetStick();placeStick();}
document.querySelectorAll('#bagControlModes button').forEach(b=>b.addEventListener('click',()=>{controlMode=b.dataset.mode;localStorage.setItem('bag_control_mode',controlMode);syncControlMode()}));syncControlMode();
function syncSpeed(){speedControl.value=String(Math.round(movementMultiplier*100));speedPct.textContent=Math.round(movementMultiplier*100)+'%'}
speedControl.addEventListener('input',()=>{movementMultiplier=Number(speedControl.value)/100;localStorage.setItem('bag_movement_speed',String(movementMultiplier));syncSpeed()});syncSpeed();
settingsButton.onclick=()=>settingsBackdrop.classList.add('open');
$('bagSettingsClose').onclick=()=>settingsBackdrop.classList.remove('open');
settingsBackdrop.addEventListener('click',e=>{if(e.target===settingsBackdrop)settingsBackdrop.classList.remove('open')});
const track=$('soundtrack');track.loop=true;const slider=$('musicVolume'),toggle=$('musicToggle'),pct=$('musicPct');let volume=Number(localStorage.getItem('bag_music_volume')??60);if(!Number.isFinite(volume))volume=60;volume=Math.max(0,Math.min(100,volume));let lastVolume=volume||60;let gainNode=null,audioContext=null;function ensureAudioGain(){if(gainNode)return;try{const AudioCtx=window.AudioContext||window.webkitAudioContext;if(!AudioCtx)return;audioContext=new AudioCtx();const source=audioContext.createMediaElementSource(track);gainNode=audioContext.createGain();source.connect(gainNode);gainNode.connect(audioContext.destination)}catch(e){console.warn('Audio gain unavailable',e)}}function syncAudio(){if(gainNode){gainNode.gain.value=volume/100;track.volume=1;track.muted=false}else{track.volume=volume/100;track.muted=volume===0;}slider.value=volume;pct.textContent=volume+'%';toggle.textContent=volume?'🔊':'🔇';localStorage.setItem('bag_music_volume',String(volume))}function startMusic(){ensureAudioGain();if(audioContext&&audioContext.state==='suspended')audioContext.resume().catch(()=>{});syncAudio();track.play().catch(()=>{})}function pauseMusic(){track.pause()}const originalAudioPanel=slider.parentElement; $('bagSettingsAudio').append(toggle,slider,pct); if(originalAudioPanel&&originalAudioPanel!==document.body&&originalAudioPanel.children.length===0)originalAudioPanel.style.display='none';// Floating green dollar signs track both sliders, including on iPhone Safari.
// Render the dollar sign directly inside each native slider thumb. This avoids
// the floating overlay drifting out of sync on iPhone Safari, including startup.
function dollarThumb(input){return ()=>{};}
const updateSpeedDollar=dollarThumb(speedControl);const updateVolumeDollar=dollarThumb(slider);
slider.addEventListener('input',()=>{ensureAudioGain();if(audioContext&&audioContext.state==='suspended')audioContext.resume().catch(()=>{});volume=Number(slider.value);if(volume)lastVolume=volume;syncAudio()});toggle.addEventListener('click',()=>{ensureAudioGain();if(audioContext&&audioContext.state==='suspended')audioContext.resume().catch(()=>{});volume=volume?0:lastVolume;syncAudio();if(phase==='playing')startMusic()});syncAudio();
// Home navigation: confirmation protects active runs, and banked runs can be submitted later.
let homeOrigin='start',homeSavedScore=0;
const homeStyle=document.createElement('style');homeStyle.textContent=`
#bagHomeButton{position:absolute;right:72px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:10017;width:46px;height:46px;padding:0;border:2px solid #7cba90;border-radius:15px;background:linear-gradient(135deg,#224b35,#111);box-shadow:0 0 14px #55de8c65;color:white;font-size:21px;display:none;align-items:center;justify-content:center}
#bagHomeButton.show{display:flex}
#bagHomeDialog{position:absolute;inset:0;z-index:10025;background:#000d;display:none;align-items:center;justify-content:center;padding:22px}
#bagHomeDialog.open{display:flex}
#bagHomeDialog>div{width:100%;max-width:350px;border:1px solid #689e7d;background:#181818;border-radius:16px;padding:24px;display:flex;flex-direction:column;gap:12px;text-align:center}
#bagHomeDialog h2{font-size:23px}#bagHomeDialog p{color:#ccc;font-size:14px;line-height:1.5;margin:0 0 6px}
#bagHomePrompt{margin-top:8px;max-width:290px;width:100%;display:none;flex-direction:column;gap:8px}
#bagHomePrompt.visible{display:flex}#bagHomePrompt .sub{font-size:12px}
`;document.head.append(homeStyle);
const homeButton=document.createElement('button');homeButton.id='bagHomeButton';homeButton.type='button';homeButton.textContent='🏠';homeButton.title='Go home';homeButton.setAttribute('aria-label','Go home');$('app').append(homeButton);
const homeDialog=document.createElement('div');homeDialog.id='bagHomeDialog';homeDialog.innerHTML='<div><h2>🏠 GO HOME?</h2><p id="bagHomeWarning"></p><button class="primary" id="bagHomeYes">GO HOME</button><button class="secondary" id="bagHomeNo">KEEP PLAYING</button></div>';$('app').append(homeDialog);
const homePrompt=document.createElement('div');homePrompt.id='bagHomePrompt';homePrompt.innerHTML='<div class="brand">💰 BAG SECURED</div><div class="sub" id="bagHomeScore"></div><button class="primary" id="bagHomePost">🏆 ADD YOUR NAME TO LEADERBOARD</button><button class="secondary" id="bagHomeDismiss">MAYBE LATER</button>';$('start').querySelector('.panel').insertAdjacentElement('afterend',homePrompt);
function refreshHomeButton(){homeButton.classList.toggle('show',phase==='playing'||phase==='celebrate'||phase==='end');}
function showHome(){phase='start';target=null;screen('start');refreshHomeButton();}
function askHome(){homeOrigin=phase;if(phase==='playing'){$('bagHomeWarning').textContent='Leaving now will end your run. Your unbanked money will not be submitted to the leaderboard. Are you sure?';}else if(phase==='celebrate'){$('bagHomeWarning').textContent='You cleared the stage! Return home and bank '+fmt(cash)+' instead of continuing?';}else{$('bagHomeWarning').textContent='Your money is secured. Return home and choose whether to add your name to the leaderboard?';}homeDialog.classList.add('open');}
function goHome(){homeDialog.classList.remove('open');if(homeOrigin==='playing'){pauseMusic();homeSavedScore=0;homePrompt.classList.remove('visible');showHome();return;}if(homeOrigin==='celebrate'){finish(true);}homeSavedScore=score;pauseMusic();showHome();if(homeSavedScore>0){$('bagHomeScore').textContent=fmt(homeSavedScore)+' BANKED · STAGE '+level;homePrompt.classList.add('visible')}else{homePrompt.classList.remove('visible')}}
homeButton.onclick=askHome;$('bagHomeNo').onclick=()=>homeDialog.classList.remove('open');$('bagHomeYes').onclick=goHome;
$('bagHomePost').onclick=()=>{phase='end';screen('end');refreshHomeButton()};$('bagHomeDismiss').onclick=()=>homePrompt.classList.remove('visible');
const originalGameplay=gameplay;gameplay=function(){originalGameplay();refreshHomeButton();homePrompt.classList.remove('visible')};
const originalScreen=screen;screen=function(id){originalScreen(id);refreshHomeButton()};
const originalBegin=begin;begin=function(){homePrompt.classList.remove('visible');homeSavedScore=0;originalBegin()};
$('nextStage').onclick=nextStage;$('cashOutStage').onclick=()=>{if(phase!=='celebrate')return;finish(true)};$('play').onclick=begin;$('again').onclick=begin;$('keep').onclick=()=>finish(true);$('risk').onclick=riskAgain;
// Create a real portrait share card using the current game canvas as the artwork.
async function makeScoreStory(){
 const w=1080,h=1920,c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');
 const bg=g.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#17271b');bg.addColorStop(.45,'#080c09');bg.addColorStop(1,'#060706');g.fillStyle=bg;g.fillRect(0,0,w,h);
 g.textAlign='center';g.fillStyle='#b8ffb7';g.font='bold 39px Arial';g.fillText('LIL NOR PRESENTS',w/2,120);
 g.fillStyle='#fff';g.font='bold 104px Arial';g.fillText('TAKE THAT RISK',w/2,255);g.font='bold 66px Arial';g.fillText('BAG RUN',w/2,332);
 const gx=75,gy=405,gw=930,gh=890;g.fillStyle='#1c1c1c';g.fillRect(gx-9,gy-9,gw+18,gh+18);
 try{const source=$('game');const sw=source.width,sh=source.height;const fit=Math.min(gw/sw,gh/sh);const dw=sw*fit,dh=sh*fit;g.fillStyle='#101410';g.fillRect(gx,gy,gw,gh);g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(source,gx+(gw-dw)/2,gy+(gh-dh)/2,dw,dh)}catch(e){g.fillStyle='#161b17';g.fillRect(gx,gy,gw,gh)}
 const shade=g.createLinearGradient(0,gy+gh-360,0,gy+gh);shade.addColorStop(0,'#0000');shade.addColorStop(1,'#000e');g.fillStyle=shade;g.fillRect(gx,gy+gh-360,gw,360);
 g.fillStyle='#c5ffc1';g.font='bold 45px Arial';g.fillText('BAG SECURED',w/2,1380);
 g.fillStyle='#fff';g.font='bold 125px Arial';g.fillText(fmt(score),w/2,1505);
 const playerName=($('username').value.trim()||'BAG RUN PLAYER').slice(0,18).toUpperCase();
 g.font='bold 40px Arial';g.fillStyle='#e6e6e6';g.fillText(playerName+'  •  STAGE '+level,w/2,1585);
 g.fillStyle='#b8ffb7';g.font='bold 50px Arial';g.fillText('THINK YOU CAN BEAT MY SCORE?',w/2,1705);
 g.fillStyle='#fff';g.font='bold 32px Arial';g.fillText('STREAM TAKE THAT RISK FREESTYLE — LIL NOR',w/2,1790);
 g.fillStyle='#aaa';g.font='29px Arial';g.fillText('lilnor79.github.io/take-that-risk-bag-run',w/2,1860);
 return new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error('Image export failed')),'image/png'));
}
$('share').onclick=async()=>{
 const btn=$('share');btn.disabled=true;const original=btn.textContent;btn.textContent='CREATING STORY IMAGE…';
 try{
  const blob=await makeScoreStory(),file=new File([blob],'take-that-risk-score.png',{type:'image/png'});
  if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
   await navigator.share({files:[file],title:'TAKE THAT RISK: BAG RUN',text:'Can you beat my score? Play TAKE THAT RISK: BAG RUN!'});
  }else{
   const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='take-that-risk-score.png';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
   $('notice').textContent='Story image saved/downloaded! Share it to Instagram or Snapchat Stories.';
  }
 }catch(e){if(e.name!=='AbortError')$('notice').textContent='Could not create the story image: '+e.message}
 finally{btn.disabled=false;btn.textContent=original}
};
const cfg=window.BAG_RUN_CONFIG||{},connected=Boolean(cfg.url&&cfg.key&&window.supabase),db=connected?window.supabase.createClient(cfg.url,cfg.key):null;
async function leaderboard(from){backTo=from;screen('leader');$('leaderRows').textContent='Loading worldwide rankings…';$('leaderNotice').textContent='';if(!db){$('leaderRows').textContent='Leaderboard not connected yet.';$('leaderNotice').textContent='Add your Supabase project URL and publishable key to config.js.';return}try{const {data,error}=await db.from('scores').select('name,score,level').order('score',{ascending:false}).limit(100);if(error)throw error;$('leaderRows').replaceChildren();if(!data.length)$('leaderRows').textContent='No scores yet. Be the first!';data.forEach((r,i)=>{const row=document.createElement('div');row.className='leaderRow';const a=document.createElement('span'),b=document.createElement('strong');a.textContent=`${i+1}. ${r.name} · LV ${r.level}`;b.textContent=fmt(r.score);row.append(a,b);$('leaderRows').append(row)})}catch(e){$('leaderRows').textContent='Could not load leaderboard: '+e.message}}
$('ranks').onclick=()=>leaderboard('start');$('endRanks').onclick=()=>leaderboard('end');$('back').onclick=()=>screen(backTo);
$('submit').onclick=async()=>{const name=$('username').value.trim().replace(/\s+/g,' ').slice(0,18);if(!name){$('notice').textContent='Enter a name first.';return}if(!score||submitted)return;localStorage.setItem('bag_name',name);if(!db){$('notice').textContent='Worldwide leaderboard not connected yet. Follow README.';return}$('submit').disabled=true;$('notice').textContent='Posting your score…';try{let {data:{session},error:sessionError}=await db.auth.getSession();if(sessionError)throw sessionError;if(!session){const auth=await db.auth.signInAnonymously();if(auth.error)throw auth.error;session=auth.data.session}const uid=session.user.id;const prev=await db.from('scores').select('score').eq('user_id',uid).maybeSingle();if(prev.error)throw prev.error;if(!prev.data||score>prev.data.score){const result=await db.from('scores').upsert({user_id:uid,name,score,level},{onConflict:'user_id'});if(result.error)throw result.error}submitted=true;$('notice').textContent='Score saved! View worldwide rankings.';$('submit').textContent='SCORE SAVED'}catch(e){$('notice').textContent='Could not post: '+e.message;$('submit').disabled=false}};
})();
