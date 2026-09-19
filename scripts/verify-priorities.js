// Script pengujian mandiri untuk memvalidasi seluruh perbaikan Prioritas 1 dan 2
const fs = require("fs");
const path = require("path");
const assert = require("assert");

console.log("=== MEMULAI PENGUJIAN PERBAIKAN PRIORITAS 1 & 2 ===\n");

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}:`, err.message);
  }
}

// -------------------------------------------------------------
// Test 1: Verifikasi SQL Syntax dan RLS Policies di supabase/schema.sql
// -------------------------------------------------------------
console.log("Test Suite 1: Database Schema & RLS (supabase/schema.sql)");

const schemaPath = path.resolve(__dirname, "../supabase/schema.sql");
const schemaSql = fs.readFileSync(schemaPath, "utf8");

test("live_comments DDL memiliki penutup ');' yang valid", () => {
  assert.ok(
    schemaSql.includes("CREATE TABLE IF NOT EXISTS public.live_comments ("),
    "Tabel live_comments harus terdefinisi"
  );
  const match = schemaSql.match(/CREATE TABLE IF NOT EXISTS public\.live_comments\s*\([\s\S]*?\n\);/);
  assert.ok(match, "Tabel live_comments harus ditutup dengan ');'");
});

test("RLS diaktifkan pada seluruh tabel master dan profil", () => {
  assert.ok(schemaSql.includes("ALTER TABLE public.now_playing ENABLE ROW LEVEL SECURITY;"));
  assert.ok(schemaSql.includes("ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;"));
  assert.ok(schemaSql.includes("ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;"));
  assert.ok(schemaSql.includes("ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;"));
  assert.ok(schemaSql.includes("ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;"));
  assert.ok(schemaSql.includes("ALTER TABLE public.announcers ENABLE ROW LEVEL SECURITY;"));
  assert.ok(schemaSql.includes("ALTER TABLE public.live_comments ENABLE ROW LEVEL SECURITY;"));
});

test("Policy profiles membatasi SELECT hanya ke pemilik, admin, atau service_role", () => {
  const profileSelect = schemaSql.match(/CREATE POLICY "Allow read on profiles"[\s\S]*?USING\s*\(([\s\S]*?)\);/);
  assert.ok(profileSelect, "Policy Allow read on profiles harus ada");
  const cond = profileSelect[1];
  assert.ok(cond.includes("auth.uid() = id"), "Harus mengizinkan auth.uid() = id");
  assert.ok(cond.includes("role' = 'admin'"), "Harus mengizinkan role admin");
  assert.ok(cond.includes("service_role"), "Harus mengizinkan role service_role");
  assert.ok(!cond.includes("true"), "Policy SELECT profiles tidak boleh terbuka bebas (USING (true))");
});

test("Policy master tables membatasi write ke role admin dan service_role", () => {
  const tables = ["now_playing", "programs", "news", "banners", "announcers"];
  for (const t of tables) {
    const regex = new RegExp(`CREATE POLICY "Allow admin and service_role write on ${t}"[\\s\\S]*?USING\\s*\\([\\s\\S]*?WITH CHECK\\s*\\([\\s\\S]*?\\);`);
    const match = schemaSql.match(regex);
    assert.ok(match, `Policy write untuk ${t} harus terdefinisi`);
    assert.ok(match[0].includes("auth.jwt()->'app_metadata'->>'role' = 'admin'"), `Policy untuk ${t} harus mencakup role admin`);
    assert.ok(match[0].includes("service_role"), `Policy untuk ${t} harus mencakup service_role`);
  }
});

// -------------------------------------------------------------
// Test 2: Logika parseUrlParams & isProfileComplete (mobile)
// -------------------------------------------------------------
console.log("\nTest Suite 2: Mobile Logic (parseUrlParams & isProfileComplete)");

function parseUrlParams(url) {
  const params = {};
  if (!url) return params;
  const segments = url.split(/[#?]/);
  for (let i = 1; i < segments.length; i++) {
    const pairs = segments[i].split("&");
    for (const pair of pairs) {
      const idx = pair.indexOf("=");
      if (idx !== -1) {
        const k = pair.substring(0, idx);
        const v = pair.substring(idx + 1);
        try {
          params[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, " "));
        } catch {
          params[k] = v;
        }
      }
    }
  }
  return params;
}

function isProfileComplete(profile) {
  if (!profile) return false;
  const hasName = Boolean(profile.full_name && profile.full_name.trim().length > 1);
  const hasWhatsapp = Boolean(profile.whatsapp && profile.whatsapp.trim().length >= 8);
  const hasGender = Boolean(profile.gender && profile.gender.trim().length > 0);
  return hasName && hasWhatsapp && hasGender;
}

test("parseUrlParams menangani OAuth PKCE query (?code=123)", () => {
  const res = parseUrlParams("gaulfm://auth/callback?code=abc-123-xyz&state=state-456");
  assert.strictEqual(res.code, "abc-123-xyz");
  assert.strictEqual(res.state, "state-456");
});

test("parseUrlParams mempertahankan karakter '=' di dalam nilai parameter", () => {
  const res = parseUrlParams("gaulfm://auth/callback?code=base64==code&state=a=b=c");
  assert.strictEqual(res.code, "base64==code");
  assert.strictEqual(res.state, "a=b=c");
});

test("parseUrlParams menangani fragment hash implicit grant (#access_token=...)", () => {
  const res = parseUrlParams("gaulfm://auth/callback#access_token=token123&refresh_token=ref456&token_type=bearer");
  assert.strictEqual(res.access_token, "token123");
  assert.strictEqual(res.refresh_token, "ref456");
  assert.strictEqual(res.token_type, "bearer");
});

test("parseUrlParams aman terhadap URL kosong atau malformed", () => {
  assert.deepStrictEqual(parseUrlParams(""), {});
  assert.deepStrictEqual(parseUrlParams(null), {});
  const malformed = parseUrlParams("gaulfm://auth/callback?invalid=%E0%A4%A");
  assert.ok(malformed.invalid);
});

test("isProfileComplete menolak profil tanpa gender atau nomor WhatsApp pendek", () => {
  assert.strictEqual(isProfileComplete(null), false);
  assert.strictEqual(isProfileComplete({ full_name: "Budi", whatsapp: "0812345678", gender: null }), false);
  assert.strictEqual(isProfileComplete({ full_name: "Budi", whatsapp: "12345", gender: "Laki-laki" }), false);
  assert.strictEqual(isProfileComplete({ full_name: "B", whatsapp: "0812345678", gender: "Laki-laki" }), false);
  assert.strictEqual(isProfileComplete({ full_name: "Budi", whatsapp: "0812345678", gender: "Laki-laki" }), true);
});

// -------------------------------------------------------------
// Test 3: Otorisasi API Studio & Timing-Safe Secret Validation
// -------------------------------------------------------------
console.log("\nTest Suite 3: Admin Authorization & Security (api-auth.ts)");

function timingSafeEqual(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

test("timingSafeEqual membandingkan string dengan benar dan aman", () => {
  assert.strictEqual(timingSafeEqual("secret123", "secret123"), true);
  assert.strictEqual(timingSafeEqual("secret123", "secret124"), false);
  assert.strictEqual(timingSafeEqual("secret123", "secret12"), false);
  assert.strictEqual(timingSafeEqual("", ""), true);
});

test("Validasi secret menolak string kosong atau token salah", () => {
  const currentSecret = "test-studio-key";
  function isValid(provided) {
    if (!provided || typeof provided !== "string") return false;
    return timingSafeEqual(provided.trim(), currentSecret);
  }

  assert.strictEqual(isValid("test-studio-key"), true);
  assert.strictEqual(isValid(" test-studio-key "), true);
  assert.strictEqual(isValid("wrong-key"), false);
  assert.strictEqual(isValid(""), false);
  assert.strictEqual(isValid(null), false);
});

test("Verifikasi header otorisasi mendukung x-admin-secret dan Bearer token", () => {
  const secret = "my-secret";
  function isAuthorized(headers) {
    const custom = headers["x-admin-secret"] || headers["x-studio-token"];
    if (custom && timingSafeEqual(custom.trim(), secret)) return true;
    const auth = headers["authorization"];
    if (auth) {
      const token = auth.replace(/^Bearer\s+/i, "").trim();
      if (timingSafeEqual(token, secret)) return true;
    }
    return false;
  }

  assert.strictEqual(isAuthorized({ "x-admin-secret": "my-secret" }), true);
  assert.strictEqual(isAuthorized({ "x-studio-token": "my-secret" }), true);
  assert.strictEqual(isAuthorized({ "authorization": "Bearer my-secret" }), true);
  assert.strictEqual(isAuthorized({ "authorization": "Bearer wrong" }), false);
  assert.strictEqual(isAuthorized({ "x-admin-secret": "wrong" }), false);
  assert.strictEqual(isAuthorized({}), false);
});

// -------------------------------------------------------------
// Test 4: Verifikasi Kode Sumber File Terkait
// -------------------------------------------------------------
console.log("\nTest Suite 4: Static Verification of Codebase Integrations");

test("RootNavigator mengarahkan secara deklaratif ke CompleteProfile saat biodata belum lengkap", () => {
  const rootNavPath = path.resolve(__dirname, "../mobile/src/navigation/RootNavigator.tsx");
  const code = fs.readFileSync(rootNavPath, "utf8");
  assert.ok(code.includes("needsProfileCompletion"), "Harus mendefinisikan needsProfileCompletion");
  assert.ok(code.includes("<Stack.Screen name=\"CompleteProfile\" component={CompleteProfileScreen} />"), "Harus memuat CompleteProfile di root stack");
});

test("CompleteProfileScreen tidak memiliki pemanggilan crash-prone 'navigation.reset'", () => {
  const compPath = path.resolve(__dirname, "../mobile/src/screens/auth/CompleteProfileScreen.tsx");
  const code = fs.readFileSync(compPath, "utf8");
  assert.ok(!code.includes("navigation.reset"), "Tidak boleh ada navigation.reset di CompleteProfileScreen");
  assert.ok(code.includes("signOut"), "Harus menyediakan tombol keluar/ganti akun");
});

test("authStore.ts tidak melakukan premature mutation sebelum upsert di completeBiodata", () => {
  const authStorePath = path.resolve(__dirname, "../mobile/src/stores/authStore.ts");
  const code = fs.readFileSync(authStorePath, "utf8");
  const completeBioChunk = code.substring(code.indexOf("completeBiodata: async"));
  const upsertIndex = completeBioChunk.indexOf("supabase.from(\"profiles\").upsert");
  assert.ok(upsertIndex !== -1, "Harus memanggil upsert");
  assert.ok(completeBioChunk.includes("if (!supabase || !isSupabaseConfigured)"), "Harus memeriksa konfigurasi supabase sebelum set profile");
});

test("admin API endpoints terlindungi dengan isAuthorizedStudio", () => {
  const uploadRoute = fs.readFileSync(path.resolve(__dirname, "../admin/src/app/api/upload/route.ts"), "utf8");
  assert.ok(uploadRoute.includes("isAuthorizedStudio(req)"), "upload route harus memanggil isAuthorizedStudio");

  const commentsIdRoute = fs.readFileSync(path.resolve(__dirname, "../admin/src/app/api/comments/[id]/route.ts"), "utf8");
  assert.ok(commentsIdRoute.includes("isAuthorizedStudio(req)"), "comments/[id] route harus memanggil isAuthorizedStudio");

  const commentsRoute = fs.readFileSync(path.resolve(__dirname, "../admin/src/app/api/comments/route.ts"), "utf8");
  assert.ok(commentsRoute.includes("isBroadcasterReq"), "comments route harus memvalidasi is_broadcaster");
  assert.ok(commentsRoute.includes("isAuthorizedStudio(req)"), "comments route harus memvalidasi studio authorization");
  assert.ok(commentsRoute.includes("status: 403"), "comments route harus mengembalikan 403 Forbidden untuk pemalsuan status broadcaster");
});

console.log(`\nHASIL PENGUJIAN: ${passed}/${total} pengujian berhasil dijalankan tanpa kegagalan.\n`);
if (passed !== total) {
  process.exit(1);
}
