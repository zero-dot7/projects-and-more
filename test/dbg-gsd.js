const { spawn } = require('child_process');
const http = require('http');
const PORT = 9341;
function cdp(ws, id, method, params = {}) {
  return new Promise((res, rej) => {
    const cb = (d) => { const m = JSON.parse(d.toString()); if (m.id === id) { ws.removeEventListener('message', cb); m.error ? rej(new Error(method)) : res(m.result); } };
    ws.on('message', cb); ws.send(JSON.stringify({ id, method, params }));
  });
}
async function main() {
  const chrome = spawn('chromium', ['--headless=new','--no-sandbox','--disable-gpu',`--remote-debugging-port=${PORT}`,'about:blank'], {stdio:'ignore'});
  await new Promise(r=>setTimeout(r,2000));
  const targets = await new Promise((res,rej)=>http.get(`http://127.0.0.1:${PORT}/json`,r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(JSON.parse(d)));}).on('error',rej));
  const page = targets.find(t=>t.type==='page');
  const WebSocket = (await import('ws')).default;
  const ws = new WebSocket(page.webSocketDebuggerUrl,{perMessageDeflate:false});
  await new Promise(r=>ws.on('open',r));
  let idc=1;
  const ev = async (e)=>(await cdp(ws,idc++,'Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true})).result;
  await cdp(ws,idc++,'Runtime.enable');
  const errs=[]; ws.on('message',d=>{const m=JSON.parse(d.toString()); if(m.method==='Runtime.exceptionThrown') errs.push(JSON.stringify(m.params.exceptionDetails).slice(0,400));});
  await cdp(ws,idc++,'Page.navigate',{url:'http://127.0.0.1:8765/test/test.html'});
  await new Promise(r=>setTimeout(r,1500));
  let r = await ev(`
    window.__log=[];
    window.confirm=(m)=>{window.__log.push('confirm:'+m);return true;};
    window.alert=(m)=>{window.__log.push('alert:'+m);};
    save = () => { window.__log.push('save-stub, state.groups='+JSON.stringify(state.groups.map(g=>g.name))); };
    try {
      const sample={dataVersion:39,groups:[{id:'A',name:' Grupa A ',dials:[{name:'  Wiki  ',url:'https://wikipedia.org'},{},{name:'',url:'chrome://settings'}]},{id:'B',name:'Archiwum',archived:true,dials:[{name:'stara',url:'https://old.example.com'}]},{id:'C',name:'Z',dials:[{name:'Imgur',url:'https://imgur.com'}]}],___thumbnails:[{url:'https://wikipedia.org',group:'A',img:'data:image/png;base64,AAA'}]};
      importJson(new File([JSON.stringify(sample)],'b.group_speed_dial'));
      'started'
    } catch(e){ 'sync-err: '+e.message }
  `);
  console.log('immediate:', JSON.stringify(r.value ?? r));
  await new Promise(r=>setTimeout(r,500));
  r = await ev('JSON.stringify(window.__log)');
  console.log('log:', r.value);
  console.log('exceptions:', errs.length ? errs : 'none');
  chrome.kill(); process.exit(0);
}
main().catch(e=>{console.error(e.message);process.exit(1);});
