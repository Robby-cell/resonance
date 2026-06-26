"use client";

import { useState, useMemo } from "react";
import { useLibraryStore, usePlayerStore } from "@/lib/store";
import { SongRow } from "@/components/SongRow";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { gradientFor, formatDurationLong } from "@/lib/format";
import {
  Play,
  Pause,
  Shuffle,
  Heart,
  Clock,
  MoreHorizontal,
  Pencil,
  Trash2,
  Download,
  Music2,
  GripVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { exportPlaylistM3U, exportPlaylistBundle } from "@/lib/exporter";

type PlaylistViewProps = {
  playlistId: string;
};

export function PlaylistView({ playlistId }: PlaylistViewProps) {
  const playlist = useLibraryStore((s) =>
    s.playlists.find((p) => p.id === playlistId),
  );
  const songs = useLibraryStore((s) => s.songs);
  const reorderPlaylist = useLibraryStore((s) => s.reorderPlaylist);
  const removeFromPlaylist = useLibraryStore((s) => s.removeFromPlaylist);
  const deletePlaylistById = useLibraryStore((s) => s.deletePlaylistById);
  const renamePlaylist = useLibraryStore((s) => s.renamePlaylist);
  const playContext = usePlayerStore((s) => s.playContext);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const playerState = usePlayerStore();

  const [editOpen, setEditOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const tracks = useMemo(() => {
    if (!playlist) return [];
    return playlist.songIds
      .map((id) => songs.find((s) => s.id === id))
      .filter((s): s is NonNullable<typeof s> => Boolean(s));
  }, [playlist, songs]);

  if (!playlist) {
    return (
      <div className="p-8 text-center text-white/60">Playlist not found.</div>
    );
  }

  const totalSec = tracks.reduce((acc, s) => acc + s.durationSec, 0);
  const isSystem = playlist.system;
  const gradient = gradientFor(playlist.coverSeed ?? playlist.id);

  const isPlayingThis =
    playerState.isPlaying &&
    tracks.some(
      (t) =>
        playerState.queue[playerState.currentIndex] === t.id ||
        playerState.shuffleQueue[playerState.currentIndex] === t.id,
    );

  function handlePlay() {
    if (tracks.length === 0) return;
    if (isPlayingThis) {
      playerState.togglePlay();
    } else {
      // If shuffle is on, preserve it
      playContext(tracks.map((t) => t.id));
    }
  }

  function handleShufflePlay() {
    if (tracks.length === 0) return;
    if (!playerState.shuffle) toggleShuffle();
    playContext(tracks.map((t) => t.id));
  }

  function handleDragStart(idx: number, e: React.DragEvent) {
    if (isSystem) return;
    setDragIndex(idx);
    e.dataTransfer.effectAllowed = "move";
  }
  function handleDragOver(idx: number, e: React.DragEvent) {
    if (isSystem || dragIndex === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(idx);
  }
  function handleDrop(idx: number, e: React.DragEvent) {
    if (isSystem || dragIndex === null) return;
    e.preventDefault();
    if (dragIndex !== idx) {
      void reorderPlaylist(playlistId, dragIndex, idx);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  }
  function handleDragEnd() {
    setDragIndex(null);
    setDragOverIndex(null);
  }

  return (
    <div className="animate-fade-in">
      {/* Header with gradient backdrop */}
      <header
        className={cn(
          "bg-gradient-to-b to-[#0a0a0f] pt-6 pb-6 px-4 sm:px-6",
          isSystem ? "from-[#ff6b4a]/60" : gradient,
        )}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-6">
          {isSystem ? (
            <div className="w-40 h-40 sm:w-56 sm:h-56 rounded-md bg-gradient-to-br from-[#ff6b4a] to-[#f43f5e] flex items-center justify-center shadow-2xl shrink-0">
              <Heart className="h-16 w-16 text-white fill-white" />
            </div>
          ) : (
            <div
              className={cn(
                "w-40 h-40 sm:w-56 sm:h-56 rounded-md bg-gradient-to-br flex items-center justify-center shadow-2xl shrink-0",
                gradient,
              )}
            >
              <Music2 className="h-16 w-16 text-white/80" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-white/80 uppercase tracking-wider">
              {isSystem ? "Auto-playlist" : "Playlist"}
            </div>
            <h1 className="text-3xl sm:text-5xl lg:text-7xl font-extrabold text-white mt-1 mb-3 break-words">
              {playlist.name}
            </h1>
            {playlist.description && (
              <p className="text-sm text-white/70 mb-2">
                {playlist.description}
              </p>
            )}
            <div className="text-sm text-white/80 flex flex-wrap items-center gap-1">
              <span className="font-semibold text-white">Spotifree</span>
              <span>·</span>
              <span>
                {tracks.length} song{tracks.length !== 1 ? "s" : ""}
              </span>
              {totalSec > 0 && (
                <>
                  <span>·</span>
                  <span className="text-white/60">
                    {formatDurationLong(totalSec)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Action bar */}
      <div className="px-4 sm:px-6 py-4 flex items-center gap-4">
        <Button
          onClick={handlePlay}
          disabled={tracks.length === 0}
          className="bg-[#ff6b4a] hover:bg-[#e85a3a] text-black rounded-full h-12 w-12 p-0"
          aria-label={isPlayingThis ? "Pause" : "Play"}
        >
          {isPlayingThis ? (
            <Pause className="fill-current" size={22} />
          ) : (
            <Play className="fill-current ml-0.5" size={22} />
          )}
        </Button>
        <button
          onClick={handleShufflePlay}
          className={cn(
            "transition-colors",
            playerState.shuffle
              ? "text-[#ff6b4a]"
              : "text-white/70 hover:text-white",
          )}
          aria-label="Shuffle"
          title="Shuffle"
        >
          <Shuffle size={22} />
        </button>
        {!isSystem && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-white/70 hover:text-white hover:bg-white/10"
              >
                <MoreHorizontal size={22} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  void exportPlaylistM3U(playlistId).then(() =>
                    toast.success("M3U8 exported"),
                  );
                }}
              >
                <Download className="mr-2 h-4 w-4" /> Export as M3U
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  void exportPlaylistBundle(playlistId).then(() =>
                    toast.success("Bundle exported"),
                  );
                }}
              >
                <Download className="mr-2 h-4 w-4" /> Export bundle (with audio)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  if (confirm(`Delete playlist "${playlist.name}"?`)) {
                    void deletePlaylistById(playlistId);
                    toast("Playlist deleted");
                  }
                }}
                className="text-red-400 focus:text-red-400"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete playlist
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Track list header (desktop only) */}
      {tracks.length > 0 && (
        <div className="px-2 sm:px-6">
          <div className="hidden sm:grid grid-cols-[2rem_1fr_auto] gap-3 px-4 py-2 border-b border-white/10 text-xs uppercase tracking-wider text-white/50">
            <div className="text-center">#</div>
            <div>Title</div>
            <div className="text-right pr-2">
              <Clock size={14} className="inline" />
            </div>
          </div>
        </div>
      )}

      {/* Track list */}
      <div className="px-2 sm:px-6 pb-8">
        {tracks.length === 0 ? (
          <div className="text-center py-16 text-white/60">
            <Music2 className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="text-lg font-semibold text-white mb-1">
              {isSystem
                ? "No liked songs yet"
                : "Let's find something for your playlist"}
            </p>
            <p className="text-sm">
              {isSystem
                ? "Tap the heart on any song to add it here."
                : "Search for songs and use the menu to add them here."}
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {tracks.map((song, idx) => (
              <div
                key={`${song.id}-${idx}`}
                draggable={!isSystem}
                onDragStart={(e) => handleDragStart(idx, e)}
                onDragOver={(e) => handleDragOver(idx, e)}
                onDrop={(e) => handleDrop(idx, e)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "relative transition-colors",
                  dragOverIndex === idx &&
                    dragIndex !== null &&
                    dragIndex !== idx
                    ? "border-t-2 border-[#ff6b4a]"
                    : "",
                  dragIndex === idx && "opacity-50",
                )}
              >
                {!isSystem && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 hidden sm:flex items-center text-white/30 cursor-grab hover:text-white/60 px-1">
                    <GripVertical size={14} />
                  </div>
                )}
                <SongRow
                  song={song}
                  index={idx}
                  contextSongIds={tracks.map((t) => t.id)}
                  showAlbum
                  onRemoveFromPlaylist={
                    !isSystem
                      ? (songId) => removeFromPlaylist(playlistId, songId)
                      : undefined
                  }
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <EditPlaylistDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        playlist={playlist}
        onSave={async (name, description) => {
          await renamePlaylist(playlistId, name, description);
          toast.success("Playlist updated");
        }}
      />
    </div>
  );
}

function EditPlaylistDialog({
  open,
  onOpenChange,
  playlist,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  playlist: { name: string; description?: string };
  onSave: (name: string, description: string) => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <EditPlaylistForm
        key={playlist.name + (open ? "-open" : "-closed")}
        playlist={playlist}
        onSave={async (name, description) => {
          await onSave(name, description);
          onOpenChange(false);
        }}
        onCancel={() => onOpenChange(false)}
      />
    </Dialog>
  );
}

function EditPlaylistForm({
  playlist,
  onSave,
  onCancel,
}: {
  playlist: { name: string; description?: string };
  onSave: (name: string, description: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(playlist.name);
  const [description, setDescription] = useState(playlist.description ?? "");

  return (
    <DialogContent className="max-w-md bg-[#111118] border-white/10 text-white">
      <DialogHeader>
        <DialogTitle className="text-white">Edit playlist</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label className="text-white/80">Name</Label>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-white/5 border-white/10 text-white"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-white/80">Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="bg-white/5 border-white/10 text-white resize-none"
          />
        </div>
      </div>
      <DialogFooter className="gap-2">
        <Button
          variant="ghost"
          onClick={onCancel}
          className="text-white hover:text-white hover:bg-white/10"
        >
          Cancel
        </Button>
        <Button
          onClick={() => void onSave(name, description)}
          className="bg-[#ff6b4a] hover:bg-[#e85a3a] text-black font-semibold rounded-full"
        >
          Save
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
