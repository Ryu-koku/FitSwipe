import React from 'react';
import Svg, { Path } from 'react-native-svg';

const paths = {
  check: 'm5 12 4 4L19 6',
  skip: 'm5 5 10 7-10 7ZM19 5v14',
  dumbbell: 'M7 12h10M3 9v6m4-9v12m10-12v12m4-9v6M3 12h4m10 0h4',
  home: 'M3 10 12 3l9 7v11h-6v-7H9v7H3Z',
  people: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 1 1 8 0m4-3.87a4 4 0 0 1 0 7.75',
  settings: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2ZM15 12a3 3 0 1 1-6 0 3 3 0 1 1 6 0',
  plus: 'M12 5v14M5 12h14',
  play: 'm8 4 12 8-12 8Z',
  back: 'm15 4-8 8 8 8',
  undo: 'm9 4-5 5 5 5M4 9h10a6 6 0 0 1 0 12',
  next: 'm9 4 8 8-8 8',
  close: 'm6 6 12 12M6 18 18 6',
  edit: 'm15 5 4 4M4 20l5-1L21 7l-4-4L5 15Z',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  refresh: 'M20 7a9 9 0 1 0 1 8M20 2v6h-6',
  flame: 'M12 2c1 5 5 6 4 10 2-1 3-3 3-4 7 11-1 15-7 15C1 23 1 12 7 8c-1 4 1 5 2 5 2-3 0-6 3-11Z',
} as const;
export type AppIconName = keyof typeof paths;

export function AppIcon({ name, color, size = 24 }: { name: AppIconName; color: string; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
    <Path d={paths[name]} stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill={name === 'flame' ? color : 'none'} />
  </Svg>;
}

export const symbolIcons: Record<string, AppIconName> = {
  '⚙': 'settings', '⌂': 'home', '♧': 'people', '+': 'plus', '＋': 'plus',
  '▶': 'play', '‹': 'back', '›': 'next', '×': 'close', '✎': 'edit', '⋯': 'more', '↻': 'refresh', '↶': 'undo',
};
