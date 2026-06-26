"use client";

import { useState } from "react";
import { useLibraryStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { gradientFor } from "@/lib/format";
import { Music2, Heart, ListMusic, Plus, Upload, Link2 } from "lucide-react";
import { CreatePlaylistModal } from "@/components/modals/CreatePlaylistModal";

type LibraryViewProps = {
  onOpenUpload: () => void;
  onOpenAddUrl: () => void;
};

type Filter = "all" | "playlists" | "liked";

export function LibraryView({ onOpenUpload, onOpenAddUrl }: LibraryViewProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const playlists = useLibraryStore((s) => s.playlists);
  const setView = useLibraryStore((s) => s.setView);
  const songs = useLibraryStore((s) => s.songs);

  const userPlaylists = playlists.filter((p) => !p.system);
  const liked = playlists.find((p) => p.id === "liked");

  const cards: React.ReactNode[] = [];
  if ((filter === "all" || filter === "liked") && liked) {
    cards.push(
      <LibraryCard
        key="liked"
        onClick={() => setView({ kind: "liked" })}
        title="Liked Songs"
        subtitle={`Playlist · ${liked.songIds.length} song${liked.songIds.length !== 1 ? "s" : ""}`}
        icon={<Heart className="h-5 w-5 text-white fill-white" />}
        gradient="from-[#ff6b4a] to-[#f43f5e]"
      />,
    );
  }
  if (filter === "all" || filter === "playlists") {
    for (const p of userPlaylists) {
      cards.push(
        <LibraryCard
          key={p.id}
          onClick={() => setView({ kind: "playlist", id: p.id })}
          title={p.name}
          subtitle={`Playlist · ${p.songIds.length} song${p.songIds.length !== 1 ? "s" : ""}`}
          icon={<ListMusic className="h-5 w-5 text-white/90" />}
          gradient={gradientFor(p.coverSeed ?? p.id)}
        />,
      );
    }
  }

  return (
    <div className="p-4 sm:p-6 pb-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Your Library</h1>
        <div className="flex items-center gap-2">
          <Button
            onClick={onOpenUpload}
            variant="outline"
            size="sm"
            className="border-white/15 text-white hover:bg-white/10 rounded-full"
          >
            <Upload className="mr-2 h-4 w-4" /> Upload
          </Button>
          <Button
            onClick={onOpenAddUrl}
            variant="outline"
            size="sm"
            className="border-white/15 text-white hover:bg-white/10 rounded-full"
          >
            <Link2 className="mr-2 h-4 w-4" /> URL
          </Button>
          <Button
            onClick={() => setCreateOpen(true)}
            size="sm"
            className="bg-[#ff6b4a] hover:bg-[#e85a3a] text-black font-semibold rounded-full"
          >
            <Plus className="mr-1 h-4 w-4" /> New playlist
          </Button>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto no-scrollbar">
        {(["all", "playlists", "liked"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
              filter === f
                ? "bg-white text-black"
                : "bg-white/10 text-white hover:bg-white/20",
            )}
          >
            {f === "all" ? "All" : f === "playlists" ? "Playlists" : "Liked"}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      {cards.length === 0 ? (
        <div className="text-center py-16 text-white/60">
          <Music2 className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-semibold text-white mb-1">
            {filter === "liked" ? "No liked songs yet" : "No playlists yet"}
          </p>
          <p className="text-sm mb-4">
            {filter === "liked"
              ? "Tap the heart on any song to save it here."
              : "Create your first playlist to organize your music."}
          </p>
          {filter === "playlists" && (
            <Button
              onClick={() => setCreateOpen(true)}
              className="bg-[#ff6b4a] hover:bg-[#e85a3a] text-black font-semibold rounded-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create playlist
            </Button>
          )}
          {filter === "liked" && songs.length === 0 && (
            <Button
              onClick={onOpenUpload}
              className="bg-[#ff6b4a] hover:bg-[#e85a3a] text-black font-semibold rounded-full"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload music
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {cards}
        </div>
      )}

      <CreatePlaylistModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => setView({ kind: "playlist", id })}
      />
    </div>
  );
}

function LibraryCard({
  title,
  subtitle,
  icon,
  gradient,
  onClick,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  gradient: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-4 rounded-lg bg-white/[0.03] hover:bg-white/10 transition-colors p-3 text-left w-full"
    >
      <div
        className={cn(
          "w-14 h-14 rounded-md bg-gradient-to-br flex items-center justify-center shrink-0",
          gradient,
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-white truncate">{title}</div>
        <div className="text-xs text-white/60 truncate">{subtitle}</div>
      </div>
    </button>
  );
}
