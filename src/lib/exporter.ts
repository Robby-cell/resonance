/**
 * Export & import utilities.
 *
 * - Full library export: JSON containing all song metadata + playlist mappings.
 *   Audio blobs are exported as separate files in a ZIP-like structure (we use
 *   a single JSON with base64-encoded blobs for simplicity — works for small
 *   libraries; for very large libraries per-playlist M3U export probably better).
 * - Per-playlist export: M3U8 file with either blob-URL placeholders (for
 *   uploaded songs) or the original source URL (for remote songs).
 */

import { Song, Playlist, useLibraryStore } from "./store";
import { getSongBlob } from "./db";
import { resolveAudioSource } from "./audio";

/** Export the entire library as a JSON blob (metadata only — no audio). */
export function exportLibraryMetaJson(): string {
  const { songs, playlists } = useLibraryStore.getState();
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    songs: songs.map((s) => ({
      id: s.id,
      title: s.title,
      artist: s.artist,
      album: s.album,
      durationSec: s.durationSec,
      addedAt: s.addedAt,
      liked: s.liked,
      playCount: s.playCount,
      mimeType: s.mimeType,
      size: s.size,
      sourceUrl: s.sourceUrl,
      isRemote: s.isRemote,
    })),
    playlists: playlists.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      songIds: p.songIds,
      coverSeed: p.coverSeed,
      system: p.system,
    })),
  };
  return JSON.stringify(data, null, 2);
}

/** Trigger a browser download of a string blob. */
export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

/** Download a binary blob. */
export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

/** Build an M3U8 playlist string. */
function buildM3U(playlist: Playlist, songs: Song[]): string {
  const lines: string[] = ["#EXTM3U"];
  for (const id of playlist.songIds) {
    const song = songs.find((s) => s.id === id);
    if (!song) continue;
    lines.push(
      `#EXTINF:${Math.round(song.durationSec)},${song.artist} - ${song.title}`,
    );
    if (song.isRemote && song.sourceUrl) {
      lines.push(song.sourceUrl);
    } else {
      // Use a placeholder filename derived from the song — these M3Us are
      // useful for re-import into Resonance or other players when paired with
      // the matching audio files.
      const safeName = `${song.artist} - ${song.title}`
        .replace(/[\\/:*?"<>|]/g, "_")
        .slice(0, 100);
      lines.push(
        `${safeName}.${(song.mimeType.split("/")[1] || "mp3").replace("mpeg", "mp3")}`,
      );
    }
  }
  return lines.join("\n");
}

/** Export a single playlist as an M3U8 file. */
export async function exportPlaylistM3U(playlistId: string) {
  const { playlists, songs } = useLibraryStore.getState();
  const pl = playlists.find((p) => p.id === playlistId);
  if (!pl) return;
  const m3u = buildM3U(pl, songs);
  const safeName = pl.name.replace(/[\\/:*?"<>|]/g, "_").slice(0, 60);
  downloadFile(`${safeName}.m3u8`, m3u, "audio/x-mpegurl");
}

/** Export a playlist's full data including audio blobs as a single JSON.
 *  Suitable for round-tripping through Resonance on another device. */
export async function exportPlaylistBundle(playlistId: string) {
  const { playlists, songs } = useLibraryStore.getState();
  const pl = playlists.find((p) => p.id === playlistId);
  if (!pl) return;
  const bundle: any = {
    type: "resonance-playlist-bundle",
    version: 1,
    exportedAt: new Date().toISOString(),
    playlist: {
      id: pl.id,
      name: pl.name,
      description: pl.description,
      songIds: pl.songIds,
      coverSeed: pl.coverSeed,
    },
    songs: [],
  };
  for (const id of pl.songIds) {
    const song = songs.find((s) => s.id === id);
    if (!song) continue;
    const entry: any = {
      id: song.id,
      title: song.title,
      artist: song.artist,
      album: song.album,
      durationSec: song.durationSec,
      mimeType: song.mimeType,
      size: song.size,
      isRemote: song.isRemote,
      sourceUrl: song.sourceUrl,
    };
    if (!song.isRemote) {
      const blob = await getSongBlob(id);
      if (blob) {
        entry.audioBase64 = await blobToBase64(blob);
      }
    }
    bundle.songs.push(entry);
  }
  const safeName = pl.name.replace(/[\\/:*?"<>|]/g, "_").slice(0, 60);
  downloadFile(
    `${safeName}.resonance.json`,
    JSON.stringify(bundle),
    "application/json",
  );
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => {
      const s = r.result as string;
      resolve(s.split(",")[1] ?? "");
    };
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

function base64ToBlob(b64: string, mime: string): Blob {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

/** Import a playlist bundle JSON. Returns the number of songs imported. */
export async function importPlaylistBundle(json: string): Promise<number> {
  const data = JSON.parse(json);
  if (data.type !== "resonance-playlist-bundle") {
    throw new Error("Not a Resonance playlist bundle");
  }
  const store = useLibraryStore.getState();
  // Reuse existing song ids if title+artist matches (avoid dupes)
  let imported = 0;
  const idMap = new Map<string, string>();
  for (const s of data.songs) {
    // Match by title+artist
    const existing = store.songs.find(
      (x) => x.title === s.title && x.artist === s.artist,
    );
    if (existing) {
      idMap.set(s.id, existing.id);
      continue;
    }
    if (s.isRemote && s.sourceUrl) {
      const ns = await store.addRemoteSong({
        title: s.title,
        artist: s.artist,
        album: s.album,
        durationSec: s.durationSec,
        url: s.sourceUrl,
        mimeType: s.mimeType,
      });
      idMap.set(s.id, ns.id);
      imported++;
    } else if (s.audioBase64) {
      const blob = base64ToBlob(s.audioBase64, s.mimeType || "audio/mpeg");
      const ns = await store.addUploadedSong({
        title: s.title,
        artist: s.artist,
        album: s.album,
        durationSec: s.durationSec,
        mimeType: s.mimeType || "audio/mpeg",
        size: blob.size,
        blob,
      });
      idMap.set(s.id, ns.id);
      imported++;
    }
  }
  // Create playlist with remapped ids
  const pl = await store.createPlaylist(
    data.playlist.name,
    data.playlist.description,
  );
  for (const oldId of data.playlist.songIds) {
    const newId = idMap.get(oldId);
    if (newId) await store.addToPlaylist(pl.id, newId);
  }
  return imported;
}

/** Copy the current playback URL of a song to clipboard (for sharing the
 *  source URL). */
export async function copySongSourceUrl(songId: string): Promise<boolean> {
  const url = await resolveAudioSource(songId);
  if (!url) return false;
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}
