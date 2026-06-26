"use client";

import { useState, useEffect, useRef } from "react";
import { usePlayerStore, useLibraryStore } from "@/lib/store";
import { useSettingsStore } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Loader2,
  RefreshCw,
  X,
  Search,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

type Recommendation = {
  title: string;
  artist: string;
  reason: string;
};

type RecommendationsPanelProps = {
  onFindSong: (query: string) => void;
};

export function RecommendationsPanel({
  onFindSong,
}: RecommendationsPanelProps) {
  const recommendationsEnabled = useSettingsStore(
    (s) => s.recommendationsEnabled,
  );
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastSongIdRef = useRef<string | null>(null);

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

  async function fetchRecs(songId: string, title: string, artist: string) {
    setLoading(true);
    setError(null);
    try {
      // The recommendations API is only available when running with a
      // Node.js server (next dev / next start). On static hosting (GitHub
      // Pages), there's no API — the fetch will fail and we show a friendly
      // message explaining the feature requires a server.
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const res = await fetch(`${basePath}/api/recommendations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, artist }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (cancelledRef.current) return;
      setRecs(data.recommendations || []);
    } catch (e: any) {
      if (cancelledRef.current) return;
      // On static hosting the fetch fails — show a clear message.
      setError(
        "AI recommendations require a server and aren't available on static hosting. " +
          "Run the app locally with `bun run dev` to enable this feature.",
      );
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }

  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    if (!recommendationsEnabled) {
      setRecs([]);
      return;
    }
    if (!currentSong) {
      setRecs([]);
      lastSongIdRef.current = null;
      return;
    }
    // Only fetch when the song changes, not on every render.
    if (lastSongIdRef.current === currentSong.id) return;
    lastSongIdRef.current = currentSong.id;
    void fetchRecs(currentSong.id, currentSong.title, currentSong.artist);
    return () => {
      cancelledRef.current = true;
    };
  }, [currentSong?.id, recommendationsEnabled]);

  function handleRefresh() {
    if (!currentSong) return;
    void fetchRecs(
      currentSong.id + Date.now().toString(),
      currentSong.title,
      currentSong.artist,
    );
  }

  function handleFind(rec: Recommendation) {
    onFindSong(`${rec.title} ${rec.artist}`);
  }

  function openOnSpotify(rec: Recommendation) {
    const q = encodeURIComponent(`${rec.title} ${rec.artist}`);
    window.open(`https://open.spotify.com/search/${q}`, "_blank");
  }

  if (!recommendationsEnabled) return null;
  if (!currentSong) return null;

  return (
    <section className="rounded-xl border border-white/5 bg-gradient-to-br from-white/[0.02] to-transparent p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-[#ff6b4a]" />
          <h2 className="text-lg font-bold text-white">Recommended for you</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white/50 hover:text-white"
          onClick={handleRefresh}
          disabled={loading}
          aria-label="Refresh recommendations"
          title="Refresh"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <RefreshCw size={16} />
          )}
        </Button>
      </div>

      <p className="text-xs text-white/40 mb-4">
        Based on what you're listening to —{" "}
        <span className="text-white/60">
          {currentSong.title} by {currentSong.artist}
        </span>
      </p>

      {loading && recs.length === 0 ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-lg bg-white/[0.03] animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-6 text-sm text-white/50">
          <p className="mb-2">Couldn't load recommendations.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="border-white/15 text-white hover:bg-white/10 rounded-full"
          >
            Try again
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {recs.map((rec, idx) => (
            <div
              key={`${rec.title}-${idx}`}
              className="group flex items-start gap-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 p-3 transition-colors"
            >
              <div className="w-10 h-10 rounded-md bg-gradient-to-br from-[#ff6b4a]/30 to-[#f59e0b]/10 flex items-center justify-center shrink-0">
                <Sparkles size={14} className="text-[#ff6b4a]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-white truncate">
                  {rec.title}
                </div>
                <div className="text-xs text-white/50 truncate">
                  {rec.artist}
                </div>
                <div className="text-xs text-white/40 mt-1 line-clamp-2">
                  {rec.reason}
                </div>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-white/40 hover:text-[#ff6b4a] opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleFind(rec)}
                  aria-label="Find this song"
                  title="Find and add this song"
                >
                  <Search size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-white/40 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => openOnSpotify(rec)}
                  aria-label="Open on Spotify"
                  title="Search on Spotify"
                >
                  <ExternalLink size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
