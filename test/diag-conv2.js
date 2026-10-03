// diagnoza: pełny stack błędu konwersji GSD na realnym backupie
const { spawn } = require('child_process');
const http = require('http');
const PORT = 9356;
function cdp(ws, id, method, params = {}) {
  return Promise.race([
    new Promise((_, rej) => setTimeout(() => rej(new Error('cdp-timeout:' + method)), 10000)),
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
    try { const rr = await cdp(ws,idc++,'Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true}); if (rr.exceptionDetails) { console.log('EXC:', JSON.stringify(rr.exceptionDetails).slice(0,900)); return; } const r = rr.result; console.log(label, '->', JSON.stringify(r).slice(0,800)); }
    catch (err) { console.log(label, 'TIMEOUT/ERR:', err.message); }
  };
  await cdp(ws,idc++,'Runtime.enable');
  await cdp(ws,idc++,'Page.navigate',{url:'http://127.0.0.1:8765/newtab.html'});
  await new Promise(r=>setTimeout(r,1500));
  await ev('conv', `(async () => {
    window.alert = m => { window.__err = String(m); };
    const txt = await (await fetch('/test/backup-real.group_speed_dial')).text();
    const data = JSON.parse(txt);
    try {
      const groups = convertGsd(data);
      'converted: ' + groups.length + ' groups, ' + groups.reduce((n,g)=>n+g.tiles.length,0) + ' tiles, thumbs=' + groups.reduce((n,g)=>n+g.tiles.filter(t=>t.thumb).length,0)
    } catch(e) { 'ERR: ' + e.stack }
  })()`);
  chrome.kill(); process.exit(0);
}
setTimeout(() => { console.error('hard timeout'); process.exit(1); }, 60000);
main().catch(e=>{console.error('main err',e.message);process.exit(1);});
