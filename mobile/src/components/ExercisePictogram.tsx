import React, { useEffect, useId, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { AppIcon } from './AppIcon';
import { Sheet, useTheme } from '../ui';
import { exerciseVisual, playExerciseIllustration } from '../exercise-visuals';
import { exerciseVisualAssets } from '../exercise-visual-assets';
import { useExerciseMotion, useExerciseVisibility } from '../exercise-motion';

export function ExercisePictogram({ name, large = false, animate = true, preview = false, inPreview = false, size }: {
  name: string;
  large?: boolean;
  animate?: boolean;
  preview?: boolean;
  inPreview?: boolean;
  size?: number;
}) {
  const { colors, styles } = useTheme();
  const visual = exerciseVisual(name);
  const assets = visual && exerciseVisualAssets[visual.key];
  const motion = useExerciseMotion();
  const host = useRef<React.ElementRef<typeof View>>(null);
  const visible = useExerciseVisibility(host);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState<number>();
  const id = useId();
  const overlay = motion?.overlay;
  useEffect(() => () => overlay?.(id, false), [overlay, id]);
  const show = (value: boolean) => { overlay?.(id, value); setOpen(value); };
  const playing = playExerciseIllustration({
    enabled: animate && !open,
    animated: !!visual?.animated,
    visible,
    focused: motion?.focused ?? false,
    appState: motion?.appState ?? null,
    reducedMotion: motion?.reducedMotion,
    covered: !!motion?.covered && !inPreview,
  });
  const candidate = assets && (playing ? assets.animation : assets.poster);
  const source = assets && failed === candidate ? assets.poster : candidate;
  const content = source !== undefined && failed !== assets?.poster ? <Image
    source={source}
    contentFit="contain"
    autoplay={playing}
    transition={0}
    recyclingKey={`${visual!.key}:${playing ? 'motion' : 'still'}`}
    accessible={large}
    accessibilityLabel={`${name}の動作の見本`}
    onError={() => setFailed(source)}
    style={{ width: '100%', height: '100%' }}
  /> : <AppIcon name="dumbbell" color={colors.primary} size={large ? 64 : 30} />;
  const picture = <View ref={host} collapsable={false} onLayout={motion?.refresh}
    pointerEvents="none"
    style={{ ...(large ? { flex: 1, width: '100%' as const, height: '100%' as const, minHeight: 72 } : { width: size ?? 64, height: size ?? 60, flexShrink: 0 }),
      alignItems: 'center', justifyContent: 'center', borderRadius: large ? 16 : 10, overflow: 'hidden' }}>
    {content}
  </View>;
  if (!preview || large) return picture;
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`${name}の動きを拡大する`}
      onPress={(event) => { event.stopPropagation(); show(true); }}
      style={{ borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
      {picture}
    </Pressable>
    {open && <Sheet title={name} popup onClose={() => show(false)}>
      <View style={{ height: 280 }}><ExercisePictogram name={name} large inPreview /></View>
      {!visual?.animated && visual && <Text style={[styles.small, { textAlign: 'center' }]}>姿勢を保つ種目です</Text>}
    </Sheet>}
  </>;
}
