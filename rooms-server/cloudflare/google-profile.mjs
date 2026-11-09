// Only verified Google ID-token claims may initialize a remote profile photo.
export function googlePicture(value) {
  if (typeof value !== 'string' || value.length > 2048) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && !url.username && !url.password && !url.port &&
        (url.hostname === 'googleusercontent.com' || url.hostname.endsWith('.googleusercontent.com'))) return url.href;
  } catch { /* A missing/invalid optional picture must not prevent sign-in. */ }
  return undefined;
}

export const googlePictureUpdateSql = 'UPDATE users SET avatar = ? WHERE id = ? AND avatar_custom = 0';

export async function applyGooglePicture(env, user, picture) {
  const avatar = googlePicture(picture);
  if (avatar) {
    // The SQL condition also protects an edit made during sign-in on another device.
    await env.DB.prepare(googlePictureUpdateSql).bind(avatar, user.id).run();
  }
  return await env.DB.prepare('SELECT id, name, avatar FROM users WHERE id = ?').bind(user.id).first();
}


// Keep Google names within the same UTF-16 limit used by the profile editor.
export function googleDisplayName(value) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed || /[\u0000-\u001f\u007f-\u009f]/u.test(trimmed)) return undefined;
  let name = '';
  for (const character of trimmed) {
    if (name.length + character.length > 32) break;
    name += character;
  }
  return name;
}

export function initialGoogleName(verifiedName, sdkName) {
  return googleDisplayName(verifiedName) ?? googleDisplayName(sdkName) ?? 'トレーニー';
}
