import React from 'react';
import { Image, View } from 'react-native';

import { AppIcon } from './AppIcon';
import { useTheme } from '../ui';

const pictures = {
  ダンベルカール: require('../../assets/dumbbell_curl.png'),
  ペクトラルフライ: require('../../assets/pectoral_fly.png'),
  インクラインダンベルプレス: require('../../assets/incline_dumbbell_press.png'),
  ダンベルサイドレイズ: require('../../assets/dumbbell_lateral_raise.png'),
};

export function ExercisePictogram({ name, large = false }: { name: string; large?: boolean }) {
  const { colors } = useTheme();
  const match = Object.entries(pictures).find(([label]) =>
    name.includes(label),
  );
  return match ? (
    <Image
      source={match[1]}
      style={large ? { width: '100%', height: '100%', borderRadius: 16 } : { width: 68, height: 54, borderRadius: 10 }}
      resizeMode="contain"
      accessibilityLabel={name}
    />
  ) : large ? <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><AppIcon name="dumbbell" color={colors.primary} size={64} /></View> : null;
}
