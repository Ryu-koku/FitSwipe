import React from 'react';
import Svg, { Path } from 'react-native-svg';

const paths = {
  home: 'M3 10 12 3l9 7v11h-6v-7H9v7H3Z',
  people: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 1 1 8 0m4-3.87a4 4 0 0 1 0 7.75',
  settings: 'M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1Zm7 9a4 4 0 1 1-8 0 4 4 0 1 1 8 0',
  plus: 'M12 5v14M5 12h14',
  play: 'm8 4 12 8-12 8Z',
  back: 'm15 4-8 8 8 8',
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
  '▶': 'play', '‹': 'back', '›': 'next', '×': 'close', '✎': 'edit', '⋯': 'more', '↻': 'refresh',
};
