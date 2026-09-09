// @ts-check
import assert from "node:assert";

/**
 * Adversarial Audio / Visual State Machine Harness
 * Challenger M1.1: Testing VisualPlayerSheet.tsx & LiveDetailSheet.tsx
 */

console.log("===============================================================================");
console.log("  CHALLENGER M1.1: EMPIRICAL ADVERSARIAL AUDIO/VISUAL OVERLAP SUITE");
console.log("===============================================================================\n");

// Helper to delay
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Mock Audio Engine & Service simulating trackPlayerService.ts & playerStore.ts
 */
function createAudioEnvironment(options = {}) {
  const setupDelayMs = options.setupDelayMs ?? 5;
  const loadDelayMs = options.loadDelayMs ?? 15;

  let storeStatus = "idle";
  let storeError = null;
  let hasStarted = false;
  const storeListeners = new Set();

  const store = {
    getState: () => ({
      status: storeStatus,
      error: storeError,
      hasStarted,
    }),
    setStatus: (status) => {
      storeStatus = status;
      storeError = null;
      storeListeners.forEach((fn) => fn(storeStatus));
    },
    setError: (err) => {
      storeStatus = "error";
      storeError = err;
      storeListeners.forEach((fn) => fn(storeStatus));
    },
    markStarted: () => {
      hasStarted = true;
    },
    reset: () => {
      storeStatus = "idle";
      storeError = null;
      hasStarted = false;
      storeListeners.forEach((fn) => fn(storeStatus));
    },
    subscribe: (fn) => {
      storeListeners.add(fn);
      return () => storeListeners.delete(fn);
    },
  };

  // Physical engine tracker
  let isHardwarePlaying = false;
  let activeTrack = null;

  const mockEngine = {
    setup: async (events) => {
      if (setupDelayMs > 0) await sleep(setupDelayMs);
      return;
    },
    loadAndPlay: async (track) => {
      if (loadDelayMs > 0) await sleep(loadDelayMs);
      isHardwarePlaying = true;
      activeTrack = track;
      store.setStatus("playing");
    },
    pause: async () => {
      isHardwarePlaying = false;
      store.setStatus("paused");
    },
    stop: async () => {
      isHardwarePlaying = false;
      activeTrack = null;
      store.setStatus("idle");
    },
  };

  // trackPlayerService.ts implementation
  let setupPromise = null;
  let resolvedUrl = null;
  let currentOperationGeneration = 0;

  async function ensureSetup() {
    if (!setupPromise) {
      setupPromise = mockEngine.setup({
        onStateChange: (state, error) => {
          if (state === "error") {
            store.setError(error ?? "Error");
          } else {
            store.setStatus(state);
          }
        },
      }).catch((err) => {
        setupPromise = null;
        throw err;
      });
    }
    await setupPromise;
  }

  async function playLive() {
    const generation = ++currentOperationGeneration;
    store.setStatus("buffering");
    store.markStarted();

    await ensureSetup();
    if (generation !== currentOperationGeneration) return;

    if (!resolvedUrl) {
      if (setupDelayMs > 0) await sleep(2);
      if (generation !== currentOperationGeneration) return;
      resolvedUrl = "http://mock-icecast-stream";
    }

    if (generation !== currentOperationGeneration) return;

    await mockEngine.loadAndPlay({ url: resolvedUrl, title: "Mock Live" });
  }

  async function pauseLive() {
    currentOperationGeneration++;
    await ensureSetup();
    await mockEngine.pause();
    resolvedUrl = null;
  }

  async function stopLive() {
    currentOperationGeneration++;
    await ensureSetup();
    await mockEngine.stop();
    resolvedUrl = null;
    store.reset();
  }

  return {
    store,
    playLive,
    pauseLive,
    stopLive,
    isHardwarePlaying: () => isHardwarePlaying,
    getGeneration: () => currentOperationGeneration,
  };
}

/**
 * Model of VisualPlayerSheet.tsx state & effect
 */
function createVisualPlayerSheetModel(audioEnv) {
  let wasPlayingBeforeRef = false;
  let prevVisibleRef = false;
  let isMounted = true;
  let currentVisible = false;

  const play = () => audioEnv.playLive();
  const pause = () => audioEnv.pauseLive();

  function onVisibleChange(visible) {
    currentVisible = visible;
    const wasVisible = prevVisibleRef;
    prevVisibleRef = visible;

    // Transisi: Modal DIBUKA (false -> true)
    // EXACT MATCH from VisualPlayerSheet.tsx lines 56-66:
    if (!wasVisible && visible) {
      const currentStatus = audioEnv.store.getState().status;
      const isRadioActive =
        currentStatus === "playing" || currentStatus === "buffering";
      wasPlayingBeforeRef = isRadioActive;

      if (isRadioActive) {
        void pause();
      }
    }
    // Transisi: Modal DITUTUP (true -> false)
    // EXACT MATCH from VisualPlayerSheet.tsx lines 68-73:
    else if (wasVisible && !visible) {
      if (wasPlayingBeforeRef) {
        wasPlayingBeforeRef = false;
        void play();
      }
    }
  }

  function unmount() {
    isMounted = false;
    // EXACT MATCH from VisualPlayerSheet.tsx lines 78-83:
    if (wasPlayingBeforeRef) {
      wasPlayingBeforeRef = false;
      void play();
    }
  }

  return {
    setVisible: (vis) => onVisibleChange(vis),
    unmount,
    getWasPlayingBefore: () => wasPlayingBeforeRef,
    isVisible: () => currentVisible,
  };
}

/**
 * Model of LiveDetailSheet.tsx state & effect
 */
function createLiveDetailSheetModel(audioEnv, autoPlayOnOpen = false) {
  let isVisualActive = false;
  let wasPlayingBeforeVisualRef = false;
  let sheetVisible = false;

  const play = () => audioEnv.playLive();
  const pause = () => audioEnv.pauseLive();

  function onSheetVisibleChange(visible) {
    sheetVisible = visible;

    if (!visible) {
      // EXACT MATCH from LiveDetailSheet.tsx lines 203-210:
      if (isVisualActive) {
        isVisualActive = false;
        if (wasPlayingBeforeVisualRef) {
          void play();
          wasPlayingBeforeVisualRef = false;
        }
      }
    } else {
      // EXACT MATCH from LiveDetailSheet.tsx lines 215-220:
      if (autoPlayOnOpen) {
        const current = audioEnv.store.getState().status;
        if (current !== "playing" && current !== "buffering") {
          void play();
        }
      }
    }
  }

  // EXACT MATCH from LiveDetailSheet.tsx lines 178-193:
  function handleToggleVisual() {
    const status = audioEnv.store.getState().status;
    if (!isVisualActive) {
      wasPlayingBeforeVisualRef = status === "playing" || status === "buffering";
      void pause();
      isVisualActive = true;
    } else {
      isVisualActive = false;
      if (wasPlayingBeforeVisualRef) {
        void play();
        wasPlayingBeforeVisualRef = false;
      }
    }
  }

  return {
    setVisible: (vis) => onSheetVisibleChange(vis),
    toggleVisual: handleToggleVisual,
    isVisualActive: () => isVisualActive,
    getWasPlayingBefore: () => wasPlayingBeforeVisualRef,
  };
}

// -----------------------------------------------------------------------------
// TEST RUNNER
// -----------------------------------------------------------------------------

let passedCount = 0;
let failedCount = 0;
const failures = [];

async function runTest(name, testFn) {
  process.stdout.write(`[TEST] ${name} ... `);
  try {
    await testFn();
    console.log("PASS");
    passedCount++;
  } catch (err) {
    console.log("FAIL!");
    console.error(`  Error: ${err.message}`);
    failures.push({ name, error: err.message });
    failedCount++;
  }
}

// -----------------------------------------------------------------------------
// SUITE 1: VisualPlayerSheet.tsx Tests
// -----------------------------------------------------------------------------

async function testVisualPlayerSheetSuite() {
  console.log("\n--- SUITE 1: VisualPlayerSheet.tsx ---");

  await runTest("1.1 Radio Idle -> Open Modal -> Close Modal -> Radio remains Idle", async () => {
    const audioEnv = createAudioEnvironment();
    const sheet = createVisualPlayerSheetModel(audioEnv);

    assert.strictEqual(audioEnv.store.getState().status, "idle");

    sheet.setVisible(true);
    await sleep(20);
    assert.strictEqual(audioEnv.store.getState().status, "idle");
    assert.strictEqual(audioEnv.isHardwarePlaying(), false);

    sheet.setVisible(false);
    await sleep(30);
    assert.strictEqual(audioEnv.store.getState().status, "idle");
    assert.strictEqual(audioEnv.isHardwarePlaying(), false);
  });

  await runTest("1.2 Radio Playing -> Open Modal -> Radio Pauses -> Close Modal -> Radio Resumes", async () => {
    const audioEnv = createAudioEnvironment();
    const sheet = createVisualPlayerSheetModel(audioEnv);

    // Start radio first
    await audioEnv.playLive();
    assert.strictEqual(audioEnv.store.getState().status, "playing");
    assert.strictEqual(audioEnv.isHardwarePlaying(), true);

    // Open Modal
    sheet.setVisible(true);
    await sleep(20);
    // Audio MUST be paused while modal is open
    assert.strictEqual(audioEnv.isHardwarePlaying(), false, "Audio hardware must be stopped while modal is open");
    assert.strictEqual(sheet.getWasPlayingBefore(), true, "Should remember it was playing before open");

    // Close Modal
    sheet.setVisible(false);
    await sleep(40);
    // Audio MUST resume
    assert.strictEqual(audioEnv.store.getState().status, "playing", "Audio must resume playing after modal closes");
    assert.strictEqual(audioEnv.isHardwarePlaying(), true, "Audio hardware must be active after modal closes");
  });

  await runTest("1.3 Radio Buffering -> Open Modal -> Buffering cancelled -> Close Modal -> Resumes", async () => {
    const audioEnv = createAudioEnvironment({ loadDelayMs: 50 });
    const sheet = createVisualPlayerSheetModel(audioEnv);

    // Start play, but don't await completion (state is buffering)
    const playPromise = audioEnv.playLive();
    await sleep(10); // Wait until ensureSetup is done and status is 'buffering'
    assert.strictEqual(audioEnv.store.getState().status, "buffering");

    // Open Modal while buffering
    sheet.setVisible(true);
    await sleep(60);

    // Audio MUST NOT start playing while modal is open
    assert.strictEqual(audioEnv.isHardwarePlaying(), false, "Hardware audio must NOT start while modal is open!");
    assert.strictEqual(sheet.getWasPlayingBefore(), true, "Should remember it was buffering before open");

    // Close Modal
    sheet.setVisible(false);
    await sleep(80);
    assert.strictEqual(audioEnv.store.getState().status, "playing");
    assert.strictEqual(audioEnv.isHardwarePlaying(), true);
  });

  await runTest("1.4 Rapid Open/Close Bounce (Open -> 1ms -> Close)", async () => {
    const audioEnv = createAudioEnvironment();
    const sheet = createVisualPlayerSheetModel(audioEnv);

    await audioEnv.playLive();
    assert.strictEqual(audioEnv.isHardwarePlaying(), true);

    // Rapid bounce
    sheet.setVisible(true);
    await sleep(1);
    sheet.setVisible(false);

    await sleep(50);
    assert.strictEqual(audioEnv.store.getState().status, "playing");
    assert.strictEqual(audioEnv.isHardwarePlaying(), true);
  });

  await runTest("1.5 [ADVERSARIAL VULNERABILITY] In-flight play() before buffering state set -> Open Modal -> Audio Leak Check", async () => {
    // In trackPlayerService.ts, playLive has:
    // const generation = ++currentOperationGeneration;
    // await ensureSetup(); // ASYNC!
    // store.setStatus("buffering");
    //
    // If the user taps Play, and then within 2ms opens VisualPlayerSheet:
    // status is STILL "idle"!
    // VisualPlayerSheet checks: const isRadioActive = currentStatus === "playing" || currentStatus === "buffering";
    // isRadioActive is FALSE!
    // pauseRef.current() is NOT called!
    // Does playLive continue and leak audio into the modal?
    const audioEnv = createAudioEnvironment({ setupDelayMs: 10, loadDelayMs: 20 });
    const sheet = createVisualPlayerSheetModel(audioEnv);

    // User taps Play
    void audioEnv.playLive();

    // User IMMEDIATELY opens VisualPlayerSheet before ensureSetup finishes (status is still 'idle')
    await sleep(2);
    assert.strictEqual(audioEnv.store.getState().status, "buffering", "Status is synchronously set to buffering");

    sheet.setVisible(true);

    // Wait for the in-flight playLive to complete its timeline
    await sleep(50);

    // INVARIANT: When VisualPlayerSheet is open, isHardwarePlaying MUST BE FALSE!
    const leaked = audioEnv.isHardwarePlaying();
    if (leaked) {
      throw new Error(
        `AUDIO LEAK DETECTED! Icecast audio started playing while VisualPlayerSheet is OPEN! ` +
        `Cause: VisualPlayerSheet omitted pause() because store.status was not yet 'buffering'.`
      );
    }
  });

  await runTest("1.6 [ADVERSARIAL VULNERABILITY] Rapid Open -> Close -> Reopen Race Condition", async () => {
    // Scenario:
    // 1. Radio is playing.
    // 2. User opens VisualPlayerSheet (modal open, pause called).
    // 3. User closes VisualPlayerSheet (modal closed, play called).
    // 4. User immediately re-opens VisualPlayerSheet (within 2ms, while playLive is awaiting ensureSetup).
    // In step 4, status is still 'paused'. isRadioActive evaluates to FALSE!
    // VisualPlayerSheet does NOT call pauseRef.current()!
    // Does playLive from step 3 leak audio while modal is open in step 4?
    const audioEnv = createAudioEnvironment({ setupDelayMs: 10, loadDelayMs: 20 });
    const sheet = createVisualPlayerSheetModel(audioEnv);

    await audioEnv.playLive();
    assert.strictEqual(audioEnv.isHardwarePlaying(), true);

    // Step 2: Open modal
    sheet.setVisible(true);
    await sleep(20);
    assert.strictEqual(audioEnv.isHardwarePlaying(), false);

    // Step 3: Close modal -> triggers play()
    sheet.setVisible(false);

    // Step 4: Immediately reopen modal within 2ms before ensureSetup finishes
    await sleep(2);
    sheet.setVisible(true);

    // Wait for async operations to settle
    await sleep(60);

    // INVARIANT: Visual modal is open -> audio hardware MUST NOT be playing!
    const leaked = audioEnv.isHardwarePlaying();
    if (leaked) {
      throw new Error(
        `AUDIO LEAK DETECTED! Icecast audio is playing simultaneously with YouTube modal! ` +
        `Cause: Rapid reopen checked status before 'buffering' was committed to Zustand, skipping pause().`
      );
    }
  });
}

// -----------------------------------------------------------------------------
// SUITE 2: LiveDetailSheet.tsx Tests
// -----------------------------------------------------------------------------

async function testLiveDetailSheetSuite() {
  console.log("\n--- SUITE 2: LiveDetailSheet.tsx ---");

  await runTest("2.1 Radio Playing -> Toggle Visual Radio -> Pauses -> Toggle Off -> Resumes", async () => {
    const audioEnv = createAudioEnvironment();
    const sheet = createLiveDetailSheetModel(audioEnv);

    await audioEnv.playLive();
    sheet.setVisible(true);
    assert.strictEqual(audioEnv.isHardwarePlaying(), true);

    // Activate visual
    sheet.toggleVisual();
    await sleep(20);
    assert.strictEqual(sheet.isVisualActive(), true);
    assert.strictEqual(audioEnv.isHardwarePlaying(), false, "Radio audio must pause when visual active");

    // Deactivate visual
    sheet.toggleVisual();
    await sleep(60);
    assert.strictEqual(sheet.isVisualActive(), false);
    assert.strictEqual(audioEnv.isHardwarePlaying(), true, "Radio audio must resume when visual deactivated");
  });

  await runTest("2.2 LiveDetailSheet Closed while Visual Active -> Visual Deactivated & Radio Resumes", async () => {
    const audioEnv = createAudioEnvironment();
    const sheet = createLiveDetailSheetModel(audioEnv);

    await audioEnv.playLive();
    sheet.setVisible(true);

    // Activate visual
    sheet.toggleVisual();
    await sleep(20);
    assert.strictEqual(sheet.isVisualActive(), true);
    assert.strictEqual(audioEnv.isHardwarePlaying(), false);

    // Close entire LiveDetailSheet
    sheet.setVisible(false);
    await sleep(60);
    assert.strictEqual(sheet.isVisualActive(), false, "Visual must be deactivated on sheet close");
    assert.strictEqual(audioEnv.isHardwarePlaying(), true, "Audio must resume when sheet closed");
  });

  await runTest("2.3 AutoPlayOnOpen -> Opens Sheet -> Starts Playing automatically", async () => {
    const audioEnv = createAudioEnvironment();
    const sheet = createLiveDetailSheetModel(audioEnv, true); // autoPlayOnOpen = true

    assert.strictEqual(audioEnv.store.getState().status, "idle");
    sheet.setVisible(true);
    await sleep(60);

    assert.strictEqual(audioEnv.store.getState().status, "playing");
    assert.strictEqual(audioEnv.isHardwarePlaying(), true);
  });

  await runTest("2.4 In-flight play() -> Toggle Visual Radio immediately -> LiveDetailSheet pause check", async () => {
    // In LiveDetailSheet.tsx:
    // handleToggleVisual ALWAYS calls `void pause();` unconditionally!
    // Let's verify whether calling pause() cancels in-flight playLive via generation counter!
    const audioEnv = createAudioEnvironment({ setupDelayMs: 10, loadDelayMs: 20 });
    const sheet = createLiveDetailSheetModel(audioEnv);

    // User taps play
    void audioEnv.playLive();

    // Within 2ms, user toggles visual on
    await sleep(2);
    sheet.toggleVisual();

    await sleep(60);

    assert.strictEqual(sheet.isVisualActive(), true);
    assert.strictEqual(audioEnv.isHardwarePlaying(), false, "Unconditional pause in LiveDetailSheet must cancel in-flight playLive!");
  });

  await runTest("2.5 [ADVERSARIAL STRESS TEST] Rapid Visual Toggle Off -> On in LiveDetailSheet", async () => {
    // Radio is playing -> visual turned ON -> visual turned OFF -> immediately turned ON again within 2ms
    const audioEnv = createAudioEnvironment({ setupDelayMs: 10, loadDelayMs: 20 });
    const sheet = createLiveDetailSheetModel(audioEnv);

    await audioEnv.playLive();
    sheet.setVisible(true);

    // Turn visual ON
    sheet.toggleVisual();
    await sleep(20);
    assert.strictEqual(sheet.isVisualActive(), true);
    assert.strictEqual(sheet.getWasPlayingBefore(), true);

    // Turn visual OFF (calls playLive())
    sheet.toggleVisual();
    // IMMEDIATELY turn visual ON again within 2ms (playLive is awaiting setup, status is still 'paused')
    await sleep(2);
    sheet.toggleVisual();

    await sleep(50);
    assert.strictEqual(sheet.isVisualActive(), true);
    assert.strictEqual(audioEnv.isHardwarePlaying(), false, "Audio must not leak when visual is active!");

    // Now turn visual OFF again
    sheet.toggleVisual();
    await sleep(50);

    // Did it resume playing? Or did wasPlayingBeforeVisualRef get wiped to false?
    const isPlaying = audioEnv.isHardwarePlaying();
    if (!isPlaying) {
      throw new Error(
        `STATE LOSS DETECTED! Radio failed to resume after rapid toggling off-then-on! ` +
        `Cause: wasPlayingBeforeVisualRef evaluated status as paused during intermediate async play.`
      );
    }
  });
}

// -----------------------------------------------------------------------------
// SUITE 3: Generation Cancellation & Promise Race Stress
// -----------------------------------------------------------------------------

async function testGenerationCancellationSuite() {
  console.log("\n--- SUITE 3: trackPlayerService.ts Generation Counter Stress ---");

  await runTest("3.1 100 Rapid Play/Pause Alternating Toggles stress", async () => {
    const audioEnv = createAudioEnvironment({ setupDelayMs: 2, loadDelayMs: 5 });

    // Rapidly toggle play and pause 100 times with randomized intervals
    for (let i = 0; i < 50; i++) {
      void audioEnv.playLive();
      if (i % 3 === 0) await sleep(1);
      void audioEnv.pauseLive();
      if (i % 2 === 0) await sleep(1);
    }

    // Finally issue a pause
    await audioEnv.pauseLive();
    await sleep(40);

    assert.strictEqual(audioEnv.isHardwarePlaying(), false, "Hardware must be paused after final pause");
    assert.strictEqual(audioEnv.store.getState().status, "paused", "Store status must be paused");
  });

  await runTest("3.2 Final Play after rapid interleaved pauses", async () => {
    const audioEnv = createAudioEnvironment({ setupDelayMs: 2, loadDelayMs: 5 });

    for (let i = 0; i < 20; i++) {
      void audioEnv.playLive();
      void audioEnv.pauseLive();
    }

    // Final play
    await audioEnv.playLive();
    await sleep(20);

    assert.strictEqual(audioEnv.isHardwarePlaying(), true, "Hardware must be playing after final play");
    assert.strictEqual(audioEnv.store.getState().status, "playing", "Store status must be playing");
  });
}

// -----------------------------------------------------------------------------
// SUITE 4: Verification of Recommended Mitigation
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// SUITE 5: Synchronous Buffering State in trackPlayerService (The True Fix)
// -----------------------------------------------------------------------------

function createAudioEnvironmentWithSyncBuffering(options = {}) {
  const setupDelayMs = options.setupDelayMs ?? 5;
  const loadDelayMs = options.loadDelayMs ?? 15;

  let storeStatus = "idle";
  let storeError = null;
  let hasStarted = false;

  const store = {
    getState: () => ({ status: storeStatus, error: storeError, hasStarted }),
    setStatus: (status) => { storeStatus = status; storeError = null; },
    setError: (err) => { storeStatus = "error"; storeError = err; },
    markStarted: () => { hasStarted = true; },
    reset: () => { storeStatus = "idle"; storeError = null; hasStarted = false; },
  };

  let isHardwarePlaying = false;
  let setupPromise = null;
  let resolvedUrl = null;
  let currentOperationGeneration = 0;

  const mockEngine = {
    setup: async () => { if (setupDelayMs > 0) await sleep(setupDelayMs); },
    loadAndPlay: async () => {
      if (loadDelayMs > 0) await sleep(loadDelayMs);
      isHardwarePlaying = true;
      store.setStatus("playing");
    },
    pause: async () => {
      isHardwarePlaying = false;
      store.setStatus("paused");
    },
    stop: async () => {
      isHardwarePlaying = false;
      store.setStatus("idle");
    },
  };

  async function ensureSetup() {
    if (!setupPromise) {
      setupPromise = mockEngine.setup().catch((err) => {
        setupPromise = null;
        throw err;
      });
    }
    await setupPromise;
  }

  async function playLive() {
    const generation = ++currentOperationGeneration;

    // KEY FIX: Immediately commit buffering status to store synchronously
    // before any async await!
    store.setStatus("buffering");
    store.markStarted();

    await ensureSetup();
    if (generation !== currentOperationGeneration) return;

    if (!resolvedUrl) {
      if (setupDelayMs > 0) await sleep(2);
      if (generation !== currentOperationGeneration) return;
      resolvedUrl = "http://mock-icecast-stream";
    }

    if (generation !== currentOperationGeneration) return;

    await mockEngine.loadAndPlay();
  }

  async function pauseLive() {
    currentOperationGeneration++;
    await ensureSetup();
    await mockEngine.pause();
    resolvedUrl = null;
  }

  return {
    store,
    playLive,
    pauseLive,
    isHardwarePlaying: () => isHardwarePlaying,
  };
}

async function testSyncBufferingFixSuite() {
  console.log("\n--- SUITE 5: Verification of Synchronous Buffering Fix in trackPlayerService ---");

  await runTest("5.1 In-flight play() with sync buffering -> Open Modal -> No Audio Leak", async () => {
    const audioEnv = createAudioEnvironmentWithSyncBuffering({ setupDelayMs: 10, loadDelayMs: 20 });
    const sheet = createVisualPlayerSheetModel(audioEnv);

    // User taps play
    void audioEnv.playLive();

    // At 2ms (during setup):
    // store.status is ALREADY 'buffering'!
    assert.strictEqual(audioEnv.store.getState().status, "buffering");

    // Modal opens
    sheet.setVisible(true);

    // VisualPlayerSheet sees status === 'buffering', calls pause()!
    // pauseLive() increments generation, cancelling playLive!
    await sleep(50);

    assert.strictEqual(
      audioEnv.isHardwarePlaying(),
      false,
      "Audio hardware must NOT play while modal is open!"
    );
    assert.strictEqual(sheet.getWasPlayingBefore(), true, "Remembers it was in-flight buffering");

    // Modal closes
    sheet.setVisible(false);
    await sleep(60);

    assert.strictEqual(
      audioEnv.isHardwarePlaying(),
      true,
      "Audio resumes playing after modal closes!"
    );
  });

  await runTest("5.2 Idle Radio -> Open Modal -> Close Modal -> Remains strictly Idle", async () => {
    const audioEnv = createAudioEnvironmentWithSyncBuffering();
    const sheet = createVisualPlayerSheetModel(audioEnv);

    assert.strictEqual(audioEnv.store.getState().status, "idle");

    sheet.setVisible(true);
    await sleep(20);
    assert.strictEqual(audioEnv.store.getState().status, "idle");
    assert.strictEqual(audioEnv.isHardwarePlaying(), false);

    sheet.setVisible(false);
    await sleep(30);
    assert.strictEqual(audioEnv.store.getState().status, "idle");
    assert.strictEqual(audioEnv.isHardwarePlaying(), false);
  });
}

// -----------------------------------------------------------------------------
// MAIN EXECUTION
// -----------------------------------------------------------------------------

async function main() {
  await testVisualPlayerSheetSuite();
  await testLiveDetailSheetSuite();
  await testGenerationCancellationSuite();
  await testSyncBufferingFixSuite();

  console.log("\n===============================================================================");
  console.log(`TOTAL TESTS: ${passedCount + failedCount}`);
  console.log(`PASSED: ${passedCount}`);
  console.log(`FAILED: ${failedCount}`);
  console.log("===============================================================================");

  if (failures.length > 0) {
    console.log("\nCONFIRMED VULNERABILITIES & FAILURES:");
    failures.forEach((f, idx) => {
      console.log(`  ${idx + 1}. [${f.name}]`);
      console.log(`     Error: ${f.error}`);
    });
    process.exit(1);
  } else {
    console.log("\nALL ADVERSARIAL TESTS PASSED CLEANLY!");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("FATAL HARNESS ERROR:", err);
  process.exit(2);
});
