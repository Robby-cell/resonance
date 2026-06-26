/**
 * IndexedDB-backed local music library.
 *
 * Stores audio blobs and metadata entirely on-device (browser cache).
 * No data ever leaves the user's device.
 */

export type SongRecord = {
  id: string;
  title: string;
  artist: string;
  album?: string;
  durationSec: number;
  addedAt: number;
  liked: boolean;
  playCount: number;
  /** MIME type of the source audio (audio/mpeg, audio/wav, ...) */
  mimeType: string;
  /** File size in bytes (original). */
  size: number;
  /** Optional cover art blob (image/*). */
  coverBlob?: Blob | null;
  /** Cover art MIME type. */
  coverMime?: string;
  /** Remote cover URL (for embed songs — from oEmbed). */
  coverUrl?: string;
  /** Source URL for songs added via link (no blob). */
  sourceUrl?: string;
  /** Whether this song is a remote (URL) track vs uploaded blob. */
  isRemote: boolean;
  /** How this song is played back. */
  sourceType: "blob" | "direct" | "embed";
  /** For embed songs: the iframe embed URL. */
  embedUrl?: string;
  /** For embed songs: which platform's embed. */
  embedType?: "spotify" | "soundcloud" | "youtube";
  /** Display name of the provider that resolved this song. */
  providerName?: string;
  /** Whether this song has been "soft deleted" — kept as a placeholder in playlists. */
  deleted?: boolean;
  /** When the song was soft-deleted (timestamp). */
  deletedAt?: number;
};

export type PlaylistRecord = {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  /** Ordered list of song ids. */
  songIds: string[];
  /** Optional cover art (data URL or generated gradient seed). */
  coverSeed?: string;
  /** Whether this is a system playlist (e.g. Liked Songs). */
  system?: boolean;
};

const DB_NAME = "resonance";
const DB_VERSION = 1;
const SONGS_STORE = "songs";
const SONG_BLOBS_STORE = "songBlobs";
const COVERS_STORE = "covers";
const PLAYLISTS_STORE = "playlists";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("IndexedDB not available on server"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(SONGS_STORE)) {
        const s = db.createObjectStore(SONGS_STORE, { keyPath: "id" });
        s.createIndex("addedAt", "addedAt");
        s.createIndex("liked", "liked");
      }
      if (!db.objectStoreNames.contains(SONG_BLOBS_STORE)) {
        db.createObjectStore(SONG_BLOBS_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(COVERS_STORE)) {
        db.createObjectStore(COVERS_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(PLAYLISTS_STORE)) {
        const p = db.createObjectStore(PLAYLISTS_STORE, { keyPath: "id" });
        p.createIndex("updatedAt", "updatedAt");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(
  store: string | string[],
  mode: IDBTransactionMode,
  fn: (
    tx: IDBTransaction,
    stores: Record<string, IDBObjectStore>,
  ) => Promise<T> | T,
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(store, mode);
        const stores: Record<string, IDBObjectStore> = {};
        const names = Array.isArray(store) ? store : [store];
        names.forEach((n) => (stores[n] = transaction.objectStore(n)));
        let result: T;
        Promise.resolve(fn(transaction, stores))
          .then((r) => (result = r))
          .catch(reject);
        transaction.oncomplete = () => resolve(result!);
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      }),
  );
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ---- Songs ----

export async function putSongMeta(song: SongRecord): Promise<void> {
  await tx(SONGS_STORE, "readwrite", (_t, stores) => {
    stores[SONGS_STORE].put(song);
  });
}

export async function getAllSongsMeta(): Promise<SongRecord[]> {
  return tx(SONGS_STORE, "readonly", (_t, stores) =>
    reqToPromise(stores[SONGS_STORE].getAll() as IDBRequest<SongRecord[]>),
  );
}

export async function getSongMeta(id: string): Promise<SongRecord | undefined> {
  return tx(SONGS_STORE, "readonly", (_t, stores) =>
    reqToPromise(
      stores[SONGS_STORE].get(id) as IDBRequest<SongRecord | undefined>,
    ),
  );
}

export async function deleteSongMeta(id: string): Promise<void> {
  await tx(SONGS_STORE, "readwrite", (_t, stores) => {
    stores[SONGS_STORE].delete(id);
  });
}

// ---- Song audio blobs ----

export async function putSongBlob(id: string, blob: Blob): Promise<void> {
  await tx(SONG_BLOBS_STORE, "readwrite", (_t, stores) => {
    stores[SONG_BLOBS_STORE].put({ id, blob });
  });
}

export async function getSongBlob(id: string): Promise<Blob | undefined> {
  return tx(SONG_BLOBS_STORE, "readonly", (_t, stores) => {
    const r = stores[SONG_BLOBS_STORE].get(id);
    return reqToPromise(r).then((v: any) => v?.blob as Blob | undefined);
  });
}

export async function deleteSongBlob(id: string): Promise<void> {
  await tx(SONG_BLOBS_STORE, "readwrite", (_t, stores) => {
    stores[SONG_BLOBS_STORE].delete(id);
  });
}

// ---- Cover art blobs ----

export async function putCover(id: string, blob: Blob): Promise<void> {
  await tx(COVERS_STORE, "readwrite", (_t, stores) => {
    stores[COVERS_STORE].put({ id, blob });
  });
}

export async function getCover(id: string): Promise<Blob | undefined> {
  return tx(COVERS_STORE, "readonly", (_t, stores) => {
    const r = stores[COVERS_STORE].get(id);
    return reqToPromise(r).then((v: any) => v?.blob as Blob | undefined);
  });
}

// ---- Playlists ----

export async function putPlaylist(p: PlaylistRecord): Promise<void> {
  await tx(PLAYLISTS_STORE, "readwrite", (_t, stores) => {
    stores[PLAYLISTS_STORE].put(p);
  });
}

export async function getAllPlaylists(): Promise<PlaylistRecord[]> {
  return tx(PLAYLISTS_STORE, "readonly", (_t, stores) =>
    reqToPromise(
      stores[PLAYLISTS_STORE].getAll() as IDBRequest<PlaylistRecord[]>,
    ),
  );
}

export async function deletePlaylist(id: string): Promise<void> {
  await tx(PLAYLISTS_STORE, "readwrite", (_t, stores) => {
    stores[PLAYLISTS_STORE].delete(id);
  });
}

// ---- Bulk wipe ----

export async function clearAll(): Promise<void> {
  await tx(
    [SONGS_STORE, SONG_BLOBS_STORE, COVERS_STORE, PLAYLISTS_STORE],
    "readwrite",
    (_t, stores) => {
      stores[SONGS_STORE].clear();
      stores[SONG_BLOBS_STORE].clear();
      stores[COVERS_STORE].clear();
      stores[PLAYLISTS_STORE].clear();
    },
  );
}

// ---- Storage estimate ----

export async function getStorageEstimate(): Promise<{
  usage: number;
  quota: number;
}> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
    return { usage: 0, quota: 0 };
  }
  const est = await navigator.storage.estimate();
  return {
    usage: est.usage ?? 0,
    quota: est.quota ?? 0,
  };
}
