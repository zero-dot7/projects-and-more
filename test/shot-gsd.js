// screenshot: nowa karta z zaimportowanym realnym backupem + otwarte menu zębatki
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const PORT = 9343;
function cdp(ws, id, method, params = {}) {
  return new Promise((res, rej) => {
    const cb = (d) => { const m = JSON.parse(d.toString()); if (m.id === id) { ws.removeEventListener('message', cb); m.error ? rej(new Error(method)) : res(m.result); } };
    ws.on('message', cb); ws.send(JSON.stringify({ id, method, params }));
  });
}
async function main() {
  const chrome = spawn('chromium', ['--headless=new','--no-sandbox','--disable-gpu',`--remote-debugging-port=${PORT}`,'--window-size=1280,800','about:blank'], {stdio:'ignore'});
  await new Promise(r=>setTimeout(r,2000));
  const targets = await new Promise((res,rej)=>http.get(`http://127.0.0.1:${PORT}/json`,r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(JSON.parse(d)));}).on('error',rej));
  const page = targets.find(t=>t.type==='page');
  const WebSocket = (await import('ws')).default;
  const ws = new WebSocket(page.webSocketDebuggerUrl,{perMessageDeflate:false});
  await new Promise(r=>ws.on('open',r));
  let idc=1;
  const ev = async (e)=>(await cdp(ws,idc++,'Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true})).result;
  await cdp(ws,idc++,'Runtime.enable');
  await cdp(ws,idc++,'Page.navigate',{url:'http://127.0.0.1:8765/newtab.html'});
  await new Promise(r=>setTimeout(r,1200));
  await ev(`(async () => {
    window.confirm = () => true;
    const realFetch = window.fetch.bind(window);
    window.fetch = (u, o) => String(u).includes('dropboxapi.com')
      ? new Response(JSON.stringify({id:'x'}), {status:200})
      : realFetch(u, o);
    const res = await fetch('/test/backup-real.group_speed_dial');
    const txt = await res.text();
    importJson(new File([txt], 'b.group_speed_dial'));
  })()`);
  await new Promise(r=>setTimeout(r,2500));
  await ev(`document.querySelector('#btn-settings').click()`);
  await new Promise(r=>setTimeout(r,300));
  const shot = await cdp(ws,idc++,'Page.captureScreenshot',{format:'png'});
  fs.writeFileSync('/home/ubuntu/.hermes/cache/scratch/dial-gsd.png', Buffer.from(shot.data,'base64'));
  console.log('saved', fs.statSync('/home/ubuntu/.hermes/cache/scratch/dial-gsd.png').size, 'bytes');
  chrome.kill(); process.exit(0);
}
setTimeout(() => { console.error('hard timeout'); process.exit(1); }, 40000);
main().catch(e=>{console.error(e.message);process.exit(1);});
