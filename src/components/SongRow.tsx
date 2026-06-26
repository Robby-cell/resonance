"use client";

import { useState } from "react";
import { Song, useLibraryStore, usePlayerStore } from "@/lib/store";
import { SongCover } from "./SongCover";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Heart,
  Play,
  MoreHorizontal,
  ListPlus,
  ListMusic,
  Trash2,
  Pencil,
  Link2,
  Download,
  Loader2,
  HardDriveDownload,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { copySongSourceUrl } from "@/lib/exporter";
import { EditSongDialog } from "./modals/EditSongDialog";
import { getSongBlob } from "@/lib/db";

type SongRowProps = {
  song: Song;
  index?: number;
  contextSongIds?: string[];
  showAlbum?: boolean;
  showArtwork?: boolean;
  showIndex?: boolean;
  onRemoveFromPlaylist?: (songId: string) => void;
};

export function SongRow({
  song,
  index,
  contextSongIds,
  showAlbum = true,
  showArtwork = true,
  showIndex = true,
  onRemoveFromPlaylist,
}: SongRowProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const liked = useLibraryStore((s) => {
    const x = s.songs.find((y) => y.id === song.id);
    return x?.liked ?? false;
  });
  const toggleLike = useLibraryStore((s) => s.toggleLike);
  const removeSong = useLibraryStore((s) => s.removeSong);
  const downloadAndStoreAudio = useLibraryStore((s) => s.downloadAndStoreAudio);
  const addToPlaylist = useLibraryStore((s) => s.addToPlaylist);
  const playlists = useLibraryStore((s) => s.playlists);

  const playerState = usePlayerStore();
  const isCurrent =
    playerState.queue[playerState.currentIndex] === song.id ||
    playerState.shuffleQueue[playerState.currentIndex] === song.id;
  const isPlaying = isCurrent && playerState.isPlaying;

  function onPlayClick() {
    if (isCurrent) {
      playerState.togglePlay();
    } else {
      const ctx = contextSongIds ?? [song.id];
      usePlayerStore.getState().playContext(ctx, ctx.indexOf(song.id));
    }
  }

  async function handleLike() {
    await toggleLike(song.id);
    toast(liked ? "Removed from Liked Songs" : "Added to Liked Songs");
  }

  async function handleDelete() {
    await removeSong(song.id);
    toast.success("Song removed from library");
    setDeleteOpen(false);
  }

  async function handleDownloadAndStore() {
    setDownloading(true);
    try {
      await downloadAndStoreAudio(song.id);
      toast.success("Audio downloaded and stored locally", {
        description: "This song now plays offline from your device.",
      });
    } catch (e: any) {
      toast.error("Couldn't download this song", {
        description:
          e?.message ?? "The source server may block cross-origin downloads.",
      });
    } finally {
      setDownloading(false);
    }
  }

  async function handleCopyUrl() {
    const ok = await copySongSourceUrl(song.id);
    toast(ok ? "Source URL copied" : "Couldn't copy URL", {
      description: ok ? undefined : "The audio file lives only on this device.",
    });
  }

  async function handleDownload() {
    if (song.isRemote && song.sourceUrl) {
      window.open(song.sourceUrl, "_blank");
      return;
    }
    const blob = await getSongBlob(song.id);
    if (!blob) {
      toast("Couldn't fetch audio");
      return;
    }
    const safeName = `${song.artist} - ${song.title}`
      .replace(/[\\/:*?"<>|]/g, "_")
      .slice(0, 100);
    const ext = song.mimeType.split("/")[1]?.replace("mpeg", "mp3") || "mp3";
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeName}.${ext}`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  function handleAddToPlaylist(plId: string) {
    void addToPlaylist(plId, song.id);
    const pl = playlists.find((p) => p.id === plId);
    toast(`Added to "${pl?.name}"`);
  }

  function handlePlayNext() {
    usePlayerStore.getState().playNext(song.id);
    toast("Playing next");
  }

  function handleAddToQueue() {
    usePlayerStore.getState().addToQueue(song.id);
    toast("Added to queue");
  }

  // Whether this song can be downloaded and stored locally (direct URLs only, not blob or embed).
  const canDownloadAndStore =
    song.sourceType !== "blob" &&
    song.sourceType !== "embed" &&
    !!song.sourceUrl;

  return (
    <>
      <div
        className={cn(
          "group grid grid-cols-[2.5rem_1fr_auto] sm:grid-cols-[2rem_1fr_auto] items-center gap-3 px-2 sm:px-4 rounded-md transition-colors",
          "hover:bg-white/5",
          isCurrent && "bg-white/5",
        )}
      >
        {/* Left: index / play button */}
        <div className="flex items-center min-w-0">
          {showIndex && (
            <div className="hidden sm:flex items-center justify-center w-6 shrink-0">
              {isPlaying ? (
                <button
                  onClick={onPlayClick}
                  className="text-[#ff6b4a]"
                  aria-label="Pause"
                >
                  <EqualizerIcon />
                </button>
              ) : (
                <>
                  <span
                    className={cn(
                      "text-sm tabular-nums text-muted-foreground group-hover:hidden",
                      isCurrent && "text-[#ff6b4a]",
                    )}
                  >
                    {index !== undefined ? index + 1 : ""}
                  </span>
                  <button
                    onClick={onPlayClick}
                    className="hidden group-hover:block text-foreground"
                    aria-label="Play"
                  >
                    <Play className="fill-current" size={14} />
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Middle: artwork + title + artist */}
        <button
          className="min-w-0 text-left flex items-center gap-3"
          onDoubleClick={onPlayClick}
        >
          {showArtwork && (
            <SongCover
              songId={song.id}
              title={song.title}
              artist={song.artist}
              size={40}
            />
          )}
          <div className="min-w-0 flex-1">
            <div
              className={cn(
                "truncate text-sm font-medium flex items-center gap-1.5",
                isCurrent ? "text-[#ff6b4a]" : "text-foreground",
              )}
            >
              <span className="truncate">{song.title}</span>
              {song.sourceType === "blob" && (
                <HardDriveDownload
                  size={12}
                  className="shrink-0 text-[#ff6b4a]/60"
                  aria-label="Stored offline"
                />
              )}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {song.artist}
              {showAlbum && song.album ? ` · ${song.album}` : ""}
            </div>
          </div>
        </button>

        {/* Right: like, duration, menu */}
        <div className="flex items-center gap-2 sm:gap-4 justify-end">
          <button
            onClick={handleLike}
            className={cn(
              "opacity-0 group-hover:opacity-100 transition-opacity",
              liked && "opacity-100",
            )}
            aria-label={liked ? "Unlike" : "Like"}
          >
            <Heart
              size={16}
              className={cn(
                liked ? "fill-current text-[#ff6b4a]" : "text-muted-foreground",
              )}
            />
          </button>
          <span className="hidden sm:block text-xs tabular-nums text-muted-foreground w-10 text-right">
            {formatTime(song.durationSec)}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
              >
                <MoreHorizontal size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handlePlayNext}>
                <ListPlus className="mr-2 h-4 w-4" /> Play next
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAddToQueue}>
                <ListMusic className="mr-2 h-4 w-4" /> Add to queue
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLike}>
                <Heart
                  className={cn(
                    "mr-2 h-4 w-4",
                    liked && "fill-current text-[#ff6b4a]",
                  )}
                />
                {liked ? "Remove from Liked" : "Save to Liked"}
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <ListPlus className="mr-2 h-4 w-4" /> Add to playlist
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="max-h-72 overflow-y-auto w-56">
                  {playlists.filter((p) => !p.system).length === 0 && (
                    <DropdownMenuItem disabled>
                      No playlists yet
                    </DropdownMenuItem>
                  )}
                  {playlists
                    .filter((p) => !p.system)
                    .map((p) => (
                      <DropdownMenuItem
                        key={p.id}
                        onClick={() => handleAddToPlaylist(p.id)}
                      >
                        {p.name}
                      </DropdownMenuItem>
                    ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyUrl}>
                <Link2 className="mr-2 h-4 w-4" /> Copy source URL
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" /> Download file
              </DropdownMenuItem>
              {canDownloadAndStore && (
                <DropdownMenuItem
                  onClick={handleDownloadAndStore}
                  disabled={downloading}
                >
                  {downloading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <HardDriveDownload className="mr-2 h-4 w-4" />
                  )}
                  Download &amp; store offline
                </DropdownMenuItem>
              )}
              {onRemoveFromPlaylist && (
                <DropdownMenuItem onClick={() => onRemoveFromPlaylist(song.id)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Remove from this playlist
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="text-red-400 focus:text-red-400"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete from library
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <EditSongDialog open={editOpen} onOpenChange={setEditOpen} song={song} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#111118] border-white/8 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Delete this song?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              <span className="text-white">"{song.title}"</span> by{" "}
              <span className="text-white">{song.artist}</span> will be
              permanently removed from your library and all playlists it belongs
              to. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/15 text-white hover:bg-white/8">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function EqualizerIcon() {
  return (
    <div className="flex items-end gap-[2px] h-4">
      <div className="equalizer-bar h-1" />
      <div className="equalizer-bar h-2" />
      <div className="equalizer-bar h-3" />
      <div className="equalizer-bar h-2" />
    </div>
  );
}
