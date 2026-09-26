// A soft, per-browser usage counter, the client-side equivalent of "how a site knows
// you're logged in": state kept in this browser (localStorage), not a server-enforced limit.
// It resets at local midnight and is scoped to this browser/device, so clearing site data
// or opening a private window resets it. That's an intentional tradeoff for a backend-free,
// drag-and-drop-deployable app, it's a usage nudge, not real abuse prevention.

const STORAGE_KEY = "convertly:usage";
export const DAILY_LIMIT = 100;

interface UsageRecord {
  date: string; // YYYY-MM-DD, local
  count: number;
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function read(): UsageRecord {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { date: todayKey(), count: 0 };
    const parsed = JSON.parse(raw) as UsageRecord;
    if (parsed.date !== todayKey()) return { date: todayKey(), count: 0 };
    return parsed;
  } catch {
    // localStorage unavailable (private mode edge cases, storage disabled), treat as unlimited
    // for this session rather than blocking the tool over a storage quirk.
    return { date: todayKey(), count: 0 };
  }
}

function write(record: UsageRecord): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Ignore, see note above.
  }
}

export interface UsageStatus {
  used: number;
  limit: number;
  remaining: number;
  atLimit: boolean;
}

export function getUsageStatus(): UsageStatus {
  const { count } = read();
  return {
    used: count,
    limit: DAILY_LIMIT,
    remaining: Math.max(0, DAILY_LIMIT - count),
    atLimit: count >= DAILY_LIMIT,
  };
}

/** Call once a job actually completes successfully. */
export function recordCompletedOperation(): UsageStatus {
  const record = read();
  record.count += 1;
  write(record);
  return getUsageStatus();
}
