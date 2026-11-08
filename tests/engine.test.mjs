import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyBoard,canPlace,place,fall,findLines,hasMoves,createTray,SHAPES} from '../dist/engine.mjs';
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
test('a column clear triggers gravity in the other columns too',()=>{
 const b=emptyBoard();for(let r=0;r<7;r++)b[r*8]=1;b[1]=3;
 const r=place(b,piece([[0,0]]),0,7);assert.equal(r.board[57],3);assert.equal(r.board[1],0);
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
