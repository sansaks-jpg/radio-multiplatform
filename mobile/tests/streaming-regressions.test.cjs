const assert = require('node:assert/strict');
const test = require('node:test');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('../node_modules/typescript');
function load(relative, mocks = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', relative), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => {
    if (!(name in mocks)) throw new Error('Unmocked ' + name);
    return mocks[name];
  }, console, setTimeout, clearTimeout });
  return exports;
}
const {getVisualPlayerHtml} = load('services/visualPlayerHtml.ts');
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return {promise, resolve}; }
function runtime(post = async () => ({ok: true, headers: {get: () => '/session/1'}, text: async () => 'answer'}), mse = false) {
  let id = 0;
  const timers = new Map(), peers = [], fetches = [], scripts = [], hlsInstances = [];
  const element = () => ({style: {}, classList: {remove() {}, add() {}, contains() {return false;}}, addEventListener() {}, removeEventListener() {}, remove() {}});
  const video = Object.assign(element(), {currentTime: 0, readyState: 4, muted: false, events: {},
    play: () => Promise.resolve(), pause() {}, load() {}, removeAttribute() {},
    canPlayType: () => 'probably', addEventListener(name, fn) {this.events[name] = fn;}});
  const elements = new Map([['video',video]]);
  const document = { getElementById: id => {if (!elements.has(id)) elements.set(id,element()); return elements.get(id);},
    addEventListener() {}, createElement: () => element(), head: {appendChild: s => scripts.push(s)} };
  class Peer {
    constructor() {peers.push(this); this.iceGatheringState = 'complete';}
    addTransceiver() {} async createOffer() {return {sdp:'ungathered'};}
    async setLocalDescription() {this.localDescription = {sdp:'gathered-candidates'};}
    async setRemoteDescription() {this.answered = true;}
    close() {this.closed = true;} addEventListener() {} removeEventListener() {}
  }
  class Stream { constructor() {this.tracks = [];} getTracks() {return this.tracks;} addTrack(t) {this.tracks.push(t);} }
  class FakeHls {
    static Events = {MANIFEST_PARSED:'manifest',ERROR:'error'};
    static isSupported() {return true;}
    constructor() {hlsInstances.push(this);}
    on() {} loadSource(url) {this.source=url;} attachMedia() {} destroy() {this.destroyed=true;}
  }
  const window = {addEventListener() {}, removeEventListener() {},
    ...(mse ? {MediaSource:function(){},Hls:FakeHls} : {})};
  const context = { window, document, Hls: FakeHls, screen: {}, RTCPeerConnection: Peer, MediaStream: Stream, URL, Date, console,
    setTimeout: (fn, ms) => {timers.set(++id,{fn,ms}); return id;}, clearTimeout: id => timers.delete(id),
    setInterval: (fn, ms) => {timers.set(++id,{fn,ms,interval:true}); return id;}, clearInterval: id => timers.delete(id),
    fetch: (url, options) => {fetches.push({url,...options}); return options.method === 'POST' ? post() : Promise.resolve({ok:true});},
  };
  const html = getVisualPlayerHtml('http://stream/whep','http://stream/hls/index.m3u8');
  vm.runInNewContext(html.match(/<script>([\s\S]*)<\/script>/)[1],context);
  return {window, peers, video, timers, fetches, scripts, hlsInstances, fire(ms) {
    const entry = [...timers].find(([,t]) => t.ms === ms);
    assert.ok(entry, 'Expected timer '+ms); if (!entry[1].interval) timers.delete(entry[0]); entry[1].fn();
  }};
}

test('SDP includes gathered candidates', async () => {
  const r=runtime(); await flush(); assert.equal(r.fetches[0].body,'gathered-candidates'); r.window.__cleanupVisualPlayer();
});
test('track negotiation without frames must still fall back; sessions are deleted', async () => {
  const r=runtime(); await flush(); const p=r.peers[0];
  p.ontrack({track:{stop(){}},receiver:{}}); r.fire(10000);
  assert.ok(p.closed); assert.equal(r.video.srcObject,null); assert.equal(r.video.src,'http://stream/hls/index.m3u8');
  assert.ok(r.fetches.some(f=>f.method==='DELETE')); r.window.__cleanupVisualPlayer();
});
test('disconnect after successful playback falls back to HLS',async()=>{
  const r=runtime(); await flush(); const p=r.peers[0];
  p.ontrack({track:{stop(){}},receiver:{}}); r.video.currentTime=1; r.video.events.timeupdate();
  p.iceConnectionState='disconnected'; p.oniceconnectionstatechange();
  assert.equal(r.video.srcObject,null); assert.equal(r.video.src,'http://stream/hls/index.m3u8'); r.window.__cleanupVisualPlayer();
});
test('late WHEP response after unmount deletes its server session',async()=>{
  const pending=deferred(); const r=runtime(()=>pending.promise); await flush(); r.window.__cleanupVisualPlayer();
  pending.resolve({ok:true,headers:{get:()=>'/late-session'},text:async()=>''}); await flush();
  assert.ok(r.fetches.some(f=>f.method==='DELETE'&&f.url==='http://stream/late-session'));
  assert.equal(r.peers[0].answered,undefined); assert.equal(r.timers.size,0);
});
test('late WHEP response cannot overwrite an active HLS fallback',async()=>{
  const pending=deferred(); const r=runtime(()=>pending.promise); await flush(); r.fire(10000);
  pending.resolve({ok:true,headers:{get:()=>'/late-session'},text:async()=>''}); await flush();
  assert.equal(r.peers[0].answered,undefined); assert.equal(r.video.srcObject,null); r.window.__cleanupVisualPlayer();
});
test('native HLS network failure retries with delay instead of a hot loop',async()=>{
  const r=runtime(async()=>{throw Error('offline')}); await flush(); r.video.events.error();
  assert.ok([...r.timers.values()].some(t=>t.ms===2000)); assert.equal(r.peers.length,1);
  r.fire(2000); await flush(); assert.equal(r.peers.length,2); r.window.__cleanupVisualPlayer(); assert.equal(r.timers.size,0);
});
test('endpoint cannot escape embedded script',()=>{
  const html=getVisualPlayerHtml('http://host/</script><script>bad()</script>','https://hls/test');
  assert.equal((html.match(/<script>/g)||[]).length,1); assert.ok(html.includes('\\u003c/script>'));
});

function audioRuntime() {
  let hardware=false; const slow=deferred(), entered=deferred(); const operations=[];
  const store={status:'idle',nowPlaying:{current_program:'test',current_host:'host'},setStatus(s){this.status=s;},markStarted(){},setError(){}};
  const engine={setup:async()=>{},loadAndPlay:async()=>{operations.push('play-start');entered.resolve();await slow.promise;hardware=true;operations.push('play-end');},
    stop:async()=>{hardware=false;operations.push('stop');},pause:async()=>{hardware=false;operations.push('pause');}};
  const api=load('services/audio/trackPlayerService.ts',{
    'react-native':{Image:{}},'./playerEngine':{engine},'./streamResolver':{resolveStreamUrl:async()=> 'url'},
    '../../stores/playerStore':{usePlayerStore:{getState:()=>store}},'../../utils/programAssets':{getTrackArtwork:()=>null},
    '../notifications':{showLivePlaybackNotification:async()=>{},dismissLivePlaybackNotification:async()=>{}},
  });
  return {api, slow, entered, operations, playing:()=>hardware};
}
test('stop during pending hardware play finishes with hardware stopped',async()=>{
  const r=audioRuntime(); const play=r.api.playLive(); await r.entered.promise;
  const stop=r.api.stopLive(); await flush(); assert.deepEqual(r.operations,['play-start']);
  r.slow.resolve();await Promise.all([play,stop]);assert.equal(r.playing(),false);assert.deepEqual(r.operations,['play-start','play-end','stop']);
});
test('latest play wins over stale stop queued during setup',async()=>{
  const r=audioRuntime();const stop=r.api.stopLive();const play=r.api.playLive();r.slow.resolve();
  await Promise.all([stop,play]);assert.equal(r.playing(),true);
});

test('MSE HLS takes priority over unreliable native maybe support',async()=>{
 const r=runtime(async()=>{throw Error('WHEP down');},true);await flush();
 assert.equal(r.hlsInstances.length,1);assert.equal(r.hlsInstances[0].source,'http://stream/hls/index.m3u8');
 r.window.__cleanupVisualPlayer();assert.equal(r.hlsInstances[0].destroyed,true);
});
