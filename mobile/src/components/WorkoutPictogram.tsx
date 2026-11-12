import React, { startTransition, useEffect, useState } from 'react';
import { ExercisePictogram } from './ExercisePictogram';

// The exercise-keyed card preserves this slot when only the set/side changes.
// New artwork starts after the card commits, including visibility measurement
// and warmed animation startup; cold artwork keeps its existing loading stages.
export const WorkoutPictogram = React.memo(function WorkoutPictogram({ name }: { name: string }) {
  const [readyName, setReadyName] = useState<string>();
  useEffect(() => {
    let active = true;
    const frame = requestAnimationFrame(() => {
      if (active) startTransition(() => setReadyName(name));
    });
    return () => { active = false; cancelAnimationFrame(frame); };
  }, [name]);
  return readyName === name ? <ExercisePictogram name={name} large animate /> : null;
});
