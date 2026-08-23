export type TaskPriority = "URGENT" | "HIGH" | "MEDIUM" | "LOW";

export interface TaskLoad {
  durationMinutes: number;
  priority: TaskPriority;
}

export const PRIORITY_WEIGHTS: Record<TaskPriority, number> = {
  URGENT: 1.5,
  HIGH: 1.2,
  MEDIUM: 1.0,
  LOW: 0.8,
};

export const BURNOUT_ALERT_THRESHOLD = 75.0;
export const CONSECUTIVE_FOCUS_THRESHOLD_HOURS = 3;
export const CONSECUTIVE_FOCUS_FACTOR = 1.3;

export function computeBurnoutScore(tasks: TaskLoad[], consecutiveFocusHours: number): number {
  const weightedSum = tasks.reduce(
    (sum, t) => sum + t.durationMinutes * PRIORITY_WEIGHTS[t.priority],
    0
  );
  const factor =
    consecutiveFocusHours > CONSECUTIVE_FOCUS_THRESHOLD_HOURS ? CONSECUTIVE_FOCUS_FACTOR : 1.0;
  return weightedSum * factor;
}

export function isBurnoutRisk(score: number): boolean {
  return score > BURNOUT_ALERT_THRESHOLD;
}
