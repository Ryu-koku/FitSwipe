import React from 'react';
import { useApp } from '../context';
import { weightInputValue, weightToKg } from '../logic';
import { NumberField } from '../ui';

export function WeightField({ label, value, onChange }: React.ComponentProps<typeof NumberField>) {
  const { state } = useApp();
  const unit = state.weightUnit ?? 'kg';
  return <NumberField key={unit} label={label.replaceAll('kg', unit)} value={weightInputValue(value, unit)}
    onChange={(next) => onChange(next === undefined ? undefined : weightToKg(next, unit))} />;
}
