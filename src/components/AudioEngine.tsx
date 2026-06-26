"use client";

import { useEffect, useRef } from "react";
import { usePlayerStore, useLibraryStore } from "@/lib/store";
import { resolveAudioSource } from "@/lib/audio";

/**
 * AudioEngine — owns the singleton <audio> element and wires it to the
 * player store. Renders nothing visible; the visible controls live in
 * <PlayerBar /> and the small <MobileMiniPlayer />.
 */
export function AudioEngine() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const setAudioEl = usePlayerStore((s) => s.setAudioEl);
  const setAudioElDone = useRef(false);

  // Function called when the <audio> element fires "ended".
  function handleEnded() {
    const st = usePlayerStore.getState();
    if (st.repeat === "one") {
      const a = audioRef.current;
      if (a) {
        a.currentTime = 0;
        void a.play().catch(() => {});
      }
      return;
    }
    st.next();
  }

  // Wire audio element to store on mount.
  useEffect(() => {
    if (setAudioElDone.current) return;
    setAudioElDone.current = true;
    if (!audioRef.current) return;
    const a = audioRef.current;
    setAudioEl(a);
    a.volume = usePlayerStore.getState().volume;

    const onTime = () =>
      usePlayerStore.getState().setCurrentTime(a.currentTime);
    const onDur = () => usePlayerStore.getState().setDuration(a.duration || 0);
    const onPlay = () => usePlayerStore.getState().setIsPlaying(true);
    const onPause = () => usePlayerStore.getState().setIsPlaying(false);
    const onEnd = () => handleEnded();

    a.addEventListener("timeupdate", onTime);
    a.addEventListener("durationchange", onDur);
    a.addEventListener("loadedmetadata", onDur);
    a.addEventListener("play", onPlay);
    a.addEventListener("playing", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnd);

    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("durationchange", onDur);
      a.removeEventListener("loadedmetadata", onDur);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("playing", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnd);
    };
  }, []);

  // Reactively swap the audio source when the current song changes.
  const shuffle = usePlayerStore((s) => s.shuffle);
  const queue = usePlayerStore((s) => s.queue);
  const shuffleQueue = usePlayerStore((s) => s.shuffleQueue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const songs = useLibraryStore((s) => s.songs);

  const activeQueue = shuffle ? shuffleQueue : queue;
  const currentSongId = activeQueue[currentIndex] || null;
  const currentSong = currentSongId
    ? songs.find((s) => s.id === currentSongId)
    : null;

  const prevSongIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!audioRef.current) return;
    const a = audioRef.current;
    if (!currentSong) {
      a.removeAttribute("src");
      a.load();
      prevSongIdRef.current = null;
      usePlayerStore.getState().setDuration(0);
      usePlayerStore.getState().setCurrentTime(0);
      return;
    }
    // Embed songs are handled by <EmbedPlayer /> — skip the <audio> element.
    if (currentSong.sourceType === "embed") {
      a.removeAttribute("src");
      a.load();
      prevSongIdRef.current = currentSong.id;
      // Reset time/duration — EmbedPlayer will set them when its controller is ready.
      usePlayerStore.getState().setDuration(0);
      usePlayerStore.getState().setCurrentTime(0);
      return;
    }
    if (prevSongIdRef.current === currentSong.id) {
      // Same song — no need to reload src. Just ensure play state matches.
      const isPlaying = usePlayerStore.getState().isPlaying;
      if (isPlaying && a.paused) void a.play().catch(() => {});
      return;
    }
    prevSongIdRef.current = currentSong.id;

    let cancelled = false;
    (async () => {
      const src = await resolveAudioSource(currentSong.id);
      if (cancelled || !src) return;
      if (a.src !== src) {
        a.src = src;
        a.load();
      }
      // Auto-play on source change (matching Spotify UX)
      const isPlaying = usePlayerStore.getState().isPlaying;
      if (isPlaying) {
        void a.play().catch(() => {
          // Autoplay blocked — flip isPlaying to false so UI updates
          usePlayerStore.getState().setIsPlaying(false);
        });
      }
      // Track play count
      void useLibraryStore.getState().incrementPlayCount(currentSong.id);
    })();

    return () => {
      cancelled = true;
    };
  }, [currentSong?.id, currentSong?.sourceType]);

  // Reflect volume / mute changes from store to element.
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume;
    audioRef.current.muted = muted;
  }, [volume, muted]);

  return <audio ref={audioRef} preload="metadata" className="hidden" />;
}
