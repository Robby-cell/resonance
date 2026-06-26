"use client";

import { useEffect, useRef } from "react";
import { usePlayerStore, useLibraryStore } from "@/lib/store";
import { useSettingsStore } from "@/lib/settings";
import { resolveCoverUrl } from "@/lib/audio";

/**
 * useMediaSession — wires the player to the browser's Media Session API.
 *
 * This enables:
 *  - OS-level media controls (lock screen, notification center, media keys)
 *  - Background audio playback indicator
 *  - "Now Playing" display in the OS
 *  - Hardware media key support (play/pause/next/prev on keyboards/headsets)
 *
 * The hook updates metadata whenever the current song changes, and registers
 * action handlers that delegate to the player store.
 */
export function useMediaSession() {
  const enabled = useSettingsStore((s) => s.mediaSessionEnabled);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const queue = usePlayerStore((s) => s.queue);
  const shuffleQueue = usePlayerStore((s) => s.shuffleQueue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const songs = useLibraryStore((s) => s.songs);
  const lastArtworkUrlRef = useRef<string | null>(null);

  const activeQueue = shuffle ? shuffleQueue : queue;
  const currentSongId = activeQueue[currentIndex] || null;
  const currentSong = currentSongId
    ? songs.find((s) => s.id === currentSongId)
    : null;

  // Register action handlers once on mount (they delegate to the store).
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator))
      return;
    if (!enabled) {
      // Clear handlers when disabled
      try {
        navigator.mediaSession.setActionHandler("play", null);
        navigator.mediaSession.setActionHandler("pause", null);
        navigator.mediaSession.setActionHandler("previoustrack", null);
        navigator.mediaSession.setActionHandler("nexttrack", null);
        navigator.mediaSession.setActionHandler("seekto", null);
        navigator.mediaSession.setActionHandler("seekbackward", null);
        navigator.mediaSession.setActionHandler("seekforward", null);
        navigator.mediaSession.metadata = null;
      } catch {}
      return;
    }

    const ms = navigator.mediaSession;

    try {
      ms.setActionHandler("play", () => {
        usePlayerStore.getState().togglePlay();
      });
      ms.setActionHandler("pause", () => {
        usePlayerStore.getState().togglePlay();
      });
      ms.setActionHandler("previoustrack", () => {
        usePlayerStore.getState().prev();
      });
      ms.setActionHandler("nexttrack", () => {
        usePlayerStore.getState().next();
      });
      ms.setActionHandler("seekto", (details: any) => {
        if (details.seekTime != null) {
          usePlayerStore.getState().seek(details.seekTime);
        }
      });
      ms.setActionHandler("seekbackward", (details: any) => {
        const cur = usePlayerStore.getState().currentTime;
        const offset = details.seekOffset ?? 10;
        usePlayerStore.getState().seek(Math.max(0, cur - offset));
      });
      ms.setActionHandler("seekforward", (details: any) => {
        const cur = usePlayerStore.getState().currentTime;
        const offset = details.seekOffset ?? 10;
        const dur = usePlayerStore.getState().duration;
        usePlayerStore.getState().seek(Math.min(dur, cur + offset));
      });
    } catch (e) {
      // Some action types may not be supported on all browsers — that's fine.
    }
  }, [enabled]);

  // Update playback state.
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator))
      return;
    if (!enabled) return;
    try {
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    } catch {}
  }, [isPlaying, enabled]);

  // Update metadata when the current song changes.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator))
      return;
    if (!enabled) return;

    if (!currentSong) {
      navigator.mediaSession.metadata = null;
      lastArtworkUrlRef.current = null;
      return;
    }

    let cancelled = false;

    (async () => {
      const artworkUrl = await resolveCoverUrl(currentSong.id);

      if (cancelled) return;

      const artwork = artworkUrl
        ? [{ src: artworkUrl, sizes: "512x512", type: "image/png" }]
        : [];

      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artist,
        album: currentSong.album || "Resonance",
        artwork: artwork.length > 0 ? artwork : undefined,
      });
      lastArtworkUrlRef.current = artworkUrl;
    })();

    return () => {
      cancelled = true;
    };
  }, [currentSong?.id, enabled]);
}
