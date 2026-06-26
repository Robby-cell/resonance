"use client";

import { useState } from "react";
import { useLibraryStore, usePlayerStore, Song, Playlist } from "@/lib/store";
import { SongCover } from "@/components/SongCover";
import { Button } from "@/components/ui/button";
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
import { gradientFor } from "@/lib/format";
import { Play, Music2, Upload, Link2, Trash2 } from "lucide-react";
import { RecommendationsPanel } from "@/components/RecommendationsPanel";
import { toast } from "sonner";

type HomeViewProps = {
  onOpenUpload: () => void;
  onOpenAddUrl: () => void;
  onFindSong?: (query: string) => void;
};

export function HomeView({ onOpenUpload, onOpenAddUrl, onFindSong }: HomeViewProps) {
  const songs = useLibraryStore((s) => s.songs);
  const playlists = useLibraryStore((s) => s.playlists);
  const setView = useLibraryStore((s) => s.setView);
  const playContext = usePlayerStore((s) => s.playContext);

  const hour = new Date().getHours();
  const greeting =
    hour < 5
      ? "Good night"
      : hour < 12
        ? "Good morning"
        : hour < 18
          ? "Good afternoon"
          : "Good evening";

  const recent = songs.slice(0, 6);
  const userPlaylists = playlists.filter((p) => !p.system).slice(0, 6);
  const liked = playlists.find((p) => p.id === "liked");

  const mostPlayed = [...songs]
    .sort((a, b) => b.playCount - a.playCount)
    .slice(0, 8)
    .filter((s) => s.playCount > 0);
  const featured = (mostPlayed.length >= 4 ? mostPlayed : songs.slice(0, 8)).slice(0, 8);

  return (
    <div className="p-4 sm:p-6 pb-8 space-y-8 animate-fade-in">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{greeting}</h1>
      </header>

      {/* Quick action cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {liked && liked.songIds.length > 0 && (
          <QuickCard
            onClick={() => setView({ kind: "liked" })}
            cover={
              <div className="w-14 h-14 bg-gradient-to-br from-[#ff6b4a] to-[#f43f5e] flex items-center justify-center shrink-0">
                <Music2 className="h-5 w-5 text-white" />
              </div>
            }
            title="Liked Songs"
            subtitle={`${liked.songIds.length} song${liked.songIds.length !== 1 ? "s" : ""}`}
            onPlay={() => playContext(liked.songIds)}
          />
        )}

        <button
          onClick={onOpenUpload}
          className="group flex items-center gap-4 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors overflow-hidden text-left"
        >
          <div className="w-14 h-14 bg-[#ff6b4a] flex items-center justify-center shrink-0">
            <Upload className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-white font-semibold truncate text-sm">Upload music</div>
            <div className="text-xs text-white/40 truncate">
              Drop MP3s from your device
            </div>
          </div>
        </button>

        <button
          onClick={onOpenAddUrl}
          className="group flex items-center gap-4 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors overflow-hidden text-left"
        >
          <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-rose-600 flex items-center justify-center shrink-0">
            <Link2 className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-white font-semibold truncate text-sm">Add from URL</div>
            <div className="text-xs text-white/40 truncate">
              Spotify, SoundCloud, or direct links
            </div>
          </div>
        </button>

        {userPlaylists.slice(0, 3).map((p) => (
          <QuickCard
            key={p.id}
            onClick={() => setView({ kind: "playlist", id: p.id })}
            cover={
              <div
                className={cn(
                  "w-14 h-14 bg-gradient-to-br flex items-center justify-center shrink-0",
                  gradientFor(p.coverSeed ?? p.id)
                )}
              >
                <Music2 className="h-5 w-5 text-white/80" />
              </div>
            }
            title={p.name}
            subtitle={`Playlist · ${p.songIds.length} song${p.songIds.length !== 1 ? "s" : ""}`}
            onPlay={() =>
              p.songIds.length > 0 && playContext(p.songIds)
            }
          />
        ))}
      </section>

      {/* Empty state */}
      {songs.length === 0 && (
        <section className="rounded-xl border border-white/8 bg-gradient-to-br from-white/[0.03] to-transparent p-8 sm:p-12 text-center">
          <div className="w-20 h-20 rounded-full bg-[#ff6b4a]/15 flex items-center justify-center mx-auto mb-4">
            <Music2 className="h-10 w-10 text-[#ff6b4a]" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            Your library is empty
          </h2>
          <p className="text-white/50 mb-6 max-w-md mx-auto text-sm">
            Upload your favorite tracks or add a direct URL — they're stored
            entirely in your browser cache. Nothing leaves your device.
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button
              onClick={onOpenUpload}
              className="bg-[#ff6b4a] hover:bg-[#e85a3a] text-white font-semibold rounded-full"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload music
            </Button>
            <Button
              onClick={onOpenAddUrl}
              variant="outline"
              className="border-white/15 text-white hover:bg-white/8 rounded-full"
            >
              <Link2 className="mr-2 h-4 w-4" />
              Add from URL
            </Button>
          </div>
        </section>
      )}

      {/* Recommendations */}
      {songs.length > 0 && onFindSong && (
        <RecommendationsPanel onFindSong={onFindSong} />
      )}

      {/* Recently added */}
      {recent.length > 0 && (
        <Section title="Recently added">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {recent.map((song) => (
              <SongCard
                key={song.id}
                song={song}
                onPlay={() => playContext(songs.map((s) => s.id), songs.findIndex((s) => s.id === song.id))}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Featured / Most played */}
      {featured.length > 0 && (
        <Section title={mostPlayed.length >= 4 ? "Most played" : "Your tracks"}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {featured.map((song) => (
              <SongCard
                key={song.id}
                song={song}
                onPlay={() => playContext(songs.map((s) => s.id), songs.findIndex((s) => s.id === song.id))}
              />
            ))}
          </div>
        </Section>
      )}

      {/* User playlists */}
      {userPlaylists.length > 0 && (
        <Section title="Your playlists">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {userPlaylists.map((p) => (
              <PlaylistCard
                key={p.id}
                playlist={p}
                onClick={() => setView({ kind: "playlist", id: p.id })}
                onPlay={() =>
                  p.songIds.length > 0 && playContext(p.songIds)
                }
              />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function QuickCard({
  cover,
  title,
  subtitle,
  onClick,
  onPlay,
}: {
  cover: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  onPlay: () => void;
}) {
  return (
    <div
      className="group relative flex items-center gap-4 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors overflow-hidden cursor-pointer"
      onClick={onClick}
    >
      {cover}
      <div className="min-w-0 flex-1 pr-2">
        <div className="text-white font-semibold truncate text-sm">{title}</div>
        <div className="text-xs text-white/40 truncate">{subtitle}</div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onPlay();
        }}
        className="absolute right-3 bottom-3 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all bg-[#ff6b4a] text-white rounded-full h-10 w-10 flex items-center justify-center hover:scale-105 shadow-lg rs-glow"
        aria-label="Play"
      >
        <Play className="fill-current ml-0.5" size={16} />
      </button>
    </div>
  );
}

function SongCard({
  song,
  onPlay,
}: {
  song: Song;
  onPlay: () => void;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const removeSong = useLibraryStore((s) => s.removeSong);

  async function handleDelete() {
    await removeSong(song.id);
    toast.success("Song removed from library");
    setDeleteOpen(false);
  }

  return (
    <>
      <div
        className="group relative rounded-lg bg-white/[0.02] hover:bg-white/[0.06] transition-colors p-3 cursor-pointer min-w-0"
        onClick={onPlay}
      >
        <div className="relative mb-3">
          <SongCover
            songId={song.id}
            title={song.title}
            artist={song.artist}
            className="w-full aspect-square"
            rounded="rounded-md"
          />
          {/* Play button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlay();
            }}
            className="absolute right-2 bottom-2 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all bg-[#ff6b4a] text-white rounded-full h-10 w-10 flex items-center justify-center hover:scale-105 shadow-lg rs-glow"
            aria-label="Play"
          >
            <Play className="fill-current ml-0.5" size={16} />
          </button>
          {/* Delete button — top-right corner, appears on hover */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteOpen(true);
            }}
            className="absolute left-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 hover:bg-red-600/80 text-white rounded-full h-7 w-7 flex items-center justify-center backdrop-blur-sm"
            aria-label="Delete from library"
            title="Delete from library"
          >
            <Trash2 size={13} />
          </button>
        </div>
        <div className="text-sm font-semibold text-white truncate">{song.title}</div>
        <div className="text-xs text-white/40 truncate">{song.artist}</div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#111118] border-white/8 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Delete this song?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              <span className="text-white">"{song.title}"</span> by{" "}
              <span className="text-white">{song.artist}</span> will be
              permanently removed from your library and all playlists. This
              cannot be undone.
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

function PlaylistCard({
  playlist,
  onClick,
  onPlay,
}: {
  playlist: Playlist;
  onClick: () => void;
  onPlay: () => void;
}) {
  return (
    <div
      className="group relative rounded-lg bg-white/[0.02] hover:bg-white/[0.06] transition-colors p-3 cursor-pointer"
      onClick={onClick}
    >
      <div className="relative mb-3">
        <div
          className={cn(
            "w-full aspect-square rounded-md bg-gradient-to-br flex items-center justify-center",
            gradientFor(playlist.coverSeed ?? playlist.id)
          )}
        >
          <Music2 className="h-10 w-10 text-white/70" />
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPlay();
          }}
          disabled={playlist.songIds.length === 0}
          className="absolute right-2 bottom-2 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all bg-[#ff6b4a] text-white rounded-full h-10 w-10 flex items-center justify-center hover:scale-105 shadow-lg disabled:opacity-30 disabled:cursor-not-allowed rs-glow"
          aria-label="Play"
        >
          <Play className="fill-current ml-0.5" size={16} />
        </button>
      </div>
      <div className="text-sm font-semibold text-white truncate">{playlist.name}</div>
      <div className="text-xs text-white/40 truncate">
        {playlist.songIds.length} song{playlist.songIds.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
