import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper to read env variables manually without external dotenv dependency
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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Supabase URL or Key not found in environment.");
  process.exit(1);
}

const supabase = createClient(url, key);

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

async function migrate() {
  console.log("=== Migrating Supabase DB Asset URLs to Local Server Paths ===");

  // 1. Announcers
  const { data: announcers, error: annErr } = await supabase.from("announcers").select("id, photo_url");
  if (annErr) {
    console.warn("Could not query announcers:", annErr.message);
  } else if (announcers) {
    for (const a of announcers) {
      const updated = normalize(a.photo_url);
      if (updated !== a.photo_url) {
        const { error } = await supabase.from("announcers").update({ photo_url: updated }).eq("id", a.id);
        console.log(`Updated announcer ${a.id}: ${a.photo_url} -> ${updated} (${error ? error.message : "OK"})`);
      }
    }
  }

  // 2. Banners
  const { data: banners, error: banErr } = await supabase.from("banners").select("id, image_url");
  if (banErr) {
    console.warn("Could not query banners:", banErr.message);
  } else if (banners) {
    for (const b of banners) {
      const updated = normalize(b.image_url);
      if (updated !== b.image_url) {
        const { error } = await supabase.from("banners").update({ image_url: updated }).eq("id", b.id);
        console.log(`Updated banner ${b.id}: ${b.image_url} -> ${updated} (${error ? error.message : "OK"})`);
      }
    }
  }

  // 3. Programs
  const { data: programs, error: progErr } = await supabase.from("programs").select("id, cover_url");
  if (progErr) {
    console.warn("Could not query programs:", progErr.message);
  } else if (programs) {
    for (const p of programs) {
      const updated = normalize(p.cover_url);
      if (updated !== p.cover_url) {
        const { error } = await supabase.from("programs").update({ cover_url: updated }).eq("id", p.id);
        console.log(`Updated program ${p.id}: ${p.cover_url} -> ${updated} (${error ? error.message : "OK"})`);
      }
    }
  }

  // 4. Now Playing
  const { data: np, error: npErr } = await supabase.from("now_playing").select("id, current_cover_url");
  if (npErr) {
    console.warn("Could not query now_playing:", npErr.message);
  } else if (np) {
    for (const item of np) {
      const updated = normalize(item.current_cover_url);
      if (updated !== item.current_cover_url) {
        const { error } = await supabase.from("now_playing").update({ current_cover_url: updated }).eq("id", item.id);
        console.log(`Updated now_playing ${item.id}: ${item.current_cover_url} -> ${updated} (${error ? error.message : "OK"})`);
      }
    }
  }

  console.log("Migration completed successfully!");
}

migrate().catch(console.error);
