export interface MicroStep {
  minutes: number;
  rationale: string;
}

export const DECOMPOSE_MINUTES_THRESHOLD = 120;
export const DECOMPOSE_POSTPONEMENT_THRESHOLD = 2;
export const MAX_STEP_MINUTES = 15;
export const MIN_STEPS = 3;

export function computeFriction(estimatedMinutes: number, postponementCount: number): number {
  return (estimatedMinutes / MAX_STEP_MINUTES) * (1 + postponementCount * 0.2);
}

export function shouldDecompose(estimatedMinutes: number, postponementCount: number): boolean {
  return (
    estimatedMinutes > DECOMPOSE_MINUTES_THRESHOLD || postponementCount >= DECOMPOSE_POSTPONEMENT_THRESHOLD
  );
}

// ponytail: spec's "3-5 steps" only holds for tasks <= 75 min; step size <= 15 is the hard
// constraint, so larger tasks legitimately produce more steps (121 min -> 9 x ~13 min).
export function decomposeTask(estimatedMinutes: number): MicroStep[] {
  const count = Math.max(MIN_STEPS, Math.ceil(estimatedMinutes / MAX_STEP_MINUTES));
  const base = Math.floor(estimatedMinutes / count);
  const remainder = estimatedMinutes % count;
  const steps: MicroStep[] = [];
  for (let i = 0; i < count; i++) {
    const minutes = base + (i < remainder ? 1 : 0);
    steps.push({ minutes, rationale: `Step ${i + 1} of ${count}: ${minutes} min` });
  }
  return steps;
}
