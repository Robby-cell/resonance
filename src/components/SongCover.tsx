"use client";

import { useEffect, useState } from "react";
import { resolveCoverUrl } from "@/lib/audio";
import { gradientFor, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Music2 } from "lucide-react";

type SongCoverProps = {
  songId: string;
  title: string;
  artist: string;
  /**
   * Fixed pixel size. When provided, the cover renders at exactly this size
   * (used in song rows, player bar, queue, etc.). When omitted, the cover
   * fills its parent — use `className` to control sizing (e.g. "w-full aspect-square"
   * for responsive grid cards).
   */
  size?: number;
  className?: string;
  rounded?: string;
};

export function SongCover({
  songId,
  title,
  artist,
  size,
  className,
  rounded = "rounded-md",
}: SongCoverProps) {
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [lastId, setLastId] = useState(songId);

  // Reset state when songId changes (render-time pattern).
  if (lastId !== songId) {
    setLastId(songId);
    setCoverUrl(null);
    setLoaded(false);
  }

  useEffect(() => {
    let alive = true;
    resolveCoverUrl(songId)
      .then((url) => {
        if (!alive) return;
        setCoverUrl(url);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [songId]);

  const seed = `${title}-${artist}`;
  const grad = gradientFor(seed);

  // Fixed-size mode: apply inline width/height.
  // Responsive mode: let className control sizing (no inline styles).
  const style = size != null ? { width: size, height: size } : undefined;

  // Pick icon size: for fixed mode, scale with size; for responsive mode,
  // use a className-based approach so the icon scales with the container.
  const showLargeIcon = size == null || size >= 80;

  return (
    <div
      className={cn(
        "relative overflow-hidden shrink-0 bg-gradient-to-br",
        grad,
        rounded,
        className,
      )}
      style={style}
    >
      {coverUrl ? (
        <img
          src={coverUrl}
          alt={title}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-200",
            loaded ? "opacity-100" : "opacity-0",
          )}
          onLoad={() => setLoaded(true)}
          onError={() => setCoverUrl(null)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          {showLargeIcon ? (
            <Music2
              className="text-white/80 w-1/3 h-1/3"
              style={
                size != null
                  ? {
                      width: Math.max(20, size * 0.32),
                      height: Math.max(20, size * 0.32),
                    }
                  : undefined
              }
            />
          ) : (
            <span className="text-white font-bold text-sm drop-shadow">
              {initials(title) || "♪"}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
