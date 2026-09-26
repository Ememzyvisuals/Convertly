// Crash/close recovery for the Studio editor. Everything in Convertly runs locally in the
// browser, so "don't lose the user's work" has to mean a local store, not a server-side save.
//
// Why IndexedDB and not localStorage: a Studio design can hold several full-resolution image
// layers as data URLs, easily many megabytes. localStorage is synchronous, string-only, and
// capped around 5 to 10MB in most browsers, so a couple of photos would blow the quota and
// throw. IndexedDB is asynchronous (never blocks the UI thread on save), has a much larger
// practical quota (a meaningful share of free disk space, commonly hundreds of MB or more),
// and survives a hard crash or an accidental tab close the same way any other on-disk browser
// storage does, since it is written to disk, not just kept in memory.
//
// The save is debounced so a drag or a slider does not hammer IndexedDB on every frame, but the
// debounce window is kept short (900ms) and is also flushed immediately whenever the tab is
// hidden or about to unload, so a crash right after an edit still only risks under a second of
// work, not the whole session.

const DB_NAME = "convertly-studio";
const DB_VERSION = 1;
const STORE_NAME = "autosave";
const RECORD_ID = "current";
const DEBOUNCE_MS = 900;

export interface StudioAutosaveRecord {
  id: string;
  presetId: string;
  backgroundFill: string;
  elements: unknown[]; // StudioElement[], kept untyped here to avoid a circular import
  title?: string;
  // Only meaningful when presetId is "custom" (a genuine custom canvas size has no catalog
  // entry to look back up by id), so the real pixel size survives a crash-recovery restore.
  presetWidth?: number;
  presetHeight?: number;
  savedAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB is not available in this browser."));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Could not open the autosave database."));
  });
  return dbPromise;
}

export async function saveStudioAutosave(record: Omit<StudioAutosaveRecord, "id" | "savedAt">): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put({ ...record, id: RECORD_ID, savedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Autosave write failed."));
    });
  } catch {
    // Best-effort only: a failed autosave (private browsing, storage disabled, quota exceeded)
    // should never interrupt the person's actual editing.
  }
}

export async function loadStudioAutosave(): Promise<StudioAutosaveRecord | null> {
  try {
    const db = await openDb();
    return await new Promise<StudioAutosaveRecord | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(RECORD_ID);
      req.onsuccess = () => resolve((req.result as StudioAutosaveRecord | undefined) ?? null);
      req.onerror = () => reject(req.error ?? new Error("Autosave read failed."));
    });
  } catch {
    return null;
  }
}

export async function clearStudioAutosave(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(RECORD_ID);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Autosave clear failed."));
    });
  } catch {
    // best-effort, see saveStudioAutosave
  }
}

// A debounced saver plus force-flush on tab hide/unload, so the only work genuinely at risk
// during a crash is whatever happened in the last fraction of a second.
export function createAutosaveScheduler(getSnapshot: () => Omit<StudioAutosaveRecord, "id" | "savedAt">) {
  let timer: number | null = null;

  function flushNow() {
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
    void saveStudioAutosave(getSnapshot());
  }

  function schedule() {
    if (timer !== null) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = null;
      void saveStudioAutosave(getSnapshot());
    }, DEBOUNCE_MS);
  }

  const onVisibilityChange = () => {
    if (document.hidden) flushNow();
  };
  const onPageHide = () => flushNow();
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("pagehide", onPageHide);
  window.addEventListener("beforeunload", onPageHide);

  return {
    schedule,
    flushNow,
    dispose() {
      if (timer !== null) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onPageHide);
    },
  };
}

export function formatSavedAt(ms: number): string {
  const diffSec = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (diffSec < 60) return "moments ago";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  const date = new Date(ms);
  return date.toLocaleString();
}
