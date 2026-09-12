import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadEnv(file) {
  if (!existsSync(file)) return;
  const content = readFileSync(file, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const k = trimmed.slice(0, eqIdx).trim();
      const v = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[k]) {
        process.env[k] = v;
      }
    }
  }
}

loadEnv(resolve(__dirname, "../.env.local"));
loadEnv(resolve(__dirname, "../.env"));

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Supabase URL or Key not found in environment.");
  process.exit(1);
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

function normalize(urlStr) {
  if (!urlStr || typeof urlStr !== "string") return urlStr;
  const trimmed = urlStr.trim();
  if (trimmed.includes("/storage/v1/object/public/penyiar/")) {
    const filename = trimmed.split("/storage/v1/object/public/penyiar/")[1]?.split("?")[0];
    return `/penyiar/${filename}`;
  }
  if (trimmed.includes("/storage/v1/object/public/banners/")) {
    const filename = trimmed.split("/storage/v1/object/public/banners/")[1]?.split("?")[0];
    return `/banners/${filename}`;
  }
  if (trimmed.includes("/storage/v1/object/public/programs/")) {
    const filename = trimmed.split("/storage/v1/object/public/programs/")[1]?.split("?")[0];
    return `/programs/${filename}`;
  }
  return trimmed;
}

async function getRows(table, columns) {
  const res = await fetch(`${url}/rest/v1/${table}?select=${columns}`, { headers });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${table}: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function patchRow(table, idCol, idVal, updatePayload) {
  const res = await fetch(`${url}/rest/v1/${table}?${idCol}=eq.${encodeURIComponent(idVal)}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(updatePayload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to update ${table} (${idVal}): ${res.status} ${text}`);
  }
  return res.json();
}

async function migrate() {
  console.log("=== Migrating Supabase DB Asset URLs to Local Server Paths ===");

  // 1. Announcers
  try {
    const announcers = await getRows("announcers", "id,photo_url");
    for (const a of announcers) {
      const updated = normalize(a.photo_url);
      if (updated !== a.photo_url) {
        await patchRow("announcers", "id", a.id, { photo_url: updated });
        console.log(`Updated announcer ${a.id}: ${a.photo_url} -> ${updated}`);
      }
    }
  } catch (err) {
    console.warn("Announcers migration note:", err.message);
  }

  // 2. Banners
  try {
    const banners = await getRows("banners", "id,image_url");
    for (const b of banners) {
      const updated = normalize(b.image_url);
      if (updated !== b.image_url) {
        await patchRow("banners", "id", b.id, { image_url: updated });
        console.log(`Updated banner ${b.id}: ${b.image_url} -> ${updated}`);
      }
    }
  } catch (err) {
    console.warn("Banners migration note:", err.message);
  }

  // 3. Programs
  try {
    const programs = await getRows("programs", "id,cover_url");
    for (const p of programs) {
      const updated = normalize(p.cover_url);
      if (updated !== p.cover_url) {
        await patchRow("programs", "id", p.id, { cover_url: updated });
        console.log(`Updated program ${p.id}: ${p.cover_url} -> ${updated}`);
      }
    }
  } catch (err) {
    console.warn("Programs migration note:", err.message);
  }

  // 4. Now Playing
  try {
    const np = await getRows("now_playing", "id,current_cover_url");
    for (const item of np) {
      const updated = normalize(item.current_cover_url);
      if (updated !== item.current_cover_url) {
        await patchRow("now_playing", "id", item.id, { current_cover_url: updated });
        console.log(`Updated now_playing ${item.id}: ${item.current_cover_url} -> ${updated}`);
      }
    }
  } catch (err) {
    console.warn("Now Playing migration note:", err.message);
  }

  console.log("Migration completed successfully!");
}

migrate().catch(console.error);
