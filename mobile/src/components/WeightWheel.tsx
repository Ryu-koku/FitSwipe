import React from 'react';
import { useApp } from '../context';
import { weightInputValue, weightStep, weightToKg } from '../logic';
import { WorkoutNumberWheel } from './WorkoutNumberWheel';

// Public values and callbacks remain kg; the wheel operates entirely in display units.
export function WeightWheel({ value, highlightValue, step, label, onChange, ...props }: React.ComponentProps<typeof WorkoutNumberWheel>) {
  const { state } = useApp();
  const unit = state.weightUnit ?? 'kg';
  return <WorkoutNumberWheel {...props} key={unit} label={label.replaceAll('kg', unit)} unit={unit}
    value={weightInputValue(value, unit)} highlightValue={weightInputValue(highlightValue, unit)}
    step={weightStep(step, unit)} onChange={(next) => onChange(weightToKg(next, unit))} />;
}
