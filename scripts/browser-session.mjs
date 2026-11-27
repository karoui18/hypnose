import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function withBrowser(run){
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'hypno-interactive-'));
  const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.jpg':'image/jpeg','.png':'image/png','.woff':'font/woff','.pdf':'application/pdf'};
  const server=http.createServer((req,res)=>{
    const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    try{res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const child=spawn(process.env.CHROME_BIN||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--hide-scrollbars','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${profile}`],{stdio:'ignore'});
  let socket;
  try{
    const file=path.join(profile,'DevToolsActivePort');
    for(let i=0;i<150&&!fs.existsSync(file);i++)await sleep(100);
    const port=Number(fs.readFileSync(file,'utf8').split('\n')[0]);
    const version=await(await fetch(`http://127.0.0.1:${port}/json/version`)).json();
    socket=new WebSocket(version.webSocketDebuggerUrl);await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
    let next=0;const pending=new Map(),events=[];
    socket.addEventListener('message',event=>{const msg=JSON.parse(event.data);if(msg.id){pending.get(msg.id)?.(msg);pending.delete(msg.id);}else events.forEach(fn=>fn(msg));});
    const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++next;pending.set(id,msg=>msg.error?reject(Error(msg.error.message)):resolve(msg.result));socket.send(JSON.stringify({id,method,params,sessionId}));});
    const {targetId}=await send('Target.createTarget',{url:'about:blank'});
    const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
    const cmd=(method,params)=>send(method,params,sessionId);
    const evaluate=async expression=>{const r=await cmd('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||JSON.stringify(r.exceptionDetails));return r.result.value;};
    await cmd('Page.enable');await cmd('Runtime.enable');await cmd('Network.enable');
    const errors=[],requests=[];
    events.push(msg=>{if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails.text);if(msg.method==='Network.requestWillBeSent')requests.push({url:msg.params.request.url,method:msg.params.request.method});});
    const viewport=async(width,height=900)=>cmd('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
    const navigate=async page=>{await cmd('Page.navigate',{url:origin+'/'+page});await sleep(350);await evaluate('document.fonts.ready');};
    const screenshot=async name=>{const {data}=await cmd('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(root,'qa',name+'.png'),Buffer.from(data,'base64'));};
    await run({origin,cmd,evaluate,viewport,navigate,screenshot,errors,requests});
  }finally{socket?.close();child.kill();server.close();await sleep(500);fs.rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});}
}
