export type TourStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | null;
export type TourEvent = 'prepare' | 'preset-selected' | 'workout' | 'weight-changed' | 'reps-changed' | 'advanced' | 'exercise-moved' | 'finish' | 'exit';
export type TourTargetId = 'home-dock' | 'presets' | 'start-dock' | 'weight' | 'reps' | 'advance' | 'exercise';

export const tourSteps = {
  1: { target: 'home-dock', path: '/', text: '真ん中のボタンでメニューを開きます', event: 'prepare' },
  2: { target: 'presets', path: '/prepare', text: 'プリセットを選びます', event: 'preset-selected' },
  3: { target: 'start-dock', path: '/prepare', text: 'トレーニングを開始', event: 'workout' },
  4: { target: 'weight', path: '/workout', text: '上下に動かして重さを変更', event: 'weight-changed' },
  5: { target: 'reps', path: '/workout', text: '回数も同じように変更', event: 'reps-changed' },
  6: { target: 'advance', path: '/workout', text: '次のカードへ移動', event: 'advanced' },
  7: { target: 'exercise', path: '/workout', text: 'カードを上にスワイプして次の種目へ移動', event: 'exercise-moved' },
} as const;

export function initialTourStep(workoutInProgress: boolean): TourStep {
  return workoutInProgress ? 4 : 1;
}

export function tourReducer(step: TourStep, event: TourEvent): TourStep {
  if (event === 'exit' || (step === 8 && event === 'finish')) return null;
  if (step === null || step === 8) return step;
  return tourSteps[step].event === event ? (step + 1) as TourStep : step;
}
