const {test, after} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const handler = require('../api/registrations.js');
const originalFetch = global.fetch;
const originalEnv = {...process.env};
after(() => { global.fetch = originalFetch; process.env = originalEnv; });
const eventId = '12345678-1234-4123-8123-123456789abc';
const valid = {business:'Test Business',phone:'+916386609425',source:'Packaging',eventId};
async function invoke(overrides={}) {
  const req = {method:'POST',headers:{origin:'https://lets-connect-pi.vercel.app','content-type':'application/json'},body:valid,...overrides};
  const res = {code:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
  await handler(req,res); return res;
}
test('backend validates input, origin, configuration, and confirmed saves',async()=>{
  delete process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  delete process.env.GOOGLE_SHEETS_WEBHOOK_SECRET;
  assert.equal((await invoke({method:'GET'})).code,405);
  assert.equal((await invoke({headers:{origin:'https://unrelated.example','content-type':'application/json'}})).code,403);
  assert.equal((await invoke({body:{...valid,phone:'6386609425'}})).code,400);
  assert.equal((await invoke({body:{...valid,eventId:'bad'}})).code,400);
  assert.equal((await invoke({body:{...valid,business:'x'.repeat(5000)}})).code,400);
  assert.equal((await invoke()).code,503);
  process.env.GOOGLE_SHEETS_WEBHOOK_URL='https://script.google.com/macros/s/test/exec';
  process.env.GOOGLE_SHEETS_WEBHOOK_SECRET='test-only-secret-'.repeat(4);
  global.fetch=async(url,options)=>{
    const payload=JSON.parse(options.body);
    assert.equal(payload.phone,valid.phone);
    assert.equal(payload.inquiry,undefined);
    assert.equal(payload.secret,process.env.GOOGLE_SHEETS_WEBHOOK_SECRET);
    return {ok:true,json:async()=>({ok:true,eventId})};
  };
  assert.equal((await invoke()).code,200);
  global.fetch=async()=>({ok:true,json:async()=>({ok:false})});
  assert.equal((await invoke()).code,502);
  global.fetch=async()=>({ok:true,json:async()=>({ok:true,eventId:'wrong'})});
  assert.equal((await invoke()).code,502);
  global.fetch=async()=>{throw new Error('timeout');};
  assert.equal((await invoke()).code,502);
});
test('Google receiver authenticates, stores literal text, and deduplicates retries',()=>{
  const rows=[]; let unlocked=0;
  const secret='test-only-secret-'.repeat(4);
  const context=vm.createContext({
    ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({text,setMimeType(){return this;}})},
    PropertiesService:{getScriptProperties:()=>({getProperty:key=>key==='WEBHOOK_SECRET'?secret:'test-sheet'})},
    LockService:{getScriptLock:()=>({tryLock:()=>true,hasLock:()=>true,releaseLock:()=>unlocked++})},
    SpreadsheetApp:{openById:()=>({getSheetByName:()=>({getLastRow:()=>1+rows.length,getRange:(row,col,n,w)=>({
      createTextFinder:id=>({matchEntireCell(){return this;},findNext:()=>rows.find(r=>r[4]===id)}),
      setNumberFormat(){return this;},setValues:values=>rows.push(...values)
    })})}),flush(){}},
    Utilities:{formatDate:()=> '2026-10-18 12:00:00'},console
  });
  vm.runInContext(fs.readFileSync(require.resolve('../google-apps-script/Code.gs'),'utf8'),context);
  const send=data=>JSON.parse(context.doPost({postData:{contents:JSON.stringify(data)}}).text);
  assert.equal(send({...valid,secret:'incorrect'}).ok,false); assert.equal(rows.length,0);
  assert.equal(send({...valid,business:'=IMPORTXML("url")',secret}).ok,true);
  assert.equal(rows[0][1],'\'=IMPORTXML("url")');
  assert.equal(rows[0][2],"'+916386609425");
  assert.equal(send({...valid,secret}).ok,true); assert.equal(rows.length,1);
  assert.equal(unlocked,2);
});
