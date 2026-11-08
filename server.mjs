import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,relative,isAbsolute,extname} from 'node:path';
const root=resolve('dist');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');const path=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));const rel=relative(root,path);if(rel.startsWith('..')||isAbsolute(rel))throw Error();const data=await readFile(path);res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);}catch{res.writeHead(404);res.end('Not found');}}).listen(4174,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4174'));
