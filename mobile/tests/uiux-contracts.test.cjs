const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

// Exercise the actual TypeScript modules with isolated native/network boundaries.
function load(file, mocks = {}, globals = {}) {
  const exports = {};
  const output = ts.transpileModule(fs.readFileSync(path.join(__dirname, "../src", file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(output, { exports, require: (name) => {
    if (!(name in mocks)) throw new Error(`Unexpected dependency: ${name}`);
    return mocks[name];
  }, Date, console, setTimeout, clearTimeout, setInterval, clearInterval, AbortController, ...globals });
  return exports;
}

const dates = load("utils/datetime.ts");
const slot = (day, start = "07:00", end = "10:00") => ({ day_of_week: day, start_time: start, end_time: end });
test("finished Wednesday show selects Thursday, not next Wednesday", () => {
  const slots = [slot(3), slot(5), slot(1), slot(4), slot(2)];
  const before = JSON.stringify(slots);
  const now = new Date("2026-09-16T13:45:00Z");
  assert.equal(dates.getNextProgramSlot(slots, now), slots[3]);
  assert.equal(dates.getMinutesToProgram(slots[3], now), 615);
  assert.equal(JSON.stringify(slots), before);
});
test("weekly rollover, midnight WIB, empty schedules and overnight live", () => {
  assert.equal(dates.getNextProgramSlot([], new Date()), null);
  assert.equal(dates.getNextProgramSlot([slot(1), slot(5)], new Date("2026-09-18T13:00:00Z")).day_of_week, 1);
  const now = new Date("2026-09-16T17:05:00Z");
  assert.equal(dates.todayDow(now), 4);
  assert.equal(dates.isOnAirNow(slot(3, "23:00", "01:00"), now), true);
  assert.equal(dates.formatScheduleDay(4, now), "Hari ini, 17 Sep");
});
test("announcer selection uses programme membership and an honest fallback label", () => {
  const { getProgramAnnouncers } = load("utils/announcer.ts");
  const people = [{ name: "A", programs: ["Morning Show"] }, { name: "B", programs: ["Asupan Gaul"] }];
  assert.equal(getProgramAnnouncers(people, "Gaul Morning Show").announcers[0], people[0]);
  assert.equal(getProgramAnnouncers(people, "Unknown").label, "Gaul Squad");
});

function hookHarness(sendLiveComment) {
  const cells = [];
  let cursor = 0;
  const effects = [];
  const intervals = new Set();
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in cells)) cells[index] = initial;
      return [cells[index], (value) => { cells[index] = typeof value === "function" ? value(cells[index]) : value; }];
    },
    useRef(initial) { const index = cursor++; return cells[index] ?? (cells[index] = { current: initial }); },
    useCallback(fn) { return fn; },
    useEffect(fn) { effects.push(fn); },
  };
  const api = load("hooks/useLiveComments.ts", {
    react, "react-native": { Platform: { OS: "android" } },
    "../services/comments": {
      sendLiveComment,
      fetchRecentCommentsWithSession: async () => ({ comments: [], sessionStartIso: null }),
      getAdminApiUrl: () => "https://example.invalid",
    },
  }, { setInterval: (fn) => { intervals.add(fn); return fn; }, clearInterval: (fn) => intervals.delete(fn) });
  return {
    render(enabled = true) { cursor = 0; effects.length = 0; return api.useLiveComments(enabled); },
    effects, intervals,
  };
}
test("failed delivery removes optimistic success and reports failure", async () => {
  const harness = hookHarness(async () => { throw new Error("offline"); });
  const result = await harness.render().send("Hello", "Listener", "test");
  const state = harness.render();
  assert.equal(result, false);
  assert.equal(state.comments.length, 0);
  assert.equal(state.isSending, false);
  assert.ok(state.error);
});
test("sending state prevents duplicate taps and replaces pending row with server result", async () => {
  let finish;
  let calls = 0;
  const harness = hookHarness(() => { calls++; return new Promise((resolve) => { finish = resolve; }); });
  const request = harness.render().send("Hello", "Listener");
  assert.equal(harness.render().isSending, true);
  assert.equal(await harness.render().send("Hello", "Listener"), false);
  assert.equal(calls, 1);
  finish({ id: "server-1", message: "Hello" });
  assert.equal(await request, true);
  assert.equal(harness.render().comments[0].id, "server-1");
  assert.equal(harness.render().comments.length, 1);
});
test("chat polling only runs while the sheet is open", () => {
  const harness = hookHarness(async () => ({}));
  harness.render(false);
  harness.effects[0]();
  assert.equal(harness.intervals.size, 0);
  harness.render(true);
  const cleanup = harness.effects[0]();
  assert.equal(harness.intervals.size, 1);
  cleanup();
  assert.equal(harness.intervals.size, 0);
});
test("network failure never fabricates a successfully sent local comment", async () => {
  const api = load("services/comments.ts", {
    "react-native": { Platform: { OS: "android" } },
    "./apiConfig": { getServerApiUrl: () => "https://example.invalid" },
    "../mocks/comments": { mockComments: [] },
  }, { __DEV__: false, fetch: async () => { throw new Error("offline"); } });
  await assert.rejects(api.sendLiveComment({ userName: "Test", message: "Hello" }));
  assert.equal((await api.fetchRecentCommentsWithSession()).offline, true);
});
