"use client";

import { useState } from "react";
import { useLibraryStore } from "@/lib/store";
import { useSettingsStore } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { gradientFor } from "@/lib/format";
import {
  Home,
  Search,
  Library,
  Plus,
  Heart,
  ListMusic,
  X,
  Download,
  Settings,
  Music,
} from "lucide-react";
import { CreatePlaylistModal } from "./modals/CreatePlaylistModal";
import { ExportModal } from "./modals/ExportModal";
import { SettingsModal } from "./modals/SettingsModal";

type SidebarProps = {
  isMobileOpen: boolean;
  onMobileClose: () => void;
};

export function Sidebar({ isMobileOpen, onMobileClose }: SidebarProps) {
  const view = useLibraryStore((s) => s.view);
  const setView = useLibraryStore((s) => s.setView);
  const playlists = useLibraryStore((s) => s.playlists);
  const songs = useLibraryStore((s) => s.songs);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const [createOpen, setCreateOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Hydrate settings from localStorage on first render.
  useState(() => {
    hydrateSettings();
  });

  const liked = playlists.find((p) => p.id === "liked");
  const userPlaylists = playlists.filter((p) => !p.system);

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 md:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={cn(
          "fixed md:relative z-50 md:z-auto top-0 left-0 h-full md:h-auto",
          "w-72 md:w-60 lg:w-64 shrink-0",
          "transition-transform duration-300 ease-out",
          "flex flex-col gap-2 p-2 safe-top safe-left",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Brand + top nav */}
        <nav className="rounded-lg bg-[#0e0e14] p-3 space-y-1">
          {/* Brand */}
          <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-[#ff6b4a] to-[#f59e0b] flex items-center justify-center">
              <Music className="h-4 w-4 text-white" />
            </div>
            <span className="text-white font-bold text-sm tracking-tight">
              Resonance
            </span>
          </div>
          <NavItem
            icon={<Home size={22} />}
            label="Home"
            active={view.kind === "home"}
            onClick={() => {
              setView({ kind: "home" });
              onMobileClose();
            }}
          />
          <NavItem
            icon={<Search size={22} />}
            label="Search"
            active={view.kind === "search"}
            onClick={() => {
              setView({ kind: "search" });
              onMobileClose();
            }}
          />
        </nav>

        {/* Library card */}
        <div className="flex-1 min-h-0 rounded-lg bg-[#0e0e14] flex flex-col">
          <div className="flex items-center justify-between p-3 pb-2">
            <button
              className="flex items-center gap-3 text-white/60 hover:text-white font-semibold text-sm transition-colors"
              onClick={() => {
                setView({ kind: "library" });
                onMobileClose();
              }}
            >
              <Library size={22} />
              Your Library
            </button>
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/8"
                onClick={() => setExportOpen(true)}
                aria-label="Export & backup"
                title="Export & backup"
              >
                <Download size={15} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/8"
                onClick={() => setSettingsOpen(true)}
                aria-label="Settings"
                title="Settings"
              >
                <Settings size={15} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/8"
                onClick={() => setCreateOpen(true)}
                aria-label="Create playlist"
                title="Create playlist"
              >
                <Plus size={17} />
              </Button>
            </div>
          </div>

          {/* Liked Songs quick link */}
          <div className="px-2 pb-2 space-y-0.5">
            <button
              className={cn(
                "group w-full flex items-center gap-3 rounded-md p-2 text-left transition-colors",
                view.kind === "liked"
                  ? "bg-white/[0.06]"
                  : "hover:bg-white/[0.03]"
              )}
              onClick={() => {
                setView({ kind: "liked" });
                onMobileClose();
              }}
            >
              <div className="w-11 h-11 rounded-md bg-gradient-to-br from-[#ff6b4a] to-[#f43f5e] flex items-center justify-center shrink-0">
                <Heart className="h-5 w-5 text-white fill-white" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-white truncate">
                  Liked Songs
                </div>
                <div className="text-xs text-white/40">
                  {liked?.songIds.length ?? 0} song{(liked?.songIds.length ?? 0) !== 1 ? "s" : ""}
                </div>
              </div>
            </button>
          </div>

          {/* Playlists list */}
          <div className="flex-1 overflow-y-auto px-2 pb-2 no-scrollbar">
            {userPlaylists.length === 0 && songs.length === 0 && (
              <div className="m-2 mt-3 p-4 rounded-lg bg-[#15151c] text-sm">
                <p className="font-semibold text-white mb-1">
                  Create your first playlist
                </p>
                <p className="text-white/50 text-xs mb-3">
                  It's easy — we'll help you.
                </p>
                <Button
                  size="sm"
                  onClick={() => setCreateOpen(true)}
                  className="bg-white text-black hover:bg-white/90 rounded-full font-semibold"
                >
                  Create playlist
                </Button>
              </div>
            )}

            {userPlaylists.length === 0 && songs.length > 0 && (
              <div className="px-2 py-6 text-center text-xs text-white/30">
                No playlists yet. Click + to create one.
              </div>
            )}

            <div className="space-y-0.5">
              {userPlaylists.map((p) => (
                <button
                  key={p.id}
                  className={cn(
                    "group w-full flex items-center gap-3 rounded-md p-2 text-left transition-colors",
                    view.kind === "playlist" && view.id === p.id
                      ? "bg-white/[0.06]"
                      : "hover:bg-white/[0.03]"
                  )}
                  onClick={() => {
                    setView({ kind: "playlist", id: p.id });
                    onMobileClose();
                  }}
                >
                  <div
                    className={cn(
                      "w-11 h-11 rounded-md bg-gradient-to-br flex items-center justify-center shrink-0",
                      gradientFor(p.coverSeed ?? p.id)
                    )}
                  >
                    <ListMusic className="h-5 w-5 text-white/80" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {p.name}
                    </div>
                    <div className="text-xs text-white/40 truncate">
                      {p.songIds.length} song{p.songIds.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3 md:hidden text-white"
          onClick={onMobileClose}
        >
          <X size={20} />
        </Button>
      </aside>

      <CreatePlaylistModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => {
          setView({ kind: "playlist", id });
        }}
      />
      <ExportModal open={exportOpen} onOpenChange={setExportOpen} />
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}

function NavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "flex items-center gap-3.5 px-2.5 py-2 rounded-md text-sm font-semibold transition-colors w-full text-left",
        active
          ? "text-white bg-white/[0.04]"
          : "text-white/55 hover:text-white"
      )}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}
