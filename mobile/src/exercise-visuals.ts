import definitions from './data/exercise-visuals.json';

export type ExerciseVisual = typeof definitions[number];
export const exerciseVisuals: readonly ExerciseVisual[] = definitions;

// Match whole normalized names and explicit aliases. An incline curl must not
// accidentally inherit a standing curl just because their names overlap.
export const visualNameKey = (name: string) =>
  name.normalize('NFKC').replace(/[\s・･]/g, '').toLocaleLowerCase();

const byName = new Map<string, ExerciseVisual>();
for (const definition of definitions) {
  for (const name of [definition.name, ...definition.aliases]) {
    const key = visualNameKey(name);
    const existing = byName.get(key);
    if (existing && existing.key !== definition.key) throw new Error(`Duplicate exercise illustration: ${name}`);
    byName.set(key, definition);
  }
}

export const exerciseVisual = (name: string) => byName.get(visualNameKey(name));

export function visibleIllustration(
  rect: { x: number; y: number; width: number; height: number },
  screen: { width: number; height: number },
) {
  return Object.values(rect).every(Number.isFinite) && rect.width > 0 && rect.height > 0 &&
    rect.x < screen.width && rect.y < screen.height && rect.x + rect.width > 0 && rect.y + rect.height > 0;
}

export function playExerciseIllustration(options: {
  enabled: boolean;
  animated: boolean;
  visible: boolean;
  focused: boolean;
  appState: string | null;
  reducedMotion: boolean | undefined;
  covered: boolean;
}) {
  return options.enabled && options.animated && options.visible && options.focused &&
    options.appState === 'active' && options.reducedMotion === false && !options.covered;
}
