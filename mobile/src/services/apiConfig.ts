import Constants from "expo-constants";

/**
 * Konfigurasi URL API Server Terpusat & Agnostik.
 *
 * Mendukung pemindahan server ke VPS/Azure baru, AWS, Vercel, ataupun custom domain
 * hanya dengan mengganti variabel EXPO_PUBLIC_API_URL tanpa perlu mengubah kode sumber.
 */

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;

export const DEFAULT_SERVER_API_URL = "http://40.81.231.250:3001";

/**
 * Mendapatkan basis URL server backend secara dinamis.
 */
export function getServerApiUrl(): string {
  // 1. Prioritas utama: Environment variable dari .env
  if (process.env.EXPO_PUBLIC_API_URL) {
    return cleanUrl(process.env.EXPO_PUBLIC_API_URL);
  }

  // 2. Prioritas kedua: Konfigurasi extra dari app.config.ts / app.json
  if (typeof extra.apiUrl === "string" && extra.apiUrl.startsWith("http")) {
    return cleanUrl(extra.apiUrl);
  }
  if (typeof extra.adminApiUrl === "string" && extra.adminApiUrl.startsWith("http")) {
    return cleanUrl(extra.adminApiUrl);
  }

  // 3. Fallback default ke server produksi saat ini
  return DEFAULT_SERVER_API_URL;
}

/**
 * Membentuk URL endpoint lengkap dari server backend.
 */
export function buildApiUrl(path: string): string {
  const base = getServerApiUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

/**
 * Helper fetch terpusat untuk komunikasi dengan server backend Gaul FM.
 * Secara otomatis menyisipkan cache-buster timestamp query param dan header no-cache
 * untuk memastikan data siaran/realtime selalu segar dan tidak tertahan oleh HTTP caching perangkat.
 */
export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const separator = path.includes("?") ? "&" : "?";
  const urlWithCacheBuster = `${path}${separator}_t=${Date.now()}`;
  const fullUrl = buildApiUrl(urlWithCacheBuster);

  const headers = new Headers(options.headers || {});
  if (!headers.has("Cache-Control")) {
    headers.set("Cache-Control", "no-cache");
  }
  if (!headers.has("Pragma")) {
    headers.set("Pragma", "no-cache");
  }

  return fetch(fullUrl, {
    ...options,
    headers,
  });
}

function cleanUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

/**
 * Mengubah path relatif atau URL Supabase Storage menjadi URL absolut server SSH backend.
 * Memastikan tidak ada kuota bandwidth Supabase Storage yang tersedot saat aplikasi memuat gambar.
 */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();

  // 1. Alihkan URL Supabase Storage ke server SSH backend
  if (trimmed.includes("/storage/v1/object/public/penyiar/")) {
    const filename = trimmed.split("/storage/v1/object/public/penyiar/")[1]?.split("?")[0];
    return buildApiUrl(`/penyiar/${filename}`);
  }
  if (trimmed.includes("/storage/v1/object/public/banners/")) {
    const filename = trimmed.split("/storage/v1/object/public/banners/")[1]?.split("?")[0];
    return buildApiUrl(`/banners/${filename}`);
  }
  if (trimmed.includes("/storage/v1/object/public/programs/")) {
    const filename = trimmed.split("/storage/v1/object/public/programs/")[1]?.split("?")[0];
    return buildApiUrl(`/programs/${filename}`);
  }

  // 2. Jika path relatif (misal: "/penyiar/attaya.png"), sambungkan ke host server backend
  if (trimmed.startsWith("/")) {
    return buildApiUrl(trimmed);
  }

  return trimmed;
}
