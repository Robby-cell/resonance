"use client";

import { useEffect, useRef } from "react";
import { usePlayerStore, useLibraryStore } from "@/lib/store";
import { loadSpotifyIframeApi, loadSoundCloudWidgetApi, loadYouTubeIframeApi } from "@/lib/loadScript";
import { setActiveEmbedController, type EmbedController } from "@/lib/embedController";
import { toSpotifyUri } from "@/lib/providers/spotify";

/**
 * EmbedPlayer — owns a hidden iframe that plays Spotify/SoundCloud/YouTube embeds.
 *
 * Renders nothing visible. The visible UI (player bar) lives in <PlayerBar />.
 *
 * When the current song has `sourceType === "embed"`:
 *   1. Creates an iframe with the embed URL
 *   2. Loads the platform's API script (Spotify IFrame API / SoundCloud Widget API / YouTube IFrame API)
 *   3. Wires the controller to the player store via the embedController bridge
 *
 * When the current song is NOT an embed, this component renders nothing and
 * the <AudioEngine> handles playback instead.
 */
export function EmbedPlayer() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const controllerRef = useRef<EmbedController | null>(null);
  const lastEmbedUrlRef = useRef<string | null>(null);

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

  const isEmbed = currentSong?.sourceType === "embed";
  const embedType = currentSong?.embedType;
  const embedUrl = currentSong?.embedUrl ?? null;

  // Set up / tear down the embed controller when the embed URL changes.
  useEffect(() => {
    if (!isEmbed || !embedUrl || !embedType) {
      // Not an embed song — make sure no controller is registered.
      if (lastEmbedUrlRef.current) {
        setActiveEmbedController(null);
        controllerRef.current = null;
        lastEmbedUrlRef.current = null;
      }
      return;
    }

    // Same embed URL as before — no need to recreate.
    if (lastEmbedUrlRef.current === embedUrl) return;
    lastEmbedUrlRef.current = embedUrl;

    let destroyed = false;

    async function setup() {
      try {
        if (embedType === "spotify") {
          await setupSpotify();
        } else if (embedType === "soundcloud") {
          await setupSoundCloud();
        } else if (embedType === "youtube") {
          await setupYouTube();
        }
      } catch (e) {
        console.error("EmbedPlayer setup failed:", e);
      }
    }

    async function setupSpotify() {
      const IFrameAPI = await loadSpotifyIframeApi();
      if (destroyed || !iframeRef.current) return;

      const uri = toSpotifyUri(embedUrl!);
      if (!uri) {
        console.error("Couldn't parse Spotify URI from", embedUrl);
        return;
      }

      IFrameAPI.createController(iframeRef.current, { uri }, (ctrl: any) => {
        if (destroyed) return;
        controllerRef.current = {
          play: () => ctrl.play(),
          pause: () => ctrl.pause(),
          seek: (seconds: number) => ctrl.seek(seconds),
          supportsVolume: false, // Spotify embed API doesn't expose volume
        };
        setActiveEmbedController(controllerRef.current);

        // Listen for playback updates to sync the store.
        ctrl.addListener("playback_update", (e: any) => {
          if (destroyed) return;
          const { position, duration, isPaused } = e.data;
          if (typeof duration === "number") {
            usePlayerStore.getState().setDuration(duration / 1000);
          }
          if (typeof position === "number") {
            usePlayerStore.getState().setCurrentTime(position / 1000);
          }
          if (typeof isPaused === "boolean") {
            usePlayerStore.getState().setIsPlaying(!isPaused);
          }
        });

        // Auto-play if we should be playing.
        if (usePlayerStore.getState().isPlaying) {
          try {
            ctrl.play();
          } catch { }
        }

        // Track play count once on load.
        void useLibraryStore.getState().incrementPlayCount(currentSong!.id);
      });
    }

    async function setupSoundCloud() {
      const SC = await loadSoundCloudWidgetApi();
      if (destroyed || !iframeRef.current) return;

      const widget = SC.Widget(iframeRef.current);
      controllerRef.current = {
        play: () => widget.play(),
        pause: () => widget.pause(),
        seek: (seconds: number) => widget.seekTo(seconds * 1000),
        setVolume: (v: number) => widget.setVolume(Math.round(v * 100)),
        supportsVolume: true,
      };
      setActiveEmbedController(controllerRef.current);

      widget.bind(SC.Widget.Events.READY, () => {
        if (destroyed) return;
        widget.getDuration((dur: number) => {
          if (destroyed) return;
          usePlayerStore.getState().setDuration(dur / 1000);
        });
        if (usePlayerStore.getState().isPlaying) {
          try {
            widget.play();
          } catch { }
        }
        void useLibraryStore.getState().incrementPlayCount(currentSong!.id);
      });

      widget.bind(SC.Widget.Events.PLAY_PROGRESS, (e: any) => {
        if (destroyed) return;
        usePlayerStore.getState().setCurrentTime(e.currentPosition / 1000);
      });

      widget.bind(SC.Widget.Events.PLAY, () => {
        if (destroyed) return;
        usePlayerStore.getState().setIsPlaying(true);
      });

      widget.bind(SC.Widget.Events.PAUSE, () => {
        if (destroyed) return;
        usePlayerStore.getState().setIsPlaying(false);
      });

      widget.bind(SC.Widget.Events.FINISH, () => {
        if (destroyed) return;
        const st = usePlayerStore.getState();
        if (st.repeat === "one") {
          st.replayCurrent();
        } else {
          st.next();
        }
      });
    }

    async function setupYouTube() {
      const YT = await loadYouTubeIframeApi();
      if (destroyed) return;

      // Extract the video ID from the embed URL.
      const match = embedUrl!.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
      const videoId = match?.[1];
      if (!videoId) {
        console.error("Couldn't parse YouTube video ID from", embedUrl);
        return;
      }

      // YT.Player replaces the target element with an iframe.
      // On iOS Safari, the iframe must be "visible" (not visibility:hidden or
      // opacity:0) to play audio. We position it 1x1 off-screen instead.
      const container = document.createElement("div");
      container.style.cssText =
        "position:fixed;width:1px;height:1px;left:-9999px;top:-9999px;border:0;overflow:hidden;pointer-events:none;";
      document.body.appendChild(container);
      if (destroyed) {
        container.remove();
        return;
      }

      // Watch for the iframe that YT.Player will insert into the container.
      // Keep it 1x1 and off-screen but DON'T use visibility:hidden or opacity:0
      // — iOS Safari won't play audio in hidden iframes.
      const observer = new MutationObserver(() => {
        const iframe = container.querySelector('iframe');
        if (iframe) {
          iframe.style.cssText =
            'position:fixed;width:1px;height:1px;left:-9999px;top:-9999px;border:0;overflow:hidden;pointer-events:none;';
        }
      });
      observer.observe(container, { childList: true, subtree: true });

      const player = new YT.Player(container, {
        videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          iv_load_policy: 3,
          showinfo: 0,
        },
        events: {
          onReady: (e: any) => {
            if (destroyed) return;
            // Keep iframe 1x1 and off-screen (but visible for iOS compatibility).
            const iframe = e.target?.getIframe?.() || container.querySelector('iframe');
            if (iframe) {
              iframe.style.cssText =
                'position:fixed;width:1px;height:1px;left:-9999px;top:-9999px;border:0;overflow:hidden;pointer-events:none;';
            }
            const dur = player.getDuration();
            usePlayerStore.getState().setDuration(dur || 0);
            if (usePlayerStore.getState().isPlaying) {
              try {
                player.playVideo();
              } catch { }
            }
            void useLibraryStore.getState().incrementPlayCount(currentSong!.id);
          },
          onStateChange: (e: any) => {
            if (destroyed) return;
            const YTState = (window as any).YT;
            if (e.data === YTState.PlayerState.PLAYING) {
              usePlayerStore.getState().setIsPlaying(true);
            } else if (e.data === YTState.PlayerState.PAUSED) {
              usePlayerStore.getState().setIsPlaying(false);
            } else if (e.data === YTState.PlayerState.ENDED) {
              const st = usePlayerStore.getState();
              if (st.repeat === "one") {
                st.replayCurrent();
              } else {
                st.next();
              }
            }
            const dur = player.getDuration();
            if (dur > 0) usePlayerStore.getState().setDuration(dur);
          },
        },
      });

      controllerRef.current = {
        play: () => player.playVideo(),
        pause: () => player.pauseVideo(),
        seek: (seconds: number) => player.seekTo(seconds, true),
        setVolume: (v: number) => player.setVolume(Math.round(v * 100)),
        supportsVolume: true,
      };
      setActiveEmbedController(controllerRef.current);

      // Poll current time — YouTube API doesn't have a position-change event.
      const pollInterval = setInterval(() => {
        if (destroyed) {
          clearInterval(pollInterval);
          return;
        }
        try {
          if (player.getCurrentTime) {
            usePlayerStore.getState().setCurrentTime(player.getCurrentTime());
          }
        } catch { }
      }, 250);

      // Store cleanup function to remove the container.
      (controllerRef.current as any).__cleanup = () => {
        clearInterval(pollInterval);
        observer.disconnect();
        try {
          player.destroy();
        } catch { }
        container.remove();
      };
    }

    setup();

    return () => {
      destroyed = true;
      // Run YouTube-specific cleanup if present.
      const cleanup = (controllerRef.current as any)?.__cleanup;
      if (cleanup) cleanup();
      setActiveEmbedController(null);
      controllerRef.current = null;
    };
  }, [isEmbed, embedUrl, embedType, currentSong?.id]);

  // Render the iframe only for Spotify and SoundCloud.
  // YouTube uses a div container created in setupYouTube() instead.
  if (!isEmbed || !embedUrl) return null;
  if (embedType === "youtube") return null;

  return (
    <iframe
      ref={iframeRef}
      // Spotify's API sets the src itself; SoundCloud needs the src up front.
      src={embedType === "soundcloud" ? embedUrl : undefined}
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      style={{
        position: "fixed",
        width: "1px",
        height: "1px",
        // Off-screen + 1x1 size. Don't use visibility:hidden or opacity:0 —
        // iOS Safari won't play audio in hidden iframes.
        left: "-9999px",
        top: "-9999px",
        border: "0",
        overflow: "hidden",
        pointerEvents: "none",
      }}
      title="embed-player"
      allowFullScreen
    />
  );
}
