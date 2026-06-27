"use client";

import { useState } from "react";
import { usePlayerStore, useLibraryStore } from "@/lib/store";
import { SongCover } from "./SongCover";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/format";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  Volume2,
  Volume1,
  VolumeX,
  ListMusic,
  Maximize2,
  X,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

type PlayerBarProps = {
  onOpenQueue: () => void;
};

export function PlayerBar({ onOpenQueue }: PlayerBarProps) {
  const player = usePlayerStore();
  const songs = useLibraryStore((s) => s.songs);
  const toggleLike = useLibraryStore((s) => s.toggleLike);
  const removeSong = useLibraryStore((s) => s.removeSong);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const shuffle = player.shuffle;
  const repeat = player.repeat;
  const volume = player.volume;
  const muted = player.muted;
  const currentTime = player.currentTime;
  const duration = player.duration;
  const isPlaying = player.isPlaying;

  const activeQueue = shuffle ? player.shuffleQueue : player.queue;
  const currentSongId = activeQueue[player.currentIndex];
  const currentSong = currentSongId
    ? songs.find((s) => s.id === currentSongId)
    : null;
  const liked = currentSong?.liked ?? false;

  const [seekValue, setSeekValue] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [prevSongId, setPrevSongId] = useState<string | null>(currentSongId);
  if (prevSongId !== currentSongId) {
    setPrevSongId(currentSongId);
    if (seekValue !== null) setSeekValue(null);
  }

  function onSeekChange(values: number[]) {
    setSeekValue(values[0]);
    setIsDragging(true);
  }
  function onSeekCommit(values: number[]) {
    player.seek(values[0]);
    setSeekValue(null);
    setIsDragging(false);
  }

  function onVolumeChange(values: number[]) {
    player.setVolume(values[0]);
  }

  const displayedTime = seekValue ?? currentTime;
  const progressPct = duration > 0 ? (displayedTime / duration) * 100 : 0;
  const volumePct = (muted ? 0 : volume) * 100;

  return (
    <footer className="bg-[#0a0a0f] border-t border-white/5 px-3 sm:px-4 pt-2 pb-2 sm:pb-3 z-30 safe-bottom">
      {/* Full-width seek bar — always visible on top */}
      {currentSong && (
        <div className="flex items-center gap-2 sm:gap-3 mb-2">
          <span className="text-[10px] sm:text-xs tabular-nums text-white/50 w-8 sm:w-10 text-right shrink-0">
            {formatTime(displayedTime)}
          </span>
          <Slider
            className={cn("flex-1 rs-slider", isDragging && "dragging")}
            value={[progressPct]}
            min={0}
            max={100}
            step={0.1}
            onValueChange={(v) => onSeekChange([v[0] * duration / 100])}
            onValueCommit={(v) => onSeekCommit([v[0] * duration / 100])}
            style={{ ["--progress" as any]: `${progressPct}%` }}
            disabled={duration === 0}
            aria-label="Seek"
          />
          <span className="text-[10px] sm:text-xs tabular-nums text-white/50 w-8 sm:w-10 shrink-0">
            {formatTime(duration)}
          </span>
        </div>
      )}

      {/* Controls row */}
      <div className="grid grid-cols-[1fr_auto] sm:grid-cols-3 items-center gap-2 sm:gap-4">
        {/* Left: current song info */}
        <div className="flex items-center gap-3 min-w-0">
          {currentSong ? (
            <>
              <SongCover
                songId={currentSong.id}
                title={currentSong.title}
                artist={currentSong.artist}
                size={44}
                rounded="rounded-md"
              />
              <div className="min-w-0 hidden sm:block">
                <div className="text-sm text-white font-medium truncate">
                  {currentSong.title}
                </div>
                <div className="text-xs text-white/50 truncate flex items-center gap-1.5">
                  <span className="truncate">{currentSong.artist}</span>
                  {currentSong.sourceType === "embed" && currentSong.providerName && (
                    <span
                      className={cn(
                        "shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold leading-none",
                        currentSong.embedType === "spotify"
                          ? "bg-[#1db954]/20 text-[#1db954]"
                          : currentSong.embedType === "soundcloud"
                            ? "bg-[#ff5500]/20 text-[#ff7733]"
                            : "bg-white/10 text-white/70"
                      )}
                      title={`Playing via ${currentSong.providerName} embed`}
                    >
                      {currentSong.providerName}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => void toggleLike(currentSong.id)}
                className="hidden sm:block shrink-0 ml-1"
                aria-label={liked ? "Unlike" : "Like"}
              >
                <Heart
                  size={15}
                  className={cn(
                    liked
                      ? "fill-current text-[#ff6b4a]"
                      : "text-white/50 hover:text-white"
                  )}
                />
              </button>
              {/* Delete button — subtle but always visible when a song is playing */}
              <button
                onClick={() => setDeleteOpen(true)}
                className="hidden sm:block shrink-0 text-white/30 hover:text-red-400 transition-colors"
                aria-label="Delete from library"
                title="Delete from library"
              >
                <Trash2 size={14} />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3 text-white/30">
              <div className="w-11 h-11 rounded-md bg-white/5 flex items-center justify-center">
                <ListMusic size={18} />
              </div>
              <div className="hidden sm:block text-sm">Nothing playing</div>
            </div>
          )}
        </div>

        {/* Center: transport controls */}
        <div className="flex items-center gap-3 sm:gap-5 justify-self-center order-3 sm:order-2 col-span-2 sm:col-span-1">
          <button
            onClick={player.toggleShuffle}
            className={cn(
              "transition-colors",
              shuffle ? "text-[#ff6b4a]" : "text-white/40 hover:text-white"
            )}
            aria-label="Shuffle"
            title="Shuffle"
          >
            <Shuffle size={17} />
          </button>
          <button
            onClick={player.prev}
            className="text-white/70 hover:text-white transition-colors disabled:opacity-30"
            disabled={!currentSong}
            aria-label="Previous"
          >
            <SkipBack size={20} className="fill-current" />
          </button>
          <button
            onClick={player.togglePlay}
            className="bg-white text-black rounded-full h-10 w-10 sm:h-11 sm:w-11 flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-30 disabled:cursor-not-allowed rs-glow"
            disabled={!currentSong}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause size={20} className="fill-current" />
            ) : (
              <Play size={20} className="fill-current ml-0.5" />
            )}
          </button>
          <button
            onClick={player.next}
            className="text-white/70 hover:text-white transition-colors disabled:opacity-30"
            disabled={!currentSong}
            aria-label="Next"
          >
            <SkipForward size={20} className="fill-current" />
          </button>
          <button
            onClick={player.cycleRepeat}
            className={cn(
              "transition-colors",
              repeat !== "off" ? "text-[#ff6b4a]" : "text-white/40 hover:text-white"
            )}
            aria-label="Repeat"
            title={`Repeat: ${repeat}`}
          >
            {repeat === "one" ? <Repeat1 size={17} /> : <Repeat size={17} />}
          </button>
        </div>

        {/* Right: volume + queue */}
        <div className="hidden sm:flex items-center gap-2 justify-end order-2 sm:order-3">
          <button
            onClick={onOpenQueue}
            className="text-white/40 hover:text-white transition-colors"
            aria-label="Queue"
            title="Queue"
          >
            <ListMusic size={18} />
          </button>
          <div className="flex items-center gap-1.5 group">
            <button
              onClick={player.toggleMute}
              className="text-white/40 hover:text-white transition-colors"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted || volume === 0 ? (
                <VolumeX size={18} />
              ) : volume < 0.5 ? (
                <Volume1 size={18} />
              ) : (
                <Volume2 size={18} />
              )}
            </button>
            <Slider
              className="w-20 lg:w-28 rs-slider rs-slider-compact"
              value={[volumePct]}
              min={0}
              max={100}
              step={1}
              onValueChange={(v) => onVolumeChange([v[0] / 100])}
              style={{ ["--progress" as any]: `${volumePct}%` }}
              aria-label="Volume"
            />
          </div>
          <button
            className="text-white/40 hover:text-white transition-colors"
            aria-label="Fullscreen"
            title="Fullscreen"
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen?.().catch(() => {
                  toast("Fullscreen not available");
                });
              } else {
                document.exitFullscreen?.();
              }
            }}
          >
            <Maximize2 size={16} />
          </button>
        </div>

        {/* Mobile: just the queue button */}
        <button
          onClick={onOpenQueue}
          className="sm:hidden text-white/40 hover:text-white order-2"
          aria-label="Queue"
        >
          <ListMusic size={20} />
        </button>
      </div>

      {/* Mobile: shuffle/repeat controls below */}
      <div className="sm:hidden flex items-center justify-center gap-6 mt-2 -mt-1">
        <span className="text-[10px] text-white/30">
          {shuffle ? "Shuffle on" : ""}
        </span>
        <span className="text-[10px] text-white/30">
          {repeat === "one" ? "Repeat one" : repeat === "all" ? "Repeat all" : ""}
        </span>
      </div>

      {/* Delete confirmation dialog */}
      {currentSong && (
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent className="bg-[#111118] border-white/8 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">
                Delete this song?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-white/60">
                <span className="text-white">"{currentSong.title}"</span> by{" "}
                <span className="text-white">{currentSong.artist}</span> will be
                permanently removed from your library and all playlists. This
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-transparent border-white/15 text-white hover:bg-white/8">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (!currentSong) return;
                  await removeSong(currentSong.id);
                  toast.success("Song removed from library");
                  setDeleteOpen(false);
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </footer>
  );
}

// ---------- Queue Panel ----------

type QueuePanelProps = {
  open: boolean;
  onClose: () => void;
};

export function QueuePanel({ open, onClose }: QueuePanelProps) {
  const player = usePlayerStore();
  const songs = useLibraryStore((s) => s.songs);
  const shuffle = player.shuffle;
  const repeat = player.repeat;
  const activeQueue = shuffle ? player.shuffleQueue : player.queue;
  const currentIndex = player.currentIndex;

  const currentSongId = activeQueue[currentIndex];
  const currentSong = currentSongId
    ? songs.find((s) => s.id === currentSongId)
    : null;

  const upcoming = activeQueue
    .slice(currentIndex + 1)
    .map((id) => songs.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  return (
    <div
      className={cn(
        "fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-[#0a0a0f] z-50",
        "border-l border-white/8 flex flex-col",
        "transform transition-transform duration-300 ease-out",
        "safe-top safe-bottom safe-right",
        open ? "translate-x-0" : "translate-x-full"
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-white/8">
        <h2 className="text-white font-bold text-lg">Queue</h2>
        <div className="flex items-center gap-1">
          {activeQueue.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/50 hover:text-white"
              onClick={() => {
                player.clearQueue();
                toast("Queue cleared");
              }}
              aria-label="Clear queue"
              title="Clear queue"
            >
              <Trash2 size={16} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/50 hover:text-white"
            onClick={onClose}
          >
            <X size={18} />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {currentSong ? (
          <section>
            <h3 className="text-xs uppercase tracking-wider text-white/40 mb-2">
              Now playing
            </h3>
            <div className="flex items-center gap-3 p-2 rounded-md bg-white/[0.04]">
              <SongCover
                songId={currentSong.id}
                title={currentSong.title}
                artist={currentSong.artist}
                size={48}
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-[#ff6b4a] truncate">
                  {currentSong.title}
                </div>
                <div className="text-xs text-white/50 truncate flex items-center gap-1.5">
                  <span className="truncate">{currentSong.artist}</span>
                  {currentSong.sourceType === "embed" && currentSong.providerName && (
                    <span
                      className={cn(
                        "shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold leading-none",
                        currentSong.embedType === "spotify"
                          ? "bg-[#1db954]/20 text-[#1db954]"
                          : currentSong.embedType === "soundcloud"
                            ? "bg-[#ff5500]/20 text-[#ff7733]"
                            : "bg-white/10 text-white/70"
                      )}
                    >
                      {currentSong.providerName}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>
        ) : (
          <div className="text-center text-white/30 py-12">
            <ListMusic size={40} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">Queue is empty</p>
            <p className="text-xs mt-1">Play a song to start the queue.</p>
          </div>
        )}

        {upcoming.length > 0 && (
          <section>
            <h3 className="text-xs uppercase tracking-wider text-white/40 mb-2">
              Next up
            </h3>
            <div className="space-y-1">
              {upcoming.map((song, idx) => {
                const realIdx = currentIndex + 1 + idx;
                return (
                  <div
                    key={`${song.id}-${idx}`}
                    className="group flex items-center gap-3 p-2 rounded-md hover:bg-white/[0.04]"
                  >
                    <SongCover
                      songId={song.id}
                      title={song.title}
                      artist={song.artist}
                      size={40}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-white truncate">
                        {song.title}
                      </div>
                      <div className="text-xs text-white/50 truncate">
                        {song.artist}
                      </div>
                    </div>
                    <button
                      onClick={() => player.removeFromQueue(realIdx)}
                      className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-white"
                      aria-label="Remove from queue"
                    >
                      <X size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
