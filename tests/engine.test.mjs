import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyBoard,canPlace,place,fall,findLines,hasMoves,createTray,SHAPES,gravityForLines,playTurn} from '../dist/engine.mjs';
const piece=(cells,color=2)=>({cells,color});
test('placement respects all four boundaries and rejects collisions',()=>{
 const b=emptyBoard(),p=piece([[0,0],[1,0]]);b[1]=1;
 assert.equal(canPlace(b,p,0,0),false);assert.equal(canPlace(b,p,7,7),false);assert.equal(canPlace(b,p,-1,0),false);assert.equal(canPlace(b,p,0,8),false);assert.equal(canPlace(b,p,2,2),true);
});
test('a placement with no line stays suspended and does not mutate its input',()=>{
 const b=emptyBoard();const r=place(b,piece([[0,0],[1,0]]),2,1);
 assert.equal(r.board[10],2);assert.equal(r.board[11],2);assert.equal(r.board[58],0);assert.equal(r.score,20);assert.equal(r.lines,0);assert.ok(b.every(v=>v===0));
});
test('illegal placements have no score, animation, or board change',()=>{
 const b=emptyBoard();b[0]=1;const r=place(b,piece([[0,0]]),0,0);assert.equal(r.valid,false);assert.deepEqual(r.board,b);assert.equal(r.score,0);assert.deepEqual(r.frames,[]);
});
test('row and column intersections clear once in a simultaneous wave',()=>{
 const b=emptyBoard();for(let i=0;i<8;i++){b[3*8+i]=1;b[i*8+4]=2;}b[3*8+4]=0;
 const r=place(b,piece([[0,0]]),4,3);const clear=r.frames.find(f=>f.kind==='clear');assert.equal(clear.cells.length,15);assert.equal(clear.lines,2);assert.equal(r.lines,2);assert.ok(r.board.every(v=>v===0));assert.equal(r.score,710);
});
test('gravity preserves column order and colors',()=>{
 const b=emptyBoard();b[1]=2;b[17]=3;b[41]=4;const r=fall(b);
 assert.equal(r.board[41],2);assert.equal(r.board[49],3);assert.equal(r.board[57],4);assert.equal(r.movements.length,3);assert.equal(b[1],2);
});
test('a clear releases floating squares into a second line and doubles its reward',()=>{
 const b=emptyBoard();for(let c=0;c<7;c++)b[56+c]=1;for(let c=0;c<8;c++)b[(c%3)*8+c]=2;
 const r=place(b,piece([[0,0]]),7,7);
 assert.equal(r.chain,2);assert.equal(r.lines,2);assert.equal(r.score,810);assert.deepEqual(r.frames.filter(f=>f.kind==='clear').map(f=>f.chain),[1,2]);assert.ok(r.board.every(v=>v===0));
});
test('clearing the leftmost column pulls other blocks left',()=>{
 const b=emptyBoard();for(let r=0;r<7;r++)b[r*8]=1;b[1]=3;
 const r=place(b,piece([[0,0]]),0,7);assert.equal(r.board[0],3);assert.equal(r.board[1],0);assert.equal(r.gravity,'left');
});
test('findLines includes all full rows and columns',()=>{
 const r=findLines(Array(64).fill(1));assert.equal(r.rows.length,8);assert.equal(r.cols.length,8);assert.equal(r.cells.length,64);
});
test('remaining tray pieces determine whether a run can continue',()=>{
 const b=Array(64).fill(1);b[0]=0;
 assert.equal(hasMoves(b,[piece([[0,0],[1,0]])]),false);assert.equal(hasMoves(b,[null,piece([[0,0]])]),true);assert.equal(hasMoves(b,[null,null,null]),false);
});
test('tray refill includes a fitting piece when a space exists',()=>{
 const b=Array(64).fill(1);b[63]=0;const tray=createTray(b,()=>.99);assert.equal(tray.length,3);assert.equal(hasMoves(b,tray),true);assert.ok(tray.every(p=>p.cells.length>0&&p.color>0));
});
test('an entirely full board cannot be rescued by tray generation',()=>{
 const b=Array(64).fill(1);assert.equal(hasMoves(b,createTray(b,()=>.5)),false);
});
test('every supplied shape has normalized unique integer coordinates',()=>{
 for(const cells of SHAPES){assert.ok(cells.length>0);assert.equal(Math.min(...cells.map(c=>c[0])),0);assert.equal(Math.min(...cells.map(c=>c[1])),0);assert.equal(new Set(cells.map(String)).size,cells.length);assert.ok(cells.every(c=>c.every(n=>Number.isInteger(n)&&n>=0&&n<8)));}
});
test('cleared line positions choose all four nearest edges',()=>{
 for(const [lines,expected] of [[{rows:[0],cols:[]},'up'],[{rows:[3],cols:[]},'up'],[{rows:[4],cols:[]},'down'],[{rows:[7],cols:[]},'down'],[{rows:[],cols:[0]},'left'],[{rows:[],cols:[3]},'left'],[{rows:[],cols:[4]},'right'],[{rows:[],cols:[7]},'right']])assert.equal(gravityForLines(lines),expected);
});
test('the closest edge wins simultaneous clears and ties preserve current gravity',()=>{
 assert.equal(gravityForLines({rows:[3],cols:[7]},'up'),'right');
 assert.equal(gravityForLines({rows:[0,7],cols:[]},'up'),'up');
 assert.equal(gravityForLines({rows:[0,7],cols:[0,7]},'left'),'left');
 assert.equal(gravityForLines({rows:[],cols:[]},'right'),'right');
 assert.equal(gravityForLines({rows:[0],cols:[0]},'down'),'up');
});
test('directional falls preserve the relative order of colors',()=>{
 for(const [direction,positions,expected] of [
  ['up',[17,33],[1,9]],['down',[17,33],[49,57]],['left',[18,21],[16,17]],['right',[18,21],[22,23]]
 ]){const b=emptyBoard();b[positions[0]]=2;b[positions[1]]=5;const result=fall(b,direction);assert.equal(result.board[expected[0]],2);assert.equal(result.board[expected[1]],5);assert.equal(result.board.filter(Boolean).length,2);assert.deepEqual(b.filter(Boolean),[2,5]);}
});
test('top and right clears animate in the same direction as their final board',()=>{
 for(const [kind,expected,target,origin] of [['row','up',0,40],['col','right',7,0]]){
  const b=emptyBoard();if(kind==='row'){for(let c=0;c<7;c++)b[c]=1;}else{for(let r=0;r<7;r++)b[r*8+7]=1;}
  b[origin]=3;const r=place(b,piece([[0,0]]),7,kind==='row'?0:7);
  assert.equal(r.gravity,expected);assert.equal(r.board[target],3);assert.equal(r.frames.find(f=>f.kind==='fall').direction,expected);
 }
});
test('a new tray replaces the last used piece and a high score never ends a run',()=>{
 const b=emptyBoard(),input={board:b,tray:[piece([[0,0]]),null,null],score:1000000,turn:99999,lines:999,chain:8,gravity:'right'};
 const result=playTurn(input,0,3,3,()=>0);assert.equal(result.valid,true);assert.equal(result.over,false);assert.equal(result.next.score,1000010);assert.equal(result.next.turn,100000);assert.equal(result.next.gravity,'right');assert.equal(result.next.tray.filter(Boolean).length,3);assert.equal(input.board[27],0);
});
test('an endless run continues across repeated clears and tray refills',()=>{
 let state={board:emptyBoard(),tray:createTray(emptyBoard(),()=>0),score:500000,turn:10000,lines:0,chain:0,gravity:'down'};
 for(let n=0;n<240;n++){const slot=state.tray.findIndex(Boolean),index=state.board.findIndex(v=>!v);const turn=playTurn(state,slot,index%8,Math.floor(index/8),()=>0);assert.equal(turn.over,false);state=turn.next;}
 assert.equal(state.turn,10240);assert.ok(state.lines>=30);assert.ok(state.score>500000);
});
test('a run ends only when none of the remaining tray shapes fits',()=>{
 const b=emptyBoard();b.forEach((_,i)=>{if((i%8+Math.floor(i/8))%2===0)b[i]=1;});
 const input={board:b,tray:[piece([[0,0]]),piece([[0,0],[1,0]]),null],score:0,turn:0,lines:0,chain:0,gravity:'down'};
 const result=playTurn(input,0,1,0);assert.equal(result.over,true);assert.equal(result.next.tray[0],null);assert.notEqual(result.next.tray[1],null);
});
