"use client";

import { useState, useMemo } from "react";
import { useLibraryStore, usePlayerStore } from "@/lib/store";
import { SongRow } from "@/components/SongRow";
import { SongCover } from "@/components/SongCover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { gradientFor } from "@/lib/format";
import { Search, Upload, Link2, X, Music2, Play } from "lucide-react";

type SearchViewProps = {
  onOpenUpload: () => void;
  onOpenAddUrl: () => void;
};

export function SearchView({ onOpenUpload, onOpenAddUrl }: SearchViewProps) {
  const [query, setQuery] = useState("");
  const songs = useLibraryStore((s) => s.songs);
  const playlists = useLibraryStore((s) => s.playlists);
  const setView = useLibraryStore((s) => s.setView);
  const playContext = usePlayerStore((s) => s.playContext);

  const q = query.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!q) return { songs: [], playlists: [] };
    return {
      songs: songs.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q) ||
          (s.album?.toLowerCase().includes(q) ?? false),
      ),
      playlists: playlists.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description?.toLowerCase().includes(q) ?? false),
      ),
    };
  }, [q, songs, playlists]);

  const browseCategories = [
    {
      label: "Upload music",
      color: "from-[#ff6b4a] to-emerald-700",
      icon: Upload,
      onClick: onOpenUpload,
    },
    {
      label: "Add from URL",
      color: "from-orange-500 to-pink-500",
      icon: Link2,
      onClick: onOpenAddUrl,
    },
    {
      label: "Liked Songs",
      color: "from-[#ff6b4a] to-[#f43f5e]",
      icon: Music2,
      onClick: () => setView({ kind: "liked" }),
    },
  ];

  return (
    <div className="p-4 sm:p-6 pb-8 animate-fade-in">
      {/* Search input */}
      <div className="relative max-w-xl mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-black/60 pointer-events-none" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What do you want to play?"
          className="w-full h-12 pl-11 pr-10 rounded-full bg-white text-black placeholder-black/60 focus:outline-none focus:ring-2 focus:ring-white"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-black/60 hover:text-black"
            aria-label="Clear search"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {!q ? (
        // Browse categories
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white">Browse all</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {browseCategories.map((c) => (
              <button
                key={c.label}
                onClick={c.onClick}
                className={cn(
                  "relative h-32 rounded-lg overflow-hidden bg-gradient-to-br p-4 text-left",
                  c.color,
                )}
              >
                <span className="text-lg font-bold text-white drop-shadow">
                  {c.label}
                </span>
                <c.icon className="absolute -bottom-2 -right-2 h-20 w-20 text-white/30 rotate-12" />
              </button>
            ))}
            {playlists
              .filter((p) => !p.system)
              .slice(0, 6)
              .map((p) => (
                <button
                  key={p.id}
                  onClick={() => setView({ kind: "playlist", id: p.id })}
                  className={cn(
                    "relative h-32 rounded-lg overflow-hidden bg-gradient-to-br p-4 text-left",
                    gradientFor(p.coverSeed ?? p.id),
                  )}
                >
                  <span className="text-lg font-bold text-white drop-shadow truncate block">
                    {p.name}
                  </span>
                  <Music2 className="absolute -bottom-2 -right-2 h-20 w-20 text-white/30 rotate-12" />
                </button>
              ))}
          </div>

          {songs.length === 0 && (
            <div className="mt-12 text-center text-white/60">
              <Music2 className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm">
                Your library is empty — upload or add a URL to get started.
              </p>
              <div className="flex gap-2 justify-center mt-4">
                <Button
                  onClick={onOpenUpload}
                  className="bg-[#ff6b4a] hover:bg-[#e85a3a] text-black font-semibold rounded-full"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </Button>
                <Button
                  onClick={onOpenAddUrl}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10 rounded-full"
                >
                  <Link2 className="mr-2 h-4 w-4" />
                  Add URL
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Top result + Songs */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-6">
            {/* Top result */}
            {matches.songs.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-white mb-3">
                  Top result
                </h2>
                <div
                  className="group relative rounded-lg bg-white/5 hover:bg-white/10 transition-colors p-5 cursor-pointer"
                  onClick={() =>
                    playContext(
                      matches.songs.map((s) => s.id),
                      0,
                    )
                  }
                >
                  <SongCover
                    songId={matches.songs[0].id}
                    title={matches.songs[0].title}
                    artist={matches.songs[0].artist}
                    size={92}
                    className="mb-4"
                  />
                  <div className="text-2xl font-bold text-white truncate">
                    {matches.songs[0].title}
                  </div>
                  <div className="text-sm text-white/60 mt-1">
                    Song · {matches.songs[0].artist}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      playContext(
                        matches.songs.map((s) => s.id),
                        0,
                      );
                    }}
                    className="absolute right-5 bottom-5 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all bg-[#ff6b4a] text-black rounded-full h-12 w-12 flex items-center justify-center hover:scale-105 shadow-lg"
                    aria-label="Play"
                  >
                    <Play className="fill-current ml-0.5" size={20} />
                  </button>
                </div>
              </section>
            )}

            {/* Songs list */}
            {matches.songs.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-white mb-3">Songs</h2>
                <div className="space-y-1">
                  {matches.songs.slice(0, 5).map((song, idx) => (
                    <SongRow
                      key={song.id}
                      song={song}
                      index={idx}
                      contextSongIds={matches.songs.map((s) => s.id)}
                      showAlbum={false}
                      showIndex={false}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Playlists */}
          {matches.playlists.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-white mb-3">Playlists</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {matches.playlists.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setView({ kind: "playlist", id: p.id })}
                    className="group relative rounded-lg bg-white/[0.03] hover:bg-white/10 transition-colors p-3 text-left"
                  >
                    <div
                      className={cn(
                        "w-full aspect-square rounded-md mb-3 bg-gradient-to-br flex items-center justify-center",
                        gradientFor(p.coverSeed ?? p.id),
                      )}
                    >
                      <Music2 className="h-10 w-10 text-white/80" />
                    </div>
                    <div className="text-sm font-semibold text-white truncate">
                      {p.name}
                    </div>
                    <div className="text-xs text-white/60 truncate">
                      {p.songIds.length} song{p.songIds.length !== 1 ? "s" : ""}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* No results */}
          {matches.songs.length === 0 && matches.playlists.length === 0 && (
            <div className="text-center py-16 text-white/60">
              <Music2 className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-lg font-semibold text-white mb-1">
                No results found for "{query}"
              </p>
              <p className="text-sm">
                Try a different search, or upload a new song.
              </p>
              <Button
                onClick={onOpenUpload}
                className="mt-4 bg-[#ff6b4a] hover:bg-[#e85a3a] text-black font-semibold rounded-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload music
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
