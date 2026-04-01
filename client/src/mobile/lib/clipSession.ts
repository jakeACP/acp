import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'acp-signal-clips';
const DB_VERSION = 1;
const STORE_CLIPS = 'clips';
const STORE_META = 'meta';

export interface ClipEntry {
  id: string;
  blob: Blob;
  duration: number;
  timestamp: number;
}

export interface SessionMetadata {
  filter: string;
  totalDuration: number;
  durationLimit: number;
  category?: string;
  clipIds: string[];
  clipDurations: number[];
}

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_CLIPS)) {
        db.createObjectStore(STORE_CLIPS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META);
      }
    },
  });
}

export async function saveClip(clip: ClipEntry): Promise<void> {
  const db = await getDB();
  await db.put(STORE_CLIPS, clip);
}

export async function getClips(): Promise<ClipEntry[]> {
  const db = await getDB();
  const all = await db.getAll(STORE_CLIPS) as ClipEntry[];
  return all.sort((a, b) => a.timestamp - b.timestamp);
}

export async function deleteLastClip(): Promise<void> {
  const db = await getDB();
  const all = await db.getAll(STORE_CLIPS) as ClipEntry[];
  if (all.length === 0) return;
  const last = all.sort((a, b) => a.timestamp - b.timestamp).at(-1)!;
  await db.delete(STORE_CLIPS, last.id);
}

export async function clearSession(): Promise<void> {
  const db = await getDB();
  await db.clear(STORE_CLIPS);
  await db.clear(STORE_META);
}

export async function saveMetadata(meta: SessionMetadata): Promise<void> {
  const db = await getDB();
  await db.put(STORE_META, meta, 'current');
}

export async function getMetadata(): Promise<SessionMetadata | undefined> {
  const db = await getDB();
  return db.get(STORE_META, 'current') as Promise<SessionMetadata | undefined>;
}
