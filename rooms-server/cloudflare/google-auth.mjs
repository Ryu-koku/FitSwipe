// Verify locally against Google's public signing keys; never trust decoded claims
// or a client-supplied email as proof of identity.
let cachedKeys;
let keysExpireAt = 0;

export class GoogleAuthError extends Error {}

function decode(value) {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) throw new GoogleAuthError("Invalid token");
  return Uint8Array.from(atob(value.replaceAll("-", "+").replaceAll("_", "/")), (c) => c.charCodeAt(0));
}

export async function verifyGoogleToken(token, audience, options = {}) {
  if (!audience) throw new GoogleAuthError("Google login is not configured");
  if (typeof token !== "string" || token.length > 16_384) throw new GoogleAuthError("Invalid token");
  const now = options.now ?? Math.floor(Date.now() / 1000);
  let header, claims, parts;
  try {
    parts = token.split(".");
    if (parts.length !== 3) throw new Error();
    header = JSON.parse(new TextDecoder().decode(decode(parts[0])));
    claims = JSON.parse(new TextDecoder().decode(decode(parts[1])));
  } catch {
    throw new GoogleAuthError("Invalid token");
  }
  if (header.alg !== "RS256" || typeof header.kid !== "string" ||
      !["https://accounts.google.com", "accounts.google.com"].includes(claims.iss) ||
      claims.aud !== audience || (claims.azp !== undefined &&
        ![audience, ...(options.authorizedPresenters ?? [])].includes(claims.azp)) ||
      typeof claims.sub !== "string" || !claims.sub || claims.sub.length > 255 ||
      !Number.isInteger(claims.exp) || claims.exp <= now ||
      !Number.isInteger(claims.iat) || claims.iat > now + 60 || claims.exp <= claims.iat) {
    throw new GoogleAuthError("Invalid token claims");
  }
  let keys = options.keys;
  if (!keys) {
    if (!cachedKeys || keysExpireAt <= now) {
      const result = await fetch("https://www.googleapis.com/oauth2/v3/certs", {
        redirect: "error", signal: AbortSignal.timeout(10_000),
      });
      if (!result.ok) throw new GoogleAuthError("Google keys unavailable");
      const data = await result.json();
      if (!Array.isArray(data.keys)) throw new GoogleAuthError("Google keys unavailable");
      cachedKeys = data.keys;
      keysExpireAt = now + 300;
    }
    keys = cachedKeys;
  }
  const jwk = keys.find((key) => key.kid === header.kid && key.kty === "RSA" && key.alg === "RS256");
  if (!jwk) throw new GoogleAuthError("Unknown signing key");
  try {
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, decode(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
    if (!valid) throw new Error();
  } catch {
    throw new GoogleAuthError("Invalid token signature");
  }
  return { subject: claims.sub };
}
