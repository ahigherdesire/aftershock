import {SHAPES,emptyBoard,canPlace,findLines,gravityForLines,playTurn,hasMoves,placements,createTray} from './engine.mjs';
const $=id=>document.getElementById(id);
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
const copy=value=>JSON.parse(JSON.stringify(value));
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const colors=['','purple','orange','yellow','green','blue','red'];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let best=read('aftershock-best',0);if(!Number.isSafeInteger(best)||best<0)best=0;
let state,selected=null,busy=false,previous=null,practice=false,parked=null,drag=null,cursor={x:0,y:0},keyboardMode=false;
let sound=false,audio=null;
const directions=['up','down','left','right'];
const arrowRotation={up:180,down:0,left:90,right:-90};
function showGravity(direction,preview=false,active=false){
 $('gravity-state').textContent=`${preview?'Next: ':''}${direction[0].toUpperCase()+direction.slice(1)}`;
 $('gravity-arrow').style.transform=`rotate(${arrowRotation[direction]}deg)`;
 $('gravity-indicator').classList.toggle('preview',preview);$('gravity-indicator').classList.toggle('active',active);
}
const validPiece=p=>p===null||p&&Number.isInteger(p.color)&&p.color>=1&&p.color<=6&&Array.isArray(p.cells)&&SHAPES.some(s=>JSON.stringify(s)===JSON.stringify(p.cells));
function validState(s){return s&&Array.isArray(s.board)&&s.board.length===64&&s.board.every(v=>Number.isInteger(v)&&v>=0&&v<=6)&&Array.isArray(s.tray)&&s.tray.length===3&&s.tray.every(validPiece)&&['score','lines','chain','turn'].every(k=>Number.isSafeInteger(s[k])&&s[k]>=0);}
function fresh(){const board=emptyBoard();return {board,tray:createTray(board),score:0,lines:0,chain:0,turn:0,gravity:'down'};}
function save(){if(practice)return;write('aftershock-session',state);write('aftershock-best',best);}
function status(text,active=false){$('status').textContent=text;$('status').classList.toggle('chain-active',active);}
function tone(kind,depth=1){
 if(!sound)return;try{audio??=new AudioContext();audio.resume();const now=audio.currentTime;
 if(kind==='land'){const o=audio.createOscillator(),g=audio.createGain();o.type='triangle';o.frequency.setValueAtTime(120,now);o.frequency.exponentialRampToValueAtTime(38,now+.09);g.gain.setValueAtTime(.12,now);g.gain.exponentialRampToValueAtTime(.001,now+.11);o.connect(g);g.connect(audio.destination);o.start();o.stop(now+.12);return;}
 const notes=kind==='clear'?[330+depth*110,495+depth*110,660+depth*110]:kind==='perfect'?[523,659,784,1046]:[280];
 for(let i=0;i<notes.length;i++){const o=audio.createOscillator(),g=audio.createGain();o.type='triangle';o.frequency.value=notes[i];g.gain.setValueAtTime(.035,now+i*.035);g.gain.exponentialRampToValueAtTime(.001,now+i*.035+.12);o.connect(g);g.connect(audio.destination);o.start(now+i*.035);o.stop(now+i*.035+.14);}}catch{}}
const backgroundCells=Array.from({length:64},(_,i)=>{const cell=document.createElement('div');cell.className='grid-cell';cell.id=`cell-${i}`;cell.setAttribute('role','gridcell');cell.setAttribute('aria-rowindex',String(Math.floor(i/8)+1));cell.setAttribute('aria-colindex',String(i%8+1));$('background-grid').append(cell);return cell;});
function renderBoard(board=state.board,marked=[],kind=''){
 const fragment=document.createDocumentFragment();
 board.forEach((color,i)=>{backgroundCells[i].setAttribute('aria-label',`Row ${Math.floor(i/8)+1}, column ${i%8+1}: ${color?colors[color]+' block':'empty'}`);if(!color)return;const tile=document.createElement('div');tile.className=`square color-${color}${marked.includes(i)?' '+kind:''}`;tile.style.setProperty('--x',i%8);tile.style.setProperty('--y',Math.floor(i/8));tile.dataset.cell=i;fragment.append(tile);});
 $('tile-layer').replaceChildren(fragment);backgroundCells.forEach((cell,i)=>{
  const d=state.practiceDirection,x=i%8,y=Math.floor(i/8);
  const target=d==='up'?y===0&&x>=5:d==='left'?x===0&&y>=5:d==='right'?x===7&&y>=5:y===7&&x>=5;
  cell.classList.toggle('practice-target',practice&&state.turn===0&&target);
 });
}
function shapeNode(p){
 const shape=document.createElement('span');shape.className='piece-shape';const w=Math.max(...p.cells.map(c=>c[0]))+1,h=Math.max(...p.cells.map(c=>c[1]))+1;shape.style.setProperty('--cols',w);shape.style.setProperty('--rows',h);
 p.cells.forEach(([x,y])=>{const block=document.createElement('span');block.className=`mini-square color-${p.color}`;block.style.gridColumn=x+1;block.style.gridRow=y+1;shape.append(block);});return shape;
}
function renderTray(){
 $('tray').replaceChildren();state.tray.forEach((p,i)=>{
  const button=document.createElement('button');button.className='piece-slot';button.dataset.slot=i;button.disabled=busy||!p;
  if(!p){button.classList.add('used');button.setAttribute('aria-label',`Piece ${i+1} used`);}
  else{const w=Math.max(...p.cells.map(c=>c[0]))+1,h=Math.max(...p.cells.map(c=>c[1]))+1;button.setAttribute('aria-label',`Piece ${i+1}: ${colors[p.color]}, ${p.cells.length} squares, ${w} wide by ${h} tall`);button.setAttribute('aria-pressed',String(selected===i));button.classList.toggle('selected',selected===i);const fits=placements(state.board,p).length>0;button.classList.toggle('no-fit',!fits);const number=document.createElement('span');number.className='slot-number';number.textContent=String(i+1);button.append(number,shapeNode(p));button.addEventListener('pointerdown',e=>startDrag(e,i,button));button.addEventListener('click',e=>{if(e.detail===0)selectPiece(i);});}
  $('tray').append(button);
 });
 const left=state.tray.filter(Boolean).length;$('pieces-left').textContent=`${left} shape${left===1?'':'s'} left`;
}
function renderHUD(){
 $('score').textContent=state.score.toLocaleString();$('best').textContent=best.toLocaleString();$('undo').disabled=busy||!previous;$('new-game').disabled=busy;$('help').disabled=busy;$('leave-practice').hidden=!practice;$('leave-practice').disabled=busy;document.querySelector('.game').classList.toggle('practice-mode',practice);$('mode-badge').textContent=practice?'Practice':'Endless';showGravity(state.gravity,false,busy);
}
function render(){renderBoard();renderTray();renderHUD();clearGhost();}
function clearGhost(){$('ghost-layer').replaceChildren();backgroundCells.forEach(c=>c.classList.remove('line-preview'));showGravity(state.gravity,false,busy);}
function preview(x,y){
 clearGhost();if(busy||selected===null||!state.tray[selected])return;
 const p=state.tray[selected],valid=canPlace(state.board,p,x,y),fragment=document.createDocumentFragment();
 for(const [dx,dy] of p.cells){const xx=x+dx,yy=y+dy;if(xx<0||xx>=8||yy<0||yy>=8)continue;const tile=document.createElement('div');tile.className=`square ghost color-${p.color}${valid?'':' invalid'}`;tile.style.setProperty('--x',xx);tile.style.setProperty('--y',yy);fragment.append(tile);}
 $('ghost-layer').append(fragment);
 if(valid){const simulated=state.board.slice();for(const [dx,dy] of p.cells)simulated[(y+dy)*8+x+dx]=p.color;const full=findLines(simulated);full.cells.forEach(i=>backgroundCells[i].classList.add('line-preview'));if(full.cells.length)showGravity(gravityForLines(full,state.gravity),true);}
}
function selectPiece(index){
 if(busy||!state.tray[index])return;selected=index;renderTray();if(keyboardMode)preview(cursor.x,cursor.y);
 status(placements(state.board,state.tray[index]).length?`Shape ${index+1} selected. Tap to place.`:'No room for that shape. Try another.');
}
function point(e,centered=false){
 const rect=$('board').getBoundingClientRect(),gap=parseFloat(getComputedStyle($('board')).getPropertyValue('--gap')),step=(rect.width+gap)/8;
 let x=(e.clientX-rect.left)/step,y=(e.clientY-rect.top)/step;
 if(centered&&selected!==null){const p=state.tray[selected],w=Math.max(...p.cells.map(c=>c[0]))+1,h=Math.max(...p.cells.map(c=>c[1]))+1;x-=w/2-.5;y-=h/2-.5;if(e.pointerType==='touch')y-=1.6;}
 return {x:Math.floor(x),y:Math.floor(y)};
}
function startDrag(e,index,button){
 if(busy||!e.isPrimary||e.button!==0)return;e.preventDefault();keyboardMode=false;$('cursor').hidden=true;selected=index;clearGhost();
 // Keep the pressed button alive for pointer capture; update only its selected state.
 document.querySelectorAll('.piece-slot').forEach((b,i)=>{b.classList.toggle('selected',i===index);b.setAttribute('aria-pressed',String(i===index));});
 drag={index,startX:e.clientX,startY:e.clientY,moved:false,pointerId:e.pointerId,button};button.setPointerCapture(e.pointerId);
 status(`Shape ${index+1} selected. Drag or tap to place.`);
}
document.addEventListener('pointermove',e=>{
 if(!drag||e.pointerId!==drag.pointerId||busy)return;
 if(!drag.moved&&Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)<7)return;
 drag.moved=true;const target=point(e,true);preview(target.x,target.y);const p=state.tray[selected],rect=$('board').getBoundingClientRect(),gap=parseFloat(getComputedStyle($('board')).getPropertyValue('--gap')),size=(rect.width-7*gap)/8;
 const ghost=$('drag-preview');if(ghost.hidden){ghost.replaceChildren(shapeNode(p));ghost.firstElementChild.style.setProperty('--mini',`${size}px`);ghost.firstElementChild.style.gap=`${gap}px`;ghost.hidden=false;}
 ghost.style.left=`${e.clientX}px`;ghost.style.top=`${e.clientY-(e.pointerType==='touch'?1.6*(size+gap):0)}px`;
});
document.addEventListener('pointerup',e=>{
 if(!drag||e.pointerId!==drag.pointerId)return;const moved=drag.moved,target=point(e,true);drag=null;$('drag-preview').hidden=true;clearGhost();if(moved)makeMove(target.x,target.y);
});
document.addEventListener('pointercancel',()=>{drag=null;$('drag-preview').hidden=true;clearGhost();});
$('board').addEventListener('pointermove',e=>{if(!drag&&e.pointerType==='mouse'){keyboardMode=false;$('cursor').hidden=true;const p=point(e);preview(p.x,p.y);}});
$('board').addEventListener('pointerleave',()=>{if(!drag&&!keyboardMode)clearGhost();});
$('board').addEventListener('click',e=>{if(busy||drag)return;keyboardMode=false;$('cursor').hidden=true;const p=point(e);makeMove(p.x,p.y);});
function showBanner(title,detail=''){$('chain-banner').querySelector('strong').textContent=title;$('chain-banner').querySelector('span').textContent=detail;$('chain-banner').classList.add('visible');}
function hideBanner(){$('chain-banner').classList.remove('visible');}
function timing(){return {clear:160,fall:210,pause:20};}
function impact(direction){
 tone('land');if(reduced.matches)return;
 const [x,y]={up:[0,-3],down:[0,3],left:[-3,0],right:[3,0]}[direction];
 document.querySelector('.board-frame').animate([{transform:'translate(0,0)'},{transform:`translate(${x}px,${y}px)`,offset:.2},{transform:`translate(${-x*.4}px,${-y*.4}px)`,offset:.55},{transform:'translate(0,0)'}],{duration:110,easing:'ease-out'});
}
function burst(frame){
 if(reduced.matches)return;const rect=$('board').getBoundingClientRect(),gap=parseFloat(getComputedStyle($('board')).getPropertyValue('--gap')),step=(rect.width+gap)/8;
 for(const cell of frame.cells.filter((_,i)=>i%Math.max(1,Math.floor(frame.cells.length/16))===0).slice(0,24)){
  const particle=document.createElement('span');particle.className=`particle color-${frame.board[cell]}`;particle.style.left=`${(cell%8+.5)*step}px`;particle.style.top=`${(Math.floor(cell/8)+.5)*step}px`;$('effect-layer').append(particle);
  const angle=Math.random()*Math.PI*2,distance=18+Math.random()*28;const animation=particle.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${Math.cos(angle)*distance}px,${Math.sin(angle)*distance}px) rotate(100deg) scale(.3)`,opacity:0}],{duration:240,easing:'ease-out'});animation.finished.then(()=>particle.remove(),()=>particle.remove());
 }
}
function scorePop(points){
 if(reduced.matches)return;const element=$('score-pop');element.textContent=`+${points}`;element.getAnimations().forEach(a=>a.cancel());element.animate([{opacity:1,transform:'translateY(5px)'},{opacity:0,transform:'translateY(-15px)'}],{duration:350,easing:'ease-out'});
}
async function animateFall(frame,duration){
 renderBoard(frame.before);const gap=parseFloat(getComputedStyle($('board')).getPropertyValue('--gap')),step=($('board').getBoundingClientRect().width+gap)/8;
 const vector={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[frame.direction];
 if(!reduced.matches)for(const m of frame.movements){
  const tile=$('tile-layer').querySelector(`[data-cell="${m.from}"]`),dx=(m.to%8-m.from%8)*step,dy=(Math.floor(m.to/8)-Math.floor(m.from/8))*step;
  tile?.animate([{transform:'translate(0,0)',offset:0,easing:'cubic-bezier(.65,0,1,1)'},{transform:`translate(${dx}px,${dy}px)`,offset:.64,easing:'ease-out'},{transform:`translate(${dx-vector[0]*4}px,${dy-vector[1]*4}px)`,offset:.81,easing:'ease-in'},{transform:`translate(${dx}px,${dy}px)`,offset:1}],{duration,fill:'forwards'});
 }
 else renderBoard(frame.board);
 if(frame.movements.length){await delay(Math.round(duration*.64));impact(frame.direction);await delay(Math.round(duration*.36));}
 renderBoard(frame.board);
}
async function makeMove(x,y){
 if(busy||$('modal').open)return;if(selected===null){status('Choose a shape from the tray first.');return;}
 const p=state.tray[selected];if(!p)return;const turn=playTurn(state,selected,x,y),result=turn.result;
 if(!result.valid){status('Doesn’t fit. Try another spot.');tone('miss');return;}
 previous=copy(state);const baseScore=state.score,baseLines=state.lines;let cleared=0;
 state.tray[selected]=null;selected=null;busy=true;clearGhost();$('cursor').hidden=true;keyboardMode=false;renderTray();renderHUD();
 const speed=timing();document.documentElement.style.setProperty('--clear-time',`${speed.clear}ms`);
 try{
 for(const f of result.frames){
  state.score=baseScore+f.score;
  if(f.kind==='place'){renderBoard(f.board,f.cells,'placed');tone('place');if(result.lines)await delay(40);}
  if(f.kind==='clear'){
   cleared+=f.lines;state.lines=baseLines+cleared;state.chain=Math.max(state.chain,f.chain);renderBoard(f.board,f.cells,'clearing');
   state.gravity=f.direction;
   status(f.chain>1?`${f.chain}× COMBO!`:`${f.lines} line${f.lines===1?'':'s'} cleared!`,true);
   if(f.chain>1)showBanner(`${f.chain}× COMBO!`,`+${100*f.lines*f.chain}`);
   burst(f);scorePop(100*f.lines*f.chain);tone('clear',f.chain);renderHUD();await delay(speed.clear);
  }
  if(f.kind==='fall'){await animateFall(f,speed.fall);await delay(speed.pause);}
  if(f.kind==='perfect'){showBanner('ALL CLEAR!','+500');status('ALL CLEAR! +500',true);tone('perfect');renderHUD();await delay(280);}
  renderHUD();
 }
 state=turn.next;
 if(!practice)best=Math.max(best,state.score);
 save();
 }finally{busy=false;hideBanner();render();}
 if(practice){status(result.chain>1?'One block. Two clears.':'Fill the bottom row with the orange bar.',result.chain>1);if(result.chain>1)practiceComplete();return;}
 status(result.perfect?'ALL CLEAR! Keep going.':result.chain>1?`${result.chain}× COMBO! Keep it going.`:result.lines?'Keep it going!':'Drag blocks onto the board',result.chain>1);
 if(turn.over)gameOver();
}
function openModal(html){$('modal-content').innerHTML=html;if(!$('modal').open)$('modal').showModal();}
function gameOver(){openModal(`<h2>No more moves</h2><span class="final-score">${state.score.toLocaleString()}</span><p>${state.score>=best&&state.score>0?'New personal best!':'None of your remaining shapes fits.'}</p><div class="modal-stats"><div><span>Lines</span><strong>${state.lines}</strong></div><div><span>Best combo</span><strong>${state.chain}×</strong></div></div><button class="new-button" id="play-again">Play again</button>${previous?'<button class="modal-secondary" id="undo-over">Undo last placement</button>':''}`);$('play-again').onclick=()=>{$('modal').close();newGame();};if($('undo-over'))$('undo-over').onclick=()=>{$('modal').close();undo();};}
function newGame(){if(busy)return;practice=false;parked=null;previous=null;selected=null;state=fresh();render();status('Drag blocks onto the board');save();}
function undo(){if(busy||!previous)return;state=previous;previous=null;selected=null;render();save();status('Placement undone.');}
function enterPractice(direction='down'){
 if(busy||practice)return;parked={state:copy(state),previous:previous?copy(previous):null};practice=true;previous=null;selected=0;
 const board=emptyBoard(),rotate=([x,y])=>direction==='up'?[x,7-y]:direction==='left'?[7-y,x]:direction==='right'?[y,x]:[x,y];
 const set=(x,y,color)=>{const [xx,yy]=rotate([x,y]);board[yy*8+xx]=color;};
 for(let c=0;c<5;c++)set(c,7,4);for(let c=0;c<8;c++)set(c,2+Math.floor(c/2),1+(Math.floor(c/2)%3));
 const cells=direction==='left'||direction==='right'?[[0,0],[0,1],[0,2]]:[[0,0],[1,0],[2,0]];
 state={board,tray:[{cells,color:2},null,null],score:0,lines:0,chain:0,turn:0,gravity:direction,practiceDirection:direction};render();status(`Fill the outlined gap. Gravity will pull ${direction}.`,true);
}
function leavePractice(){if(busy||!parked)return;state=parked.state;previous=parked.previous;parked=null;practice=false;selected=null;render();status('Drag blocks onto the board');}
function practiceComplete(){openModal(`<h2>2× COMBO!</h2><p>The first clear pulled the blocks <strong>${state.gravity}</strong> into another full line. That second clear scored double.</p><p>Set up the next landing before you place.</p><button class="new-button" id="practice-done">Back to my game</button><button class="modal-secondary" id="practice-repeat">Try another direction</button>`);$('practice-done').onclick=()=>{$('modal').close();leavePractice();};$('practice-repeat').onclick=()=>{leavePractice();showPracticeMenu();};}
function showPracticeMenu(){openModal('<h2>Try gravity</h2><p>Choose a direction, then fill the outlined gap with the orange shape. Your current game is saved.</p><div class="practice-directions">'+directions.map(d=>`<button class="new-button" data-direction="${d}">${d[0].toUpperCase()+d.slice(1)}</button>`).join('')+'</div>');$('modal-content').querySelectorAll('[data-direction]').forEach(button=>button.onclick=()=>{const d=button.dataset.direction;$('modal').close();if(practice)leavePractice();enterPractice(d);});}
function showRules(){openModal(`<h2>How to play</h2><p>Drag shapes onto the board. Fill a row or column to clear it. You can also tap a shape, then tap its top-left placement cell.</p><p><strong>Clears flip gravity toward their nearest edge.</strong> The preview arrow shows the direction before you place.</p><div class="gravity-guide">${[['up','Top rows'],['down','Bottom rows'],['left','Left columns'],['right','Right columns']].map(([d,label])=>`<div><svg viewBox="0 0 24 24" aria-hidden="true" style="transform:rotate(${arrowRotation[d]}deg)"><path d="M12 4v16m-6-6 6 6 6-6"/></svg>${label}</div>`).join('')}</div><p>On simultaneous clears, the closest edge wins. Equal-distance ties keep the current direction when possible; otherwise the order is up, down, left, right.</p><p>Chain clears score 2×, 3× and beyond. An empty board earns +500. <strong>There is no finish line:</strong> keep playing until none of your remaining shapes fits.</p><div class="modal-stats"><div><span>Lines this run</span><strong>${state.lines}</strong></div><div><span>Best combo</span><strong>${state.chain}×</strong></div></div><button class="new-button" id="rules-demo">Try a gravity combo</button><button class="modal-secondary" id="keyboard-help">Keyboard controls</button>`);$('rules-demo').onclick=showPracticeMenu;$('keyboard-help').onclick=showKeyboard;}
function showKeyboard(){openModal('<h2>Keyboard controls</h2><table class="keyboard-table"><tr><td>1 / 2 / 3</td><td>Select a shape and focus the board</td></tr><tr><td>Arrow keys</td><td>Move the placement cursor</td></tr><tr><td>Space / Enter</td><td>Place the selected shape</td></tr><tr><td>Escape</td><td>Deselect the shape</td></tr></table><p>The cursor marks the shape’s top-left corner.</p>');}
function updateCursor(){$('cursor').hidden=false;$('cursor').style.setProperty('--x',cursor.x);$('cursor').style.setProperty('--y',cursor.y);$('board').setAttribute('aria-activedescendant',`cell-${cursor.y*8+cursor.x}`);preview(cursor.x,cursor.y);}
document.addEventListener('keydown',e=>{
 if($('modal').open||e.ctrlKey||e.metaKey||e.altKey||e.target.tagName==='SELECT')return;
 if(['1','2','3'].includes(e.key)){e.preventDefault();keyboardMode=true;selectPiece(Number(e.key)-1);$('board').focus();updateCursor();return;}
 if(e.key==='Escape'){selected=null;keyboardMode=false;clearGhost();$('cursor').hidden=true;renderTray();return;}
 if(document.activeElement!==$('board')||busy)return;
 const direction={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
 if(direction){e.preventDefault();keyboardMode=true;cursor.x=Math.max(0,Math.min(7,cursor.x+direction[0]));cursor.y=Math.max(0,Math.min(7,cursor.y+direction[1]));updateCursor();}
 if(e.key===' '||e.key==='Enter'){e.preventDefault();makeMove(cursor.x,cursor.y);}
});
$('new-game').onclick=()=>{if(practice){leavePractice();return;}if(state.turn===0){newGame();return;}openModal('<h2>Start a new game?</h2><p>Your current run will end. Your personal best is saved.</p><button class="new-button" id="confirm-new">New game</button>');$('confirm-new').onclick=()=>{$('modal').close();newGame();};};
$('undo').onclick=undo;$('leave-practice').onclick=leavePractice;$('help').onclick=showRules;$('close-modal').onclick=()=>$('modal').close();
$('sound').onclick=()=>{sound=!sound;$('sound').setAttribute('aria-pressed',String(sound));$('sound').setAttribute('aria-label',sound?'Turn sound off':'Turn sound on');$('sound-waves').setAttribute('d',sound?'M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14':'m16 9 5 6m0-6-5 6');if(sound)tone('clear');};
$('modal').addEventListener('click',e=>{if(e.target!==$('modal'))return;const r=$('modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('modal').close();});
const stored=read('aftershock-session',null);state=validState(stored)?stored:fresh();if(!directions.includes(state.gravity))state.gravity='down';if(state.tray.every(p=>p===null))state.tray=createTray(state.board);best=Math.max(best,state.score);render();save();if(!hasMoves(state.board,state.tray))gameOver();
