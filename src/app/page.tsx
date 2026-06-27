"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { PlayerBar, QueuePanel } from "@/components/PlayerBar";
import { AudioEngine } from "@/components/AudioEngine";
import { EmbedPlayer } from "@/components/EmbedPlayer";
import { UploadModal } from "@/components/modals/UploadModal";
import { AddFromUrlModal } from "@/components/modals/AddFromUrlModal";
import { HomeView } from "@/components/views/HomeView";
import { SearchView } from "@/components/views/SearchView";
import { LibraryView } from "@/components/views/LibraryView";
import { PlaylistView } from "@/components/views/PlaylistView";
import { LikedSongsView } from "@/components/views/LikedSongsView";
import { useLibraryStore } from "@/lib/store";
import { useSettingsStore } from "@/lib/settings";
import { useMediaSession } from "@/hooks/useMediaSession";

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [addUrlOpen, setAddUrlOpen] = useState(false);
  const [findQuery, setFindQuery] = useState<string | null>(null);

  const view = useLibraryStore((s) => s.view);
  const hydrate = useLibraryStore((s) => s.hydrate);
  const loaded = useLibraryStore((s) => s.loaded);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);

  // Wire up the Media Session API for background audio + OS media controls.
  useMediaSession();

  useEffect(() => {
    void hydrate();
    hydrateSettings();
  }, [hydrate, hydrateSettings]);

  function handleFindSong(query: string) {
    setFindQuery(query);
    setAddUrlOpen(true);
  }

  return (
    <div className="flex flex-col bg-[#08080c] text-white" style={{ height: "100dvh" }}>
      {/* Main grid: sidebar + main content */}
      <div className="flex flex-1 min-h-0 gap-0 md:gap-2 md:p-2 md:pb-0">
        <Sidebar
          isMobileOpen={sidebarOpen}
          onMobileClose={() => setSidebarOpen(false)}
        />

        {/* Main content area */}
        <main className="flex-1 min-w-0 rounded-t-lg bg-gradient-to-b from-[#15151c] to-[#0a0a0f] overflow-hidden flex flex-col">
          <TopBar
            onOpenSidebar={() => setSidebarOpen(true)}
            onOpenUpload={() => setUploadOpen(true)}
            onOpenAddUrl={() => {
              setFindQuery(null);
              setAddUrlOpen(true);
            }}
          />
          <div className="flex-1 overflow-y-auto">
            {!loaded ? (
              <div className="flex items-center justify-center h-full text-white/30">
                <div className="animate-pulse">Loading your library…</div>
              </div>
            ) : view.kind === "home" ? (
              <HomeView
                onOpenUpload={() => setUploadOpen(true)}
                onOpenAddUrl={() => setAddUrlOpen(true)}
                onFindSong={handleFindSong}
              />
            ) : view.kind === "search" ? (
              <SearchView
                onOpenUpload={() => setUploadOpen(true)}
                onOpenAddUrl={() => setAddUrlOpen(true)}
              />
            ) : view.kind === "library" ? (
              <LibraryView
                onOpenUpload={() => setUploadOpen(true)}
                onOpenAddUrl={() => setAddUrlOpen(true)}
              />
            ) : view.kind === "liked" ? (
              <LikedSongsView />
            ) : view.kind === "playlist" ? (
              <PlaylistView playlistId={view.id} />
            ) : null}
          </div>
        </main>
      </div>

      {/* Player bar at bottom */}
      <PlayerBar onOpenQueue={() => setQueueOpen(true)} />

      {/* Queue slide-over */}
      <QueuePanel open={queueOpen} onClose={() => setQueueOpen(false)} />

      {/* Modals */}
      <UploadModal open={uploadOpen} onOpenChange={setUploadOpen} />
      <AddFromUrlModal
        open={addUrlOpen}
        onOpenChange={setAddUrlOpen}
        initialQuery={findQuery}
      />

      {/* Hidden audio engine — wires everything together */}
      <AudioEngine />
      {/* Embed player for Spotify/SoundCloud songs (renders nothing for blob/direct) */}
      <EmbedPlayer />
    </div>
  );
}
