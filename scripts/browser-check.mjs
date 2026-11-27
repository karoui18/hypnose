// Dependency-free browser checks. Node 22+ and Chrome/Chromium required.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'hypnosite-qa-'));
const browser=process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.jpg':'image/jpeg','.png':'image/png','.woff':'font/woff','.pdf':'application/pdf'};
const server=http.createServer((req,res)=>{
  const name=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!name.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',types[path.extname(name)]||'application/octet-stream');res.end(fs.readFileSync(name));}
  catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
const child=spawn(browser,['--headless=new','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${profile}`],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let socket;
const results=[];
try{
  const portFile=path.join(profile,'DevToolsActivePort');
  for(let i=0;i<150&&!fs.existsSync(portFile);i++)await sleep(100);
  const port=Number(fs.readFileSync(portFile,'utf8').split('\n')[0]);
  const version=await(await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  socket=new WebSocket(version.webSocketDebuggerUrl);
  await new Promise(r=>socket.addEventListener('open',r,{once:true}));
  let next=0;const pending=new Map();
  socket.addEventListener('message',event=>{const msg=JSON.parse(event.data);if(msg.id){pending.get(msg.id)?.(msg);pending.delete(msg.id);}});
  const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++next;pending.set(id,msg=>msg.error?reject(Error(msg.error.message)):resolve(msg.result));socket.send(JSON.stringify({id,method,params,sessionId}));});
  const {targetId}=await send('Target.createTarget',{url:'about:blank'});
  const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
  const cmd=(m,p)=>send(m,p,sessionId);
  const evaluate=async expression=>{const r=await cmd('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  await cmd('Page.enable');
  // Exercise original pages after authenticating through the new access screen.
  await cmd('Page.navigate',{url:`${origin}/acces.html`});
  await sleep(400);
  await evaluate(`document.querySelector('#password').value='SebRocks!2026';document.querySelector('#access-form').requestSubmit()`);
  await sleep(400);
  const representatives=['index','formulaire','tests','anxiete'];
  const pages=fs.readdirSync(root).filter(p=>p.endsWith('.html')&&!['acces.html','questionnaire.html'].includes(p)).map(p=>p.slice(0,-5));
  for(const page of pages){
    for(const width of representatives.includes(page)?[1440,1024,768,390]:[390]){
      await cmd('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
      await cmd('Page.navigate',{url:`${origin}/${page}.html`});
      await sleep(400);
      await evaluate('document.fonts.ready');
      await evaluate('Promise.all([...document.images].map(i=>i.complete?Promise.resolve():new Promise(r=>{i.onload=r;i.onerror=r})))');
      const check=await evaluate(`({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,brokenImages:[...document.images].filter(i=>!i.naturalWidth).map(i=>i.src),missingNames:[...document.querySelectorAll('a')].filter(a=>!a.textContent.trim()&&!a.getAttribute('aria-label')&&!a.querySelector('img[alt]:not([alt=""])')).length})`);
      if(width===390){
        check.menu=await evaluate(`(()=>{const b=document.querySelector('[aria-controls="mobile-menu"]');b.click();const open=!document.getElementById('mobile-menu').hidden&&b.getAttribute('aria-expanded')==='true';document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));return open&&document.getElementById('mobile-menu').hidden})()`);
      }
      if(page==='formulaire'){
        const formCheck=await evaluate(`(()=>{const f=document.getElementById('message-form');return f&&f.querySelector('[type="email"]').required&&f.querySelector('textarea').required&&!f.checkValidity()})()`);
        check.formValidation=!!formCheck;
      }
      results.push({page,width,...check});
      const {data}=await cmd('Page.captureScreenshot',{format:'png'});
      fs.writeFileSync(path.join(root,'qa',`${page}-${width}.png`),Buffer.from(data,'base64'));
      if(page==='index'&&width===1440){
        const {data:full}=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:1440,height:7644,scale:1}});
        fs.writeFileSync(path.join(root,'qa','desktop-final.png'),Buffer.from(full,'base64'));
      }
    }
  }
  fs.writeFileSync(path.join(root,'qa','browser-check.json'),JSON.stringify(results,null,2));
  const failed=results.filter(r=>r.scrollWidth>r.width||r.brokenImages.length||r.missingNames||r.menu===false||r.formValidation===false);
  console.log(JSON.stringify({cases:results.length,failed},null,2));
  if(failed.length)process.exitCode=1;
}finally{
  socket?.close();child.kill();server.close();
  await sleep(500);fs.rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});
}
