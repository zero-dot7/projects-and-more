const { spawn } = require('child_process');
const http = require('http');
const PORT = 9336;
function cdp(ws, id, method, params = {}) {
  return new Promise((resolve, reject) => {
    const cb = (data) => { const m = JSON.parse(data); if (m.id === id) { ws.removeEventListener('message', cb); m.error ? reject(new Error(method)) : resolve(m.result); } };
    ws.on('message', cb); ws.send(JSON.stringify({ id, method, params }));
  });
}
(async () => {
  const chrome = spawn('chromium', ['--headless=new','--no-sandbox','--disable-gpu',`--remote-debugging-port=${PORT}`,'about:blank'],{stdio:'ignore'});
  await new Promise(r=>setTimeout(r,2000));
  const t = await new Promise((res,rej)=>http.get(`http://127.0.0.1:${PORT}/json`,r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(JSON.parse(d)));}).on('error',rej));
  const WebSocket = require('ws');
  const ws = new WebSocket(t.find(x=>x.type==='page').webSocketDebuggerUrl,{perMessageDeflate:false});
  await new Promise(r=>ws.on('open',r));
  ws.setMaxListeners(50); let idc=1;
  await cdp(ws,idc++,'Runtime.enable');
  await cdp(ws,idc++,'Network.enable');
  const fails=[];
  ws.on('message', d=>{ const m=JSON.parse(d);
    if(m.method==='Network.loadingFailed') fails.push(m.params.errorText+' '+m.params.type);
    if(m.method==='Network.requestWillBeSent' && m.params.type==='Script') console.log('script req:', m.params.request.url);
  });
  await cdp(ws,idc++,'Page.enable');
  await cdp(ws,idc++,'Page.navigate',{url:'http://127.0.0.1:8765/test/test.html'});
  await new Promise(r=>setTimeout(r,2000));
  console.log('failed:', fails);
  ws.close(); chrome.kill(); process.exit(0);
})().catch(e=>{console.error(e);process.exit(2);});
