import "server-only";
import fs from "fs";
import crypto from "crypto";

interface TokenCache {
  token: string;
  expiry: number;
}

const tokenCache: Record<string, TokenCache> = {};

function base64url(data: Buffer): string {
  return data.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Returns the path to the Google Application Credentials file.
 */
export function getCredentialsPath(): string {
  const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (envPath && fs.existsSync(envPath)) {
    return envPath;
  }
  
  // Default unified fallback path
  const defaultPath = "/etc/medisoft/credentials/gcp-credentials.json";
  if (fs.existsSync(defaultPath)) {
    return defaultPath;
  }

  // Backup fallback path used in consent-management
  const backupPath = "/home/ubuntu/medisoft-app/gcp-credentials.json";
  if (fs.existsSync(backupPath)) {
    return backupPath;
  }

  throw new Error("Google application credentials file not found. Set GOOGLE_APPLICATION_CREDENTIALS.");
}

/**
 * Reads and parses the Google Service Account credentials.
 */
export function getCredentials(): any {
  const path = getCredentialsPath();
  const content = fs.readFileSync(path, "utf-8");
  return JSON.parse(content);
}

/**
 * Obtains an OAuth2 access token for the given scopes.
 */
export async function getAccessTokenForScopes(scopes: string): Promise<string> {
  const cacheKey = scopes;
  const cached = tokenCache[cacheKey];
  if (cached && Date.now() < cached.expiry - 60000) {
    return cached.token;
  }

  const creds = getCredentials();
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: creds.client_email,
    scope: scopes,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const headerB64 = base64url(Buffer.from(JSON.stringify(header)));
  const payloadB64 = base64url(Buffer.from(JSON.stringify(payload)));
  const signInput = `${headerB64}.${payloadB64}`;

  const sign = crypto.createSign("RSA-SHA256");
  sign.update(signInput);
  const signature = base64url(sign.sign(creds.private_key));

  const jwt = `${signInput}.${signature}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Failed to get access token for scopes [${scopes}]: ${err}`);
  }

  const tokenData = await tokenRes.json();
  tokenCache[cacheKey] = {
    token: tokenData.access_token,
    expiry: Date.now() + (tokenData.expires_in || 3600) * 1000,
  };

  return tokenCache[cacheKey].token;
}

export interface FetchOptions extends RequestInit {
  timeoutMs?: number;
  maxRetries?: number;
  backoffFactor?: number;
}

/**
 * Performs a fetch request with support for timeout and exponential backoff retries.
 */
export async function fetchWithRetry(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const {
    timeoutMs = 30000, // 30s default timeout
    maxRetries = 3,
    backoffFactor = 2,
    ...fetchInit
  } = options;

  let attempt = 0;
  let delay = 1000; // start with 1s delay

  while (true) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      attempt++;
      const res = await fetch(url, {
        ...fetchInit,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      // Retry on transient status codes: 429 (Too Many Requests), 5xx (Server Errors)
      if (attempt <= maxRetries && (res.status === 429 || res.status >= 500)) {
        console.warn(`[GCP API] Request to ${url} failed with status ${res.status}. Retrying in ${delay}ms... (Attempt ${attempt}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= backoffFactor;
        continue;
      }

      return res;
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isAbort = err.name === "AbortError";
      const message = isAbort ? `Request timed out after ${timeoutMs}ms` : err.message;
      
      if (attempt <= maxRetries) {
        console.warn(`[GCP API] Request to ${url} failed with error: ${message}. Retrying in ${delay}ms... (Attempt ${attempt}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= backoffFactor;
        continue;
      }
      
      throw new Error(`[GCP API] Request failed after ${attempt} attempts: ${message}`);
    }
  }
}
