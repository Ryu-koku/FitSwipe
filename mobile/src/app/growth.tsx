import React from 'react';
import { router } from 'expo-router';
import { Screen } from '../ui';
import { StrengthGrowth } from '../components/StrengthGrowth';

export default function GrowthScreen() {
  return <Screen title="筋力の成長" bottomDock={false} onBack={() => router.back()}><StrengthGrowth /></Screen>;
}
