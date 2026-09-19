import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const SCOPE = "https://www.googleapis.com/auth/youtube.force-ssl";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const YOUTUBE_API = "https://www.googleapis.com/youtube/v3";

type StoredTokens = {
  access_token?: string;
  refresh_token: string;
  expiry_date?: number;
  scope?: string;
  token_type?: string;
};

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

function oauthConfig() {
  const clientId = process.env.YOUTUBE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.YOUTUBE_OAUTH_CLIENT_SECRET?.trim();
  const redirectUri = process.env.YOUTUBE_OAUTH_REDIRECT_URI?.trim();
  const encryptionKey = process.env.YOUTUBE_TOKEN_ENCRYPTION_KEY?.trim();
  if (!clientId || !clientSecret || !redirectUri || !encryptionKey) return null;
  const key = Buffer.from(encryptionKey, "base64");
  if (key.length !== 32) throw new Error("YOUTUBE_TOKEN_ENCRYPTION_KEY harus base64 dari 32 byte.");
  return { clientId, clientSecret, redirectUri, key };
}

const TOKEN_PATH = path.join(".data", "youtube-oauth.json.enc");

export function isYouTubeOAuthConfigured() {
  return oauthConfig() !== null;
}

export function createAuthorizationUrl(state: string) {
  const config = oauthConfig();
  if (!config) throw new Error("OAuth YouTube belum dikonfigurasi di server.");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  return url;
}

function encrypt(tokens: StoredTokens, key: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(tokens), "utf8"), cipher.final()]);
  return JSON.stringify({ version: 1, iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), data: encrypted.toString("base64") });
}

function decrypt(raw: string, key: Buffer): StoredTokens {
  const value = JSON.parse(raw) as { version?: number; iv?: string; tag?: string; data?: string };
  if (value.version !== 1 || !value.iv || !value.tag || !value.data) throw new Error("Format token YouTube tidak valid.");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(value.iv, "base64"));
  decipher.setAuthTag(Buffer.from(value.tag, "base64"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(value.data, "base64")), decipher.final()]).toString("utf8"));
}

async function loadTokens(): Promise<StoredTokens | null> {
  const config = oauthConfig();
  if (!config) return null;
  try { return decrypt(await readFile(TOKEN_PATH, "utf8"), config.key); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function saveTokens(tokens: StoredTokens) {
  const config = oauthConfig();
  if (!config) throw new Error("OAuth YouTube belum dikonfigurasi di server.");
  const destination = TOKEN_PATH;
  await mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
  const temporary = `${destination}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, encrypt(tokens, config.key), { encoding: "utf8", mode: 0o600 });
  await rename(temporary, destination);
}

async function tokenRequest(parameters: URLSearchParams) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: parameters,
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  const data = await response.json() as TokenResponse;
  if (!response.ok || !data.access_token) throw new Error(data.error_description || data.error || "Google gagal memberikan access token.");
  return data;
}

export async function exchangeAuthorizationCode(code: string) {
  const config = oauthConfig();
  if (!config) throw new Error("OAuth YouTube belum dikonfigurasi di server.");
  const data = await tokenRequest(new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: "authorization_code",
  }));
  if (!data.refresh_token) throw new Error("Google tidak mengirim refresh token. Cabut akses aplikasi lalu hubungkan ulang.");
  await saveTokens({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expiry_date: Date.now() + (data.expires_in || 3600) * 1000,
    scope: data.scope,
    token_type: data.token_type,
  });
}

async function accessToken() {
  const config = oauthConfig();
  const stored = await loadTokens();
  if (!config || !stored?.refresh_token) throw new Error("Akun YouTube belum terhubung.");
  if (stored.access_token && stored.expiry_date && stored.expiry_date > Date.now() + 60_000) return stored.access_token;
  const data = await tokenRequest(new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: stored.refresh_token,
    grant_type: "refresh_token",
  }));
  await saveTokens({ ...stored, access_token: data.access_token, expiry_date: Date.now() + (data.expires_in || 3600) * 1000,
    scope: data.scope || stored.scope, token_type: data.token_type || stored.token_type });
  return data.access_token!;
}

export async function youtubeRequest<T>(pathname: string, init?: RequestInit): Promise<T> {
  const token = await accessToken();
  const response = await fetch(`${YOUTUBE_API}${pathname}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return {} as T;
  }
  const text = await response.text();
  let data: Record<string, unknown> | null = null;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  if (!response.ok) {
    const errorMsg = (data?.error as { message?: string } | undefined)?.message;
    throw new Error(errorMsg || `YouTube API error ${response.status}.`);
  }
  return (data || {}) as unknown as T;
}

export async function hasStoredYouTubeAccount() {
  return Boolean((await loadTokens())?.refresh_token);
}

export async function disconnectYouTubeAccount() {
  const stored = await loadTokens();
  let revoked = false;
  if (stored?.refresh_token) {
    try {
      const response = await fetch("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: stored.refresh_token }),
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
      });
      revoked = response.ok;
    } catch { revoked = false; }
  }
  try { await unlink(TOKEN_PATH); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  return { disconnected: true, revoked };
}
