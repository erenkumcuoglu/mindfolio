const DB_NAME = "mindfolio-studio";
const DB_VERSION = 1;
const STORE_NAME = "session";
const KEY = "current";
const AUDIO_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface StudioSession {
  audioChunks: Blob[];
  recordedBlob: Blob | null;
  elapsed: number;
  transcript: string;
  notes: string;
  language: string;
  draft: string;
  draftId: string | null;
  titleOptions: string[];
  selectedTitle: string;
  contentId: string | null;
  linkedIdea: { id: string; title: string; content?: string | null; tags?: string[]; preview: { site_name?: string } | null } | null;
  excerpts: Record<string, string>;
  updatedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getDefaultSession(): StudioSession {
  return {
    audioChunks: [],
    recordedBlob: null,
    elapsed: 0,
    transcript: "",
    notes: "",
    language: "",
    draft: "",
    draftId: null,
    titleOptions: [],
    selectedTitle: "",
    contentId: null,
    linkedIdea: null,
    excerpts: {},
    updatedAt: Date.now(),
  };
}

export async function loadSession(): Promise<StudioSession> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(KEY);
      req.onsuccess = () => {
        const data = req.result as StudioSession | undefined;
        db.close();
        if (!data) return resolve(getDefaultSession());

        // Discard audio if expired
        const now = Date.now();
        const age = now - data.updatedAt;
        if (age > AUDIO_TTL_MS) {
          data.audioChunks = [];
          data.recordedBlob = null;
          data.elapsed = 0;
        }
        resolve(data);
      };
      req.onerror = () => {
        db.close();
        resolve(getDefaultSession());
      };
    });
  } catch {
    return getDefaultSession();
  }
}

export async function saveSession(data: Partial<StudioSession>): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const getReq = tx.objectStore(STORE_NAME).get(KEY);
      getReq.onsuccess = () => {
        const existing = (getReq.result as StudioSession | undefined) ?? getDefaultSession();
        const merged: StudioSession = { ...existing, ...data, updatedAt: Date.now() };
        tx.objectStore(STORE_NAME).put(merged, KEY);
      };
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch {
    // silently fail — non-critical
  }
}

export async function clearAudio(): Promise<void> {
  await saveSession({ audioChunks: [], recordedBlob: null, elapsed: 0 });
}

export async function clearAll(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(KEY);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch {
    // silently fail
  }
}
