/**
 * Audio helpers: duration probing, lightweight ID3v2 tag extraction,
 * cover-art extraction, and remote-URL proxying.
 */

import { getCover } from "./db";

/** Probe audio duration from a Blob/URL using an <audio> element. */
export function probeDuration(src: string): Promise<number> {
  return new Promise((resolve) => {
    const a = document.createElement("audio");
    a.preload = "metadata";
    a.src = src;
    a.onloadedmetadata = () => resolve(a.duration || 0);
    a.onerror = () => resolve(0);
    setTimeout(() => resolve(a.duration || 0), 4000);
  });
}

export function probeBlobDuration(blob: Blob): Promise<number> {
  const url = URL.createObjectURL(blob);
  return probeDuration(url).then((d) => {
    URL.revokeObjectURL(url);
    return d;
  });
}

/**
 * Parse an ID3v2 tag from the beginning of an MP3 file and extract
 * title, artist, album, and an embedded cover image if present.
 * Returns the parsed fields or null on failure.
 */
export type ParsedTags = {
  title?: string;
  artist?: string;
  album?: string;
  coverBlob?: Blob | null;
};

export async function parseTagsFromBlob(blob: Blob): Promise<ParsedTags> {
  try {
    // Read first 256KB — plenty for ID3v2 headers including embedded art.
    const head = await blob.slice(0, 256 * 1024).arrayBuffer();
    const view = new DataView(head);
    const bytes = new Uint8Array(head);

    // ID3v2 starts with "ID3"
    if (
      bytes.length < 10 ||
      bytes[0] !== 0x49 || // I
      bytes[1] !== 0x44 || // D
      bytes[2] !== 0x33 // 3
    ) {
      return {};
    }

    const versionMajor = bytes[3];
    const flags = bytes[5];
    // Size is syncsafe integer (7 bits per byte)
    const size =
      (bytes[6] << 21) | (bytes[7] << 14) | (bytes[8] << 7) | bytes[9];
    if (size <= 0 || size > bytes.length - 10) {
      // Need more data, but skip for now.
      return {};
    }

    const tagEnd = 10 + size;
    let p = 10;
    const result: ParsedTags = {};

    const readFrameSize = (off: number): number => {
      if (versionMajor === 4) {
        // syncsafe
        return (
          (bytes[off] << 21) |
          (bytes[off + 1] << 14) |
          (bytes[off + 2] << 7) |
          bytes[off + 3]
        );
      }
      // v3 — plain 32-bit BE
      return (
        (bytes[off] << 24) |
        (bytes[off + 1] << 16) |
        (bytes[off + 2] << 8) |
        bytes[off + 3]
      );
    };

    const decodeText = (off: number, len: number): string => {
      if (len <= 0) return "";
      const encoding = bytes[off];
      const textBytes = bytes.subarray(off + 1, off + len);
      try {
        if (encoding === 0) {
          // ISO-8859-1
          let s = "";
          for (let i = 0; i < textBytes.length; i++)
            s += String.fromCharCode(textBytes[i]);
          return s;
        }
        if (encoding === 1) {
          // UTF-16 with BOM
          if (
            textBytes.length >= 2 &&
            textBytes[0] === 0xff &&
            textBytes[1] === 0xfe
          ) {
            return new TextDecoder("utf-16le").decode(textBytes.subarray(2));
          }
          if (
            textBytes.length >= 2 &&
            textBytes[0] === 0xfe &&
            textBytes[1] === 0xff
          ) {
            return new TextDecoder("utf-16be").decode(textBytes.subarray(2));
          }
          return new TextDecoder("utf-16le").decode(textBytes);
        }
        if (encoding === 2) {
          return new TextDecoder("utf-16be").decode(textBytes);
        }
        if (encoding === 3) {
          return new TextDecoder("utf-8").decode(textBytes);
        }
      } catch {
        return "";
      }
      return "";
    };

    const stripNulls = (s: string) => s.replace(/\0+$/g, "").trim();

    while (p + 10 <= tagEnd) {
      // Frame header: 4 bytes id, 4 bytes size, 2 bytes flags
      const idBytes = bytes.subarray(p, p + 4);
      const id = String.fromCharCode(
        idBytes[0],
        idBytes[1],
        idBytes[2],
        idBytes[3],
      );
      // Stop on padding (null bytes)
      if (idBytes[0] === 0) break;
      const frameSize = readFrameSize(p + 4);
      if (frameSize <= 0 || p + 10 + frameSize > tagEnd) break;
      const frameDataOff = p + 10;
      const frameDataEnd = frameDataOff + frameSize;

      if (id === "TIT2" && !result.title) {
        result.title = stripNulls(decodeText(frameDataOff, frameSize));
      } else if (id === "TPE1" && !result.artist) {
        result.artist = stripNulls(decodeText(frameDataOff, frameSize));
      } else if (id === "TALB" && !result.album) {
        result.album = stripNulls(decodeText(frameDataOff, frameSize));
      } else if (id === "APIC" && !result.coverBlob) {
        // APIC frame: encoding(1) mime-string(NUL) pictype(1) description... NUL data
        const encoding = bytes[frameDataOff];
        let q = frameDataOff + 1;
        // MIME is ISO-8859-1 null-terminated
        let mimeEnd = q;
        while (mimeEnd < frameDataEnd && bytes[mimeEnd] !== 0) mimeEnd++;
        const mime = new TextDecoder("latin1").decode(
          bytes.subarray(q, mimeEnd),
        );
        q = mimeEnd + 1; // skip NUL
        const pictype = bytes[q];
        q += 1;
        // Description: encoding-dependent, null-terminated
        if (encoding === 1 || encoding === 2) {
          // UTF-16 — double-null terminated
          while (
            q + 1 < frameDataEnd &&
            !(bytes[q] === 0 && bytes[q + 1] === 0)
          )
            q += 2;
          q += 2;
        } else {
          while (q < frameDataEnd && bytes[q] !== 0) q++;
          q += 1;
        }
        if (q < frameDataEnd && pictype === 3 /* Cover (front) */) {
          const coverBytes = bytes.subarray(q, frameDataEnd);
          result.coverBlob = new Blob([coverBytes], {
            type: mime || "image/jpeg",
          });
        }
      }
      p = frameDataEnd;
    }

    // Strip "unsynchronisation" if needed (rare). Skip for simplicity.
    void flags;
    return result;
  } catch (e) {
    console.warn("Tag parsing failed", e);
    return {};
  }
}

/** Guess title/artist from filename. */
export function parseFilename(name: string): {
  title?: string;
  artist?: string;
} {
  const base = name.replace(/\.[^.]+$/, "");
  // "Artist - Title" pattern
  const m = base.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (m) {
    return {
      artist: m[1].trim(),
      title: m[2].trim(),
    };
  }
  return { title: base.trim() };
}

/**
 * Resolve an audio source URL for a song.
 * - For uploaded songs: pulls the blob from IndexedDB and creates an object URL.
 * - For remote songs: returns the source URL directly.
 *
 * Caches object URLs in a WeakMap keyed by the blob (so they live as long as
 * the blob). For remote songs, returns the sourceUrl.
 */
const objectUrlCache = new Map<string, string>();

export async function resolveAudioSource(
  songId: string,
): Promise<string | null> {
  const lib = await import("./store");
  const song = lib.useLibraryStore
    .getState()
    .songs.find((s) => s.id === songId);
  if (!song) return null;

  // YouTube songs: resolve a fresh audio stream URL via youtubei.js.
  // Stream URLs expire after ~6 hours, so we can't store them permanently.
  if (song.sourceType === "youtube" && song.sourceUrl) {
    const { resolveYouTubeStream } = await import("./providers/youtube");
    const streamUrl = await resolveYouTubeStream(song.sourceUrl);
    return streamUrl;
  }

  // Remote songs (direct URLs) just use their source URL
  if (song.isRemote && song.sourceUrl) return song.sourceUrl;

  // Uploaded songs: fetch blob from IndexedDB
  const { getSongBlob } = await import("./db");
  const blob = await getSongBlob(songId);
  if (!blob) return null;

  if (objectUrlCache.has(songId)) return objectUrlCache.get(songId)!;
  const url = URL.createObjectURL(blob);
  objectUrlCache.set(songId, url);
  return url;
}

export function revokeAudioSource(songId: string) {
  const url = objectUrlCache.get(songId);
  if (url) {
    URL.revokeObjectURL(url);
    objectUrlCache.delete(songId);
  }
}

/** Resolve a cover image URL for a song.
 *  - For embed songs (Spotify/SoundCloud), returns the remote cover URL directly.
 *  - For uploaded songs, creates an object URL from the IndexedDB blob. */
export async function resolveCoverUrl(songId: string): Promise<string | null> {
  // Check if the song has a remote cover URL (set by oEmbed for embed songs).
  const lib = await import("./store");
  const song = lib.useLibraryStore
    .getState()
    .songs.find((s) => s.id === songId);
  if (song?.coverUrl) return song.coverUrl;

  // Otherwise look up the local cover blob in IndexedDB.
  const blob = await getCover(songId);
  if (!blob) return null;
  if (objectUrlCache.has(`cover-${songId}`))
    return objectUrlCache.get(`cover-${songId}`)!;
  const url = URL.createObjectURL(blob);
  objectUrlCache.set(`cover-${songId}`, url);
  return url;
}

/** Fetch a song from a URL. Returns a Blob (if same-origin/CORS allows) or
 * metadata-only if the file can be streamed but not downloaded. */
export async function fetchRemoteAudio(
  url: string,
): Promise<{ blob?: Blob; mimeType?: string; durationSec?: number }> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const durationSec = await probeBlobDuration(blob);
    return { blob, mimeType: blob.type || "audio/mpeg", durationSec };
  } catch (e) {
    console.warn("fetchRemoteAudio failed:", e);
    return {};
  }
}

/** Try to fetch a URL with no-cors fallback to at least validate it exists. */
export async function probeRemoteUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD", mode: "cors" });
    return res.ok;
  } catch {
    // HEAD failed; try GET with no-cors (opaque response)
    try {
      await fetch(url, { mode: "no-cors" });
      return true;
    } catch {
      return false;
    }
  }
}
