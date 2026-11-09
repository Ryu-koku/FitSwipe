// Both the label and ring use the same wall clock, including after backgrounding.
export function restRemaining(startedAt: number, endsAt: number, clock: number) {
  const milliseconds = Math.max(0, endsAt - clock);
  const duration = endsAt - startedAt;
  return {
    seconds: Math.ceil(milliseconds / 1000),
    fraction: duration > 0 ? Math.min(1, milliseconds / duration) : 0,
  };
}
