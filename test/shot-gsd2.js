// screenshot v2 z logowaniem postępu
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const PORT = 9344;
function cdp(ws, id, method, params = {}) {
  return new Promise((res, rej) => {
    const cb = (d) => { const m = JSON.parse(d.toString()); if (m.id === id) { ws.removeEventListener('message', cb); m.error ? rej(new Error(method)) : res(m.result); } };
    ws.on('message', cb); ws.send(JSON.stringify({ id, method, params }));
  });
}
async function main() {
  console.log('spawning chrome');
  const chrome = spawn('chromium', ['--headless=new','--no-sandbox','--disable-gpu',`--remote-debugging-port=${PORT}`,'--window-size=1280,800','about:blank'], {stdio:'ignore'});
  await new Promise(r=>setTimeout(r,2500));
  console.log('chrome up');
  const targets = await new Promise((res,rej)=>http.get(`http://127.0.0.1:${PORT}/json`,r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(JSON.parse(d)));}).on('error',rej));
  const page = targets.find(t=>t.type==='page');
  const WebSocket = (await import('ws')).default;
  const ws = new WebSocket(page.webSocketDebuggerUrl,{perMessageDeflate:false});
  ws.on('error', e=>console.error('ws err', e.message));
  await new Promise((res,rej)=>{ws.on('open',res);ws.on('error',rej);});
  console.log('ws open');
  let idc=1;
  const ev = async (e)=>{console.log('eval:',e.slice(0,60).replace(/\n/g,' ')); const r=(await cdp(ws,idc++,'Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true})).result; console.log('->',JSON.stringify(r.value??r).slice(0,120)); return r;};
  await cdp(ws,idc++,'Runtime.enable');
  await cdp(ws,idc++,'Page.navigate',{url:'http://127.0.0.1:8765/newtab.html'});
  await new Promise(r=>setTimeout(r,1500));
  console.log('nav done');
  await ev(`(async () => {
    window.confirm = () => true;
    const realFetch = window.fetch.bind(window);
    window.fetch = (u, o) => String(u).includes('dropboxapi.com')
      ? new Response(JSON.stringify({id:'x'}), {status:200})
      : realFetch(u, o);
    const res = await fetch('/test/backup-real.group_speed_dial');
    const txt = await res.text();
    importJson(new File([txt], 'b.group_speed_dial'));
    'import-done'
  })()`);
  await new Promise(r=>setTimeout(r,2000));
  console.log('import done');
  await ev(`document.querySelector('#btn-settings').click()`);
  await new Promise(r=>setTimeout(r,400));
  console.log('menu clicked');
  const shot = await cdp(ws,idc++,'Page.captureScreenshot',{format:'png'});
  fs.writeFileSync('/home/ubuntu/.hermes/cache/scratch/dial-gsd.png', Buffer.from(shot.data,'base64'));
  console.log('saved', fs.statSync('/home/ubuntu/.hermes/cache/scratch/dial-gsd.png').size, 'bytes');
  chrome.kill(); process.exit(0);
}
setTimeout(() => { console.error('hard timeout'); process.exit(1); }, 45000);
main().catch(e=>{console.error('main err',e.message);process.exit(1);});
