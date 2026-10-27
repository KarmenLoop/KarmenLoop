import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { renderCard } from '../src/render.mjs';
const state={count:'1234',startedAt:'2026-10-27T00:00:00Z'};
const port=Number(process.env.PORT||55942);
createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,`http://127.0.0.1:${port}`);
    if(url.pathname==='/preview.gif'){
      const bytes=renderCard({...state,lang:url.searchParams.get('lang')||'en',theme:url.searchParams.get('theme')||'dark',animated:url.searchParams.get('motion')!=='static'});
      res.writeHead(200,{'Content-Type':'image/gif','Cache-Control':'no-store'});return res.end(bytes);
    }
    const files={'/':'index.html','/karmen-loop.gif':'karmen-loop.gif','/karmen-loop.png':'karmen-loop.png'};
    if(!files[url.pathname]){res.writeHead(404);return res.end();}
    const bytes=await readFile(new URL('../public/'+files[url.pathname],import.meta.url));
    res.writeHead(200,{'Content-Type':url.pathname.endsWith('.gif')?'image/gif':url.pathname.endsWith('.png')?'image/png':'text/html; charset=utf-8'});
    res.end(url.pathname==='/'?bytes.toString().replace('<h1>','<p class="note">Local preview / 本机预览 · Sample / 示例: 1,234</p><h1>'):bytes);
  }catch{res.writeHead(500);res.end('Preview unavailable');}
}).listen(port,'127.0.0.1',()=>console.log(`Read-only preview: http://127.0.0.1:${port}`));
