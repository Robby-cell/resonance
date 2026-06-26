"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Link2, Loader2, Music2 } from "lucide-react";
import { useLibraryStore } from "@/lib/store";
import { matchProvider, type ResolvedSong } from "@/lib/providers/registry";

type AddFromUrlModalProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Optional pre-filled search query (from the recommendations "Find" button). */
  initialQuery?: string | null;
};

export function AddFromUrlModal({
  open,
  onOpenChange,
  initialQuery,
}: AddFromUrlModalProps) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [probed, setProbed] = useState(false);
  const [resolved, setResolved] = useState<ResolvedSong | null>(null);
  const [providerName, setProviderName] = useState<string>("");
  const [isEmbed, setIsEmbed] = useState(false);

  const addUploadedSong = useLibraryStore((s) => s.addUploadedSong);
  const addRemoteSong = useLibraryStore((s) => s.addRemoteSong);

  // Pre-fill the URL field with a Spotify search URL when initialQuery is set.
  const [lastInitialQuery, setLastInitialQuery] = useState<string | null>(null);
  if (initialQuery && lastInitialQuery !== initialQuery) {
    setLastInitialQuery(initialQuery);
    // Pre-fill with a Spotify search link so the user can just click "Check URL"
    const q = encodeURIComponent(initialQuery);
    setUrl(`https://open.spotify.com/search/${q}`);
  }
  if (!initialQuery && lastInitialQuery !== null) {
    setLastInitialQuery(null);
  }

  function reset() {
    setUrl("");
    setTitle("");
    setArtist("");
    setCoverPreview(null);
    setLoading(false);
    setProbed(false);
    setResolved(null);
    setProviderName("");
    setIsEmbed(false);
  }

  async function handleProbe() {
    if (!url.trim()) return;
    setLoading(true);
    setProbed(false);
    try {
      const provider = matchProvider(url.trim());
      const result = await provider.resolve(url.trim());

      setResolved(result);
      setTitle(result.title);
      setArtist(result.artist);
      setCoverPreview(result.coverUrl ?? null);
      setProviderName(provider.name);
      setIsEmbed(provider.isEmbed);
      setProbed(true);

      if (provider.isEmbed) {
        toast.success(`Found on ${provider.name}!`, {
          description: `${result.title} · ${result.artist}`,
        });
      } else if (result.audioBlob) {
        const mb = (result.audioBlob.size / 1024 / 1024).toFixed(2);
        toast.success("Audio downloaded for offline storage", {
          description: `${mb} MB · ${Math.round(result.durationSec)}s`,
        });
      } else if (providerName === "YouTube") {
        toast.success(`Found on YouTube!`, {
          description: `${result.title} · ${result.artist}`,
        });
      } else {
        toast("Adding as remote link", {
          description: "CORS blocked the download — will stream from the URL.",
        });
      }
    } catch (e: any) {
      toast.error("Couldn't process that URL", {
        description: e?.message ?? "Please check the link and try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!resolved) return;
    setLoading(true);
    try {
      if (isEmbed) {
        await addRemoteSong({
          title: title.trim() || "Untitled",
          artist: artist.trim() || "Unknown artist",
          durationSec: resolved.durationSec,
          url: resolved.sourceUrl,
          coverUrl: resolved.coverUrl,
          sourceType: "embed",
          embedUrl: resolved.embedUrl,
          embedType: resolved.embedType,
          providerName,
        });
      } else if (resolved.audioBlob) {
        await addUploadedSong({
          title: title.trim() || "Untitled",
          artist: artist.trim() || "Unknown artist",
          durationSec: resolved.durationSec,
          mimeType: resolved.audioMime || "audio/mpeg",
          size: resolved.audioBlob.size,
          blob: resolved.audioBlob,
        });
      } else {
        await addRemoteSong({
          title: title.trim() || "Untitled",
          artist: artist.trim() || "Unknown artist",
          durationSec: resolved.durationSec,
          url: resolved.sourceUrl,
          coverUrl: resolved.coverUrl,
          mimeType: resolved.audioMime,
          sourceType: "direct",
          providerName,
        });
      }

      toast.success("Added to library");
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Failed to add song", { description: e?.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-lg bg-[#111118] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Link2 className="h-5 w-5 text-[#ff6b4a]" />
            Add song from URL
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Paste a link to a song. We support direct audio URLs (mp3, wav,
            etc.), <span className="text-[#ff7700]">Youtube</span>,{" "}
            <span className="text-[#ff6b4a]"> Spotify</span>, and{" "}
            <span className="text-[#ff5500]">SoundCloud</span>. Direct URLs are
            downloaded for offline storage; Spotify/SoundCloud play via their
            official embeds.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url" className="text-white/80">
              Song URL
            </Label>
            <Input
              id="url"
              type="url"
              placeholder="https://open.spotify.com/track/... · https://soundcloud.com/... · https://example.com/song.mp3"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setProbed(false);
                setResolved(null);
              }}
              className="bg-white/5 border-white/10 text-white"
              autoFocus
            />
          </div>

          {/* Provider hint */}
          {probed && providerName && (
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-1 rounded-full bg-white/10 text-white">
                {isEmbed ? "Embed" : "Direct"}
              </span>
              <span className="text-white/60">via {providerName}</span>
            </div>
          )}

          {/* Cover preview */}
          {coverPreview && (
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-md overflow-hidden bg-white/5 shrink-0">
                <img
                  src={coverPreview}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={() => setCoverPreview(null)}
                />
              </div>
              <div className="text-xs text-white/60">
                Cover art detected from {providerName}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-white/80">
                Title
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Auto-detected"
                className="bg-white/5 border-white/10 text-white"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="artist" className="text-white/80">
                Artist
              </Label>
              <Input
                id="artist"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="Unknown artist"
                className="bg-white/5 border-white/10 text-white"
                disabled={loading}
              />
            </div>
          </div>

          {probed && isEmbed && (
            <div className="rounded-md bg-[#ff6b4a]/10 border border-[#ff6b4a]/30 p-3 text-xs text-white/80">
              <div className="flex items-center gap-2 mb-1">
                <Music2 size={14} className="text-[#ff6b4a]" />
                <span className="font-semibold text-[#ff6b4a]">
                  Embed playback
                </span>
              </div>
              This song plays through {providerName}'s official embed player.
              You'll see a small badge in the player bar when it's playing. Some
              controls (like volume on Spotify) may not be available.
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
            disabled={loading}
            className="text-white hover:text-white hover:bg-white/10"
          >
            Cancel
          </Button>
          {!probed ? (
            <Button
              onClick={handleProbe}
              disabled={!url.trim() || loading}
              className="bg-[#ff6b4a] hover:bg-[#e85a3a] text-black font-semibold rounded-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                "Check URL"
              )}
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              disabled={loading}
              className="bg-[#ff6b4a] hover:bg-[#e85a3a] text-black font-semibold rounded-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Add to library"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
