/**
 * Modul autentikasi & otorisasi API internal Admin Gaul FM.
 * Digunakan untuk mengamankan endpoint studio: uploads, moderasi chat, dan posting pesan broadcaster.
 */

/**
 * Constant-time string comparison untuk mencegah timing attacks pada verifikasi secret.
 * Menggunakan perbandingan bitwise tanpa dependensi modul native Node.js agar kompatibel di semua environment (server & client bundle).
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Mendapatkan secret token studio/admin yang dikonfigurasi di server.
 * Pada mode produksi, secret WAJIB dikonfigurasi melalui environment variable.
 * Pada mode pengembangan non-produksi (development / test), fallback digunakan untuk kelancaran DX.
 */
export function getAdminSecret(): string {
  const envSecret =
    process.env.ADMIN_SECRET?.trim() ||
    process.env.STUDIO_SECRET?.trim() ||
    process.env.NEXT_PUBLIC_ADMIN_SECRET?.trim() ||
    process.env.NEXT_PUBLIC_STUDIO_SECRET?.trim();

  if (envSecret) {
    return envSecret;
  }

  if (process.env.NODE_ENV !== "production") {
    return "gaulfm-dev-secret-key";
  }

  return "";
}

/**
 * Secret token yang dapat diakses oleh client component admin untuk request internal.
 */
export const ADMIN_CLIENT_SECRET =
  process.env.NEXT_PUBLIC_ADMIN_SECRET?.trim() ||
  process.env.NEXT_PUBLIC_STUDIO_SECRET?.trim() ||
  (process.env.NODE_ENV !== "production" ? "gaulfm-dev-secret-key" : "");

/**
 * Memeriksa apakah token yang diberikan valid sesuai secret studio/admin secara timing-safe.
 */
export function isValidAdminSecret(providedSecret: string | null | undefined): boolean {
  if (!providedSecret || typeof providedSecret !== "string") return false;
  const configured = getAdminSecret();
  if (!configured) return false;
  return timingSafeEqual(providedSecret.trim(), configured);
}

/**
 * Memvalidasi apakah request memiliki header otorisasi studio/admin yang sah.
 * Mendukung header `x-admin-secret`, `x-studio-token`, atau `Authorization: Bearer <token>`.
 */
export function isAuthorizedStudio(req: Request): boolean {
  // 1. Cek custom header
  const customHeader =
    req.headers.get("x-admin-secret") ||
    req.headers.get("x-studio-token") ||
    req.headers.get("x-admin-token");

  if (customHeader && isValidAdminSecret(customHeader)) {
    return true;
  }

  // 2. Cek Authorization Bearer header
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (isValidAdminSecret(token)) {
      return true;
    }
  }

  return false;
}

