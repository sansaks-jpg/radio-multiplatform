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

function cleanUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}
