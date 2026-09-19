/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test'), assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), ts = require('typescript');
function route(fetcher, token='test-operator') {
 const exports={};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/api/stream/sync/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
  exports,Buffer,AbortSignal,process:{env:{STREAM_CONTROL_TOKEN:token}},fetch:fetcher,
  require:name=>name==='next/server'?{NextResponse:{json:(body,init)=>Response.json(body,init)}}:require(name),
 });return exports;
}
function request(body,token='test-operator') {return new Request('http://localhost/api/stream/sync',{method:'POST',headers:{'Content-Type':'application/json','x-stream-control-token':token},body:JSON.stringify(body)});}
test('public response strips secret even from old engine',async()=>{
 const response=await route(async()=>Response.json({youtube_key:'secret-key',youtube_enabled:true})).GET();const data=await response.json();
 assert.equal(data.youtube_key,undefined);assert.equal(data.youtube_key_configured,true);assert.equal(response.headers.get('Cache-Control'),'no-store');
});
test('development panel can save without authentication',async()=>{
 let called=false;const api=route(async()=>{called=true;return Response.json({youtube_enabled:false});});
 assert.equal((await api.POST(request({youtube_enabled:false},''))).status,200);assert.equal(called,true);
});
test('unavailable engine returns an actionable gateway error',async()=>{
 const response=await route(async()=>{throw Error('offline');}).GET();assert.equal(response.status,502);
});
test('toggle preserves key by omitting absent field',async()=>{
 let sent;const api=route(async(_url,init)=>{sent=JSON.parse(init.body);return Response.json({youtube_enabled:false});});
 assert.equal((await api.POST(request({youtube_enabled:false}))).status,200);assert.deepEqual(sent,{youtube_enabled:false});
});
test('string boolean and non-string key rejected',async()=>{
 const api=route(async()=>{});for(const body of [{youtube_enabled:'false'},{youtube_enabled:true,youtube_key:123},null]) assert.equal((await api.POST(request(body))).status,400);
});
test('upstream validation errors remain actionable',async()=>{
 const api=route(async()=>Response.json({error:'Masukkan stream key.'},{status:400}));const response=await api.POST(request({youtube_enabled:true}));
 assert.equal(response.status,400);assert.equal((await response.json()).error,'Masukkan stream key.');
});
