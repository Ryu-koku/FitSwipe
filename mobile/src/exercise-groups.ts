import type { Exercise } from './types';

export const muscleGroups = ['胸', '背中', '肩', '腕', '脚', '腹', 'その他'];
const defaults: Record<string, string> = {
  ベンチプレス: '胸', ラットプルダウン: '背中', レッグプレス: '脚',
  スクワット: '脚', 腕立て伏せ: '胸', 'ダンベルカール（左右）': '腕', プランク: '腹',
};
export function exerciseGroup(exercise: Pick<Exercise, 'name' | 'muscleGroup'>) {
  const group = exercise.muscleGroup?.trim();
  return group && group !== '未分類' ? group : defaults[exercise.name] ?? 'その他';
}
