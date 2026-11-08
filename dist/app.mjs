import {SIZE,SHAPES,emptyBoard,canPlace,findLines,place,hasMoves,placements,createTray} from './engine.mjs';
const $=id=>document.getElementById(id);
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
const copy=value=>JSON.parse(JSON.stringify(value));
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const colors=['','lilac','peach','yellow','mint','blue','pink'];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let best=read('aftershock-best',0);if(!Number.isSafeInteger(best)||best<0)best=0;
let state,selected=null,busy=false,previous=null,practice=false,parked=null,drag=null,cursor={x:0,y:0},keyboardMode=false;
let sound=false,audio=null,pace=read('aftershock-pace','slow');
if(!['slow','normal','fast'].includes(pace))pace='slow';$('pace').value=pace;
const validPiece=p=>p===null||p&&Number.isInteger(p.color)&&p.color>=1&&p.color<=6&&Array.isArray(p.cells)&&SHAPES.some(s=>JSON.stringify(s)===JSON.stringify(p.cells));
function validState(s){return s&&Array.isArray(s.board)&&s.board.length===64&&s.board.every(v=>Number.isInteger(v)&&v>=0&&v<=6)&&Array.isArray(s.tray)&&s.tray.length===3&&s.tray.every(validPiece)&&['score','lines','chain','turn'].every(k=>Number.isSafeInteger(s[k])&&s[k]>=0);}
function fresh(){const board=emptyBoard();return {board,tray:createTray(board),score:0,lines:0,chain:0,turn:0};}
function save(){if(practice)return;write('aftershock-session',state);write('aftershock-best',best);}
function status(text,active=false){$('status').textContent=text;$('status').classList.toggle('chain-active',active);}
function tone(kind,depth=1){
 if(!sound)return;try{audio??=new AudioContext();audio.resume();const now=audio.currentTime;const notes=kind==='clear'?[260+depth*80,390+depth*90,520+depth*100]:kind==='perfect'?[523,659,784,1046]:[240];
 for(let i=0;i<notes.length;i++){const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=notes[i];g.gain.setValueAtTime(.035,now+i*.06);g.gain.exponentialRampToValueAtTime(.001,now+i*.06+.2);o.connect(g);g.connect(audio.destination);o.start(now+i*.06);o.stop(now+i*.06+.22);}}catch{}}
const backgroundCells=Array.from({length:64},(_,i)=>{const cell=document.createElement('div');cell.className='grid-cell';cell.id=`cell-${i}`;cell.setAttribute('role','gridcell');cell.setAttribute('aria-rowindex',String(Math.floor(i/8)+1));cell.setAttribute('aria-colindex',String(i%8+1));$('background-grid').append(cell);return cell;});
function renderBoard(board=state.board,marked=[],kind=''){
 const fragment=document.createDocumentFragment();
 board.forEach((color,i)=>{backgroundCells[i].setAttribute('aria-label',`Row ${Math.floor(i/8)+1}, column ${i%8+1}: ${color?colors[color]+' block':'empty'}`);if(!color)return;const tile=document.createElement('div');tile.className=`square color-${color}${marked.includes(i)?' '+kind:''}`;tile.style.setProperty('--x',i%8);tile.style.setProperty('--y',Math.floor(i/8));tile.dataset.cell=i;fragment.append(tile);});
 $('tile-layer').replaceChildren(fragment);backgroundCells.forEach((cell,i)=>cell.classList.toggle('practice-target',practice&&state.turn===0&&i>=61));
}
function shapeNode(p){
 const shape=document.createElement('span');shape.className='piece-shape';const w=Math.max(...p.cells.map(c=>c[0]))+1,h=Math.max(...p.cells.map(c=>c[1]))+1;shape.style.setProperty('--cols',w);shape.style.setProperty('--rows',h);
 p.cells.forEach(([x,y])=>{const block=document.createElement('span');block.className=`mini-square color-${p.color}`;block.style.gridColumn=x+1;block.style.gridRow=y+1;shape.append(block);});return shape;
}
function renderTray(){
 $('tray').replaceChildren();state.tray.forEach((p,i)=>{
  const button=document.createElement('button');button.className='piece-slot';button.dataset.slot=i;button.disabled=busy||!p;
  if(!p){button.classList.add('used');button.textContent='✓';button.setAttribute('aria-label',`Piece ${i+1} used`);}
  else{const w=Math.max(...p.cells.map(c=>c[0]))+1,h=Math.max(...p.cells.map(c=>c[1]))+1;button.setAttribute('aria-label',`Piece ${i+1}: ${colors[p.color]}, ${p.cells.length} squares, ${w} wide by ${h} tall`);button.setAttribute('aria-pressed',String(selected===i));button.classList.toggle('selected',selected===i);const fits=placements(state.board,p).length>0;button.classList.toggle('no-fit',!fits);const number=document.createElement('span');number.className='slot-number';number.textContent=String(i+1);button.append(number,shapeNode(p));button.addEventListener('pointerdown',e=>startDrag(e,i,button));button.addEventListener('click',e=>{if(e.detail===0)selectPiece(i);});}
  $('tray').append(button);
 });
 const left=state.tray.filter(Boolean).length;$('pieces-left').textContent=`${left} shape${left===1?'':'s'} left`;
}
function renderHUD(){
 $('score').textContent=state.score.toLocaleString();$('best').textContent=best.toLocaleString();$('lines').textContent=state.lines.toLocaleString();$('chain-record').textContent=state.chain?`${state.chain}×`:'—';$('undo').disabled=busy||!previous;$('new-game').disabled=busy;$('practice').disabled=busy||practice;$('leave-practice').hidden=!practice;$('leave-practice').disabled=busy;document.querySelector('.game').classList.toggle('practice-mode',practice);$('mode-badge').textContent=practice?'Practice':'Classic';
}
function render(){renderBoard();renderTray();renderHUD();clearGhost();}
function clearGhost(){$('ghost-layer').replaceChildren();backgroundCells.forEach(c=>c.classList.remove('line-preview'));}
function preview(x,y){
 clearGhost();if(busy||selected===null||!state.tray[selected])return;
 const p=state.tray[selected],valid=canPlace(state.board,p,x,y),fragment=document.createDocumentFragment();
 for(const [dx,dy] of p.cells){const xx=x+dx,yy=y+dy;if(xx<0||xx>=8||yy<0||yy>=8)continue;const tile=document.createElement('div');tile.className=`square ghost color-${p.color}${valid?'':' invalid'}`;tile.style.setProperty('--x',xx);tile.style.setProperty('--y',yy);fragment.append(tile);}
 $('ghost-layer').append(fragment);
 if(valid){const simulated=state.board.slice();for(const [dx,dy] of p.cells)simulated[(y+dy)*8+x+dx]=p.color;findLines(simulated).cells.forEach(i=>backgroundCells[i].classList.add('line-preview'));}
}
function selectPiece(index){
 if(busy||!state.tray[index])return;selected=index;renderTray();if(keyboardMode)preview(cursor.x,cursor.y);
 status(placements(state.board,state.tray[index]).length?`Shape ${index+1} selected. Tap a cell to place its top-left corner.`:'That shape has no room yet. Try another to clear some space.');
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
 status(`Shape ${index+1} selected. Drag to the board, or tap a cell to place.`);
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
function timing(){return {slow:{clear:650,fall:500,pause:240},normal:{clear:420,fall:350,pause:160},fast:{clear:220,fall:220,pause:100}}[pace];}
async function animateFall(frame,duration){
 renderBoard(frame.before);const gap=parseFloat(getComputedStyle($('board')).getPropertyValue('--gap')),step=($('board').getBoundingClientRect().width+gap)/8;
 if(!reduced.matches)for(const m of frame.movements){const tile=$('tile-layer').querySelector(`[data-cell="${m.from}"]`);tile?.animate([{transform:'translateY(0)'},{transform:`translateY(${(m.to-m.from)/8*step}px)`}],{duration,easing:'cubic-bezier(.45,0,.55,1)',fill:'forwards'});}
 else renderBoard(frame.board);
 await delay(frame.movements.length?duration:120);renderBoard(frame.board);
}
async function makeMove(x,y){
 if(busy||$('modal').open)return;if(selected===null){status('Choose a shape from the tray first.');return;}
 const p=state.tray[selected];if(!p)return;const result=place(state.board,p,x,y);
 if(!result.valid){status('A little tight. Find an empty space for the whole shape.');tone('miss');return;}
 previous=copy(state);const baseScore=state.score,baseLines=state.lines;let cleared=0;
 state.tray[selected]=null;selected=null;busy=true;clearGhost();$('cursor').hidden=true;keyboardMode=false;renderTray();renderHUD();
 const speed=timing();document.documentElement.style.setProperty('--clear-time',`${speed.clear}ms`);
 try{
 for(const f of result.frames){
  state.score=baseScore+f.score;
  if(f.kind==='place'){renderBoard(f.board,f.cells,'placed');tone('place');if(result.lines)await delay(160);}
  if(f.kind==='clear'){
   cleared+=f.lines;state.lines=baseLines+cleared;state.chain=Math.max(state.chain,f.chain);renderBoard(f.board,f.cells,'clearing');
   $('gravity-state').textContent=f.chain>1?`Aftershock ${f.chain}×`:'Gravity waking up';$('gravity-light').classList.add('active');$('board-note').textContent=`${f.lines} line${f.lines===1?'':'s'} × ${f.chain} multiplier`;
   status(f.chain>1?`Aftershock! The fall made ${f.lines} more line${f.lines===1?'':'s'}. ${f.chain}× points.`:`${f.lines} line${f.lines===1?'':'s'} complete. Watch what falls next.`,true);
   if(f.chain>1){showBanner(`${f.chain}× AFTERSHOCK`,`${100*f.lines*f.chain} points`);if(!reduced.matches){document.querySelector('.board-frame').classList.remove('aftershock');void $('board').offsetWidth;document.querySelector('.board-frame').classList.add('aftershock');}}
   tone('clear',f.chain);renderHUD();await delay(speed.clear);hideBanner();
  }
  if(f.kind==='fall'){$('gravity-state').textContent='Gravity doing its thing';status('Every square falls straight down. Another line?',true);await animateFall(f,speed.fall);await delay(speed.pause);}
  if(f.kind==='perfect'){showBanner('CLEAN SLATE','Whole board cleared. +500');status('Nothing left standing. +500 clean-slate bonus.',true);tone('perfect');renderHUD();await delay(900);hideBanner();}
  renderHUD();
 }
 state.board=result.board;state.score=baseScore+result.score;state.lines=baseLines+result.lines;state.chain=Math.max(state.chain,result.chain);state.turn++;
 if(!practice)best=Math.max(best,state.score);
 if(state.tray.every(p=>p===null))state.tray=createTray(state.board);
 save();
 }finally{busy=false;hideBanner();$('gravity-state').textContent='Gravity on standby';$('gravity-light').classList.remove('active');$('board-note').textContent='Fill a line. Feel the aftershock.';render();}
 if(practice){status(result.chain>1?'That’s an aftershock. You set up both clears with one shape.':'Try filling the bottom row with the peach bar.',result.chain>1);if(result.chain>1)practiceComplete();return;}
 status(result.perfect?'Clean slate. A fresh canvas for your next big idea.':result.chain>1?`${result.chain}× aftershock. Nicely engineered.`:result.lines?'Clear, collapse, breathe. What’s your next move?':'Looking good. Fill a row or column to wake up gravity.',result.chain>1);
 if(!hasMoves(state.board,state.tray))gameOver();
}
function openModal(html){$('modal-content').innerHTML=html;if(!$('modal').open)$('modal').showModal();}
function gameOver(){openModal(`<span class="modal-tag">A very respectable pile of blocks</span><h2>That’s a wrap.</h2><span class="final-score">${state.score.toLocaleString()}</span><p>${state.score>=best&&state.score>0?'A personal best. Gravity sends its regards.':'No room for the remaining shapes. A fresh board awaits.'}</p><div class="modal-stats"><div><span>Lines cleared</span><strong>${state.lines}</strong></div><div><span>Biggest chain</span><strong>${state.chain}×</strong></div></div><button class="new-button" id="play-again">One more game <span>↗</span></button>${previous?'<button class="modal-secondary" id="undo-over">Undo the last placement</button>':''}`);$('play-again').onclick=()=>{$('modal').close();newGame();};if($('undo-over'))$('undo-over').onclick=()=>{$('modal').close();undo();};}
function newGame(){if(busy)return;practice=false;parked=null;previous=null;selected=null;state=fresh();render();status('Pick a shape. Find its happy place.');save();}
function undo(){if(busy||!previous)return;state=previous;previous=null;selected=null;render();save();status('One step back. The big idea is still yours.');}
function enterPractice(){
 if(busy||practice)return;parked={state:copy(state),previous:previous?copy(previous):null};practice=true;previous=null;selected=0;
 const board=emptyBoard();for(let c=0;c<5;c++)board[56+c]=4;for(let c=0;c<8;c++)board[(2+Math.floor(c/2))*8+c]=1+(Math.floor(c/2)%3);
 state={board,tray:[{cells:[[0,0],[1,0],[2,0]],color:2},null,null],score:0,lines:0,chain:0,turn:0};render();status('Place the peach bar in the three outlined spaces at the bottom.',true);$('board-note').textContent='A single placement. Two clears. Watch closely.';$('board').scrollIntoView({block:'center',behavior:reduced.matches?'instant':'smooth'});
}
function leavePractice(){if(busy||!parked)return;state=parked.state;previous=parked.previous;parked=null;practice=false;selected=null;render();status('Back to your game. Gravity is waiting.');}
function practiceComplete(){openModal('<span class="modal-tag">One placement. A very satisfying consequence.</span><h2>That’s an aftershock.</h2><p>You filled the bottom row. It cleared, the blocks above fell into another full row, and that row cleared for <strong>double points</strong>.</p><p>The trick is setting up what happens <strong>after</strong> the first clear.</p><button class="new-button" id="practice-done">Let me try for real <span>↗</span></button><button class="modal-secondary" id="practice-repeat">Watch it again</button>');$('practice-done').onclick=()=>{$('modal').close();leavePractice();};$('practice-repeat').onclick=()=>{$('modal').close();leavePractice();enterPractice();};}
function showRules(){openModal('<span class="modal-tag">Familiar shapes. A new twist.</span><h2>Meet gravity.</h2><p><strong>Place:</strong> Drag one of your three shapes to any empty space. You can also tap a shape, then tap where its top-left corner should go.</p><p><strong>Clear:</strong> Complete a row or column. All full lines clear together. Only a clear wakes gravity: the remaining squares fall straight down.</p><p><strong>Chain:</strong> If the fall completes another line, it clears for 2× points. Further waves earn 3×, 4×, and so on.</p><p>You get 10 points per placed square, 100 per cleared line × its chain multiplier, and 500 for an empty board. New shapes arrive after you use all three. No remaining shape fits? The run ends.</p><button class="new-button" id="rules-demo">Show me an aftershock <span>↗</span></button>');$('rules-demo').onclick=()=>{$('modal').close();if(!practice)enterPractice();};}
function showKeyboard(){openModal('<span class="modal-tag">Hands on the keys</span><h2>Pick. Point. Place.</h2><table class="keyboard-table"><tr><td>1 / 2 / 3</td><td>Select a tray shape</td></tr><tr><td>Arrow keys</td><td>Move the placement cursor</td></tr><tr><td>Space / Enter</td><td>Place the selected shape</td></tr><tr><td>Escape</td><td>Deselect the shape</td></tr></table><p>You can also Tab to a shape, select it with Enter, then Tab to the board. The cursor marks the shape’s top-left corner.</p>');}
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
$('new-game').onclick=()=>{if(practice){leavePractice();return;}if(state.turn===0){newGame();return;}openModal('<span class="modal-tag">A fresh start?</span><h2>New board. New ideas.</h2><p>Your current run will end. Your personal best stays with you.</p><button class="new-button" id="confirm-new">Start a new game <span>↗</span></button>');$('confirm-new').onclick=()=>{$('modal').close();newGame();};};
$('undo').onclick=undo;$('practice').onclick=enterPractice;$('leave-practice').onclick=leavePractice;$('help').onclick=showRules;$('keyboard-help').onclick=showKeyboard;$('close-modal').onclick=()=>$('modal').close();
$('sound').onclick=()=>{sound=!sound;$('sound').setAttribute('aria-pressed',String(sound));$('sound').setAttribute('aria-label',sound?'Turn sound off':'Turn sound on');$('sound-waves').setAttribute('d',sound?'M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14':'m16 9 5 6m0-6-5 6');if(sound)tone('clear');};
$('pace').onchange=()=>{pace=$('pace').value;write('aftershock-pace',pace);};
$('modal').addEventListener('click',e=>{if(e.target!==$('modal'))return;const r=$('modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('modal').close();});
const stored=read('aftershock-session',null);state=validState(stored)?stored:fresh();if(state.tray.every(p=>p===null))state.tray=createTray(state.board);best=Math.max(best,state.score);render();save();if(!hasMoves(state.board,state.tray))gameOver();
