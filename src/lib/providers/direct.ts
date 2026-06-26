/**
 * Direct audio URL provider — the fallback strategy.
 *
 * Handles any URL that points directly to an audio file (mp3, wav, m4a, etc).
 * Tries to download the file for offline storage; if CORS blocks the download,
 * falls back to streaming directly from the URL via the <audio> element.
 */

import type { SongProvider, ResolvedSong } from "./types";
import { fetchRemoteAudio, probeDuration } from "@/lib/audio";

function guessTitleAndArtist(url: string): { title: string; artist: string } {
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").pop() || "track";
    const base = decodeURIComponent(last.replace(/\.[^.]+$/, ""));
    const m = base.match(/^(.+?)\s*[-–—]\s*(.+)$/);
    if (m) {
      return { artist: m[1].trim(), title: m[2].trim() };
    }
    return {
      artist: "Unknown artist",
      title: base.replace(/[-_]/g, " ").trim(),
    };
  } catch {
    return { artist: "Unknown artist", title: "Untitled" };
  }
}

export const directProvider: SongProvider = {
  name: "Direct URL",
  isEmbed: false,

  match: () => true, // Fallback — matches anything not claimed by an earlier provider.

  async resolve(url: string): Promise<ResolvedSong> {
    const guessed = guessTitleAndArtist(url);
    const result: ResolvedSong = {
      title: guessed.title,
      artist: guessed.artist,
      sourceUrl: url,
      durationSec: 0,
    };

    const fetched = await fetchRemoteAudio(url);
    if (fetched.blob) {
      // Downloaded successfully — store as blob.
      result.audioBlob = fetched.blob;
      result.audioMime = fetched.mimeType || "audio/mpeg";
      result.audioSize = fetched.blob.size;
      result.durationSec = fetched.durationSec ?? 0;
    } else {
      // CORS blocked the download — stream directly from the URL.
      result.audioUrl = url;
      result.audioMime = "audio/mpeg";
      result.durationSec = await probeDuration(url);
    }

    return result;
  },
};
