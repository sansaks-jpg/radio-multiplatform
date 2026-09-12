import assert from "node:assert/strict";
import test from "node:test";

// Test implementation of schedule boundary calculation
function getWibParts(date = new Date()) {
  const wibTime = new Date(date.getTime() + 7 * 3600 * 1000);
  return {
    day: wibTime.getUTCDay(),
    date: wibTime.getUTCDate(),
    month: wibTime.getUTCMonth(),
    year: wibTime.getUTCFullYear(),
    hours: wibTime.getUTCHours(),
    minutes: wibTime.getUTCMinutes(),
    seconds: wibTime.getUTCSeconds(),
    totalMinutes: wibTime.getUTCHours() * 60 + wibTime.getUTCMinutes(),
  };
}

function toMinutes(hhmm) {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(":").map((part) => parseInt(part, 10));
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function createWibDateToday(hhmm, now = new Date()) {
  const { year, month, date } = getWibParts(now);
  const [hStr, mStr] = hhmm.split(":");
  const h = parseInt(hStr || "0", 10);
  const m = parseInt(mStr || "0", 10);
  return new Date(Date.UTC(year, month, date, h - 7, m, 0, 0));
}

function getActiveCommentSession(programsList, now = new Date()) {
  const { day, totalMinutes } = getWibParts(now);

  const todayPrograms = programsList
    .filter((p) => p.day_of_week === day)
    .sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time));

  if (todayPrograms.length === 0) {
    return {
      sessionStart: null,
      sessionStartIso: null,
      programName: null,
    };
  }

  const startedPrograms = todayPrograms.filter(
    (p) => toMinutes(p.start_time) <= totalMinutes
  );

  if (startedPrograms.length === 0) {
    return {
      sessionStart: null,
      sessionStartIso: null,
      programName: null,
    };
  }

  const currentSlot = startedPrograms[startedPrograms.length - 1];
  const sessionStart = createWibDateToday(currentSlot.start_time, now);

  return {
    sessionStart,
    sessionStartIso: sessionStart.toISOString(),
    programName: currentSlot.name,
    startTime: currentSlot.start_time,
    endTime: currentSlot.end_time,
  };
}

// Dummy schedule for testing:
// Day 1 (Senin):
// - Program A: 08:00 - 10:00
// - Program B: 14:00 - 17:00
// Day 0 (Minggu): No programs!
const testPrograms = [
  {
    name: "Program A",
    day_of_week: 1, // Senin
    start_time: "08:00",
    end_time: "10:00",
  },
  {
    name: "Program B",
    day_of_week: 1, // Senin
    start_time: "14:00",
    end_time: "17:00",
  },
];

// Helper to construct a Date at a specific WIB time on Monday (e.g. 2026-09-14 is Monday)
function makeWibMonday(hours, minutes) {
  // 2026-09-14 is Monday (day 1)
  // UTC = WIB - 7
  return new Date(Date.UTC(2026, 8, 14, hours - 7, minutes, 0, 0));
}

// Helper for Sunday (2026-09-13 is Sunday, day 0)
function makeWibSunday(hours, minutes) {
  return new Date(Date.UTC(2026, 8, 13, hours - 7, minutes, 0, 0));
}

test("Aturan 1: Hari tanpa program siaran -> komentar tidak dihapus (sessionStart = null)", () => {
  const sundayNoon = makeWibSunday(12, 0);
  const session = getActiveCommentSession(testPrograms, sundayNoon);
  assert.equal(session.sessionStart, null);
  assert.equal(session.programName, null);
});

test("Aturan 2: Senin 07:30 (sebelum Program A mulai) -> belum ada program aktif", () => {
  const mondayEarly = makeWibMonday(7, 30);
  const session = getActiveCommentSession(testPrograms, mondayEarly);
  assert.equal(session.sessionStart, null);
});

test("Aturan 3: Senin 08:30 (saat Program A sedang tayang 08:00-10:00) -> sessionStart = 08:00 WIB", () => {
  const mondayA = makeWibMonday(8, 30);
  const session = getActiveCommentSession(testPrograms, mondayA);
  assert.notEqual(session.sessionStart, null);
  assert.equal(session.programName, "Program A");
  assert.equal(session.startTime, "08:00");
  assert.equal(session.sessionStart.getTime(), makeWibMonday(8, 0).getTime());
});

test("Aturan 4: Senin 11:30 (Program A sudah selesai jam 10:00, Program B belum mulai) -> komentar Program A TETAP ADA", () => {
  const mondayGap = makeWibMonday(11, 30);
  const session = getActiveCommentSession(testPrograms, mondayGap);
  assert.notEqual(session.sessionStart, null);
  assert.equal(session.programName, "Program A");
  // sessionStart tetap 08:00 sehingga komentar Program A tidak terhapus!
  assert.equal(session.sessionStart.getTime(), makeWibMonday(8, 0).getTime());
});

test("Aturan 5: Senin 13:59 (1 menit sebelum Program B) -> komentar Program A masih aktif", () => {
  const mondayJustBeforeB = makeWibMonday(13, 59);
  const session = getActiveCommentSession(testPrograms, mondayJustBeforeB);
  assert.equal(session.programName, "Program A");
  assert.equal(session.sessionStart.getTime(), makeWibMonday(8, 0).getTime());
});

test("Aturan 6: Senin 14:00 (tepat saat Program B mulai) -> sessionStart BERPINDAH ke 14:00, komentar lama terhapus", () => {
  const mondayBStart = makeWibMonday(14, 0);
  const session = getActiveCommentSession(testPrograms, mondayBStart);
  assert.notEqual(session.sessionStart, null);
  assert.equal(session.programName, "Program B");
  assert.equal(session.startTime, "14:00");
  assert.equal(session.sessionStart.getTime(), makeWibMonday(14, 0).getTime());

  // Simulasi pemfilteran komentar:
  const comments = [
    { id: "1", message: "Komen Program A jam 09:00", created_at: makeWibMonday(9, 0).toISOString() },
    { id: "2", message: "Komen Program A jam 12:00", created_at: makeWibMonday(12, 0).toISOString() },
    { id: "3", message: "Komen Program B jam 14:05", created_at: makeWibMonday(14, 5).toISOString() },
  ];

  const sessionStartMs = session.sessionStart.getTime();
  const retained = comments.filter((c) => new Date(c.created_at).getTime() >= sessionStartMs);

  assert.equal(retained.length, 1);
  assert.equal(retained[0].id, "3");
  assert.equal(retained[0].message, "Komen Program B jam 14:05");
});

test("Aturan 7: Senin 18:30 (setelah Program B selesai, tidak ada program lagi) -> komentar Program B tetap bertahan", () => {
  const mondayLate = makeWibMonday(18, 30);
  const session = getActiveCommentSession(testPrograms, mondayLate);
  assert.equal(session.programName, "Program B");
  assert.equal(session.sessionStart.getTime(), makeWibMonday(14, 0).getTime());
});
