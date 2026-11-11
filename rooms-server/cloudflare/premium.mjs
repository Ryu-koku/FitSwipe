export async function isPremium(userId, secretKey, fetcher = fetch, now = Date.now()) {
  if (!secretKey) return false;
  try {
    const response = await fetcher(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return false;
    const entitlement = (await response.json()).subscriber?.entitlements?.premium;
    return !!entitlement && (entitlement.expires_date === null ||
      (typeof entitlement.expires_date === 'string' && Date.parse(entitlement.expires_date) > now));
  } catch { return false; }
}
