// diagnoza: co blokuje renderer po imporcie realnego backupu
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const PORT = 9346;
function cdp(ws, id, method, params = {}) {
  return Promise.race([
    new Promise((_, rej) => setTimeout(() => rej(new Error('cdp-timeout:' + method)), 6000)),
    new Promise((res, rej) => {
      const cb = (d) => { const m = JSON.parse(d.toString()); if (m.id === id) { ws.removeEventListener('message', cb); m.error ? rej(new Error(method)) : res(m.result); } };
      ws.on('message', cb); ws.send(JSON.stringify({ id, method, params }));
    })
  ]);
}
async function main() {
  const chrome = spawn('chromium', ['--headless=new','--no-sandbox','--disable-gpu',`--remote-debugging-port=${PORT}`,'--window-size=1280,800','about:blank'], {stdio:'ignore'});
  await new Promise(r=>setTimeout(r,2500));
  const targets = await new Promise((res,rej)=>http.get(`http://127.0.0.1:${PORT}/json`,r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(JSON.parse(d)));}).on('error',rej));
  const page = targets.find(t=>t.type==='page');
  const WebSocket = (await import('ws')).default;
  const ws = new WebSocket(page.webSocketDebuggerUrl,{perMessageDeflate:false});
  await new Promise((res,rej)=>{ws.on('open',res);ws.on('error',rej);});
  let idc=1;
  const ev = async (label, e) => {
    try { const r = (await cdp(ws,idc++,'Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true})).result; console.log(label, '->', JSON.stringify(r.value ?? r.exceptionDetails?.text ?? r).slice(0,150)); }
    catch (err) { console.log(label, 'TIMEOUT/ERR:', err.message); }
  };
  await cdp(ws,idc++,'Runtime.enable');
  await cdp(ws,idc++,'Page.navigate',{url:'http://127.0.0.1:8765/newtab.html'});
  await new Promise(r=>setTimeout(r,1500));
  await ev('ping1', '1+1');
  await ev('import', `(async () => {
    window.confirm = () => true;
    const realFetch = window.fetch.bind(window);
    window.fetch = (u, o) => String(u).includes('dropboxapi.com') ? new Response('{}', {status:200}) : realFetch(u, o);
    const txt = await (await fetch('/test/backup-real.group_speed_dial')).text();
    importJson(new File([txt], 'b.group_speed_dial'));
    'import-called'
  })()`);
  await ev('ping2 (0s po imporcie)', '2+2');
  await new Promise(r=>setTimeout(r,3000));
  await ev('ping3 (3s)', '3+3');
  await new Promise(r=>setTimeout(r,5000));
  await ev('ping4 (8s)', '4+4');
  await ev('tiles rendered?', `document.querySelectorAll('.tile').length`);
  await ev('gear?', `!!document.querySelector('#btn-settings')`);
  chrome.kill(); process.exit(0);
}
setTimeout(() => { console.error('hard timeout'); process.exit(1); }, 50000);
main().catch(e=>{console.error('main err',e.message);process.exit(1);});
