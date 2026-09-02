export interface WeeklyWindow {
  currentStartMs: number;
  currentEndMs: number;
  previousStartMs: number;
  previousEndMs: number;
  currentStartIso: string;
  currentEndIso: string;
  previousStartIso: string;
  previousEndIso: string;
}

function localMondayStart(value: Date): Date {
  const date = new Date(value.getTime());
  date.setHours(0, 0, 0, 0);
  const mondayOffset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - mondayOffset);
  return date;
}

function addLocalDays(value: Date, days: number): Date {
  const date = new Date(value.getTime());
  date.setDate(date.getDate() + days);
  return date;
}

/** Monday 00:00 through the next Monday 00:00 in the device's local timezone. */
export function getLocalWeeklyWindow(nowMs = Date.now()): WeeklyWindow {
  const currentStart = localMondayStart(new Date(nowMs));
  const currentEnd = addLocalDays(currentStart, 7);
  const previousStart = addLocalDays(currentStart, -7);
  return {
    currentStartMs: currentStart.getTime(),
    currentEndMs: currentEnd.getTime(),
    previousStartMs: previousStart.getTime(),
    previousEndMs: currentStart.getTime(),
    currentStartIso: currentStart.toISOString(),
    currentEndIso: currentEnd.toISOString(),
    previousStartIso: previousStart.toISOString(),
    previousEndIso: currentStart.toISOString(),
  };
}

export function isTimestampInWindow(value: string | null | undefined, startMs: number, endMs: number): boolean {
  if (!value) return false;
  const at = Date.parse(value);
  return Number.isFinite(at) && at >= startMs && at < endMs;
}

export function localDateKey(value: string): string | null {
  const at = Date.parse(value);
  if (!Number.isFinite(at)) return null;
  const date = new Date(at);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
