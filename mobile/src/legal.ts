// Keep the terms version in sync with rooms-server/cloudflare/safety.mjs.
export const TERMS_VERSION = '2026-11-09';
const publicOrigin = (process.env.EXPO_PUBLIC_ROOMS_URL ?? 'https://fitswipe-rooms-api.prompt-tem.workers.dev').replace(/\/$/, '');
export const legalUrls = {
  privacy: `${publicOrigin}/privacy`,
  terms: `${publicOrigin}/terms`,
  deletion: `${publicOrigin}/delete-account`,
  support: `${publicOrigin}/support`,
};
export type SafetyStatus = { termsVersion: string; accepted: boolean; blocked: { id: string; name: string }[] };
export const reportReasons = [
  ['harassment', '嫌がらせ・脅迫'], ['sexual', '性的・不適切な画像'], ['hate', '差別・憎悪表現'],
  ['personal_data', '個人情報・権利侵害'], ['spam', 'スパム・詐欺'], ['other', 'その他'],
] as const;
export type ReportReason = typeof reportReasons[number][0];
