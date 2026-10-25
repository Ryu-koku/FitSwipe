import React from 'react';
import { Image } from 'react-native';

const pictures = {
  ダンベルカール: require('../../assets/dumbbell_curl.png'),
  ペクトラルフライ: require('../../assets/pectoral_fly.png'),
  インクラインダンベルプレス: require('../../assets/incline_dumbbell_press.png'),
  ダンベルサイドレイズ: require('../../assets/dumbbell_lateral_raise.png'),
};

export function ExercisePictogram({ name }: { name: string }) {
  const match = Object.entries(pictures).find(([label]) =>
    name.includes(label),
  );
  return match ? (
    <Image
      source={match[1]}
      style={{ width: 68, height: 54, borderRadius: 10 }}
      resizeMode="contain"
      accessibilityLabel={name}
    />
  ) : null;
}
