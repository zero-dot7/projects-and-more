// diagnoza z przechwyconym stderr chromia
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const PORT = 9353;
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
  const chrome = spawn('chromium', ['--headless=new','--no-sandbox','--disable-gpu',`--remote-debugging-port=${PORT}`,'--window-size=1280,800','about:blank'], {stdio:['ignore','pipe','pipe']});
  chrome.stderr.on('data', d => { const s = d.toString(); if (/crash|oom|kill|fatal|SIG|Check failed/i.test(s)) console.log('CHROME-STDERR:', s.slice(0,300).trim()); });
  chrome.on('exit', (code, sig) => console.log('CHROME EXIT:', code, sig));
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
  await ev('import', `(async () => {
    window.confirm = () => true;
    window.__err = null; window.alert = (m) => { window.__err = String(m); };
    window.addEventListener('unhandledrejection', e => { window.__rej = e.reason && (e.reason.stack || String(e.reason)); }); window.__stack = null; window.onerror=(m,s,l,c,e)=>{window.__stack=(e&&e.stack)||m+' @'+s+':'+l};
    const realFetch = window.fetch.bind(window);
    window.fetch = (u, o) => String(u).includes('dropboxapi.com') ? new Response('{}', {status:200}) : realFetch(u, o);
    const txt = await (await fetch('/test/backup-real.group_speed_dial')).text();
    importJson(new File([txt], 'b.group_speed_dial'));
    'import-called'
  })()`);
  await ev('ping2', '2+2');
  await new Promise(r=>setTimeout(r,10000));
  await new Promise(r=>setTimeout(r,8000));
  await ev('err?', `window.__err`);
  await ev('stack?', `window.__stack`);
  await ev('ping3', '3+3');
  await ev('tiles', `document.querySelectorAll('.tile').length`);
  chrome.kill(); process.exit(0);
}
setTimeout(() => { console.error('hard timeout'); process.exit(1); }, 60000);
main().catch(e=>{console.error('main err',e.message);process.exit(1);});
