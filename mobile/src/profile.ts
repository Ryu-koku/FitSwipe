import type { AppState, RoomIdentity } from './types';

export const MAX_AVATAR_LENGTH = 24_000;
export function isGoogleAvatar(value: unknown): boolean {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
      (url.hostname === 'googleusercontent.com' || url.hostname.endsWith('.googleusercontent.com'));
  } catch { return false; }
}

export function validateProfile(name: string, avatar: string | null) {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 32 || /[\u0000-\u001f\u007f-\u009f]/u.test(trimmed)) {
    throw new Error('表示名は1〜32文字で入力してください。');
  }
  if (avatar !== null && !isGoogleAvatar(avatar) && (avatar.length > MAX_AVATAR_LENGTH || !/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/u.test(avatar))) {
    throw new Error('アイコンを読み込めませんでした。別の画像を選んでください。');
  }
  return { name: trimmed, avatar };
}

export function applyProfile(state: AppState, account: RoomIdentity): AppState {
  if ((state.roomIdentity && state.roomIdentity.id !== account.id) || (state.cloud && state.cloud.identity.id !== account.id)) throw new Error('アカウントが変更されました。もう一度お試しください。');
  const profile = { name: account.name, avatar: account.avatar };
  return {
    ...state, roomIdentity: account,
    cloud: state.cloud ? { ...state.cloud, identity: { ...state.cloud.identity, ...profile } } : undefined,
    // Fetch room summaries again so renamed members are reordered correctly.
    rooms: state.rooms.map(room => ({ ...room, memberNames: undefined, memberProfiles: undefined })),
    roomDetails: Object.fromEntries(Object.entries(state.roomDetails).map(([id, detail]) => [id, {
      ...detail,
      members: detail.members.map(member => member.id === account.id ? { ...member, ...profile } : member),
      posts: detail.posts.map(post => post.userId === account.id ? { ...post, name: account.name } : post),
    }])),
  };
}
