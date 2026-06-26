"use client";

import { create } from "zustand";
import {
  SongRecord,
  PlaylistRecord,
  putSongMeta,
  getAllSongsMeta,
  getSongMeta,
  deleteSongMeta,
  putSongBlob,
  deleteSongBlob,
  putCover,
  putPlaylist,
  getAllPlaylists,
  deletePlaylist,
  clearAll,
} from "./db";
import { uid } from "./format";
import { getActiveEmbedController } from "./embedController";

export type RepeatMode = "off" | "all" | "one";

/** In-memory representation of a song for the UI (no blob). */
export type Song = SongRecord;

export type Playlist = PlaylistRecord;

type ViewState =
  | { kind: "home" }
  | { kind: "search" }
  | { kind: "library" }
  | { kind: "liked" }
  | { kind: "playlist"; id: string };

type LibraryStore = {
  // Data
  songs: Song[];
  playlists: Playlist[];
  loaded: boolean;

  // View
  view: ViewState;
  setView: (v: ViewState) => void;

  // Loading
  hydrate: () => Promise<void>;

  // Song operations
  addUploadedSong: (params: {
    title: string;
    artist: string;
    album?: string;
    durationSec: number;
    mimeType: string;
    size: number;
    blob: Blob;
    coverBlob?: Blob | null;
    coverMime?: string;
  }) => Promise<Song>;
  addRemoteSong: (params: {
    title: string;
    artist: string;
    album?: string;
    durationSec: number;
    url: string;
    mimeType?: string;
    coverBlob?: Blob | null;
    coverMime?: string;
    coverUrl?: string;
    sourceType?: "direct" | "embed";
    embedUrl?: string;
    embedType?: "spotify" | "soundcloud";
    providerName?: string;
  }) => Promise<Song>;
  updateSongMeta: (
    id: string,
    patch: Partial<Pick<Song, "title" | "artist" | "album" | "liked">>,
  ) => Promise<void>;
  /** Permanently remove a song from the library and all playlists. */
  removeSong: (id: string) => Promise<void>;
  /** Download a remote/embed song's audio and store it locally for offline playback. */
  downloadAndStoreAudio: (id: string) => Promise<void>;
  incrementPlayCount: (id: string) => Promise<void>;
  toggleLike: (id: string) => Promise<void>;

  // Playlist operations
  createPlaylist: (name?: string, description?: string) => Promise<Playlist>;
  renamePlaylist: (
    id: string,
    name: string,
    description?: string,
  ) => Promise<void>;
  deletePlaylistById: (id: string) => Promise<void>;
  addToPlaylist: (playlistId: string, songId: string) => Promise<void>;
  removeFromPlaylist: (playlistId: string, songId: string) => Promise<void>;
  reorderPlaylist: (
    playlistId: string,
    fromIndex: number,
    toIndex: number,
  ) => Promise<void>;

  // Bulk
  clearEverything: () => Promise<void>;
};

export const useLibraryStore = create<LibraryStore>((set, get) => ({
  songs: [],
  playlists: [],
  loaded: false,
  view: { kind: "home" },
  setView: (v) => set({ view: v }),

  hydrate: async () => {
    if (get().loaded) return;
    try {
      const [songs, playlists] = await Promise.all([
        getAllSongsMeta(),
        getAllPlaylists(),
      ]);

      // Ensure "Liked Songs" system playlist exists.
      let liked = playlists.find((p) => p.system && p.id === "liked");
      const all = [...playlists];
      if (!liked) {
        liked = {
          id: "liked",
          name: "Liked Songs",
          description: "Songs you've liked",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          songIds: songs.filter((s) => s.liked).map((s) => s.id),
          coverSeed: "liked",
          system: true,
        };
        await putPlaylist(liked);
        all.push(liked);
      } else {
        // Reconcile liked songIds with actual liked songs
        const likedIds = songs.filter((s) => s.liked).map((s) => s.id);
        if (
          JSON.stringify(
            new Set(likedIds).symmetricDifference(new Set(liked.songIds)).size,
          ) !== "0"
        ) {
          liked.songIds = likedIds;
          liked.updatedAt = Date.now();
          await putPlaylist(liked);
        }
      }

      set({
        songs: songs.sort((a, b) => b.addedAt - a.addedAt),
        playlists: all.sort((a, b) => b.updatedAt - a.updatedAt),
        loaded: true,
      });
    } catch (e) {
      console.error("Failed to hydrate library:", e);
      set({ loaded: true });
    }
  },

  addUploadedSong: async (params) => {
    const id = uid("song_");
    const now = Date.now();
    const song: Song = {
      id,
      title: params.title,
      artist: params.artist || "Unknown artist",
      album: params.album,
      durationSec: Math.round(params.durationSec),
      addedAt: now,
      liked: false,
      playCount: 0,
      mimeType: params.mimeType,
      size: params.size,
      coverBlob: null,
      coverMime: params.coverMime,
      isRemote: false,
      sourceType: "blob",
    };
    await putSongMeta(song);
    await putSongBlob(id, params.blob);
    if (params.coverBlob) {
      await putCover(id, params.coverBlob);
    }
    set((st) => ({ songs: [song, ...st.songs] }));
    return song;
  },

  addRemoteSong: async (params) => {
    const id = uid("song_");
    const now = Date.now();
    const song: Song = {
      id,
      title: params.title,
      artist: params.artist || "Unknown artist",
      album: params.album,
      durationSec: Math.round(params.durationSec) || 0,
      addedAt: now,
      liked: false,
      playCount: 0,
      mimeType: params.mimeType || "audio/mpeg",
      size: 0,
      coverBlob: null,
      coverMime: params.coverMime,
      coverUrl: params.coverUrl,
      sourceUrl: params.url,
      isRemote: true,
      sourceType: params.sourceType ?? "direct",
      embedUrl: params.embedUrl,
      embedType: params.embedType,
      providerName: params.providerName,
    };
    await putSongMeta(song);
    if (params.coverBlob) {
      await putCover(id, params.coverBlob);
    }
    set((st) => ({ songs: [song, ...st.songs] }));
    return song;
  },

  updateSongMeta: async (id, patch) => {
    const cur = get().songs.find((s) => s.id === id);
    if (!cur) return;
    const next = { ...cur, ...patch };
    await putSongMeta(next);
    set((st) => ({
      songs: st.songs.map((s) => (s.id === id ? next : s)),
    }));
  },

  removeSong: async (id) => {
    // Permanently delete: remove metadata, audio blob, cover, and purge from
    // all playlists.
    await deleteSongMeta(id);
    await deleteSongBlob(id);
    const playlists = get().playlists;
    for (const p of playlists) {
      if (p.songIds.includes(id)) {
        const updated = {
          ...p,
          songIds: p.songIds.filter((x) => x !== id),
          updatedAt: Date.now(),
        };
        await putPlaylist(updated);
      }
    }
    set((st) => ({
      songs: st.songs.filter((s) => s.id !== id),
      playlists: st.playlists.map((p) =>
        p.songIds.includes(id)
          ? {
              ...p,
              songIds: p.songIds.filter((x) => x !== id),
              updatedAt: Date.now(),
            }
          : p,
      ),
    }));
  },

  downloadAndStoreAudio: async (id) => {
    const cur = get().songs.find((s) => s.id === id);
    if (!cur || !cur.sourceUrl) return;
    if (cur.sourceType === "blob") return; // already stored locally

    // Try to fetch the audio and store it as a blob.
    const { fetchRemoteAudio } = await import("./audio");
    const result = await fetchRemoteAudio(cur.sourceUrl);
    if (!result.blob) {
      throw new Error(
        "Couldn't download this audio file. The source server may not allow cross-origin downloads (CORS).",
      );
    }
    const { putSongBlob } = await import("./db");
    await putSongBlob(id, result.blob);
    const updated: Song = {
      ...cur,
      isRemote: false,
      sourceType: "blob",
      size: result.blob.size,
      mimeType: result.mimeType || cur.mimeType,
      durationSec: result.durationSec ?? cur.durationSec,
    };
    await putSongMeta(updated);
    set((st) => ({
      songs: st.songs.map((s) => (s.id === id ? updated : s)),
    }));
  },

  incrementPlayCount: async (id) => {
    const cur = get().songs.find((s) => s.id === id);
    if (!cur) return;
    const next = { ...cur, playCount: cur.playCount + 1 };
    await putSongMeta(next);
    set((st) => ({
      songs: st.songs.map((s) => (s.id === id ? next : s)),
    }));
  },

  toggleLike: async (id) => {
    const cur = get().songs.find((s) => s.id === id);
    if (!cur) return;
    const liked = !cur.liked;
    const next = { ...cur, liked };
    await putSongMeta(next);

    // Update liked playlist
    const likedP = get().playlists.find((p) => p.id === "liked");
    if (likedP) {
      const newIds = liked
        ? [id, ...likedP.songIds.filter((x) => x !== id)]
        : likedP.songIds.filter((x) => x !== id);
      const updated = { ...likedP, songIds: newIds, updatedAt: Date.now() };
      await putPlaylist(updated);
      set((st) => ({
        songs: st.songs.map((s) => (s.id === id ? next : s)),
        playlists: st.playlists.map((p) => (p.id === "liked" ? updated : p)),
      }));
    } else {
      set((st) => ({
        songs: st.songs.map((s) => (s.id === id ? next : s)),
      }));
    }
  },

  createPlaylist: async (name, description) => {
    const now = Date.now();
    const playlist: Playlist = {
      id: uid("pl_"),
      name: name?.trim() || `My Playlist #${get().playlists.length + 1}`,
      description: description?.trim() || "",
      createdAt: now,
      updatedAt: now,
      songIds: [],
      coverSeed: uid(),
    };
    await putPlaylist(playlist);
    set((st) => ({ playlists: [playlist, ...st.playlists] }));
    return playlist;
  },

  renamePlaylist: async (id, name, description) => {
    const cur = get().playlists.find((p) => p.id === id);
    if (!cur) return;
    const updated: Playlist = {
      ...cur,
      name: name.trim() || cur.name,
      description: description ?? cur.description,
      updatedAt: Date.now(),
    };
    await putPlaylist(updated);
    set((st) => ({
      playlists: st.playlists.map((p) => (p.id === id ? updated : p)),
    }));
  },

  deletePlaylistById: async (id) => {
    if (id === "liked") return; // can't delete liked songs
    await deletePlaylist(id);
    set((st) => ({
      playlists: st.playlists.filter((p) => p.id !== id),
      view:
        st.view?.kind === "playlist" && st.view.id === id
          ? { kind: "library" }
          : st.view,
    }));
  },

  addToPlaylist: async (playlistId, songId) => {
    const cur = get().playlists.find((p) => p.id === playlistId);
    if (!cur) return;
    if (cur.songIds.includes(songId)) return;
    const updated = {
      ...cur,
      songIds: [...cur.songIds, songId],
      updatedAt: Date.now(),
    };
    await putPlaylist(updated);
    set((st) => ({
      playlists: st.playlists.map((p) => (p.id === playlistId ? updated : p)),
    }));
  },

  removeFromPlaylist: async (playlistId, songId) => {
    const cur = get().playlists.find((p) => p.id === playlistId);
    if (!cur) return;
    const updated = {
      ...cur,
      songIds: cur.songIds.filter((x) => x !== songId),
      updatedAt: Date.now(),
    };
    await putPlaylist(updated);
    set((st) => ({
      playlists: st.playlists.map((p) => (p.id === playlistId ? updated : p)),
    }));
  },

  reorderPlaylist: async (playlistId, fromIndex, toIndex) => {
    const cur = get().playlists.find((p) => p.id === playlistId);
    if (!cur) return;
    const ids = [...cur.songIds];
    const [moved] = ids.splice(fromIndex, 1);
    ids.splice(toIndex, 0, moved);
    const updated = { ...cur, songIds: ids, updatedAt: Date.now() };
    await putPlaylist(updated);
    set((st) => ({
      playlists: st.playlists.map((p) => (p.id === playlistId ? updated : p)),
    }));
  },

  clearEverything: async () => {
    await clearAll();
    set({ songs: [], playlists: [], view: { kind: "home" } });
    await get().hydrate();
  },
}));

// ---------- Player store ----------

type PlayerStore = {
  // Audio element ref (held externally to avoid serialization)
  audioEl: HTMLAudioElement | null;
  setAudioEl: (el: HTMLAudioElement | null) => void;

  // Queue
  queue: string[]; // song ids in original order
  shuffleQueue: string[]; // shuffled order when shuffle is on
  currentIndex: number; // index into the active queue
  isPlaying: boolean;

  // Modes
  shuffle: boolean;
  repeat: RepeatMode;

  // Volume
  volume: number; // 0..1
  muted: boolean;

  // Time
  currentTime: number;
  duration: number;

  // Active queue list (for the "Up Next" UI)
  history: string[];

  // Actions
  playSong: (songId: string, contextSongIds?: string[]) => void;
  playContext: (songIds: string[], startIndex?: number) => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seek: (sec: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setCurrentTime: (t: number) => void;
  setDuration: (d: number) => void;
  setIsPlaying: (p: boolean) => void;
  addToQueue: (songId: string) => void;
  playNext: (songId: string) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
};

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  audioEl: null,
  setAudioEl: (el) => set({ audioEl: el }),
  queue: [],
  shuffleQueue: [],
  currentIndex: -1,
  isPlaying: false,
  shuffle: false,
  repeat: "off",
  volume: 0.8,
  muted: false,
  currentTime: 0,
  duration: 0,
  history: [],

  playSong: (songId, contextSongIds) => {
    if (contextSongIds && contextSongIds.length > 0) {
      get().playContext(contextSongIds, contextSongIds.indexOf(songId));
      return;
    }
    // Just play this single song
    set({
      queue: [songId],
      shuffleQueue: [songId],
      currentIndex: 0,
      isPlaying: true,
      currentTime: 0,
    });
    const audio = get().audioEl;
    if (audio) {
      audio.currentTime = 0;
      void audio.play().catch(() => {});
    }
  },

  playContext: (songIds, startIndex = 0) => {
    if (songIds.length === 0) return;
    const shuf = get().shuffle
      ? (() => {
          const a = shuffleArray(songIds);
          // ensure start song is first
          const start = songIds[startIndex];
          if (start) {
            const i = a.indexOf(start);
            if (i >= 0) {
              a.splice(i, 1);
              a.unshift(start);
            }
          }
          return a;
        })()
      : songIds;
    set({
      queue: songIds,
      shuffleQueue: shuf,
      currentIndex:
        startIndex >= 0 && startIndex < songIds.length ? startIndex : 0,
      isPlaying: true,
      currentTime: 0,
    });
    const audio = get().audioEl;
    if (audio) {
      audio.currentTime = 0;
      void audio.play().catch(() => {});
    }
  },

  togglePlay: () => {
    // If an embed controller is active (Spotify/SoundCloud), use it.
    const embed = getActiveEmbedController();
    if (embed) {
      if (get().isPlaying) embed.pause();
      else embed.play();
      return;
    }
    const audio = get().audioEl;
    if (!audio) return;
    if (audio.paused) {
      void audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  },

  next: () => {
    const st = get();
    const activeQueue = st.shuffle ? st.shuffleQueue : st.queue;
    if (activeQueue.length === 0) return;
    let nextIdx = st.currentIndex + 1;
    if (nextIdx >= activeQueue.length) {
      if (st.repeat === "all") {
        nextIdx = 0;
      } else {
        // Stop at end
        set({ isPlaying: false });
        const audio = get().audioEl;
        if (audio) audio.pause();
        const embed = getActiveEmbedController();
        if (embed) embed.pause();
        return;
      }
    }
    set({
      currentIndex: nextIdx,
      currentTime: 0,
      isPlaying: true,
      history:
        st.currentIndex >= 0
          ? [activeQueue[st.currentIndex], ...st.history].slice(0, 50)
          : st.history,
    });
    // For <audio> playback, EmbedPlayer handles embed songs automatically.
    const audio = get().audioEl;
    if (audio) {
      audio.currentTime = 0;
      void audio.play().catch(() => {});
    }
  },

  prev: () => {
    const st = get();
    const audio = get().audioEl;
    const embed = getActiveEmbedController();
    // If we're more than 3 seconds in, restart current
    if (embed && st.currentTime > 3) {
      embed.seek(0);
      set({ currentTime: 0 });
      return;
    }
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    const activeQueue = st.shuffle ? st.shuffleQueue : st.queue;
    let prevIdx = st.currentIndex - 1;
    if (prevIdx < 0) {
      prevIdx = 0;
    }
    set({ currentIndex: prevIdx, currentTime: 0, isPlaying: true });
    if (audio) {
      audio.currentTime = 0;
      void audio.play().catch(() => {});
    }
  },

  seek: (sec) => {
    // Delegate to embed controller if active.
    const embed = getActiveEmbedController();
    if (embed) {
      embed.seek(sec);
      set({ currentTime: sec });
      return;
    }
    const audio = get().audioEl;
    if (audio) audio.currentTime = sec;
    set({ currentTime: sec });
  },

  setVolume: (v) => {
    const clamped = Math.max(0, Math.min(1, v));
    const audio = get().audioEl;
    if (audio) {
      audio.volume = clamped;
      audio.muted = clamped === 0;
    }
    // Also push to embed controller if it supports volume (SoundCloud yes, Spotify no).
    const embed = getActiveEmbedController();
    if (embed?.supportsVolume) {
      embed.setVolume?.(clamped);
    }
    set({ volume: clamped, muted: clamped === 0 });
  },

  toggleMute: () => {
    const audio = get().audioEl;
    const newMuted = !get().muted;
    if (audio) audio.muted = newMuted;
    set({ muted: newMuted });
  },

  toggleShuffle: () => {
    const st = get();
    const newShuffle = !st.shuffle;
    if (newShuffle && st.queue.length > 0) {
      const current = st.queue[st.currentIndex];
      const shuf = shuffleArray(st.queue);
      if (current) {
        const i = shuf.indexOf(current);
        if (i >= 0) {
          shuf.splice(i, 1);
          shuf.unshift(current);
        }
      }
      set({ shuffle: true, shuffleQueue: shuf, currentIndex: 0 });
    } else {
      // Restore index from non-shuffled queue
      const current = st.shuffleQueue[st.currentIndex];
      const idx = current ? st.queue.indexOf(current) : -1;
      set({
        shuffle: false,
        currentIndex: idx >= 0 ? idx : 0,
      });
    }
  },

  cycleRepeat: () => {
    const order: RepeatMode[] = ["off", "all", "one"];
    const cur = order.indexOf(get().repeat);
    set({ repeat: order[(cur + 1) % order.length] });
  },

  setCurrentTime: (t) => set({ currentTime: t }),
  setDuration: (d) => set({ duration: d }),
  setIsPlaying: (p) => set({ isPlaying: p }),

  addToQueue: (songId) => {
    const st = get();
    set({
      queue: [...st.queue, songId],
      shuffleQueue: [...st.shuffleQueue, songId],
    });
  },

  playNext: (songId) => {
    const st = get();
    const newQueue = [...st.queue];
    const newShuf = [...st.shuffleQueue];
    const insertAt = st.currentIndex + 1;
    newQueue.splice(insertAt, 0, songId);
    newShuf.splice(insertAt, 0, songId);
    set({ queue: newQueue, shuffleQueue: newShuf });
  },

  removeFromQueue: (index) => {
    const st = get();
    if (index === st.currentIndex) return; // don't remove currently playing
    const newQueue = [...st.queue];
    const newShuf = [...st.shuffleQueue];
    newQueue.splice(index, 1);
    newShuf.splice(index, 1);
    const newIndex =
      index < st.currentIndex ? st.currentIndex - 1 : st.currentIndex;
    set({ queue: newQueue, shuffleQueue: newShuf, currentIndex: newIndex });
  },

  clearQueue: () => {
    const st = get();
    const current = st.queue[st.currentIndex];
    set({
      queue: current ? [current] : [],
      shuffleQueue: current ? [current] : [],
      currentIndex: current ? 0 : -1,
    });
  },
}));

// Convenience selector hook for current song. Subscribes to both stores.
function useCurrentSongSelector(): Song | null {
  const songs = useLibraryStore((s) => s.songs);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const queue = usePlayerStore((s) => s.queue);
  const shuffleQueue = usePlayerStore((s) => s.shuffleQueue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const activeQueue = shuffle ? shuffleQueue : queue;
  const id = activeQueue[currentIndex];
  return id ? (songs.find((x) => x.id === id) ?? null) : null;
}

export function useCurrentSong(): Song | null {
  return useCurrentSongSelector();
}
