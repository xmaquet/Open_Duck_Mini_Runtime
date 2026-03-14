export function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return 0;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

export function deadzone01(n: number, dz: number): number {
  const x = clamp(n, 0, 1);
  return x < dz ? 0 : x;
}

