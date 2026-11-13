export type HomeCardId = 'progress' | 'muscleSets';
export type HomeProgressSize = 'small' | 'medium' | 'large';
export type HomeDisplay = { cards: { id: HomeCardId; visible: boolean }[]; progressSize: HomeProgressSize };

export const defaultHomeDisplay = (): HomeDisplay => ({
  cards: [{ id: 'progress', visible: true }, { id: 'muscleSets', visible: true }],
  progressSize: 'medium',
});

export function homeDisplay(value?: Partial<HomeDisplay>): HomeDisplay {
  const defaults = defaultHomeDisplay();
  const cards = defaults.cards.map(card => value?.cards?.find(item => item.id === card.id) ?? card);
  cards.sort((a, b) => (value?.cards?.findIndex(item => item.id === a.id) ?? -1) - (value?.cards?.findIndex(item => item.id === b.id) ?? -1));
  return { cards, progressSize: value?.progressSize ?? defaults.progressSize };
}

export function moveHomeCard(display: HomeDisplay, id: HomeCardId, offset: number): HomeDisplay {
  const cards = [...display.cards];
  const from = cards.findIndex(card => card.id === id);
  if (from < 0) return display;
  const to = Math.max(0, Math.min(cards.length - 1, from + offset));
  cards.splice(to, 0, ...cards.splice(from, 1));
  return { ...display, cards };
}
