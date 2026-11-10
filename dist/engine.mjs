export const SIZE=8;
export const emptyBoard=()=>Array(SIZE*SIZE).fill(0);
export const SHAPES=[
 [[0,0]],[[0,0],[1,0]],[[0,0],[0,1]],
 [[0,0],[1,0],[2,0]],[[0,0],[0,1],[0,2]],
 [[0,0],[1,0],[0,1],[1,1]],
 [[0,0],[0,1],[1,1]],[[1,0],[0,1],[1,1]],[[0,0],[1,0],[0,1]],[[0,0],[1,0],[1,1]],
 [[0,0],[1,0],[2,0],[3,0]],[[0,0],[0,1],[0,2],[0,3]],
 [[0,0],[1,0],[2,0],[1,1]],[[1,0],[0,1],[1,1],[2,1]],
 [[0,0],[0,1],[0,2],[1,2]],[[1,0],[1,1],[0,2],[1,2]],
 [[0,0],[1,0],[1,1],[2,1]],[[1,0],[2,0],[0,1],[1,1]],
 [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]],
 [[0,0],[1,0],[0,1],[1,1],[0,2],[1,2]],
 [[0,0],[1,0],[2,0],[3,0],[4,0]],[[0,0],[0,1],[0,2],[0,3],[0,4]],
 [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2]],
];
export function canPlace(board,piece,x,y){
 return Boolean(piece&&piece.cells.length&&Number.isInteger(x)&&Number.isInteger(y)&&piece.cells.every(([dx,dy])=>x+dx>=0&&x+dx<SIZE&&y+dy>=0&&y+dy<SIZE&&!board[(y+dy)*SIZE+x+dx]));
}
export function findLines(board){
 const rows=[],cols=[],cells=new Set();
 for(let n=0;n<SIZE;n++){
  if(Array.from({length:SIZE},(_,c)=>board[n*SIZE+c]).every(Boolean)){rows.push(n);for(let c=0;c<SIZE;c++)cells.add(n*SIZE+c);}
  if(Array.from({length:SIZE},(_,r)=>board[r*SIZE+n]).every(Boolean)){cols.push(n);for(let r=0;r<SIZE;r++)cells.add(r*SIZE+n);}
 }
 return {rows,cols,cells:[...cells]};
}
export function gravityForLines({rows,cols},current='down'){
 const candidates=[...rows.map(n=>({direction:n<4?'up':'down',distance:Math.min(n,7-n)})),...cols.map(n=>({direction:n<4?'left':'right',distance:Math.min(n,7-n)}))];
 if(!candidates.length)return current;
 const nearest=Math.min(...candidates.map(c=>c.distance));
 const tied=candidates.filter(c=>c.distance===nearest).map(c=>c.direction);
 return tied.includes(current)?current:['up','down','left','right'].find(d=>tied.includes(d));
}
export function fall(input,direction='down'){
 if(!['up','down','left','right'].includes(direction))throw new Error('Invalid gravity direction');
 const board=emptyBoard(),movements=[];
 for(let line=0;line<SIZE;line++){
  const indices=Array.from({length:SIZE},(_,n)=>direction==='up'?n*SIZE+line:direction==='down'?(7-n)*SIZE+line:direction==='left'?line*SIZE+n:line*SIZE+7-n);
  let target=0;
  for(const from of indices)if(input[from]){
   const to=indices[target++];board[to]=input[from];if(from!==to)movements.push({from,to,color:input[from]});
  }
 }
 return {board,movements};
}
export function place(input,piece,x,y,gravity='down'){
 let board=input.slice(),score=0,lines=0,chain=0;const frames=[];
 if(!canPlace(board,piece,x,y))return {valid:false,board,score,lines,chain,frames,perfect:false};
 const added=piece.cells.map(([dx,dy])=>(y+dy)*SIZE+x+dx);for(const i of added)board[i]=piece.color;
 score=10*added.length;frames.push({kind:'place',board:board.slice(),cells:added,score,chain:0,lines:0});
 while(true){
  const full=findLines(board);if(!full.cells.length)break;
  chain++;const count=full.rows.length+full.cols.length;lines+=count;score+=100*count*chain;
  gravity=gravityForLines(full,gravity);
  frames.push({kind:'clear',board:board.slice(),cells:full.cells,rows:full.rows,cols:full.cols,lines:count,chain,score,direction:gravity});
  for(const i of full.cells)board[i]=0;
  const before=board.slice(),fallen=fall(board,gravity);board=fallen.board;
  frames.push({kind:'fall',before,board:board.slice(),movements:fallen.movements,chain,score,direction:gravity});
 }
 const perfect=board.every(v=>!v);
 if(perfect){score+=500;frames.push({kind:'perfect',board:board.slice(),score,chain});}
 return {valid:true,board,score,lines,chain,frames,perfect,gravity};
}
export function placements(board,piece){
 const positions=[];for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)if(canPlace(board,piece,x,y))positions.push([x,y]);return positions;
}
export function hasMoves(board,tray){return tray.some(p=>p&&placements(board,p).length>0);}
export function createTray(board,random=Math.random){
 const pick=list=>list[Math.min(list.length-1,Math.floor(random()*list.length))];
 const build=cells=>({cells:cells.map(c=>c.slice()),color:1+Math.min(5,Math.floor(random()*6))});
 const tray=Array.from({length:3},()=>build(pick(SHAPES)));
 if(!hasMoves(board,tray)){
  const fitting=SHAPES.filter(cells=>placements(board,{cells}).length);
  if(fitting.length)tray[0]=build(pick(fitting));
 }
 return tray;
}
export function playTurn(input,slot,x,y,random=Math.random){
 const result=place(input.board,input.tray[slot],x,y,input.gravity||'down');
 if(!result.valid)return {valid:false,result,next:input,over:false};
 let tray=input.tray.slice();tray[slot]=null;
 if(tray.every(p=>p===null))tray=createTray(result.board,random);
 const next={...input,board:result.board,tray,score:input.score+result.score,lines:input.lines+result.lines,chain:Math.max(input.chain,result.chain),turn:input.turn+1,gravity:result.gravity};
 return {valid:true,result,next,over:!hasMoves(next.board,next.tray)};
}
